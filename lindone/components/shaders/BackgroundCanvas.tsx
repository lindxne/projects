"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { light, shaderTime } from "@/lib/hooks/light";
import { backgroundFragmentShader, backgroundVertexShader } from "./backgroundShader";

function Backdrop() {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uRect: { value: new THREE.Vector4(0, 0, 1, 1) },
      uLight: { value: new THREE.Vector2(0.5, 0.2) },
      uScroll: { value: 0 },
      uFullscreen: { value: 1 },
    }),
    [],
  );

  useFrame(() => {
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    uniforms.uTime.value = shaderTime();
    uniforms.uAspect.value = width / height;
    uniforms.uScroll.value = light.scroll;
    uniforms.uLight.value.set(light.x / width, light.y / height);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={backgroundVertexShader}
        fragmentShader={backgroundFragmentShader}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

function FrameLimiter({ fps }: { fps: number }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - last >= 1000 / fps) {
        last = now;
        invalidate();
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fps, invalidate]);
  return null;
}

/** Full-screen WebGL backdrop. Rendered below native resolution: it is a soft gradient. */
export default function BackgroundCanvas({ lowPower, onReady }: { lowPower: boolean; onReady: () => void }) {
  return (
    <Canvas
      frameloop="demand"
      dpr={lowPower ? 0.5 : 0.75}
      gl={{ alpha: false, antialias: false, powerPreference: "low-power" }}
      onCreated={onReady}
      style={{ position: "absolute", inset: 0 }}
    >
      <FrameLimiter fps={lowPower ? 24 : 40} />
      <Backdrop />
    </Canvas>
  );
}
