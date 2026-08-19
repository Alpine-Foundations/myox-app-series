import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ShieldCheck, ArrowLeft, Layers, Share2,
  DownloadCloud, Copy, Check, Mail, MessageCircle,
  ExternalLink, Smartphone, Monitor, Info
} from 'lucide-react';
import devPhoto from '../assets/about-dev.jfif';
import logoImg from '../assets/myox-logo.png';

export default function DeveloperPage({
  onBackToViewer,
  onOpenUtilities,
  pwaPrompt,
  onInstallPWA,
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2800);
  };

  const appUrl = typeof window !== 'undefined'
    ? (window.location.origin + window.location.pathname)
    : 'https://alpine-foundations.github.io/myox-app-series/';

  const shareTitle = 'MyOx Document — Private Hardware-Accelerated PDF Studio';
  const shareText = 'Check out MyOx Document — a fast, free, 100% client-side private PDF studio engineered by Alpine Foundations. Zero cloud uploads!';

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: appUrl,
        });
        showToast('Shared successfully!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyShareLink();
        }
      }
    } else {
      handleCopyShareLink();
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedLink(true);
    showToast('App link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2400);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`${shareText}\n\n${appUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(appUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const handleLinkedInShare = () => {
    const url = encodeURIComponent(appUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  const handleTelegramShare = () => {
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(appUrl);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(`Hi,\n\nI recommend checking out MyOx Document, a 100% private in-browser PDF studio:\n${appUrl}\n\nBest regards.`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleTriggerInstall = () => {
    if (pwaPrompt && onInstallPWA) {
      onInstallPWA();
    } else {
      setShowInstallGuide(v => !v);
    }
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: 920,
      margin: '0 auto',
      padding: '16px 12px 64px',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: 'calc(100vh - 120px)',
    }}>
      
      {/* ── Subtle Toast ── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            style={{
              position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
              zIndex: 999, background: 'var(--accent)', color: 'var(--bg-color)',
              padding: '8px 20px', borderRadius: 99, fontSize: 13, fontWeight: 600,
              boxShadow: 'var(--shadow-lg)', maxWidth: '90vw', textAlign: 'center',
            }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fixed / Atmospheric Watermark Brand Background ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(700px, 88vw)',
          height: 'min(700px, 88vw)',
          pointerEvents: 'none',
          zIndex: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
        }}
      >
        <img
          src={logoImg}
          alt="MyOx Atmospheric Watermark"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: 'var(--watermark-opacity, 0.05)',
            filter: 'grayscale(15%) blur(1px)',
            transition: 'opacity 0.4s ease',
          }}
        />
        {/* Soft Radial Ambient Lighting Glow */}
        <div style={{
          position: 'absolute',
          inset: '10%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)',
          opacity: 0.45,
          filter: 'blur(40px)',
        }} />
      </motion.div>

      {/* ── Top Header Section ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          marginBottom: 32,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Ecosystem Pill Badge */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '5px 14px',
            borderRadius: 99,
            background: 'var(--surface-card)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: 14,
            backdropFilter: 'blur(12px)',
          }}
        >
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--accent-emerald)',
            boxShadow: '0 0 8px var(--accent-emerald)',
            display: 'inline-block',
          }} />
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}>
            Alpine Foundations • Ecosystem Series
          </span>
        </motion.div>

        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 44px)',
          fontWeight: 800,
          letterSpacing: '-0.035em',
          color: 'var(--text-primary)',
          lineHeight: 1.15,
          marginBottom: 8,
        }}>
          Architected to Scale.
        </h1>
        <p style={{
          fontSize: 'clamp(13px, 2.5vw, 15px)',
          color: 'var(--text-secondary)',
          maxWidth: 520,
          lineHeight: 1.6,
          margin: '0 auto',
        }}>
          Purpose-built digital software infrastructure engineered without compromise.
        </p>
      </motion.div>

      {/* ── Main Central Developer & About Glass Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 780,
          borderRadius: 24,
          border: '1px solid var(--glass-border)',
          background: 'var(--surface-card)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Subtle Top Accent Ambient Gradient Bar */}
        <div style={{
          height: 3,
          width: '100%',
          background: 'linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%)',
          opacity: 0.85,
        }} />

        <div style={{
          padding: 'clamp(24px, 4.5vw, 44px) clamp(18px, 4vw, 38px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>

          {/* ── Developer Profile Image in Circular Frame ── */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'relative',
              marginBottom: 22,
            }}
          >
            {/* Outer Glow Ring */}
            <div style={{
              position: 'absolute',
              inset: -6,
              borderRadius: '50%',
              background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)',
              filter: 'blur(10px)',
              opacity: 0.8,
            }} />

            {/* Circular Image Container */}
            <div style={{
              width: 'clamp(92px, 16vw, 114px)',
              height: 'clamp(92px, 16vw, 114px)',
              borderRadius: '50%',
              border: '2.5px solid var(--glass-border)',
              padding: 3,
              background: 'var(--surface-card)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.16)',
              position: 'relative',
              zIndex: 1,
            }}>
              <img
                src={devPhoto}
                alt="Dikshant — Founder & Architect"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>

            {/* Verification Badge */}
            <div style={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'var(--accent)',
              color: 'var(--bg-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--surface-card)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              zIndex: 2,
            }} title="Founder & Lead Architect">
              <ShieldCheck size={14} strokeWidth={2.5} />
            </div>
          </motion.div>

          {/* Section Title */}
          <h2 style={{
            fontSize: 'clamp(22px, 3.5vw, 28px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            textAlign: 'center',
            marginBottom: 20,
          }}>
            About MyOx
          </h2>

          {/* ── About MyOx Official Content ── */}
          <div style={{
            width: '100%',
            maxWidth: 660,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            fontSize: 'clamp(14px, 2.2vw, 15.5px)',
            lineHeight: 1.75,
            color: 'var(--text-secondary)',
            textAlign: 'left',
          }}>
            <p>
              MyOx is an integrated ecosystem of accessible, high-utility software engineered under <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Alpine Foundations</strong>. Built on the belief that powerful digital tools should not be gated behind prohibitive paywalls, MyOx delivers modern, reliable technology designed to remain intuitive, freely accessible, and scalable.
            </p>

            <p>
              What begins as focused web applications is laying the architectural groundwork for a unified, multi-platform ecosystem—expanding across <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Android and desktop environments</strong> to provide seamless, cross-device experiences.
            </p>

            <p>
              Founded by <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Dikshant</strong>, MyOx represents a long-term commitment to building purposeful software infrastructure from the ground up. We are not simply releasing standalone tools; we are building a connected ecosystem designed to evolve, expand, and grow with its users.
            </p>

            {/* Signature Slogan Callout */}
            <div style={{
              marginTop: 12,
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-soft)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}>
              <span style={{
                fontSize: 'clamp(15px, 2.5vw, 17px)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
              }}>
                MyOx — Built to grow.
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Interactive Features: Share App & Install App ── */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          maxWidth: 780,
          marginTop: 28,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* ── Card 1: Share App Feature ── */}
        <div
          className="glass-panel shimmer-container hover-lift"
          style={{
            padding: '22px 20px',
            borderRadius: 'var(--radius-xl)',
            background: 'var(--surface-card)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 16,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'var(--accent-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-primary)',
                border: '1px solid var(--glass-border)',
              }}>
                <Share2 size={19} />
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                background: 'var(--accent-soft)', color: 'var(--text-secondary)',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                Community & Teams
              </span>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.02em' }}>
              Share MyOx Studio
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Recommend MyOx to colleagues, friends, or teams who need a private, zero-server-upload PDF workspace.
            </p>
          </div>

          {/* Share Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Primary Native / Direct Share Button */}
            <motion.button
              className="btn btn-primary"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleNativeShare}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)',
                gap: 8,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Share2 size={15} />
              <span>Share Application</span>
            </motion.button>

            {/* Quick Social Channels Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {[
                { name: 'WhatsApp', icon: MessageCircle, action: handleWhatsAppShare, color: '#25D366' },
                { name: 'X / Twitter', icon: ExternalLink, action: handleTwitterShare, color: 'var(--text-primary)' },
                { name: 'Telegram', icon: Sparkles, action: handleTelegramShare, color: '#0088cc' },
                { name: 'LinkedIn', icon: Layers, action: handleLinkedInShare, color: '#0A66C2' },
                { name: 'Email', icon: Mail, action: handleEmailShare, color: 'var(--text-primary)' },
              ].map((item, idx) => {
                const IconComp = item.icon;
                return (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.06, y: -1 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={item.action}
                    className="btn"
                    title={`Share via ${item.name}`}
                    style={{
                      padding: '8px 0',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--glass-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                    }}
                  >
                    <IconComp size={14} color={item.color} />
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                      {item.name.split(' ')[0]}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Copy Link Button */}
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCopyShareLink}
              className="btn btn-soft"
              style={{
                width: '100%',
                padding: '7px 12px',
                fontSize: 12,
                borderRadius: 'var(--radius-sm)',
                gap: 6,
                fontWeight: 600,
              }}
            >
              {copiedLink ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
              <span>{copiedLink ? 'App Link Copied to Clipboard!' : 'Copy Direct App Link'}</span>
            </motion.button>
          </div>
        </div>

        {/* ── Card 2: Install App Feature ── */}
        <div
          className="glass-panel shimmer-container hover-lift"
          style={{
            padding: '22px 20px',
            borderRadius: 'var(--radius-xl)',
            background: 'var(--surface-card)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 16,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'var(--accent-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-primary)',
                border: '1px solid var(--glass-border)',
              }}>
                <DownloadCloud size={19} />
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                background: 'rgba(52, 199, 89, 0.14)', color: 'var(--accent-emerald)',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                PWA Standalone
              </span>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.02em' }}>
              Install MyOx App
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Experience MyOx as a dedicated, hardware-accelerated app with full offline capabilities and zero install latency.
            </p>
          </div>

          {/* Feature Badge Highlights */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[
              '⚡ Instant Launch',
              '🔒 100% Offline Capable',
              '🖥️ Standalone Window',
              '📱 Mobile & Desktop',
            ].map((tag, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Beautiful Install Trigger Button */}
          <div>
            <motion.button
              className="btn btn-primary"
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleTriggerInstall}
              style={{
                width: '100%',
                padding: '11px 16px',
                fontSize: 13.5,
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)',
                gap: 8,
                boxShadow: 'var(--shadow-sm)',
                background: 'var(--accent)',
                color: 'var(--bg-color)',
              }}
            >
              <DownloadCloud size={16} />
              <span>{pwaPrompt ? 'Install MyOx App' : 'Install / Add to Device'}</span>
            </motion.button>

            {/* Expandable Platform Guidance */}
            <AnimatePresence>
              {showInstallGuide && !pwaPrompt && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    marginTop: 10,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--glass-border)',
                    fontSize: 11.5,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, color: 'var(--text-primary)' }}>
                    <Info size={13} /> How to install in your browser:
                  </div>
                  <div>• <strong>Chrome / Edge (Desktop & Mobile):</strong> Click the <strong>Install</strong> icon in the address bar or browser menu (⋮).</div>
                  <div>• <strong>Safari (iOS / iPadOS):</strong> Tap the <strong>Share button</strong> ⎋ and choose <strong>"Add to Home Screen"</strong>.</div>
                  <div>• <strong>Already installed?</strong> You can launch MyOx directly from your home screen or application launcher.</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ── Action Back Navigation ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          marginTop: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <button
          className="btn glass-panel"
          onClick={onBackToViewer}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 'var(--radius-md)',
            gap: 6,
          }}
        >
          <ArrowLeft size={14} /> Back to Document Studio
        </button>

        <button
          className="btn btn-primary"
          onClick={onOpenUtilities}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 'var(--radius-md)',
            gap: 6,
          }}
        >
          <Layers size={14} /> Explore PDF Utilities
        </button>
      </motion.div>

    </div>
  );
}
