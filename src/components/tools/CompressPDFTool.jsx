import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Minimize2, UploadCloud, Download, X, CheckCircle, Check } from 'lucide-react';
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
    <div className="modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="modal-card glass-panel"
        style={{ maxWidth: 560 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(52, 199, 89, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#34c759', flexShrink: 0,
            }}>
              <Minimize2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>Compress & Optimize PDF</h3>
              <p style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>Shrink file size in browser memory with zero compromise</p>
            </div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: 4 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              <UploadCloud size={32} color="#34c759" />
              <span style={{ fontSize: 13.5, fontWeight: 600, marginTop: 10 }}>Select a PDF Document</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Click to browse or drop file</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Document stats */}
              <div style={{
                padding: '12px 14px', borderRadius: 12,
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>
                  {formatBytes(file.size)}
                </span>
              </div>

              {/* Quality level tiles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {COMPRESSION_TIERS.map(p => {
                  const isSelected = level === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setLevel(p.id)}
                      style={{
                        padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                        background: isSelected ? 'var(--accent-soft)' : 'var(--glass-bg)',
                        border: isSelected ? '2px solid var(--accent)' : '1px solid var(--glass-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, display: 'block' }}>{p.label}</span>
                        <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{p.desc}</span>
                      </div>
                      {isSelected && <Check size={16} color="var(--accent)" />}
                    </div>
                  );
                })}
              </div>

              {/* Result stats banner */}
              {resultStats && (
                <div style={{
                  padding: '10px 14px', borderRadius: 10, background: 'rgba(52, 199, 89, 0.15)',
                  border: '1px solid rgba(52, 199, 89, 0.3)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <CheckCircle size={16} color="#34c759" />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#34c759' }}>
                    Compressed {resultStats.originalSize} → {resultStats.newSize} (Saved {resultStats.savings}%)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose} disabled={isProcessing} style={{ flex: 'none' }}>
              Cancel
            </button>
            <button
              className="btn"
              onClick={() => handleCompress('download')}
              disabled={isProcessing || !file}
              style={{ gap: 5, fontSize: 12 }}
              title="Save as a downloaded copy"
            >
              <Download size={14} /> Download Copy
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleCompress('apply')}
              disabled={isProcessing || !file}
              style={{ gap: 5, fontSize: 12 }}
            >
              <Check size={14} />
              {isProcessing ? 'Compressing…' : 'Apply to Document'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
