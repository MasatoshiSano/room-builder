interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function PlantShape({ width, depth, height, color }: ShapeProps) {
  const potH = height * 0.22;
  const trunkH = height * 0.18;
  const trunkW = Math.min(0.06, width * 0.15);
  const foliageH = height - potH - trunkH;
  const potTopW = width * 0.85;

  return (
    <group>
      {/* Pot - trapezoid approximation using tapered box */}
      <mesh position={[0, potH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[potTopW, potH, Math.min(potTopW, depth * 0.85)]} />
        <meshStandardMaterial color="#b55e3b" />
      </mesh>
      {/* Trunk */}
      <mesh position={[0, potH + trunkH / 2, 0]} castShadow>
        <boxGeometry args={[trunkW, trunkH, trunkW]} />
        <meshStandardMaterial color="#7a5c3a" />
      </mesh>
      {/* Main foliage */}
      <mesh position={[0, potH + trunkH + foliageH * 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, foliageH * 0.75, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Top foliage (slightly narrower and taller) */}
      <mesh position={[0, potH + trunkH + foliageH * 0.82, 0]} castShadow>
        <boxGeometry args={[width * 0.7, foliageH * 0.4, depth * 0.7]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
