interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function BoxShape({ width, depth, height, color }: ShapeProps) {
  return (
    <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
