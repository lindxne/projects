"use client";

import { POST_TAGS, POST_TAG_LABEL, type PostTag } from "@/lib/supabase/types";

interface TagPickerProps {
  value: PostTag[];
  onChange: (tags: PostTag[]) => void;
  disabled?: boolean;
}

export function TagPicker({ value, onChange, disabled }: TagPickerProps) {
  return (
    <div role="group" aria-label="Tags" className="flex flex-wrap gap-2">
      {POST_TAGS.map((tag) => {
        const selected = value.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            className="chip"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(selected ? value.filter((item) => item !== tag) : [...value, tag])}
          >
            #{POST_TAG_LABEL[tag]}
          </button>
        );
      })}
    </div>
  );
}
