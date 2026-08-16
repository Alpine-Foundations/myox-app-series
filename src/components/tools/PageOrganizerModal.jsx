import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Document, Page } from 'react-pdf';
import {
  LayoutGrid, RotateCw, Trash2, Copy, ArrowLeft, ArrowRight,
  Download, X, CheckCircle, UploadCloud
} from 'lucide-react';
import { reorganizePDFPages, downloadFile } from '../../utils/pdfEngine';

export default function PageOrganizerModal({ initialFile, onClose }) {
  const [file, setFile] = useState(initialFile || null);
  const [pages, setPages] = useState([]); // [{ originalIndex, rotation, id }]
  const [numPages, setNumPages] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const onDocLoad = ({ numPages }) => {
    setNumPages(numPages);
    setPages(
      Array.from({ length: numPages }, (_, i) => ({
        originalIndex: i,
        rotation: 0,
        id: `page-${i}-${Date.now()}`,
      }))
    );
  };

  const rotatePage = (index) => {
    setPages(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        rotation: (copy[index].rotation + 90) % 360,
      };
      return copy;
    });
  };

  const deletePage = (index) => {
    if (pages.length <= 1) {
      alert('Document must have at least 1 page remaining.');
      return;
    }
    setPages(prev => prev.filter((_, i) => i !== index));
  };

  const duplicatePage = (index) => {
    setPages(prev => {
      const copy = [...prev];
      const target = copy[index];
      copy.splice(index + 1, 0, {
        ...target,
        id: `page-copy-${Date.now()}-${Math.random()}`,
      });
      return copy;
    });
  };

  const movePage = (index, direction) => {
    setPages(prev => {
      const copy = [...prev];
      const target = index + direction;
      if (target < 0 || target >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const handleSave = async () => {
    if (!file || pages.length === 0) return;
    setIsProcessing(true);
    try {
      const configs = pages.map(p => ({
        pageIndex: p.originalIndex,
        rotation: p.rotation,
      }));
      const reorganizedBytes = await reorganizePDFPages(file, configs);
      downloadFile(reorganizedBytes, `organized_${file.name || 'document.pdf'}`);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save organized PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-panel"
        style={{
          width: '100%', maxWidth: 960, height: '92vh',
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
              <LayoutGrid size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Visual Page Organizer</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Reorder, rotate, duplicate, or delete individual pages visually</p>
            </div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: 6 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Main Content */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '48px 16px', borderRadius: 14,
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
              <UploadCloud size={40} color="#34c759" />
              <span style={{ fontSize: 15, fontWeight: 500, marginTop: 12 }}>Open a PDF to Organize</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Click to browse or drop file</span>
            </div>
          ) : (
            <Document file={file} onLoadSuccess={onDocLoad}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 16,
              }}>
                {pages.map((p, idx) => (
                  <div
                    key={p.id}
                    className="glass-panel"
                    style={{
                      padding: 8,
                      borderRadius: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      position: 'relative',
                    }}
                  >
                    {/* Page Thumbnail */}
                    <div style={{
                      width: '100%', height: 180,
                      borderRadius: 6, overflow: 'hidden',
                      background: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Page
                        pageNumber={p.originalIndex + 1}
                        rotate={p.rotation}
                        width={140}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </div>

                    {/* Page Number Label */}
                    <div style={{ margin: '8px 0 4px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                      Page {idx + 1} {p.originalIndex !== idx && <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(orig. {p.originalIndex + 1})</span>}
                    </div>

                    {/* Action Bar */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 4, width: '100%', paddingTop: 6, borderTop: '1px solid var(--glass-border)',
                    }}>
                      <button
                        className="btn"
                        disabled={idx === 0}
                        onClick={() => movePage(idx, -1)}
                        style={{ padding: 4, opacity: idx === 0 ? 0.3 : 1 }}
                        title="Move Left"
                      >
                        <ArrowLeft size={13} />
                      </button>
                      <button
                        className="btn"
                        onClick={() => rotatePage(idx)}
                        style={{ padding: 4 }}
                        title="Rotate 90° Clockwise"
                      >
                        <RotateCw size={13} />
                      </button>
                      <button
                        className="btn"
                        onClick={() => duplicatePage(idx)}
                        style={{ padding: 4 }}
                        title="Duplicate Page"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        className="btn"
                        disabled={idx === pages.length - 1}
                        onClick={() => movePage(idx, 1)}
                        style={{ padding: 4, opacity: idx === pages.length - 1 ? 0.3 : 1 }}
                        title="Move Right"
                      >
                        <ArrowRight size={13} />
                      </button>
                      <button
                        className="btn"
                        onClick={() => deletePage(idx)}
                        style={{ padding: 4, color: '#ff3b30' }}
                        title="Delete Page"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Document>
          )}
        </div>

        {/* Footer */}
        {file && (
          <div style={{
            padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {pages.length} page{pages.length === 1 ? '' : 's'} in modified document
            </span>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={isProcessing}
                onClick={handleSave}
                style={{ gap: 6 }}
              >
                {success ? <CheckCircle size={16} /> : <Download size={16} />}
                {isProcessing ? 'Saving in browser…' : success ? 'Saved & Downloaded!' : 'Save & Download PDF'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
