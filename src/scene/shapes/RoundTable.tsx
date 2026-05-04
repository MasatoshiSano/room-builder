interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function RoundTableShape({ width, depth, height, color }: ShapeProps) {
  const topThickness = Math.min(height * 0.06, 0.05);
  const legHeight = height - topThickness;
  const radius = Math.min(width, depth) / 2;
  const pillarRadius = Math.max(0.04, radius * 0.08);

  return (
    <group>
      <mesh
        position={[0, legHeight + topThickness / 2, 0]}
        scale={[1, 1, depth / width]}
        castShadow
      >
        <cylinderGeometry args={[radius, radius, topThickness, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, legHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[pillarRadius, pillarRadius, legHeight, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.45, radius * 0.5, 0.04, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
