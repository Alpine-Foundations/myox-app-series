import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenTool, Type, Stamp, UploadCloud, Trash2, Check, X, RotateCw,
  Sparkles, Sliders, Palette, FileImage, ShieldCheck, Undo2, Crop, Circle, Square
} from 'lucide-react';

const GOOGLE_SIGNATURE_FONTS = [
  { id: 'Dancing Script', name: 'Dancing Script', family: "'Dancing Script', cursive", style: 'Modern & Flowing' },
  { id: 'Great Vibes', name: 'Great Vibes', family: "'Great Vibes', cursive", style: 'Classic Calligraphy' },
  { id: 'Caveat', name: 'Caveat', family: "'Caveat', cursive", style: 'Natural Handwritten' },
  { id: 'Alex Brush', name: 'Alex Brush', family: "'Alex Brush', cursive", style: 'Fluid Signature' },
  { id: 'Sacramento', name: 'Sacramento', family: "'Sacramento', cursive", style: 'Fine Monoline' },
  { id: 'Allura', name: 'Allura', family: "'Allura', cursive", style: 'Graceful & Elegant' },
  { id: 'Parisienne', name: 'Parisienne', family: "'Parisienne', cursive", style: 'Vintage Parisian' },
  { id: 'MonteCarlo', name: 'MonteCarlo', family: "'MonteCarlo', cursive", style: 'Formal Monogram' },
];

const PRESET_COLORS = [
  { hex: '#000000', name: 'Executive Black' },
  { hex: '#0a2540', name: 'Midnight Navy' },
  { hex: '#0055ff', name: 'Royal Blue' },
  { hex: '#d90429', name: 'Official Red' },
  { hex: '#0f766e', name: 'Forest Emerald' },
  { hex: '#6b21a8', name: 'Imperial Violet' },
];

const UNDERLINE_STYLES = [
  { id: 'none', label: 'None' },
  { id: 'solid', label: 'Solid' },
  { id: 'swash', label: 'Swash / Flourish' },
  { id: 'double', label: 'Double' },
  { id: 'dashed', label: 'Dashed' },
];

const CROP_FRAMES = [
  { id: 'none', label: 'Full Image', icon: Crop },
  { id: 'circle', label: 'Circular Seal', icon: Circle },
  { id: 'oval', label: 'Oval Stamp', icon: Circle },
  { id: 'rect', label: 'Rectangle Box', icon: Square },
];

export default function SignatureModal({ onSaveSignature, onClose }) {
  const [activeTab, setActiveTab] = useState('draw'); // 'draw' | 'type' | 'stamp'

  // Ink Color & Hex
  const [color, setColor] = useState('#000000');
  const [hexInput, setHexInput] = useState('#000000');

  // Draw State
  const [strokeWidth, setStrokeWidth] = useState(3.2);
  const [strokes, setStrokes] = useState([]); // [[{x, y}], ...]
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Type Signature State (Extra Large Prominent Font Size)
  const [typedName, setTypedName] = useState('Alexander Wright');
  const [selectedFont, setSelectedFont] = useState(GOOGLE_SIGNATURE_FONTS[0].id);
  const [fontSize, setFontSize] = useState(68);
  const [angle, setAngle] = useState(-3); // -30 to +30 deg
  const [underlineStyle, setUnderlineStyle] = useState('swash');

  // Stamp / Image Seal State & Frame Crop
  const [stampImage, setStampImage] = useState(null); // Image object or dataUrl
  const [removeBg, setRemoveBg] = useState(true);
  const [stampOpacity, setStampOpacity] = useState(1.0);
  const [stampColorMode, setStampColorMode] = useState('original'); // 'original' | 'ink'
  const [cropFrame, setCropFrame] = useState('none'); // 'none' | 'circle' | 'oval' | 'rect'
  const [cropScale, setCropScale] = useState(85); // 20 - 100%
  const [cropOffsetX, setCropOffsetX] = useState(0); // -50 to +50
  const [cropOffsetY, setCropOffsetY] = useState(0); // -50 to +50
  const stampInputRef = useRef(null);

  // Sync color with hexInput
  const handleColorChange = (newHex) => {
    setColor(newHex);
    setHexInput(newHex);
  };

  const handleHexInputChange = (e) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      setColor(val);
    }
  };

  // ── Draw Canvas Setup & History ──────────────────────────────────────────────
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokes.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });
  }, [strokes, color, strokeWidth]);

  useEffect(() => {
    if (activeTab === 'draw') {
      redrawCanvas();
    }
  }, [activeTab, redrawCanvas]);

  const startDrawing = (e) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX || e.touches?.[0]?.clientX) - rect.left) * (canvas.width / rect.width);
    const y = ((e.clientY || e.touches?.[0]?.clientY) - rect.top) * (canvas.height / rect.height);
    setStrokes(prev => [...prev, [{ x, y }]]);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX || e.touches?.[0]?.clientX) - rect.left) * (canvas.width / rect.width);
    const y = ((e.clientY || e.touches?.[0]?.clientY) - rect.top) * (canvas.height / rect.height);

    setStrokes(prev => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last) {
        copy[copy.length - 1] = [...last, { x, y }];
      }
      return copy;
    });
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const undoLastStroke = () => {
    setStrokes(prev => prev.slice(0, -1));
  };

  const clearDraw = () => {
    setStrokes([]);
  };

  // ── Stamp Image Upload & Background Removal ──────────────────────────────────
  const handleStampUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        setStampImage({ img, src: event.target.result, name: file.name });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // ── Generate Final Signature Image (High-Resolution Transparent PNG) ─────────
  const handleApplySignature = () => {
    const outCanvas = document.createElement('canvas');

    if (activeTab === 'draw') {
      if (strokes.length === 0) return;
      const srcCanvas = canvasRef.current;
      outCanvas.width = srcCanvas.width * 2;
      outCanvas.height = srcCanvas.height * 2;
      const ctx = outCanvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.drawImage(srcCanvas, 0, 0);
      onSaveSignature(outCanvas.toDataURL('image/png'));
    } else if (activeTab === 'type') {
      if (!typedName.trim()) return;
      outCanvas.width = 900;
      outCanvas.height = 360;
      const ctx = outCanvas.getContext('2d');

      ctx.save();
      ctx.translate(outCanvas.width / 2, outCanvas.height / 2);
      ctx.rotate((angle * Math.PI) / 180);

      const fontObj = GOOGLE_SIGNATURE_FONTS.find(f => f.id === selectedFont) || GOOGLE_SIGNATURE_FONTS[0];
      ctx.font = `italic ${fontSize * 1.5}px ${fontObj.family}`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillText(typedName, 0, -10);

      // Measure text for underline
      const textMetrics = ctx.measureText(typedName);
      const textW = textMetrics.width;
      const baseY = fontSize * 0.55;

      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(3, fontSize * 0.05);

      if (underlineStyle === 'solid') {
        ctx.beginPath();
        ctx.moveTo(-textW / 2 - 12, baseY);
        ctx.lineTo(textW / 2 + 12, baseY);
        ctx.stroke();
      } else if (underlineStyle === 'double') {
        ctx.beginPath();
        ctx.moveTo(-textW / 2 - 12, baseY - 4);
        ctx.lineTo(textW / 2 + 12, baseY - 4);
        ctx.moveTo(-textW / 2 - 12, baseY + 4);
        ctx.lineTo(textW / 2 + 12, baseY + 4);
        ctx.stroke();
      } else if (underlineStyle === 'dashed') {
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(-textW / 2 - 12, baseY);
        ctx.lineTo(textW / 2 + 12, baseY);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (underlineStyle === 'swash') {
        // Artistic signature flourish curve
        ctx.beginPath();
        ctx.moveTo(-textW / 2 - 20, baseY - 6);
        ctx.bezierCurveTo(
          -textW * 0.1, baseY + 18,
          textW * 0.4, baseY - 16,
          textW / 2 + 30, baseY + 10
        );
        ctx.stroke();
      }

      ctx.restore();
      onSaveSignature(outCanvas.toDataURL('image/png'));
    } else if (activeTab === 'stamp') {
      if (!stampImage) return;
      const img = stampImage.img;
      const naturalW = img.naturalWidth || 500;
      const naturalH = img.naturalHeight || 500;

      outCanvas.width = naturalW;
      outCanvas.height = naturalH;
      const ctx = outCanvas.getContext('2d');

      // If a transparent shape frame is selected, apply clipping mask
      if (cropFrame !== 'none') {
        const frameW = (naturalW * (cropScale / 100));
        const frameH = (naturalH * (cropScale / 100));
        const centerX = (naturalW / 2) + (cropOffsetX / 100) * naturalW * 0.3;
        const centerY = (naturalH / 2) + (cropOffsetY / 100) * naturalH * 0.3;

        ctx.save();
        ctx.beginPath();
        if (cropFrame === 'circle') {
          const radius = Math.min(frameW, frameH) / 2;
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        } else if (cropFrame === 'oval') {
          ctx.ellipse(centerX, centerY, frameW / 2, frameH / 2, 0, 0, Math.PI * 2);
        } else if (cropFrame === 'rect') {
          ctx.rect(centerX - frameW / 2, centerY - frameH / 2, frameW, frameH);
        }
        ctx.clip();
      }

      ctx.globalAlpha = stampOpacity;
      ctx.drawImage(img, 0, 0, naturalW, naturalH);

      if (cropFrame !== 'none') {
        ctx.restore();
      }

      if (removeBg || stampColorMode === 'ink') {
        const imgData = ctx.getImageData(0, 0, naturalW, naturalH);
        const data = imgData.data;

        // Parse tint color
        const hex = color.replace('#', '');
        const tr = parseInt(hex.substring(0, 2), 16);
        const tg = parseInt(hex.substring(2, 4), 16);
        const tb = parseInt(hex.substring(4, 6), 16);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;

          // Transparent white background removal
          if (removeBg && brightness > 220) {
            data[i + 3] = 0;
          } else if (stampColorMode === 'ink' && data[i + 3] > 10) {
            data[i] = tr;
            data[i + 1] = tg;
            data[i + 2] = tb;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      onSaveSignature(outCanvas.toDataURL('image/png'));
    }

    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 220,
      background: 'rgba(0, 0, 0, 0.68)', backdropFilter: 'blur(18px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-panel"
        style={{
          width: '100%', maxWidth: 660, maxHeight: '94vh',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-color)', borderRadius: 22,
          border: '1px solid var(--glass-border)', boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--glass-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(175, 82, 222, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#af52de',
            }}>
              <PenTool size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>E-Signature Studio</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Create legal signatures, custom calligraphy, or transparent stamp seals</p>
            </div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: 6 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex', padding: '8px 22px 0', gap: 6,
          borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
        }}>
          {[
            { id: 'draw', label: 'Draw Ink', icon: PenTool },
            { id: 'type', label: 'Type Calligraphy', icon: Type },
            { id: 'stamp', label: 'Stamp & Image Seal', icon: Stamp },
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                className="btn"
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '8px 16px', fontSize: 13, gap: 7,
                  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  borderRadius: 0,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <Icon size={15} color={isActive ? 'var(--accent)' : 'currentColor'} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── TAB 1: DRAW SIGNATURE ── */}
          {activeTab === 'draw' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Draw your natural signature
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn"
                    onClick={undoLastStroke}
                    disabled={strokes.length === 0}
                    style={{ fontSize: 11, padding: '4px 8px', gap: 4 }}
                    title="Undo stroke"
                  >
                    <Undo2 size={12} /> Undo
                  </button>
                  <button
                    className="btn"
                    onClick={clearDraw}
                    disabled={strokes.length === 0}
                    style={{ fontSize: 11, padding: '4px 8px', gap: 4, color: '#ff3b30' }}
                    title="Clear pad"
                  >
                    <Trash2 size={12} /> Clear
                  </button>
                </div>
              </div>

              {/* Drawing Pad Canvas */}
              <div style={{
                width: '100%', height: 210, borderRadius: 14,
                background: '#ffffff', border: '1px solid var(--glass-border)',
                position: 'relative', overflow: 'hidden', cursor: 'crosshair',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <canvas
                  ref={canvasRef}
                  width={560}
                  height={210}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ width: '100%', height: '100%', touchAction: 'none' }}
                />
                {strokes.length === 0 && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#9ca3af', fontSize: 14, pointerEvents: 'none',
                    letterSpacing: '0.02em',
                  }}>
                    Sign here with mouse, pen, or touch…
                  </div>
                )}
              </div>

              {/* Stroke Width Slider */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Pen Thickness</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 160 }}>
                  <input
                    type="range"
                    min="1.5"
                    max="6.5"
                    step="0.5"
                    value={strokeWidth}
                    onChange={e => setStrokeWidth(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                  <span style={{ fontSize: 11, minWidth: 26, color: 'var(--text-secondary)' }}>{strokeWidth}px</span>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: TYPE CALLIGRAPHY (Google Fonts & Customization) ── */}
          {activeTab === 'type' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Name Input */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Full Name or Initials
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={e => setTypedName(e.target.value)}
                  placeholder="Type your name…"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)', fontSize: 15, outline: 'none',
                  }}
                />
              </div>

              {/* Interactive Google Fonts Picker Tiles */}
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                  Google Signature Fonts (Select style)
                </span>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                  gap: 8, maxHeight: 180, overflowY: 'auto', padding: 2,
                }}>
                  {GOOGLE_SIGNATURE_FONTS.map(f => {
                    const isSelected = selectedFont === f.id;
                    return (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFont(f.id)}
                        style={{
                          padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                          background: isSelected ? 'rgba(175, 82, 222, 0.12)' : 'var(--glass-bg)',
                          border: isSelected ? '2px solid #af52de' : '1px solid var(--glass-border)',
                          transition: 'all 0.15s ease',
                          display: 'flex', flexDirection: 'column', gap: 2,
                        }}
                      >
                        <span style={{
                          fontFamily: f.family, fontSize: 20, color: isSelected ? '#af52de' : color,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {typedName || f.name}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                          {f.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Controls: Size, Orientation & Underline */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, background: 'var(--glass-bg)', padding: 14, borderRadius: 14, border: '1px solid var(--glass-border)' }}>
                {/* Font Size */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <span>Font Size (Large)</span>
                    <span>{fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="32"
                    max="120"
                    step="4"
                    value={fontSize}
                    onChange={e => setFontSize(parseInt(e.target.value, 10))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Orientation / Slant Angle */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <span>Orientation Angle</span>
                    <span>{angle}°</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="range"
                      min="-25"
                      max="25"
                      step="1"
                      value={angle}
                      onChange={e => setAngle(parseInt(e.target.value, 10))}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn"
                      onClick={() => setAngle(0)}
                      style={{ padding: '2px 6px', fontSize: 10 }}
                      title="Reset angle to flat"
                    >
                      0°
                    </button>
                  </div>
                </div>

                {/* Underline Style Choices */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Signature Underline Style
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {UNDERLINE_STYLES.map(u => (
                      <button
                        key={u.id}
                        className="btn"
                        onClick={() => setUnderlineStyle(u.id)}
                        style={{
                          padding: '4px 10px', fontSize: 11, borderRadius: 6,
                          background: underlineStyle === u.id ? 'var(--accent)' : 'var(--bg-color)',
                          color: underlineStyle === u.id ? 'var(--bg-color)' : 'var(--text-primary)',
                          border: '1px solid var(--glass-border)',
                        }}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Large Live Calligraphy Preview Box */}
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Live Preview:
                </span>
                <div style={{
                  width: '100%', height: 130, borderRadius: 14,
                  background: '#ffffff', border: '1px solid var(--glass-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                  <div style={{
                    transform: `rotate(${angle}deg)`,
                    transition: 'transform 0.15s ease',
                    textAlign: 'center',
                  }}>
                    <span style={{
                      fontFamily: GOOGLE_SIGNATURE_FONTS.find(f => f.id === selectedFont)?.family || 'cursive',
                      fontSize: fontSize,
                      color: color,
                      lineHeight: 1,
                    }}>
                      {typedName || 'Your Signature'}
                    </span>
                    {underlineStyle === 'solid' && (
                      <div style={{ height: 2.5, background: color, marginTop: 4, width: '105%' }} />
                    )}
                    {underlineStyle === 'double' && (
                      <div style={{ marginTop: 4 }}>
                        <div style={{ height: 2, background: color, width: '105%', marginBottom: 2 }} />
                        <div style={{ height: 2, background: color, width: '105%' }} />
                      </div>
                    )}
                    {underlineStyle === 'dashed' && (
                      <div style={{ height: 2.5, borderBottom: `2.5px dashed ${color}`, marginTop: 4, width: '105%' }} />
                    )}
                    {underlineStyle === 'swash' && (
                      <svg width="120%" height="18" viewBox="0 0 200 18" style={{ marginTop: -2, overflow: 'visible' }}>
                        <path d="M0,4 Q80,20 140,2 Q170,-4 200,12" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: STAMP & IMAGE SIGNATURE ── */}
          {activeTab === 'stamp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!stampImage ? (
                <div
                  onClick={() => stampInputRef.current?.click()}
                  style={{
                    padding: '36px 16px', borderRadius: 14,
                    border: '2px dashed var(--glass-border)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', background: 'var(--glass-bg)',
                  }}
                >
                  <input
                    ref={stampInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/svg+xml, image/tiff, image/bmp"
                    style={{ display: 'none' }}
                    onChange={handleStampUpload}
                  />
                  <UploadCloud size={40} color="#af52de" />
                  <span style={{ fontSize: 14, fontWeight: 500, marginTop: 10 }}>Upload Stamp, Seal or Signature Photo</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Supports PNG, JPG, TIFF, WebP, SVG
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Stamp Preview Canvas with Shape Crop Overlay */}
                  <div style={{
                    width: '100%', height: 180, borderRadius: 14,
                    background: '#ffffff', border: '1px solid var(--glass-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden', padding: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}>
                    <img
                      src={stampImage.src}
                      alt="Stamp Preview"
                      style={{
                        maxHeight: '100%', maxWidth: '100%', objectFit: 'contain',
                        opacity: stampOpacity,
                        filter: stampColorMode === 'ink' ? `drop-shadow(0 0 0 ${color})` : 'none',
                      }}
                    />

                    {/* Draggable/Visual Frame Boundary Overlay */}
                    {cropFrame !== 'none' && (
                      <div style={{
                        position: 'absolute',
                        width: `${cropScale}%`,
                        height: `${cropScale}%`,
                        borderRadius: cropFrame === 'circle' ? '50%' : cropFrame === 'oval' ? '50%' : 10,
                        border: '2px dashed #0071e3',
                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)',
                        pointerEvents: 'none',
                        transform: `translate(${cropOffsetX}px, ${cropOffsetY}px)`,
                      }} />
                    )}

                    <button
                      className="btn"
                      onClick={() => setStampImage(null)}
                      style={{ position: 'absolute', top: 8, right: 8, padding: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 6 }}
                      title="Remove image"
                    >
                      <Trash2 size={13} color="#ff3b30" />
                    </button>
                  </div>

                  {/* Stamp Shape Frames & Crop Controls */}
                  <div style={{ background: 'var(--glass-bg)', padding: 12, borderRadius: 14, border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                        Crop Transparent Shape Frame (Extract only this boundary):
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {CROP_FRAMES.map(f => {
                          const Icon = f.icon;
                          const isSel = cropFrame === f.id;
                          return (
                            <button
                              key={f.id}
                              className="btn"
                              onClick={() => setCropFrame(f.id)}
                              style={{
                                flex: 1, padding: '6px 8px', fontSize: 11, gap: 5,
                                background: isSel ? 'var(--accent)' : 'var(--bg-color)',
                                color: isSel ? 'var(--bg-color)' : 'var(--text-primary)',
                              }}
                            >
                              <Icon size={13} /> {f.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {cropFrame !== 'none' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, paddingTop: 6, borderTop: '1px solid var(--glass-border)' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
                            <span>Frame Size</span>
                            <span>{cropScale}%</span>
                          </div>
                          <input
                            type="range"
                            min="30"
                            max="100"
                            step="2"
                            value={cropScale}
                            onChange={e => setCropScale(parseInt(e.target.value, 10))}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
                            <span>Move X</span>
                            <span>{cropOffsetX}px</span>
                          </div>
                          <input
                            type="range"
                            min="-50"
                            max="50"
                            step="2"
                            value={cropOffsetX}
                            onChange={e => setCropOffsetX(parseInt(e.target.value, 10))}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
                            <span>Move Y</span>
                            <span>{cropOffsetY}px</span>
                          </div>
                          <input
                            type="range"
                            min="-50"
                            max="50"
                            step="2"
                            value={cropOffsetY}
                            onChange={e => setCropOffsetY(parseInt(e.target.value, 10))}
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stamp Controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--glass-bg)', padding: 12, borderRadius: 14, border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={removeBg}
                          onChange={e => setRemoveBg(e.target.checked)}
                          style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                        />
                        <span>Auto-Remove White Background</span>
                      </label>
                      <ShieldCheck size={16} color="#34c759" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--glass-border)' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Color Mode:</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn"
                          onClick={() => setStampColorMode('original')}
                          style={{
                            padding: '4px 10px', fontSize: 11, borderRadius: 6,
                            background: stampColorMode === 'original' ? 'var(--accent)' : 'var(--bg-color)',
                            color: stampColorMode === 'original' ? 'var(--bg-color)' : 'var(--text-primary)',
                            border: '1px solid var(--glass-border)',
                          }}
                        >
                          Original Colors
                        </button>
                        <button
                          className="btn"
                          onClick={() => setStampColorMode('ink')}
                          style={{
                            padding: '4px 10px', fontSize: 11, borderRadius: 6,
                            background: stampColorMode === 'ink' ? 'var(--accent)' : 'var(--bg-color)',
                            color: stampColorMode === 'ink' ? 'var(--bg-color)' : 'var(--text-primary)',
                            border: '1px solid var(--glass-border)',
                          }}
                        >
                          Tint to Selected Ink Color
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Custom Ink Color Palette & Hex Input (Global for all tabs) ── */}
          <div style={{
            padding: '12px 14px', borderRadius: 14,
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
            gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Palette size={16} color="var(--text-secondary)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Ink Color:
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {PRESET_COLORS.map(c => (
                  <div
                    key={c.hex}
                    onClick={() => handleColorChange(c.hex)}
                    title={c.name}
                    style={{
                      width: 24, height: 24, borderRadius: '50%', background: c.hex,
                      cursor: 'pointer',
                      border: color.toLowerCase() === c.hex.toLowerCase() ? '2px solid var(--accent)' : '2px solid transparent',
                      boxShadow: color.toLowerCase() === c.hex.toLowerCase() ? '0 0 0 2px var(--bg-color)' : 'none',
                      transition: 'transform 0.1s ease',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Custom Hex Input & Color Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="color"
                value={color}
                onChange={e => handleColorChange(e.target.value)}
                style={{
                  width: 28, height: 26, borderRadius: 6, border: 'none',
                  cursor: 'pointer', background: 'transparent',
                }}
                title="Open Color Picker"
              />
              <input
                type="text"
                value={hexInput}
                onChange={handleHexInputChange}
                placeholder="#000000"
                style={{
                  width: 78, padding: '4px 6px', borderRadius: 6,
                  background: 'var(--bg-color)', border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)', fontSize: 12, fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            High-definition vector signature ready for stamping
          </span>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleApplySignature}
              disabled={
                (activeTab === 'draw' && strokes.length === 0) ||
                (activeTab === 'type' && !typedName.trim()) ||
                (activeTab === 'stamp' && !stampImage)
              }
              style={{ gap: 6 }}
            >
              <Check size={16} /> Save & Stamp Signature
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
