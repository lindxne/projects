import type { Metadata } from "next";
import { UploadForm } from "@/components/archive/UploadForm";

export const metadata: Metadata = { title: "Загрузка" };

export default function UploadPage() {
  return (
    <div className="grid gap-5">
      <h1 className="mx-auto w-full max-w-2xl font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
        В архив
      </h1>
      <UploadForm />
    </div>
  );
}
