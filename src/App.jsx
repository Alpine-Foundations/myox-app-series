import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, File, Moon, Sun, Clock, Trash2,
  Wand2, BookOpen, Sparkles, ArrowRight, ShieldCheck
} from 'lucide-react';
import PDFViewer from './PDFViewer';
import ToolsHub from './components/ToolsHub';
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

export default function App() {
  const [activeTab, setActiveTab] = useState('reader'); // 'reader' | 'tools'
  const [activeTool, setActiveTool] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [initialViewerTool, setInitialViewerTool] = useState(null);
  const [initialAnnotate, setInitialAnnotate] = useState(false);
  const [dropToast, setDropToast] = useState('');
  const fileInputRef = useRef(null);

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
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: 'var(--bg-color)' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── Minimal Subtle Toast ── */}
      <AnimatePresence>
        {dropToast && (
          <motion.div
            key="drop-toast"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
              zIndex: 999, background: 'var(--accent)', color: 'var(--bg-color)',
              padding: '8px 18px', borderRadius: 99, fontSize: 13, fontWeight: 500,
              boxShadow: 'var(--shadow-lg)',
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

      {/* Top Navbar */}
      <nav className="glass-panel" style={{ 
        position: 'fixed', top: 16, left: 20, right: 20, 
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', zIndex: 50, borderRadius: 'var(--radius-lg)',
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-color)',
            fontWeight: 700, fontSize: 14, letterSpacing: '-0.03em',
          }}>
            A
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em' }}>
              Alpine Document
            </span>
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 6,
              background: 'var(--accent-soft)', color: 'var(--text-secondary)',
              fontWeight: 600, letterSpacing: '0.04em',
            }}>
              LAB
            </span>
          </div>
        </div>

        {/* Center Segmented Control with Gliding Pill Indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)', padding: 3, gap: 3, position: 'relative',
        }}>
          {[
            { id: 'reader', label: 'Document Viewer', icon: BookOpen },
            { id: 'tools', label: 'PDF Utilities', icon: Wand2 },
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileTap={{ scale: 0.97 }}
                style={{
                  position: 'relative',
                  padding: '5px 14px',
                  fontSize: 13,
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  zIndex: 2,
                  transition: 'color 0.15s ease',
                }}
              >
                {isSelected && (
                  <motion.div
                    layoutId="active-tab-pill"
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
                <Icon size={14} />
                {tab.label}
              </motion.button>
            );
          })}
        </div>

        {/* Right Actions: Test Demo PDF + Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <motion.button
            className="btn btn-soft"
            onClick={() => handleOpenDemoDoc()}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '6px 12px', fontSize: 12, borderRadius: 'var(--radius-sm)',
              fontWeight: 500, gap: 6,
            }}
          >
            <Sparkles size={13} /> Sample Guide
          </motion.button>

          <motion.button
            className="btn"
            onClick={toggleTheme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            style={{
              padding: 7,
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </motion.button>
        </div>
      </nav>

      {/* Main Content Area with Fluid Section Flipping */}
      <main style={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 88,
        paddingLeft: 20,
        paddingRight: 20,
        overflowY: 'auto',
      }}>
        <AnimatePresence mode="wait">
          {activeTab === 'reader' ? (
            <motion.div
              key="reader-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', width: '100%', maxWidth: 540, marginTop: 'auto', marginBottom: 'auto',
                paddingBottom: 40,
              }}
            >
              {/* Drop Card */}
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="glass-panel"
                style={{
                  width: '100%',
                  padding: '40px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isDragging ? '1.5px dashed var(--accent)' : '1px solid var(--glass-border)',
                  backgroundColor: isDragging ? 'var(--accent-soft)' : 'var(--glass-bg)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-xl)',
                  transition: 'border-color 0.2s ease, background-color 0.2s ease',
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
                
                <motion.div 
                  animate={{ scale: isDragging ? 1.08 : 1, y: isDragging ? -3 : 0 }}
                  transition={{ type: 'spring', damping: 20 }}
                  style={{
                    width: 54, height: 54, borderRadius: 16,
                    background: 'var(--accent-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <UploadCloud size={26} color="var(--text-primary)" strokeWidth={1.75} />
                </motion.div>
                
                <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  {isDragging ? 'Release to open document' : 'Open a document'}
                </h2>
                <p style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
                  Drop your PDF file here, or browse from your computer.
                </p>

                {/* 1-Click Interactive Demo Button */}
                <motion.div
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDemoDoc();
                  }}
                  style={{
                    marginTop: 22,
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-card)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex', alignItems: 'center', gap: 8,
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={14} color="var(--text-primary)" />
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                    Explore Sample Guide Document
                  </span>
                  <ArrowRight size={13} color="var(--text-secondary)" />
                </motion.div>
                
                <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-tertiary)' }}>
                  <ShieldCheck size={13} /> Client-Side Processing • Your files never leave your device
                </div>
              </motion.div>

              {/* ── Recent Documents Section ── */}
              {recentFiles.length > 0 && (
                <div style={{ width: '100%', marginTop: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={12} /> Recent Documents
                    </span>
                    <button
                      className="btn"
                      onClick={clearRecentFiles}
                      style={{ fontSize: 11, padding: '2px 6px', color: 'var(--text-tertiary)', gap: 4 }}
                      title="Clear recent history"
                    >
                      <Trash2 size={11} /> Clear
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {recentFiles.map(rf => (
                      <motion.div
                        key={rf.id}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => fileInputRef.current?.click()}
                        className="glass-panel"
                        style={{
                          padding: '9px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          background: 'var(--surface-card)',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                          <File size={15} color="var(--text-secondary)" />
                          <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {rf.name}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', marginLeft: 12 }}>
                          {formatBytes(rf.size)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="tools-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              style={{ width: '100%', maxWidth: 1040, paddingBottom: 60 }}
            >
              <ToolsHub onSelectTool={handleSelectToolFromHub} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
