/**
 * 3D Scene Viewer using React Three Fiber
 * Displays wireframe preview of Blender objects with real geometry
 */

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { BlenderObject, CachedGeometry } from '@/stores/blenderStore';

export type ViewMode = 'wireframe' | 'solid' | 'xray' | 'matcap' | 'points';

interface ObjectMeshProps {
  object: BlenderObject;
  geometry?: CachedGeometry;
  viewMode?: ViewMode;
}

// Component for rendering real mesh geometry with different view modes
function RealGeometryMesh({ geometry, viewMode = 'wireframe' }: ObjectMeshProps) {
  const geo = geometry!;

  // Create vertex positions (shared by all modes)
  const vertexPositions = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < geo.vertices.length; i += 3) {
      // Swap Y and Z for Three.js coordinate system
      positions.push(
        geo.vertices[i],        // X
        geo.vertices[i + 2],    // Z -> Y
        -geo.vertices[i + 1]    // -Y -> Z
      );
    }
    return new THREE.Float32BufferAttribute(positions, 3);
  }, [geo.vertices]);

  // Create LineSegments geometry from edges (for wireframe)
  const lineGeometry = useMemo(() => {
    const bufferGeometry = new THREE.BufferGeometry();
    const positions: number[] = [];

    for (let i = 0; i < geo.edges.length; i += 2) {
      const v1Idx = geo.edges[i] * 3;
      const v2Idx = geo.edges[i + 1] * 3;

      positions.push(
        geo.vertices[v1Idx],
        geo.vertices[v1Idx + 2],
        -geo.vertices[v1Idx + 1]
      );
      positions.push(
        geo.vertices[v2Idx],
        geo.vertices[v2Idx + 2],
        -geo.vertices[v2Idx + 1]
      );
    }

    bufferGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return bufferGeometry;
  }, [geo]);

  // Create indexed mesh geometry with triangles (for solid modes)
  const meshGeometry = useMemo(() => {
    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute('position', vertexPositions);

    // Use triangle indices if available
    if (geo.triangles && geo.triangles.length > 0) {
      bufferGeometry.setIndex(geo.triangles);
    }

    bufferGeometry.computeVertexNormals();
    return bufferGeometry;
  }, [vertexPositions, geo.triangles]);

  // Points geometry
  const pointsGeometry = useMemo(() => {
    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute('position', vertexPositions);
    return bufferGeometry;
  }, [vertexPositions]);

  switch (viewMode) {
    case 'wireframe':
      return (
        <lineSegments geometry={lineGeometry}>
          <lineBasicMaterial color="#ff9500" transparent opacity={0.9} />
        </lineSegments>
      );

    case 'solid':
      return (
        <group>
          <mesh geometry={meshGeometry}>
            <meshStandardMaterial
              color="#ff9500"
              flatShading
              side={THREE.DoubleSide}
            />
          </mesh>
          <lineSegments geometry={lineGeometry}>
            <lineBasicMaterial color="#000" transparent opacity={0.2} />
          </lineSegments>
        </group>
      );

    case 'xray':
      return (
        <group>
          <mesh geometry={meshGeometry}>
            <meshStandardMaterial
              color="#ff9500"
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <lineSegments geometry={lineGeometry}>
            <lineBasicMaterial color="#ff9500" transparent opacity={0.8} />
          </lineSegments>
        </group>
      );

    case 'matcap':
      return (
        <group>
          <mesh geometry={meshGeometry}>
            <meshNormalMaterial side={THREE.DoubleSide} />
          </mesh>
          <lineSegments geometry={lineGeometry}>
            <lineBasicMaterial color="#000" transparent opacity={0.15} />
          </lineSegments>
        </group>
      );

    case 'points':
      return (
        <points geometry={pointsGeometry}>
          <pointsMaterial color="#ff9500" size={0.05} sizeAttenuation />
        </points>
      );

    default:
      return null;
  }
}

// Component for placeholder geometry (non-mesh objects or missing geometry)
function PlaceholderMesh({ object }: ObjectMeshProps) {
  // Create geometry based on object type
  const geometry = useMemo(() => {
    const dims = object.dimensions;
    const [x, y, z] = dims?.length >= 3 ? dims : [1, 1, 1];

    switch (object.type) {
      case 'MESH':
        return new THREE.BoxGeometry(x || 1, z || 1, y || 1);
      case 'LIGHT':
        return new THREE.SphereGeometry(0.3, 16, 16);
      case 'CAMERA':
        return new THREE.ConeGeometry(0.4, 0.8, 4);
      case 'EMPTY':
        return new THREE.OctahedronGeometry(0.3);
      case 'CURVE':
        return new THREE.TorusKnotGeometry(0.4, 0.15, 64, 8);
      case 'ARMATURE':
        return new THREE.ConeGeometry(0.2, 0.6, 6);
      default:
        return new THREE.BoxGeometry(x || 1, z || 1, y || 1);
    }
  }, [object]);

  // Position from Blender (swap Y and Z for Three.js coordinate system)
  const position: [number, number, number] = useMemo(() => {
    const loc = object.location;
    if (!loc || loc.length < 3) return [0, 0, 0];
    return [loc[0], loc[2], -loc[1]];
  }, [object.location]);

  // Rotation from Blender
  const rotation: [number, number, number] = useMemo(() => {
    const rot = object.rotation_euler;
    if (!rot || rot.length < 3) return [0, 0, 0];
    return [rot[0], rot[2], -rot[1]];
  }, [object.rotation_euler]);

  // Color based on object type
  const color = useMemo(() => {
    switch (object.type) {
      case 'MESH': return '#ff9500';
      case 'LIGHT': return '#facc15';
      case 'CAMERA': return '#a855f7';
      case 'EMPTY': return '#6b7280';
      case 'CURVE': return '#22c55e';
      case 'ARMATURE': return '#06b6d4';
      default: return '#94a3b8';
    }
  }, [object.type]);

  return (
    <mesh position={position} rotation={rotation} geometry={geometry}>
      <meshBasicMaterial color={color} wireframe transparent opacity={0.8} />
    </mesh>
  );
}

// Main object renderer - chooses between real geometry and placeholder
function ObjectMesh({ object, geometry, viewMode }: ObjectMeshProps) {
  // Use cached geometry if available and not skipped
  if (geometry && !geometry.skipped && geometry.vertices.length > 0) {
    return <RealGeometryMesh object={object} geometry={geometry} viewMode={viewMode} />;
  }

  // Fall back to placeholder
  return <PlaceholderMesh object={object} viewMode={viewMode} />;
}

// Animated planet component
function Planet({
  radius,
  color,
  orbitRadius,
  orbitSpeed,
  hasRing
}: {
  radius: number;
  color: string;
  orbitRadius: number;
  orbitSpeed: number;
  hasRing?: boolean;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime() * orbitSpeed;
      ref.current.position.x = Math.cos(t) * orbitRadius;
      ref.current.position.z = Math.sin(t) * orbitRadius;
    }
  });

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial color={color} wireframe />
      </mesh>
      {hasRing && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 1.4, radius * 2, 32]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

// Moon orbiting a planet
function Moon({ parentRef, radius, orbitRadius, orbitSpeed, color }: {
  parentRef: React.RefObject<THREE.Group | null>;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ref.current && parentRef.current) {
      const t = clock.getElapsedTime() * orbitSpeed;
      ref.current.position.x = parentRef.current.position.x + Math.cos(t) * orbitRadius;
      ref.current.position.z = parentRef.current.position.z + Math.sin(t) * orbitRadius;
      ref.current.position.y = Math.sin(t * 0.5) * 0.1;
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius, 8, 8]} />
      <meshStandardMaterial color={color} wireframe />
    </mesh>
  );
}

// Earth with Moon
function EarthSystem() {
  const earthRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (earthRef.current) {
      const t = clock.getElapsedTime() * 0.3;
      earthRef.current.position.x = Math.cos(t) * 3;
      earthRef.current.position.z = Math.sin(t) * 3;
    }
  });

  return (
    <>
      <group ref={earthRef}>
        <mesh>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color="#3b82f6" wireframe />
        </mesh>
      </group>
      <Moon parentRef={earthRef} radius={0.08} orbitRadius={0.5} orbitSpeed={2} color="#9ca3af" />
    </>
  );
}

// Solar system placeholder animation
function SolarSystem() {
  const sunRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (sunRef.current) {
      sunRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
  });

  return (
    <group>
      {/* Sun */}
      <mesh ref={sunRef}>
        <sphereGeometry args={[0.5, 24, 24]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} wireframe />
      </mesh>

      {/* Mercury */}
      <Planet radius={0.1} color="#9ca3af" orbitRadius={1.2} orbitSpeed={1.5} />

      {/* Venus */}
      <Planet radius={0.2} color="#fbbf24" orbitRadius={2} orbitSpeed={0.8} />

      {/* Earth + Moon */}
      <EarthSystem />

      {/* Mars */}
      <Planet radius={0.15} color="#ef4444" orbitRadius={4} orbitSpeed={0.4} />

      {/* Saturn with rings */}
      <Planet radius={0.35} color="#d4a574" orbitRadius={5.5} orbitSpeed={0.15} hasRing />

      {/* Orbit lines */}
      {[1.2, 2, 3, 4, 5.5].map((r) => (
        <mesh key={r} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r - 0.01, r + 0.01, 64]} />
          <meshBasicMaterial color="#333" side={THREE.DoubleSide} transparent opacity={0.3} />
        </mesh>
      ))}

      {/* Hint text */}
      <Text
        position={[0, -2, 0]}
        fontSize={0.3}
        color="#666"
        anchorX="center"
        anchorY="middle"
      >
        Select an object in the Outliner
      </Text>
    </group>
  );
}

interface SceneViewerProps {
  objects: Record<string, BlenderObject>;
  geometryCache: Record<string, CachedGeometry>;
  selectedObjectName: string | null;
  viewMode?: ViewMode;
}

function Scene({ objects, geometryCache, selectedObjectName, viewMode = 'wireframe' }: SceneViewerProps) {
  // Only show the active/selected object
  const activeObject = selectedObjectName ? objects[selectedObjectName] : null;

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      {activeObject && selectedObjectName ? (
        <>
          {/* Grid for object view */}
          <Grid
            args={[20, 20]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#444"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#666"
            fadeDistance={30}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid
          />

          {/* Render the active object */}
          <ObjectMesh
            object={activeObject}
            geometry={geometryCache[selectedObjectName]}
            viewMode={viewMode}
          />
        </>
      ) : (
        /* Show solar system when no object selected */
        <SolarSystem />
      )}

      {/* Controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={100}
      />

      {/* Gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport
          axisColors={['#f43f5e', '#22c55e', '#3b82f6']}
          labelColor="white"
        />
      </GizmoHelper>
    </>
  );
}

export default function SceneViewer({ objects, geometryCache, selectedObjectName, viewMode = 'wireframe' }: SceneViewerProps) {
  return (
    <div className="w-full h-full" style={{ background: 'var(--islands-color-background-primary)' }}>
      <Canvas
        camera={{
          position: [8, 6, 8],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        gl={{
          antialias: true,
          alpha: true,
        }}
      >
        <color attach="background" args={['#1a1a1a']} />
        <Scene objects={objects} geometryCache={geometryCache} selectedObjectName={selectedObjectName} viewMode={viewMode} />
      </Canvas>
    </div>
  );
}
