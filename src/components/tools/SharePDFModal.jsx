import { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Copy, Check, Mail, QrCode, X, Download, ShieldCheck } from 'lucide-react';

export default function SharePDFModal({ file, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleNativeShare = async () => {
    if (navigator.share && file) {
      try {
        await navigator.share({
          title: file.name || 'Shared PDF Document',
          files: [file],
        });
      } catch (err) {
        console.log('User cancelled share or not supported:', err);
      }
    }
  };

  const handleCopyLink = () => {
    const docUrl = window.location.href;
    navigator.clipboard.writeText(docUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Shared PDF: ${file?.name || 'Document'}`);
    const body = encodeURIComponent(`Hi,\n\nI am sharing "${file?.name || 'this PDF document'}" with you via Alpine Document.\n\nBest regards.`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
  return (
    <div className="modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="modal-card glass-panel"
        style={{ maxWidth: 480 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(0, 113, 227, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)', flexShrink: 0,
            }}>
              <Share2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>Share PDF Document</h3>
              <p style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>Send privately via Email, WhatsApp, AirDrop, or Link</p>
            </div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: 4 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Native Share button if available */}
          {navigator.share && (
            <button
              className="btn btn-primary"
              onClick={handleNativeShare}
              style={{ width: '100%', padding: '12px', fontSize: 13.5, gap: 8, justifyContent: 'center' }}
            >
              <Share2 size={16} /> Share via System Apps (WhatsApp, AirDrop)
            </button>
          )}

          {/* Action Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              className="btn"
              onClick={handleEmailShare}
              style={{
                padding: '12px', borderRadius: 12, background: 'var(--glass-bg)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}
            >
              <Mail size={20} color="var(--accent)" />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>Email Document</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>Open mail client</span>
            </button>

            <button
              className="btn"
              onClick={handleCopyLink}
              style={{
                padding: '12px', borderRadius: 12, background: 'var(--glass-bg)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}
            >
              {copied ? <Check size={20} color="#34c759" /> : <Copy size={20} color="var(--accent)" />}
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{copied ? 'Link Copied!' : 'Copy App Link'}</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>Direct workspace URL</span>
            </button>
          </div>

          <div style={{
            padding: '10px 14px', borderRadius: 10, background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <ShieldCheck size={16} color="#34c759" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              100% Client-Side Privacy: Your document is processed locally in your browser.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={onClose} style={{ minWidth: 90 }}>
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
  );
}
