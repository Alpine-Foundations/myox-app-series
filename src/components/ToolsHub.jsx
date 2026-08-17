import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Files, Scissors, LayoutGrid, Image, FileImage, Type,
  Shield, KeyRound, Sparkles, PenTool, Hash, Stamp,
  Search, ArrowRight, X, ShieldAlert, Cpu
} from 'lucide-react';

export const TOOLS_CATEGORIES = [
  {
    id: 'organize',
    title: 'Organize & Assemble',
    description: 'Combine, extract, reorder and arrange your PDF pages',
    tools: [
      {
        id: 'merge',
        name: 'Merge PDFs',
        badge: 'Popular',
        desc: 'Combine multiple PDF documents into one unified file with custom ordering.',
        icon: Files,
        color: '#2563eb',
      },
      {
        id: 'split',
        name: 'Split & Extract',
        badge: 'Free',
        desc: 'Extract specific pages, page ranges, or export pages as PNG archives.',
        icon: Scissors,
        color: '#dc2626',
      },
      {
        id: 'organize',
        name: 'Visual Page Organizer',
        badge: 'Power Tool',
        desc: 'Drag & drop light-table to reorder, rotate, duplicate, or delete pages.',
        icon: LayoutGrid,
        color: '#059669',
      },
      {
        id: 'compress',
        name: 'Compress PDF',
        badge: 'Optimized',
        desc: 'Reduce file size up to 90% in browser memory with zero quality compromise.',
        icon: Cpu,
        color: '#0d9488',
      },
      {
        id: 'gdrive',
        name: 'Google Drive Importer',
        badge: 'Cloud Sync',
        desc: 'Directly import and edit PDFs from Google Drive sharing links or web URLs.',
        icon: Sparkles,
        color: '#4f46e5',
      },
    ],
  },
  {
    id: 'edit',
    title: 'Edit, Annotate & Sign',
    description: 'Markup documents, sign contracts, add text blocks, and draw shapes',
    tools: [
      {
        id: 'sign',
        name: 'E-Sign Document',
        badge: 'No Limits',
        desc: 'Draw, type Google calligraphy, or upload stamp seals directly onto your pages.',
        icon: PenTool,
        color: '#7c3aed',
      },
      {
        id: 'watermark',
        name: 'Watermark & Page Tint',
        badge: 'Custom',
        desc: 'Add custom confidential stamps, logos, or eye-comfort reading background tints.',
        icon: Stamp,
        color: '#d97706',
      },
      {
        id: 'numbering',
        name: 'Page Numbers & Badges',
        badge: 'Smart Badges',
        desc: 'Insert book-style capsule pills, corner ribbon tabs, or Roman numerals.',
        icon: Hash,
        color: '#4f46e5',
      },
      {
        id: 'annotate',
        name: 'Annotate & Text Blocks',
        badge: 'Interactive',
        desc: 'Add custom text blocks, sticky note comments, and geometric shapes.',
        icon: Type,
        color: '#2563eb',
      },
    ],
  },
  {
    id: 'convert',
    title: 'Convert & Export',
    description: 'Transform PDFs to images and images to PDF seamlessly',
    tools: [
      {
        id: 'pdf-to-img',
        name: 'PDF to High-Res Images',
        badge: 'ZIP Export',
        desc: 'Convert PDF pages into high-definition PNG or JPEG image archives.',
        icon: FileImage,
        color: '#0891b2',
      },
      {
        id: 'img-to-pdf',
        name: 'Images to PDF',
        badge: 'Multi-image',
        desc: 'Turn photos, scans, and images into a clean standardized PDF document.',
        icon: Image,
        color: '#059669',
      },
      {
        id: 'extract-text',
        name: 'Extract Text & Markdown',
        badge: 'Instant',
        desc: 'Extract all textual content into clean Markdown or plain text files.',
        icon: Type,
        color: '#52525b',
      },
    ],
  },
  {
    id: 'security',
    title: 'Security & Privacy Hub',
    description: '100% client-side privacy protection with zero cloud uploads',
    tools: [
      {
        id: 'share',
        name: 'Share PDF Privately',
        badge: 'Secure Link',
        desc: 'Send documents via AirDrop, Email, WhatsApp, or instant private workspace links.',
        icon: Shield,
        color: '#2563eb',
      },
      {
        id: 'sanitize',
        name: 'Sanitize Metadata',
        badge: 'Privacy',
        desc: 'Strip author info, revision history, and hidden EXIF metadata before sharing.',
        icon: ShieldAlert,
        color: '#d97706',
      },
    ],
  },
];

export default function ToolsHub({ onSelectTool }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredCategories = TOOLS_CATEGORIES.map(category => {
    if (activeCategory !== 'all' && category.id !== activeCategory) {
      return null;
    }
    const matchingTools = category.tools.filter(t =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.desc.toLowerCase().includes(search.toLowerCase())
    );
    if (matchingTools.length === 0) return null;
    return { ...category, tools: matchingTools };
  }).filter(Boolean);

  const categoryPills = [
    { id: 'all', label: 'All Tools' },
    ...TOOLS_CATEGORIES.map(c => ({ id: c.id, label: c.title.split(' ')[0] + ' Tools' })),
  ];

  return (
    <div style={{ width: '100%', maxWidth: 1040, margin: '0 auto', padding: '12px 0 60px' }}>
      
      {/* ── Banner Header ── */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
          All Free PDF Tools
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, maxWidth: 480, margin: '6px auto 0', lineHeight: 1.5 }}>
          GPU-accelerated tools running 100% in your browser with complete privacy.
        </p>

        {/* ── Search Bar & Filter Tabs ── */}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
            <Search size={15} color="var(--text-tertiary)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search tools (Merge, Split, E-Sign, Images)…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px 9px 38px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-card)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
                boxShadow: 'var(--shadow-sm)',
              }}
            />
            {search && (
              <button
                className="btn"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', padding: 3 }}
              >
                <X size={13} color="var(--text-secondary)" />
              </button>
            )}
          </div>

          {/* Category Tabs with Gliding Indicator */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center',
            background: 'var(--bg-subtle)', padding: 3, borderRadius: 'var(--radius-md)',
          }}>
            {categoryPills.map(cat => {
              const isSelected = activeCategory === cat.id;
              return (
                <motion.button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    position: 'relative',
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    zIndex: 2,
                    transition: 'color 0.15s ease',
                  }}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="active-hub-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'var(--surface-card)',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: 'var(--shadow-sm)',
                        zIndex: -1,
                      }}
                    />
                  )}
                  {cat.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tools Grid ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {filteredCategories.map(category => (
          <div key={category.id}>
            <div style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {category.title}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {category.description}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 14,
            }}>
              {category.tools.map(tool => {
                const IconComponent = tool.icon;
                return (
                  <motion.div
                    key={tool.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    onClick={() => onSelectTool(tool.id)}
                    className="glass-panel"
                    style={{
                      padding: '18px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--glass-border)',
                      background: 'var(--surface-card)',
                      boxShadow: 'var(--shadow-sm)',
                      position: 'relative',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10,
                          background: 'var(--accent-soft)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--text-primary)',
                        }}>
                          <IconComponent size={18} strokeWidth={1.75} />
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 500,
                          padding: '2px 8px', borderRadius: 6,
                          background: 'var(--bg-subtle)',
                          color: 'var(--text-secondary)',
                          letterSpacing: '0.02em',
                        }}>
                          {tool.badge}
                        </span>
                      </div>

                      <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.01em' }}>
                        {tool.name}
                      </h4>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {tool.desc}
                      </p>
                    </div>

                    <div style={{
                      marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--glass-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      fontSize: 12, fontWeight: 500, color: 'var(--text-primary)',
                    }}>
                      <span>Launch Tool</span>
                      <ArrowRight size={13} color="var(--text-tertiary)" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
