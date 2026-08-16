import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Image, UploadCloud, Trash2, ArrowUp, ArrowDown, Download, X, CheckCircle } from 'lucide-react';
import { convertImagesToPDF, downloadFile } from '../../utils/pdfEngine';

export default function ImagesToPDFTool({ onClose }) {
  const [images, setImages] = useState([]); // [{ file, previewUrl, id }]
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleImagesAdded = (e) => {
    const selected = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (selected.length > 0) {
      const mapped = selected.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
        id: `img-${Date.now()}-${Math.random()}`,
      }));
      setImages(prev => [...prev, ...mapped]);
    }
  };

  const removeImage = (index) => {
    setImages(prev => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].previewUrl);
      return copy.filter((_, i) => i !== index);
    });
  };

  const moveImage = (index, direction) => {
    setImages(prev => {
      const copy = [...prev];
      const target = index + direction;
      if (target < 0 || target >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const handleConvert = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    try {
      const pdfBytes = await convertImagesToPDF(images);
      downloadFile(pdfBytes, 'converted_images.pdf');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to convert images to PDF.');
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
          width: '100%', maxWidth: 680, maxHeight: '90vh',
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
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(52, 199, 89, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34c759' }}>
              <Image size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Images to PDF Converter</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Convert JPG, PNG, and WebP images into a clean multi-page PDF</p>
            </div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: 6 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '28px 16px', borderRadius: 14,
              border: '2px dashed var(--glass-border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', background: 'var(--glass-bg)', marginBottom: 20,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              multiple
              style={{ display: 'none' }}
              onChange={handleImagesAdded}
            />
            <UploadCloud size={36} color="#34c759" />
            <span style={{ fontSize: 14, fontWeight: 500, marginTop: 8 }}>Click or drop photos & images</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Supports PNG, JPG, JPEG</span>
          </div>

          {/* Image grid */}
          {images.length > 0 && (
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Images ({images.length})
              </span>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: 12, marginTop: 10,
              }}>
                {images.map((item, idx) => (
                  <div
                    key={item.id}
                    className="glass-panel"
                    style={{
                      padding: 6, borderRadius: 10,
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                    }}
                  >
                    <div style={{
                      width: '100%', height: 110, borderRadius: 6,
                      overflow: 'hidden', background: '#000', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <img
                        src={item.previewUrl}
                        alt="preview"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', marginTop: 6,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        #{idx + 1}
                      </span>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button
                          className="btn"
                          disabled={idx === 0}
                          onClick={() => moveImage(idx, -1)}
                          style={{ padding: 2, opacity: idx === 0 ? 0.3 : 1 }}
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          className="btn"
                          disabled={idx === images.length - 1}
                          onClick={() => moveImage(idx, 1)}
                          style={{ padding: 2, opacity: idx === images.length - 1 ? 0.3 : 1 }}
                        >
                          <ArrowDown size={12} />
                        </button>
                        <button
                          className="btn"
                          onClick={() => removeImage(idx)}
                          style={{ padding: 2, color: '#ff3b30' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {images.length} image{images.length === 1 ? '' : 's'} queued
          </span>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={images.length === 0 || isProcessing}
              onClick={handleConvert}
              style={{ gap: 6, opacity: images.length === 0 ? 0.5 : 1 }}
            >
              {success ? <CheckCircle size={16} /> : <Download size={16} />}
              {isProcessing ? 'Converting…' : success ? 'Converted & Saved!' : 'Convert to PDF'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
