interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function ToasterShape({ width, depth, height, color }: ShapeProps) {
  const slotW = width * 0.28;
  const slotD = depth * 0.55;
  const slotH = 0.01;
  const leverW = 0.015;
  const leverH = height * 0.35;

  return (
    <group>
      {/* Body */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Slot 1 */}
      <mesh position={[-width * 0.18, height - slotH / 2, 0]}>
        <boxGeometry args={[slotW, slotH, slotD]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Slot 2 */}
      <mesh position={[width * 0.18, height - slotH / 2, 0]}>
        <boxGeometry args={[slotW, slotH, slotD]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Lever */}
      <mesh position={[width / 2 + leverW / 2, height * 0.35, 0]}>
        <boxGeometry args={[leverW, leverH, leverW * 2]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
    </group>
  );
}
