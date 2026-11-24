import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReleaseForm } from "@/components/releases/ReleaseForm";
import { getRelease } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Edit release" };

export default async function EditReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getRelease(id);
  if (!data) notFound();

  return (
    <div className="grid gap-5">
      <h1 className="mx-auto w-full max-w-4xl font-display text-3xl font-bold tracking-tight text-mist md:text-4xl">Edit
      </h1>
      <ReleaseForm release={data.release} tracks={data.tracks} />
    </div>
  );
}
