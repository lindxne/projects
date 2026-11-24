import type { Metadata } from "next";
import { MemoryBlock } from "@/components/memory/MemoryBlock";

export const metadata: Metadata = { title: "On this day" };

export default function MemoryPage() {
  return (
    <div className="grid gap-5 md:gap-7">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-mist md:text-5xl">On this day</h1>
        <p className="mt-1.5 text-sm text-mist-muted md:text-base">What was released or shot on this day in past years.</p>
      </header>
      <MemoryBlock />
    </div>
  );
}
