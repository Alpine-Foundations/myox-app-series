import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Document } from 'react-pdf';
import { FileImage, UploadCloud, Download, X, CheckCircle, Archive } from 'lucide-react';
import { exportPDFToImagesZip, downloadFile } from '../../utils/pdfEngine';

export default function PDFToImagesTool({ initialFile, onClose }) {
  const [file, setFile] = useState(initialFile || null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [format, setFormat] = useState('image/png');
  const [quality, setQuality] = useState(2.0); // 2x DPI for crisp text
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    if (!pdfDoc) return;
    setIsProcessing(true);
    try {
      const zipBlob = await exportPDFToImagesZip(pdfDoc, {
        dpiScale: quality,
        format,
      });
      const ext = format === 'image/jpeg' ? 'jpg' : 'png';
      downloadFile(zipBlob, `${(file?.name || 'document').replace('.pdf', '')}_${ext}_images.zip`, 'application/zip');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to export images. Please try again.');
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
        style={{ maxWidth: 520 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(48, 176, 199, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#30b0c7', flexShrink: 0 }}>
              <FileImage size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>PDF to High-Res Images</h3>
              <p style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>Extract all pages as crisp PNG or JPG files in a ZIP archive</p>
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
              <UploadCloud size={32} color="#30b0c7" />
              <span style={{ fontSize: 13.5, fontWeight: 600, marginTop: 10 }}>Select a PDF Document</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Click to browse or drop file</span>
            </div>
          ) : (
            <>
              <Document file={file} onLoadSuccess={(doc) => setPdfDoc(doc)}>
                <div style={{
                  padding: '12px 14px', borderRadius: 12,
                  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                    <Archive size={18} color="var(--accent)" />
                    <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.name}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
                    {pdfDoc?.numPages || '…'} pages
                  </span>
                </div>
              </Document>

              {/* Format Choice */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Image Format
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    className="btn"
                    onClick={() => setFormat('image/png')}
                    style={{
                      padding: '8px 10px', fontSize: 12, borderRadius: 8,
                      background: format === 'image/png' ? 'var(--accent)' : 'var(--glass-bg)',
                      color: format === 'image/png' ? 'var(--bg-color)' : 'var(--text-primary)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    PNG (Lossless & Sharp)
                  </button>
                  <button
                    className="btn"
                    onClick={() => setFormat('image/jpeg')}
                    style={{
                      padding: '8px 10px', fontSize: 12, borderRadius: 8,
                      background: format === 'image/jpeg' ? 'var(--accent)' : 'var(--glass-bg)',
                      color: format === 'image/jpeg' ? 'var(--bg-color)' : 'var(--text-primary)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    JPG (Smaller File Size)
                  </button>
                </div>
              </div>

              {/* Resolution Choice */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Resolution / DPI Scale
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { val: 1.5, label: '1.5x' },
                    { val: 2.0, label: '2x DPI' },
                    { val: 3.0, label: '3x HD' },
                  ].map(q => (
                    <button
                      key={q.val}
                      className="btn"
                      onClick={() => setQuality(q.val)}
                      style={{
                        padding: '8px 10px', fontSize: 12, borderRadius: 8,
                        background: quality === q.val ? 'var(--accent)' : 'var(--glass-bg)',
                        color: quality === q.val ? 'var(--bg-color)' : 'var(--text-primary)',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {file && (
          <div className="modal-footer">
            <span className="desktop-only" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Ready to generate ZIP
            </span>

            <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={onClose} style={{ flex: 'none' }}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!pdfDoc || isProcessing}
                onClick={handleExport}
                style={{ gap: 6 }}
              >
                {success ? <CheckCircle size={15} /> : <Download size={15} />}
                {isProcessing ? 'Rendering ZIP…' : success ? 'Downloaded ZIP!' : 'Convert & Download ZIP'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
