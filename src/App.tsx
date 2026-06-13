import React, { useState, useRef } from 'react';
import { 
  Box, 
  SunMoon, 
  Activity, 
  Camera, 
  Code, 
  Upload, 
  Compass, 
  Eye,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Globe,
  Plus,
  Trash2,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Square,
  Video,
  Download,
  Loader2
} from 'lucide-react';

import StudioCanvas from './components/StudioCanvas';
import SpaceCanvas from './components/SpaceCanvas';
import type { CelestialBody } from './components/SpaceCanvas';
import CapturePanel from './components/CapturePanel';
import CodeExportModal from './components/CodeExportModal';
import type { SentientMeshProps } from 'sentient-mesh';

const INITIAL_PLANETS: CelestialBody[] = [
  { id: 'sun', name: 'Sun (Star)', mass: 15.0, radius: 0.8, color: '#FF9F1C', position: [0, 0, 0], velocity: [0, 0, 0], isStatic: true, enabled: true },
  { id: 'mercury', name: 'Mercury', mass: 0.1, radius: 0.14, color: '#90e0ef', position: [2.5, 0, 0], velocity: [0, 0, 2.45], isStatic: false, enabled: true },
  { id: 'venus', name: 'Venus', mass: 0.8, radius: 0.20, color: '#e29578', position: [3.5, 0, 0], velocity: [0, 0, 2.07], isStatic: false, enabled: true },
  { id: 'earth', name: 'Earth', mass: 1.0, radius: 0.24, color: '#00b4d8', position: [4.8, 0, 0], velocity: [0, 0, 1.77], isStatic: false, enabled: true },
  { id: 'mars', name: 'Mars', mass: 0.15, radius: 0.18, color: '#f25c54', position: [6.2, 0, 0], velocity: [0, 0, 1.55], isStatic: false, enabled: true },
  { id: 'jupiter', name: 'Jupiter', mass: 8.0, radius: 0.45, color: '#ffb703', position: [8.0, 0, 0], velocity: [0, 0, 1.37], isStatic: false, enabled: true },
  { id: 'saturn', name: 'Saturn', mass: 6.0, radius: 0.38, color: '#ffe8d6', position: [10.0, 0, 0], velocity: [0, 0, 1.22], isStatic: false, enabled: true },
  { id: 'uranus', name: 'Uranus', mass: 2.0, radius: 0.30, color: '#b5e2fa', position: [12.5, 0, 0], velocity: [0, 0, 1.10], isStatic: false, enabled: true },
  { id: 'neptune', name: 'Neptune', mass: 2.0, radius: 0.28, color: '#0077b6', position: [15.0, 0, 0], velocity: [0, 0, 1.00], isStatic: false, enabled: true },
];

export default function App() {
  // --- Global App Mode ---
  const [appMode, setAppMode] = useState<'mesh' | 'space'>('mesh');

  // --- Mesh Studio State Variables ---
  const [activeObject, setActiveObject] = useState<SentientMeshProps['activeObject']>('sphere');
  const [svgUrl, setSvgUrl] = useState<string>('');
  const [complexity, setComplexity] = useState<SentientMeshProps['complexity']>('high');
  const [darkMode, setDarkMode] = useState(true);
  const [themeColor, setThemeColor] = useState('#FBE04C');
  const [gradientAngle, setGradientAngle] = useState(45);
  const [gradientSpread, setGradientSpread] = useState(0.5);
  const [gradientFalloff, setGradientFalloff] = useState(0.5);
  const [breathType, setBreathType] = useState<SentientMeshProps['breathType']>('individual-nodes');
  const [intensity, setIntensity] = useState(0.35);
  const [cadence, setCadence] = useState(0.5);
  
  // Custom Fine Rotation Controls (Pitch, Yaw, Roll in Radians)
  const [pitch, setPitch] = useState(0);
  const [yaw, setYaw] = useState(0);
  const [roll, setRoll] = useState(0);

  // --- Space Studio (Gravity Sim) State Variables ---
  const [planets, setPlanets] = useState<CelestialBody[]>(INITIAL_PLANETS);
  const [gravityConstant, setGravityConstant] = useState(1.0);
  const [simulationSpeed, setSimulationSpeed] = useState(1.0);
  const [showTrails, setShowTrails] = useState(true);
  const [showOrbitLines, setShowOrbitLines] = useState(true);
  const [fineGrid, setFineGrid] = useState(true);
  const [showFabric, setShowFabric] = useState(true);
  const [selectedPlanetId, setSelectedPlanetId] = useState<string>('earth');
  const [isPaused, setIsPaused] = useState(false);
  
  // Dynamic ephemeris / sandbox config
  const [simulationEngine, setSimulationEngine] = useState<'realistic' | 'sandbox'>('realistic');
  const [realisticSpeedDays, setRealisticSpeedDays] = useState(1.0);

  // Custom Planet Builder Temp State
  const [newPlanetName, setNewPlanetName] = useState('New Planet');
  const [newPlanetColor, setNewPlanetColor] = useState('#06d6a0');

  // --- Viewport State Variables (Shared) ---
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#0a0a0c');
  const [autoRotate, setAutoRotate] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(false);

  // --- Tracking State Variables (Shared) ---
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([0, 0, 5]);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([0, 0, 0]);

  // --- UI Layout State Variables ---
  const [activeMeshTab, setActiveMeshTab] = useState<'model' | 'optics' | 'breath' | 'viewport' | 'capture'>('model');
  const [activeSpaceTab, setActiveSpaceTab] = useState<'planets' | 'physics' | 'viewport' | 'capture'>('planets');
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [svgFileName, setSvgFileName] = useState<string>('');

  // Canvas and Capture Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureRef = useRef<any>(null);

  // --- Collapsible Sidebar Panel state ---
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // --- Capture Panel State & Ref ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerIntervalRef = useRef<any>(null);
  
  const [isExportingSequence, setIsExportingSequence] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [sequenceDuration, setSequenceDuration] = useState(3);
  const [sequenceFps, setSequenceFps] = useState(60);
  const [sequenceResolution, setSequenceResolution] = useState<'current' | '4k'>('current');

  React.useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Show dynamic toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleCaptureImage = (format: 'png' | 'webp') => {
    if (!captureRef.current) {
      alert("Canvas is not ready yet.");
      return;
    }
    try {
      showToast(`Generating 4K ${format.toUpperCase()} Render...`);
      requestAnimationFrame(() => {
        setTimeout(() => {
          const dataUrl = captureRef.current.captureImage(format);
          const a = document.createElement('a');
          a.download = `meshgod-4k-${Date.now()}.${format}`;
          a.href = dataUrl;
          a.click();
          showToast(`Downloaded 4K ${format.toUpperCase()} successfully!`);
        }, 100);
      });
    } catch (err) {
      console.error(err);
      alert("Failed to render and capture at 4K resolution.");
    }
  };

  const handleStartRecording = () => {
    if (!captureRef.current) return;
    setIsRecording(true);
    setRecordingTime(0);
    showToast("Recording 50 Mbps high-quality video...");

    timerIntervalRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    captureRef.current.startRecording((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meshgod-transparent-${Date.now()}.webm`;
      a.click();
      showToast("Pristine WebM downloaded successfully!");
    });
  };

  const handleStopRecording = () => {
    if (!captureRef.current) return;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    captureRef.current.stopRecording();
    setIsRecording(false);
    showToast("Compiling video file...");
  };

  const handleExportSequence = async () => {
    if (!captureRef.current) return;
    setIsExportingSequence(true);
    setExportProgress({ current: 0, total: sequenceDuration * sequenceFps });

    try {
      const zippedData = await captureRef.current.recordPngSequence(
        sequenceDuration,
        sequenceFps,
        sequenceResolution,
        (current: number, total: number) => {
          setExportProgress({ current, total });
        }
      );

      const blob = new Blob([zippedData], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `meshgod-sequence-${sequenceResolution === '4k' ? '4k-' : ''}${Date.now()}.zip`;
      a.href = url;
      a.click();
      showToast("ZIP sequence saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to export PNG sequence.");
    } finally {
      setIsExportingSequence(false);
    }
  };

  const handleExportSvg = () => {
    if (!captureRef.current || !captureRef.current.captureSvg) {
      alert("Canvas is not ready yet.");
      return;
    }
    try {
      showToast("Generating Vector SVG...");
      requestAnimationFrame(() => {
        setTimeout(() => {
          const svgContent = captureRef.current.captureSvg();
          if (!svgContent) {
            showToast("Failed to generate SVG.");
            return;
          }
          const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.download = `meshgod-vector-${activeObject}-${Date.now()}.svg`;
          a.href = url;
          a.click();
          URL.revokeObjectURL(url);
          showToast("Downloaded Vector SVG successfully!");
        }, 100);
      });
    } catch (err) {
      console.error(err);
      alert("Failed to export SVG wireframe.");
    }
  };

  const capturePanelProps = {
    isRecording,
    recordingTime,
    isExportingSequence,
    exportProgress,
    sequenceDuration,
    setSequenceDuration,
    sequenceFps,
    setSequenceFps,
    sequenceResolution,
    setSequenceResolution,
    handleCaptureImage,
    handleStartRecording,
    handleStopRecording,
    handleExportSequence,
    handleExportSvg: appMode === 'mesh' ? handleExportSvg : undefined,
  };

  // Custom Local SVG Upload Handler
  const handleSvgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSvgFileName(file.name);
      const url = URL.createObjectURL(file);
      setSvgUrl(url);
      setActiveObject('svg');
      showToast(`Uploaded SVG: ${file.name}`);
    }
  };

  // Sync camera movements from controls
  const handleCameraChange = (pos: [number, number, number], target: [number, number, number]) => {
    setCameraPosition(pos);
    setCameraTarget(target);
  };

  // Space Gravity: Update planetary values modified in UI
  const handleUpdatePlanet = (updated: Partial<CelestialBody>) => {
    setPlanets((prev) =>
      prev.map((p) => (p.id === selectedPlanetId ? { ...p, ...updated } : p))
    );
  };

  // Space Gravity: Reset Orbits to Initial State
  const handleResetOrbits = () => {
    setPlanets(INITIAL_PLANETS.map(p => ({
      ...p,
      position: [...p.position] as [number, number, number],
      velocity: [...p.velocity] as [number, number, number],
      enabled: true
    })));
    showToast("Orbital simulation reset to defaults");
  };

  // Space Gravity: Spawn a new planet
  const handleAddPlanet = () => {
    const id = `planet_${Date.now()}`;
    const maxRadius = planets.reduce((max, p) => Math.max(max, p.position[0]), 0) || 3;
    const spawnRadius = maxRadius + 1.2;
    const sun = planets.find((p) => p.isStatic) || { mass: 15.0 };
    const orbitalSpeed = Math.sqrt((gravityConstant * sun.mass) / spawnRadius);

    const newPlanet: CelestialBody = {
      id,
      name: newPlanetName,
      mass: 1.0,
      radius: 0.22,
      color: newPlanetColor,
      position: [spawnRadius, 0, 0],
      velocity: [0, 0, orbitalSpeed],
      isStatic: false,
      enabled: true,
    };

    setPlanets((prev) => [...prev, newPlanet]);
    setSelectedPlanetId(id);
    showToast(`Spawned body: ${newPlanetName}`);
  };

  // Space Gravity: Delete selected planet
  const handleDeletePlanet = () => {
    if (selectedPlanetId === 'sun') {
      alert("Cannot delete the central star!");
      return;
    }
    setPlanets((prev) => prev.filter((p) => p.id !== selectedPlanetId));
    setSelectedPlanetId('sun');
    showToast("Planet deleted from orbital plane");
  };

  const currentSelectedPlanet = planets.find((p) => p.id === selectedPlanetId);

  // Build the props package to feed SentientMesh
  const sentientMeshProps: SentientMeshProps = {
    activeObject,
    svgUrl,
    complexity,
    darkMode,
    themeColor,
    gradientAngle,
    gradientSpread,
    gradientFalloff,
    breathType,
    intensity,
    cadence,
    pitch,
    yaw,
    roll
  };

  return (
    <div className="app-container">
      {/* Toast Notification overlay */}
      {toastMessage && <div className="custom-toast">{toastMessage}</div>}

      {/* Floating Capture Panel when collapsed */}
      {isPanelCollapsed && (
        <div className="floating-capture-bar">
          <button 
            className="floating-cap-btn" 
            onClick={() => handleCaptureImage('png')}
            disabled={isRecording || isExportingSequence}
            title="Capture PNG"
          >
            <Camera size={14} />
            <span>PNG</span>
          </button>
          <button 
            className="floating-cap-btn" 
            onClick={() => handleCaptureImage('webp')}
            disabled={isRecording || isExportingSequence}
            title="Capture WebP"
          >
            <Sparkles size={14} />
            <span>WebP</span>
          </button>
          {appMode === 'mesh' && (
            <button 
              className="floating-cap-btn" 
              onClick={handleExportSvg}
              disabled={isRecording || isExportingSequence}
              title="Export SVG"
              style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', border: 'none' }}
            >
              <Download size={14} />
              <span>SVG</span>
            </button>
          )}
          {isRecording ? (
            <button 
              className="floating-cap-btn floating-cap-btn-recording" 
              onClick={handleStopRecording}
              title="Stop Recording"
            >
              <Square size={14} />
              <span>Stop</span>
            </button>
          ) : (
            <button 
              className="floating-cap-btn" 
              onClick={handleStartRecording}
              disabled={isExportingSequence}
              title="Record WebM"
            >
              <Video size={14} />
              <span>Record</span>
            </button>
          )}
          {isExportingSequence ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', background: 'rgba(0,0,0,0.5)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
              <Loader2 size={12} style={{ animation: 'spin 1.5s linear infinite' }} />
              <span>ZIP: {exportProgress.current}/{exportProgress.total}</span>
            </div>
          ) : (
            <button 
              className="floating-cap-btn" 
              onClick={handleExportSequence}
              disabled={isRecording}
              title="Export PNG Sequence"
              style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', border: 'none' }}
            >
              <Download size={14} />
              <span>Sequence</span>
            </button>
          )}
        </div>
      )}

      {/* --- Left Viewport View --- */}
      <div className="viewport-container">
        <div className="canvas-wrapper">
          {appMode === 'mesh' ? (
            <StudioCanvas
              meshProps={sentientMeshProps}
              transparentBackground={transparentBackground}
              backgroundColor={backgroundColor}
              autoRotate={autoRotate}
              showGrid={showGrid}
              showAxes={showAxes}
              onCameraChange={handleCameraChange}
              canvasRef={canvasRef}
              captureRef={captureRef}
            />
          ) : (
            <SpaceCanvas
              planets={planets}
              selectedPlanetId={selectedPlanetId}
              gravityConstant={gravityConstant}
              simulationSpeed={simulationSpeed}
              showTrails={showTrails}
              showOrbitLines={showOrbitLines}
              fineGrid={fineGrid}
              showFabric={showFabric}
              transparentBackground={transparentBackground}
              backgroundColor={backgroundColor}
              onCameraChange={handleCameraChange}
              onSelectPlanet={(id) => setSelectedPlanetId(id)}
              canvasRef={canvasRef}
              captureRef={captureRef}
              isPaused={isPaused}
              simulationEngine={simulationEngine}
              realisticSpeedDays={realisticSpeedDays}
            />
          )}
        </div>

        {/* Live Camera stats dashboard */}
        <div className="camera-overlay">
          <div className="camera-overlay-title">Camera Coordinates</div>
          <div className="camera-stat-row">
            <div className="camera-stat">
              Position: <span>[{cameraPosition.map(n => n.toFixed(2)).join(', ')}]</span>
            </div>
            <div className="camera-stat">
              Target: <span>[{cameraTarget.map(n => n.toFixed(2)).join(', ')}]</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- Right Settings Sidebar --- */}
      <div className={`control-panel ${isPanelCollapsed ? 'collapsed' : ''}`}>
        {/* Sidebar Collapse Toggle Button */}
        <button 
          className="collapse-toggle-btn"
          onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
          title={isPanelCollapsed ? "Expand Settings" : "Collapse Settings"}
        >
          {isPanelCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        {!isPanelCollapsed && (
          <>
            <div className="panel-header">
          <div className="logo-container">
            <Sparkles className="logo-icon" size={24} />
            <h1 className="logo-text">MeshGod</h1>
            <span className="logo-badge">v1.2</span>
          </div>
          <button 
            className="btn-action btn-primary" 
            style={{ width: 'auto', padding: '6px 12px' }}
            onClick={() => setIsCodeModalOpen(true)}
          >
            <Code size={14} />
            Export Code
          </button>
        </div>

        {/* Studio Mode Segment Switcher */}
        <div style={{ display: 'flex', padding: '12px 24px', gap: '8px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.01)' }}>
          <button
            className={`btn-action ${appMode === 'mesh' ? 'btn-primary' : ''}`}
            style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}
            onClick={() => {
              setAppMode('mesh');
              showToast("Switched to Mesh Studio Mode");
            }}
          >
            Mesh Studio
          </button>
          <button
            className={`btn-action ${appMode === 'space' ? 'btn-primary' : ''}`}
            style={{ flex: 1, fontSize: '0.8rem', padding: '8px', background: appMode === 'space' ? 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' : '' }}
            onClick={() => {
              setAppMode('space');
              showToast("Switched to Space Gravity Mode");
            }}
          >
            Space Design 1.0
          </button>
        </div>

        {/* --- TABS FOR MESH STUDIO --- */}
        {appMode === 'mesh' ? (
          <>
            <div className="tabs-nav">
              <button 
                className={`tab-btn ${activeMeshTab === 'model' ? 'active' : ''}`}
                onClick={() => setActiveMeshTab('model')}
              >
                <Box size={16} />
                Geometry
              </button>
              <button 
                className={`tab-btn ${activeMeshTab === 'optics' ? 'active' : ''}`}
                onClick={() => setActiveMeshTab('optics')}
              >
                <SunMoon size={16} />
                Optics
              </button>
              <button 
                className={`tab-btn ${activeMeshTab === 'breath' ? 'active' : ''}`}
                onClick={() => setActiveMeshTab('breath')}
              >
                <Activity size={16} />
                Breath
              </button>
              <button 
                className={`tab-btn ${activeMeshTab === 'viewport' ? 'active' : ''}`}
                onClick={() => setActiveMeshTab('viewport')}
              >
                <Eye size={16} />
                Viewport
              </button>
              <button 
                className={`tab-btn ${activeMeshTab === 'capture' ? 'active' : ''}`}
                onClick={() => setActiveMeshTab('capture')}
              >
                <Camera size={16} />
                Capture
              </button>
            </div>

            <div className="panel-content">
              {activeMeshTab === 'model' && (
                <div className="settings-section">
                  <h3 className="section-title">
                    <Box size={14} className="logo-icon" />
                    Mesh Geometry
                  </h3>
                  
                  <div className="control-group">
                    <div className="control-label-row">
                      <span className="control-label">Structure Type</span>
                    </div>
                    <select 
                      className="select-input" 
                      value={activeObject} 
                      onChange={(e) => setActiveObject(e.target.value as any)}
                    >
                      <option value="sphere">Sphere</option>
                      <option value="torus-knot">Torus Knot</option>
                      <option value="box">Cube</option>
                      <option value="cylinder">Cylinder</option>
                      <option value="low-poly-fabric">Low Poly Fabric</option>
                      <option value="klein-bottle">Klein Bottle</option>
                      <option value="mobius-strip">Möbius Strip</option>
                      <option value="wormhole">Wormhole</option>
                      <option value="black-hole">Black Hole</option>
                      <option value="white-hole">White Hole</option>
                      <option value="svg">SVG Vector Path</option>
                    </select>
                  </div>

                  {activeObject === 'svg' && (
                    <div className="control-group">
                      <div className="control-label-row">
                        <span className="control-label">SVG File Upload</span>
                      </div>
                      <div className="upload-btn-wrapper">
                        <label className="btn-upload">
                          <Upload size={18} />
                          {svgFileName ? `Selected: ${svgFileName}` : 'Choose Custom SVG Vector'}
                          <input 
                            type="file" 
                            accept=".svg" 
                            onChange={handleSvgUpload} 
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="control-group">
                    <div className="control-label-row">
                      <span className="control-label">Complexity (Vertices)</span>
                      <span className="control-badge" style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: 'var(--accent)' }}>
                        {complexity}
                      </span>
                    </div>
                    <select
                      className="select-input"
                      value={complexity}
                      onChange={(e) => setComplexity(e.target.value as any)}
                    >
                      <option value="low">Low Quality (Fast)</option>
                      <option value="medium">Medium Quality</option>
                      <option value="high">High Quality (Dense)</option>
                    </select>
                  </div>

                  <h3 className="section-title" style={{ marginTop: '24px' }}>
                    <Compass size={14} className="logo-icon" />
                    Fine Rotations (Pitch, Yaw, Roll)
                  </h3>
                  <p className="help-text" style={{ marginBottom: '16px' }}>
                    Fine-tune object rotation using Pitch (X-axis), Yaw (Y-axis), and Roll (Z-axis) in radians.
                  </p>

                  <div className="control-group">
                    <div className="control-label-row">
                      <span className="control-label">Pitch (X-Axis)</span>
                      <span className="control-value">{(pitch / Math.PI).toFixed(2)}π</span>
                    </div>
                    <input 
                      type="range" 
                      className="slider-input" 
                      min={-Math.PI} 
                      max={Math.PI} 
                      step={0.01} 
                      value={pitch} 
                      onChange={(e) => setPitch(parseFloat(e.target.value))} 
                    />
                  </div>

                  <div className="control-group">
                    <div className="control-label-row">
                      <span className="control-label">Yaw (Y-Axis)</span>
                      <span className="control-value">{(yaw / Math.PI).toFixed(2)}π</span>
                    </div>
                    <input 
                      type="range" 
                      className="slider-input" 
                      min={-Math.PI} 
                      max={Math.PI} 
                      step={0.01} 
                      value={yaw} 
                      onChange={(e) => setYaw(parseFloat(e.target.value))} 
                    />
                  </div>

                  <div className="control-group">
                    <div className="control-label-row">
                      <span className="control-label">Roll (Z-Axis)</span>
                      <span className="control-value">{(roll / Math.PI).toFixed(2)}π</span>
                    </div>
                    <input 
                      type="range" 
                      className="slider-input" 
                      min={-Math.PI} 
                      max={Math.PI} 
                      step={0.01} 
                      value={roll} 
                      onChange={(e) => setRoll(parseFloat(e.target.value))} 
                    />
                  </div>
                </div>
              )}

              {activeMeshTab === 'optics' && (
                <div className="settings-section">
                  <h3 className="section-title">
                    <SunMoon size={14} className="logo-icon" />
                    Shader Optics
                  </h3>

                  <div className="control-group">
                    <div className="toggle-wrapper">
                      <span className="control-label">Dark Base Blending</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={darkMode} 
                          onChange={(e) => setDarkMode(e.target.checked)} 
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="control-group">
                    <div className="control-label-row">
                      <span className="control-label">Primary Theme Color</span>
                      <span className="control-value">{themeColor.toUpperCase()}</span>
                    </div>
                    <div className="color-picker-row">
                      <div className="color-input-wrapper">
                        <input 
                          type="color" 
                          className="color-input" 
                          value={themeColor} 
                          onChange={(e) => setThemeColor(e.target.value)} 
                        />
                      </div>
                      <input 
                        type="text" 
                        className="text-input" 
                        value={themeColor} 
                        onChange={(e) => setThemeColor(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="control-group">
                    <div className="control-label-row">
                      <span className="control-label">Gradient Angle</span>
                      <span className="control-value">{gradientAngle}°</span>
                    </div>
                    <input 
                      type="range" 
                      className="slider-input" 
                      min={0} 
                      max={360} 
                      step={1} 
                      value={gradientAngle} 
                      onChange={(e) => setGradientAngle(parseInt(e.target.value))} 
                    />
                  </div>

                  <div className="control-group">
                    <div className="control-label-row">
                      <span className="control-label">Gradient Spread</span>
                      <span className="control-value">{gradientSpread.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" 
                      className="slider-input" 
                      min={0.0} 
                      max={1.0} 
                      step={0.01} 
                      value={gradientSpread} 
                      onChange={(e) => setGradientSpread(parseFloat(e.target.value))} 
                    />
                  </div>

                  <div className="control-group">
                    <div className="control-label-row">
                      <span className="control-label">Gradient Falloff</span>
                      <span className="control-value">{gradientFalloff.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" 
                      className="slider-input" 
                      min={0.0} 
                      max={1.0} 
                      step={0.01} 
                      value={gradientFalloff} 
                      onChange={(e) => setGradientFalloff(parseFloat(e.target.value))} 
                    />
                  </div>
                </div>
              )}

              {activeMeshTab === 'breath' && (
                <div className="settings-section">
                  <h3 className="section-title">
                    <Activity size={14} className="logo-icon" />
                    Vertex Animation
                  </h3>

                  <div className="control-group">
                    <div className="control-label-row">
                      <span className="control-label">Breathing Type</span>
                    </div>
                    <select 
                      className="select-input" 
                      value={breathType} 
                      onChange={(e) => setBreathType(e.target.value as any)}
                    >
                      <option value="individual-nodes">Individual Nodes (Noise displacement)</option>
                      <option value="uniform">Uniform Scale (Whole mesh pulse)</option>
                    </select>
                  </div>

                  <div className="control-group">
                    <div className="control-label-row">
                      <span className="control-label">Breathing Intensity</span>
                      <span className="control-value">{intensity.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" 
                      className="slider-input" 
                      min={0.0} 
                      max={2.0} 
                      step={0.01} 
                      value={intensity} 
                      onChange={(e) => setIntensity(parseFloat(e.target.value))} 
                    />
                  </div>

                  <div className="control-group">
                    <div className="control-label-row">
                      <span className="control-label">Breathing Cadence</span>
                      <span className="control-value">{cadence.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" 
                      className="slider-input" 
                      min={0.0} 
                      max={1.0} 
                      step={0.01} 
                      value={cadence} 
                      onChange={(e) => setCadence(parseFloat(e.target.value))} 
                    />
                  </div>
                </div>
              )}

              {activeMeshTab === 'viewport' && (
                <div className="settings-section">
                  <h3 className="section-title">
                    <Eye size={14} className="logo-icon" />
                    Viewport Settings
                  </h3>

                  <div className="control-group">
                    <div className="toggle-wrapper">
                      <span className="control-label">Transparent Canvas Background</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={transparentBackground} 
                          onChange={(e) => setTransparentBackground(e.target.checked)} 
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  {!transparentBackground && (
                    <div className="control-group">
                      <div className="control-label-row">
                        <span className="control-label">Solid Background Color</span>
                        <span className="control-value">{backgroundColor.toUpperCase()}</span>
                      </div>
                      <div className="color-picker-row">
                        <div className="color-input-wrapper">
                          <input 
                            type="color" 
                            className="color-input" 
                            value={backgroundColor} 
                            onChange={(e) => setBackgroundColor(e.target.value)} 
                          />
                        </div>
                        <input 
                          type="text" 
                          className="text-input" 
                          value={backgroundColor} 
                          onChange={(e) => setBackgroundColor(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="control-group">
                    <div className="toggle-wrapper">
                      <span className="control-label">Orbit Auto-Rotation</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={autoRotate} 
                          onChange={(e) => setAutoRotate(e.target.checked)} 
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="control-group">
                    <div className="toggle-wrapper">
                      <span className="control-label">Render Grid Helper</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={showGrid} 
                          onChange={(e) => setShowGrid(e.target.checked)} 
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="control-group">
                    <div className="toggle-wrapper">
                      <span className="control-label">Render Axis Helper</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={showAxes} 
                          onChange={(e) => setShowAxes(e.target.checked)} 
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeMeshTab === 'capture' && (
                <CapturePanel {...capturePanelProps} />
              )}
            </div>
          </>
        ) : (
          // --- TABS FOR SPACE GRAVITY SIMULATOR ---
          <>
            <div className="tabs-nav">
              <button 
                className={`tab-btn ${activeSpaceTab === 'planets' ? 'active' : ''}`}
                onClick={() => setActiveSpaceTab('planets')}
              >
                <Globe size={16} />
                Planets
              </button>
              <button 
                className={`tab-btn ${activeSpaceTab === 'physics' ? 'active' : ''}`}
                onClick={() => setActiveSpaceTab('physics')}
              >
                <Sliders size={16} />
                Physics
              </button>
              <button 
                className={`tab-btn ${activeSpaceTab === 'viewport' ? 'active' : ''}`}
                onClick={() => setActiveSpaceTab('viewport')}
              >
                <Eye size={16} />
                Viewport
              </button>
              <button 
                className={`tab-btn ${activeSpaceTab === 'capture' ? 'active' : ''}`}
                onClick={() => setActiveSpaceTab('capture')}
              >
                <Camera size={16} />
                Capture
              </button>
            </div>

            <div className="panel-content">
              {/* SPACE TAB 1: PLANET SETTINGS */}
              {activeSpaceTab === 'planets' && (
                <div className="settings-section">
                  <h3 className="section-title">
                    <Globe size={14} className="logo-icon" />
                    Celestial Bodies
                  </h3>
                  
                  {/* Planet list with checkboxes to enable/disable */}
                  <div className="control-group" style={{ marginBottom: '20px' }}>
                    <span className="control-label" style={{ marginBottom: '6px' }}>Active Planetary System</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                      {planets.map((p) => {
                        const isCustom = !p.isStatic && p.id.startsWith('planet_');
                        if (simulationEngine === 'realistic' && isCustom) return null;

                        return (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color, boxShadow: `0 0 6px ${p.color}` }}></div>
                              <span 
                                style={{ 
                                  fontSize: '0.8rem', 
                                  color: p.id === selectedPlanetId ? '#fff' : 'var(--text-secondary)', 
                                  fontWeight: p.id === selectedPlanetId ? 600 : 400, 
                                  cursor: 'pointer',
                                  textDecoration: p.enabled === false ? 'line-through' : 'none',
                                  opacity: p.enabled === false ? 0.5 : 1
                                }} 
                                onClick={() => setSelectedPlanetId(p.id)}
                              >
                                {p.name} {p.isStatic ? '★' : ''}
                              </span>
                            </div>
                            
                            {/* Toggle planet visibility / physics influence */}
                            <label className="switch" style={{ width: '36px', height: '20px' }}>
                              <input 
                                type="checkbox" 
                                checked={p.enabled !== false} 
                                onChange={(e) => {
                                  const updated = planets.map((planet) => 
                                    planet.id === p.id ? { ...planet, enabled: e.target.checked } : planet
                                  );
                                  setPlanets(updated);
                                  showToast(`${p.name} ${e.target.checked ? 'activated' : 'deactivated'}`);
                                }} 
                              />
                              <span className="slider" style={{ borderRadius: '20px' }}></span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {currentSelectedPlanet && currentSelectedPlanet.enabled !== false && (
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                      <div className="control-group">
                        <div className="control-label-row">
                          <span className="control-label">Body Name</span>
                        </div>
                        <input
                          type="text"
                          className="text-input"
                          value={currentSelectedPlanet.name}
                          onChange={(e) => handleUpdatePlanet({ name: e.target.value })}
                          disabled={simulationEngine === 'realistic' && !currentSelectedPlanet.isStatic}
                        />
                      </div>

                      {simulationEngine === 'realistic' ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                          <p>⚠️ In **Realistic Mode**, positions are governed by the Astronomy Engine. Orbit distances and speeds are locked to real ephemerides.</p>
                        </div>
                      ) : null}

                      <div className="control-group">
                        <div className="control-label-row">
                          <span className="control-label">Mass (Gravity Strength)</span>
                          <span className="control-value">{currentSelectedPlanet.mass.toFixed(1)}</span>
                        </div>
                        <input 
                          type="range" 
                          className="slider-input" 
                          min={0.01} 
                          max={currentSelectedPlanet.isStatic ? 100.0 : 20.0} 
                          step={0.1} 
                          value={currentSelectedPlanet.mass} 
                          onChange={(e) => handleUpdatePlanet({ mass: parseFloat(e.target.value) })} 
                          disabled={simulationEngine === 'realistic' && !currentSelectedPlanet.isStatic}
                        />
                      </div>

                      <div className="control-group">
                        <div className="control-label-row">
                          <span className="control-label">Radius (Visual Size)</span>
                          <span className="control-value">{currentSelectedPlanet.radius.toFixed(2)}</span>
                        </div>
                        <input 
                          type="range" 
                          className="slider-input" 
                          min={0.05} 
                          max={currentSelectedPlanet.isStatic ? 2.5 : 1.2} 
                          step={0.01} 
                          value={currentSelectedPlanet.radius} 
                          onChange={(e) => handleUpdatePlanet({ radius: parseFloat(e.target.value) })} 
                        />
                      </div>

                      <div className="control-group">
                        <div className="control-label-row">
                          <span className="control-label">Accent Color</span>
                          <span className="control-value">{currentSelectedPlanet.color.toUpperCase()}</span>
                        </div>
                        <div className="color-picker-row">
                          <div className="color-input-wrapper">
                            <input 
                              type="color" 
                              className="color-input" 
                              value={currentSelectedPlanet.color} 
                              onChange={(e) => handleUpdatePlanet({ color: e.target.value })} 
                            />
                          </div>
                          <input 
                            type="text" 
                            className="text-input" 
                            value={currentSelectedPlanet.color} 
                            onChange={(e) => handleUpdatePlanet({ color: e.target.value })}
                          />
                        </div>
                      </div>

                      {simulationEngine === 'sandbox' && !currentSelectedPlanet.isStatic && (
                        <>
                          <div className="control-group">
                            <div className="control-label-row">
                              <span className="control-label">Orbit Distance (Starting X)</span>
                              <span className="control-value">{currentSelectedPlanet.position[0].toFixed(2)}</span>
                            </div>
                            <input 
                              type="range" 
                              className="slider-input" 
                              min={2.0} 
                              max={25.0} 
                              step={0.1} 
                              value={currentSelectedPlanet.position[0]} 
                              onChange={(e) => {
                                const newX = parseFloat(e.target.value);
                                handleUpdatePlanet({ position: [newX, 0, 0] });
                              }} 
                            />
                          </div>

                          <div className="control-group">
                            <div className="control-label-row">
                              <span className="control-label">Initial Orbital Velocity (Z)</span>
                              <span className="control-value">{currentSelectedPlanet.velocity[2].toFixed(2)}</span>
                            </div>
                            <input 
                              type="range" 
                              className="slider-input" 
                              min={-6.0} 
                              max={6.0} 
                              step={0.05} 
                              value={currentSelectedPlanet.velocity[2]} 
                              onChange={(e) => {
                                const newVZ = parseFloat(e.target.value);
                                handleUpdatePlanet({ velocity: [0, 0, newVZ] });
                              }} 
                            />
                          </div>

                          <button 
                            className="btn-action" 
                            style={{ borderColor: '#ef4444', color: '#ef4444', marginTop: '8px' }}
                            onClick={handleDeletePlanet}
                          >
                            <Trash2 size={14} />
                            Destroy Planet
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Add Planet Section - ONLY active in Sandbox mode */}
                  {simulationEngine === 'sandbox' && (
                    <div style={{ marginTop: '28px' }}>
                      <h3 className="section-title">
                        <Plus size={14} className="logo-icon" />
                        Launch New Planet
                      </h3>
                      <div style={{ background: 'rgba(255, 255, 255, 0.01)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px dotted var(--glass-border)' }}>
                        <div className="control-group">
                          <span className="control-label">Planet Name</span>
                          <input
                            type="text"
                            className="text-input"
                            value={newPlanetName}
                            onChange={(e) => setNewPlanetName(e.target.value)}
                          />
                        </div>
                        <div className="control-group">
                          <span className="control-label">Planet Color</span>
                          <div className="color-picker-row">
                            <div className="color-input-wrapper">
                              <input 
                                type="color" 
                                className="color-input" 
                                value={newPlanetColor} 
                                onChange={(e) => setNewPlanetColor(e.target.value)} 
                              />
                            </div>
                            <input 
                              type="text" 
                              className="text-input" 
                              value={newPlanetColor} 
                              onChange={(e) => setNewPlanetColor(e.target.value)}
                            />
                          </div>
                        </div>
                        <button 
                          className="btn-action btn-primary" 
                          style={{ background: 'linear-gradient(135deg, #05af83 0%, #06d6a0 100%)', border: 'none' }}
                          onClick={handleAddPlanet}
                        >
                          <Plus size={14} />
                          Launch Planetary Body
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SPACE TAB 2: PHYSICS GLOBAL CONFIG */}
              {activeSpaceTab === 'physics' && (
                <div className="settings-section">
                  <h3 className="section-title">
                    <Sliders size={14} className="logo-icon" />
                    Physics Parameters
                  </h3>

                  <div className="grid-2" style={{ marginBottom: '20px' }}>
                    <button 
                      className="btn-action" 
                      onClick={() => setIsPaused(!isPaused)}
                    >
                      {isPaused ? <Play size={14} /> : <Pause size={14} />}
                      {isPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button 
                      className="btn-action" 
                      onClick={handleResetOrbits}
                    >
                      <RotateCcw size={14} />
                      Reset Orbits
                    </button>
                  </div>

                  <div className="control-group" style={{ marginBottom: '20px' }}>
                    <div className="control-label-row">
                      <span className="control-label">Simulation Math Engine</span>
                    </div>
                    <select
                      className="select-input"
                      value={simulationEngine}
                      onChange={(e) => {
                        setSimulationEngine(e.target.value as any);
                        showToast(`Switched simulation to ${e.target.value === 'realistic' ? 'Astronomy Engine' : 'Newtonian Sandbox'}`);
                      }}
                    >
                      <option value="realistic">Realistic Ephemeris (Astronomy Engine)</option>
                      <option value="sandbox">Newtonian Sandbox (Gravity Physics)</option>
                    </select>
                  </div>

                  {simulationEngine === 'realistic' ? (
                    <div className="control-group">
                      <div className="control-label-row">
                        <span className="control-label">Time Step Speed (Days/Sec)</span>
                        <span className="control-value">{realisticSpeedDays.toFixed(1)}d/s</span>
                      </div>
                      <input 
                        type="range" 
                        className="slider-input" 
                        min={0.1} 
                        max={15.0} 
                        step={0.1} 
                        value={realisticSpeedDays} 
                        onChange={(e) => setRealisticSpeedDays(parseFloat(e.target.value))} 
                      />
                    </div>
                  ) : (
                    <>
                      <div className="control-group">
                        <div className="control-label-row">
                          <span className="control-label">Gravitational Constant (G)</span>
                          <span className="control-value">{gravityConstant.toFixed(2)}</span>
                        </div>
                        <input 
                          type="range" 
                          className="slider-input" 
                          min={0.1} 
                          max={5.0} 
                          step={0.1} 
                          value={gravityConstant} 
                          onChange={(e) => setGravityConstant(parseFloat(e.target.value))} 
                        />
                      </div>

                      <div className="control-group">
                        <div className="control-label-row">
                          <span className="control-label">Simulation Warp Speed</span>
                          <span className="control-value">{simulationSpeed.toFixed(1)}x</span>
                        </div>
                        <input 
                          type="range" 
                          className="slider-input" 
                          min={0.0} 
                          max={3.0} 
                          step={0.1} 
                          value={simulationSpeed} 
                          onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))} 
                        />
                      </div>
                    </>
                  )}

                  <div className="control-group" style={{ marginTop: '16px' }}>
                    <div className="toggle-wrapper">
                      <span className="control-label">Enable Orbit Trails</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={showTrails} 
                          onChange={(e) => setShowTrails(e.target.checked)} 
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="control-group" style={{ marginTop: '12px' }}>
                    <div className="toggle-wrapper">
                      <span className="control-label">Show Orbit Guide Lines</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={showOrbitLines} 
                          onChange={(e) => setShowOrbitLines(e.target.checked)} 
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="control-group" style={{ marginTop: '12px' }}>
                    <div className="toggle-wrapper">
                      <span className="control-label">Fine Gravity Grid (160x160)</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={fineGrid} 
                          onChange={(e) => setFineGrid(e.target.checked)} 
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* SPACE TAB 3: VIEWPORT DETAILS */}
              {activeSpaceTab === 'viewport' && (
                <div className="settings-section">
                  <h3 className="section-title">
                    <Eye size={14} className="logo-icon" />
                    Viewport Settings
                  </h3>

                  <div className="control-group">
                    <div className="toggle-wrapper">
                      <span className="control-label">Space-Time Gravity Fabric</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={showFabric} 
                          onChange={(e) => setShowFabric(e.target.checked)} 
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="control-group">
                    <div className="toggle-wrapper">
                      <span className="control-label">Fine Gravity Grid (160x160)</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={fineGrid} 
                          onChange={(e) => setFineGrid(e.target.checked)} 
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="control-group">
                    <div className="toggle-wrapper">
                      <span className="control-label">Show Orbit Guide Lines</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={showOrbitLines} 
                          onChange={(e) => setShowOrbitLines(e.target.checked)} 
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="control-group">
                    <div className="toggle-wrapper">
                      <span className="control-label">Transparent Canvas Background</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={transparentBackground} 
                          onChange={(e) => setTransparentBackground(e.target.checked)} 
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  {!transparentBackground && (
                    <div className="control-group">
                      <div className="control-label-row">
                        <span className="control-label">Solid Background Color</span>
                        <span className="control-value">{backgroundColor.toUpperCase()}</span>
                      </div>
                      <div className="color-picker-row">
                        <div className="color-input-wrapper">
                          <input 
                            type="color" 
                            className="color-input" 
                            value={backgroundColor} 
                            onChange={(e) => setBackgroundColor(e.target.value)} 
                          />
                        </div>
                        <input 
                          type="text" 
                          className="text-input" 
                          value={backgroundColor} 
                          onChange={(e) => setBackgroundColor(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SPACE TAB 4: CAPTURES */}
              {activeSpaceTab === 'capture' && (
                <CapturePanel {...capturePanelProps} />
              )}
            </div>
          </>
        )}

            {/* Panel Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--glass-border)', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
              MESHGOD STUDIO • MULTIVERSE SHADER DESIGN
            </div>
          </>
        )}
      </div>

      {/* --- Code Exporter Dialog overlay --- */}
      <CodeExportModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        meshProps={sentientMeshProps}
        cameraPosition={cameraPosition}
        cameraTarget={cameraTarget}
        showToast={showToast}
        appMode={appMode}
        spaceProps={{
          planets,
          gravityConstant,
          simulationSpeed,
          showTrails,
          simulationEngine,
          realisticSpeedDays,
          showFabric,
          showOrbitLines,
          fineGrid
        }}
      />
    </div>
  );
}
