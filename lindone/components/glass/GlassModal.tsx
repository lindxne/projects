"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/icons";
import { cx } from "@/lib/utils/format";
import { lockScroll } from "@/lib/utils/scroll-lock";
import { GlassLens } from "./GlassLens";

interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Hide the visible title bar (the title is still announced to screen readers). */
  hideTitle?: boolean;
  children: ReactNode;
  className?: string;
  /** `sheet` slides up from the bottom on phones; `center` is always centered. */
  placement?: "sheet" | "center";
}

const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

/** Glass dialog rendered above everything: focus trap, Escape and backdrop click to close. */
export function GlassModal({
  open,
  onClose,
  title,
  hideTitle = false,
  children,
  className,
  placement = "sheet",
}: GlassModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const unlock = lockScroll();
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 30);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null,
      );
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown, true);
      unlock();
      previous?.focus();
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className={cx(
            "fixed inset-0 z-[70] flex justify-center",
            placement === "sheet" ? "items-end sm:items-center" : "items-center",
            "p-0 sm:p-6",
            placement === "center" && "p-4",
          )}
        >
          <motion.div
            // Plain dimming: a full-screen backdrop-filter under the glass panel's own one
            // makes Chrome mirror the page at the edges, and costs a lot on phones.
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.9 }}
            className={cx(
              "glass glass-strong relative flex max-h-[88dvh] w-full flex-col overflow-hidden outline-none sm:max-w-lg",
              placement === "sheet" && "rounded-b-none pb-[var(--safe-bottom)] sm:rounded-b-[28px] sm:pb-0",
              className,
            )}
          >
            <GlassLens tier="desktop" radius={28} />
            <div className={hideTitle ? "sr-only" : "relative flex items-center justify-between gap-4 px-5 pb-2 pt-4"}>
              <h2 id={titleId} className="text-lg font-bold text-white">
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="scrim absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full text-white"
            >
              <CloseIcon size={18} />
            </button>
            <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
