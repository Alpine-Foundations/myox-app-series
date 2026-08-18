import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cloud, Link, X, Check, Globe, FileText, ArrowRight, Sparkles } from 'lucide-react';

export default function GoogleDrivePickerModal({ onImportFile, onClose }) {
  const [driveUrl, setDriveUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const sampleDocs = [
    {
      title: 'Sample Business Proposal',
      url: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf',
      name: 'Business_Proposal.pdf',
    },
  ];

  const handleFetchDriveUrl = async (urlToFetch) => {
    const rawUrl = urlToFetch || driveUrl;
    if (!rawUrl.trim()) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      let fetchableUrl = rawUrl.trim();

      // Convert Google Drive sharing link into direct download link
      const driveMatch = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (driveMatch) {
        const fileId = driveMatch[1];
        fetchableUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      }

      const res = await fetch(fetchableUrl);
      if (!res.ok) throw new Error('Could not fetch file from Google Drive / URL. Ensure the file link has public viewing permissions.');

      const blob = await res.blob();
      const filename = rawUrl.split('/').pop().split('?')[0] || 'google_drive_document.pdf';
      const file = new File([blob], filename.endsWith('.pdf') ? filename : `${filename}.pdf`, {
        type: 'application/pdf',
      });

      onImportFile(file);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load file. Please check permissions or upload directly.');
    } finally {
      setIsLoading(false);
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
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(66, 133, 244, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#4285f4', flexShrink: 0,
            }}>
              <Cloud size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>Import from Google Drive</h3>
              <p style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>Paste any Google Drive sharing link or public PDF URL</p>
            </div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: 4 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Google Drive Link or PDF URL:
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="https://drive.google.com/file/d/…"
                value={driveUrl}
                onChange={e => setDriveUrl(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Quick templates */}
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Or try a sample document:
            </span>
            {sampleDocs.map((doc, idx) => (
              <div
                key={idx}
                onClick={() => handleFetchDriveUrl(doc.url)}
                style={{
                  padding: '10px 14px', borderRadius: 10, background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} color="var(--accent)" />
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{doc.title}</span>
                </div>
                <ArrowRight size={14} color="var(--text-secondary)" />
              </div>
            ))}
          </div>

          {errorMsg && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255, 59, 48, 0.15)', color: '#ff3b30', fontSize: 12 }}>
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose} disabled={isLoading} style={{ flex: 'none' }}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleFetchDriveUrl()}
              disabled={!driveUrl.trim() || isLoading}
              style={{ gap: 6 }}
            >
              <Check size={16} /> {isLoading ? 'Importing…' : 'Import Document'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
