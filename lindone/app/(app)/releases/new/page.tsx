import type { Metadata } from "next";
import { ReleaseForm } from "@/components/releases/ReleaseForm";

export const metadata: Metadata = { title: "Новый релиз" };

export default function NewReleasePage() {
  return (
    <div className="grid gap-5">
      <h1 className="mx-auto w-full max-w-4xl font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
        Новый релиз
      </h1>
      <ReleaseForm />
    </div>
  );
}
