interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function StoveShape({ width, depth, height, color }: ShapeProps) {
  const counterH = height * 0.94;
  const burnerR = Math.min(width * 0.13, depth * 0.13);
  const burnerH = 0.012;
  const burnerPositions = [
    [-width * 0.25, -depth * 0.22],
    [width * 0.25, -depth * 0.22],
    [-width * 0.25, depth * 0.22],
    [width * 0.25, depth * 0.22],
  ];

  return (
    <group>
      {/* Counter body */}
      <mesh position={[0, counterH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, counterH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Burners */}
      {burnerPositions.map(([bx, bz], i) => (
        <mesh key={i} position={[bx, counterH + burnerH / 2, bz]}>
          <cylinderGeometry args={[burnerR, burnerR, burnerH, 12]} />
          <meshStandardMaterial color="#555550" />
        </mesh>
      ))}
      {/* Control panel hint at front */}
      <mesh position={[0, counterH * 0.6, depth / 2 + 0.003]}>
        <boxGeometry args={[width * 0.7, counterH * 0.12, 0.005]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    </group>
  );
}
