interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function RefrigeratorShape({ width, depth, height, color }: ShapeProps) {
  const freezerH = height * 0.32;
  const fridgeH = height - freezerH;
  const handleW = 0.02;
  const handleH = height * 0.18;
  const handleOffset = width * 0.38;

  return (
    <group>
      {/* Main fridge body (lower) */}
      <mesh position={[0, fridgeH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, fridgeH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Freezer body (upper) */}
      <mesh position={[0, fridgeH + freezerH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, freezerH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Door seam between fridge and freezer */}
      <mesh position={[0, fridgeH, depth / 2 + 0.003]}>
        <boxGeometry args={[width, 0.008, 0.006]} />
        <meshStandardMaterial color="#999990" />
      </mesh>
      {/* Fridge handle */}
      <mesh position={[handleOffset, fridgeH * 0.55, depth / 2 + 0.025]}>
        <boxGeometry args={[handleW, handleH, handleW]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
      {/* Freezer handle */}
      <mesh position={[handleOffset, fridgeH + freezerH * 0.5, depth / 2 + 0.025]}>
        <boxGeometry args={[handleW, handleH * 0.55, handleW]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
    </group>
  );
}
