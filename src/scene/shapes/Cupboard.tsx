interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function CupboardShape({ width, depth, height, color }: ShapeProps) {
  const lowerH = height * 0.45;
  const upperH = height - lowerH - 0.05;
  const doorInset = 0.01;
  return (
    <group>
      <mesh position={[0, lowerH / 2, 0]} castShadow>
        <boxGeometry args={[width, lowerH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, lowerH + 0.025, 0]} castShadow>
        <boxGeometry args={[width + 0.04, 0.05, depth + 0.04]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh
        position={[0, lowerH + 0.05 + upperH / 2, 0]}
        castShadow
      >
        <boxGeometry args={[width * 0.96, upperH, depth * 0.96]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh
        position={[
          0,
          lowerH + 0.05 + upperH / 2,
          depth * 0.48 + doorInset,
        ]}
      >
        <boxGeometry args={[width * 0.9, upperH * 0.9, 0.02]} />
        <meshStandardMaterial
          color="#cfd8e8"
          transparent
          opacity={0.6}
        />
      </mesh>
      <mesh
        position={[0, lowerH / 2, depth / 2 + 0.001]}
        castShadow
      >
        <boxGeometry args={[width * 0.04, lowerH * 0.4, 0.01]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
    </group>
  );
}
