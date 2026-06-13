import React from 'react';
import { X, Copy, Check } from 'lucide-react';
import type { SentientMeshProps } from 'sentient-mesh';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  meshProps: SentientMeshProps;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  showToast: (msg: string) => void;
}

export default function CodeExportModal({
  isOpen,
  onClose,
  meshProps,
  cameraPosition,
  cameraTarget,
  showToast,
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

  const codeSnippet = `import React from 'react';
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
          <h2 className="modal-title">Export Scene Code</h2>
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
          <button className="btn-action btn-primary" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
      </div>
    </div>
  );
}
