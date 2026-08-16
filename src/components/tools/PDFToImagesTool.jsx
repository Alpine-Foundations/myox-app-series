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
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(48, 176, 199, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#30b0c7' }}>
              <FileImage size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>PDF to High-Res Images</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Extract all pages as high-resolution PNG/JPG files in a ZIP</p>
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
              <UploadCloud size={36} color="#30b0c7" />
              <span style={{ fontSize: 14, fontWeight: 500, marginTop: 10 }}>Select a PDF Document</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Click to browse or drop file</span>
            </div>
          ) : (
            <>
              <Document file={file} onLoadSuccess={(doc) => setPdfDoc(doc)}>
                <div style={{
                  padding: '12px 14px', borderRadius: 10, background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Archive size={18} color="#30b0c7" />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{file.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {pdfDoc ? `${pdfDoc.numPages} pages detected` : 'Analyzing document…'}
                      </div>
                    </div>
                  </div>
                </div>
              </Document>

              {/* Format selection */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Image Format
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    className="btn"
                    onClick={() => setFormat('image/png')}
                    style={{
                      padding: '8px 12px', fontSize: 13, borderRadius: 8,
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
                      padding: '8px 12px', fontSize: 13, borderRadius: 8,
                      background: format === 'image/jpeg' ? 'var(--accent)' : 'var(--glass-bg)',
                      color: format === 'image/jpeg' ? 'var(--bg-color)' : 'var(--text-primary)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    JPG (Smaller File Size)
                  </button>
                </div>
              </div>

              {/* Quality Resolution scale */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Resolution / DPI Scale
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { val: 1.5, label: 'Standard (1.5x)' },
                    { val: 2.0, label: 'High (2x DPI)' },
                    { val: 3.0, label: 'Ultra (3x HD)' },
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
          <div style={{
            padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Ready to generate ZIP
            </span>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!pdfDoc || isProcessing}
                onClick={handleExport}
                style={{ gap: 6 }}
              >
                {success ? <CheckCircle size={16} /> : <Download size={16} />}
                {isProcessing ? 'Rendering Pages to ZIP…' : success ? 'Downloaded ZIP!' : 'Convert & Download ZIP'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
