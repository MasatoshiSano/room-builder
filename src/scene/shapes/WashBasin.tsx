interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function WashBasinShape({ width, depth, height, color }: ShapeProps) {
  const cabinetH = height * 0.58;
  const basinH = height * 0.12;
  const basinW = width * 0.72;
  const basinD = depth * 0.62;
  const mirrorH = height * 0.42;
  const mirrorW = width * 0.78;
  const faucetH = 0.14;

  return (
    <group>
      {/* Cabinet body */}
      <mesh position={[0, cabinetH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, cabinetH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Counter top */}
      <mesh position={[0, cabinetH + 0.022, 0]} castShadow>
        <boxGeometry args={[width, 0.04, depth]} />
        <meshStandardMaterial color="#e8e4e0" />
      </mesh>
      {/* Basin bowl */}
      <mesh position={[0, cabinetH + 0.04 - basinH / 2 + 0.01, 0]}>
        <boxGeometry args={[basinW, basinH, basinD]} />
        <meshStandardMaterial color="#d8f0f8" transparent opacity={0.6} />
      </mesh>
      {/* Faucet base */}
      <mesh position={[0, cabinetH + 0.04 + faucetH * 0.5, -depth * 0.22]}>
        <boxGeometry args={[0.025, faucetH, 0.025]} />
        <meshStandardMaterial color="#bbbbbb" />
      </mesh>
      {/* Faucet spout */}
      <mesh position={[0, cabinetH + 0.04 + faucetH, depth * 0.05]}>
        <boxGeometry args={[0.018, 0.018, depth * 0.28]} />
        <meshStandardMaterial color="#bbbbbb" />
      </mesh>
      {/* Mirror */}
      <mesh position={[0, cabinetH + 0.04 + mirrorH / 2 + 0.05, -depth / 2 + 0.01]}>
        <boxGeometry args={[mirrorW, mirrorH, 0.012]} />
        <meshStandardMaterial color="#c8e8f0" transparent opacity={0.65} />
      </mesh>
      {/* Mirror frame */}
      <mesh position={[0, cabinetH + 0.04 + mirrorH / 2 + 0.05, -depth / 2 + 0.005]}>
        <boxGeometry args={[mirrorW + 0.02, mirrorH + 0.02, 0.008]} />
        <meshStandardMaterial color="#aaaaaa" />
      </mesh>
    </group>
  );
}
