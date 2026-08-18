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
    <div className="modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="modal-card glass-panel"
        style={{ maxWidth: 500 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255, 149, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff9500', flexShrink: 0 }}>
              <ShieldAlert size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>Sanitize & Strip Metadata</h3>
              <p style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>Remove private tracking, author info, and revision histories</p>
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
              <UploadCloud size={32} color="#ff9500" />
              <span style={{ fontSize: 13.5, fontWeight: 600, marginTop: 10 }}>Select a PDF Document</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Click to browse or drop file</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                padding: '14px', borderRadius: 12, background: 'rgba(255, 149, 0, 0.08)',
                border: '1px solid rgba(255, 149, 0, 0.2)', display: 'flex', gap: 12,
              }}>
                <Lock size={18} color="#ff9500" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.45 }}>
                  <strong>What gets cleaned?</strong>
                  <ul style={{ paddingLeft: 16, marginTop: 6, fontSize: 11.5, color: 'var(--text-secondary)' }}>
                    <li>Author names, user profiles, and organization metadata</li>
                    <li>Software producer and creation application headers</li>
                    <li>Creation timestamps and modification revision history</li>
                    <li>Hidden XML metadata properties</li>
                  </ul>
                </div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Document: <strong>{file.name}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {file && (
          <div className="modal-footer">
            <span className="desktop-only" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              100% Private local processing
            </span>

            <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={onClose} style={{ flex: 'none' }}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={isProcessing}
                onClick={handleSanitize}
                style={{ gap: 6 }}
              >
                {success ? <CheckCircle size={15} /> : <Download size={15} />}
                {isProcessing ? 'Sanitizing…' : success ? 'Sanitized & Saved!' : 'Sanitize & Download PDF'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
