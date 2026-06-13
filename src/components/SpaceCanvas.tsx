import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import SpaceBodyMesh from './SpaceBodyMesh';

// Import astronomy-engine functions
import { Body, HelioVector, MakeTime } from 'astronomy-engine';

export interface CelestialBody {
  id: string;
  name: string;
  mass: number;
  radius: number;
  color: string;
  position: [number, number, number];
  velocity: [number, number, number];
  isStatic: boolean;
  enabled?: boolean; // new toggle setting
}

interface SpaceCanvasProps {
  planets: CelestialBody[];
  selectedPlanetId: string;
  gravityConstant: number;
  simulationSpeed: number;
  showTrails: boolean;
  showFabric: boolean; // new fabric setting
  transparentBackground: boolean;
  backgroundColor: string;
  onCameraChange: (position: [number, number, number], target: [number, number, number]) => void;
  onSelectPlanet: (id: string) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  captureRef: React.MutableRefObject<any>;
  isPaused: boolean;
  simulationEngine: 'realistic' | 'sandbox';
  realisticSpeedDays: number;
  showOrbitLines: boolean;
  fineGrid: boolean;
}

const BODY_MAP: { [key: string]: Body } = {
  mercury: Body.Mercury,
  venus: Body.Venus,
  earth: Body.Earth,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
};

// Manages planetary positions physics loop (Newtonian Sandbox vs Astronomy Engine)
function PhysicsEngine({
  planets,
  selectedPlanetId,
  gravityConstant,
  simulationSpeed,
  showTrails,
  showFabric,
  onSelectPlanet,
  isPaused,
  simulationEngine,
  realisticSpeedDays,
  showOrbitLines,
  fineGrid,
}: {
  planets: CelestialBody[];
  selectedPlanetId: string;
  gravityConstant: number;
  simulationSpeed: number;
  showTrails: boolean;
  showFabric: boolean;
  onSelectPlanet: (id: string) => void;
  isPaused: boolean;
  simulationEngine: SpaceCanvasProps['simulationEngine'];
  realisticSpeedDays: number;
  showOrbitLines: boolean;
  fineGrid: boolean;
}) {
  const { scene, controls } = useThree();
  const bodiesRef = useRef<CelestialBody[]>([]);
  const meshRefs = useRef<{ [id: string]: THREE.Group }>({});
  const trailRefs = useRef<{ [id: string]: { line: THREE.Line; points: THREE.Vector3[] } }>({});
  const gridGeomRef = useRef<THREE.PlaneGeometry>(null);

  const hoveredPlanetRef = useRef<string | null>(null);

  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      if (e.deltaY < 0 && hoveredPlanetRef.current) {
        onSelectPlanet(hoveredPlanetRef.current);
      }
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleGlobalWheel);
      document.body.style.cursor = 'auto';
    };
  }, [onSelectPlanet]);

  const getOrbitRadius = (p: CelestialBody) => {
    if (simulationEngine === 'realistic') {
      const a = SEMI_MAJOR_AXES[p.id];
      if (a !== undefined) {
        return 2.0 + Math.pow(a, 0.7) * 5.5;
      }
    }
    return p.position[0];
  };

  // Track date for realistic simulation
  const realisticDateRef = useRef<Date>(new Date(2026, 0, 1)); // start at Jan 1, 2026

  // Sync React state updates into our local physics ref (ignore disabled planets)
  useEffect(() => {
    bodiesRef.current = planets
      .filter((p) => p.enabled !== false)
      .map((p) => ({
        ...p,
        position: [...p.position] as [number, number, number],
        velocity: [...p.velocity] as [number, number, number],
      }));
  }, [planets]);

  // Handle building and cleaning up trail lines for enabled planets
  useEffect(() => {
    const newTrailRefs: typeof trailRefs.current = {};
    const activePlanets = planets.filter((p) => p.enabled !== false);
    
    activePlanets.forEach((p) => {
      if (trailRefs.current[p.id]) {
        newTrailRefs[p.id] = trailRefs.current[p.id];
      } else {
        const material = new THREE.LineBasicMaterial({
          color: new THREE.Color(p.color),
          transparent: true,
          opacity: 0.35,
          blending: THREE.AdditiveBlending,
        });
        const geometry = new THREE.BufferGeometry().setFromPoints([]);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        newTrailRefs[p.id] = { line, points: [] };
      }
    });

    // Clean up removed trails
    Object.keys(trailRefs.current).forEach((id) => {
      if (!newTrailRefs[id]) {
        scene.remove(trailRefs.current[id].line);
        trailRefs.current[id].line.geometry.dispose();
        (trailRefs.current[id].line.material as THREE.Material).dispose();
      }
    });

    trailRefs.current = newTrailRefs;

    return () => {
      Object.values(trailRefs.current).forEach((t) => {
        scene.remove(t.line);
        t.line.geometry.dispose();
        (t.line.material as THREE.Material).dispose();
      });
    };
  }, [planets, scene]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const bodies = bodiesRef.current;

    if (!isPaused) {
      if (simulationEngine === 'realistic') {
        // --- MODE A: REALISTIC EPHEMERIS (ASTRONOMY ENGINE) ---
        const msToAdd = dt * realisticSpeedDays * 24 * 60 * 60 * 1000;
        realisticDateRef.current = new Date(realisticDateRef.current.getTime() + msToAdd);

        const astroTime = MakeTime(realisticDateRef.current);

        bodies.forEach((body) => {
          if (body.isStatic) {
            body.position = [0, 0, 0];
          } else {
            const targetBody = BODY_MAP[body.id];
            if (targetBody !== undefined) {
              try {
                const vec = HelioVector(targetBody, astroTime);
                const dist = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
                if (dist > 0) {
                  // Compress orbits non-linearly to fit on screen but shift out to prevent overlap with the Sun
                  const visualDist = 2.0 + Math.pow(dist, 0.7) * 5.5;
                  const scale = visualDist / dist;
                  
                  // Rotate J2000 equatorial to J2000 ecliptic frame
                  const ob = 23.4392911 * Math.PI / 180;
                  const cosOb = Math.cos(ob);
                  const sinOb = Math.sin(ob);
                  
                  const x_ecl = vec.x;
                  const y_ecl = vec.y * cosOb + vec.z * sinOb;
                  const z_ecl = -vec.y * sinOb + vec.z * cosOb;
                  
                  // Map to Three.js coordinates [X, Y, Z] where:
                  // X = horizontal (x_ecl), Y = height (z_ecl, small inclination), Z = depth (y_ecl)
                  body.position = [x_ecl * scale, z_ecl * scale, y_ecl * scale];
                }
              } catch (err) {
                console.error(`Error calculating HelioVector for ${body.name}:`, err);
              }
            }
          }
        });
      } else {
        // --- MODE B: NEWTONIAN SANDBOX (GRAVITY PHYSICS) ---
        const steps = 4;
        const subDt = (dt * simulationSpeed) / steps;
        const G = gravityConstant;

        for (let step = 0; step < steps; step++) {
          const accelerations = bodies.map(() => new THREE.Vector3(0, 0, 0));

          for (let i = 0; i < bodies.length; i++) {
            if (bodies[i].isStatic) continue;

            const posI = new THREE.Vector3(...bodies[i].position);
            
            for (let j = 0; j < bodies.length; j++) {
              if (i === j) continue;

              const posJ = new THREE.Vector3(...bodies[j].position);
              const rVec = new THREE.Vector3().subVectors(posJ, posI);
              const dist = rVec.length();
              
              const distSq = dist * dist + 0.05; 
              const forceMagnitude = (G * bodies[j].mass) / (distSq * Math.sqrt(distSq));
              
              accelerations[i].addScaledVector(rVec, forceMagnitude);
            }
          }

          for (let i = 0; i < bodies.length; i++) {
            if (bodies[i].isStatic) continue;

            bodies[i].velocity[0] += accelerations[i].x * subDt;
            bodies[i].velocity[1] += accelerations[i].y * subDt;
            bodies[i].velocity[2] += accelerations[i].z * subDt;

            bodies[i].position[0] += bodies[i].velocity[0] * subDt;
            bodies[i].position[1] += bodies[i].velocity[1] * subDt;
            bodies[i].position[2] += bodies[i].velocity[2] * subDt;
          }
        }
      }
    }

    // Calculate visual Y coordinates based on gravity well displacement so planets bed the fabric
    const visualYCoords: { [id: string]: number } = {};
    bodies.forEach((body) => {
      let displacement = 0;
      bodies.forEach((other) => {
        const dx = other.position[0] - body.position[0];
        const dz = other.position[2] - body.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        const well = -0.16 * other.mass / (dist + 0.65);
        displacement += well;
      });
      displacement = Math.max(displacement, -2.5);
      visualYCoords[body.id] = displacement + body.radius;
    });

    // Follow the selected planet if one is active
    if (selectedPlanetId && controls) {
      const activePlanet = bodies.find((b) => b.id === selectedPlanetId);
      if (activePlanet) {
        const visualY = visualYCoords[activePlanet.id] !== undefined ? visualYCoords[activePlanet.id] : activePlanet.position[1];
        (controls as any).target.set(
          activePlanet.position[0],
          visualY,
          activePlanet.position[2]
        );
      }
    }

    // 3. Update WebGL group positions and append trails
    bodies.forEach((body) => {
      const group = meshRefs.current[body.id];
      const visualY = visualYCoords[body.id] !== undefined ? visualYCoords[body.id] : body.position[1];

      if (group) {
        group.position.set(body.position[0], visualY, body.position[2]);
      }

      const trail = trailRefs.current[body.id];
      if (trail) {
        const line = trail.line;
        line.visible = showTrails;

        if (showTrails && !isPaused) {
          const currentPos = new THREE.Vector3(body.position[0], visualY, body.position[2]);
          
          if (trail.points.length === 0 || trail.points[trail.points.length - 1].distanceTo(currentPos) > 0.04) {
            trail.points.push(currentPos);
            if (trail.points.length > 300) {
              trail.points.shift();
            }
            line.geometry.setFromPoints(trail.points);
          }
        }
      }
    });

    // 4. Bending the Space-Time Plane Fabric Geometry relative to gravity
    const gridGeom = gridGeomRef.current;
    if (gridGeom) {
      if (showFabric) {
        const positionAttr = gridGeom.attributes.position;
        const count = positionAttr.count;

        for (let i = 0; i < count; i++) {
          const vx = positionAttr.getX(i);
          const vy = positionAttr.getY(i);
          
          let displacement = 0;
          
          bodies.forEach((body) => {
            const dx = body.position[0] - vx;
            // Since plane is rotated -90 degrees on X, vy correlates with -Z
            const dz = body.position[2] - (-vy);
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            // Gravity well equation: mass / distance
            const well = -0.16 * body.mass / (dist + 0.65);
            displacement += well;
          });
          
          // Clamp maximum displacement to maintain nice grids
          displacement = Math.max(displacement, -2.5);
          positionAttr.setZ(i, displacement);
        }
        positionAttr.needsUpdate = true;
      }
    }
  });

  return (
    <>
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]}
        visible={showFabric}
      >
        <planeGeometry ref={gridGeomRef as any} args={fineGrid ? [160, 160, 160, 160] : [160, 160, 80, 80]} />
        <meshBasicMaterial 
          color="#3f3f46" 
          wireframe 
          transparent 
          opacity={0.14} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {planets.map((p) => {
        // Hide if disabled by user
        if (p.enabled === false) return null;

        // Hide custom planets in realistic mode since we cannot resolve their orbits analytically
        const isCustom = !p.isStatic && BODY_MAP[p.id] === undefined;
        if (simulationEngine === 'realistic' && isCustom) return null;

        const orbitRadius = getOrbitRadius(p);

        return (
          <React.Fragment key={p.id}>
            {!p.isStatic && showOrbitLines && (
              <OrbitLine radius={orbitRadius} color={p.color} />
            )}
            <group
              key={p.id}
              position={p.position}
              ref={(el) => {
                if (el) meshRefs.current[p.id] = el;
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectPlanet(p.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                hoveredPlanetRef.current = p.id;
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                if (hoveredPlanetRef.current === p.id) {
                  hoveredPlanetRef.current = null;
                }
                document.body.style.cursor = 'auto';
              }}
            >
              <SpaceBodyMesh
                color={p.color}
                radius={p.radius}
                isStar={p.isStatic}
              />
            </group>
          </React.Fragment>
        );
      })}
    </>
  );
}

// Camera coordinates tracking
function CameraTracker({ onCameraChange }: { onCameraChange: SpaceCanvasProps['onCameraChange'] }) {
  const { camera, controls } = useThree();
  const lastState = useRef('');

  useFrame(() => {
    const pos = camera.position;
    const target = (controls as any)?.target || new THREE.Vector3(0, 0, 0);
    const hash = `${pos.x.toFixed(2)}_${pos.y.toFixed(2)}_${pos.z.toFixed(2)}_${target.x.toFixed(2)}_${target.y.toFixed(2)}_${target.z.toFixed(2)}`;
    
    if (hash !== lastState.current) {
      lastState.current = hash;
      onCameraChange([pos.x, pos.y, pos.z], [target.x, target.y, target.z]);
    }
  });

  return null;
}

// Standard Capture Helper reused for Space simulation rendering
function CaptureHelper({ captureRef }: { captureRef: SpaceCanvasProps['captureRef'] }) {
  const { gl, scene, camera, clock } = useThree();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    captureRef.current = {
      captureImage: (format: 'png' | 'webp') => {
        const width = 3840;
        const height = 2160;
        
        gl.setSize(width, height, false);
        (camera as THREE.PerspectiveCamera).aspect = width / height;
        camera.updateProjectionMatrix();

        gl.render(scene, camera);

        const mimeType = format === 'webp' ? 'image/webp' : 'image/png';
        const dataUrl = gl.domElement.toDataURL(mimeType, 1.0);

        const rect = gl.domElement.parentElement?.getBoundingClientRect() || { width: 800, height: 600 };
        gl.setSize(rect.width, rect.height, true);
        (camera as THREE.PerspectiveCamera).aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();

        gl.render(scene, camera);

        return dataUrl;
      },
      
      startRecording: (onStopCallback: (blob: Blob) => void) => {
        chunksRef.current = [];
        const stream = gl.domElement.captureStream(60);
        
        let selectedMime = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(selectedMime)) {
          selectedMime = 'video/webm;codecs=vp8';
        }
        if (!MediaRecorder.isTypeSupported(selectedMime)) {
          selectedMime = 'video/webm';
        }

        const recorder = new MediaRecorder(stream, {
          mimeType: selectedMime,
          videoBitsPerSecond: 50000000,
        });

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          onStopCallback(blob);
          chunksRef.current = [];
        };

        recorderRef.current = recorder;
        recorder.start(100);
      },

      stopRecording: () => {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
          recorderRef.current.stop();
        }
      },

      recordPngSequence: async (
        duration: number,
        fps: number,
        resolution: 'current' | '4k',
        onProgress: (frame: number, total: number) => void
      ) => {
        const totalFrames = duration * fps;
        const frameInterval = 1 / fps;
        const originalGetElapsedTime = clock.getElapsedTime;
        const clockWasRunning = clock.running;
        clock.stop();

        const zipData: { [key: string]: Uint8Array } = {};
        const originalAspect = (camera as THREE.PerspectiveCamera).aspect;

        if (resolution === '4k') {
          gl.setSize(3840, 2160, false);
          (camera as THREE.PerspectiveCamera).aspect = 3840 / 2160;
          camera.updateProjectionMatrix();
        }

        try {
          for (let i = 0; i < totalFrames; i++) {
            const customTime = i * frameInterval;
            clock.getElapsedTime = () => customTime;
            
            scene.traverse((obj: any) => {
              if (obj.material) {
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                mats.forEach((mat: any) => {
                  if (mat.uTime !== undefined) mat.uTime = customTime;
                  if (mat.uniforms?.uTime) mat.uniforms.uTime.value = customTime;
                });
              }
            });

            gl.render(scene, camera);

            const dataUrl = gl.domElement.toDataURL('image/png');
            const base64Data = dataUrl.split(',')[1];
            const binaryString = atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let j = 0; j < len; j++) {
              bytes[j] = binaryString.charCodeAt(j);
            }

            const frameName = `frame_${i.toString().padStart(4, '0')}.png`;
            zipData[frameName] = bytes;

            onProgress(i + 1, totalFrames);
            await new Promise((resolve) => setTimeout(resolve, 8));
          }

          const ff = await import('fflate');
          const zipped = await new Promise<Uint8Array>((resolve, reject) => {
            ff.zip(zipData, (err, data) => {
              if (err) reject(err);
              else resolve(data);
            });
          });

          return zipped;
        } finally {
          const rect = gl.domElement.parentElement?.getBoundingClientRect() || { width: 800, height: 600 };
          gl.setSize(rect.width, rect.height, true);
          (camera as THREE.PerspectiveCamera).aspect = originalAspect;
          camera.updateProjectionMatrix();

          clock.getElapsedTime = originalGetElapsedTime;
          if (clockWasRunning) {
            clock.start();
          }

          gl.render(scene, camera);
        }
      }
    };
  }, [gl, scene, camera, clock, captureRef]);

  return null;
}

const SEMI_MAJOR_AXES: { [key: string]: number } = {
  mercury: 0.3871,
  venus: 0.7233,
  earth: 1.0000,
  mars: 1.5237,
  jupiter: 5.2028,
  saturn: 9.5826,
  uranus: 19.2013,
  neptune: 30.0511,
};

function OrbitLine({ radius, color }: { radius: number; color: string }) {
  const lineRef = React.useRef<THREE.Line>(null);

  const points = React.useMemo(() => {
    const pts = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta)));
    }
    return pts;
  }, []);

  React.useEffect(() => {
    if (lineRef.current) {
      lineRef.current.geometry.setFromPoints(points);
    }
  }, [points]);

  return (
    <line ref={lineRef as any} scale={[radius, 1, radius] as any}>
      <bufferGeometry />
      <lineBasicMaterial 
        color={color} 
        transparent 
        opacity={0.25} 
        blending={THREE.AdditiveBlending}
      />
    </line>
  );
}

export default function SpaceCanvas({
  planets,
  selectedPlanetId,
  gravityConstant,
  simulationSpeed,
  showTrails,
  showFabric,
  transparentBackground,
  backgroundColor,
  onCameraChange,
  onSelectPlanet,
  canvasRef,
  captureRef,
  isPaused,
  simulationEngine,
  realisticSpeedDays,
  showOrbitLines,
  fineGrid,
}: SpaceCanvasProps) {
  return (
    <Canvas
      ref={canvasRef as any}
      onPointerMissed={() => onSelectPlanet('')}
      gl={{
        preserveDrawingBuffer: true,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
      camera={{
        position: [0, 8, 12],
        fov: 55,
        near: 0.1,
        far: 1000,
      }}
      style={{
        background: transparentBackground ? 'transparent' : backgroundColor,
        width: '100%',
        height: '100%',
      }}
    >
      <color attach="background" args={[transparentBackground ? 'transparent' : backgroundColor]} />
      
      <ambientLight intensity={0.8} />
      <pointLight position={[0, 0, 0]} intensity={2.5} distance={100} decay={1} />
      
      {/* Dynamic planetary simulator */}
      <PhysicsEngine
        planets={planets}
        selectedPlanetId={selectedPlanetId}
        gravityConstant={gravityConstant}
        simulationSpeed={simulationSpeed}
        showTrails={showTrails}
        showFabric={showFabric}
        onSelectPlanet={onSelectPlanet}
        isPaused={isPaused}
        simulationEngine={simulationEngine}
        realisticSpeedDays={realisticSpeedDays}
        showOrbitLines={showOrbitLines}
        fineGrid={fineGrid}
      />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={300}
      />

      <CameraTracker onCameraChange={onCameraChange} />
      <CaptureHelper captureRef={captureRef} />
    </Canvas>
  );
}
