"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { GlassButton } from "@/components/glass/GlassButton";
import { CloseIcon } from "@/components/ui/icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "lindone-install-dismissed";

/** Registers the service worker and offers to install the app on the home screen. */
export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone || localStorage.getItem(DISMISSED_KEY)) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS Safari has no install event: show a one-time hint instead.
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent);
    const timer = isIos ? window.setTimeout(() => setIosHint(true), 4000) : undefined;

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setInstallEvent(null);
    setIosHint(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    dismiss();
  };

  const visible = installEvent !== null || iosHint;

  // Reserve room at the end of the page so the hint never covers the last controls.
  useEffect(() => {
    document.documentElement.style.setProperty("--install-height", visible ? "84px" : "0px");
    return () => {
      document.documentElement.style.setProperty("--install-height", "0px");
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.aside
          aria-label="Install app"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="glass glass-strong fixed inset-x-3 bottom-[calc(var(--player-height)+var(--safe-bottom)+18px)] z-[45] mx-auto flex max-w-md items-center gap-3 p-3 pl-4"
          style={{ ["--glass-tint" as string]: "rgba(11, 9, 22, 0.84)" }}
        >
          <p className="min-w-0 flex-1 text-sm text-mist">
            {installEvent ? (
              "Install Lindone as an app."
            ) : (
              <>
                To install: Share → <strong>Add to Home Screen</strong>.
              </>
            )}
          </p>
          {installEvent ? (
            <GlassButton variant="primary" className="!min-h-[40px] !px-4" onClick={() => void install()}>
              Install
            </GlassButton>
          ) : null}
          <button type="button" onClick={dismiss} aria-label="Dismiss" className="grid h-10 w-10 flex-none place-items-center rounded-full text-mist-muted hover:text-mist">
            <CloseIcon size={16} />
          </button>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
