import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, File, Moon, Sun, Clock, Trash2,
  Wand2, BookOpen, Sparkles, ArrowRight, ShieldCheck, DownloadCloud,
  Layers, PenTool, Files, LayoutGrid, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import PDFViewer from './PDFViewer';
import ToolsHub from './components/ToolsHub';
import DeveloperPage from './components/DeveloperPage';
import MergePDFTool from './components/tools/MergePDFTool';
import SplitPDFTool from './components/tools/SplitPDFTool';
import PageOrganizerModal from './components/tools/PageOrganizerModal';
import WatermarkTool from './components/tools/WatermarkTool';
import PageNumberingTool from './components/tools/PageNumberingTool';
import ImagesToPDFTool from './components/tools/ImagesToPDFTool';
import PDFToImagesTool from './components/tools/PDFToImagesTool';
import PDFSecurityModal from './components/tools/PDFSecurityModal';
import CompressPDFTool from './components/tools/CompressPDFTool';
import GoogleDrivePickerModal from './components/tools/GoogleDrivePickerModal';
import SharePDFModal from './components/tools/SharePDFModal';
import { createDemoPDFDocument } from './utils/sampleDoc';
import './index.css';

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('reader'); // 'reader' | 'tools' | 'about'
  const [activeTool, setActiveTool] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [initialViewerTool, setInitialViewerTool] = useState(null);
  const [initialAnnotate, setInitialAnnotate] = useState(false);
  const [dropToast, setDropToast] = useState('');
  const [pwaPrompt, setPwaPrompt] = useState(null);
  const fileInputRef = useRef(null);

  // Listen for PWA installation event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPWA = async () => {
    if (!pwaPrompt) return;
    pwaPrompt.prompt();
    const { outcome } = await pwaPrompt.userChoice;
    if (outcome === 'accepted') {
      setPwaPrompt(null);
      setDropToast('MyOx App installed successfully!');
      setTimeout(() => setDropToast(''), 3000);
    }
  };

  const [recentFiles, setRecentFiles] = useState(() => {
    try {
      const saved = localStorage.getItem('alpine_recent_files');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('alpine_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('alpine_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  };

  const handleOpenPdf = (selectedFile, tool = null, annotate = false) => {
    setFile(selectedFile);
    setInitialViewerTool(tool);
    setInitialAnnotate(annotate);
    try {
      const newItem = {
        id: `${selectedFile.name}-${selectedFile.size}`,
        name: selectedFile.name,
        size: selectedFile.size,
        lastOpened: Date.now(),
      };
      setRecentFiles(prev => {
        const filtered = prev.filter(item => item.id !== newItem.id);
        const updated = [newItem, ...filtered].slice(0, 5);
        localStorage.setItem('alpine_recent_files', JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenDemoDoc = async (tool = null, annotate = false) => {
    const demoDoc = await createDemoPDFDocument();
    handleOpenPdf(demoDoc, tool, annotate);
  };

  const handleSelectToolFromHub = async (toolId) => {
    if (toolId === 'sign') {
      await handleOpenDemoDoc('signature', false);
    } else if (toolId === 'annotate') {
      await handleOpenDemoDoc(null, true);
    } else if (toolId === 'extract-text') {
      setDropToast('Open any PDF and use Search in the sidebar to extract text content.');
      setTimeout(() => setDropToast(''), 3500);
    } else {
      setActiveTool(toolId);
    }
  };

  const clearRecentFiles = (e) => {
    e.stopPropagation();
    setRecentFiles([]);
    localStorage.removeItem('alpine_recent_files');
  };

  const removeSingleRecentFile = (e, fileId) => {
    e.stopPropagation();
    setRecentFiles(prev => {
      const filtered = prev.filter(f => f.id !== fileId);
      localStorage.setItem('alpine_recent_files', JSON.stringify(filtered));
      return filtered;
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!file) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles?.length > 0 && droppedFiles[0].type === 'application/pdf') {
      handleOpenPdf(droppedFiles[0]);
    } else {
      setDropToast('Please drop a valid PDF document.');
      setTimeout(() => setDropToast(''), 2800);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.length > 0) {
      handleOpenPdf(e.target.files[0]);
    }
  };

  if (file) {
    return (
      <PDFViewer
        file={file}
        theme={theme}
        onToggleTheme={toggleTheme}
        initialTool={initialViewerTool}
        initialAnnotate={initialAnnotate}
        onClose={() => {
          setFile(null);
          setInitialViewerTool(null);
          setInitialAnnotate(false);
        }}
      />
    );
  }

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        maxWidth: '100vw',
        background: 'var(--bg-color)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── Ambient Background Animated Mesh ── */}
      <div className="ambient-mesh-container">
        <div className="ambient-orb-1" />
        <div className="ambient-orb-2" />
      </div>

      {/* ── Minimal Subtle Toast ── */}
      <AnimatePresence>
        {dropToast && (
          <motion.div
            key="drop-toast"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            style={{
              position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
              zIndex: 999, background: 'var(--accent)', color: 'var(--bg-color)',
              padding: '8px 18px', borderRadius: 99, fontSize: 13, fontWeight: 600,
              boxShadow: 'var(--shadow-lg)', maxWidth: '90vw', textAlign: 'center',
            }}
          >
            {dropToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active Tool Modals ── */}
      <AnimatePresence>
        {activeTool === 'merge' && <MergePDFTool onClose={() => setActiveTool(null)} />}
        {activeTool === 'split' && <SplitPDFTool onClose={() => setActiveTool(null)} />}
        {activeTool === 'organize' && <PageOrganizerModal onClose={() => setActiveTool(null)} />}
        {activeTool === 'watermark' && <WatermarkTool onClose={() => setActiveTool(null)} />}
        {activeTool === 'numbering' && <PageNumberingTool onClose={() => setActiveTool(null)} />}
        {activeTool === 'img-to-pdf' && <ImagesToPDFTool onClose={() => setActiveTool(null)} />}
        {activeTool === 'pdf-to-img' && <PDFToImagesTool onClose={() => setActiveTool(null)} />}
        {activeTool === 'compress' && <CompressPDFTool onClose={() => setActiveTool(null)} />}
        {activeTool === 'gdrive' && (
          <GoogleDrivePickerModal
            onImportFile={(importedFile) => {
              handleOpenPdf(importedFile);
              setActiveTool(null);
            }}
            onClose={() => setActiveTool(null)}
          />
        )}
        {activeTool === 'share' && <SharePDFModal file={file} onClose={() => setActiveTool(null)} />}
        {(activeTool === 'protect' || activeTool === 'sanitize') && (
          <PDFSecurityModal onClose={() => setActiveTool(null)} />
        )}
      </AnimatePresence>

      {/* ── Top Floating Navigation Dock (Zero Overflow Responsive Design) ── */}
      <nav className="glass-panel" style={{ 
        position: 'fixed', top: 14, left: 16, right: 16, 
        height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', zIndex: 50, borderRadius: 'var(--radius-lg)',
      }}>
        {/* Brand Identity & Ecosystem Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 2,
            border: '1px solid var(--glass-border)',
          }}>
            <img 
              src="./favicon.png" 
              alt="MyOx" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: '-0.035em', color: 'var(--text-primary)' }}>
              MyOx
            </span>
            <span className="desktop-only" style={{
              fontSize: 9.5, padding: '2px 6px', borderRadius: 6,
              background: 'var(--accent-soft)', color: 'var(--text-secondary)',
              fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              Alpine Foundations
            </span>
          </div>
        </div>

        {/* Center Segmented Gliding Pill Navigation */}
        <div style={{
          display: 'flex', alignItems: 'center', background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)', padding: 3, gap: 2, position: 'relative',
        }}>
          {[
            { id: 'reader', label: 'Viewer', fullLabel: 'Document Viewer', icon: BookOpen },
            { id: 'tools', label: 'Utilities', fullLabel: 'PDF Utilities', icon: Wand2 },
            { id: 'about', label: 'About', fullLabel: 'About MyOx', icon: Sparkles },
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileTap={{ scale: 0.96 }}
                style={{
                  position: 'relative',
                  padding: '5px 13px',
                  fontSize: 12.5,
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  zIndex: 2,
                  transition: 'color 0.15s ease',
                }}
              >
                {isSelected && (
                  <motion.div
                    layoutId="active-tab-pill"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
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
                <Icon size={13} />
                <span className="desktop-only">{tab.fullLabel}</span>
                <span className="mobile-only">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Right Actions: PWA Install + Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {pwaPrompt && (
            <motion.button
              className="btn btn-primary desktop-only"
              onClick={handleInstallPWA}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              style={{ padding: '5px 10px', fontSize: 11.5, borderRadius: 'var(--radius-sm)', gap: 5 }}
            >
              <DownloadCloud size={12} /> Install
            </motion.button>
          )}

          <motion.button
            className="btn"
            onClick={toggleTheme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            style={{
              padding: 6,
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </motion.button>
        </div>
      </nav>

      {/* ── Main Content Area with Fluid Section Transitions ── */}
      <main style={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 80,
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: 24,
        overflowY: 'auto',
        position: 'relative',
        zIndex: 2,
        width: '100%',
        maxWidth: '100vw',
      }}>
        <AnimatePresence mode="wait">
          {activeTab === 'reader' && (
            <motion.div
              key="reader-view"
              initial={{ opacity: 0, y: 12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.99 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', width: '100%', maxWidth: 540, marginTop: 'auto', marginBottom: 'auto',
                paddingBottom: 32,
              }}
            >
              {/* ── Elevated Focal Dropzone with Shimmer & Spring Dynamics ── */}
              <motion.div
                whileHover={{ y: -3, scale: 1.008 }}
                whileTap={{ scale: 0.992 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                className="glass-panel shimmer-container"
                style={{
                  width: '100%',
                  padding: '40px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isDragging ? '1.5px dashed var(--accent)' : '1px solid var(--glass-border)',
                  backgroundColor: isDragging ? 'var(--accent-soft)' : 'var(--glass-bg)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-xl)',
                  transition: 'border-color 0.22s ease, background-color 0.22s ease, box-shadow 0.22s ease',
                  boxShadow: isDragging ? '0 0 0 4px var(--accent-soft), var(--shadow-xl)' : 'var(--shadow-lg)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  accept="application/pdf"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                
                {/* Glowing Concentric Upload Core */}
                <motion.div 
                  className="pulse-aura"
                  animate={{ scale: isDragging ? 1.18 : 1, y: isDragging ? -5 : 0 }}
                  transition={{ type: 'spring', damping: 16, stiffness: 300 }}
                  style={{
                    width: 62, height: 62, borderRadius: 20,
                    background: 'var(--accent-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 16,
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <UploadCloud size={30} color="var(--text-primary)" strokeWidth={1.8} />
                </motion.div>
                
                <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)', textAlign: 'center' }}>
                  {isDragging ? 'Release to open document' : 'Open a PDF document'}
                </h2>
                <p style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', lineHeight: 1.5, maxWidth: 380 }}>
                  Drag & drop your PDF file here, or click to browse from your device.
                </p>

                {/* Quick Interactive Tool Launchers inside Drop Area */}
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: { transition: { staggerChildren: 0.06 } }
                  }}
                  style={{
                    display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center',
                    marginTop: 20, maxWidth: 440,
                  }}
                >
                  {[
                    { label: 'Sample Guide', icon: Sparkles, action: () => handleOpenDemoDoc() },
                    { label: 'Sign PDF', icon: PenTool, action: () => handleOpenDemoDoc('signature') },
                    { label: 'Merge Files', icon: Files, action: () => setActiveTool('merge') },
                    { label: 'Organize Pages', icon: LayoutGrid, action: () => setActiveTool('organize') },
                  ].map((chip, idx) => {
                    const ChipIcon = chip.icon;
                    return (
                      <motion.div
                        key={idx}
                        variants={{
                          hidden: { opacity: 0, y: 8, scale: 0.94 },
                          visible: { opacity: 1, y: 0, scale: 1 }
                        }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 24 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          chip.action();
                        }}
                        className="hover-lift"
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--surface-card)',
                          border: '1px solid var(--glass-border)',
                          boxShadow: 'var(--shadow-xs)',
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        <ChipIcon size={12} color="var(--text-secondary)" />
                        <span>{chip.label}</span>
                      </motion.div>
                    );
                  })}
                </motion.div>
                
                {/* Security Trust Anchor */}
                <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  <ShieldCheck size={13} color="var(--accent-emerald)" /> Client-Side Privacy • In-Memory Processing by Alpine Foundations
                </div>
              </motion.div>

              {/* ── Recent Documents Section ── */}
              {recentFiles.length > 0 && (
                <div style={{ width: '100%', marginTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={11} /> Recent Documents
                    </span>
                    <button
                      className="btn"
                      onClick={clearRecentFiles}
                      style={{ fontSize: 11, padding: '2px 6px', color: 'var(--text-tertiary)', gap: 4 }}
                      title="Clear recent history"
                    >
                      <Trash2 size={11} /> Clear all
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {recentFiles.map(rf => (
                      <motion.div
                        key={rf.id}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.995 }}
                        onClick={() => fileInputRef.current?.click()}
                        className="glass-panel"
                        style={{
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          background: 'var(--surface-card)',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden' }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 6,
                            background: 'var(--accent-soft)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <File size={14} color="var(--text-secondary)" />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {rf.name}
                            </span>
                            <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                              {formatRelativeTime(rf.lastOpened)} • {formatBytes(rf.size)}
                            </span>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <button
                            className="btn"
                            onClick={(e) => removeSingleRecentFile(e, rf.id)}
                            style={{ padding: 4, color: 'var(--text-tertiary)' }}
                            title="Remove from recents"
                          >
                            <X size={13} />
                          </button>
                          <ChevronRight size={14} color="var(--text-tertiary)" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'tools' && (
            <motion.div
              key="tools-view"
              initial={{ opacity: 0, y: 12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.99 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              style={{ width: '100%', maxWidth: 1040, paddingBottom: 60 }}
            >
              <ToolsHub onSelectTool={handleSelectToolFromHub} />
            </motion.div>
          )}

          {activeTab === 'about' && (
            <motion.div
              key="about-view"
              initial={{ opacity: 0, y: 12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.99 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              style={{ width: '100%', maxWidth: 920, paddingBottom: 60 }}
            >
              <DeveloperPage
                pwaPrompt={pwaPrompt}
                onInstallPWA={handleInstallPWA}
                onBackToViewer={() => setActiveTab('reader')}
                onOpenUtilities={() => setActiveTab('tools')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
