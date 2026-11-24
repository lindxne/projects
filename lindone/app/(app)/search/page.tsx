import type { Metadata } from "next";
import { SearchBox } from "@/components/search/SearchBox";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      <h1 className="font-display text-3xl font-bold tracking-tight text-mist md:text-5xl">Search</h1>
      <SearchBox initialQuery={typeof q === "string" ? q.slice(0, 100) : ""} />
    </div>
  );
}
