import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, File, Menu, Moon, Sun, Clock, Trash2,
  Wand2, BookOpen, LayoutGrid, Sparkles, FileText, ArrowRight
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
      alert("Please drop a valid PDF file.");
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
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
        position: 'fixed', top: 16, left: 16, right: 16, 
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', zIndex: 50 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-color)',
            fontWeight: 700, fontSize: 16,
          }}>
            A
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
              Alpine Document
              <span style={{
                fontSize: 10, padding: '2px 6px', borderRadius: 6,
                background: 'rgba(0, 113, 227, 0.15)', color: 'var(--accent)',
                fontWeight: 700, letterSpacing: '0.04em'
              }}>
                LAB
              </span>
            </h1>
          </div>
        </div>

        {/* Center View Selector Tabs */}
        <div style={{
          display: 'flex', alignItems: 'center', background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)', borderRadius: 12, padding: 3, gap: 2,
        }}>
          <button
            className="btn"
            onClick={() => setActiveTab('reader')}
            style={{
              padding: '6px 14px', fontSize: 13, gap: 6,
              borderRadius: 9,
              background: activeTab === 'reader' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'reader' ? 'var(--bg-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'reader' ? 600 : 400,
            }}
          >
            <BookOpen size={14} /> Quick Reader
          </button>
          <button
            className="btn"
            onClick={() => setActiveTab('tools')}
            style={{
              padding: '6px 14px', fontSize: 13, gap: 6,
              borderRadius: 9,
              background: activeTab === 'tools' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'tools' ? 'var(--bg-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'tools' ? 600 : 400,
            }}
          >
            <Wand2 size={14} /> All Free Tools
          </button>
        </div>

        {/* Right Actions: Demo doc + Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn"
            onClick={() => handleOpenDemoDoc()}
            style={{
              padding: '6px 12px', fontSize: 12, borderRadius: 10,
              background: 'rgba(0, 113, 227, 0.12)', color: 'var(--accent)',
              border: '1px solid rgba(0, 113, 227, 0.25)', fontWeight: 600, gap: 6,
            }}
          >
            <Sparkles size={14} /> Test Demo PDF
          </button>

          <button
            className="btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            style={{
              padding: 8,
              borderRadius: 10,
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
            }}
          >
            {theme === 'dark' ? (
              <Sun size={18} color="var(--text-primary)" />
            ) : (
              <Moon size={18} color="var(--text-primary)" />
            )}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 90,
        paddingLeft: 20,
        paddingRight: 20,
        overflowY: 'auto',
      }}>
        {activeTab === 'reader' ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', width: '100%', maxWidth: 580, marginTop: 'auto', marginBottom: 'auto',
            paddingBottom: 40,
          }}>
            <AnimatePresence mode="wait">
              <motion.div
                key="upload-zone"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="glass-panel"
                style={{
                  width: '100%',
                  maxWidth: 580,
                  padding: '36px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isDragging ? '2px dashed var(--accent)' : '1px solid var(--glass-border)',
                  transition: 'border 0.3s ease',
                  backgroundColor: isDragging ? 'rgba(0,0,0,0.02)' : 'var(--glass-bg)',
                  cursor: 'pointer',
                  borderRadius: 20,
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
                  animate={{ scale: isDragging ? 1.1 : 1 }}
                  transition={{ type: 'spring', damping: 15 }}
                >
                  <UploadCloud size={48} color={isDragging ? 'var(--accent)' : 'var(--text-secondary)'} strokeWidth={1.5} />
                </motion.div>
                
                <h2 style={{ marginTop: 18, fontSize: 20, fontWeight: 600 }}>
                  {isDragging ? 'Drop PDF here' : 'Open a PDF document'}
                </h2>
                <p style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>
                  Drag and drop any PDF here, or click to browse files locally.
                </p>

                {/* 1-Click Interactive Demo Button */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDemoDoc();
                  }}
                  style={{
                    marginTop: 20,
                    padding: '10px 18px',
                    borderRadius: 12,
                    background: 'rgba(0, 113, 227, 0.12)',
                    border: '1px solid rgba(0, 113, 227, 0.3)',
                    display: 'flex', alignItems: 'center', gap: 8,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Sparkles size={16} color="var(--accent)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                    Open Sample Demo Document (1-Click Test)
                  </span>
                  <ArrowRight size={14} color="var(--accent)" />
                </div>
                
                <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <File size={13} /> 100% Client-Side Privacy: GPU-accelerated & zero server uploads.
                </div>
              </motion.div>
            </AnimatePresence>

            {/* ── Recent Documents Section ── */}
            {recentFiles.length > 0 && (
              <div style={{ width: '100%', maxWidth: 580, marginTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={13} /> Recent Activity
                  </span>
                  <button
                    className="btn"
                    onClick={clearRecentFiles}
                    style={{ fontSize: 11, padding: '2px 6px', color: 'var(--text-secondary)', gap: 4 }}
                    title="Clear recent history"
                  >
                    <Trash2 size={12} /> Clear
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {recentFiles.map(rf => (
                    <div
                      key={rf.id}
                      onClick={() => fileInputRef.current?.click()}
                      className="glass-panel"
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: 12,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                        <File size={16} color="var(--accent)" />
                        <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {rf.name}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', marginLeft: 12 }}>
                        {formatBytes(rf.size)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <ToolsHub onSelectTool={handleSelectToolFromHub} />
        )}
      </main>
    </div>
  );
}
