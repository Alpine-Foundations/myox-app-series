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
          width: '100%', maxWidth: 480,
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
              background: 'rgba(0, 113, 227, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)',
            }}>
              <Share2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 600 }}>Share PDF Document</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Send privately via Email, WhatsApp, AirDrop, or Link</p>
            </div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: 6 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Native Share button if available */}
          {navigator.share && (
            <button
              className="btn btn-primary"
              onClick={handleNativeShare}
              style={{ width: '100%', padding: '12px', fontSize: 14, gap: 8, justifyContent: 'center' }}
            >
              <Share2 size={16} /> Share to Apps (AirDrop, WhatsApp, Teams)
            </button>
          )}

          {/* Action Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              className="btn"
              onClick={handleEmailShare}
              style={{
                padding: '14px', borderRadius: 12, background: 'var(--glass-bg)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}
            >
              <Mail size={22} color="var(--accent)" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Email Document</span>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Open mail client</span>
            </button>

            <button
              className="btn"
              onClick={handleCopyLink}
              style={{
                padding: '14px', borderRadius: 12, background: 'var(--glass-bg)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}
            >
              {copied ? <Check size={22} color="#34c759" /> : <Copy size={22} color="var(--accent)" />}
              <span style={{ fontSize: 13, fontWeight: 600 }}>{copied ? 'Link Copied!' : 'Copy App Link'}</span>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Direct workspace URL</span>
            </button>
          </div>

          <div style={{
            padding: '10px 14px', borderRadius: 10, background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <ShieldCheck size={16} color="#34c759" />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              100% Client-Side Privacy: Your document is never uploaded to public clouds.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          borderTop: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
        }}>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
