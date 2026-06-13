import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { SentientMesh } from 'sentient-mesh';

// Import properties interface
import type { SentientMeshProps } from 'sentient-mesh';

interface StudioCanvasProps {
  meshProps: SentientMeshProps;
  transparentBackground: boolean;
  backgroundColor: string;
  autoRotate: boolean;
  showGrid: boolean;
  showAxes: boolean;
  onCameraChange: (position: [number, number, number], target: [number, number, number]) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  captureRef: React.MutableRefObject<any>;
}

// Camera tracking subcomponent to read the camera position and controls target
function CameraTracker({ onCameraChange }: { onCameraChange: StudioCanvasProps['onCameraChange'] }) {
  const { camera, controls } = useThree();
  const lastState = useRef('');

  useFrame(() => {
    const pos = camera.position;
    const target = (controls as any)?.target || new THREE.Vector3(0, 0, 0);
    
    // Hash coordinates to prevent unnecessary state changes
    const hash = `${pos.x.toFixed(3)}_${pos.y.toFixed(3)}_${pos.z.toFixed(3)}_${target.x.toFixed(3)}_${target.y.toFixed(3)}_${target.z.toFixed(3)}`;
    if (hash !== lastState.current) {
      lastState.current = hash;
      onCameraChange(
        [pos.x, pos.y, pos.z],
        [target.x, target.y, target.z]
      );
    }
  });

  return null;
}

// Intercepts canvas render engine to resize canvas, capture high-res snapshots and record streams
function CaptureHelper({ captureRef, meshProps }: { captureRef: StudioCanvasProps['captureRef']; meshProps: StudioCanvasProps['meshProps'] }) {
  const { gl, scene, camera, clock } = useThree();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const meshPropsRef = useRef(meshProps);

  // Sync props to ref to avoid re-triggering the useEffect hook
  meshPropsRef.current = meshProps;

  useEffect(() => {
    captureRef.current = {
      captureImage: (format: 'png' | 'webp') => {
        // 1. Set to 4K dimensions (3840x2160)
        const width = 3840;
        const height = 2160;
        
        gl.setSize(width, height, false);
        (camera as THREE.PerspectiveCamera).aspect = width / height;
        camera.updateProjectionMatrix();

        // 3. Force render the scene
        gl.render(scene, camera);

        // 4. Capture drawing buffer
        const mimeType = format === 'webp' ? 'image/webp' : 'image/png';
        const dataUrl = gl.domElement.toDataURL(mimeType, 1.0);

        // 5. Restore size and aspect
        const rect = gl.domElement.parentElement?.getBoundingClientRect() || { width: 800, height: 600 };
        gl.setSize(rect.width, rect.height, true);
        (camera as THREE.PerspectiveCamera).aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();

        // 6. Force render again to restore screen state
        gl.render(scene, camera);

        return dataUrl;
      },
      
      captureSvg: () => {
        // 1. Find the active sentient mesh in the scene by its material properties
        let targetMesh: any = null;
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            for (const mat of mats) {
              if (mat && ((mat as any).uThemeColor !== undefined || (mat as any).uniforms?.uThemeColor !== undefined)) {
                targetMesh = child;
                break;
              }
            }
          }
        });

        if (!targetMesh) {
          console.error("Sentient mesh object not found in scene.");
          return "";
        }

        // Force update world matrices to make sure positions and projections are 100% accurate
        targetMesh.updateMatrixWorld(true);
        camera.updateMatrixWorld(true);

        const originalGeometry = targetMesh.geometry;
        if (!originalGeometry) {
          console.error("Mesh geometry not found.");
          return "";
        }

        const isLineSegs = targetMesh.isLineSegments || targetMesh.type === 'LineSegments';
        let wireframeGeometry: THREE.BufferGeometry;
        
        if (isLineSegs) {
          wireframeGeometry = originalGeometry;
        } else {
          wireframeGeometry = new THREE.WireframeGeometry(originalGeometry);
        }

        // 2. Build a local position -> normal map for displacement calculations
        const originalPos = originalGeometry.attributes.position;
        const originalNorm = originalGeometry.attributes.normal;
        const normalMap = new Map<string, THREE.Vector3>();
        if (originalPos && originalNorm) {
          for (let i = 0; i < originalPos.count; i++) {
            const px = originalPos.getX(i);
            const py = originalPos.getY(i);
            const pz = originalPos.getZ(i);
            const nx = originalNorm.getX(i);
            const ny = originalNorm.getY(i);
            const nz = originalNorm.getZ(i);
            const key = `${px.toFixed(3)}_${py.toFixed(3)}_${pz.toFixed(3)}`;
            normalMap.set(key, new THREE.Vector3(nx, ny, nz));
          }
        }

        // 3. Retrieve current dynamic state from clock and props
        const props = meshPropsRef.current;
        const time = clock.getElapsedTime();
        const uIntensity = props.intensity ?? 0.35;
        const uCadence = props.cadence ?? 0.5;
        const breathType = props.breathType ?? 'individual-nodes';
        const activeObject = props.activeObject ?? 'sphere';
        const isSvgObj = activeObject === 'svg';
        const themeColor = props.themeColor ?? '#ff4040';
        const darkMode = props.darkMode ?? true;
        const gradientAngle = props.gradientAngle ?? 0;
        const gradientSpread = props.gradientSpread ?? 0.5;
        const gradientFalloff = props.gradientFalloff ?? 0.5;

        // CPU Perlin-like 3D noise function for vertex displacement
        const simple3DNoise = (x: number, y: number, z: number): number => {
          return Math.sin(x * 2.0 + y * 1.5) * Math.cos(z * 2.0 + x * 1.2) * 0.5 + 
                 Math.sin(y * 4.0 + z * 3.0) * Math.cos(x * 3.0 + y * 2.1) * 0.3;
        };

        const getDisplacedVertex = (x: number, y: number, z: number) => {
          const key = `${x.toFixed(3)}_${y.toFixed(3)}_${z.toFixed(3)}`;
          const norm = normalMap.get(key) || new THREE.Vector3(x, y, z).normalize();
          const pos = new THREE.Vector3(x, y, z);

          if (breathType === 'uniform') {
            const scale = 1.0 + Math.sin(time * 3.0 * uCadence) * uIntensity * 0.15;
            pos.multiplyScalar(scale);
          } else {
            // individual-nodes breathing
            if (isSvgObj) {
              const noiseCoordsX = x * 0.003;
              const noiseCoordsY = y * 0.003;
              const noiseCoordsZ = z * 0.003;

              const noiseX = simple3DNoise(noiseCoordsX, noiseCoordsY, noiseCoordsZ);
              const noiseY = simple3DNoise(noiseCoordsX + 31.416, noiseCoordsY, noiseCoordsZ);
              const noiseZ = simple3DNoise(noiseCoordsX, noiseCoordsY + 73.156, noiseCoordsZ);

              const phaseX = Math.sin(time * 3.0 * uCadence + noiseX * 6.2831);
              const phaseY = Math.sin(time * 3.0 * uCadence + noiseY * 6.2831);
              const phaseZ = Math.sin(time * 3.0 * uCadence + noiseZ * 6.2831);

              const displacement = new THREE.Vector3(phaseX, phaseY, phaseZ).multiplyScalar(uIntensity * 35.0);
              pos.add(displacement);
            } else {
              const noiseCoordsX = x * 1.5;
              const noiseCoordsY = y * 1.5;
              const noiseCoordsZ = z * 1.5;
              const noiseVal = simple3DNoise(noiseCoordsX, noiseCoordsY, noiseCoordsZ);
              const displacement = Math.sin(time * 3.0 * uCadence + noiseVal * 6.2831) * uIntensity * 0.25;
              pos.addScaledVector(norm, displacement);
            }
          }
          return pos;
        };

        const posAttr = wireframeGeometry.attributes.position;
        if (!posAttr) {
          console.error("Wireframe position attribute not found.");
          if (!isLineSegs) wireframeGeometry.dispose();
          return "";
        }


        const aspect = (camera as THREE.PerspectiveCamera).aspect || 1;
        const svgHeight = 1000;
        const svgWidth = Math.round(1000 * aspect);
        const halfW = svgWidth / 2;
        const halfH = svgHeight / 2;

        const viewMatrixInverse = camera.matrixWorldInverse;

        // Gradient configuration matching fragment shader
        const angleRad = gradientAngle * Math.PI / 180;
        const cosAngle = Math.cos(angleRad);
        const sinAngle = Math.sin(angleRad);
        const center = (1 - gradientSpread) * 5 - 2.5;
        const widthVal = (1 - gradientFalloff) * 3 + 0.05;
        const edge0 = center - widthVal * 0.5;
        const edge1 = center + widthVal * 0.5;

        const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
        const smoothstep = (x: number, e0: number, e1: number) => {
          const t = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
          return t * t * (3.0 - 2.0 * t);
        };

        const baseLineColor = darkMode ? '#ffffff' : '#000000';
        const c1 = new THREE.Color(themeColor);
        const c2 = new THREE.Color(baseLineColor);

        const indexAttr = wireframeGeometry.index;
        const vertexCount = indexAttr ? indexAttr.count : posAttr.count;

        let totalProcessed = 0;
        let skippedBehind = 0;
        const pathMap = new Map<string, string[]>();

        for (let i = 0; i < vertexCount; i += 2) {
          const idx1 = indexAttr ? (indexAttr.array as any)[i] : i;
          const idx2 = indexAttr ? (indexAttr.array as any)[i + 1] : i + 1;

          const x1 = posAttr.getX(idx1);
          const y1 = posAttr.getY(idx1);
          const z1 = posAttr.getZ(idx1);
          const x2 = posAttr.getX(idx2);
          const y2 = posAttr.getY(idx2);
          const z2 = posAttr.getZ(idx2);

          // Displace vertex on CPU matching vertex shader
          const v1 = getDisplacedVertex(x1, y1, z1);
          const v2 = getDisplacedVertex(x2, y2, z2);

          // Project to world space
          v1.applyMatrix4(targetMesh.matrixWorld);
          v2.applyMatrix4(targetMesh.matrixWorld);

          // Check if either vertex is behind the camera plane
          const v1Cam = v1.clone().applyMatrix4(viewMatrixInverse);
          const v2Cam = v2.clone().applyMatrix4(viewMatrixInverse);

          totalProcessed++;
          if (v1Cam.z > -0.1 || v2Cam.z > -0.1) {
            skippedBehind++;
            continue;
          }

          // Calculate color based on mid-point local position coordinates
          const midLocalX = (x1 + x2) / 2;
          const midLocalY = (y1 + y2) / 2;
          const midLocalZ = (z1 + z2) / 2;

          const localPos2D = isSvgObj ? new THREE.Vector2(midLocalX * 0.01, midLocalY * 0.01) : new THREE.Vector2(midLocalX, midLocalY);
          const rotatedX = localPos2D.x * cosAngle - localPos2D.y * sinAngle;
          const gradVal = smoothstep(rotatedX, edge0, edge1);
          
          // Clamp to 20 discrete color steps along the gradient
          const roundedGrad = Math.round(gradVal * 20) / 20;
          const mixedColor = c1.clone().lerp(c2, roundedGrad);
          const colorStr = `#${mixedColor.getHexString()}`;

          // Calculate depth fade matching shader transparency
          const maxDepth = isSvgObj ? 160.0 : 1.8;
          const depthFade = smoothstep(midLocalZ, -maxDepth, maxDepth * 0.5);
          
          // Clamp to 10 discrete opacity levels
          const roundedOpacity = Math.max(0.0, Math.min(1.0, Math.round(depthFade * 10) / 10));
          const opacityStr = (0.85 * roundedOpacity).toFixed(2);

          // Project into screen space coordinates
          v1.project(camera);
          v2.project(camera);

          const sx1 = (v1.x * halfW + halfW).toFixed(1);
          const sy1 = (-v1.y * halfH + halfH).toFixed(1);
          const sx2 = (v2.x * halfW + halfW).toFixed(1);
          const sy2 = (-v2.y * halfH + halfH).toFixed(1);

          const key = `${colorStr}_${opacityStr}`;
          if (!pathMap.has(key)) {
            pathMap.set(key, []);
          }
          pathMap.get(key)!.push(`M ${sx1} ${sy1} L ${sx2} ${sy2}`);
        }

        if (!isLineSegs) {
          wireframeGeometry.dispose();
        }

        // Compile path elements from style-grouped paths
        const pathElements: string[] = [];
        let pathsCount = 0;
        pathMap.forEach((segments, styleKey) => {
          if (segments.length === 0) return;
          const [colorStr, opacityStr] = styleKey.split('_');
          const d = segments.join(' ');
          pathElements.push(
            `<path d="${d}" stroke="${colorStr}" stroke-opacity="${opacityStr}" stroke-width="1.0" fill="none" stroke-linejoin="round" stroke-linecap="round" />`
          );
          pathsCount++;
        });

        const svgString = [
          `<?xml version="1.0" encoding="UTF-8" standalone="no"?>`,
          `<!-- Debug Info:`,
          `     TargetMesh: name="${targetMesh.name}", type="${targetMesh.type}"`,
          `     Vertices: ${posAttr.count}`,
          `     Total processed line segments: ${totalProcessed}`,
          `     Skipped (behind camera): ${skippedBehind}`,
          `     Optimized path groups: ${pathsCount}`,
          `-->`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="100%">`,
          `  <g>`,
          ...pathElements.map(p => `    ${p}`),
          `  </g>`,
          `</svg>`
        ].join('\n');

        return svgString;
      },
      
      startRecording: (onStopCallback: (blob: Blob) => void) => {
        chunksRef.current = [];
        const stream = gl.domElement.captureStream(60); // Capture at 60 FPS
        
        let selectedMime = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(selectedMime)) {
          selectedMime = 'video/webm;codecs=vp8';
        }
        if (!MediaRecorder.isTypeSupported(selectedMime)) {
          selectedMime = 'video/webm';
        }

        const recorder = new MediaRecorder(stream, {
          mimeType: selectedMime,
          videoBitsPerSecond: 50000000, // 50 Mbps (extremely high bitrate for pristine quality)
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
        recorder.start(100); // chunk every 100ms
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
        
        // Save original configurations
        const originalAspect = (camera as THREE.PerspectiveCamera).aspect;

        if (resolution === '4k') {
          gl.setSize(3840, 2160, false);
          (camera as THREE.PerspectiveCamera).aspect = 3840 / 2160;
          camera.updateProjectionMatrix();
        }

        try {
          for (let i = 0; i < totalFrames; i++) {
            const customTime = i * frameInterval;
            
            // Hijack elapsed time in clock
            clock.getElapsedTime = () => customTime;
            
            // Manually traverse scene and force material uniform updates
            scene.traverse((obj: any) => {
              if (obj.material) {
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                mats.forEach((mat: any) => {
                  if (mat.uTime !== undefined) mat.uTime = customTime;
                  if (mat.uniforms?.uTime) mat.uniforms.uTime.value = customTime;
                });
              }
            });

            // Force render
            gl.render(scene, camera);

            // Get base64 buffer from data URL
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

            // Relinquish control briefly to allow UI to render status
            await new Promise((resolve) => setTimeout(resolve, 8));
          }

          // Import fflate dynamically
          const ff = await import('fflate');
          const zipped = await new Promise<Uint8Array>((resolve, reject) => {
            ff.zip(zipData, (err, data) => {
              if (err) reject(err);
              else resolve(data);
            });
          });

          return zipped;
        } finally {
          // Restore size and aspect
          const rect = gl.domElement.parentElement?.getBoundingClientRect() || { width: 800, height: 600 };
          gl.setSize(rect.width, rect.height, true);
          (camera as THREE.PerspectiveCamera).aspect = originalAspect;
          camera.updateProjectionMatrix();

          // Restore clock
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

export default function StudioCanvas({
  meshProps,
  transparentBackground,
  backgroundColor,
  autoRotate,
  showGrid,
  showAxes,
  onCameraChange,
  canvasRef,
  captureRef,
}: StudioCanvasProps) {
  return (
    <Canvas
      ref={canvasRef as any}
      gl={{
        preserveDrawingBuffer: true, // Crucial for taking screenshots/canvas captures
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
      camera={{
        position: [0, 0, 5],
        fov: 50,
        near: 0.1,
        far: 100,
      }}
      style={{
        background: transparentBackground ? 'transparent' : backgroundColor,
        width: '100%',
        height: '100%',
      }}
    >
      {/* Light setups */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {/* Render Sentient Mesh */}
      <SentientMesh {...meshProps} />

      {/* Grid and Axes helpers */}
      {showGrid && (
        <Grid
          position={[0, -1.5, 0]}
          args={[10, 10]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#3f3f46"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#71717a"
          fadeDistance={30}
          infiniteGrid
        />
      )}
      
      {showAxes && <axesHelper args={[3]} />}

      {/* Camera and Control utilities */}
      <OrbitControls
        makeDefault
        autoRotate={autoRotate}
        autoRotateSpeed={1.0}
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={20}
      />

      <CameraTracker onCameraChange={onCameraChange} />
      <CaptureHelper captureRef={captureRef} meshProps={meshProps} />
    </Canvas>
  );
}
