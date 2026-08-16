import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stamp, UploadCloud, Download, X, CheckCircle, Type,
  FileImage, Palette, RotateCw, Grid, Layers, Eye, Sparkles, Check
} from 'lucide-react';
import { addWatermarkToPDF, tintPDFBackground, downloadFile } from '../../utils/pdfEngine';

const PRESET_WATERMARKS = [
  'CONFIDENTIAL', 'DRAFT', 'TOP SECRET', 'APPROVED',
  'DO NOT COPY', 'SAMPLE', 'INTERNAL USE ONLY'
];

const PRESET_COLORS = [
  { hex: '#d90429', name: 'Confidential Red' },
  { hex: '#990000', name: 'Crimson' },
  { hex: '#0a2540', name: 'Midnight Navy' },
  { hex: '#0055ff', name: 'Royal Blue' },
  { hex: '#0f766e', name: 'Forest Emerald' },
  { hex: '#475569', name: 'Slate Gray' },
  { hex: '#d97706', name: 'Amber Gold' },
  { hex: '#6b21a8', name: 'Imperial Violet' },
];

const FONT_OPTIONS = [
  { id: 'helvetica-bold', label: 'Helvetica Bold (Clean Sans)' },
  { id: 'helvetica', label: 'Helvetica Normal' },
  { id: 'times-bold', label: 'Times Roman Bold (Formal Serif)' },
  { id: 'times', label: 'Times Roman Normal' },
  { id: 'courier-bold', label: 'Courier Bold (Monospace)' },
  { id: 'courier', label: 'Courier Normal' },
];

const TINT_PRESETS = [
  { id: 'sepia', label: 'Warm Sepia', hex: '#fbf0d9', bg: '#fbf0d9', desc: 'Classic novel reading tone' },
  { id: 'mint', label: 'Soft Mint', hex: '#e8f5e9', bg: '#e8f5e9', desc: 'Reduces visual fatigue' },
  { id: 'rose', label: 'Gentle Rose', hex: '#ffebee', bg: '#ffebee', desc: 'Warm evening comfort' },
  { id: 'parchment', label: 'Parchment Ivory', hex: '#fefae0', bg: '#fefae0', desc: 'Classic archival paper' },
  { id: 'lavender', label: 'Lavender Mist', hex: '#f3e8ff', bg: '#f3e8ff', desc: 'Calming blue-purple' },
  { id: 'ocean', label: 'Cool Slate', hex: '#e0f2fe', bg: '#e0f2fe', desc: 'Modern high-contrast tint' },
];

export default function WatermarkTool({ initialFile, onClose, onUpdateDocument }) {
  const [file, setFile] = useState(initialFile || null);
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'image' | 'tint'

  // Text Watermark State
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontFamily, setFontFamily] = useState('helvetica-bold');
  const [opacity, setOpacity] = useState(0.32);
  const [size, setSize] = useState(48);
  const [rotation, setRotation] = useState(-45);
  const [color, setColor] = useState('#d90429');
  const [hexInput, setHexInput] = useState('#d90429');
  const [layout, setLayout] = useState('diagonal'); // 'diagonal' | 'tile'

  // Image Watermark State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageOpacity, setImageOpacity] = useState(0.35);
  const [imageScale, setImageScale] = useState(50);
  const [imageRotation, setImageRotation] = useState(0);
  const [imageLayout, setImageLayout] = useState('diagonal'); // 'diagonal' | 'tile'
  const imgInputRef = useRef(null);

  // Background Tint State
  const [tintColor, setTintColor] = useState('#fbf0d9');
  const [tintOpacity, setTintOpacity] = useState(0.18);

  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

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

  const handleImageUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const processWatermark = async (action = 'apply') => {
    if (!file) return;
    setIsProcessing(true);
    try {
      let outputBytes;

      if (activeTab === 'tint') {
        outputBytes = await tintPDFBackground(file, {
          color: tintColor,
          opacity: tintOpacity,
        });
      } else if (activeTab === 'image') {
        if (!imageFile) {
          alert('Please select an image file for the watermark.');
          setIsProcessing(false);
          return;
        }
        const imgBuffer = await imageFile.arrayBuffer();
        outputBytes = await addWatermarkToPDF(file, {
          mode: 'image',
          imageBuffer: imgBuffer,
          imageType: imageFile.type,
          opacity: imageOpacity,
          size: imageScale,
          rotation: imageRotation,
          layout: imageLayout,
        });
      } else {
        // Text Watermark
        if (!text.trim()) {
          alert('Please enter watermark text.');
          setIsProcessing(false);
          return;
        }
        outputBytes = await addWatermarkToPDF(file, {
          mode: 'text',
          text: text.trim(),
          fontFamily,
          opacity,
          size,
          rotation,
          color,
          layout,
        });
      }

      if (action === 'download') {
        downloadFile(outputBytes, `watermarked_${file.name || 'document.pdf'}`);
        setSuccessMsg('PDF Downloaded successfully!');
      } else {
        // Apply directly to active document in-place
        const newFile = new File([outputBytes], file.name || 'document.pdf', {
          type: 'application/pdf',
          lastModified: Date.now(),
        });
        if (onUpdateDocument) {
          onUpdateDocument(newFile);
          setSuccessMsg('Applied directly to current document!');
          setTimeout(() => onClose(), 800);
        } else {
          // Fallback if standalone
          downloadFile(outputBytes, `watermarked_${file.name || 'document.pdf'}`);
          setSuccessMsg('Saved & Downloaded!');
        }
      }
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Error processing document: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
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
          width: '100%', maxWidth: 620, maxHeight: '92vh',
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
              width: 38, height: 38, borderRadius: 11,
              background: 'rgba(255, 149, 0, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ff9500',
            }}>
              <Stamp size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 600 }}>Watermark & Page Tint Studio</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Apply direct text stamps, image watermarks, or eye-comfort page shades</p>
            </div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: 6 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'flex', padding: '8px 22px 0', gap: 6,
          borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
        }}>
          {[
            { id: 'text', label: 'Text Watermark', icon: Type },
            { id: 'image', label: 'Image / Logo Watermark', icon: FileImage },
            { id: 'tint', label: 'Page Background Tint', icon: Eye },
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
        <div style={{ padding: 22, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── TAB 1: TEXT WATERMARK ── */}
          {activeTab === 'text' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Text Input & Presets */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Watermark Text
                </label>
                <input
                  type="text"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Enter watermark text…"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                  }}
                />
                {/* Preset Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {PRESET_WATERMARKS.map(p => (
                    <button
                      key={p}
                      className="btn"
                      onClick={() => setText(p)}
                      style={{
                        padding: '3px 8px', fontSize: 11, borderRadius: 6,
                        background: text === p ? 'var(--accent)' : 'var(--glass-bg)',
                        color: text === p ? 'var(--bg-color)' : 'var(--text-secondary)',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font & Layout Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Font Typeface
                  </label>
                  <select
                    value={fontFamily}
                    onChange={e => setFontFamily(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                      color: 'var(--text-primary)', fontSize: 12, outline: 'none',
                    }}
                  >
                    {FONT_OPTIONS.map(f => (
                      <option key={f.id} value={f.id} style={{ background: 'var(--bg-color)' }}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Watermark Layout
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn"
                      onClick={() => setLayout('diagonal')}
                      style={{
                        flex: 1, padding: '7px 8px', fontSize: 11,
                        background: layout === 'diagonal' ? 'var(--accent)' : 'var(--glass-bg)',
                        color: layout === 'diagonal' ? 'var(--bg-color)' : 'var(--text-primary)',
                      }}
                    >
                      Diagonal Center
                    </button>
                    <button
                      className="btn"
                      onClick={() => setLayout('tile')}
                      style={{
                        flex: 1, padding: '7px 8px', fontSize: 11,
                        background: layout === 'tile' ? 'var(--accent)' : 'var(--glass-bg)',
                        color: layout === 'tile' ? 'var(--bg-color)' : 'var(--text-primary)',
                      }}
                    >
                      Repeating Grid
                    </button>
                  </div>
                </div>
              </div>

              {/* Controls: Opacity, Size & Rotation */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, background: 'var(--glass-bg)', padding: 14, borderRadius: 12, border: '1px solid var(--glass-border)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <span>Opacity</span>
                    <span>{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.08"
                    max="0.80"
                    step="0.02"
                    value={opacity}
                    onChange={e => setOpacity(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <span>Font Size</span>
                    <span>{size}pt</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="96"
                    step="4"
                    value={size}
                    onChange={e => setSize(parseInt(e.target.value, 10))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <span>Rotation</span>
                    <span>{rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    step="5"
                    value={rotation}
                    onChange={e => setRotation(parseInt(e.target.value, 10))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Custom Color Palette & Hex */}
              <div style={{
                padding: '10px 12px', borderRadius: 12,
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Palette size={15} color="var(--text-secondary)" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Stamp Color:</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {PRESET_COLORS.map(c => (
                      <div
                        key={c.hex}
                        onClick={() => handleColorChange(c.hex)}
                        title={c.name}
                        style={{
                          width: 22, height: 22, borderRadius: '50%', background: c.hex,
                          cursor: 'pointer',
                          border: color.toLowerCase() === c.hex.toLowerCase() ? '2px solid var(--accent)' : '2px solid transparent',
                          boxShadow: color.toLowerCase() === c.hex.toLowerCase() ? '0 0 0 2px var(--bg-color)' : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="color"
                    value={color}
                    onChange={e => handleColorChange(e.target.value)}
                    style={{ width: 26, height: 24, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'transparent' }}
                  />
                  <input
                    type="text"
                    value={hexInput}
                    onChange={handleHexInputChange}
                    placeholder="#d90429"
                    style={{
                      width: 72, padding: '3px 6px', borderRadius: 6,
                      background: 'var(--bg-color)', border: '1px solid var(--glass-border)',
                      color: 'var(--text-primary)', fontSize: 11, fontFamily: 'monospace',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: IMAGE / LOGO WATERMARK ── */}
          {activeTab === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!imagePreview ? (
                <div
                  onClick={() => imgInputRef.current?.click()}
                  style={{
                    padding: '34px 16px', borderRadius: 14,
                    border: '2px dashed var(--glass-border)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', background: 'var(--glass-bg)',
                  }}
                >
                  <input
                    ref={imgInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/svg+xml"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                  />
                  <UploadCloud size={38} color="#ff9500" />
                  <span style={{ fontSize: 14, fontWeight: 500, marginTop: 10 }}>Upload Company Logo or Custom Stamp</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Supports transparent PNG, JPG, WebP</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Image Preview */}
                  <div style={{
                    width: '100%', height: 140, borderRadius: 12,
                    background: '#ffffff', border: '1px solid var(--glass-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden', padding: 12,
                  }}>
                    <img
                      src={imagePreview}
                      alt="Watermark Logo"
                      style={{
                        maxHeight: '100%', maxWidth: '100%', objectFit: 'contain',
                        opacity: imageOpacity, transform: `rotate(${imageRotation}deg)`,
                      }}
                    />
                    <button
                      className="btn"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      style={{ position: 'absolute', top: 8, right: 8, padding: 4 }}
                    >
                      <X size={14} color="#ff3b30" />
                    </button>
                  </div>

                  {/* Image Controls */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, background: 'var(--glass-bg)', padding: 14, borderRadius: 12, border: '1px solid var(--glass-border)' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <span>Opacity</span>
                        <span>{Math.round(imageOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.08"
                        max="0.90"
                        step="0.02"
                        value={imageOpacity}
                        onChange={e => setImageOpacity(parseFloat(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <span>Scale Size</span>
                        <span>{imageScale}%</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="90"
                        step="5"
                        value={imageScale}
                        onChange={e => setImageScale(parseInt(e.target.value, 10))}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <span>Rotation</span>
                        <span>{imageRotation}°</span>
                      </div>
                      <input
                        type="range"
                        min="-90"
                        max="90"
                        step="5"
                        value={imageRotation}
                        onChange={e => setImageRotation(parseInt(e.target.value, 10))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  {/* Image Layout */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Layout:</span>
                    <button
                      className="btn"
                      onClick={() => setImageLayout('diagonal')}
                      style={{
                        padding: '5px 12px', fontSize: 11,
                        background: imageLayout === 'diagonal' ? 'var(--accent)' : 'var(--glass-bg)',
                        color: imageLayout === 'diagonal' ? 'var(--bg-color)' : 'var(--text-primary)',
                      }}
                    >
                      Center Stamp
                    </button>
                    <button
                      className="btn"
                      onClick={() => setImageLayout('tile')}
                      style={{
                        padding: '5px 12px', fontSize: 11,
                        background: imageLayout === 'tile' ? 'var(--accent)' : 'var(--glass-bg)',
                        color: imageLayout === 'tile' ? 'var(--bg-color)' : 'var(--text-primary)',
                      }}
                    >
                      Repeating Pattern
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: PAGE BACKGROUND TINT (Eye-Care Reading Shader) ── */}
          {activeTab === 'tint' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                  Select Eye-Comfort Paper Tint:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {TINT_PRESETS.map(t => {
                    const isSelected = tintColor === t.hex;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setTintColor(t.hex)}
                        style={{
                          padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                          background: t.bg, border: isSelected ? '2px solid #ff9500' : '1px solid rgba(0,0,0,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          boxShadow: isSelected ? '0 0 0 2px rgba(255,149,0,0.3)' : 'none',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', display: 'block' }}>
                            {t.label}
                          </span>
                          <span style={{ fontSize: 10, color: '#4b5563' }}>
                            {t.desc}
                          </span>
                        </div>
                        {isSelected && <Check size={16} color="#ff9500" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tint Intensity Slider */}
              <div style={{ background: 'var(--glass-bg)', padding: 14, borderRadius: 12, border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  <span>Tint Density / Intensity</span>
                  <span>{Math.round(tintOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.08"
                  max="0.45"
                  step="0.02"
                  value={tintOpacity}
                  onChange={e => setTintOpacity(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
                  Shades white document backgrounds for comfortable, glare-free reading in dim or bright environments.
                </p>
              </div>
            </div>
          )}

          {/* Feedback message */}
          {successMsg && (
            <div style={{
              padding: '8px 12px', borderRadius: 8, background: 'rgba(52, 199, 89, 0.15)',
              color: '#34c759', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <CheckCircle size={14} /> {successMsg}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
        }}>
          <button className="btn" onClick={onClose} disabled={isProcessing}>
            Cancel
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            {/* Optional Download Copy */}
            <button
              className="btn"
              onClick={() => processWatermark('download')}
              disabled={isProcessing || !file || (activeTab === 'image' && !imageFile)}
              style={{ gap: 6 }}
              title="Save as a separate downloaded file"
            >
              <Download size={15} /> Download Copy
            </button>

            {/* Direct in-place Apply */}
            <button
              className="btn btn-primary"
              onClick={() => processWatermark('apply')}
              disabled={isProcessing || !file || (activeTab === 'image' && !imageFile)}
              style={{ gap: 6 }}
            >
              <Check size={16} />
              {isProcessing ? 'Processing…' : 'Apply Directly to Document'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
