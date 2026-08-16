import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PenTool, Type, Image, Trash2, Check, X, Download } from 'lucide-react';

export default function SignatureModal({ onSaveSignature, onClose }) {
  const [tab, setTab] = useState('draw'); // 'draw' | 'type' | 'upload'
  const [typedName, setTypedName] = useState('John Doe');
  const [selectedFont, setSelectedFont] = useState('cursive');
  const [color, setColor] = useState('#000000');
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Setup canvas for drawing
  useEffect(() => {
    if (tab !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [tab, color]);

  const startDrawing = (e) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return;
      const dataUrl = canvas.toDataURL('image/png');
      onSaveSignature(dataUrl);
    } else if (tab === 'type') {
      // Render typed signature onto hidden canvas
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.font = `italic 42px ${selectedFont}, cursive, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, 200, 80);
      const dataUrl = canvas.toDataURL('image/png');
      onSaveSignature(dataUrl);
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 220,
      background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-panel"
        style={{
          width: '100%', maxWidth: 520,
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-color)', borderRadius: 20,
          border: '1px solid var(--glass-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--glass-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(175, 82, 222, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#af52de' }}>
              <PenTool size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Create Digital Signature</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Draw, type, or stamp signature on your PDF</p>
            </div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: 6 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Tab Selector */}
        <div style={{
          display: 'flex', padding: '8px 20px 0', gap: 8,
          borderBottom: '1px solid var(--glass-border)',
        }}>
          <button
            className="btn"
            onClick={() => setTab('draw')}
            style={{
              padding: '6px 14px', fontSize: 13, gap: 6,
              borderBottom: tab === 'draw' ? '2px solid var(--accent)' : '2px solid transparent',
              borderRadius: 0,
              color: tab === 'draw' ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            <PenTool size={14} /> Draw
          </button>
          <button
            className="btn"
            onClick={() => setTab('type')}
            style={{
              padding: '6px 14px', fontSize: 13, gap: 6,
              borderBottom: tab === 'type' ? '2px solid var(--accent)' : '2px solid transparent',
              borderRadius: 0,
              color: tab === 'type' ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            <Type size={14} /> Type
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tab === 'draw' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Draw in box below:</span>
                <button
                  className="btn"
                  onClick={clearCanvas}
                  style={{ padding: '2px 8px', fontSize: 11, color: '#ff3b30', gap: 4 }}
                >
                  <Trash2 size={12} /> Clear
                </button>
              </div>

              <div style={{
                width: '100%', height: 180, borderRadius: 12,
                background: '#ffffff', border: '1px solid var(--glass-border)',
                overflow: 'hidden', cursor: 'crosshair', position: 'relative',
              }}>
                <canvas
                  ref={canvasRef}
                  width={480}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ width: '100%', height: '100%' }}
                />
                {!hasDrawn && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#a0a0a0', fontSize: 14, pointerEvents: 'none',
                  }}>
                    Sign here with mouse or touch…
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'type' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Your Full Name
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={e => setTypedName(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                  }}
                />
              </div>

              {/* Calligraphy Preview Box */}
              <div style={{
                width: '100%', height: 130, borderRadius: 12,
                background: '#ffffff', border: '1px solid var(--glass-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, fontStyle: 'italic', fontFamily: `${selectedFont}, cursive, sans-serif`,
                color: color, padding: 12,
              }}>
                {typedName || 'Your Signature'}
              </div>
            </div>
          )}

          {/* Color Selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Ink Color:</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {['#000000', '#003366', '#0071e3', '#ff3b30'].map(c => (
                <div
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', background: c,
                    cursor: 'pointer', border: color === c ? '2px solid var(--accent)' : '2px solid transparent',
                    boxShadow: color === c ? '0 0 0 2px var(--bg-color)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: 10, borderTop: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
        }}>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={tab === 'draw' && !hasDrawn}
            style={{ gap: 6 }}
          >
            <Check size={16} /> Save & Apply Signature
          </button>
        </div>
      </motion.div>
    </div>
  );
}
