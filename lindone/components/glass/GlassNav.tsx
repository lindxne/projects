"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  ArchiveIcon,
  ClockIcon,
  DiscIcon,
  DownloadIcon,
  LogoutIcon,
  PlusIcon,
  SearchIcon,
  UploadIcon,
} from "@/components/ui/icons";
import { cx } from "@/lib/utils/format";
import { GlassLens } from "./GlassLens";
import { LiquidLens } from "./LiquidLens";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  match: (path: string) => boolean;
}

const ITEMS: NavItem[] = [
  { href: "/", label: "Дискография", icon: DiscIcon, match: (path) => path === "/" || path.startsWith("/releases") },
  { href: "/archive", label: "Архив", icon: ArchiveIcon, match: (path) => path.startsWith("/archive") || path === "/upload" },
  { href: "/memory", label: "Память", icon: ClockIcon, match: (path) => path.startsWith("/memory") },
  { href: "/search", label: "Поиск", icon: SearchIcon, match: (path) => path.startsWith("/search") },
];

const MENU_ITEM =
  "flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-3.5 text-left text-[15px] font-medium text-white hover:bg-white/10";

/** Glass navigation bar pinned to the top. */
export function GlassNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!menuRef.current?.contains(target) && !menuButtonRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 px-2 pt-[calc(var(--safe-top)+8px)] md:px-5 md:pt-[calc(var(--safe-top)+14px)]">
      {/* The menu sits beside the bar, not inside it: glass nested in glass cannot blur the page behind it. */}
      <div className="relative mx-auto max-w-6xl">
        <nav aria-label="Основная навигация" className="glass glass-strong flex h-[58px] items-center gap-1 px-2 md:gap-2 md:px-3">
          <LiquidLens />
          <GlassLens tier="desktop" radius={28} opacity={0.65} />
          <Link href="/" className="mr-auto rounded-full px-2.5 py-1.5 font-display text-[17px] font-bold tracking-tight text-white md:text-lg">
            <span className="glass-text">Lindone</span>
          </Link>

          {ITEMS.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={cx(
                  "relative grid h-11 min-w-[44px] place-items-center rounded-full px-0 text-sm font-semibold transition-colors md:flex md:gap-2 md:px-4",
                  active ? "text-white" : "text-mist-muted hover:text-white",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="nav-pill"
                    className="glass-lit absolute inset-0 rounded-full"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                ) : null}
                <Icon size={19} className="glass-icon relative" />
                <span className="glass-text relative hidden md:inline">{item.label}</span>
              </Link>
            );
          })}

          <motion.button
            ref={menuButtonRef}
            type="button"
            aria-label="Добавить и меню"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            whileTap={{ scale: 0.86 }}
            transition={{ type: "spring", stiffness: 600, damping: 14 }}
            className="glass-sphere h-11 w-11"
            data-active={menuOpen}
          >
            <motion.span animate={{ rotate: menuOpen ? 45 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 20 }} className="grid place-items-center">
              <PlusIcon size={20} />
            </motion.span>
          </motion.button>
        </nav>

        <AnimatePresence>
          {menuOpen ? (
            <motion.div
              ref={menuRef}
              role="menu"
              aria-label="Меню"
              initial={{ opacity: 0, y: -10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className="glass glass-strong absolute right-2 top-[calc(100%+12px)] w-60 origin-top-right p-2 md:right-3"
              style={{ ["--glass-radius" as string]: "24px", ["--glass-tint" as string]: "rgba(14, 12, 28, 0.62)", ["--glass-blur" as string]: "22px" }}
            >
              <Link role="menuitem" href="/releases/new" className={MENU_ITEM}>
                <DiscIcon size={18} /> Новый релиз
              </Link>
              <Link role="menuitem" href="/upload" className={MENU_ITEM}>
                <UploadIcon size={18} /> Фото или видео
              </Link>
              <div className="my-1.5 h-px bg-white/12" />
              <a role="menuitem" href="/api/export" download className={MENU_ITEM}>
                <DownloadIcon size={18} /> Экспорт архива (JSON)
              </a>
              <form action="/auth/signout" method="post">
                <button role="menuitem" type="submit" className={MENU_ITEM}>
                  <LogoutIcon size={18} /> Выйти
                </button>
              </form>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  );
}
