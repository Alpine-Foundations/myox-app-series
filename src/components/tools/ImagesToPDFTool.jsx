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
    <div className="modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="modal-card glass-panel"
        style={{ maxWidth: 680 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(52, 199, 89, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34c759', flexShrink: 0 }}>
              <Image size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>Images to PDF Converter</h3>
              <p style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>Convert JPG, PNG, and WebP images into a clean multi-page PDF</p>
            </div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: 4 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '24px 16px', borderRadius: 14,
              border: '2px dashed var(--glass-border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', background: 'var(--glass-bg)', marginBottom: 16,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleImagesAdded}
            />
            <UploadCloud size={30} color="#34c759" />
            <span style={{ fontSize: 13.5, fontWeight: 600, marginTop: 8 }}>Click or drop Images to add</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Supports PNG, JPG, JPEG, and WebP</span>
          </div>

          {/* Grid Preview */}
          {images.length > 0 && (
            <div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Images ({images.length})
              </span>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                gap: 10, marginTop: 8,
              }}>
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    style={{
                      borderRadius: 10, overflow: 'hidden',
                      background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                      padding: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    }}
                  >
                    <img
                      src={img.previewUrl}
                      alt={img.file.name}
                      style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 6 }}
                    />
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
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
        <div className="modal-footer">
          <span className="desktop-only" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {images.length} image{images.length === 1 ? '' : 's'} queued
          </span>

          <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose} style={{ flex: 'none' }}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={images.length === 0 || isProcessing}
              onClick={handleConvert}
              style={{ gap: 6, opacity: images.length === 0 ? 0.5 : 1 }}
            >
              {success ? <CheckCircle size={15} /> : <Download size={15} />}
              {isProcessing ? 'Converting…' : success ? 'Converted & Saved!' : 'Convert to PDF'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
