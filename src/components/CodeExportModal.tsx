import React from 'react';
import { X, Copy, Check } from 'lucide-react';
import type { SentientMeshProps } from 'sentient-mesh';
import type { CelestialBody } from './SpaceCanvas';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  meshProps: SentientMeshProps;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  showToast: (msg: string) => void;
  appMode?: 'mesh' | 'space';
  spaceProps?: {
    planets: CelestialBody[];
    gravityConstant: number;
    simulationSpeed: number;
    showTrails: boolean;
    simulationEngine?: 'realistic' | 'sandbox';
    realisticSpeedDays?: number;
    showFabric?: boolean;
    showOrbitLines?: boolean;
    fineGrid?: boolean;
  };
}

export default function CodeExportModal({
  isOpen,
  onClose,
  meshProps,
  cameraPosition,
  cameraTarget,
  showToast,
  appMode = 'mesh',
  spaceProps,
}: CodeExportModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  // Format decimal positions cleanly
  const formatArray = (arr: [number, number, number]) => {
    return arr.map(n => n.toFixed(3)).join(', ');
  };

  const getPropString = () => {
    const props: string[] = [];
    
    props.push(`          activeObject="${meshProps.activeObject}"`);
    if (meshProps.activeObject === 'svg' && meshProps.svgUrl) {
      props.push(`          svgUrl="${meshProps.svgUrl}"`);
    }
    props.push(`          complexity="${meshProps.complexity}"`);
    props.push(`          darkMode={${meshProps.darkMode}}`);
    props.push(`          themeColor="${meshProps.themeColor}"`);
    props.push(`          gradientAngle={${meshProps.gradientAngle}}`);
    props.push(`          gradientSpread={${meshProps.gradientSpread}}`);
    props.push(`          gradientFalloff={${meshProps.gradientFalloff}}`);
    props.push(`          breathType="${meshProps.breathType}"`);
    props.push(`          intensity={${meshProps.intensity}}`);
    props.push(`          cadence={${meshProps.cadence}}`);
    
    if (meshProps.pitch !== undefined && meshProps.pitch !== 0) {
      props.push(`          pitch={${meshProps.pitch.toFixed(3)}}`);
    }
    if (meshProps.yaw !== undefined && meshProps.yaw !== 0) {
      props.push(`          yaw={${meshProps.yaw.toFixed(3)}}`);
    }
    if (meshProps.roll !== undefined && meshProps.roll !== 0) {
      props.push(`          roll={${meshProps.roll.toFixed(3)}}`);
    }

    return props.join('\n');
  };

  // Generate code snippet for Mesh Mode
  const meshCodeSnippet = `import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { SentientMesh } from 'sentient-mesh';

export default function SentientMeshScene() {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0c' }}>
      <Canvas
        camera={{
          position: [${formatArray(cameraPosition)}],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        <SentientMesh
${getPropString()}
        />

        <OrbitControls
          makeDefault
          target={[${formatArray(cameraTarget)}]}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}`;

  // Generate code snippet for Space Mode (Newtonian Sandbox vs Astronomy Engine)
  const getSpaceCodeSnippet = () => {
    if (!spaceProps) return '';
    const isRealistic = spaceProps.simulationEngine === 'realistic';
    
    // In realistic mode, filter out custom bodies that can't be resolved analytically
    const exportPlanets = isRealistic
      ? spaceProps.planets.filter(p => p.isStatic || p.id !== 'sun' && !p.id.startsWith('planet_'))
      : spaceProps.planets;

    const planetsString = JSON.stringify(
      exportPlanets.map(p => ({
        id: p.id,
        name: p.name,
        mass: p.mass,
        radius: p.radius,
        color: p.color,
        position: [...p.position],
        velocity: [...p.velocity],
        isStatic: p.isStatic
      })),
      null,
      2
    );

    if (isRealistic) {
      // Export Astronomy Engine code
      return `import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Import astronomy-engine
import { Body, HelioVector, MakeTime } from 'astronomy-engine';

// Import SentientMesh
import { SentientMesh } from 'sentient-mesh';

const REALISTIC_SPEED = ${(spaceProps.realisticSpeedDays || 1.0).toFixed(2)}; // days per second
const INITIAL_PLANETS = ${planetsString.replace(/^/gm, '  ').trim()};

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
  const lineRef = useRef<THREE.Line>(null);

  const points = React.useMemo(() => {
    const pts = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta)));
    }
    return pts;
  }, []);

  useEffect(() => {
    if (lineRef.current) {
      lineRef.current.geometry.setFromPoints(points);
    }
  }, [points]);

  return (
    <line ref={lineRef} scale={[radius, 1, radius]}>
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

function RealisticOrbits() {
  const { scene } = useThree();
  const bodiesRef = useRef(INITIAL_PLANETS);
  const meshRefs = useRef<{ [id: string]: THREE.Group }>({});
  const dateRef = useRef<Date>(new Date(2026, 0, 1)); // start date
  const gridGeomRef = useRef<THREE.PlaneGeometry>(null);
  const trailRefs = useRef<{ [id: string]: { line: THREE.Line; points: THREE.Vector3[] } }>({});

  const getOrbitRadius = (p: typeof INITIAL_PLANETS[0]) => {
    const a = SEMI_MAJOR_AXES[p.id];
    if (a !== undefined) {
      return 2.0 + Math.pow(a, 0.7) * 5.5;
    }
    return p.position[0];
  };

  // Initialize orbit trails
  useEffect(() => {
    const newTrailRefs: typeof trailRefs.current = {};
    INITIAL_PLANETS.forEach((p) => {
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
    });
    trailRefs.current = newTrailRefs;

    return () => {
      Object.values(trailRefs.current).forEach((t) => {
        scene.remove(t.line);
        t.line.geometry.dispose();
        (t.line.material as THREE.Material).dispose();
      });
    };
  }, [scene]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    // Advance date time: days = seconds * REALISTIC_SPEED
    const msToAdd = dt * REALISTIC_SPEED * 24 * 60 * 60 * 1000;
    dateRef.current = new Date(dateRef.current.getTime() + msToAdd);

    const astroTime = MakeTime(dateRef.current);
    const bodies = bodiesRef.current;

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
              
              body.position = [x_ecl * scale, z_ecl * scale, y_ecl * scale];
            }
          } catch (err) {
            console.error(err);
          }
        }
      }

      // Calculate visual Y coordinates based on gravity well displacement so planets bed the fabric
      let displacement = 0;
      bodies.forEach((other) => {
        const dx = other.position[0] - body.position[0];
        const dz = other.position[2] - body.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        const well = -0.16 * other.mass / (dist + 0.65);
        displacement += well;
      });
      displacement = Math.max(displacement, -2.5);
      const visualY = displacement + body.radius;

      // Sync Group position
      const group = meshRefs.current[body.id];
      if (group) group.position.set(body.position[0], visualY, body.position[2]);

      // Append trails
      const trail = trailRefs.current[body.id];
      if (trail) {
        const line = trail.line;
        line.visible = ${spaceProps.showTrails};

        if (${spaceProps.showTrails}) {
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

    // Warp space-time grid fabric
    const gridGeom = gridGeomRef.current;
    if (gridGeom && ${spaceProps.showFabric}) {
      const positionAttr = gridGeom.attributes.position;
      const count = positionAttr.count;

      for (let i = 0; i < count; i++) {
        const vx = positionAttr.getX(i);
        const vy = positionAttr.getY(i);
        
        let displacement = 0;
        bodies.forEach((body) => {
          const dx = body.position[0] - vx;
          const dz = body.position[2] - (-vy);
          const dist = Math.sqrt(dx * dx + dz * dz);
          const well = -0.16 * body.mass / (dist + 0.65);
          displacement += well;
        });
        
        displacement = Math.max(displacement, -2.5);
        positionAttr.setZ(i, displacement);
      }
      positionAttr.needsUpdate = true;
    }
  });

  return (
    <>
      {/* Space-Time Gravity Fabric */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]}
        visible={${spaceProps.showFabric}}
      >
        <planeGeometry ref={gridGeomRef as any} args={${spaceProps.fineGrid} ? [160, 160, 160, 160] : [160, 160, 80, 80]} />
        <meshBasicMaterial 
          color="#3f3f46" 
          wireframe 
          transparent 
          opacity={0.14} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {INITIAL_PLANETS.map((p) => {
        const orbitRadius = getOrbitRadius(p);
        return (
          <React.Fragment key={p.id}>
            {!p.isStatic && ${spaceProps.showOrbitLines} && (
              <OrbitLine radius={orbitRadius} color={p.color} />
            )}
            <group
              key={p.id}
              position={p.position}
              scale={[p.radius * 1.15, p.radius * 1.15, p.radius * 1.15]}
              ref={(el) => {
                if (el) meshRefs.current[p.id] = el;
              }}
            >
              <SentientMesh
                activeObject="sphere"
                complexity="high"
                darkMode={true}
                themeColor={p.color}
                gradientAngle={p.isStatic ? 30 : 45}
                gradientSpread={p.isStatic ? 0.65 : 0.5}
                gradientFalloff={p.isStatic ? 0.25 : 0.45}
                breathType="individual-nodes"
                intensity={p.isStatic ? 0.25 : 0.12}
                cadence={p.isStatic ? 0.8 : 0.4}
              />
            </group>
          </React.Fragment>
        );
      })}
    </>
  );
}

export default function SpaceRealisticScene() {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0c' }}>
      <Canvas
        camera={{
          position: [${formatArray(cameraPosition)}],
          fov: 55,
          near: 0.1,
          far: 1000,
        }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.8} />
        <pointLight position={[0, 0, 0]} intensity={2.5} distance={100} />
        
        <RealisticOrbits />

        <OrbitControls
          makeDefault
          target={[${formatArray(cameraTarget)}]}
          enableDamping
          dampingFactor={0.05}
          maxDistance={300}
        />
      </Canvas>
    </div>
  );
}`;
    }

    // Export Newtonian Sandbox code
    return `import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Import SentientMesh
import { SentientMesh } from 'sentient-mesh';

const G = ${spaceProps.gravityConstant.toFixed(2)};
const INITIAL_PLANETS = ${planetsString.replace(/^/gm, '  ').trim()};

function OrbitLine({ radius, color }: { radius: number; color: string }) {
  const lineRef = useRef<THREE.Line>(null);

  const points = React.useMemo(() => {
    const pts = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta)));
    }
    return pts;
  }, []);

  useEffect(() => {
    if (lineRef.current) {
      lineRef.current.geometry.setFromPoints(points);
    }
  }, [points]);

  return (
    <line ref={lineRef} scale={[radius, 1, radius]}>
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

function GravitySimulation() {
  const { scene } = useThree();
  const bodiesRef = useRef(INITIAL_PLANETS);
  const meshRefs = useRef<{ [id: string]: THREE.Group }>({});
  const gridGeomRef = useRef<THREE.PlaneGeometry>(null);
  const trailRefs = useRef<{ [id: string]: { line: THREE.Line; points: THREE.Vector3[] } }>({});

  // Initialize orbit trails
  useEffect(() => {
    const newTrailRefs: typeof trailRefs.current = {};
    INITIAL_PLANETS.forEach((p) => {
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
    });
    trailRefs.current = newTrailRefs;

    return () => {
      Object.values(trailRefs.current).forEach((t) => {
        scene.remove(t.line);
        t.line.geometry.dispose();
        (t.line.material as THREE.Material).dispose();
      });
    };
  }, [scene]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const steps = 4;
    const subDt = (dt * ${spaceProps.simulationSpeed.toFixed(2)}) / steps;
    const bodies = bodiesRef.current;

    for (let step = 0; step < steps; step++) {
      const accelerations = bodies.map(() => new THREE.Vector3(0, 0, 0));

      // 1. Calculate Gravitational Attractions
      for (let i = 0; i < bodies.length; i++) {
        if (bodies[i].isStatic) continue;
        const posI = new THREE.Vector3(...bodies[i].position);

        for (let j = 0; j < bodies.length; j++) {
          if (i === j) continue;
          const posJ = new THREE.Vector3(...bodies[j].position);
          const rVec = new THREE.Vector3().subVectors(posJ, posI);
          const distSq = rVec.lengthSq() + 0.05; // softening factor
          const force = (G * bodies[j].mass) / (distSq * Math.sqrt(distSq));
          accelerations[i].addScaledVector(rVec, force);
        }
      }

      // 2. Integrate velocities and positions
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

    // 3. Sync R3F Group coordinates
    bodies.forEach((body) => {
      // Calculate visual Y coordinates based on gravity well displacement so planets bed the fabric
      let displacement = 0;
      bodies.forEach((other) => {
        const dx = other.position[0] - body.position[0];
        const dz = other.position[2] - body.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        const well = -0.16 * other.mass / (dist + 0.65);
        displacement += well;
      });
      displacement = Math.max(displacement, -2.5);
      const visualY = displacement + body.radius;

      const group = meshRefs.current[body.id];
      if (group) group.position.set(body.position[0], visualY, body.position[2]);

      // Append trails
      const trail = trailRefs.current[body.id];
      if (trail) {
        const line = trail.line;
        line.visible = ${spaceProps.showTrails};

        if (${spaceProps.showTrails}) {
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

    // Warp space-time grid fabric
    const gridGeom = gridGeomRef.current;
    if (gridGeom && ${spaceProps.showFabric}) {
      const positionAttr = gridGeom.attributes.position;
      const count = positionAttr.count;

      for (let i = 0; i < count; i++) {
        const vx = positionAttr.getX(i);
        const vy = positionAttr.getY(i);
        
        let displacement = 0;
        bodies.forEach((body) => {
          const dx = body.position[0] - vx;
          const dz = body.position[2] - (-vy);
          const dist = Math.sqrt(dx * dx + dz * dz);
          const well = -0.16 * body.mass / (dist + 0.65);
          displacement += well;
        });
        
        displacement = Math.max(displacement, -2.5);
        positionAttr.setZ(i, displacement);
      }
      positionAttr.needsUpdate = true;
    }
  });

  return (
    <>
      {/* Space-Time Gravity Fabric */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]}
        visible={${spaceProps.showFabric}}
      >
        <planeGeometry ref={gridGeomRef as any} args={${spaceProps.fineGrid} ? [160, 160, 160, 160] : [160, 160, 80, 80]} />
        <meshBasicMaterial 
          color="#3f3f46" 
          wireframe 
          transparent 
          opacity={0.14} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {INITIAL_PLANETS.map((p) => (
        <React.Fragment key={p.id}>
          {!p.isStatic && ${spaceProps.showOrbitLines} && (
            <OrbitLine radius={p.position[0]} color={p.color} />
          )}
          <group
            key={p.id}
            position={p.position}
            scale={[p.radius * 1.15, p.radius * 1.15, p.radius * 1.15]}
            ref={(el) => {
              if (el) meshRefs.current[p.id] = el;
            }}
          >
            <SentientMesh
              activeObject="sphere"
              complexity="high"
              darkMode={true}
              themeColor={p.color}
              gradientAngle={p.isStatic ? 30 : 45}
              gradientSpread={p.isStatic ? 0.65 : 0.5}
              gradientFalloff={p.isStatic ? 0.25 : 0.45}
              breathType="individual-nodes"
              intensity={p.isStatic ? 0.25 : 0.12}
              cadence={p.isStatic ? 0.8 : 0.4}
            />
          </group>
        </React.Fragment>
      ))}
    </>
  );
}

export default function SpaceGravityScene() {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0c' }}>
      <Canvas
        camera={{
          position: [${formatArray(cameraPosition)}],
          fov: 55,
          near: 0.1,
          far: 1000,
        }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[0, 0, 0]} intensity={2.0} distance={100} />
        
        <GravitySimulation />

        <OrbitControls
          makeDefault
          target={[${formatArray(cameraTarget)}]}
          enableDamping
          dampingFactor={0.05}
          maxDistance={300}
        />
      </Canvas>
    </div>
  );
}`;
  };

  const codeSnippet = appMode === 'space' ? getSpaceCodeSnippet() : meshCodeSnippet;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    showToast("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Export Scene Code ({appMode === 'space' ? (spaceProps?.simulationEngine === 'realistic' ? 'Realistic Orbits' : 'Gravity Sandbox') : 'Mesh Studio'})</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <p className="help-text">
            Copy this code directly into your React application. It captures the exact camera position, controls target coordinates, lighting setup, and materials configured in the studio viewport.
          </p>
          <div className="code-container">
            <code>{codeSnippet}</code>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-action" onClick={onClose}>
            Close
          </button>
          <button className="btn-action btn-primary" onClick={handleCopy} style={{ background: appMode === 'space' ? 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' : '' }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
      </div>
    </div>
  );
}
