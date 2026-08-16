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
        color: '#0071e3',
      },
      {
        id: 'split',
        name: 'Split & Extract',
        badge: 'Free',
        desc: 'Extract specific pages, page ranges, or split into individual documents.',
        icon: Scissors,
        color: '#ff3b30',
      },
      {
        id: 'organize',
        name: 'Visual Page Organizer',
        badge: 'Power Tool',
        desc: 'Drag & drop light-table to reorder, rotate, duplicate, or delete pages.',
        icon: LayoutGrid,
        color: '#34c759',
      },
    ],
  },
  {
    id: 'edit',
    title: 'Edit, Annotate & Sign',
    description: 'Markup documents, sign contracts, and add branding',
    tools: [
      {
        id: 'sign',
        name: 'E-Sign Document',
        badge: 'No Limits',
        desc: 'Draw, type, or upload legal signatures and place them anywhere on your pages.',
        icon: PenTool,
        color: '#af52de',
      },
      {
        id: 'watermark',
        name: 'Watermark & Stamp',
        badge: 'Custom',
        desc: 'Add custom confidential stamps, logos, or text watermarks across all pages.',
        icon: Stamp,
        color: '#ff9500',
      },
      {
        id: 'numbering',
        name: 'Page Numbers',
        badge: 'Smart',
        desc: 'Insert custom page numbers (Page X of Y) with position & font formatting.',
        icon: Hash,
        color: '#5856d6',
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
        color: '#30b0c7',
      },
      {
        id: 'img-to-pdf',
        name: 'Images to PDF',
        badge: 'Multi-image',
        desc: 'Turn photos, scans, and images into a clean standardized PDF document.',
        icon: Image,
        color: '#34c759',
      },
      {
        id: 'extract-text',
        name: 'Extract Text & Markdown',
        badge: 'Instant',
        desc: 'Extract all textual content into clean Markdown or plain text files.',
        icon: Type,
        color: '#8e8e93',
      },
    ],
  },
  {
    id: 'security',
    title: 'Security & Privacy Hub',
    description: '100% client-side privacy protection with zero cloud uploads',
    tools: [
      {
        id: 'protect',
        name: 'Password Protect & Encrypt',
        badge: 'AES-256',
        desc: 'Lock documents with standard password encryption directly in browser.',
        icon: KeyRound,
        color: '#ff2d55',
      },
      {
        id: 'sanitize',
        name: 'Sanitize Metadata',
        badge: 'Privacy',
        desc: 'Strip author info, revision history, and hidden EXIF metadata before sharing.',
        icon: ShieldAlert,
        color: '#ff9500',
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

  return (
    <div style={{ width: '100%', maxWidth: 1080, margin: '0 auto', padding: '16px 20px 60px' }}>
      
      {/* ── Banner Header ── */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 20, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 12 }}
        >
          <Cpu size={14} /> 100% Free Client-Side PDF Powerhouse • Zero Cloud Uploads
        </motion.div>
        
        <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
          All PDF Tools. Zero Paywalls.
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8, maxWidth: 540, margin: '8px auto 0' }}>
          Everything paid PDF software charges you for—available for free, running privately right inside your browser memory.
        </p>

        {/* ── Search Bar & Filter Tabs ── */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 440 }}>
            <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search all PDF tools (Merge, Split, E-Sign, Images)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 40px',
                borderRadius: 14,
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                fontSize: 14,
                outline: 'none',
                boxShadow: 'var(--glass-shadow)',
              }}
            />
            {search && (
              <button
                className="btn"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', padding: 4 }}
              >
                <X size={14} color="var(--text-secondary)" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            <button
              className="btn"
              onClick={() => setActiveCategory('all')}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                borderRadius: 20,
                background: activeCategory === 'all' ? 'var(--accent)' : 'var(--glass-bg)',
                color: activeCategory === 'all' ? 'var(--bg-color)' : 'var(--text-primary)',
                border: '1px solid var(--glass-border)',
              }}
            >
              All Tools
            </button>
            {TOOLS_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className="btn"
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  borderRadius: 20,
                  background: activeCategory === cat.id ? 'var(--accent)' : 'var(--glass-bg)',
                  color: activeCategory === cat.id ? 'var(--bg-color)' : 'var(--text-primary)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                {cat.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tools Grid ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
        {filteredCategories.map(category => (
          <div key={category.id}>
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
                {category.title}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {category.description}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}>
              {category.tools.map(tool => {
                const IconComponent = tool.icon;
                return (
                  <motion.div
                    key={tool.id}
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectTool(tool.id)}
                    className="glass-panel"
                    style={{
                      padding: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: 16,
                      border: '1px solid var(--glass-border)',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: `${tool.color}15`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: tool.color,
                        }}>
                          <IconComponent size={22} />
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          padding: '3px 8px', borderRadius: 10,
                          background: 'var(--glass-border)',
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}>
                          {tool.badge}
                        </span>
                      </div>

                      <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                        {tool.name}
                      </h4>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {tool.desc}
                      </p>
                    </div>

                    <div style={{
                      marginTop: 18, paddingTop: 12, borderTop: '1px solid var(--glass-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      fontSize: 12, fontWeight: 600, color: tool.color,
                    }}>
                      <span>Launch Tool</span>
                      <ArrowRight size={14} />
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
