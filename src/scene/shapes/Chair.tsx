interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function ChairShape({ width, depth, height, color }: ShapeProps) {
  const seatHeight = height * 0.5;
  const seatThickness = 0.05;
  const backHeight = height - seatHeight;
  const backThickness = Math.min(depth * 0.08, 0.04);
  const legSize = 0.04;
  const legY = (seatHeight - seatThickness) / 2;

  const legPositions: Array<[number, number]> = [
    [-width / 2 + legSize, -depth / 2 + legSize],
    [width / 2 - legSize, -depth / 2 + legSize],
    [-width / 2 + legSize, depth / 2 - legSize],
    [width / 2 - legSize, depth / 2 - legSize],
  ];

  return (
    <group>
      <mesh
        position={[0, seatHeight - seatThickness / 2, 0]}
        castShadow
      >
        <boxGeometry args={[width, seatThickness, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh
        position={[0, seatHeight + backHeight / 2, -depth / 2 + backThickness / 2]}
        castShadow
      >
        <boxGeometry args={[width, backHeight, backThickness]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {legPositions.map(([lx, lz], i) => (
        <mesh key={i} position={[lx, legY, lz]} castShadow>
          <boxGeometry args={[legSize, seatHeight - seatThickness, legSize]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}
