interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function RiceCookerShape({ width, depth, height, color }: ShapeProps) {
  const bodyH = height * 0.72;
  const lidH = height * 0.3;
  const lidW = width * 0.88;
  const lidD = depth * 0.88;
  const handleW = width * 0.18;
  const handleH = 0.025;
  const panelH = bodyH * 0.25;

  return (
    <group>
      {/* Body */}
      <mesh position={[0, bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, bodyH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Lid */}
      <mesh position={[0, bodyH + lidH / 2, 0]} castShadow>
        <boxGeometry args={[lidW, lidH, lidD]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Lid handle */}
      <mesh position={[0, bodyH + lidH + handleH / 2, 0]}>
        <boxGeometry args={[handleW, handleH, handleW * 0.6]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
      {/* Control panel */}
      <mesh position={[0, panelH / 2 + bodyH * 0.08, depth / 2 + 0.003]}>
        <boxGeometry args={[width * 0.75, panelH, 0.005]} />
        <meshStandardMaterial color="#cc4422" />
      </mesh>
    </group>
  );
}
