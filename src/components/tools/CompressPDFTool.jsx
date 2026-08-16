import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Minimize2, UploadCloud, Download, X, CheckCircle, Zap, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { compressPDFDocument, downloadFile } from '../../utils/pdfEngine';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

const COMPRESSION_TIERS = [
  {
    id: 'medium',
    label: 'Balanced Compression (Recommended)',
    desc: 'Reduces size by ~50-70% with crisp text and clean graphics',
    badge: 'Best Value',
    color: '#0071e3',
  },
  {
    id: 'low',
    label: 'Light Compression (Maximum Quality)',
    desc: 'Reduces size by ~25-40% preserving ultra-high definition details',
    badge: 'High Res',
    color: '#34c759',
  },
  {
    id: 'high',
    label: 'Extreme Compression (Smallest File)',
    desc: 'Reduces size by ~75-90% for strict email & portal upload limits',
    badge: 'Max Shrink',
    color: '#ff9500',
  },
];

export default function CompressPDFTool({ initialFile, onClose, onUpdateDocument }) {
  const [file, setFile] = useState(initialFile || null);
  const [level, setLevel] = useState('medium');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultStats, setResultStats] = useState(null); // { originalSize, newSize, savings }
  const fileInputRef = useRef(null);

  const handleCompress = async (action = 'apply') => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const originalSize = file.size;
      const compressedBytes = await compressPDFDocument(file, { qualityLevel: level });
      const newSize = compressedBytes.byteLength;
      const savings = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

      setResultStats({
        originalSize: formatBytes(originalSize),
        newSize: formatBytes(newSize),
        savings,
      });

      if (action === 'download') {
        downloadFile(compressedBytes, `compressed_${file.name || 'document.pdf'}`);
      } else {
        const newFile = new File([compressedBytes], file.name || 'document.pdf', {
          type: 'application/pdf',
          lastModified: Date.now(),
        });
        if (onUpdateDocument) {
          onUpdateDocument(newFile);
          setTimeout(() => onClose(), 1200);
        } else {
          downloadFile(compressedBytes, `compressed_${file.name || 'document.pdf'}`);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error compressing PDF: ' + err.message);
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
          width: '100%', maxWidth: 560, maxHeight: '92vh',
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
              background: 'rgba(52, 199, 89, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#34c759',
            }}>
              <Minimize2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 600 }}>Compress & Optimize PDF</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Shrink file size in browser memory with zero quality compromise</p>
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
              <UploadCloud size={38} color="#34c759" />
              <span style={{ fontSize: 14, fontWeight: 500, marginTop: 10 }}>Select PDF to Compress</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Click to browse or drop file</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* File details card */}
              <div style={{
                padding: '12px 16px', borderRadius: 12,
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, display: 'block' }}>{file.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Current Size: {formatBytes(file.size)}</span>
                </div>
                <Zap size={20} color="#34c759" />
              </div>

              {/* Compression Tiers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Select Compression Strength:
                </span>
                {COMPRESSION_TIERS.map(t => {
                  const isSelected = level === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setLevel(t.id)}
                      style={{
                        padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                        background: isSelected ? 'rgba(52, 199, 89, 0.12)' : 'var(--glass-bg)',
                        border: isSelected ? '2px solid #34c759' : '1px solid var(--glass-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#34c759' : 'var(--text-primary)' }}>
                            {t.label}
                          </span>
                          <span style={{
                            fontSize: 10, padding: '2px 6px', borderRadius: 10,
                            background: isSelected ? '#34c759' : 'var(--glass-border)',
                            color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                            fontWeight: 600,
                          }}>
                            {t.badge}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, display: 'block' }}>
                          {t.desc}
                        </span>
                      </div>
                      {isSelected && <Check size={18} color="#34c759" />}
                    </div>
                  );
                })}
              </div>

              {/* Result Stats Banner */}
              {resultStats && (
                <div style={{
                  padding: '12px 16px', borderRadius: 12, background: 'rgba(52, 199, 89, 0.15)',
                  border: '1px solid rgba(52, 199, 89, 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={18} color="#34c759" />
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#34c759' }}>
                        Compressed from {resultStats.originalSize} → {resultStats.newSize}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block' }}>
                        Saved {resultStats.savings}% of storage space
                      </span>
                    </div>
                  </div>
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
              onClick={() => handleCompress('download')}
              disabled={isProcessing || !file}
              style={{ gap: 6 }}
              title="Save as a downloaded copy"
            >
              <Download size={15} /> Download Copy
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleCompress('apply')}
              disabled={isProcessing || !file}
              style={{ gap: 6 }}
            >
              <Check size={16} />
              {isProcessing ? 'Compressing in browser…' : 'Apply to Current Document'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
