interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function DeskShape({ width, depth, height, color }: ShapeProps) {
  const topThickness = Math.min(height * 0.06, 0.04);
  const legHeight = height - topThickness;
  const drawerWidth = Math.min(width * 0.35, 0.45);
  const drawerHeight = legHeight * 0.55;

  return (
    <group>
      <mesh position={[0, legHeight + topThickness / 2, 0]} castShadow>
        <boxGeometry args={[width, topThickness, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh
        position={[
          width / 2 - drawerWidth / 2,
          legHeight - drawerHeight / 2,
          0,
        ]}
        castShadow
      >
        <boxGeometry args={[drawerWidth, drawerHeight, depth * 0.95]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh
        position={[
          -width / 2 + 0.04,
          legHeight / 2,
          -depth / 2 + 0.04,
        ]}
        castShadow
      >
        <boxGeometry args={[0.05, legHeight, 0.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh
        position={[
          -width / 2 + 0.04,
          legHeight / 2,
          depth / 2 - 0.04,
        ]}
        castShadow
      >
        <boxGeometry args={[0.05, legHeight, 0.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
