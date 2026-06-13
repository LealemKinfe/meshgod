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
function CaptureHelper({ captureRef }: { captureRef: StudioCanvasProps['captureRef'] }) {
  const { gl, scene, camera, clock } = useThree();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
      <CaptureHelper captureRef={captureRef} />
    </Canvas>
  );
}
