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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 220,
      background: 'rgba(0, 0, 0, 0.68)', backdropFilter: 'blur(18px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-panel"
        style={{
          width: '100%', maxWidth: 520,
          background: 'var(--bg-color)', borderRadius: 22,
          border: '1px solid var(--glass-border)', boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--glass-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: 'rgba(66, 133, 244, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#4285f4',
            }}>
              <Cloud size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 600 }}>Import from Google Drive & Cloud</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Paste any Google Drive sharing link or public PDF URL</p>
            </div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: 6 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Google Drive Link or PDF URL:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={driveUrl}
                onChange={e => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                style={{
                  width: '100%', padding: '10px 14px 10px 36px', borderRadius: 10,
                  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                }}
              />
              <Link size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
              Make sure link sharing is set to "Anyone with the link can view".
            </span>
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
        <div style={{
          padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: 10, borderTop: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
        }}>
          <button className="btn" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleFetchDriveUrl()}
            disabled={!driveUrl.trim() || isLoading}
            style={{ gap: 6 }}
          >
            <Check size={16} /> {isLoading ? 'Importing from Drive…' : 'Import Document'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
