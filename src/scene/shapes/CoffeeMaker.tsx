interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function CoffeeMakerShape({ width, depth, height, color }: ShapeProps) {
  const reservoirH = height * 0.35;
  const reservoirW = width * 0.55;
  const bodyH = height * 0.72;
  const plateW = width * 0.7;
  const plateH = 0.025;

  return (
    <group>
      {/* Main body */}
      <mesh position={[0, bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, bodyH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Water reservoir on top back */}
      <mesh position={[0, bodyH + reservoirH / 2, -depth * 0.18]}>
        <boxGeometry args={[reservoirW, reservoirH, depth * 0.6]} />
        <meshStandardMaterial color="#1a1a2a" />
      </mesh>
      {/* Warming plate at front bottom */}
      <mesh position={[0, plateH / 2 + 0.002, depth * 0.25]}>
        <boxGeometry args={[plateW, plateH, depth * 0.35]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Carafe hint */}
      <mesh position={[0, plateH + height * 0.22, depth * 0.2]}>
        <boxGeometry args={[width * 0.5, height * 0.38, depth * 0.3]} />
        <meshStandardMaterial color="#1a2a1a" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
