import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Hash, UploadCloud, Download, X, CheckCircle, Check, Palette, Sparkles } from 'lucide-react';
import { addPageNumbersToPDF, downloadFile } from '../../utils/pdfEngine';

const FORMAT_OPTIONS = [
  { id: 'page-n-of-total', label: 'Page 1 of 12', desc: 'Standard formal' },
  { id: 'page-n', label: 'Page 1', desc: 'Single page prefix' },
  { id: 'number', label: '1', desc: 'Minimal raw number' },
  { id: 'slash', label: '1 / 12', desc: 'Compact fractional' },
  { id: 'dash', label: '— 1 —', desc: 'Classic literary' },
  { id: 'tilde', label: '~ 1 ~', desc: 'Modern styled' },
  { id: 'chapter', label: 'Page • 1', desc: 'Book bullet style' },
  { id: 'roman-upper', label: 'I, II, III…', desc: 'Formal Roman uppercase' },
  { id: 'roman-lower', label: 'i, ii, iii…', desc: 'Preface Roman lowercase' },
  { id: 'doc-ref', label: 'REF-DOC • 001', desc: 'Official numbered doc' },
];

const BADGE_STYLES = [
  { id: 'pill', label: 'Filled Capsule Pill', desc: 'Modern floating solid badge' },
  { id: 'ribbon', label: 'Corner Ribbon Tab', desc: 'Colored vertical accent tag' },
  { id: 'notch', label: 'Legal Underline Notch', desc: 'Executive bottom bar accent' },
  { id: 'ring', label: 'Vintage Seal Ring', desc: 'Dual circular ring badge' },
  { id: 'none', label: 'Clean Text Only', desc: 'Unembellished minimal text' },
];

const BADGE_COLORS = [
  { hex: '#0a2540', name: 'Executive Navy' },
  { hex: '#000000', name: 'Classic Black' },
  { hex: '#0055ff', name: 'Royal Blue' },
  { hex: '#d90429', name: 'Official Red' },
  { hex: '#0f766e', name: 'Forest Emerald' },
  { hex: '#6b21a8', name: 'Imperial Violet' },
  { hex: '#d97706', name: 'Amber Gold' },
];

export default function PageNumberingTool({ initialFile, onClose, onUpdateDocument }) {
  const [file, setFile] = useState(initialFile || null);
  const [position, setPosition] = useState('bottom-center');
  const [format, setFormat] = useState('page-n-of-total');
  const [badgeStyle, setBadgeStyle] = useState('pill');
  const [badgeColor, setBadgeColor] = useState('#0a2540');
  const [hexInput, setHexInput] = useState('#0a2540');
  const [startNumber, setStartNumber] = useState(1);
  const [fontSize, setFontSize] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleColorChange = (newHex) => {
    setBadgeColor(newHex);
    setHexInput(newHex);
  };

  const handleHexChange = (e) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      setBadgeColor(val);
    }
  };

  const handleApply = async (action = 'apply') => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const numberedBytes = await addPageNumbersToPDF(file, {
        position,
        format,
        badgeStyle,
        badgeColor,
        startNumber,
        fontSize,
      });

      if (action === 'download') {
        downloadFile(numberedBytes, `numbered_${file.name || 'document.pdf'}`);
        setSuccessMsg('PDF Downloaded successfully!');
      } else {
        const newFile = new File([numberedBytes], file.name || 'document.pdf', {
          type: 'application/pdf',
          lastModified: Date.now(),
        });
        if (onUpdateDocument) {
          onUpdateDocument(newFile);
          setSuccessMsg('Applied directly to document!');
          setTimeout(() => onClose(), 800);
        } else {
          downloadFile(numberedBytes, `numbered_${file.name || 'document.pdf'}`);
          setSuccessMsg('Saved & Downloaded!');
        }
      }
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to add page numbers: ' + err.message);
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
          width: '100%', maxWidth: 640, maxHeight: '92vh',
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
              background: 'rgba(88, 86, 214, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#5856d6',
            }}>
              <Hash size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 600 }}>Page Numbering & Book Badges</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Add elegant printed book tabs, capsules, and Roman numerals</p>
            </div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: 6 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 22, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              <UploadCloud size={38} color="#5856d6" />
              <span style={{ fontSize: 14, fontWeight: 500, marginTop: 10 }}>Select a PDF Document</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Click to browse or drop file</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Number Format Selector */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Numbering Format
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: 8 }}>
                  {FORMAT_OPTIONS.map(f => {
                    const isSelected = format === f.id;
                    return (
                      <button
                        key={f.id}
                        className="btn"
                        onClick={() => setFormat(f.id)}
                        style={{
                          padding: '8px 10px', fontSize: 12, borderRadius: 8,
                          background: isSelected ? 'var(--accent)' : 'var(--glass-bg)',
                          color: isSelected ? 'var(--bg-color)' : 'var(--text-primary)',
                          border: isSelected ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{f.label}</span>
                        <span style={{ fontSize: 10, opacity: isSelected ? 0.9 : 0.6 }}>{f.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Badge & Tab Embellishment */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Book-Style Cover Badge / Tab Design
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))', gap: 8 }}>
                  {BADGE_STYLES.map(b => {
                    const isSelected = badgeStyle === b.id;
                    return (
                      <button
                        key={b.id}
                        className="btn"
                        onClick={() => setBadgeStyle(b.id)}
                        style={{
                          padding: '8px 10px', fontSize: 11, borderRadius: 8,
                          background: isSelected ? 'rgba(88, 86, 214, 0.15)' : 'var(--glass-bg)',
                          color: isSelected ? '#5856d6' : 'var(--text-primary)',
                          border: isSelected ? '2px solid #5856d6' : '1px solid var(--glass-border)',
                          fontWeight: isSelected ? 600 : 400,
                        }}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Badge Color & Hex Input */}
              {badgeStyle !== 'none' && (
                <div style={{
                  padding: '10px 14px', borderRadius: 12,
                  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                  display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Palette size={15} color="var(--text-secondary)" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Badge Color:</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {BADGE_COLORS.map(c => (
                        <div
                          key={c.hex}
                          onClick={() => handleColorChange(c.hex)}
                          title={c.name}
                          style={{
                            width: 22, height: 22, borderRadius: '50%', background: c.hex,
                            cursor: 'pointer',
                            border: badgeColor.toLowerCase() === c.hex.toLowerCase() ? '2px solid var(--accent)' : '2px solid transparent',
                            boxShadow: badgeColor.toLowerCase() === c.hex.toLowerCase() ? '0 0 0 2px var(--bg-color)' : 'none',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="color"
                      value={badgeColor}
                      onChange={e => handleColorChange(e.target.value)}
                      style={{ width: 26, height: 24, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'transparent' }}
                    />
                    <input
                      type="text"
                      value={hexInput}
                      onChange={handleHexChange}
                      placeholder="#0a2540"
                      style={{
                        width: 72, padding: '3px 6px', borderRadius: 6,
                        background: 'var(--bg-color)', border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)', fontSize: 11, fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Position & Page Start */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Placement Position
                  </label>
                  <select
                    value={position}
                    onChange={e => setPosition(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                      color: 'var(--text-primary)', fontSize: 12, outline: 'none',
                    }}
                  >
                    <option value="bottom-center" style={{ background: 'var(--bg-color)' }}>Bottom Center (Default)</option>
                    <option value="bottom-right" style={{ background: 'var(--bg-color)' }}>Bottom Right</option>
                    <option value="bottom-left" style={{ background: 'var(--bg-color)' }}>Bottom Left</option>
                    <option value="top-right" style={{ background: 'var(--bg-color)' }}>Top Right Header</option>
                    <option value="top-center" style={{ background: 'var(--bg-color)' }}>Top Center Header</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Start Numbering At
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={startNumber}
                    onChange={e => setStartNumber(parseInt(e.target.value, 10) || 1)}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                      color: 'var(--text-primary)', fontSize: 12, outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Feedback */}
              {successMsg && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8, background: 'rgba(52, 199, 89, 0.15)',
                  color: '#34c759', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <CheckCircle size={14} /> {successMsg}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
        }}>
          <button className="btn" onClick={onClose} disabled={isProcessing}>
            Cancel
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn"
              onClick={() => handleApply('download')}
              disabled={isProcessing || !file}
              style={{ gap: 6 }}
              title="Download separate copy"
            >
              <Download size={15} /> Download Copy
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleApply('apply')}
              disabled={isProcessing || !file}
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
