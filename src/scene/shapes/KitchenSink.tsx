interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function KitchenSinkShape({ width, depth, height, color }: ShapeProps) {
  const counterH = height * 0.94;
  const basinDepth = Math.min(0.18, depth * 0.35);
  const basinW = width * 0.55;
  const basinD = depth * 0.55;
  const faucetH = 0.18;
  const faucetW = 0.025;

  return (
    <group>
      {/* Counter body */}
      <mesh position={[0, counterH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, counterH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Sink basin (slightly indented on top) */}
      <mesh position={[-width * 0.1, counterH - basinDepth / 2, 0]}>
        <boxGeometry args={[basinW, basinDepth, basinD]} />
        <meshStandardMaterial color="#9ab0c0" />
      </mesh>
      {/* Faucet base */}
      <mesh position={[-width * 0.1, counterH + faucetH / 2, -depth * 0.2]}>
        <boxGeometry args={[faucetW * 2, faucetH, faucetW]} />
        <meshStandardMaterial color="#aaaaaa" />
      </mesh>
      {/* Faucet spout */}
      <mesh position={[-width * 0.1, counterH + faucetH, 0]}>
        <boxGeometry args={[faucetW, faucetW, depth * 0.3]} />
        <meshStandardMaterial color="#aaaaaa" />
      </mesh>
    </group>
  );
}
