import { Camera, Video, Square, Sparkles, Download, Loader2, Film } from 'lucide-react';

interface CapturePanelProps {
  isRecording: boolean;
  recordingTime: number;
  isExportingSequence: boolean;
  exportProgress: { current: number; total: number };
  sequenceDuration: number;
  setSequenceDuration: (v: number) => void;
  sequenceFps: number;
  setSequenceFps: (v: number) => void;
  sequenceResolution: 'current' | '4k';
  setSequenceResolution: (v: 'current' | '4k') => void;
  handleCaptureImage: (format: 'png' | 'webp') => void;
  handleStartRecording: () => void;
  handleStopRecording: () => void;
  handleExportSequence: () => void;
  handleExportSvg?: () => void;
}

export default function CapturePanel({
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
  handleExportSvg,
}: CapturePanelProps) {
  // Format recording timer: 00:00
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="capture-controls">
      {/* 4K Screenshots */}
      <div className="settings-section">
        <h3 className="section-title">
          <Camera size={14} className="logo-icon" />
          Capture 4K Renders
        </h3>
        <p className="help-text" style={{ marginBottom: '12px' }}>
          Outputs high-fidelity renders at 4K (3840x2160) directly from the WebGL context.
        </p>
        <div className="grid-2" style={{ marginBottom: handleExportSvg ? '12px' : '0' }}>
          <button 
            className="btn-action" 
            onClick={() => handleCaptureImage('png')}
            disabled={isRecording || isExportingSequence}
          >
            <Sparkles size={14} />
            Capture PNG
          </button>
          <button 
            className="btn-action" 
            onClick={() => handleCaptureImage('webp')}
            disabled={isRecording || isExportingSequence}
          >
            <Sparkles size={14} />
            Capture WebP
          </button>
        </div>
        {handleExportSvg && (
          <button 
            className="btn-action btn-primary" 
            onClick={handleExportSvg}
            disabled={isRecording || isExportingSequence}
            style={{ 
              width: '100%', 
              background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', 
              border: 'none',
              boxShadow: '0 4px 15px rgba(217, 119, 6, 0.2)' 
            }}
          >
            <Download size={14} />
            Export Vector SVG
          </button>
        )}
      </div>

      {/* Video Capturing */}
      <div className="settings-section">
        <h3 className="section-title">
          <Video size={14} className="logo-icon" />
          Transparent Recording (WebM)
        </h3>
        <p className="help-text" style={{ marginBottom: '12px' }}>
          Record animation loops in high-bitrate WebM (50 Mbps). Full alpha support. Great for OBS overlays.
        </p>
        
        {isRecording ? (
          <button 
            className="btn-action btn-recording" 
            onClick={handleStopRecording}
          >
            <Square size={14} />
            Stop Recording
            <span className="recording-timer">{formatTime(recordingTime)}</span>
          </button>
        ) : (
          <button 
            className="btn-action btn-primary" 
            onClick={handleStartRecording}
            disabled={isExportingSequence}
          >
            <Video size={14} />
            Start Video Capture
          </button>
        )}
      </div>

      {/* PNG Sequence Export */}
      <div className="settings-section" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
        <h3 className="section-title">
          <Film size={14} className="logo-icon" />
          Lossless PNG Sequence (ZIP)
        </h3>
        <p className="help-text" style={{ marginBottom: '16px' }}>
          Export a zipped folder of transparent PNG frames. **Universal transparency format** for Adobe Premiere, After Effects, DaVinci Resolve, and all video editors.
        </p>

        <div className="control-group">
          <div className="control-label-row">
            <span className="control-label">Duration (Seconds)</span>
            <span className="control-value">{sequenceDuration}s</span>
          </div>
          <input 
            type="range" 
            className="slider-input" 
            min={1} 
            max={10} 
            step={1} 
            value={sequenceDuration} 
            onChange={(e) => setSequenceDuration(parseInt(e.target.value))} 
            disabled={isRecording || isExportingSequence}
          />
        </div>

        <div className="grid-2" style={{ marginBottom: '16px' }}>
          <div className="control-group">
            <span className="control-label">Framerate</span>
            <select
              className="select-input"
              value={sequenceFps}
              onChange={(e) => setSequenceFps(parseInt(e.target.value))}
              disabled={isRecording || isExportingSequence}
            >
              <option value={30}>30 FPS</option>
              <option value={60}>60 FPS</option>
            </select>
          </div>
          <div className="control-group">
            <span className="control-label">Resolution</span>
            <select
              className="select-input"
              value={sequenceResolution}
              onChange={(e) => setSequenceResolution(e.target.value as any)}
              disabled={isRecording || isExportingSequence}
            >
              <option value="current">Current Size</option>
              <option value="4k">4K UHD</option>
            </select>
          </div>
        </div>

        {isExportingSequence ? (
          <div className="control-group" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', padding: '14px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.85rem' }}>
              <Loader2 size={16} className="logo-icon" style={{ animation: 'spin 1.5s linear infinite' }} />
              <span>Rendering frame: {exportProgress.current} / {exportProgress.total}</span>
            </div>
            {/* Simple Progress Bar */}
            <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${(exportProgress.current / exportProgress.total) * 100}%`, 
                  height: '100%', 
                  background: 'var(--accent)', 
                  transition: 'width 0.1s ease' 
                }}
              ></div>
            </div>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : (
          <button 
            className="btn-action btn-primary" 
            onClick={handleExportSequence}
            disabled={isRecording}
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 4px 20px rgba(124, 58, 237, 0.25)' }}
          >
            <Download size={14} />
            Export PNG Sequence (ZIP)
          </button>
        )}
      </div>
    </div>
  );
}
