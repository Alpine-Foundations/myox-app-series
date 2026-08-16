import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Hash, UploadCloud, Download, X, CheckCircle } from 'lucide-react';
import { addPageNumbersToPDF, downloadFile } from '../../utils/pdfEngine';

export default function PageNumberingTool({ initialFile, onClose }) {
  const [file, setFile] = useState(initialFile || null);
  const [position, setPosition] = useState('bottom-center');
  const [format, setFormat] = useState('page-n-of-total');
  const [startNumber, setStartNumber] = useState(1);
  const [fontSize, setFontSize] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleApply = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const numberedBytes = await addPageNumbersToPDF(file, {
        position,
        format,
        startNumber,
        fontSize,
      });
      downloadFile(numberedBytes, `numbered_${file.name || 'document.pdf'}`);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to add page numbers. Please try again.');
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
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(88, 86, 214, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5856d6' }}>
              <Hash size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Insert Page Numbers</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Add headers, footers, or page numbers across all pages</p>
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
              <UploadCloud size={36} color="#5856d6" />
              <span style={{ fontSize: 14, fontWeight: 500, marginTop: 10 }}>Select a PDF Document</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Click to browse or drop file</span>
            </div>
          ) : (
            <>
              {/* Position selector */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Position
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { id: 'bottom-left', label: 'Bottom Left' },
                    { id: 'bottom-center', label: 'Bottom Center' },
                    { id: 'bottom-right', label: 'Bottom Right' },
                    { id: 'top-left', label: 'Top Left' },
                    { id: 'top-center', label: 'Top Center' },
                    { id: 'top-right', label: 'Top Right' },
                  ].map(pos => (
                    <button
                      key={pos.id}
                      className="btn"
                      onClick={() => setPosition(pos.id)}
                      style={{
                        padding: '8px 10px', fontSize: 12, borderRadius: 8,
                        background: position === pos.id ? 'var(--accent)' : 'var(--glass-bg)',
                        color: position === pos.id ? 'var(--bg-color)' : 'var(--text-primary)',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number Format */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Number Format
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { id: 'page-n-of-total', label: 'Page 1 of 12' },
                    { id: 'page-n', label: 'Page 1' },
                    { id: 'number', label: '1 (Number only)' },
                  ].map(fmt => (
                    <button
                      key={fmt.id}
                      className="btn"
                      onClick={() => setFormat(fmt.id)}
                      style={{
                        padding: '8px 10px', fontSize: 12, borderRadius: 8,
                        background: format === fmt.id ? 'var(--accent)' : 'var(--glass-bg)',
                        color: format === fmt.id ? 'var(--bg-color)' : 'var(--text-primary)',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Number & Font Size */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Start at Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={startNumber}
                    onChange={e => setStartNumber(parseInt(e.target.value, 10) || 1)}
                    style={{
                      width: '100%', padding: '7px 10px', borderRadius: 8,
                      background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                      color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <span>Font Size</span>
                    <span>{fontSize}pt</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="18"
                    step="1"
                    value={fontSize}
                    onChange={e => setFontSize(parseInt(e.target.value, 10))}
                    style={{ width: '100%' }}
                  />
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
                disabled={isProcessing}
                onClick={handleApply}
                style={{ gap: 6 }}
              >
                {success ? <CheckCircle size={16} /> : <Download size={16} />}
                {isProcessing ? 'Inserting…' : success ? 'Numbered & Saved!' : 'Insert & Download PDF'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
