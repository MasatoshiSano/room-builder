interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export function PlantShape({ width, depth, height, color }: ShapeProps) {
  const potH = Math.min(height * 0.22, 0.28);
  const potTopR = Math.min(width, depth) * 0.42;
  const potBottomR = potTopR * 0.75;
  const trunkH = height * 0.12;
  const trunkR = Math.min(0.04, potTopR * 0.18);
  const foliageBaseY = potH + trunkH;
  const foliageH = Math.max(0.1, height - foliageBaseY);
  const mainR = Math.min(width, depth) * 0.5;
  const leafColor = color;
  const darkLeaf = '#3a6b2f';
  const soilColor = '#3a2a1a';

  const leafBalls: Array<{ x: number; y: number; z: number; r: number; c: string }> = [
    { x: 0, y: foliageBaseY + foliageH * 0.45, z: 0, r: mainR, c: leafColor },
    { x: mainR * 0.55, y: foliageBaseY + foliageH * 0.65, z: -mainR * 0.2, r: mainR * 0.7, c: darkLeaf },
    { x: -mainR * 0.5, y: foliageBaseY + foliageH * 0.6, z: mainR * 0.25, r: mainR * 0.7, c: leafColor },
    { x: mainR * 0.15, y: foliageBaseY + foliageH * 0.85, z: mainR * 0.3, r: mainR * 0.55, c: darkLeaf },
    { x: -mainR * 0.2, y: foliageBaseY + foliageH * 0.92, z: -mainR * 0.25, r: mainR * 0.5, c: leafColor },
    { x: 0, y: foliageBaseY + foliageH * 1.0, z: 0, r: mainR * 0.45, c: darkLeaf },
  ];

  return (
    <group>
      {/* Pot — terracotta cone */}
      <mesh position={[0, potH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[potTopR, potBottomR, potH, 24]} />
        <meshStandardMaterial color="#a0522d" roughness={0.85} />
      </mesh>
      {/* Pot rim */}
      <mesh position={[0, potH - 0.015, 0]} castShadow>
        <cylinderGeometry args={[potTopR * 1.06, potTopR * 1.06, 0.03, 24]} />
        <meshStandardMaterial color="#8a4520" roughness={0.85} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, potH - 0.005, 0]}>
        <cylinderGeometry args={[potTopR * 0.95, potTopR * 0.95, 0.02, 24]} />
        <meshStandardMaterial color={soilColor} roughness={1} />
      </mesh>
      {/* Trunk */}
      <mesh position={[0, potH + trunkH / 2, 0]} castShadow>
        <cylinderGeometry args={[trunkR * 0.8, trunkR, trunkH, 12]} />
        <meshStandardMaterial color="#5b3b1e" roughness={0.9} />
      </mesh>
      {/* Foliage clusters */}
      {leafBalls.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, b.z]} castShadow receiveShadow>
          <sphereGeometry args={[b.r, 16, 12]} />
          <meshStandardMaterial color={b.c} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
