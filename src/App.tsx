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
  Sparkles
} from 'lucide-react';

import StudioCanvas from './components/StudioCanvas';
import CapturePanel from './components/CapturePanel';
import CodeExportModal from './components/CodeExportModal';
import type { SentientMeshProps } from 'sentient-mesh';

export default function App() {
  // --- SentientMesh State Variables ---
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

  // --- Viewport State Variables ---
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#0a0a0c');
  const [autoRotate, setAutoRotate] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(false);

  // --- Tracking State Variables ---
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([0, 0, 5]);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([0, 0, 0]);

  // --- UI Layout State Variables ---
  const [activeTab, setActiveTab] = useState<'model' | 'optics' | 'breath' | 'viewport' | 'capture'>('model');
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [svgFileName, setSvgFileName] = useState<string>('');

  // Canvas and Capture Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureRef = useRef<any>(null);

  // Show dynamic toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
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

      {/* --- Left Viewport View --- */}
      <div className="viewport-container">
        <div className="canvas-wrapper">
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
      <div className="control-panel">
        <div className="panel-header">
          <div className="logo-container">
            <Sparkles className="logo-icon" size={24} />
            <h1 className="logo-text">MeshGod</h1>
            <span className="logo-badge">v1.1</span>
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

        {/* Control Panel Tabs navigation */}
        <div className="tabs-nav">
          <button 
            className={`tab-btn ${activeTab === 'model' ? 'active' : ''}`}
            onClick={() => setActiveTab('model')}
          >
            <Box size={16} />
            Geometry
          </button>
          <button 
            className={`tab-btn ${activeTab === 'optics' ? 'active' : ''}`}
            onClick={() => setActiveTab('optics')}
          >
            <SunMoon size={16} />
            Optics
          </button>
          <button 
            className={`tab-btn ${activeTab === 'breath' ? 'active' : ''}`}
            onClick={() => setActiveTab('breath')}
          >
            <Activity size={16} />
            Breath
          </button>
          <button 
            className={`tab-btn ${activeTab === 'viewport' ? 'active' : ''}`}
            onClick={() => setActiveTab('viewport')}
          >
            <Eye size={16} />
            Viewport
          </button>
          <button 
            className={`tab-btn ${activeTab === 'capture' ? 'active' : ''}`}
            onClick={() => setActiveTab('capture')}
          >
            <Camera size={16} />
            Capture
          </button>
        </div>

        {/* Panel Tabs Contents */}
        <div className="panel-content">
          {/* TAB 1: MODEL GEOMETRY */}
          {activeTab === 'model' && (
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
                  <option value="svg">SVG Vector Path</option>
                </select>
              </div>

              {activeObject === 'svg' && (
                <div className="control-group" style={{ animation: 'fadeIn 0.3s ease-out' }}>
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

              {/* Rotations */}
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

          {/* TAB 2: OPTICS OPTION */}
          {activeTab === 'optics' && (
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
                <p className="help-text">
                  Enabling blends shader colors into white (dark space). Disabling blends colors into black.
                </p>
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

          {/* TAB 3: BREATH ANIMATION */}
          {activeTab === 'breath' && (
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

          {/* TAB 4: VIEWPORT DETAILS */}
          {activeTab === 'viewport' && (
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
                <p className="help-text">
                  Make the scene background fully transparent. Necessary for transparent image/video captures.
                </p>
              </div>

              {!transparentBackground && (
                <div className="control-group" style={{ animation: 'fadeIn 0.3s ease-out' }}>
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

          {/* TAB 5: CAPTURE AREA */}
          {activeTab === 'capture' && (
            <CapturePanel 
              captureRef={captureRef}
              showToast={showToast}
            />
          )}
        </div>

        {/* Panel Footer copyright info */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--glass-border)', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
          MESHGOD STUDIO • MULTIVERSE SHADER DESIGN
        </div>
      </div>

      {/* --- Code Exporter Dialog overlay --- */}
      <CodeExportModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        meshProps={sentientMeshProps}
        cameraPosition={cameraPosition}
        cameraTarget={cameraTarget}
        showToast={showToast}
      />
    </div>
  );
}
