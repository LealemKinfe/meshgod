import { SentientMesh } from 'sentient-mesh';

interface SpaceBodyMeshProps {
  color: string;
  radius: number;
  isStar: boolean;
}

export default function SpaceBodyMesh({ color, radius, isStar }: SpaceBodyMeshProps) {
  return (
    <group scale={[radius * 1.15, radius * 1.15, radius * 1.15]}>
      <SentientMesh
        activeObject="sphere"
        complexity="high"
        darkMode={true}
        themeColor={color}
        gradientAngle={isStar ? 30 : 45}
        gradientSpread={isStar ? 0.65 : 0.5}
        gradientFalloff={isStar ? 0.25 : 0.45}
        breathType="individual-nodes"
        intensity={isStar ? 0.25 : 0.12} // Central star pulses more; orbital bodies pulse subtly
        cadence={isStar ? 0.8 : 0.4}
      />
    </group>
  );
}
