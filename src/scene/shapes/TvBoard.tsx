interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function TvBoardShape({ width, depth, height, color }: ShapeProps) {
  const legH = Math.min(0.08, height * 0.18);
  const legW = 0.04;
  const bodyH = height - legH;

  return (
    <group>
      {/* Main body */}
      <mesh position={[0, legH + bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, bodyH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Door divider line */}
      <mesh position={[0, legH + bodyH / 2, depth / 2 + 0.002]} castShadow={false}>
        <boxGeometry args={[0.008, bodyH * 0.8, 0.004]} />
        <meshStandardMaterial color="#3a2e24" />
      </mesh>
      {/* Legs */}
      {[
        [-width / 2 + legW, 0, -depth / 2 + legW],
        [width / 2 - legW, 0, -depth / 2 + legW],
        [-width / 2 + legW, 0, depth / 2 - legW],
        [width / 2 - legW, 0, depth / 2 - legW],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y + legH / 2, z]}>
          <boxGeometry args={[legW, legH, legW]} />
          <meshStandardMaterial color="#2a2018" />
        </mesh>
      ))}
    </group>
  );
}
