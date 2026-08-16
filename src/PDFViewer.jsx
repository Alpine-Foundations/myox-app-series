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
  Scissors, Stamp, Hash, FileImage, ShieldAlert, PenTool, CheckCircle
} from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import SplitPDFTool from './components/tools/SplitPDFTool';
import PageOrganizerModal from './components/tools/PageOrganizerModal';
import WatermarkTool from './components/tools/WatermarkTool';
import PageNumberingTool from './components/tools/PageNumberingTool';
import PDFToImagesTool from './components/tools/PDFToImagesTool';
import PDFSecurityModal from './components/tools/PDFSecurityModal';
import SignatureModal from './components/SignatureModal';
import { PDFDocument } from 'pdf-lib';
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
        borderRadius: 3,
        overflow: 'hidden',
        lineHeight: 0,
        background: 'var(--glass-border)',
      }}>
        {visible && (
          <Page
            pageNumber={num}
            rotate={rotation}
            width={THUMB_WIDTH}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        )}
      </div>
      <span style={{
        fontSize: 11,
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: isActive ? 600 : 400,
      }}>
        {num}
      </span>
    </div>
  );
});

// ─── Virtual page slot ────────────────────────────────────────────────────────
const VirtualPage = memo(function VirtualPage({
  pageNumber, scale, rotation, pageWidth, inRange, isDarkMode, searchQuery, activeMatch,
  cachedHeight, onVisible, onMeasured, placedSignatures, onPageClick,
}) {
  const wrapRef  = useRef(null);
  const measured = useRef(false);

  // Intersection Observer for current-page tracking
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

  useEffect(() => {
    setFile(initialFile);
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

  // Clear height cache on zoom or rotation change
  useEffect(() => { heightCache.current = {}; }, [scale, rotation]);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Text selection listener for floating toolbar
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectionBox(null);
        setSelectedText('');
        return;
      }
      const text = selection.toString().trim();
      if (!text) {
        setSelectionBox(null);
        setSelectedText('');
        return;
      }
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0) {
          setSelectionBox({
            top: Math.max(70, rect.top - 44),
            left: Math.max(20, rect.left + rect.width / 2 - 80),
          });
          setSelectedText(text);
        }
      } catch (e) {
        setSelectionBox(null);
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  // Container width tracking
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    let raf;
    const ro = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() =>
        setContainerWidth(entry.contentRect.width)
      );
    });
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  const pageWidth = useMemo(() => {
    if (containerWidth <= 0) return 700;
    if (viewMode === 'two-page') {
      return Math.min(650, Math.floor((containerWidth - 90) / 2));
    }
    return Math.min(880, containerWidth - 64);
  }, [containerWidth, viewMode]);

  // Document loaded callback
  const onDocumentLoad = useCallback((pdf) => {
    setPdfDocument(pdf);
    setNumPages(pdf.numPages);
    setLoadError(null);
    pageTextCache.current.clear();
  }, []);

  const onDocumentError = useCallback((err) => {
    setLoadError(err.message || 'Failed to load PDF.');
  }, []);

  // Page visibility from IntersectionObserver
  const handleVisible = useCallback((pageNum) => {
    currentRef.current = pageNum;
    startTransition(() => {
      setCurrentPage(pageNum);
      setRenderCenter(pageNum);
    });
  }, []);

  const handleMeasured = useCallback((pageNum, height) => {
    heightCache.current[pageNum] = height;
  }, []);

  // Scroll to page
  const scrollToPage = useCallback((raw) => {
    const pg = Math.max(1, Math.min(raw, numRef.current || 1));
    const el = document.getElementById(`page-${pg}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      currentRef.current = pg;
      startTransition(() => { setCurrentPage(pg); setRenderCenter(pg); });
    }
    requestAnimationFrame(() => {
      const thumb = document.getElementById(`thumb-${pg}`);
      if (thumb && sidebarRef.current && sidebarTab === 'thumbnails')
        thumb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }, [sidebarTab]);

  // ── Production-Grade Ultra Fast Full Document Search ───────────────────────
  const performSearch = useCallback(async (query) => {
    if (!query || !query.trim() || !pdfDocument) {
      setSearchResults([]);
      setActiveMatchIndex(-1);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const cleanQuery = query.trim().toLowerCase();
    const results = [];

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      let pageData = pageTextCache.current.get(pageNum);
      if (!pageData) {
        try {
          const page = await pdfDocument.getPage(pageNum);
          const textContent = await page.getTextContent();
          const fullText = textContent.items.map(item => item.str).join(' ');
          pageData = { fullText, items: textContent.items };
          pageTextCache.current.set(pageNum, pageData);
        } catch (e) {
          continue;
        }
      }

      const lower = pageData.fullText.toLowerCase();
      let startIndex = 0;
      let matchInPage = 0;

      while ((startIndex = lower.indexOf(cleanQuery, startIndex)) !== -1) {
        const snippetStart = Math.max(0, startIndex - 28);
        const snippetEnd = Math.min(pageData.fullText.length, startIndex + cleanQuery.length + 32);
        const snippet = (snippetStart > 0 ? '…' : '') +
          pageData.fullText.slice(snippetStart, snippetEnd) +
          (snippetEnd < pageData.fullText.length ? '…' : '');

        results.push({
          id: `match-${pageNum}-${matchInPage}`,
          pageNumber: pageNum,
          matchIndexInPage: matchInPage,
          snippet,
          globalIndex: results.length,
        });

        matchInPage++;
        startIndex += Math.max(1, cleanQuery.length);
      }
    }

    setSearchResults(results);
    setIsSearching(false);

    if (results.length > 0) {
      setActiveMatchIndex(0);
    } else {
      setActiveMatchIndex(-1);
    }
  }, [pdfDocument]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  // Active match reference
  const activeMatch = useMemo(() => {
    if (activeMatchIndex >= 0 && activeMatchIndex < searchResults.length) {
      return searchResults[activeMatchIndex];
    }
    return null;
  }, [activeMatchIndex, searchResults]);

  // Auto-focus and scroll to active match
  useEffect(() => {
    if (!activeMatch) return;

    scrollToPage(activeMatch.pageNumber);

    const scrollTimeout = setTimeout(() => {
      const activeEl =
        document.querySelector(`.active-pdf-match[data-page="${activeMatch.pageNumber}"]`) ||
        document.querySelector('.active-pdf-match') ||
        document.getElementById(`page-${activeMatch.pageNumber}`);

      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }, 160);

    return () => clearTimeout(scrollTimeout);
  }, [activeMatch, scrollToPage]);

  // Next / Previous match navigation
  const handleNextMatch = useCallback(() => {
    if (searchResults.length === 0) return;
    setActiveMatchIndex(idx => (idx + 1) % searchResults.length);
  }, [searchResults.length]);

  const handlePrevMatch = useCallback(() => {
    if (searchResults.length === 0) return;
    setActiveMatchIndex(idx => (idx - 1 + searchResults.length) % searchResults.length);
  }, [searchResults.length]);

  // Zoom
  const zoomIn  = useCallback(() =>
    setScale(s => +Math.min(s + ZOOM_STEP, MAX_ZOOM).toFixed(2)), []);
  const zoomOut = useCallback(() =>
    setScale(s => +Math.max(s - ZOOM_STEP, MIN_ZOOM).toFixed(2)), []);

  // Rotate
  const handleRotate = useCallback(() => {
    setRotation(r => (r + 90) % 360);
  }, []);

  // Fullscreen Toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Print Document
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Download PDF (with embedded digital signatures if placed)
  const handleDownload = useCallback(async () => {
    if (!file) return;

    if (placedSignatures.length > 0) {
      try {
        const fileBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
        const pages = pdfDoc.getPages();

        for (const sig of placedSignatures) {
          const targetPage = pages[sig.pageNumber - 1];
          if (!targetPage) continue;

          // Convert dataUrl to Uint8Array
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
          // Invert Y axis for PDF coordinate system (origin bottom-left)
          const sigY = pageH - (sig.y * scaleRatio) - sigH;

          targetPage.drawImage(embeddedSig, {
            x: Math.max(0, sigX),
            y: Math.max(0, sigY),
            width: sigW,
            height: sigH,
          });
        }

        const signedBytes = await pdfDoc.save();
        downloadFile(signedBytes, `signed_${file.name || 'document.pdf'}`);
        return;
      } catch (err) {
        console.error('Error baking digital signature into PDF:', err);
      }
    }

    const url = typeof file === 'string' ? file : URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (typeof file !== 'string') {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }, [file, placedSignatures, pageWidth]);

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
    const y = e.clientY - rect.top - 30;
    setPlacedSignatures(prev => [
      ...prev,
      {
        id: `sig-${Date.now()}`,
        pageNumber,
        x: Math.max(10, x),
        y: Math.max(10, y),
        dataUrl: pendingSignature,
      },
    ]);
    setPendingSignature(null);
  };

  // Keyboard handler
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
        return;
      }

      if (e.target.tagName === 'INPUT') {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) {
            handlePrevMatch();
          } else {
            handleNextMatch();
          }
        }
        if (e.key === 'Escape') {
          e.target.blur();
        }
        return;
      }

      switch (e.key) {
        case '=': case '+': e.preventDefault();
          setScale(s => +Math.min(s + ZOOM_STEP, MAX_ZOOM).toFixed(2)); break;
        case '-': e.preventDefault();
          setScale(s => +Math.max(s - ZOOM_STEP, MIN_ZOOM).toFixed(2)); break;
        case 'r': case 'R': e.preventDefault(); handleRotate(); break;
        case 'd': case 'D': e.preventDefault(); handleToggleDarkMode(); break;
        case 'v': case 'V': e.preventDefault();
          setViewMode(m => (m === 'single' ? 'two-page' : 'single')); break;
        case 's': case 'S': e.preventDefault(); setShowSidebar(v => !v); break;
        case 'f': case 'F': e.preventDefault(); toggleFullscreen(); break;
        case 'ArrowDown': e.preventDefault();
          mainRef.current?.scrollBy({ top:  SCROLL_PX, behavior: 'smooth' }); break;
        case 'ArrowUp':   e.preventDefault();
          mainRef.current?.scrollBy({ top: -SCROLL_PX, behavior: 'smooth' }); break;
        case 'PageDown':  e.preventDefault(); scrollToPage(currentRef.current + 1); break;
        case 'PageUp':    e.preventDefault(); scrollToPage(currentRef.current - 1); break;
        case 'Home':      e.preventDefault(); scrollToPage(1); break;
        case 'End':       e.preventDefault(); scrollToPage(numRef.current || 1); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scrollToPage, handleRotate, toggleFullscreen, handleToggleDarkMode, handleNextMatch, handlePrevMatch, handlePrint]);

  // Auto-sync sidebar thumbnail
  useEffect(() => {
    if (sidebarTab !== 'thumbnails') return;
    requestAnimationFrame(() => {
      const thumb = document.getElementById(`thumb-${currentPage}`);
      if (thumb && sidebarRef.current)
        thumb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }, [currentPage, sidebarTab]);

  const pageNums = useMemo(
    () => Array.from({ length: numPages || 0 }, (_, i) => i + 1),
    [numPages]
  );

  // Group pages for Two-Page spread
  const pageRows = useMemo(() => {
    if (viewMode !== 'two-page' || !numPages) {
      return pageNums.map(n => [n]);
    }
    const rows = [];
    rows.push([1]); // First cover page alone
    for (let i = 2; i <= numPages; i += 2) {
      if (i + 1 <= numPages) {
        rows.push([i, i + 1]);
      } else {
        rows.push([i]);
      }
    }
    return rows;
  }, [pageNums, viewMode, numPages]);

  const renderMin = renderCenter - RENDER_BUFFER;
  const renderMax = renderCenter + RENDER_BUFFER;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', background: 'var(--bg-color)', overflow: 'hidden',
    }}>

      {/* ── Active Viewer Tool Modals ── */}
      <AnimatePresence>
        {activeViewerTool === 'organize' && (
          <PageOrganizerModal
            initialFile={file}
            onClose={() => setActiveViewerTool(null)}
            onUpdateDocument={(newFile) => { setFile(newFile); setActiveViewerTool(null); }}
          />
        )}
        {activeViewerTool === 'split' && (
          <SplitPDFTool initialFile={file} onClose={() => setActiveViewerTool(null)} />
        )}
        {activeViewerTool === 'watermark' && (
          <WatermarkTool
            initialFile={file}
            onClose={() => setActiveViewerTool(null)}
            onUpdateDocument={(newFile) => { setFile(newFile); setActiveViewerTool(null); }}
          />
        )}
        {activeViewerTool === 'numbering' && (
          <PageNumberingTool
            initialFile={file}
            onClose={() => setActiveViewerTool(null)}
            onUpdateDocument={(newFile) => { setFile(newFile); setActiveViewerTool(null); }}
          />
        )}
        {activeViewerTool === 'pdf-to-img' && (
          <PDFToImagesTool initialFile={file} onClose={() => setActiveViewerTool(null)} />
        )}
        {activeViewerTool === 'sanitize' && (
          <PDFSecurityModal
            initialFile={file}
            onClose={() => setActiveViewerTool(null)}
            onUpdateDocument={(newFile) => { setFile(newFile); setActiveViewerTool(null); }}
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

      {/* ── Floating Navbar ── */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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

          <div style={{ width: 1, height: 20, background: 'var(--glass-border)' }} />
          <span style={{
            fontSize: 13, fontWeight: 500,
            maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {file.name}
          </span>
          {numPages && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              — {numPages}p
            </span>
          )}
        </div>

        {/* Center / Navigation Controls */}
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

        {/* Right Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          
          {/* ── Ultra Fast Search Bar with Next/Prev & Counter ── */}
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
                    <Stamp size={15} color="#ff9500" /> Watermark & Stamp
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
                    onClick={() => { setActiveViewerTool('pdf-to-img'); setShowToolsMenu(false); }}
                    style={{ justifyContent: 'flex-start', padding: '8px 10px', fontSize: 13, gap: 8, borderRadius: 8 }}
                  >
                    <FileImage size={15} color="#30b0c7" /> Export to Images ZIP
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
          <span style={{ fontSize: 12, fontWeight: 500, minWidth: 34, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(scale * 100)}%
          </span>
          <button className="btn" onClick={zoomIn} title="Zoom in (+)" style={{ padding: 5 }}>
            <ZoomIn size={15} color="var(--text-secondary)" />
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--glass-border)' }} />

          {/* View Mode (Single vs Two-Page Spread) */}
          <button
            className="btn"
            onClick={() => setViewMode(m => (m === 'single' ? 'two-page' : 'single'))}
            title={viewMode === 'two-page' ? "Switch to Single Page (V)" : "Switch to 2-Page Book Spread (V)"}
            style={{
              padding: 5,
              background: viewMode === 'two-page' ? 'var(--glass-border)' : 'transparent',
              borderRadius: 8,
            }}
          >
            <BookOpen size={15} color="var(--text-secondary)" />
          </button>

          {/* Rotate Button */}
          <button className="btn" onClick={handleRotate} title="Rotate 90° (R)" style={{ padding: 5 }}>
            <RotateCw size={15} color="var(--text-secondary)" />
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            className="btn"
            onClick={handleToggleDarkMode}
            title={isDarkMode ? "Switch to Light Mode (D)" : "Switch to Dark Mode (D)"}
            style={{
              padding: 5,
              background: isDarkMode ? 'var(--accent)' : 'transparent',
              borderRadius: 8,
              transition: 'background 0.2s ease',
            }}
          >
            {isDarkMode ? (
              <Sun size={15} color="var(--bg-color)" />
            ) : (
              <Moon size={15} color="var(--text-secondary)" />
            )}
          </button>

          {/* Print PDF */}
          <button className="btn" onClick={handlePrint} title="Print Document (Ctrl+P)" style={{ padding: 5 }}>
            <Printer size={15} color="var(--text-secondary)" />
          </button>

          {/* Download PDF */}
          <button className="btn" onClick={handleDownload} title="Download PDF" style={{ padding: 5 }}>
            <Download size={15} color="var(--text-secondary)" />
          </button>

          {/* Fullscreen Toggle */}
          <button className="btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"} style={{ padding: 5 }}>
            {isFullscreen ? (
              <Minimize size={15} color="var(--text-secondary)" />
            ) : (
              <Maximize size={15} color="var(--text-secondary)" />
            )}
          </button>
        </div>
      </motion.nav>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', paddingTop: 80 }}>

        {/* ── Sidebar (Thumbnails, Outline & Search Snippets) ── */}
        <AnimatePresence initial={false}>
          {showSidebar && (
            <motion.aside
              key="sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: sidebarTab === 'thumbnails' ? 172 : 250, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 230 }}
              ref={sidebarRef}
              style={{
                height: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                borderRight: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0,
                scrollbarWidth: 'thin',
                willChange: 'transform, width',
              }}
            >
              {/* Sidebar Mode Tabs */}
              <div style={{
                display: 'flex', width: '100%',
                borderBottom: '1px solid var(--glass-border)',
                padding: '6px 8px', gap: 3, position: 'sticky', top: 0,
                background: 'var(--glass-bg)', zIndex: 10, backdropFilter: 'blur(12px)',
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
                  <LayoutList size={13} /> Pages
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
                          No bookmarks or table of contents found in this document.
                        </div>
                      )}
                    </div>
                  )}

                  {sidebarTab === 'search' && (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {searchResults.length === 0 ? (
                        <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
                          {searchQuery ? 'No matching phrases found in document.' : 'Type a phrase in the top search bar to view results.'}
                        </div>
                      ) : (
                        searchResults.map((result, idx) => (
                          <div
                            key={result.id}
                            onClick={() => {
                              setActiveMatchIndex(idx);
                              scrollToPage(result.pageNumber);
                            }}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 8,
                              cursor: 'pointer',
                              background: activeMatchIndex === idx ? 'var(--glass-border)' : 'transparent',
                              border: activeMatchIndex === idx ? '1px solid var(--accent)' : '1px solid transparent',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 4,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>
                                Page {result.pageNumber}
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                                #{idx + 1}
                              </span>
                            </div>
                            <span style={{
                              fontSize: 12, color: 'var(--text-primary)',
                              lineHeight: 1.35, wordBreak: 'break-word',
                            }}>
                              {result.snippet}
                            </span>
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



