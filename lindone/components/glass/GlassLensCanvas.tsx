"use client";

import { MeshTransmissionMaterial, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { backgroundFragmentShader, backgroundVertexShader } from "@/components/shaders/backgroundShader";
import { light, shaderTime } from "@/lib/hooks/light";
import { disableWebGL } from "@/lib/hooks/useGraphicsTier";

const FOV = 28;
const BACKDROP_DISTANCE = 90;
const BACKDROP_SCALE = 1.5;

function LensScene({ radius, lowPower }: { radius: number; lowPower: boolean }) {
  const { size, camera, gl } = useThree();
  const pointLight = useRef<THREE.PointLight>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uRect: { value: new THREE.Vector4(0, 0, 1, 1) },
      uLight: { value: new THREE.Vector2(0.5, 0.2) },
      uScroll: { value: 0 },
      uFullscreen: { value: 0 },
    }),
    [],
  );

  // 1 world unit = 1 CSS pixel on the z = 0 plane.
  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = FOV;
    perspective.position.set(0, 0, size.height / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    perspective.near = 1;
    perspective.far = perspective.position.z + 1000;
    perspective.updateProjectionMatrix();
  }, [camera, size.height]);

  const depth = Math.max(10, Math.min(36, size.height * 0.42));
  const bevel = Math.min(radius, depth / 2 - 0.5, size.height / 2 - 0.5);

  useFrame(() => {
    const rect = gl.domElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth || 1;
    const viewportHeight = window.innerHeight || 1;
    const padX = (rect.width * (BACKDROP_SCALE - 1)) / 2;
    const padY = (rect.height * (BACKDROP_SCALE - 1)) / 2;

    uniforms.uTime.value = shaderTime();
    uniforms.uAspect.value = viewportWidth / viewportHeight;
    uniforms.uScroll.value = light.scroll;
    uniforms.uLight.value.set(light.x / viewportWidth, light.y / viewportHeight);
    uniforms.uRect.value.set(
      (rect.left - padX) / viewportWidth,
      (rect.top - padY) / viewportHeight,
      (rect.width * BACKDROP_SCALE) / viewportWidth,
      (rect.height * BACKDROP_SCALE) / viewportHeight,
    );

    // The light hovers above the slab under the cursor: its reflection is the moving highlight.
    pointLight.current?.position.set(
      light.x - rect.left - rect.width / 2,
      -(light.y - rect.top - rect.height / 2),
      90,
    );
  });

  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight ref={pointLight} intensity={2.4} decay={0} color="#ffffff" />
      <directionalLight position={[-size.width, size.height * 2, 260]} intensity={1.1} color="#cfd8ff" />

      <mesh position={[0, 0, -BACKDROP_DISTANCE]} scale={[size.width * BACKDROP_SCALE, size.height * BACKDROP_SCALE, 1]}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={backgroundVertexShader}
          fragmentShader={backgroundFragmentShader}
          depthWrite={false}
        />
      </mesh>

      <RoundedBox args={[size.width, size.height, depth]} radius={bevel} smoothness={lowPower ? 4 : 8} position={[0, 0, -depth / 2]}>
        <MeshTransmissionMaterial
          samples={lowPower ? 3 : 6}
          resolution={lowPower ? 192 : 384}
          transmission={1}
          thickness={depth * 2.2}
          roughness={0.08}
          ior={1.42}
          chromaticAberration={lowPower ? 0.5 : 0.9}
          anisotropicBlur={0.25}
          distortion={0.35}
          distortionScale={0.35}
          temporalDistortion={0.06}
          clearcoat={1}
          clearcoatRoughness={0.12}
          attenuationDistance={depth * 6}
          attenuationColor="#e9e4ff"
          color="#ffffff"
          backside={false}
        />
      </RoundedBox>
    </>
  );
}

/** Caps the frame rate on phones to save battery. */
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

class LensBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
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

export default function GlassLensCanvas({ radius, lowPower }: { radius: number; lowPower: boolean }) {
  return (
    <LensBoundary>
      <Canvas
        frameloop="demand"
        dpr={lowPower ? 1 : [1, 1.5]}
        gl={{ alpha: true, antialias: !lowPower, powerPreference: lowPower ? "low-power" : "high-performance" }}
        camera={{ fov: FOV, position: [0, 0, 300] }}
        style={{ position: "absolute", inset: 0 }}
      >
        <FrameLimiter fps={lowPower ? 30 : 60} />
        <LensScene radius={radius} lowPower={lowPower} />
      </Canvas>
    </LensBoundary>
  );
}
