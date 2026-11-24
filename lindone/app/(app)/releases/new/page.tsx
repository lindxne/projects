import type { Metadata } from "next";
import { ReleaseForm } from "@/components/releases/ReleaseForm";

export const metadata: Metadata = { title: "New release" };

export default function NewReleasePage() {
  return (
    <div className="grid gap-5">
      <h1 className="mx-auto w-full max-w-4xl font-display text-3xl font-bold tracking-tight text-mist md:text-4xl">New release
      </h1>
      <ReleaseForm />
    </div>
  );
}
