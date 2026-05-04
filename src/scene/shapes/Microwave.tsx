interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function MicrowaveShape({ width, depth, height, color }: ShapeProps) {
  const panelW = width * 0.22;
  const windowW = width * 0.6;
  const windowH = height * 0.6;

  return (
    <group>
      {/* Body */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Door window */}
      <mesh position={[-width * 0.1, height / 2, depth / 2 + 0.003]}>
        <boxGeometry args={[windowW, windowH, 0.005]} />
        <meshStandardMaterial color="#1a3a1a" />
      </mesh>
      {/* Control panel */}
      <mesh position={[width * 0.35, height / 2, depth / 2 + 0.003]}>
        <boxGeometry args={[panelW, height * 0.8, 0.005]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      {/* Door handle */}
      <mesh position={[width * 0.16, height / 2, depth / 2 + 0.02]}>
        <boxGeometry args={[0.015, height * 0.5, 0.015]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
    </group>
  );
}
