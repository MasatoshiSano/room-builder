interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function ShelfShape({ width, depth, height, color }: ShapeProps) {
  const sideThickness = 0.03;
  const shelfThickness = 0.025;
  const shelfCount = Math.max(2, Math.floor(height / 0.45));

  const shelves: number[] = [];
  for (let i = 0; i <= shelfCount; i++) {
    shelves.push((height / shelfCount) * i);
  }

  return (
    <group>
      <mesh
        position={[-width / 2 + sideThickness / 2, height / 2, 0]}
        castShadow
      >
        <boxGeometry args={[sideThickness, height, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh
        position={[width / 2 - sideThickness / 2, height / 2, 0]}
        castShadow
      >
        <boxGeometry args={[sideThickness, height, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh
        position={[0, height / 2, -depth / 2 + sideThickness / 2]}
        castShadow
      >
        <boxGeometry args={[width - sideThickness * 2, height, sideThickness]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {shelves.map((y, i) => (
        <mesh
          key={i}
          position={[0, y === 0 ? shelfThickness / 2 : y - shelfThickness / 2, 0]}
          castShadow
        >
          <boxGeometry
            args={[width - sideThickness * 2, shelfThickness, depth - sideThickness]}
          />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}
