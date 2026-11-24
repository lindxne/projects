import { cx } from "@/lib/utils/format";

/** Hand-drawn "lindone" wordmark: one continuous pen stroke. */
export function Logo({ className, animate = false }: { className?: string; animate?: boolean }) {
  return (
    <svg viewBox="0 0 236 80" role="img" aria-label="lindone" className={cx("block h-auto", animate && "logo-draw", className)}>
      <path
        pathLength={1}
        d="M6 64 C18 54 33 32 31 15 C29 4 19 8 19 23 C19 41 17 60 23 68 C27 73 35 70 41 60 C43 55 45 49 46 46 C45 54 43 64 47 69 C51 72 57 66 61 58 C63 52 65 48 66 46 C66 54 64 62 63 70 C66 58 72 46 80 46 C87 46 86 56 85 63 C84 70 90 71 96 64 C100 58 104 49 111 47 C100 44 94 58 98 66 C102 72 112 66 116 56 C120 40 122 20 123 7 C120 30 118 52 119 64 C120 71 126 70 132 62 C134 54 138 46 146 46 C154 46 156 56 152 64 C148 71 138 71 136 64 C134 56 140 48 148 48 C152 48 156 51 161 51 C164 49 166 47 167 46 C167 54 165 62 164 70 C167 58 173 46 181 46 C188 46 187 56 186 63 C185 70 191 71 197 64 C203 58 214 54 214 48 C214 43 205 43 202 50 C198 58 200 70 210 70 C217 70 224 66 230 58"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="48.5" cy="33" r="2.6" fill="currentColor" className="logo-dot" />
    </svg>
  );
}
