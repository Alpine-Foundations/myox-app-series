import { motion } from 'framer-motion';
import {
  Sparkles, Globe, Smartphone, Monitor, ShieldCheck,
  ArrowLeft, Terminal, Cpu, Layers, ExternalLink, Heart
} from 'lucide-react';
import devPhoto from '../assets/about-dev.jfif';
import logoImg from '../assets/myox-logo.png';

export default function DeveloperPage({ onBackToViewer, onOpenUtilities }) {
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
            background: 'var(--accent)',
            boxShadow: '0 0 8px var(--accent)',
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
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.04)',
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
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--surface-card)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              zIndex: 2,
            }}>
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

      {/* ── Lower Section: Multi-Platform Ecosystem Vision ── */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          maxWidth: 780,
          marginTop: 28,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <span style={{
          fontSize: 11.5,
          fontWeight: 700,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          display: 'block',
          textAlign: 'center',
          marginBottom: 14,
        }}>
          Multi-Platform Architectural Roadmap
        </span>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}>
          {/* Platform 1: Web */}
          <div
            className="glass-panel"
            style={{
              padding: '16px 18px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-card)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--accent-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)',
              }}>
                <Globe size={16} />
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                background: 'rgba(52, 199, 89, 0.15)', color: '#34c759',
              }}>
                Live Architecture
              </span>
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Web Engine (PWA)</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Zero-server client-side WASM & WebGL acceleration running 100% in local browser memory.
            </p>
          </div>

          {/* Platform 2: Android */}
          <div
            className="glass-panel"
            style={{
              padding: '16px 18px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-card)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(52, 199, 89, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#34c759',
              }}>
                <Smartphone size={16} />
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                background: 'var(--accent-soft)', color: 'var(--accent)',
              }}>
                Android Expansion
              </span>
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Android Mobile</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Native touch ergonomics, system-level file handles, and synchronized offline storage.
            </p>
          </div>

          {/* Platform 3: Desktop */}
          <div
            className="glass-panel"
            style={{
              padding: '16px 18px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-card)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(88, 86, 214, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#5856d6',
              }}>
                <Monitor size={16} />
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                background: 'var(--accent-soft)', color: 'var(--text-secondary)',
              }}>
                Desktop Workspace
              </span>
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Cross-Platform Desktop</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              High-throughput batch tools, native multi-windowing, and unified device workflows.
            </p>
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
