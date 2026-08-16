import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Stamp, UploadCloud, Download, X, CheckCircle } from 'lucide-react';
import { addWatermarkToPDF, downloadFile } from '../../utils/pdfEngine';

export default function WatermarkTool({ initialFile, onClose }) {
  const [file, setFile] = useState(initialFile || null);
  const [text, setText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(0.35);
  const [size, setSize] = useState(48);
  const [rotation, setRotation] = useState(-45);
  const [color, setColor] = useState('#ff3b30');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const presets = ['CONFIDENTIAL', 'DRAFT', 'TOP SECRET', 'APPROVED', 'DO NOT COPY', 'SAMPLE'];

  const handleApply = async () => {
    if (!file || !text.trim()) return;
    setIsProcessing(true);
    try {
      const watermarkedBytes = await addWatermarkToPDF(file, {
        text: text.trim(),
        opacity,
        size,
        rotation,
        color,
      });
      downloadFile(watermarkedBytes, `watermarked_${file.name || 'document.pdf'}`);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to apply watermark. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-panel"
        style={{
          width: '100%', maxWidth: 540,
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
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255, 149, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff9500' }}>
              <Stamp size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Watermark & Stamp PDF</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Add customized diagonal or centered watermarks across all pages</p>
            </div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: 6 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '36px 16px', borderRadius: 14,
                border: '2px dashed var(--glass-border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', background: 'var(--glass-bg)',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
              />
              <UploadCloud size={36} color="#ff9500" />
              <span style={{ fontSize: 14, fontWeight: 500, marginTop: 10 }}>Select a PDF to Watermark</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Click to browse or drop file</span>
            </div>
          ) : (
            <>
              {/* Text Input */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Watermark Text
                </label>
                <input
                  type="text"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="e.g. CONFIDENTIAL"
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 10,
                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                  }}
                />
              </div>

              {/* Quick Presets */}
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Presets:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {presets.map(p => (
                    <button
                      key={p}
                      className="btn"
                      onClick={() => setText(p)}
                      style={{
                        padding: '3px 8px', fontSize: 11, borderRadius: 6,
                        background: text === p ? 'var(--accent)' : 'var(--glass-bg)',
                        color: text === p ? 'var(--bg-color)' : 'var(--text-primary)',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Controls Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <span>Opacity</span>
                    <span>{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={opacity}
                    onChange={e => setOpacity(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <span>Font Size</span>
                    <span>{size}pt</span>
                  </div>
                  <input
                    type="range"
                    min="24"
                    max="96"
                    step="4"
                    value={size}
                    onChange={e => setSize(parseInt(e.target.value, 10))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <span>Rotation</span>
                    <span>{rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    step="15"
                    value={rotation}
                    onChange={e => setRotation(parseInt(e.target.value, 10))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Stamp Color
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      style={{ width: 34, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent' }}
                    />
                    <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{color}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {file && (
          <div style={{
            padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {file.name}
            </span>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!text.trim() || isProcessing}
                onClick={handleApply}
                style={{ gap: 6 }}
              >
                {success ? <CheckCircle size={16} /> : <Download size={16} />}
                {isProcessing ? 'Watermarking…' : success ? 'Watermarked & Saved!' : 'Apply & Download PDF'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
