interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function BedShape({ width, depth, height, color }: ShapeProps) {
  const mattressHeight = height * 0.6;
  const headboardHeight = height;
  const headboardThickness = Math.min(depth * 0.06, 0.08);
  const frameHeight = height * 0.4;

  return (
    <group>
      <mesh position={[0, frameHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, frameHeight, depth]} />
        <meshStandardMaterial color="#5a4a3a" />
      </mesh>
      <mesh position={[0, frameHeight + mattressHeight / 2, 0]} castShadow>
        <boxGeometry
          args={[width - 0.08, mattressHeight, depth - 0.08]}
        />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh
        position={[0, headboardHeight / 2, -depth / 2 + headboardThickness / 2]}
        castShadow
      >
        <boxGeometry args={[width, headboardHeight, headboardThickness]} />
        <meshStandardMaterial color="#5a4a3a" />
      </mesh>
    </group>
  );
}
