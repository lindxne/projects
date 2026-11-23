"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import type { Post } from "@/lib/supabase/types";
import { PostView } from "./PostView";

/** A post on its own page (opened from search, memory or a release). */
export function StandalonePost({ post: initial }: { post: Post }) {
  const router = useRouter();
  const [post, setPost] = useState(initial);
  return (
    <GlassCard variant="panel" className="overflow-hidden">
      <PostView
        post={post}
        onUpdated={setPost}
        onDeleted={() => {
          router.push("/archive");
          router.refresh();
        }}
      />
    </GlassCard>
  );
}
