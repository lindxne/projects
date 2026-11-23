import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StandalonePost } from "@/components/archive/StandalonePost";
import { GlassLink } from "@/components/glass/GlassButton";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { getPost } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Пост" };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-3">
      <GlassLink href="/archive" variant="ghost" className="!min-h-[40px] w-fit !px-3.5">
        <ArrowLeftIcon size={17} /> Архив
      </GlassLink>
      <StandalonePost post={post} />
    </div>
  );
}
