import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, X, ShieldCheck, Minimize2, FileText } from 'lucide-react';

export default function SaveAsModal({
  currentFileName = 'document.pdf',
  numPages = 1,
  hasModifications = false,
  onSave,
  onClose,
}) {
  const [fileName, setFileName] = useState(() => {
    return currentFileName.replace(/\.pdf$/i, '');
  });
  const [includeModifications, setIncludeModifications] = useState(true);
  const [sanitizeMetadata, setSanitizeMetadata] = useState(false);
  const [compressDocument, setCompressDocument] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSaveSubmit = async (e) => {
    e?.preventDefault();
    if (!fileName.trim()) return;

    setIsProcessing(true);
    const finalName = fileName.trim().endsWith('.pdf') ? fileName.trim() : `${fileName.trim()}.pdf`;

    try {
      await onSave({
        fileName: finalName,
        includeModifications,
        sanitizeMetadata,
        compressDocument,
      });
      onClose();
    } catch (err) {
      console.error('Save As error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="modal-card glass-panel"
        style={{ maxWidth: 480 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--accent-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-primary)',
              border: '1px solid var(--glass-border)',
            }}>
              <Save size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Save As Document
              </h3>
              <p style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                Specify destination file name and export options
              </p>
            </div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: 4 }}>
            <X size={17} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* File Name Field */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
              File Name
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  placeholder="Enter file name"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-card)',
                    border: '1px solid var(--glass-border)',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', padding: '0 4px' }}>
                .pdf
              </span>
            </div>
          </div>

          {/* Document Summary Pill */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-subtle)', border: '1px solid var(--glass-border)',
            fontSize: 12, color: 'var(--text-secondary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={14} color="var(--text-primary)" />
              <span>{numPages} {numPages === 1 ? 'page' : 'pages'}</span>
            </div>
            {hasModifications && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-blue)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: 99 }}>
                Includes In-Memory Edits
              </span>
            )}
          </div>

          {/* Export Configurations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Export Options
            </span>

            {/* Option 1: Bake Modifications */}
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-card)', border: '1px solid var(--glass-border)',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={includeModifications}
                onChange={e => setIncludeModifications(e.target.checked)}
                style={{ marginTop: 2, accentColor: 'var(--text-primary)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Bake annotations, markup & signatures
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  Permanently embed digital signatures, drawings, and notes into the PDF stream.
                </span>
              </div>
            </label>

            {/* Option 2: Privacy Sanitization */}
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-card)', border: '1px solid var(--glass-border)',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={sanitizeMetadata}
                onChange={e => setSanitizeMetadata(e.target.checked)}
                style={{ marginTop: 2, accentColor: 'var(--text-primary)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  Sanitize document metadata <ShieldCheck size={13} color="var(--accent-emerald)" />
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  Strip author names, creator tools, creation timestamps, and revision tags.
                </span>
              </div>
            </label>

            {/* Option 3: Compress */}
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-card)', border: '1px solid var(--glass-border)',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={compressDocument}
                onChange={e => setCompressDocument(e.target.checked)}
                style={{ marginTop: 2, accentColor: 'var(--text-primary)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  Compress PDF in memory <Minimize2 size={13} color="var(--text-tertiary)" />
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  Optimize embedded image assets and compress page streams for smaller file size.
                </span>
              </div>
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn" onClick={onClose} type="button" disabled={isProcessing}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSaveSubmit}
            disabled={!fileName.trim() || isProcessing}
            style={{ padding: '8px 16px', gap: 6 }}
          >
            {isProcessing ? (
              <>
                <div className="spin-ring" style={{ width: 14, height: 14, borderWidth: 2 }} />
                <span>Processing…</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Document</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
