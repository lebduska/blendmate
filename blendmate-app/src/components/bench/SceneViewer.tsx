/**
 * 3D Scene Viewer using React Three Fiber
 * Displays wireframe preview of Blender objects with real geometry
 */

import { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { BlenderObject, CachedGeometry } from '@/stores/blenderStore';

// Animation state for camera transitions
interface CameraTarget {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
}

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
  // Debug: log why we're using placeholder vs real geometry
  const useRealGeometry = geometry && !geometry.skipped && geometry.vertices.length > 0;

  console.log(`[SceneViewer] ObjectMesh "${object.name}":`, {
    hasGeometry: !!geometry,
    skipped: geometry?.skipped,
    vertexCount: geometry?.vertices?.length || 0,
    useRealGeometry,
  });

  // Use cached geometry if available and not skipped
  if (useRealGeometry) {
    return <RealGeometryMesh object={object} geometry={geometry} viewMode={viewMode} />;
  }

  // Fall back to placeholder
  return <PlaceholderMesh object={object} viewMode={viewMode} />;
}

// Earth-centric placeholder animation
function EarthCentric() {
  const earthRef = useRef<THREE.Mesh>(null);
  const moonRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Slowly rotate Earth
    if (earthRef.current) {
      earthRef.current.rotation.y = t * 0.1;
    }
    // Moon orbits Earth
    if (moonRef.current) {
      moonRef.current.position.x = Math.cos(t * 0.5) * 2;
      moonRef.current.position.z = Math.sin(t * 0.5) * 2;
      moonRef.current.position.y = Math.sin(t * 0.3) * 0.3;
    }
  });

  return (
    <group>
      {/* Earth - center of attention */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#3b82f6" wireframe />
      </mesh>

      {/* Moon */}
      <mesh ref={moonRef}>
        <sphereGeometry args={[0.27, 16, 16]} />
        <meshStandardMaterial color="#9ca3af" wireframe />
      </mesh>

      {/* Orbit line for moon */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.99, 2.01, 64]} />
        <meshBasicMaterial color="#333" side={THREE.DoubleSide} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// Camera controller for smooth transitions when object selection changes
interface CameraControllerProps {
  targetPosition: THREE.Vector3 | null;
  targetLookAt: THREE.Vector3 | null;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

function CameraController({ targetPosition, targetLookAt, controlsRef }: CameraControllerProps) {
  const { camera } = useThree();
  const isAnimating = useRef(false);
  const animationProgress = useRef(0);
  const startPosition = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  const endPosition = useRef(new THREE.Vector3());
  const endTarget = useRef(new THREE.Vector3());

  // Start animation when target changes
  useEffect(() => {
    if (targetPosition && targetLookAt && controlsRef.current) {
      // Store start positions
      startPosition.current.copy(camera.position);
      startTarget.current.copy(controlsRef.current.target);

      // Store end positions
      endPosition.current.copy(targetPosition);
      endTarget.current.copy(targetLookAt);

      // Start animation
      animationProgress.current = 0;
      isAnimating.current = true;
    }
  }, [targetPosition, targetLookAt, camera, controlsRef]);

  useFrame((_, delta) => {
    if (!isAnimating.current || !controlsRef.current) return;

    // Smooth animation using easing
    animationProgress.current += delta * 2; // Animation speed
    const t = Math.min(animationProgress.current, 1);

    // Ease out cubic for smooth deceleration
    const eased = 1 - Math.pow(1 - t, 3);

    // Lerp camera position
    camera.position.lerpVectors(startPosition.current, endPosition.current, eased);

    // Lerp controls target
    controlsRef.current.target.lerpVectors(startTarget.current, endTarget.current, eased);
    controlsRef.current.update();

    // Stop animation when complete
    if (t >= 1) {
      isAnimating.current = false;
    }
  });

  return null;
}

// Calculate optimal camera position for viewing an object
function calculateCameraTarget(
  geometry: CachedGeometry | undefined,
  object: BlenderObject
): CameraTarget {
  let center = new THREE.Vector3();
  let size = 2;

  if (geometry && geometry.vertices.length > 0) {
    // Calculate bounding box from vertices
    const vertices = geometry.vertices;
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

    for (let i = 0; i < vertices.length; i += 3) {
      // Apply coordinate swap (Blender Y/Z to Three.js)
      const x = vertices[i];
      const y = vertices[i + 2];    // Z -> Y
      const z = -vertices[i + 1];   // -Y -> Z

      min.x = Math.min(min.x, x);
      min.y = Math.min(min.y, y);
      min.z = Math.min(min.z, z);
      max.x = Math.max(max.x, x);
      max.y = Math.max(max.y, y);
      max.z = Math.max(max.z, z);
    }

    center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
    size = Math.max(max.x - min.x, max.y - min.y, max.z - min.z);
  } else if (object.dimensions && object.dimensions.length >= 3) {
    // Use object dimensions as fallback
    const [dx, dy, dz] = object.dimensions;
    size = Math.max(dx, dy, dz) || 2;

    // Use object location with coordinate swap
    if (object.location && object.location.length >= 3) {
      center = new THREE.Vector3(
        object.location[0],
        object.location[2],
        -object.location[1]
      );
    }
  }

  // Calculate camera distance based on size (ensure we can see the whole object)
  const distance = Math.max(size * 2.5, 4);

  // Position camera at 45-degree angle
  const position = new THREE.Vector3(
    center.x + distance * 0.7,
    center.y + distance * 0.5,
    center.z + distance * 0.7
  );

  return { position, lookAt: center };
}

interface SceneViewerProps {
  objects: Record<string, BlenderObject>;
  geometryCache: Record<string, CachedGeometry>;
  selectedObjectName: string | null;
  viewMode?: ViewMode;
}

function Scene({ objects, geometryCache, selectedObjectName, viewMode = 'wireframe' }: SceneViewerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [cameraTarget, setCameraTarget] = useState<CameraTarget | null>(null);
  const prevSelectedRef = useRef<string | null>(null);

  // Only show the active/selected object
  const activeObject = selectedObjectName ? objects[selectedObjectName] : null;

  // Calculate camera target when selection changes
  useEffect(() => {
    if (selectedObjectName && selectedObjectName !== prevSelectedRef.current && activeObject) {
      const geometry = geometryCache[selectedObjectName];
      const target = calculateCameraTarget(geometry, activeObject);
      setCameraTarget(target);
      prevSelectedRef.current = selectedObjectName;
    } else if (!selectedObjectName && prevSelectedRef.current) {
      // Reset to default view when deselecting
      setCameraTarget({
        position: new THREE.Vector3(8, 6, 8),
        lookAt: new THREE.Vector3(0, 0, 0)
      });
      prevSelectedRef.current = null;
    }
  }, [selectedObjectName, activeObject, geometryCache]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      {/* Camera controller for smooth transitions */}
      <CameraController
        targetPosition={cameraTarget?.position ?? null}
        targetLookAt={cameraTarget?.lookAt ?? null}
        controlsRef={controlsRef}
      />

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
        /* Show Earth when no object selected */
        <EarthCentric />
      )}

      {/* Controls */}
      <OrbitControls
        ref={controlsRef}
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
