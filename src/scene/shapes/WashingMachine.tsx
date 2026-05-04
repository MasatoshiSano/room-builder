interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function WashingMachineShape({ width, depth, height, color }: ShapeProps) {
  const drumR = Math.min(width, depth) * 0.32;
  const drumT = 0.008;
  const panelH = height * 0.18;

  return (
    <group>
      {/* Body */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Top panel */}
      <mesh position={[0, height + 0.005, 0]}>
        <boxGeometry args={[width * 0.96, 0.01, depth * 0.96]} />
        <meshStandardMaterial color="#cccccc" />
      </mesh>
      {/* Door ring (drum outline) */}
      <mesh position={[0, height * 0.48, depth / 2 + drumT]}>
        <torusGeometry args={[drumR, 0.018, 8, 32]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
      {/* Door glass */}
      <mesh position={[0, height * 0.48, depth / 2 + drumT + 0.003]}>
        <circleGeometry args={[drumR - 0.018, 32]} />
        <meshStandardMaterial color="#1a2a3a" transparent opacity={0.7} />
      </mesh>
      {/* Control panel */}
      <mesh position={[0, height * 0.88, depth / 2 + 0.003]}>
        <boxGeometry args={[width * 0.75, panelH, 0.005]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
    </group>
  );
}
