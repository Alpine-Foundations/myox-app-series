import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Files, UploadCloud, Trash2, ArrowUp, ArrowDown, Download, X, CheckCircle, FileText } from 'lucide-react';
import { mergePDFDocuments, downloadFile } from '../../utils/pdfEngine';

export default function MergePDFTool({ onClose }) {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleFilesAdded = (e) => {
    const selected = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf');
    if (selected.length > 0) {
      setFiles(prev => [...prev, ...selected]);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const moveFile = (index, direction) => {
    setFiles(prev => {
      const copy = [...prev];
      const target = index + direction;
      if (target < 0 || target >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      alert('Please add at least 2 PDF documents to merge.');
      return;
    }
    setIsProcessing(true);
    try {
      const mergedBytes = await mergePDFDocuments(files);
      downloadFile(mergedBytes, 'merged_document.pdf');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to merge documents. Please verify the files are not password protected.');
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
          width: '100%', maxWidth: 640, maxHeight: '90vh',
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
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0, 113, 227, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0071e3' }}>
              <Files size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Merge PDF Files</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Combine multiple PDF files into one in your chosen order</p>
            </div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: 6 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {/* Dropzone / Add button */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '24px 16px', borderRadius: 14,
              border: '2px dashed var(--glass-border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', background: 'var(--glass-bg)', marginBottom: 20,
              transition: 'border-color 0.2s ease',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              style={{ display: 'none' }}
              onChange={handleFilesAdded}
            />
            <UploadCloud size={32} color="#0071e3" />
            <span style={{ fontSize: 14, fontWeight: 500, marginTop: 8 }}>Click or drop PDFs to add</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>You can select multiple files at once</span>
          </div>

          {/* Files List */}
          {files.length > 0 && (
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Files to merge ({files.length})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {files.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    style={{
                      padding: '10px 14px', borderRadius: 10,
                      background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, minWidth: 20, color: 'var(--text-secondary)' }}>
                        #{idx + 1}
                      </span>
                      <FileText size={16} color="var(--accent)" />
                      <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {file.name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        className="btn"
                        disabled={idx === 0}
                        onClick={() => moveFile(idx, -1)}
                        style={{ padding: 4, opacity: idx === 0 ? 0.3 : 1 }}
                        title="Move Up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        className="btn"
                        disabled={idx === files.length - 1}
                        onClick={() => moveFile(idx, 1)}
                        style={{ padding: 4, opacity: idx === files.length - 1 ? 0.3 : 1 }}
                        title="Move Down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        className="btn"
                        onClick={() => removeFile(idx)}
                        style={{ padding: 4, color: '#ff3b30' }}
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
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
            {files.length} document{files.length === 1 ? '' : 's'} queued
          </span>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={files.length < 2 || isProcessing}
              onClick={handleMerge}
              style={{ gap: 6, opacity: files.length < 2 ? 0.5 : 1 }}
            >
              {success ? <CheckCircle size={16} /> : <Download size={16} />}
              {isProcessing ? 'Merging in browser…' : success ? 'Merged & Downloaded!' : 'Merge & Download PDF'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
