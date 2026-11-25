import type { ReactNode } from "react";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { LightTracker } from "@/components/glass/LightTracker";
import { TimezoneCookie } from "@/components/memory/TimezoneCookie";
import { PlayerBar } from "@/components/player/PlayerBar";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <LightTracker />
      <a
        href="#content"
        className="sr-only z-[100] rounded-full bg-mist px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="content" className="pb-player relative mx-auto w-full max-w-6xl px-4 pt-6 md:px-5 md:pt-10">
        {children}
      </main>
      <PlayerProvider />
      <PlayerBar />
      <InstallPrompt />
      <TimezoneCookie />
    </>
  );
}
