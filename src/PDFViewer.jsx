import {
  useState, useEffect, useRef, useCallback, useMemo, memo,
  startTransition
} from 'react';
import { Document, Page, Outline, pdfjs } from 'react-pdf';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ZoomIn, ZoomOut, Search, LayoutList, X, ChevronUp, ChevronDown,
  RotateCw, Moon, Sun, Maximize, Minimize, Bookmark, Download,
  Printer, BookOpen, Copy, Check, Sparkles, Wand2, LayoutGrid,
  Scissors, Stamp, Hash, FileImage, ShieldAlert, PenTool, CheckCircle,
  Undo2, Redo2, Pencil, MessageSquare, Square, Circle, ArrowUpRight,
  Highlighter, Share2, Minimize2, Palette, Trash2, Edit3, Sliders, Type, CheckSquare
} from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import SplitPDFTool from './components/tools/SplitPDFTool';
import PageOrganizerModal from './components/tools/PageOrganizerModal';
import WatermarkTool from './components/tools/WatermarkTool';
import PageNumberingTool from './components/tools/PageNumberingTool';
import PDFToImagesTool from './components/tools/PDFToImagesTool';
import PDFSecurityModal from './components/tools/PDFSecurityModal';
import CompressPDFTool from './components/tools/CompressPDFTool';
import SharePDFModal from './components/tools/SharePDFModal';
import SignatureModal from './components/SignatureModal';
import PDFAnnotationOverlay from './components/PDFAnnotationOverlay';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { downloadFile } from './utils/pdfEngine';

pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ─── Tuning knobs ─────────────────────────────────────────────────────────────
const RENDER_BUFFER   = 3;     // pages above/below current to keep mounted
const THUMB_WIDTH     = 128;
const ZOOM_STEP       = 0.2;
const MIN_ZOOM        = 0.4;
const MAX_ZOOM        = 3.0;
const SCROLL_PX       = 200;   // px per arrow keypress
const DEFAULT_AR      = 1.294; // A4 height/width fallback aspect ratio

// ─── Search text highlighting helper ──────────────────────────────────────────
function highlightMatches(text, query, pageNumber, activeMatch) {
  if (!query || !query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (regex.test(part)) {
      const isActive = activeMatch && activeMatch.pageNumber === pageNumber;
      return (
        <mark
          key={index}
          className={`pdf-search-match ${isActive ? 'active-pdf-match' : ''}`}
          data-page={pageNumber}
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

// ─── Lazy sidebar thumbnail ───────────────────────────────────────────────────
const SidebarThumb = memo(function SidebarThumb({ num, rotation, isActive, onClick }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { rootMargin: '200px 0px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      id={`thumb-${num}`}
      onClick={() => onClick(num)}
      style={{
        cursor: 'pointer',
        borderRadius: 6,
        padding: 4,
        border: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        transition: 'border-color 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
        flexShrink: 0,
      }}
    >
      <div style={{
        width: THUMB_WIDTH,
        height: Math.round(THUMB_WIDTH * DEFAULT_AR),
        boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
        borderRadius: 4,
        overflow: 'hidden',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {visible ? (
          <Page
            pageNumber={num}
            width={THUMB_WIDTH}
            rotate={rotation}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={
              <div style={{ width: THUMB_WIDTH, height: Math.round(THUMB_WIDTH * DEFAULT_AR), background: 'var(--glass-bg)' }} />
            }
          />
        ) : (
          <div style={{ width: THUMB_WIDTH, height: Math.round(THUMB_WIDTH * DEFAULT_AR), background: 'var(--glass-bg)' }} />
        )}
      </div>
      <span style={{ fontSize: 11, color: isActive ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: isActive ? 600 : 400 }}>
        {num}
      </span>
    </div>
  );
});

// ─── Virtual page with Annotations & Signatures ──────────────────────────────────────────
const VirtualPage = memo(function VirtualPage({
  pageNumber,
  scale,
  rotation,
  pageWidth,
  isDarkMode,
  searchQuery,
  activeMatch,
  placedSignatures,
  annotations,
  activeAnnotateTool,
  annotateColor,
  annotateStrokeWidth,
  annotateOpacity,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onPageClick,
  inRange,
  cachedHeight,
  onVisible,
  onMeasured,
}) {
  const wrapRef   = useRef(null);
  const measured  = useRef(false);

  // IntersectionObserver to report current reading page
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) onVisible(pageNumber); },
      { rootMargin: '400px 0px', threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [pageNumber, onVisible]);

  // Measure exact height once after real Page renders
  const handleRenderSuccess = useCallback(() => {
    if (measured.current || !wrapRef.current) return;
    measured.current = true;
    onMeasured(pageNumber, wrapRef.current.offsetHeight);
  }, [pageNumber, onMeasured]);

  const customTextRenderer = useCallback(
    ({ str }) => highlightMatches(str, searchQuery, pageNumber, activeMatch),
    [searchQuery, pageNumber, activeMatch]
  );

  const placeholderH = cachedHeight ?? Math.round(pageWidth * DEFAULT_AR);

  // Filter signatures placed on this specific page
  const pageSigs = placedSignatures?.filter(s => s.pageNumber === pageNumber) || [];

  return (
    <div
      ref={wrapRef}
      id={`page-${pageNumber}`}
      onClick={(e) => onPageClick && onPageClick(e, pageNumber)}
      style={{
        marginBottom: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        contain: 'layout',
        minHeight: placeholderH + 26,
        position: 'relative',
      }}
    >
      {inRange ? (
        <>
          <div
            className={isDarkMode ? 'pdf-dark-mode' : ''}
            style={{
              boxShadow: '0 2px 24px rgba(0,0,0,0.10)',
              borderRadius: 4,
              overflow: 'hidden',
              lineHeight: 0,
              backgroundColor: '#ffffff',
              transition: 'transform 0.2s ease',
              position: 'relative',
            }}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              width={pageWidth}
              renderTextLayer
              renderAnnotationLayer
              customTextRenderer={searchQuery ? customTextRenderer : undefined}
              onRenderSuccess={handleRenderSuccess}
              loading={
                <div style={{
                  width: pageWidth,
                  height: placeholderH,
                  background: 'var(--glass-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                }}>
                  {pageNumber}
                </div>
              }
            />

            {/* Placed signatures on this page */}
            {pageSigs.map(sig => (
              <div
                key={sig.id}
                style={{
                  position: 'absolute',
                  left: sig.x,
                  top: sig.y,
                  width: 140,
                  pointerEvents: 'none',
                  zIndex: 20,
                }}
              >
                <img src={sig.dataUrl} alt="Signature" style={{ width: '100%', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
              </div>
            ))}

            {/* In-Viewer Annotation Overlay */}
            <PDFAnnotationOverlay
              pageNumber={pageNumber}
              pageWidth={pageWidth}
              pageHeight={placeholderH}
              scale={scale}
              activeTool={activeAnnotateTool}
              strokeColor={annotateColor}
              strokeWidth={annotateStrokeWidth}
              opacity={annotateOpacity}
              annotations={annotations}
              onAddAnnotation={onAddAnnotation}
              onUpdateAnnotation={onUpdateAnnotation}
              onDeleteAnnotation={onDeleteAnnotation}
            />
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
            {pageNumber}
          </div>
        </>
      ) : (
        <div style={{
          width: pageWidth,
          height: placeholderH,
          background: 'var(--glass-bg)',
          borderRadius: 4,
          opacity: 0.4,
        }} />
      )}
    </div>
  );
});

export default function PDFViewer({ file: initialFile, theme = 'light', onToggleTheme, onClose }) {
  const [file, setFile] = useState(initialFile);
  const [customDocName, setCustomDocName] = useState(() => initialFile?.name || 'document.pdf');
  const [isRenamingDoc, setIsRenamingDoc] = useState(false);
  const renameInputRef = useRef(null);

  useEffect(() => {
    setFile(initialFile);
    if (initialFile?.name) setCustomDocName(initialFile.name);
  }, [initialFile]);

  const [pdfDocument,    setPdfDocument]   = useState(null);
  const [numPages,       setNumPages]      = useState(null);
  const [scale,          setScale]         = useState(1.0);
  const [rotation,       setRotation]      = useState(0);
  const [currentPage,    setCurrentPage]   = useState(1);
  const [showSidebar,    setShowSidebar]   = useState(true);
  const [sidebarTab,     setSidebarTab]    = useState('thumbnails'); // 'thumbnails' | 'outline' | 'search'
  const [viewMode,       setViewMode]      = useState('single'); // 'single' | 'two-page'
  
  // Power Tools State
  const [showToolsMenu,    setShowToolsMenu]    = useState(false);
  const [activeViewerTool, setActiveViewerTool] = useState(null);
  const [pendingSignature, setPendingSignature] = useState(null);
  const [placedSignatures, setPlacedSignatures] = useState([]);

  // Annotation Studio State
  const [isAnnotateMode,     setIsAnnotateMode]     = useState(false);
  const [activeAnnotateTool, setActiveAnnotateTool] = useState(null); // 'pen' | 'highlighter' | 'text' | 'comment' | 'rect' | 'circle' | 'arrow'
  const [annotateColor,      setAnnotateColor]      = useState('#ff0055');
  const [annotateStrokeWidth,setAnnotateStrokeWidth]= useState(3);
  const [annotateOpacity,    setAnnotateOpacity]    = useState(1.0);
  const [annotations,        setAnnotations]        = useState([]);

  // Universal Undo / Redo History Stack
  const [history, setHistory] = useState([]);
  const [future,  setFuture]  = useState([]);

  // Search state
  const [searchQuery,      setSearchQuery]      = useState('');
  const [searchResults,    setSearchResults]    = useState([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const [isSearching,      setIsSearching]      = useState(false);

  // Floating text selection toolbar
  const [selectionBox,   setSelectionBox]  = useState(null);
  const [selectedText,   setSelectedText]  = useState('');
  const [copiedToast,    setCopiedToast]   = useState(false);

  const [isDarkMode,     setIsDarkMode]    = useState(() => theme === 'dark');
  const [isFullscreen,   setIsFullscreen]  = useState(false);
  const [hasOutline,     setHasOutline]    = useState(null);
  const [loadError,      setLoadError]     = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const searchInputRef = useRef(null);
  const currentRef     = useRef(1);
  const numRef         = useRef(null);
  const scaleRef       = useRef(1.0);
  const mainRef        = useRef(null);
  const sidebarRef     = useRef(null);
  const heightCache    = useRef({});
  const pageTextCache  = useRef(new Map());

  const [renderCenter, setRenderCenter] = useState(1);

  // Focus rename input on rename mode
  useEffect(() => {
    if (isRenamingDoc && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenamingDoc]);

  // Record history snapshot helper
  const recordSnapshot = useCallback(() => {
    setHistory(prev => [
      ...prev.slice(-25), // keep up to 25 history states
      {
        file,
        customDocName,
        placedSignatures: [...placedSignatures],
        annotations: [...annotations],
        rotation,
      }
    ]);
    setFuture([]); // clear redo stack on new action
  }, [file, customDocName, placedSignatures, annotations, rotation]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setFuture(prev => [
      {
        file,
        customDocName,
        placedSignatures: [...placedSignatures],
        annotations: [...annotations],
        rotation,
      },
      ...prev
    ]);
    setHistory(prev => prev.slice(0, prev.length - 1));

    // Restore state
    setFile(lastState.file);
    setCustomDocName(lastState.customDocName);
    setPlacedSignatures(lastState.placedSignatures);
    setAnnotations(lastState.annotations);
    setRotation(lastState.rotation);
  }, [history, file, customDocName, placedSignatures, annotations, rotation]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const nextState = future[0];
    setHistory(prev => [
      ...prev,
      {
        file,
        customDocName,
        placedSignatures: [...placedSignatures],
        annotations: [...annotations],
        rotation,
      }
    ]);
    setFuture(prev => prev.slice(1));

    // Restore state
    setFile(nextState.file);
    setCustomDocName(nextState.customDocName);
    setPlacedSignatures(nextState.placedSignatures);
    setAnnotations(nextState.annotations);
    setRotation(nextState.rotation);
  }, [future, file, customDocName, placedSignatures, annotations, rotation]);

  // Annotations management with history recording
  const handleAddAnnotation = useCallback((newAnn) => {
    recordSnapshot();
    setAnnotations(prev => [...prev, newAnn]);
  }, [recordSnapshot]);

  const handleUpdateAnnotation = useCallback((id, patch) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  }, []);

  const handleDeleteAnnotation = useCallback((id) => {
    recordSnapshot();
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }, [recordSnapshot]);

  // Sync internal dark mode with app theme
  useEffect(() => {
    setIsDarkMode(theme === 'dark');
  }, [theme]);

  const handleToggleDarkMode = useCallback(() => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      setIsDarkMode(prev => {
        const next = !prev;
        document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
        return next;
      });
    }
  }, [onToggleTheme]);

  // Keep refs in sync
  useEffect(() => { currentRef.current = currentPage; }, [currentPage]);
  useEffect(() => { numRef.current     = numPages;    }, [numPages]);
  useEffect(() => { scaleRef.current   = scale;       }, [scale]);

  // Measure main viewport width for responsive page sizing
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute responsive page width based on zoom & two-page spread
  const pageWidth = useMemo(() => {
    if (!containerWidth) return 600;
    const padding = 48;
    const baseW = viewMode === 'two-page'
      ? Math.max(280, (containerWidth - padding * 2 - 20) / 2)
      : Math.max(320, containerWidth - padding * 2);
    return Math.round(baseW * scale);
  }, [containerWidth, scale, viewMode]);

  // Document load callbacks
  const onDocumentLoad = useCallback((pdf) => {
    setPdfDocument(pdf);
    setNumPages(pdf.numPages);
    setLoadError(null);
  }, []);

  const onDocumentError = useCallback((err) => {
    console.error('PDF load error:', err);
    setLoadError(err.message || 'Failed to load PDF document.');
  }, []);

  // Window scroll navigation
  const scrollToPage = useCallback((num) => {
    if (!numPages) return;
    const clamped = Math.max(1, Math.min(numPages, num));
    const target = document.getElementById(`page-${clamped}`);
    if (target && mainRef.current) {
      mainRef.current.scrollTo({
        top: target.offsetTop - 20,
        behavior: 'smooth',
      });
    }
    setCurrentPage(clamped);
    setRenderCenter(clamped);
  }, [numPages]);

  const handleVisible = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
    startTransition(() => {
      setRenderCenter(pageNumber);
    });
  }, []);

  const handleMeasured = useCallback((pageNumber, height) => {
    heightCache.current[pageNumber] = height;
  }, []);

  // Pre-index text content for ultra-fast instant searching
  useEffect(() => {
    if (!pdfDocument || !numPages) return;
    let isCancelled = false;

    const indexAllPages = async () => {
      for (let i = 1; i <= numPages; i++) {
        if (isCancelled) break;
        if (!pageTextCache.current.has(i)) {
          try {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();
            const fullText = textContent.items.map(item => item.str).join(' ');
            pageTextCache.current.set(i, fullText);
          } catch (e) {
            // Ignore page index errors
          }
        }
      }
    };

    indexAllPages();
    return () => { isCancelled = true; };
  }, [pdfDocument, numPages]);

  // Full-document ultra-fast search execution
  useEffect(() => {
    if (!searchQuery.trim() || !numPages) {
      setSearchResults([]);
      setActiveMatchIndex(-1);
      return;
    }

    setIsSearching(true);
    const query = searchQuery.toLowerCase().trim();
    const matches = [];

    const runSearch = async () => {
      for (let p = 1; p <= numPages; p++) {
        let text = pageTextCache.current.get(p);
        if (!text && pdfDocument) {
          try {
            const page = await pdfDocument.getPage(p);
            const tc = await page.getTextContent();
            text = tc.items.map(item => item.str).join(' ');
            pageTextCache.current.set(p, text);
          } catch {
            text = '';
          }
        }

        if (text) {
          const lower = text.toLowerCase();
          let pos = 0;
          while ((pos = lower.indexOf(query, pos)) !== -1) {
            const snippetStart = Math.max(0, pos - 30);
            const snippetEnd = Math.min(text.length, pos + query.length + 30);
            const snippet = (snippetStart > 0 ? '…' : '') + text.substring(snippetStart, snippetEnd) + (snippetEnd < text.length ? '…' : '');

            matches.push({
              pageNumber: p,
              snippet,
              index: matches.length,
            });
            pos += query.length;
          }
        }
      }

      setSearchResults(matches);
      setIsSearching(false);

      if (matches.length > 0) {
        setActiveMatchIndex(0);
        scrollToPage(matches[0].pageNumber);
      } else {
        setActiveMatchIndex(-1);
      }
    };

    const timer = setTimeout(runSearch, 120);
    return () => clearTimeout(timer);
  }, [searchQuery, numPages, pdfDocument, scrollToPage]);

  // Search Next/Prev handlers
  const handleNextMatch = useCallback(() => {
    if (searchResults.length === 0) return;
    const nextIdx = (activeMatchIndex + 1) % searchResults.length;
    setActiveMatchIndex(nextIdx);
    scrollToPage(searchResults[nextIdx].pageNumber);
  }, [searchResults, activeMatchIndex, scrollToPage]);

  const handlePrevMatch = useCallback(() => {
    if (searchResults.length === 0) return;
    const prevIdx = (activeMatchIndex - 1 + searchResults.length) % searchResults.length;
    setActiveMatchIndex(prevIdx);
    scrollToPage(searchResults[prevIdx].pageNumber);
  }, [searchResults, activeMatchIndex, scrollToPage]);

  // Active match data
  const activeMatch = useMemo(() => {
    if (activeMatchIndex >= 0 && activeMatchIndex < searchResults.length) {
      return searchResults[activeMatchIndex];
    }
    return null;
  }, [searchResults, activeMatchIndex]);

  // Text selection tracking
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setSelectionBox(null);
        setSelectedText('');
        return;
      }

      const text = selection.toString().trim();
      if (text.length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectedText(text);
        setSelectionBox({
          top: Math.max(10, rect.top - 46),
          left: Math.max(10, rect.left + rect.width / 2 - 80),
        });
      }
    };

    document.addEventListener('mouseup', handleSelectionChange);
    return () => document.removeEventListener('mouseup', handleSelectionChange);
  }, []);

  // Zoom controls
  const zoomIn  = useCallback(() => setScale(s => Math.min(MAX_ZOOM, +(s + ZOOM_STEP).toFixed(1))), []);
  const zoomOut = useCallback(() => setScale(s => Math.max(MIN_ZOOM, +(s - ZOOM_STEP).toFixed(1))), []);
  const rotate  = useCallback(() => {
    recordSnapshot();
    setRotation(r => (r + 90) % 360);
  }, [recordSnapshot]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Keyboard shortcuts (including Ctrl+Z for Undo, Ctrl+Y for Redo, Ctrl+F for Search)
  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Search (Ctrl+F)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        mainRef.current?.scrollBy({ top: SCROLL_PX, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        mainRef.current?.scrollBy({ top: -SCROLL_PX, behavior: 'smooth' });
      } else if (e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        scrollToPage(currentRef.current + 1);
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        scrollToPage(currentRef.current - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        scrollToPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        scrollToPage(numRef.current ?? 1);
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      } else if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        rotate();
      } else if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
        setShowSidebar(v => !v);
      } else if (e.key === 'Escape') {
        setIsAnnotateMode(false);
        setActiveAnnotateTool(null);
        setSelectionBox(null);
        setPendingSignature(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scrollToPage, zoomIn, zoomOut, rotate, handleUndo, handleRedo]);

  // Download File handler baking signatures and annotations
  const handleDownload = useCallback(async () => {
    if (!file) return;

    if (placedSignatures.length > 0 || annotations.length > 0) {
      try {
        const fileBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const pages = pdfDoc.getPages();

        // Bake digital signatures
        for (const sig of placedSignatures) {
          const targetPage = pages[sig.pageNumber - 1];
          if (!targetPage) continue;

          const base64Data = sig.dataUrl.split(',')[1];
          const binaryString = atob(base64Data);
          const sigBytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            sigBytes[i] = binaryString.charCodeAt(i);
          }

          const embeddedSig = await pdfDoc.embedPng(sigBytes);
          const { width: pageW, height: pageH } = targetPage.getSize();

          const scaleRatio = pageW / (pageWidth || 600);
          const sigW = 160 * scaleRatio;
          const sigH = (160 * (embeddedSig.height / embeddedSig.width)) * scaleRatio;

          const sigX = sig.x * scaleRatio;
          const sigY = pageH - (sig.y * scaleRatio) - sigH;

          targetPage.drawImage(embeddedSig, {
            x: Math.max(0, sigX),
            y: Math.max(0, sigY),
            width: sigW,
            height: sigH,
          });
        }

        // Bake text block annotations
        for (const ann of annotations) {
          if (ann.type === 'text' && ann.content) {
            const targetPage = pages[ann.pageNumber - 1];
            if (!targetPage) continue;
            const { width: pageW, height: pageH } = targetPage.getSize();
            const scaleRatio = pageW / (pageWidth || 600);

            const hex = (ann.color || '#ff0055').replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
            const g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
            const b = parseInt(hex.substring(4, 6), 16) / 255 || 0;

            targetPage.drawText(ann.content, {
              x: ann.x * scaleRatio,
              y: pageH - (ann.y * scaleRatio) - 16,
              size: (ann.fontSize || 16) * scaleRatio,
              font,
              color: rgb(r, g, b),
            });
          }
        }

        const signedBytes = await pdfDoc.save();
        const exportName = customDocName || file.name || 'document.pdf';
        downloadFile(signedBytes, exportName.startsWith('signed_') ? exportName : `signed_${exportName}`);
        return;
      } catch (err) {
        console.error('Error baking annotations into PDF:', err);
      }
    }

    const url = typeof file === 'string' ? file : URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = customDocName || file.name || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (typeof file !== 'string') {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }, [file, customDocName, placedSignatures, annotations, pageWidth]);

  // Copy selected text
  const handleCopySelection = useCallback(() => {
    if (!selectedText) return;
    navigator.clipboard.writeText(selectedText);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 1800);
    setSelectionBox(null);
  }, [selectedText]);

  // Search selected text
  const handleSearchSelection = useCallback(() => {
    if (!selectedText) return;
    setSearchQuery(selectedText);
    setSidebarTab('search');
    setShowSidebar(true);
    setSelectionBox(null);
  }, [selectedText]);

  // Handle signature stamp placement click on a page
  const handlePageClick = (e, pageNumber) => {
    if (!pendingSignature) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 70;
    const y = e.clientY - rect.top - 35;

    recordSnapshot();
    setPlacedSignatures(prev => [
      ...prev,
      {
        id: `sig-${Date.now()}`,
        pageNumber,
        x: Math.max(10, x),
        y: Math.max(10, y),
        dataUrl: pendingSignature,
      }
    ]);
    setPendingSignature(null);
  };

  // Render range calculation for virtual scrolling
  const renderMin = Math.max(1, renderCenter - RENDER_BUFFER);
  const renderMax = numPages ? Math.min(numPages, renderCenter + RENDER_BUFFER) : 1;

  // Build page rows for two-page spread or single-page layout
  const pageRows = useMemo(() => {
    if (!numPages) return [];
    const rows = [];
    if (viewMode === 'two-page') {
      rows.push([1]);
      for (let i = 2; i <= numPages; i += 2) {
        if (i + 1 <= numPages) {
          rows.push([i, i + 1]);
        } else {
          rows.push([i]);
        }
      }
    } else {
      for (let i = 1; i <= numPages; i++) {
        rows.push([i]);
      }
    }
    return rows;
  }, [numPages, viewMode]);

  const pageNums = useMemo(() => {
    if (!numPages) return [];
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }, [numPages]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-primary)',
      overflow: 'hidden',
    }}>
      {/* ── Active Tool Modals ── */}
      <AnimatePresence>
        {activeViewerTool === 'organize' && (
          <PageOrganizerModal
            initialFile={file}
            onClose={() => setActiveViewerTool(null)}
            onUpdateDocument={(newFile) => {
              recordSnapshot();
              setFile(newFile);
              setActiveViewerTool(null);
            }}
          />
        )}
        {activeViewerTool === 'split' && (
          <SplitPDFTool initialFile={file} onClose={() => setActiveViewerTool(null)} />
        )}
        {activeViewerTool === 'watermark' && (
          <WatermarkTool
            initialFile={file}
            onClose={() => setActiveViewerTool(null)}
            onUpdateDocument={(newFile) => {
              recordSnapshot();
              setFile(newFile);
              setActiveViewerTool(null);
            }}
          />
        )}
        {activeViewerTool === 'numbering' && (
          <PageNumberingTool
            initialFile={file}
            onClose={() => setActiveViewerTool(null)}
            onUpdateDocument={(newFile) => {
              recordSnapshot();
              setFile(newFile);
              setActiveViewerTool(null);
            }}
          />
        )}
        {activeViewerTool === 'compress' && (
          <CompressPDFTool
            initialFile={file}
            onClose={() => setActiveViewerTool(null)}
            onUpdateDocument={(newFile) => {
              recordSnapshot();
              setFile(newFile);
              setActiveViewerTool(null);
            }}
          />
        )}
        {activeViewerTool === 'share' && (
          <SharePDFModal file={file} onClose={() => setActiveViewerTool(null)} />
        )}
        {activeViewerTool === 'pdf-to-img' && (
          <PDFToImagesTool initialFile={file} onClose={() => setActiveViewerTool(null)} />
        )}
        {activeViewerTool === 'sanitize' && (
          <PDFSecurityModal
            initialFile={file}
            onClose={() => setActiveViewerTool(null)}
            onUpdateDocument={(newFile) => {
              recordSnapshot();
              setFile(newFile);
              setActiveViewerTool(null);
            }}
          />
        )}
        {activeViewerTool === 'signature' && (
          <SignatureModal
            onSaveSignature={(dataUrl) => {
              setPendingSignature(dataUrl);
              setActiveViewerTool(null);
            }}
            onClose={() => setActiveViewerTool(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Signature Placement Banner ── */}
      <AnimatePresence>
        {pendingSignature && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed', top: 76, left: '50%', transform: 'translateX(-50%)',
              zIndex: 150, background: '#af52de', color: '#ffffff',
              padding: '8px 20px', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13, fontWeight: 500, boxShadow: '0 8px 30px rgba(175, 82, 222, 0.4)',
            }}
          >
            <PenTool size={16} /> Click anywhere on any page to stamp your signature
            <button
              className="btn"
              onClick={() => setPendingSignature(null)}
              style={{ color: '#ffffff', padding: 2, marginLeft: 8 }}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Annotation & Markup Toolbar ── */}
      <AnimatePresence>
        {isAnnotateMode && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="glass-panel"
            style={{
              position: 'fixed', top: 76, left: '50%', transform: 'translateX(-50%)',
              zIndex: 140, background: 'var(--bg-color)', padding: '6px 14px',
              borderRadius: 16, display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 12px 36px rgba(0,0,0,0.25)', border: '1px solid var(--glass-border)',
            }}
          >
            {[
              { id: 'pen', label: 'Draw Pen', icon: Edit3 },
              { id: 'highlighter', label: 'Highlighter', icon: Highlighter },
              { id: 'text', label: 'Add Text Block', icon: Type },
              { id: 'comment', label: 'Sticky Note Comment', icon: MessageSquare },
              { id: 'rect', label: 'Rectangle Shape', icon: Square },
              { id: 'circle', label: 'Circle Shape', icon: Circle },
              { id: 'arrow', label: 'Arrow Shape', icon: ArrowUpRight },
            ].map(t => {
              const Icon = t.icon;
              const isSelected = activeAnnotateTool === t.id;
              return (
                <button
                  key={t.id}
                  className="btn"
                  onClick={() => setActiveAnnotateTool(isSelected ? null : t.id)}
                  style={{
                    padding: '6px 10px', fontSize: 12, gap: 5, borderRadius: 8,
                    background: isSelected ? 'var(--accent)' : 'var(--glass-bg)',
                    color: isSelected ? 'var(--bg-color)' : 'var(--text-primary)',
                  }}
                  title={t.label}
                >
                  <Icon size={14} />
                  <span style={{ display: 'none' }}>{t.label}</span>
                </button>
              );
            })}

            <div style={{ width: 1, height: 18, background: 'var(--glass-border)' }} />

            {/* Color Swatch / Native Color Picker */}
            <input
              type="color"
              value={annotateColor}
              onChange={e => setAnnotateColor(e.target.value)}
              style={{ width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent' }}
              title="Annotation Color"
            />

            {/* Stroke Width Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {[2, 4, 8].map(w => (
                <button
                  key={w}
                  className="btn"
                  onClick={() => setAnnotateStrokeWidth(w)}
                  style={{
                    width: 24, height: 24, padding: 0, borderRadius: 6,
                    background: annotateStrokeWidth === w ? 'var(--accent)' : 'transparent',
                    color: annotateStrokeWidth === w ? 'var(--bg-color)' : 'var(--text-secondary)',
                    fontSize: 11, fontWeight: 600,
                  }}
                >
                  {w}
                </button>
              ))}
            </div>

            {/* Clear all annotations button */}
            {annotations.length > 0 && (
              <button
                className="btn"
                onClick={() => { recordSnapshot(); setAnnotations([]); }}
                style={{ padding: '4px 8px', color: '#ff3b30', fontSize: 11, gap: 4 }}
                title="Clear all annotations"
              >
                <Trash2 size={13} /> Clear
              </button>
            )}

            <button
              className="btn"
              onClick={() => { setIsAnnotateMode(false); setActiveAnnotateTool(null); }}
              style={{ padding: 4 }}
              title="Close annotation toolbar"
            >
              <X size={14} color="var(--text-secondary)" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Text Selection Toolbar ── */}
      {selectionBox && (
        <div
          className="selection-toolbar"
          style={{ top: selectionBox.top, left: selectionBox.left }}
        >
          <button className="btn" onClick={handleCopySelection} title="Copy selected text" style={{ padding: '4px 8px', fontSize: 12, gap: 4 }}>
            <Copy size={13} /> Copy
          </button>
          <div style={{ width: 1, height: 16, background: 'var(--glass-border)' }} />
          <button className="btn" onClick={handleSearchSelection} title="Find this phrase in document" style={{ padding: '4px 8px', fontSize: 12, gap: 4 }}>
            <Search size={13} /> Search
          </button>
        </div>
      )}

      {/* ── Copied Feedback Toast ── */}
      <AnimatePresence>
        {copiedToast && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            style={{
              position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)',
              zIndex: 300, background: 'var(--accent)', color: 'var(--bg-color)',
              padding: '8px 16px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 500, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
          >
            <Check size={14} /> Text copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Top Navbar ── */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 180 }}
        className="glass-panel"
        style={{
          position: 'fixed', top: 12, left: 16, right: 16,
          height: 56, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 16px', zIndex: 100,
        }}
      >
        {/* Left Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn" onClick={onClose} title="Close Document" style={{ padding: 6 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
          <div style={{ width: 1, height: 20, background: 'var(--glass-border)' }} />

          {/* Sidebar toggle */}
          <motion.button
            className="btn"
            onClick={() => setShowSidebar(v => !v)}
            title="Toggle Sidebar (S)"
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.08 }}
            style={{
              padding: 6,
              background: showSidebar ? 'var(--accent)' : 'transparent',
              borderRadius: 8,
              transition: 'background 0.2s ease',
            }}
          >
            <LayoutList size={18} color={showSidebar ? 'var(--bg-color)' : 'var(--text-secondary)'} />
          </motion.button>

          {/* Undo / Redo buttons */}
          <button
            className="btn"
            disabled={history.length === 0}
            onClick={handleUndo}
            title="Undo last action (Ctrl+Z)"
            style={{ padding: 5, opacity: history.length > 0 ? 1 : 0.35 }}
          >
            <Undo2 size={16} />
          </button>
          <button
            className="btn"
            disabled={future.length === 0}
            onClick={handleRedo}
            title="Redo action (Ctrl+Y / Ctrl+Shift+Z)"
            style={{ padding: 5, opacity: future.length > 0 ? 1 : 0.35 }}
          >
            <Redo2 size={16} />
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--glass-border)' }} />

          {/* Document Title with Pencil Rename Support */}
          {isRenamingDoc ? (
            <input
              ref={renameInputRef}
              type="text"
              value={customDocName}
              onChange={e => setCustomDocName(e.target.value)}
              onBlur={() => setIsRenamingDoc(false)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  recordSnapshot();
                  setIsRenamingDoc(false);
                }
              }}
              className="doc-title-input"
              style={{ width: 160 }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                onDoubleClick={() => setIsRenamingDoc(true)}
                title="Double click or click pencil to rename"
                style={{
                  fontSize: 13, fontWeight: 600,
                  maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {customDocName}
              </span>
              <button
                className="btn"
                onClick={() => setIsRenamingDoc(true)}
                title="Rename PDF"
                style={{ padding: 3 }}
              >
                <Pencil size={13} color="var(--text-secondary)" />
              </button>
            </div>
          )}

          {numPages && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              — {numPages}p
            </span>
          )}
        </div>

        {/* Center / Navigation & Markup Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {numPages && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className="btn" onClick={() => scrollToPage(currentPage - 1)} style={{ padding: 4 }} title="Previous Page (PgUp)">
                <ChevronUp size={16} color="var(--text-secondary)" />
              </button>
              <span style={{ fontSize: 13, minWidth: 64, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                {currentPage} / {numPages}
              </span>
              <button className="btn" onClick={() => scrollToPage(currentPage + 1)} style={{ padding: 4 }} title="Next Page (PgDn)">
                <ChevronDown size={16} color="var(--text-secondary)" />
              </button>
            </div>
          )}

          {/* Annotate & Markup Toggle */}
          <button
            className="btn"
            onClick={() => {
              setIsAnnotateMode(v => !v);
              if (!isAnnotateMode) setActiveAnnotateTool('pen');
              else setActiveAnnotateTool(null);
            }}
            title="Edit & Annotate PDF (Draw, Text Blocks, Shapes, Comments)"
            style={{
              padding: '5px 10px', borderRadius: 8, fontSize: 12, gap: 5,
              background: isAnnotateMode ? 'var(--accent)' : 'var(--glass-bg)',
              color: isAnnotateMode ? 'var(--bg-color)' : 'var(--text-primary)',
              border: '1px solid var(--glass-border)', fontWeight: 600,
            }}
          >
            <Edit3 size={14} /> Annotate
          </button>
        </div>

        {/* Right Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          
          {/* ── Ultra Fast Search Bar with Auto-Focus & Neon Highlights ── */}
          <div style={{
            position: 'relative', display: 'flex', alignItems: 'center',
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
            borderRadius: 10, padding: '2px 6px 2px 28px',
          }}>
            <Search size={14} color="var(--text-secondary)"
              style={{ position: 'absolute', left: 9, pointerEvents: 'none' }} />
            
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search in doc…"
              value={searchQuery}
              onFocus={e => e.target.select()}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: 13, outline: 'none',
                width: searchQuery ? 140 : 110,
                transition: 'width 0.2s ease',
              }}
            />

            {/* Match Counter & Next/Prev Controls */}
            {searchQuery && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 4 }}>
                <span style={{
                  fontSize: 11, color: searchResults.length > 0 ? 'var(--text-primary)' : '#ff3b30',
                  fontWeight: 500, minWidth: 38, textAlign: 'center',
                }}>
                  {isSearching ? '…' : searchResults.length > 0 ? `${activeMatchIndex + 1}/${searchResults.length}` : '0/0'}
                </span>

                <button
                  className="btn"
                  onClick={handlePrevMatch}
                  title="Previous match (Shift+Enter)"
                  disabled={searchResults.length === 0}
                  style={{ padding: 2, opacity: searchResults.length > 0 ? 1 : 0.4 }}
                >
                  <ChevronUp size={14} color="var(--text-secondary)" />
                </button>

                <button
                  className="btn"
                  onClick={handleNextMatch}
                  title="Next match (Enter)"
                  disabled={searchResults.length === 0}
                  style={{ padding: 2, opacity: searchResults.length > 0 ? 1 : 0.4 }}
                >
                  <ChevronDown size={14} color="var(--text-secondary)" />
                </button>

                <button
                  className="btn"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                  style={{ padding: 2 }}
                >
                  <X size={13} color="var(--text-secondary)" />
                </button>
              </div>
            )}
          </div>

          <div style={{ width: 1, height: 20, background: 'var(--glass-border)' }} />

          {/* Share PDF Button */}
          <button
            className="btn"
            onClick={() => setActiveViewerTool('share')}
            title="Share Document"
            style={{ padding: 6 }}
          >
            <Share2 size={16} color="var(--text-secondary)" />
          </button>

          {/* ── Power Tools Dropdown Trigger ── */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn"
              onClick={() => setShowToolsMenu(v => !v)}
              title="All PDF Power Tools"
              style={{
                padding: '5px 10px',
                borderRadius: 8,
                background: showToolsMenu ? 'var(--accent)' : 'var(--glass-bg)',
                color: showToolsMenu ? 'var(--bg-color)' : 'var(--text-primary)',
                border: '1px solid var(--glass-border)',
                fontSize: 12,
                fontWeight: 600,
                gap: 5,
              }}
            >
              <Wand2 size={14} /> Tools
            </button>

            {/* In-Viewer Tools Menu Flyout */}
            <AnimatePresence>
              {showToolsMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  className="glass-panel"
                  style={{
                    position: 'absolute', right: 0, top: 40, width: 230,
                    borderRadius: 14, padding: 6, zIndex: 200,
                    background: 'var(--bg-color)', border: '1px solid var(--glass-border)',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
                    display: 'flex', flexDirection: 'column', gap: 2,
                  }}
                >
                  <button
                    className="btn"
                    onClick={() => { setActiveViewerTool('compress'); setShowToolsMenu(false); }}
                    style={{ justifyContent: 'flex-start', padding: '8px 10px', fontSize: 13, gap: 8, borderRadius: 8 }}
                  >
                    <Minimize2 size={15} color="#34c759" /> Compress PDF
                  </button>
                  <button
                    className="btn"
                    onClick={() => { setActiveViewerTool('organize'); setShowToolsMenu(false); }}
                    style={{ justifyContent: 'flex-start', padding: '8px 10px', fontSize: 13, gap: 8, borderRadius: 8 }}
                  >
                    <LayoutGrid size={15} color="#34c759" /> Organize Pages
                  </button>
                  <button
                    className="btn"
                    onClick={() => { setActiveViewerTool('split'); setShowToolsMenu(false); }}
                    style={{ justifyContent: 'flex-start', padding: '8px 10px', fontSize: 13, gap: 8, borderRadius: 8 }}
                  >
                    <Scissors size={15} color="#ff3b30" /> Split / Extract
                  </button>
                  <button
                    className="btn"
                    onClick={() => { setActiveViewerTool('signature'); setShowToolsMenu(false); }}
                    style={{ justifyContent: 'flex-start', padding: '8px 10px', fontSize: 13, gap: 8, borderRadius: 8 }}
                  >
                    <PenTool size={15} color="#af52de" /> E-Sign Signature
                  </button>
                  <button
                    className="btn"
                    onClick={() => { setActiveViewerTool('watermark'); setShowToolsMenu(false); }}
                    style={{ justifyContent: 'flex-start', padding: '8px 10px', fontSize: 13, gap: 8, borderRadius: 8 }}
                  >
                    <Stamp size={15} color="#ff9500" /> Watermark & Tint
                  </button>
                  <button
                    className="btn"
                    onClick={() => { setActiveViewerTool('numbering'); setShowToolsMenu(false); }}
                    style={{ justifyContent: 'flex-start', padding: '8px 10px', fontSize: 13, gap: 8, borderRadius: 8 }}
                  >
                    <Hash size={15} color="#5856d6" /> Page Numbers
                  </button>
                  <button
                    className="btn"
                    onClick={() => { setActiveViewerTool('share'); setShowToolsMenu(false); }}
                    style={{ justifyContent: 'flex-start', padding: '8px 10px', fontSize: 13, gap: 8, borderRadius: 8 }}
                  >
                    <Share2 size={15} color="#0071e3" /> Share PDF
                  </button>
                  <button
                    className="btn"
                    onClick={() => { setActiveViewerTool('pdf-to-img'); setShowToolsMenu(false); }}
                    style={{ justifyContent: 'flex-start', padding: '8px 10px', fontSize: 13, gap: 8, borderRadius: 8 }}
                  >
                    <FileImage size={15} color="#30b0c7" /> Export Images ZIP
                  </button>
                  <button
                    className="btn"
                    onClick={() => { setActiveViewerTool('sanitize'); setShowToolsMenu(false); }}
                    style={{ justifyContent: 'flex-start', padding: '8px 10px', fontSize: 13, gap: 8, borderRadius: 8 }}
                  >
                    <ShieldAlert size={15} color="#ff9500" /> Sanitize Metadata
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ width: 1, height: 20, background: 'var(--glass-border)' }} />

          {/* Zoom Controls */}
          <button className="btn" onClick={zoomOut} title="Zoom out (-)" style={{ padding: 5 }}>
            <ZoomOut size={15} color="var(--text-secondary)" />
          </button>
          <span style={{ fontSize: 11, minWidth: 36, textAlign: 'center', color: 'var(--text-secondary)' }}>
            {Math.round(scale * 100)}%
          </span>
          <button className="btn" onClick={zoomIn} title="Zoom in (+)" style={{ padding: 5 }}>
            <ZoomIn size={15} color="var(--text-secondary)" />
          </button>

          {/* Two-page Spread Switcher */}
          <button
            className="btn"
            onClick={() => setViewMode(v => v === 'single' ? 'two-page' : 'single')}
            title={viewMode === 'two-page' ? 'Single page view' : 'Two-page spread view'}
            style={{
              padding: 5,
              background: viewMode === 'two-page' ? 'var(--accent)' : 'transparent',
              color: viewMode === 'two-page' ? 'var(--bg-color)' : 'var(--text-secondary)',
              borderRadius: 6,
            }}
          >
            <BookOpen size={16} />
          </button>

          {/* Rotate Clockwise */}
          <button className="btn" onClick={rotate} title="Rotate 90° (R)" style={{ padding: 5 }}>
            <RotateCw size={15} color="var(--text-secondary)" />
          </button>

          {/* Invert Dark / Light Mode */}
          <button className="btn" onClick={handleToggleDarkMode} title="Toggle Dark/Light Mode" style={{ padding: 5 }}>
            {isDarkMode ? <Sun size={15} color="var(--text-secondary)" /> : <Moon size={15} color="var(--text-secondary)" />}
          </button>

          {/* Fullscreen */}
          <button className="btn" onClick={toggleFullscreen} title="Fullscreen (F11)" style={{ padding: 5 }}>
            {isFullscreen ? <Minimize size={15} color="var(--text-secondary)" /> : <Maximize size={15} color="var(--text-secondary)" />}
          </button>

          {/* Download */}
          <button
            className="btn btn-primary"
            onClick={handleDownload}
            title="Download PDF"
            style={{ padding: '5px 10px', fontSize: 12, gap: 5 }}
          >
            <Download size={14} /> Download
          </button>
        </div>
      </motion.nav>

      {/* ── Main Workspace Body (Sidebar + Viewport) ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', paddingTop: 68 }}>
        
        {/* ── Collapsible Sidebar ── */}
        <AnimatePresence>
          {showSidebar && (
            <motion.aside
              ref={sidebarRef}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="glass-panel"
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid var(--glass-border)',
                borderTop: 'none', borderBottom: 'none', borderLeft: 'none',
                borderRadius: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                flexShrink: 0,
                zIndex: 40,
              }}
            >
              {/* Sidebar Tabs */}
              <div style={{
                display: 'flex',
                padding: '10px 8px 6px',
                borderBottom: '1px solid var(--glass-border)',
                gap: 4,
                position: 'sticky', top: 0,
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(16px)',
                zIndex: 10,
              }}>
                <button
                  className="btn"
                  onClick={() => setSidebarTab('thumbnails')}
                  style={{
                    flex: 1, padding: '5px 4px', fontSize: 11, gap: 4,
                    background: sidebarTab === 'thumbnails' ? 'var(--glass-border)' : 'transparent',
                    color: sidebarTab === 'thumbnails' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    borderRadius: 6,
                  }}
                  title="Page Thumbnails"
                >
                  <LayoutGrid size={13} /> Pages
                </button>
                <button
                  className="btn"
                  onClick={() => setSidebarTab('outline')}
                  style={{
                    flex: 1, padding: '5px 4px', fontSize: 11, gap: 4,
                    background: sidebarTab === 'outline' ? 'var(--glass-border)' : 'transparent',
                    color: sidebarTab === 'outline' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    borderRadius: 6,
                  }}
                  title="Table of Contents"
                >
                  <Bookmark size={13} /> Outline
                </button>
                <button
                  className="btn"
                  onClick={() => setSidebarTab('search')}
                  style={{
                    flex: 1, padding: '5px 4px', fontSize: 11, gap: 4,
                    background: sidebarTab === 'search' ? 'var(--glass-border)' : 'transparent',
                    color: sidebarTab === 'search' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    borderRadius: 6,
                  }}
                  title="Search Results"
                >
                  <Search size={13} /> Results {searchResults.length > 0 && `(${searchResults.length})`}
                </button>
              </div>

              {/* Sidebar Content */}
              <div style={{ width: '100%', padding: '12px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Document file={file} onLoadSuccess={() => {}}>
                  {sidebarTab === 'thumbnails' && (
                    pageNums.map(num => (
                      <SidebarThumb
                        key={num}
                        num={num}
                        rotation={rotation}
                        isActive={currentPage === num}
                        onClick={scrollToPage}
                      />
                    ))
                  )}

                  {sidebarTab === 'outline' && (
                    <div style={{ width: '100%' }}>
                      <Outline
                        className="custom-pdf-outline"
                        onItemClick={({ pageNumber }) => {
                          if (pageNumber) scrollToPage(pageNumber);
                        }}
                        onLoadSuccess={() => setHasOutline(true)}
                        onLoadError={() => setHasOutline(false)}
                      />
                      {hasOutline === false && (
                        <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
                          No table of contents embedded in this document.
                        </div>
                      )}
                    </div>
                  )}

                  {sidebarTab === 'search' && (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px' }}>
                      {!searchQuery.trim() ? (
                        <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
                          Type a word or phrase in the search bar above.
                        </div>
                      ) : isSearching ? (
                        <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
                          Searching document…
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
                          No matches found for "{searchQuery}".
                        </div>
                      ) : (
                        searchResults.map((match, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setActiveMatchIndex(idx);
                              scrollToPage(match.pageNumber);
                            }}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 8,
                              cursor: 'pointer',
                              background: activeMatchIndex === idx ? 'var(--accent)' : 'var(--glass-bg)',
                              color: activeMatchIndex === idx ? 'var(--bg-color)' : 'var(--text-primary)',
                              border: '1px solid var(--glass-border)',
                              fontSize: 12,
                              lineHeight: 1.4,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 10, opacity: 0.8, marginBottom: 3 }}>
                              <span>Page {match.pageNumber}</span>
                              <span>Match #{idx + 1}</span>
                            </div>
                            <span style={{ fontSize: 11 }}>{match.snippet}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </Document>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── Main Viewport ── */}
        <main
          ref={mainRef}
          tabIndex={0}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'auto',
            paddingTop: 24,
            paddingBottom: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--bg-color)',
            scrollBehavior: 'smooth',
            scrollbarWidth: 'thin',
            willChange: 'scroll-position',
            outline: 'none',
          }}
        >
          {loadError ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p style={{ fontWeight: 500, color: '#e53e3e', marginBottom: 8 }}>Error loading PDF</p>
              <p style={{ fontSize: 13 }}>{loadError}</p>
              <button className="btn btn-primary" onClick={onClose} style={{ marginTop: 24 }}>Close</button>
            </div>
          ) : (
            <Document
              file={file}
              onLoadSuccess={onDocumentLoad}
              onLoadError={onDocumentError}
              loading={
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 16,
                  paddingTop: 120, color: 'var(--text-secondary)',
                }}>
                  <div className="spin-ring" />
                  <span style={{ fontSize: 13 }}>Loading document…</span>
                </div>
              }
            >
              {pageRows.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className={row.length > 1 ? 'two-page-spread' : ''}
                  style={row.length > 1 ? undefined : { display: 'flex', justifyContent: 'center' }}
                >
                  {row.map(num => (
                    <VirtualPage
                      key={num}
                      pageNumber={num}
                      scale={scale}
                      rotation={rotation}
                      pageWidth={pageWidth}
                      isDarkMode={isDarkMode}
                      searchQuery={searchQuery}
                      activeMatch={activeMatch}
                      placedSignatures={placedSignatures}
                      annotations={annotations}
                      activeAnnotateTool={activeAnnotateTool}
                      annotateColor={annotateColor}
                      annotateStrokeWidth={annotateStrokeWidth}
                      annotateOpacity={annotateOpacity}
                      onAddAnnotation={handleAddAnnotation}
                      onUpdateAnnotation={handleUpdateAnnotation}
                      onDeleteAnnotation={handleDeleteAnnotation}
                      onPageClick={handlePageClick}
                      inRange={num >= renderMin && num <= renderMax}
                      cachedHeight={heightCache.current[num]}
                      onVisible={handleVisible}
                      onMeasured={handleMeasured}
                    />
                  ))}
                </div>
              ))}
            </Document>
          )}
        </main>
      </div>
    </div>
  );
}
