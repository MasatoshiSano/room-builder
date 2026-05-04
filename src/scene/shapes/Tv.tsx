interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function TvShape({ width, depth, height, color }: ShapeProps) {
  const frameT = Math.min(0.025, width * 0.02);
  const screenH = height * 0.88;
  const screenW = width - frameT * 2;
  const standW = width * 0.12;
  const standH = height * 0.1;
  const standBaseW = width * 0.22;
  const standBaseH = 0.02;

  return (
    <group>
      {/* Frame */}
      <mesh position={[0, standH + standBaseH + height * 0.02 + screenH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, screenH + frameT * 2, depth]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Screen panel */}
      <mesh position={[0, standH + standBaseH + height * 0.02 + screenH / 2, depth / 2 + 0.003]}>
        <boxGeometry args={[screenW, screenH, 0.005]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Stand pole */}
      <mesh position={[0, standH / 2 + standBaseH, 0]}>
        <boxGeometry args={[standW, standH, depth * 0.6]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Stand base */}
      <mesh position={[0, standBaseH / 2, 0]}>
        <boxGeometry args={[standBaseW, standBaseH, depth]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    </group>
  );
}
