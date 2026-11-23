#!/usr/bin/env node
/**
 * Monthly backup of the whole archive: every table as JSON plus every Storage file.
 *
 *   SUPABASE_URL=https://<project>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/backup.mjs [target-dir]
 *
 * Writes to <target-dir>/<YYYY-MM-DD>/ (default ./backups). Files that already exist with the
 * same size are skipped, so pointing every run at the same parent folder is cheap.
 * The service-role key bypasses RLS: keep it on your machine / in CI secrets only.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API).");
  process.exit(1);
}

const TABLES = ["profiles", "releases", "tracks", "posts"];
const BUCKETS = ["covers", "audio", "media", "posters"];
const PAGE = 1000;

const supabase = createClient(url, key, { auth: { persistSession: false } });
const stamp = new Date().toISOString().slice(0, 10);
const root = path.resolve(process.argv[2] ?? "backups", stamp);

async function dumpTable(table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select("*").order("created_at").range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data.map(({ fts: _fts, ...row }) => row));
    if (data.length < PAGE) break;
  }
  await writeFile(path.join(root, "db", `${table}.json`), JSON.stringify(rows, null, 2));
  return rows.length;
}

async function listFiles(bucket, prefix = "") {
  const files = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: PAGE, offset });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    for (const entry of data) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folders have no id.
      if (entry.id === null) files.push(...(await listFiles(bucket, full)));
      else files.push({ path: full, size: entry.metadata?.size ?? null });
    }
    if (data.length < PAGE) break;
  }
  return files;
}

async function downloadBucket(bucket) {
  const files = await listFiles(bucket);
  let downloaded = 0;
  let bytes = 0;
  for (const file of files) {
    const target = path.join(root, "storage", bucket, file.path);
    const existing = await stat(target).catch(() => null);
    if (existing && file.size !== null && existing.size === file.size) continue;
    const { data, error } = await supabase.storage.from(bucket).download(file.path);
    if (error) throw new Error(`${bucket}/${file.path}: ${error.message}`);
    await mkdir(path.dirname(target), { recursive: true });
    const buffer = Buffer.from(await data.arrayBuffer());
    await writeFile(target, buffer);
    downloaded += 1;
    bytes += buffer.length;
  }
  return { total: files.length, downloaded, bytes };
}

try {
  await mkdir(path.join(root, "db"), { recursive: true });
  const summary = { created_at: new Date().toISOString(), project: url, tables: {}, buckets: {} };

  for (const table of TABLES) {
    summary.tables[table] = await dumpTable(table);
    console.log(`db/${table}.json — ${summary.tables[table]} rows`);
  }
  for (const bucket of BUCKETS) {
    summary.buckets[bucket] = await downloadBucket(bucket);
    const { total, downloaded, bytes } = summary.buckets[bucket];
    console.log(`storage/${bucket} — ${total} files, ${downloaded} downloaded (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
  }

  await writeFile(path.join(root, "manifest.json"), JSON.stringify(summary, null, 2));
  console.log(`Backup complete: ${root}`);
} catch (error) {
  console.error(`Backup failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
