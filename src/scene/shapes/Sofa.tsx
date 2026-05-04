interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function SofaShape({ width, depth, height, color }: ShapeProps) {
  const seatHeight = height * 0.45;
  const backHeight = height * 0.55;
  const armWidth = Math.min(width * 0.1, 0.15);
  const seatWidth = width - armWidth * 2;
  const backDepth = Math.min(depth * 0.2, 0.18);
  const legHeight = 0.08;
  const seatY = legHeight + seatHeight / 2;
  const backY = legHeight + seatHeight + backHeight / 2;
  const armY = legHeight + (seatHeight + backHeight * 0.4) / 2;

  return (
    <group>
      <mesh position={[0, seatY, 0]} castShadow receiveShadow>
        <boxGeometry args={[seatWidth, seatHeight, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[0, backY, -depth / 2 + backDepth / 2]} castShadow>
        <boxGeometry args={[width, backHeight, backDepth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[-width / 2 + armWidth / 2, armY, 0]} castShadow>
        <boxGeometry args={[armWidth, seatHeight + backHeight * 0.4, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[width / 2 - armWidth / 2, armY, 0]} castShadow>
        <boxGeometry args={[armWidth, seatHeight + backHeight * 0.4, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {[
        [-width / 2 + 0.1, -depth / 2 + 0.1],
        [width / 2 - 0.1, -depth / 2 + 0.1],
        [-width / 2 + 0.1, depth / 2 - 0.1],
        [width / 2 - 0.1, depth / 2 - 0.1],
      ].map(([lx, lz], i) => (
        <mesh
          key={i}
          position={[lx, legHeight / 2, lz]}
          castShadow
        >
          <boxGeometry args={[0.06, legHeight, 0.06]} />
          <meshStandardMaterial color="#3f3a35" />
        </mesh>
      ))}
    </group>
  );
}
