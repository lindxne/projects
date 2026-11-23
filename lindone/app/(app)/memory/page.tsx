import type { Metadata } from "next";
import { MemoryBlock } from "@/components/memory/MemoryBlock";

export const metadata: Metadata = { title: "Память" };

export default function MemoryPage() {
  return (
    <div className="grid gap-5 md:gap-7">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-5xl">В этот день</h1>
        <p className="mt-1.5 text-sm text-mist-muted md:text-base">Что выходило и снималось в этот день в прошлые годы.</p>
      </header>
      <MemoryBlock />
    </div>
  );
}
