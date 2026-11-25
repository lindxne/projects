"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ClockIcon, DiscIcon, DownloadIcon, LogoutIcon, PlusIcon, SearchIcon, UploadIcon } from "@/components/ui/icons";
import { isFeedFilter } from "@/lib/data/feed";
import { cx } from "@/lib/utils/format";
import { Logo } from "./Logo";

const CATEGORIES = [
  { label: "all", href: "/", filter: null },
  { label: "music", href: "/?filter=music", filter: "music" },
  { label: "photos", href: "/?filter=photos", filter: "photos" },
  { label: "videos", href: "/?filter=videos", filter: "videos" },
] as const;

const ICON_LINK = "glass-sphere h-10 w-10 text-mist-muted hover:text-mist";
const MENU_ITEM = "flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] text-mist hover:bg-black/5";

function Categories() {
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("filter");
  const current = pathname === "/" ? (isFeedFilter(raw) ? raw : null) : undefined;

  return (
    <nav aria-label="Categories" className="glass glass-pill flex items-center gap-0.5 p-1">
      {CATEGORIES.map((category) => {
        const active = current === category.filter;
        return (
          <Link
            key={category.label}
            href={category.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "relative rounded-full px-3.5 py-1.5 text-[15px] transition-colors xs:px-4",
              active ? "text-white" : "text-mist-muted hover:text-mist",
            )}
          >
            {active ? (
              <motion.span layoutId="category-pill" className="absolute inset-0 rounded-full bg-mist" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
            ) : null}
            <span className="relative">{category.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      <header className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pt-[calc(var(--safe-top)+28px)] md:pt-[calc(var(--safe-top)+40px)]">
        <Link href="/" aria-label="lindone — home" className="rounded-xl text-mist">
          <Logo animate className="mb-3 text-[44px] md:mb-4 md:text-[58px]" />
        </Link>

        <div className="absolute right-3 top-[calc(var(--safe-top)+14px)] flex items-center gap-0.5 md:right-5 md:top-[calc(var(--safe-top)+22px)]">
          <Link href="/search" aria-label="Search" className={cx(ICON_LINK, pathname.startsWith("/search") && "text-mist")}>
            <SearchIcon size={19} />
          </Link>
          <Link href="/memory" aria-label="On this day" className={cx(ICON_LINK, "hidden xs:grid", pathname.startsWith("/memory") && "text-mist")}>
            <ClockIcon size={19} />
          </Link>
          <div className="relative">
            <button
              ref={buttonRef}
              type="button"
              aria-label="Add and menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className={cx(ICON_LINK, menuOpen && "bg-black/5 text-mist")}
            >
              <motion.span animate={{ rotate: menuOpen ? 45 : 0 }} className="grid place-items-center">
                <PlusIcon size={20} />
              </motion.span>
            </button>
            <AnimatePresence>
              {menuOpen ? (
                <motion.div
                  ref={menuRef}
                  role="menu"
                  aria-label="Menu"
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  className="glass glass-strong absolute right-0 top-[calc(100%+8px)] z-50 w-56 origin-top-right p-1.5"
                  style={{ ["--glass-radius" as string]: "18px" }}
                >
                  <Link role="menuitem" href="/releases/new" className={MENU_ITEM}>
                    <DiscIcon size={17} /> New release
                  </Link>
                  <Link role="menuitem" href="/upload" className={MENU_ITEM}>
                    <UploadIcon size={17} /> Photo or video
                  </Link>
                  <Link role="menuitem" href="/memory" className={cx(MENU_ITEM, "xs:hidden")}>
                    <ClockIcon size={17} /> On this day
                  </Link>
                  <div className="my-1 h-px bg-black/[0.07]" />
                  <a role="menuitem" href="/api/export" download className={MENU_ITEM}>
                    <DownloadIcon size={17} /> Export (JSON)
                  </a>
                  <form action="/auth/signout" method="post">
                    <button role="menuitem" type="submit" className={MENU_ITEM}>
                      <LogoutIcon size={17} /> Sign out
                    </button>
                  </form>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-40 flex justify-center px-3 pb-2 pt-[calc(var(--safe-top)+10px)]">
        <Suspense fallback={<div className="h-[42px]" />}>
          <Categories />
        </Suspense>
      </div>
    </>
  );
}
