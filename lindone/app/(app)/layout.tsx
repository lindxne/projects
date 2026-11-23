import type { ReactNode } from "react";
import { GlassNav } from "@/components/glass/GlassNav";
import { LightTracker } from "@/components/glass/LightTracker";
import { TimezoneCookie } from "@/components/memory/TimezoneCookie";
import { PlayerBar } from "@/components/player/PlayerBar";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { BackgroundShader } from "@/components/shaders/BackgroundShader";

/**
 * Shell of the signed-in app. Everything here survives navigation: the WebGL backdrop,
 * the navigation and — most importantly — the <audio> element with the player.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <BackgroundShader />
      <LightTracker />
      <a
        href="#content"
        className="sr-only z-[100] rounded-full bg-white px-4 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        К содержимому
      </a>
      <GlassNav />
      <main id="content" className="pb-player relative z-10 mx-auto w-full max-w-6xl px-3 pt-5 md:px-5 md:pt-8">
        {children}
      </main>
      <PlayerProvider />
      <PlayerBar />
      <InstallPrompt />
      <TimezoneCookie />
    </>
  );
}
