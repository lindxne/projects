"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { SearchIcon } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { RELEASE_TYPE_LABEL, isReleaseType, type SearchResult } from "@/lib/supabase/types";
import { describeDbError } from "@/lib/utils/errors";
import { formatDate } from "@/lib/utils/format";

const KIND_LABEL: Record<string, string> = { release: "Релизы", track: "Треки", post: "Архив" };
const KIND_ORDER = ["release", "track", "post"];

function hrefFor(result: SearchResult): string {
  if (result.kind === "post") return `/archive/${result.id}`;
  return `/releases/${result.kind === "track" ? (result.release_id ?? result.id) : result.id}`;
}

function subtitleFor(result: SearchResult): string {
  if (result.kind === "release") {
    const type = isReleaseType(result.subtitle) ? RELEASE_TYPE_LABEL[result.subtitle] : "Релиз";
    return result.happened_at ? `${type} · ${new Date(result.happened_at).getFullYear()}` : type;
  }
  if (result.kind === "post") {
    return `${result.subtitle === "video" ? "Видео" : "Фото"} · ${formatDate(result.happened_at)}`;
  }
  return result.subtitle ?? "";
}

/** Search over release titles, track titles and post captions (one RPC, debounced). */
export function SearchBox({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  useEffect(() => {
    const text = query.trim();
    const url = text ? `/search?q=${encodeURIComponent(text)}` : "/search";
    window.history.replaceState(window.history.state, "", url);

    if (text.length < 2) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    const id = ++request.current;
    const timer = window.setTimeout(() => {
      void createClient()
        .rpc("search_all", { q: text })
        .then(({ data, error: rpcError }) => {
          if (id !== request.current) return;
          setLoading(false);
          if (rpcError) {
            setError(describeDbError(rpcError));
            setResults(null);
          } else {
            setError(null);
            setResults(data);
          }
        });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="grid gap-5">
      <form role="search" onSubmit={(event) => event.preventDefault()} className="glass glass-strong glass-pill flex items-center gap-3 px-5">
        <SearchIcon size={20} className="flex-none text-mist-muted" />
        <label htmlFor="search-input" className="sr-only">
          Поиск по релизам, трекам и постам
        </label>
        <input
          id="search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Релиз, трек или подпись к посту"
          autoComplete="off"
          enterKeyHint="search"
          autoFocus
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-mist-faint"
        />
      </form>

      <div role="status" aria-live="polite" className="sr-only">
        {loading ? "Ищу" : results ? `Найдено: ${results.length}` : ""}
      </div>

      {error ? (
        <p role="alert" className="rounded-2xl border border-rose-300/40 bg-rose-950/60 px-4 py-3 text-sm text-rose-100">
          Поиск не сработал: {error}
        </p>
      ) : results === null ? (
        <p className="px-1 text-mist-muted">{loading ? "Ищу…" : "Введи хотя бы две буквы."}</p>
      ) : results.length === 0 ? (
        <p className="px-1 text-mist-muted">По запросу «{query.trim()}» ничего не нашлось.</p>
      ) : (
        KIND_ORDER.map((kind) => {
          const group = results.filter((result) => result.kind === kind);
          if (group.length === 0) return null;
          return (
            <section key={kind} aria-labelledby={`search-${kind}`}>
              <h2 id={`search-${kind}`} className="mb-2 px-1 text-sm font-bold uppercase tracking-[0.14em] text-mist-muted">
                {KIND_LABEL[kind]} · {group.length}
              </h2>
              <GlassCard variant="panel" className="p-1.5">
                <ul>
                  {group.map((result) => (
                    <li key={`${result.kind}-${result.id}`}>
                      <Link href={hrefFor(result)} className="flex min-h-[64px] items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-white/[0.08]">
                        {/* eslint-disable-next-line @next/next/no-img-element -- private media behind a signed redirect */}
                        <img src={result.image_url} alt="" width={52} height={52} loading="lazy" className="h-[52px] w-[52px] flex-none rounded-xl object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-white">{result.title || "Без подписи"}</span>
                          <span className="block truncate text-sm text-mist-muted">{subtitleFor(result)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </section>
          );
        })
      )}
    </div>
  );
}
