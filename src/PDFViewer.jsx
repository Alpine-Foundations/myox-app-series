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
  Highlighter, Share2, Minimize2, Palette, Trash2, Edit3, Sliders, Type, CheckSquare, Eye
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
  const splitRegex = new RegExp(`(${escaped})`, 'gi');
  const testRegex  = new RegExp(escaped, 'i'); // non-global: no lastIndex drift
  const parts = text.split(splitRegex);

  return parts.map((part, index) => {
    if (testRegex.test(part)) {
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
  readingShader = 'paper',
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
            className={`pdf-shader-${readingShader}`}
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
            {pageSigs.map(sig => {
              const curLeft = sig.normX !== undefined ? sig.normX * pageWidth : sig.x;
              const curTop = sig.normY !== undefined ? sig.normY * placeholderH : sig.y;
              return (
                <div
                  key={sig.id}
                  style={{
                    position: 'absolute',
                    left: curLeft,
                    top: curTop,
                    width: Math.max(80, 140 * scale),
                    pointerEvents: 'none',
                    zIndex: 20,
                  }}
                >
                  <img src={sig.dataUrl} alt="Signature" style={{ width: '100%', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
                </div>
              );
            })}

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

export default function PDFViewer({
  file: initialFile,
  theme = 'light',
  onToggleTheme,
  onClose,
  initialTool = null,
  initialAnnotate = false,
}) {
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
  const [activeViewerTool, setActiveViewerTool] = useState(initialTool);
  const [pendingSignature, setPendingSignature] = useState(null);
  const [placedSignatures, setPlacedSignatures] = useState([]);

  // Annotation Studio State
  const [isAnnotateMode,     setIsAnnotateMode]     = useState(initialAnnotate);
  const [activeAnnotateTool, setActiveAnnotateTool] = useState(initialAnnotate ? 'pen' : null); // 'pen' | 'highlighter' | 'text' | 'comment' | 'rect' | 'circle' | 'arrow'
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

  // Document Reading Shader (Independent of App UI Theme)
  const [readingShader,    setReadingShader]    = useState('paper'); // 'paper' | 'inverted' | 'sepia' | 'mint' | 'slate'
  const [showReadingMenu,  setShowReadingMenu]  = useState(false);

  const [isDarkMode,     setIsDarkMode]    = useState(() => theme === 'dark');
  const [isFullscreen,   setIsFullscreen]  = useState(false);
  const [hasOutline,     setHasOutline]    = useState(null);
  const [loadError,      setLoadError]     = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const searchInputRef  = useRef(null);
  const currentRef      = useRef(1);
  const numRef          = useRef(null);
  const scaleRef        = useRef(1.0);
  const mainRef         = useRef(null);
  const sidebarRef      = useRef(null);
  const heightCache     = useRef({});
  const pageTextCache   = useRef(new Map());
  const toolsMenuRef    = useRef(null);  // for click-outside dismissal
  const [renderCenter, setRenderCenter] = useState(1);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Click-outside: dismiss open dropdown menus (Tools & Reading Shader)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target)) {
        setShowToolsMenu(false);
      }
      if (readingMenuRef.current && !readingMenuRef.current.contains(e.target)) {
        setShowReadingMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();

        // 1. Bake digital signatures
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

          const normX = sig.normX !== undefined ? sig.normX : (sig.x / (pageWidth || 600));
          const normY = sig.normY !== undefined ? sig.normY : (sig.y / ((pageWidth || 600) * DEFAULT_AR));
          const sigW = Math.min(pageW * 0.35, 140 * (pageW / 600));
          const sigH = (sigW * (embeddedSig.height / embeddedSig.width));

          const sigX = normX * pageW;
          const sigY = pageH - (normY * pageH) - sigH;

          targetPage.drawImage(embeddedSig, {
            x: Math.max(0, sigX),
            y: Math.max(0, sigY),
            width: sigW,
            height: sigH,
          });
        }

        // 2. Bake Annotations per page (Text blocks, Shapes, Freehand Drawings)
        for (let pIdx = 0; pIdx < pages.length; pIdx++) {
          const pageNum = pIdx + 1;
          const targetPage = pages[pIdx];
          const { width: pageW, height: pageH } = targetPage.getSize();
          const pageAnns = annotations.filter(a => a.pageNumber === pageNum);
          if (pageAnns.length === 0) continue;

          // Text blocks
          for (const ann of pageAnns) {
            if (ann.type === 'text' && ann.content) {
              const normX = ann.normX !== undefined ? ann.normX : (ann.x / (pageWidth || 600));
              const normY = ann.normY !== undefined ? ann.normY : (ann.y / ((pageWidth || 600) * DEFAULT_AR));
              const fontSizePts = (ann.fontSize || 15) * (pageW / 600);

              const hex = (ann.color || '#18181b').replace('#', '');
              const r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
              const g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
              const b = parseInt(hex.substring(4, 6), 16) / 255 || 0;

              targetPage.drawText(ann.content, {
                x: Math.max(0, normX * pageW),
                y: Math.max(0, pageH - (normY * pageH) - fontSizePts),
                size: fontSizePts,
                font: ann.isBold ? fontBold : fontRegular,
                color: rgb(r, g, b),
              });
            }
          }

          // Rasterize Freehand Strokes & Shapes to a crisp 2x DPI canvas overlay
          const nonTextAnns = pageAnns.filter(a => a.type === 'draw' || a.type === 'shape');
          if (nonTextAnns.length > 0) {
            const bakeCanvas = document.createElement('canvas');
            const dpr = 2;
            bakeCanvas.width = Math.round(pageW * dpr);
            bakeCanvas.height = Math.round(pageH * dpr);
            const bCtx = bakeCanvas.getContext('2d');
            bCtx.scale(dpr, dpr);

            for (const item of nonTextAnns) {
              if (item.type === 'draw' && item.points && item.points.length > 1) {
                bCtx.save();
                bCtx.globalAlpha = item.opacity || 1.0;
                bCtx.strokeStyle = item.color || '#2563eb';
                bCtx.lineWidth = (item.strokeWidth || 3) * (pageW / 600);
                bCtx.lineCap = 'round';
                bCtx.lineJoin = 'round';
                bCtx.beginPath();
                const p0 = item.points[0];
                const sx = (p0.normX !== undefined ? p0.normX * pageW : p0.x * (pageW / 600));
                const sy = (p0.normY !== undefined ? p0.normY * pageH : p0.y * (pageH / 800));
                bCtx.moveTo(sx, sy);
                for (let i = 1; i < item.points.length; i++) {
                  const pt = item.points[i];
                  const px = (pt.normX !== undefined ? pt.normX * pageW : pt.x * (pageW / 600));
                  const py = (pt.normY !== undefined ? pt.normY * pageH : pt.y * (pageH / 800));
                  bCtx.lineTo(px, py);
                }
                bCtx.stroke();
                bCtx.restore();
              } else if (item.type === 'shape') {
                const sX = (item.normX !== undefined ? item.normX * pageW : item.x * (pageW / 600));
                const sY = (item.normY !== undefined ? item.normY * pageH : item.y * (pageH / 800));
                const sW = (item.normWidth !== undefined ? item.normWidth * pageW : (item.width || 120) * (pageW / 600));
                const sH = (item.normHeight !== undefined ? item.normHeight * pageH : (item.height || 60) * (pageH / 800));

                bCtx.save();
                bCtx.globalAlpha = item.opacity || 1.0;
                bCtx.strokeStyle = item.color || '#2563eb';
                bCtx.lineWidth = (item.strokeWidth || 3) * (pageW / 600);

                if (item.shapeType === 'rect') {
                  bCtx.strokeRect(sX, sY, sW, sH);
                  bCtx.fillStyle = item.color || '#2563eb';
                  bCtx.globalAlpha = (item.opacity || 1.0) * 0.1;
                  bCtx.fillRect(sX, sY, sW, sH);
                } else if (item.shapeType === 'circle') {
                  bCtx.beginPath();
                  bCtx.ellipse(sX + sW / 2, sY + sH / 2, sW / 2, sH / 2, 0, 0, Math.PI * 2);
                  bCtx.stroke();
                  bCtx.fillStyle = item.color || '#2563eb';
                  bCtx.globalAlpha = (item.opacity || 1.0) * 0.1;
                  bCtx.fill();
                } else if (item.shapeType === 'arrow') {
                  bCtx.beginPath();
                  bCtx.moveTo(sX + 10, sY + sH - 10);
                  bCtx.lineTo(sX + sW - 10, sY + 10);
                  bCtx.stroke();
                  const angle = Math.atan2(10 - (sY + sH - 10), (sX + sW - 10) - (sX + 10));
                  const headLen = 14;
                  bCtx.beginPath();
                  bCtx.moveTo(sX + sW - 10, sY + 10);
                  bCtx.lineTo(sX + sW - 10 - headLen * Math.cos(angle - Math.PI / 6), sY + 10 - headLen * Math.sin(angle - Math.PI / 6));
                  bCtx.lineTo(sX + sW - 10 - headLen * Math.cos(angle + Math.PI / 6), sY + 10 - headLen * Math.sin(angle + Math.PI / 6));
                  bCtx.closePath();
                  bCtx.fillStyle = item.color || '#2563eb';
                  bCtx.fill();
                } else if (item.shapeType === 'line') {
                  bCtx.beginPath();
                  bCtx.moveTo(sX, sY + sH / 2);
                  bCtx.lineTo(sX + sW, sY + sH / 2);
                  bCtx.stroke();
                }
                bCtx.restore();
              }
            }

            const pngBlob = await new Promise(res => bakeCanvas.toBlob(res, 'image/png'));
            const pngBuf = await pngBlob.arrayBuffer();
            const embeddedOverlay = await pdfDoc.embedPng(new Uint8Array(pngBuf));
            targetPage.drawImage(embeddedOverlay, {
              x: 0,
              y: 0,
              width: pageW,
              height: pageH,
            });
          }
        }

        const signedBytes = await pdfDoc.save();
        const exportName = customDocName || file.name || 'document.pdf';
        downloadFile(signedBytes, exportName.startsWith('annotated_') ? exportName : `annotated_${exportName}`);
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
    const curW = rect.width || pageWidth || 600;
    const curH = rect.height || (pageWidth * DEFAULT_AR) || 800;
    const rawX = e.clientX - rect.left - 70;
    const rawY = e.clientY - rect.top - 35;
    const normX = Math.max(0, Math.min(1, rawX / curW));
    const normY = Math.max(0, Math.min(1, rawY / curH));

    recordSnapshot();
    setPlacedSignatures(prev => [
      ...prev,
      {
        id: `sig-${Date.now()}`,
        pageNumber,
        normX,
        normY,
        x: Math.max(10, rawX),
        y: Math.max(10, rawY),
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
            currentAnnotations={annotations}
            currentSignatures={placedSignatures}
            onClose={() => setActiveViewerTool(null)}
            onUpdateDocument={(newFile, meta) => {
              recordSnapshot();
              heightCache.current = {};
              setFile(newFile);
              if (meta?.updatedAnnotations) setAnnotations(meta.updatedAnnotations);
              if (meta?.updatedSignatures) setPlacedSignatures(meta.updatedSignatures);
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

      {/* ── Pending Signature Placement Mode Indicator ── */}
      <AnimatePresence>
        {pendingSignature && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
              zIndex: 150, background: 'var(--accent)', color: 'var(--bg-color)',
              padding: '6px 16px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12, fontWeight: 500, boxShadow: 'var(--shadow-lg)',
            }}
          >
            <PenTool size={14} /> Click anywhere on the page to place signature
            <button
              className="btn"
              onClick={() => setPendingSignature(null)}
              style={{ color: 'var(--bg-color)', padding: 2, marginLeft: 6 }}
            >
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Annotation & Markup Toolbar ── */}
      <AnimatePresence>
        {isAnnotateMode && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="glass-panel"
            style={{
              position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
              zIndex: 140, background: 'var(--surface-card)', padding: '5px 10px',
              borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: 4,
              boxShadow: 'var(--shadow-lg)', border: '1px solid var(--glass-border)',
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
                <motion.button
                  key={t.id}
                  className="btn"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setActiveAnnotateTool(isSelected ? null : t.id)}
                  style={{
                    padding: '6px 8px', fontSize: 12, gap: 5, borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    color: isSelected ? 'var(--bg-color)' : 'var(--text-secondary)',
                  }}
                  title={t.label}
                >
                  <Icon size={14} />
                </motion.button>
              );
            })}

            <div style={{ width: 1, height: 16, background: 'var(--glass-border)', margin: '0 2px' }} />

            {/* Color Swatch / Native Color Picker */}
            <input
              type="color"
              value={annotateColor}
              onChange={e => setAnnotateColor(e.target.value)}
              style={{ width: 22, height: 22, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'transparent' }}
              title="Annotation Color"
            />

            {/* Stroke Width Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {[2, 4, 8].map(w => (
                <button
                  key={w}
                  className="btn"
                  onClick={() => setAnnotateStrokeWidth(w)}
                  style={{
                    width: 22, height: 22, padding: 0, borderRadius: 4,
                    background: annotateStrokeWidth === w ? 'var(--accent-soft)' : 'transparent',
                    color: annotateStrokeWidth === w ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontSize: 11, fontWeight: 600,
                  }}
                >
                  {w}
                </button>
              ))}
            </div>

            {/* Clear all annotations button */}
            {annotations.length > 0 && (
              <motion.button
                className="btn"
                whileTap={{ scale: 0.92 }}
                onClick={() => { recordSnapshot(); setAnnotations([]); }}
                style={{ padding: '4px 8px', fontSize: 11, color: '#ef4444', gap: 4 }}
              >
                <Trash2 size={13} /> Clear
              </motion.button>
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
      <AnimatePresence>
        {selectionBox && (
          <motion.div
            key="sel-toolbar"
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
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
          </motion.div>
        )}
      </AnimatePresence>

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
      {/* ── Floating Top Navbar (Zero Overflow Responsive) ── */}
      <motion.nav
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="glass-panel"
        style={{
          position: 'fixed', top: isMobile ? 8 : 12, left: isMobile ? 8 : 16, right: isMobile ? 8 : 16,
          height: 50, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: isMobile ? '0 10px' : '0 14px', zIndex: 100,
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {isMobile ? (
          /* Mobile Simplified Top Header */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
              <img 
                src="./favicon.png" 
                alt="MyOx" 
                style={{ width: 22, height: 22, borderRadius: 6, objectFit: 'contain', background: 'var(--accent-soft)', padding: 1, flexShrink: 0 }} 
              />
              <motion.button
                className="btn"
                onClick={onClose}
                whileTap={{ scale: 0.94 }}
                title="Close Document"
                style={{ padding: 4, borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
              >
                <X size={15} color="var(--text-secondary)" />
              </motion.button>
              <div style={{ width: 1, height: 14, background: 'var(--glass-border)', flexShrink: 0 }} />
              <span
                style={{
                  fontSize: 12.5, fontWeight: 700,
                  maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: 'var(--text-primary)',
                }}
              >
                {customDocName}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <motion.button
                className="btn"
                onClick={() => {
                  setShowSidebar(true);
                  setSidebarTab('search');
                }}
                whileTap={{ scale: 0.92 }}
                title="Search Document"
                style={{ padding: 6, borderRadius: 'var(--radius-sm)' }}
              >
                <Search size={15} color="var(--text-secondary)" />
              </motion.button>

              <motion.button
                className="btn"
                onClick={handleToggleDarkMode}
                whileTap={{ scale: 0.92 }}
                title="Toggle Theme"
                style={{ padding: 6, borderRadius: 'var(--radius-sm)' }}
              >
                {isDarkMode ? <Sun size={15} color="var(--text-secondary)" /> : <Moon size={15} color="var(--text-secondary)" />}
              </motion.button>

              <motion.button
                className="btn btn-primary"
                onClick={handleDownload}
                whileTap={{ scale: 0.95 }}
                title="Download PDF"
                style={{ padding: '5px 9px', borderRadius: 'var(--radius-sm)', gap: 4, fontSize: 12 }}
              >
                <Download size={13} />
              </motion.button>
            </div>
          </>
        ) : (
          /* Desktop Full Power Studio Navbar */
          <>
            {/* Left Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <img 
                src="./favicon.png" 
                alt="MyOx" 
                style={{ width: 22, height: 22, borderRadius: 6, objectFit: 'contain', background: 'var(--accent-soft)', padding: 1 }} 
              />
              <motion.button
                className="btn"
                onClick={onClose}
                whileTap={{ scale: 0.94 }}
                title="Close Document"
                style={{ padding: 5, borderRadius: 'var(--radius-sm)' }}
              >
                <X size={16} color="var(--text-secondary)" />
              </motion.button>
              <div style={{ width: 1, height: 16, background: 'var(--glass-border)' }} />

              {/* Sidebar toggle */}
              <motion.button
                className="btn"
                onClick={() => setShowSidebar(v => !v)}
                title="Toggle Sidebar (S)"
                whileTap={{ scale: 0.92 }}
                style={{
                  padding: 5,
                  background: showSidebar ? 'var(--accent-soft)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <LayoutList size={16} color="var(--text-primary)" />
              </motion.button>

              {/* Undo / Redo buttons */}
              <motion.button
                className="btn"
                disabled={history.length === 0}
                onClick={handleUndo}
                whileTap={{ scale: 0.92 }}
                title="Undo last action (Ctrl+Z)"
                style={{ padding: 5, opacity: history.length > 0 ? 1 : 0.35, borderRadius: 'var(--radius-sm)' }}
              >
                <Undo2 size={15} />
              </motion.button>
              <motion.button
                className="btn"
                disabled={future.length === 0}
                onClick={handleRedo}
                whileTap={{ scale: 0.92 }}
                title="Redo action (Ctrl+Y / Ctrl+Shift+Z)"
                style={{ padding: 5, opacity: future.length > 0 ? 1 : 0.35, borderRadius: 'var(--radius-sm)' }}
              >
                <Redo2 size={15} />
              </motion.button>

              <div style={{ width: 1, height: 16, background: 'var(--glass-border)' }} />

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {numPages && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                  <motion.button whileTap={{ scale: 0.9 }} className="btn" onClick={() => scrollToPage(currentPage - 1)} style={{ padding: 3 }} title="Previous Page (PgUp)">
                    <ChevronUp size={14} color="var(--text-secondary)" />
                  </motion.button>
                  <span style={{ fontSize: 12, minWidth: 52, textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                    {currentPage} / {numPages}
                  </span>
                  <motion.button whileTap={{ scale: 0.9 }} className="btn" onClick={() => scrollToPage(currentPage + 1)} style={{ padding: 3 }} title="Next Page (PgDn)">
                    <ChevronDown size={14} color="var(--text-secondary)" />
                  </motion.button>
                </div>
              )}

              {/* Annotate & Markup Toggle */}
              <motion.button
                className="btn"
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setIsAnnotateMode(v => !v);
                  if (!isAnnotateMode) setActiveAnnotateTool('pen');
                  else setActiveAnnotateTool(null);
                }}
                title="Edit & Annotate PDF (Draw, Text Blocks, Shapes, Comments)"
                style={{
                  padding: '5px 10px', borderRadius: 'var(--radius-sm)', fontSize: 12, gap: 5,
                  background: isAnnotateMode ? 'var(--accent)' : 'transparent',
                  color: isAnnotateMode ? 'var(--bg-color)' : 'var(--text-primary)',
                  border: isAnnotateMode ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
                  fontWeight: 500,
                }}
              >
                <Edit3 size={13} /> Annotate
              </motion.button>
            </div>

            {/* Right Tools */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {/* Search Bar */}
              <div style={{
                position: 'relative', display: 'flex', alignItems: 'center',
                background: 'var(--surface-card)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-sm)', padding: '2px 6px 2px 26px',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <Search size={13} color="var(--text-tertiary)"
                  style={{ position: 'absolute', left: 8, pointerEvents: 'none' }} />
                
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search doc…"
                  value={searchQuery}
                  onFocus={e => e.target.select()}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: 12, outline: 'none',
                    width: searchQuery ? 120 : 96,
                    padding: '4px 0',
                    transition: 'width 0.2s ease',
                  }}
                />

                {searchQuery && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 4 }}>
                    <span style={{
                      fontSize: 11, color: searchResults.length > 0 ? 'var(--text-secondary)' : '#ef4444',
                      fontWeight: 500, minWidth: 32, textAlign: 'center',
                    }}>
                      {isSearching ? '…' : searchResults.length > 0 ? `${activeMatchIndex + 1}/${searchResults.length}` : '0/0'}
                    </span>

                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      className="btn"
                      onClick={handlePrevMatch}
                      title="Previous match (Shift+Enter)"
                      disabled={searchResults.length === 0}
                      style={{ padding: 2, opacity: searchResults.length > 0 ? 1 : 0.4 }}
                    >
                      <ChevronUp size={13} color="var(--text-secondary)" />
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      className="btn"
                      onClick={handleNextMatch}
                      title="Next match (Enter)"
                      disabled={searchResults.length === 0}
                      style={{ padding: 2, opacity: searchResults.length > 0 ? 1 : 0.4 }}
                    >
                      <ChevronDown size={13} color="var(--text-secondary)" />
                    </motion.button>

                    <button
                      className="btn"
                      onClick={() => setSearchQuery('')}
                      title="Clear search"
                      style={{ padding: 2 }}
                    >
                      <X size={12} color="var(--text-secondary)" />
                    </button>
                  </div>
                )}
              </div>

              <div style={{ width: 1, height: 16, background: 'var(--glass-border)' }} />

              {/* Share PDF Button */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                className="btn"
                onClick={() => setActiveViewerTool('share')}
                title="Share Document"
                style={{ padding: 5, borderRadius: 'var(--radius-sm)' }}
              >
                <Share2 size={15} color="var(--text-secondary)" />
              </motion.button>

              {/* Power Tools Dropdown */}
              <div ref={toolsMenuRef} style={{ position: 'relative' }}>
                <motion.button
                  className="btn btn-soft"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowToolsMenu(v => !v)}
                  title="All PDF Power Tools"
                  style={{
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    fontWeight: 500,
                    gap: 5,
                  }}
                >
                  <Wand2 size={13} /> Tools
                </motion.button>

                <AnimatePresence>
                  {showToolsMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: 6 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                      className="glass-panel"
                      style={{
                        position: 'absolute', right: 0, top: 38, width: 220,
                        borderRadius: 'var(--radius-md)', padding: 5, zIndex: 200,
                        background: 'var(--surface-card)', border: '1px solid var(--glass-border)',
                        boxShadow: 'var(--shadow-lg)',
                        display: 'flex', flexDirection: 'column', gap: 2,
                      }}
                    >
                      {[
                        { id: 'compress', label: 'Compress PDF', icon: Minimize2, color: '#0d9488' },
                        { id: 'organize', label: 'Organize Pages', icon: LayoutGrid, color: '#059669' },
                        { id: 'split', label: 'Split / Extract', icon: Scissors, color: '#dc2626' },
                        { id: 'signature', label: 'E-Sign Signature', icon: PenTool, color: '#7c3aed' },
                        { id: 'watermark', label: 'Watermark & Tint', icon: Stamp, color: '#d97706' },
                        { id: 'numbering', label: 'Page Numbers', icon: Hash, color: '#4f46e5' },
                        { id: 'share', label: 'Share PDF', icon: Share2, color: '#2563eb' },
                        { id: 'pdf-to-img', label: 'Export Images ZIP', icon: FileImage, color: '#0891b2' },
                        { id: 'sanitize', label: 'Sanitize Metadata', icon: ShieldAlert, color: '#d97706' },
                      ].map(item => {
                        const Icon = item.icon;
                        return (
                          <motion.button
                            key={item.id}
                            whileHover={{ x: 2 }}
                            className="btn"
                            onClick={() => { setActiveViewerTool(item.id); setShowToolsMenu(false); }}
                            style={{
                              justifyContent: 'flex-start', padding: '7px 10px', fontSize: 12, gap: 8,
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            <div style={{
                              width: 24, height: 24, borderRadius: 6,
                              background: 'var(--accent-soft)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'var(--text-primary)',
                            }}>
                              <Icon size={13} />
                            </div>
                            {item.label}
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div style={{ width: 1, height: 16, background: 'var(--glass-border)' }} />

              {/* Zoom Controls */}
              <motion.button whileTap={{ scale: 0.9 }} className="btn" onClick={zoomOut} title="Zoom out (-)" style={{ padding: 4 }}>
                <ZoomOut size={14} color="var(--text-secondary)" />
              </motion.button>
              <span style={{ fontSize: 11, minWidth: 32, textAlign: 'center', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(scale * 100)}%
              </span>
              <motion.button whileTap={{ scale: 0.9 }} className="btn" onClick={zoomIn} title="Zoom in (+)" style={{ padding: 4 }}>
                <ZoomIn size={14} color="var(--text-secondary)" />
              </motion.button>

              {/* Two-page Spread Switcher */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="btn"
                onClick={() => setViewMode(v => v === 'single' ? 'two-page' : 'single')}
                title={viewMode === 'two-page' ? 'Single page view' : 'Two-page spread view'}
                style={{
                  padding: 5,
                  background: viewMode === 'two-page' ? 'var(--accent-soft)' : 'transparent',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <BookOpen size={14} />
              </motion.button>

              {/* Rotate */}
              <motion.button whileTap={{ scale: 0.9 }} className="btn" onClick={rotate} title="Rotate 90° (R)" style={{ padding: 4 }}>
                <RotateCw size={14} color="var(--text-secondary)" />
              </motion.button>

              {/* Reading Paper Shader Switcher */}
              <div style={{ position: 'relative' }}>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  className="btn"
                  onClick={() => setShowReadingMenu(v => !v)}
                  title="Page Reading Tone (Eye-Care Sepia, Mint, Night)"
                  style={{
                    padding: 5,
                    background: readingShader !== 'paper' ? 'var(--accent-soft)' : 'transparent',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <Eye size={14} color="var(--text-secondary)" />
                </motion.button>

                <AnimatePresence>
                  {showReadingMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: 6 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                      className="glass-panel"
                      style={{
                        position: 'absolute', right: -10, top: 36, width: 190,
                        borderRadius: 'var(--radius-md)', padding: 5, zIndex: 200,
                        background: 'var(--surface-card)', border: '1px solid var(--glass-border)',
                        boxShadow: 'var(--shadow-lg)',
                        display: 'flex', flexDirection: 'column', gap: 2,
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Paper Shader:
                      </span>
                      {[
                        { id: 'paper', label: '☀️ Natural Paper' },
                        { id: 'sepia', label: '📖 Warm Sepia' },
                        { id: 'mint', label: '🌿 Soft Mint Tone' },
                        { id: 'slate', label: '🌫️ Cool Slate' },
                        { id: 'inverted', label: '🌙 Night Inverted' },
                      ].map(s => (
                        <button
                          key={s.id}
                          className="btn"
                          onClick={() => { setReadingShader(s.id); setShowReadingMenu(false); }}
                          style={{
                            justifyContent: 'flex-start', padding: '5px 8px', fontSize: 12, borderRadius: 'var(--radius-xs)',
                            background: readingShader === s.id ? 'var(--accent-soft)' : 'transparent',
                            fontWeight: readingShader === s.id ? 600 : 400,
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Theme */}
              <motion.button whileTap={{ scale: 0.9 }} className="btn" onClick={handleToggleDarkMode} title="Toggle App Theme" style={{ padding: 4 }}>
                {isDarkMode ? <Sun size={14} color="var(--text-secondary)" /> : <Moon size={14} color="var(--text-secondary)" />}
              </motion.button>

              {/* Fullscreen */}
              <motion.button whileTap={{ scale: 0.9 }} className="btn" onClick={toggleFullscreen} title="Fullscreen (F11)" style={{ padding: 4 }}>
                {isFullscreen ? <Minimize size={14} color="var(--text-secondary)" /> : <Maximize size={14} color="var(--text-secondary)" />}
              </motion.button>

              {/* Download */}
              <motion.button
                className="btn btn-primary"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDownload}
                title="Download PDF"
                style={{ padding: '5px 11px', fontSize: 12, gap: 5, borderRadius: 'var(--radius-sm)' }}
              >
                <Download size={13} /> Download
              </motion.button>
            </div>
          </>
        )}
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
                      readingShader={readingShader}
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

      {/* ── Mobile Floating Bottom Action Bar ── */}
      {isMobile && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="glass-panel"
          style={{
            position: 'fixed',
            bottom: 'max(12px, env(safe-area-inset-bottom))',
            left: 12,
            right: 12,
            height: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            padding: '0 8px',
            zIndex: 150,
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            background: 'var(--surface-card)',
          }}
        >
          {/* Page Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <motion.button whileTap={{ scale: 0.9 }} className="btn" onClick={() => scrollToPage(currentPage - 1)} style={{ padding: 6 }}>
              <ChevronUp size={16} color="var(--text-secondary)" />
            </motion.button>
            <span style={{ fontSize: 12, fontWeight: 600, minWidth: 44, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
              {currentPage}/{numPages || 1}
            </span>
            <motion.button whileTap={{ scale: 0.9 }} className="btn" onClick={() => scrollToPage(currentPage + 1)} style={{ padding: 6 }}>
              <ChevronDown size={16} color="var(--text-secondary)" />
            </motion.button>
          </div>

          <div style={{ width: 1, height: 20, background: 'var(--glass-border)' }} />

          {/* Zoom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <motion.button whileTap={{ scale: 0.9 }} className="btn" onClick={zoomOut} style={{ padding: 6 }}>
              <ZoomOut size={16} color="var(--text-secondary)" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} className="btn" onClick={zoomIn} style={{ padding: 6 }}>
              <ZoomIn size={16} color="var(--text-secondary)" />
            </motion.button>
          </div>

          <div style={{ width: 1, height: 20, background: 'var(--glass-border)' }} />

          {/* Annotate */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="btn"
            onClick={() => {
              setIsAnnotateMode(v => !v);
              if (!isAnnotateMode) setActiveAnnotateTool('pen');
              else setActiveAnnotateTool(null);
            }}
            style={{
              padding: '6px 10px',
              background: isAnnotateMode ? 'var(--accent)' : 'transparent',
              color: isAnnotateMode ? 'var(--bg-color)' : 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <Edit3 size={15} />
          </motion.button>

          {/* Tools Menu */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="btn btn-soft"
            onClick={() => setShowToolsMenu(v => !v)}
            style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', gap: 4, fontSize: 12, fontWeight: 600 }}
          >
            <Wand2 size={15} /> Tools
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
