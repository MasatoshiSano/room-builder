interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function NightstandShape({ width, depth, height, color }: ShapeProps) {
  const drawerHeight = height * 0.3;
  const baseHeight = height - drawerHeight;
  return (
    <group>
      <mesh position={[0, baseHeight / 2, 0]} castShadow>
        <boxGeometry args={[width, baseHeight, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, baseHeight + drawerHeight / 2, 0]} castShadow>
        <boxGeometry args={[width * 0.97, drawerHeight, depth * 0.97]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh
        position={[0, baseHeight + drawerHeight / 2, depth / 2 - 0.001]}
        castShadow
      >
        <boxGeometry args={[width * 0.4, drawerHeight * 0.2, 0.01]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
    </group>
  );
}
