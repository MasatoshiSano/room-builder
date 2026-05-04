interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function TableShape({ width, depth, height, color }: ShapeProps) {
  const topThickness = Math.min(height * 0.06, 0.05);
  const legSize = 0.06;
  const inset = 0.04;
  const legHeight = height - topThickness;

  const legPositions: Array<[number, number]> = [
    [-width / 2 + inset + legSize / 2, -depth / 2 + inset + legSize / 2],
    [width / 2 - inset - legSize / 2, -depth / 2 + inset + legSize / 2],
    [-width / 2 + inset + legSize / 2, depth / 2 - inset - legSize / 2],
    [width / 2 - inset - legSize / 2, depth / 2 - inset - legSize / 2],
  ];

  return (
    <group>
      <mesh position={[0, legHeight + topThickness / 2, 0]} castShadow>
        <boxGeometry args={[width, topThickness, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {legPositions.map(([lx, lz], i) => (
        <mesh key={i} position={[lx, legHeight / 2, lz]} castShadow>
          <boxGeometry args={[legSize, legHeight, legSize]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}
