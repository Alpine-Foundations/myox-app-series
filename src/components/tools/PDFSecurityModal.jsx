import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, UploadCloud, Download, X, CheckCircle, Lock } from 'lucide-react';
import { sanitizePDFMetadata, downloadFile } from '../../utils/pdfEngine';

export default function PDFSecurityModal({ initialFile, onClose }) {
  const [file, setFile] = useState(initialFile || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleSanitize = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const cleanBytes = await sanitizePDFMetadata(file);
      downloadFile(cleanBytes, `sanitized_${file.name || 'document.pdf'}`);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to sanitize document.');
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
          width: '100%', maxWidth: 500,
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
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Sanitize PDF & Strip Metadata</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Remove private tracking, author info, and revision histories</p>
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
              <span style={{ fontSize: 14, fontWeight: 500, marginTop: 10 }}>Select a PDF Document</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Click to browse or drop file</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                padding: '14px', borderRadius: 12, background: 'rgba(255, 149, 0, 0.08)',
                border: '1px solid rgba(255, 149, 0, 0.2)', display: 'flex', gap: 12,
              }}>
                <Lock size={20} color="#ff9500" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45 }}>
                  <strong>What gets cleaned?</strong>
                  <ul style={{ paddingLeft: 16, marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <li>Author names, user profiles, and organization metadata</li>
                    <li>Software producer and creation application headers</li>
                    <li>Creation timestamps and modification revision history</li>
                    <li>Hidden XML metadata properties</li>
                  </ul>
                </div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
                Document: <strong>{file.name}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {file && (
          <div style={{
            padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              100% Private local processing
            </span>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={isProcessing}
                onClick={handleSanitize}
                style={{ gap: 6 }}
              >
                {success ? <CheckCircle size={16} /> : <ShieldCheck size={16} />}
                {isProcessing ? 'Sanitizing…' : success ? 'Sanitized & Downloaded!' : 'Sanitize & Download PDF'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
