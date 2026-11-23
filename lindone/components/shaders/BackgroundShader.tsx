"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useState, type ReactNode } from "react";
import { disableWebGL, useGraphicsTier } from "@/lib/hooks/useGraphicsTier";

const BackgroundCanvas = dynamic(() => import("./BackgroundCanvas"), { ssr: false });

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    disableWebGL();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * App backdrop: a CSS gradient that is always there (first paint, no-WebGL fallback) and the
 * animated WebGL shader that fades in over it once the page is idle.
 */
export function BackgroundShader() {
  const tier = useGraphicsTier();
  const [start, setStart] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (tier === "none") return;
    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 400));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => setStart(true), { timeout: 2000 });
    return () => cancel(handle);
  }, [tier]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      <div className="bg-fallback" />
      {tier !== "none" && start ? (
        <div className="absolute inset-0 transition-opacity duration-[1400ms]" style={{ opacity: ready ? 1 : 0 }}>
          <Boundary>
            <BackgroundCanvas lowPower={tier === "mobile"} onReady={() => setReady(true)} />
          </Boundary>
        </div>
      ) : null}
    </div>
  );
}
