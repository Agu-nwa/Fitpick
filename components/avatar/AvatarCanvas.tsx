"use client";

import { Component, Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";

type AvatarCanvasProps = {
  avatarUrl?: string | null;
  bodyPreset?: string;
  visualizationStyle?: string;
};

class CanvasErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function styleColor(style?: string) {
  if (style === "streetwear") return "#3b3f32";
  if (style === "editorial") return "#5a3840";
  if (style === "minimal") return "#8b806f";
  return "#5a3828";
}

function scaleForBody(bodyPreset?: string) {
  if (bodyPreset === "slim") return [0.86, 1, 0.86] as const;
  if (bodyPreset === "athletic") return [1.08, 1, 1.02] as const;
  if (bodyPreset === "curvy") return [1.1, 0.98, 1.06] as const;
  if (bodyPreset === "plus") return [1.18, 0.98, 1.1] as const;
  return [1, 1, 1] as const;
}

function AvatarModel({ url }: { url: string }) {
  const gltf = useGLTF(url);
  return <primitive object={gltf.scene} position={[0, -1.35, 0]} scale={1.65} />;
}

function FallbackMannequin({ bodyPreset, visualizationStyle }: AvatarCanvasProps) {
  const color = styleColor(visualizationStyle);
  const scale = scaleForBody(bodyPreset);

  return (
    <group scale={scale} position={[0, -0.55, 0]}>
      <mesh position={[0, 1.45, 0]} castShadow>
        <sphereGeometry args={[0.28, 36, 36]} />
        <meshStandardMaterial color="#b99f87" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.82, 0]} castShadow>
        <capsuleGeometry args={[0.42, 0.92, 16, 32]} />
        <meshStandardMaterial color={color} roughness={0.64} metalness={0.04} />
      </mesh>
      <mesh position={[-0.58, 0.82, 0]} rotation={[0, 0, 0.18]} castShadow>
        <capsuleGeometry args={[0.1, 0.72, 12, 20]} />
        <meshStandardMaterial color={color} roughness={0.66} />
      </mesh>
      <mesh position={[0.58, 0.82, 0]} rotation={[0, 0, -0.18]} castShadow>
        <capsuleGeometry args={[0.1, 0.72, 12, 20]} />
        <meshStandardMaterial color={color} roughness={0.66} />
      </mesh>
      <mesh position={[-0.18, -0.04, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.95, 12, 20]} />
        <meshStandardMaterial color="#2a2824" roughness={0.72} />
      </mesh>
      <mesh position={[0.18, -0.04, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.95, 12, 20]} />
        <meshStandardMaterial color="#2a2824" roughness={0.72} />
      </mesh>
      <mesh position={[0, -0.62, 0]} receiveShadow>
        <cylinderGeometry args={[0.62, 0.62, 0.04, 40]} />
        <meshStandardMaterial color="#d7cbbb" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function AvatarCanvas({ avatarUrl, bodyPreset, visualizationStyle }: AvatarCanvasProps) {
  const fallback = <FallbackMannequin bodyPreset={bodyPreset} visualizationStyle={visualizationStyle} />;

  return (
    <Canvas shadows camera={{ position: [0, 1.1, 4.4], fov: 38 }} dpr={[1, 1.7]}>
      <color attach="background" args={["#f7f2ea"]} />
      <ambientLight intensity={0.8} />
      <hemisphereLight args={["#fff7ed", "#786c5f", 1.2]} />
      <directionalLight position={[3, 4, 3]} intensity={2.2} castShadow />
      <spotLight position={[-3, 3, 2]} intensity={0.85} angle={0.45} penumbra={0.8} />
      <Suspense fallback={fallback}>
        <CanvasErrorBoundary fallback={fallback}>
          {avatarUrl ? <AvatarModel url={avatarUrl} /> : fallback}
        </CanvasErrorBoundary>
      </Suspense>
      <ContactShadows position={[0, -1.2, 0]} opacity={0.28} scale={5} blur={2.6} far={2.4} />
      <OrbitControls enablePan={false} minDistance={2.7} maxDistance={6} target={[0, 0.25, 0]} />
    </Canvas>
  );
}
