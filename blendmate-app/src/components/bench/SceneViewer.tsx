/**
 * 3D Scene Viewer using React Three Fiber
 * Displays wireframe preview of Blender objects with real geometry
 */

import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { BlenderObject, CachedGeometry } from '@/stores/blenderStore';

// Camera path for arc trajectory animation
interface CameraPath {
  startPosition: THREE.Vector3;
  startLookAt: THREE.Vector3;
  endPosition: THREE.Vector3;
  endLookAt: THREE.Vector3;
  // Control point for Bezier curve (elevated midpoint)
  controlPoint: THREE.Vector3;
  controlLookAt: THREE.Vector3;
}

export type ViewMode = 'wireframe' | 'solid' | 'xray' | 'matcap' | 'points';

interface ObjectMeshProps {
  object: BlenderObject;
  geometry?: CachedGeometry;
  viewMode?: ViewMode;
  opacity?: number; // 0-1 for fade effects during transitions
  dimmed?: boolean; // true for non-selected objects (muted colors)
  hovered?: boolean; // true when mouse is over the object
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

// Dimmed color for non-selected objects
const DIMMED_COLOR = '#4a4a4a';
const DIMMED_OPACITY_MULTIPLIER = 0.4;
// Hover color for dimmed objects (slightly brighter)
const HOVER_COLOR = '#6a6a6a';
const HOVER_OPACITY_MULTIPLIER = 0.6;

// Component for rendering real mesh geometry with different view modes
function RealGeometryMesh({ geometry, viewMode = 'wireframe', opacity = 1, dimmed = false, hovered = false, onClick, onPointerOver, onPointerOut }: ObjectMeshProps) {
  const geo = geometry!;

  // Determine color based on state
  let color = '#ff9500'; // Default orange for selected
  if (dimmed) {
    color = hovered ? HOVER_COLOR : DIMMED_COLOR;
  }

  // Determine opacity based on state
  let effectiveOpacity = opacity;
  if (dimmed) {
    effectiveOpacity = opacity * (hovered ? HOVER_OPACITY_MULTIPLIER : DIMMED_OPACITY_MULTIPLIER);
  }

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

  // Invisible mesh for raycast/click detection (needed for wireframe/points modes)
  const invisibleHitMesh = (
    <mesh
      geometry={meshGeometry}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );

  switch (viewMode) {
    case 'wireframe':
      return (
        <group>
          {invisibleHitMesh}
          <lineSegments geometry={lineGeometry}>
            <lineBasicMaterial color={color} transparent opacity={0.9 * effectiveOpacity} />
          </lineSegments>
        </group>
      );

    case 'solid':
      return (
        <group>
          <mesh
            geometry={meshGeometry}
            onClick={onClick}
            onPointerOver={onPointerOver}
            onPointerOut={onPointerOut}
          >
            <meshStandardMaterial
              color={color}
              flatShading
              side={THREE.DoubleSide}
              transparent={effectiveOpacity < 1}
              opacity={effectiveOpacity}
            />
          </mesh>
          <lineSegments geometry={lineGeometry}>
            <lineBasicMaterial color="#000" transparent opacity={0.2 * effectiveOpacity} />
          </lineSegments>
        </group>
      );

    case 'xray':
      return (
        <group>
          <mesh
            geometry={meshGeometry}
            onClick={onClick}
            onPointerOver={onPointerOver}
            onPointerOut={onPointerOut}
          >
            <meshStandardMaterial
              color={color}
              transparent
              opacity={0.3 * effectiveOpacity}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <lineSegments geometry={lineGeometry}>
            <lineBasicMaterial color={color} transparent opacity={0.8 * effectiveOpacity} />
          </lineSegments>
        </group>
      );

    case 'matcap':
      return (
        <group>
          <mesh
            geometry={meshGeometry}
            onClick={onClick}
            onPointerOver={onPointerOver}
            onPointerOut={onPointerOut}
          >
            <meshNormalMaterial side={THREE.DoubleSide} transparent={effectiveOpacity < 1} opacity={effectiveOpacity} />
          </mesh>
          <lineSegments geometry={lineGeometry}>
            <lineBasicMaterial color="#000" transparent opacity={0.15 * effectiveOpacity} />
          </lineSegments>
        </group>
      );

    case 'points':
      return (
        <group>
          {invisibleHitMesh}
          <points geometry={pointsGeometry}>
            <pointsMaterial color={color} size={0.05} sizeAttenuation transparent={effectiveOpacity < 1} opacity={effectiveOpacity} />
          </points>
        </group>
      );

    default:
      return null;
  }
}

// Component for placeholder geometry (non-mesh objects or missing geometry)
function PlaceholderMesh({ object, opacity = 1, dimmed = false, hovered = false, onClick, onPointerOver, onPointerOut }: ObjectMeshProps) {
  // Determine opacity based on state
  let effectiveOpacity = opacity;
  if (dimmed) {
    effectiveOpacity = opacity * (hovered ? HOVER_OPACITY_MULTIPLIER : DIMMED_OPACITY_MULTIPLIER);
  }

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

  // Color based on object type (dimmed uses muted gray, hovered slightly brighter)
  const color = useMemo(() => {
    if (dimmed) return hovered ? HOVER_COLOR : DIMMED_COLOR;
    switch (object.type) {
      case 'MESH': return '#ff9500';
      case 'LIGHT': return '#facc15';
      case 'CAMERA': return '#a855f7';
      case 'EMPTY': return '#6b7280';
      case 'CURVE': return '#22c55e';
      case 'ARMATURE': return '#06b6d4';
      default: return '#94a3b8';
    }
  }, [object.type, dimmed, hovered]);

  return (
    <mesh
      position={position}
      rotation={rotation}
      geometry={geometry}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <meshBasicMaterial color={color} wireframe transparent opacity={0.8 * effectiveOpacity} />
    </mesh>
  );
}

// Main object renderer - chooses between real geometry and placeholder
function ObjectMesh({ object, geometry, viewMode, opacity = 1, dimmed = false, hovered = false, onClick, onPointerOver, onPointerOut }: ObjectMeshProps) {
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
    return (
      <RealGeometryMesh
        object={object}
        geometry={geometry}
        viewMode={viewMode}
        opacity={opacity}
        dimmed={dimmed}
        hovered={hovered}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      />
    );
  }

  // Fall back to placeholder
  return (
    <PlaceholderMesh
      object={object}
      viewMode={viewMode}
      opacity={opacity}
      dimmed={dimmed}
      hovered={hovered}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    />
  );
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

// Camera controller for smooth arc transitions when object selection changes
interface CameraControllerProps {
  cameraPath: CameraPath | null;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  onAnimationProgress?: (progress: number) => void; // 0 = start, 1 = complete
}

function CameraController({ cameraPath, controlsRef, onAnimationProgress }: CameraControllerProps) {
  const { camera } = useThree();
  const isAnimating = useRef(false);
  const animationProgress = useRef(0);
  const currentPath = useRef<CameraPath | null>(null);

  // Start animation when path changes
  useEffect(() => {
    if (cameraPath && controlsRef.current) {
      currentPath.current = cameraPath;
      animationProgress.current = 0;
      isAnimating.current = true;
      onAnimationProgress?.(0);
    }
  }, [cameraPath, controlsRef, onAnimationProgress]);

  useFrame((_, delta) => {
    if (!isAnimating.current || !controlsRef.current || !currentPath.current) return;

    const path = currentPath.current;

    // Smooth animation using easing
    animationProgress.current += delta * 1.5; // Slightly slower for arc trajectory
    const t = Math.min(animationProgress.current, 1);

    // Ease in-out cubic for smooth acceleration and deceleration
    const eased = t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // Report progress for fade effects
    onAnimationProgress?.(eased);

    // Quadratic Bezier interpolation for camera position (arc trajectory)
    // B(t) = (1-t)²·P0 + 2·(1-t)·t·P1 + t²·P2
    const oneMinusT = 1 - eased;
    const pos = new THREE.Vector3()
      .addScaledVector(path.startPosition, oneMinusT * oneMinusT)
      .addScaledVector(path.controlPoint, 2 * oneMinusT * eased)
      .addScaledVector(path.endPosition, eased * eased);

    // Quadratic Bezier for lookAt target (smoother transition between objects)
    const lookAt = new THREE.Vector3()
      .addScaledVector(path.startLookAt, oneMinusT * oneMinusT)
      .addScaledVector(path.controlLookAt, 2 * oneMinusT * eased)
      .addScaledVector(path.endLookAt, eased * eased);

    camera.position.copy(pos);
    controlsRef.current.target.copy(lookAt);
    controlsRef.current.update();

    // Stop animation when complete
    if (t >= 1) {
      isAnimating.current = false;
    }
  });

  return null;
}

// Calculate object center and size from geometry or dimensions
function getObjectBounds(
  geometry: CachedGeometry | undefined,
  object: BlenderObject
): { center: THREE.Vector3; size: number } {
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

  return { center, size };
}

// Calculate camera position preserving viewing angle (spherical coordinates relative to object)
function calculateCameraPositionWithAngle(
  objectCenter: THREE.Vector3,
  objectSize: number,
  relativeOffset: THREE.Vector3 | null
): THREE.Vector3 {
  // Calculate camera distance based on size
  const distance = Math.max(objectSize * 2.5, 4);

  if (relativeOffset) {
    // Preserve the viewing angle: normalize and scale to new distance
    const normalizedOffset = relativeOffset.clone().normalize();
    return objectCenter.clone().add(normalizedOffset.multiplyScalar(distance));
  }

  // Default: 45-degree angle
  return new THREE.Vector3(
    objectCenter.x + distance * 0.7,
    objectCenter.y + distance * 0.5,
    objectCenter.z + distance * 0.7
  );
}

// Calculate the arc control point for camera path
function calculateArcControlPoint(
  startPos: THREE.Vector3,
  startLookAt: THREE.Vector3,
  endPos: THREE.Vector3,
  endLookAt: THREE.Vector3
): { controlPoint: THREE.Vector3; controlLookAt: THREE.Vector3 } {
  // Midpoint between start and end camera positions
  const midCameraPos = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);

  // Midpoint between start and end lookAt targets
  const midLookAt = new THREE.Vector3().addVectors(startLookAt, endLookAt).multiplyScalar(0.5);

  // Calculate arc height based on distance between objects
  const objectDistance = startLookAt.distanceTo(endLookAt);
  const cameraDistance = startPos.distanceTo(endPos);
  const arcHeight = Math.max(objectDistance * 0.3, cameraDistance * 0.2, 1);

  // Elevate the control point (lift the arc)
  const controlPoint = midCameraPos.clone();
  controlPoint.y += arcHeight;

  // Control lookAt stays at midpoint (smooth transition between objects)
  const controlLookAt = midLookAt.clone();

  return { controlPoint, controlLookAt };
}

interface SceneViewerProps {
  objects: Record<string, BlenderObject>;
  geometryCache: Record<string, CachedGeometry>;
  selectedObjectName: string | null;
  viewMode?: ViewMode;
  onSelectObject?: (objectName: string | null) => void;
}

function Scene({ objects, geometryCache, selectedObjectName, viewMode = 'wireframe', onSelectObject }: SceneViewerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [cameraPath, setCameraPath] = useState<CameraPath | null>(null);
  const prevSelectedRef = useRef<string | null>(null);
  const prevObjectCenterRef = useRef<THREE.Vector3 | null>(null);

  // Hover state for interactive selection
  const [hoveredObjectName, setHoveredObjectName] = useState<string | null>(null);

  // Transition state for fade effects
  const [transitionState, setTransitionState] = useState<{
    isTransitioning: boolean;
    previousObjectName: string | null;
    progress: number;
  }>({ isTransitioning: false, previousObjectName: null, progress: 1 });

  // Get the active/selected object (used for camera calculations)
  const activeObject = selectedObjectName ? objects[selectedObjectName] : null;

  // Handle animation progress updates
  const handleAnimationProgress = useCallback((progress: number) => {
    setTransitionState(prev => ({
      ...prev,
      progress,
      isTransitioning: progress < 1,
    }));
  }, []);

  // Calculate camera path when selection changes
  useEffect(() => {
    if (selectedObjectName && selectedObjectName !== prevSelectedRef.current && activeObject) {
      const geometry = geometryCache[selectedObjectName];
      const { center: newCenter, size: newSize } = getObjectBounds(geometry, activeObject);

      // Get current camera state
      const currentCameraPos = camera.position.clone();
      const currentLookAt = controlsRef.current?.target.clone() ?? new THREE.Vector3();

      // Calculate relative offset (viewing angle) from current lookAt to camera
      const relativeOffset = currentCameraPos.clone().sub(currentLookAt);

      // Calculate new camera position preserving the viewing angle
      const newCameraPos = calculateCameraPositionWithAngle(newCenter, newSize, relativeOffset);

      // Calculate arc control point for smooth fly-through
      const { controlPoint, controlLookAt } = calculateArcControlPoint(
        currentCameraPos,
        currentLookAt,
        newCameraPos,
        newCenter
      );

      // Start transition: store previous object for fade effect
      setTransitionState({
        isTransitioning: true,
        previousObjectName: prevSelectedRef.current,
        progress: 0,
      });

      // Create camera path
      setCameraPath({
        startPosition: currentCameraPos,
        startLookAt: currentLookAt,
        endPosition: newCameraPos,
        endLookAt: newCenter,
        controlPoint,
        controlLookAt,
      });

      prevSelectedRef.current = selectedObjectName;
      prevObjectCenterRef.current = newCenter;
    } else if (!selectedObjectName && prevSelectedRef.current) {
      // Reset to default view when deselecting (Earth view)
      const currentCameraPos = camera.position.clone();
      const currentLookAt = controlsRef.current?.target.clone() ?? new THREE.Vector3();
      const defaultPos = new THREE.Vector3(8, 6, 8);
      const defaultLookAt = new THREE.Vector3(0, 0, 0);

      const { controlPoint, controlLookAt } = calculateArcControlPoint(
        currentCameraPos,
        currentLookAt,
        defaultPos,
        defaultLookAt
      );

      // Start transition: store previous object for fade effect
      setTransitionState({
        isTransitioning: true,
        previousObjectName: prevSelectedRef.current,
        progress: 0,
      });

      setCameraPath({
        startPosition: currentCameraPos,
        startLookAt: currentLookAt,
        endPosition: defaultPos,
        endLookAt: defaultLookAt,
        controlPoint,
        controlLookAt,
      });

      prevSelectedRef.current = null;
      prevObjectCenterRef.current = null;
    }
  }, [selectedObjectName, activeObject, geometryCache, camera]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      {/* Camera controller for smooth arc transitions */}
      <CameraController
        cameraPath={cameraPath}
        controlsRef={controlsRef}
        onAnimationProgress={handleAnimationProgress}
      />

      {/* Grid - show when there are objects */}
      {Object.keys(objects).length > 0 && (
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
      )}

      {/* Render all objects */}
      {Object.entries(objects).map(([name, obj]) => {
        const isSelected = name === selectedObjectName;
        const isPreviousTransitioning = transitionState.isTransitioning && name === transitionState.previousObjectName;
        const isNewTransitioning = transitionState.isTransitioning && isSelected;

        // During transition: previous fades out, new fades in
        let opacity = 1;
        if (isPreviousTransitioning) {
          opacity = 1 - transitionState.progress;
        } else if (isNewTransitioning) {
          opacity = transitionState.progress;
        }

        // Non-selected objects are dimmed (except during their fade transition)
        const dimmed = !isSelected && !isPreviousTransitioning;
        const hovered = hoveredObjectName === name;

        return (
          <ObjectMesh
            key={name}
            object={obj}
            geometry={geometryCache[name]}
            viewMode={viewMode}
            opacity={opacity}
            dimmed={dimmed}
            hovered={hovered}
            onClick={() => onSelectObject?.(name)}
            onPointerOver={() => setHoveredObjectName(name)}
            onPointerOut={() => setHoveredObjectName(null)}
          />
        );
      })}

      {/* Show Earth when no objects exist */}
      {Object.keys(objects).length === 0 && (
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

export default function SceneViewer({ objects, geometryCache, selectedObjectName, viewMode = 'wireframe', onSelectObject }: SceneViewerProps) {
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
        <Scene objects={objects} geometryCache={geometryCache} selectedObjectName={selectedObjectName} viewMode={viewMode} onSelectObject={onSelectObject} />
      </Canvas>
    </div>
  );
}
