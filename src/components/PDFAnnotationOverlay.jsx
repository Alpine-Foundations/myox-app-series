import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Trash2, X, Move, Type, Check,
  Copy, Bold, Italic, Palette, Sliders, ChevronDown
} from 'lucide-react';

export default function PDFAnnotationOverlay({
  pageNumber,
  pageWidth,
  pageHeight,
  scale = 1.0,
  activeTool, // null | 'select' | 'pen' | 'highlighter' | 'text' | 'comment' | 'rect' | 'circle' | 'arrow' | 'line'
  strokeColor = '#2563eb',
  strokeWidth = 3,
  opacity = 1.0,
  annotations = [],
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef([]);

  // Selection & Interactive Drag/Resize state
  const [selectedId, setSelectedId] = useState(null);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [dragState, setDragState] = useState(null); // { type: 'move' | 'resize', handle?: string, startX, startY, origItem }

  const currentW = pageWidth || 600;
  const currentH = pageHeight || 800;

  // Filter annotations for this page
  const pageItems = annotations.filter(a => a.pageNumber === pageNumber);
  const selectedItem = pageItems.find(a => a.id === selectedId);

  // Sync canvas dimensions to container size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width !== currentW || canvas.height !== currentH) {
      canvas.width = currentW;
      canvas.height = currentH;
    }
  }, [currentW, currentH]);

  // Render Freehand Strokes & Highlighters on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pageItems.filter(a => a.type === 'draw').forEach(item => {
      if (!item.points || item.points.length < 2) return;
      ctx.save();
      ctx.globalAlpha = item.opacity || 1.0;
      ctx.strokeStyle = item.color || '#2563eb';
      ctx.lineWidth = item.strokeWidth || 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const p0 = item.points[0];
      const startX = (p0.normX !== undefined ? p0.normX * currentW : p0.x);
      const startY = (p0.normY !== undefined ? p0.normY * currentH : p0.y);
      ctx.moveTo(startX, startY);

      for (let i = 1; i < item.points.length; i++) {
        const pt = item.points[i];
        const px = (pt.normX !== undefined ? pt.normX * currentW : pt.x);
        const py = (pt.normY !== undefined ? pt.normY * currentH : pt.y);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    });
  }, [pageItems, currentW, currentH]);

  // Pointer Down on Container (Creating new annotations or deselecting)
  const handleContainerPointerDown = (e) => {
    if (dragState) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const normX = Math.max(0, Math.min(1, clientX / currentW));
    const normY = Math.max(0, Math.min(1, clientY / currentH));

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      isDrawingRef.current = true;
      currentPathRef.current = [{ x: clientX, y: clientY, normX, normY }];
      setSelectedId(null);
    } else if (activeTool === 'comment') {
      const newComment = {
        id: `comment-${Date.now()}`,
        type: 'comment',
        pageNumber,
        normX,
        normY,
        text: 'Add review comment…',
        author: 'Reviewer',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isResolved: false,
      };
      onAddAnnotation(newComment);
      setActiveCommentId(newComment.id);
      setSelectedId(newComment.id);
    } else if (activeTool === 'text') {
      const newText = {
        id: `text-${Date.now()}`,
        type: 'text',
        pageNumber,
        normX,
        normY,
        normWidth: Math.min(0.4, 200 / currentW),
        normHeight: Math.min(0.12, 60 / currentH),
        content: 'Type custom text…',
        fontSize: 15,
        color: strokeColor,
        isBold: false,
        isItalic: false,
      };
      onAddAnnotation(newText);
      setSelectedId(newText.id);
    } else if (['rect', 'circle', 'arrow', 'line'].includes(activeTool)) {
      const newShape = {
        id: `shape-${Date.now()}`,
        type: 'shape',
        shapeType: activeTool,
        pageNumber,
        normX,
        normY,
        normWidth: Math.min(0.35, 140 / currentW),
        normHeight: Math.min(0.2, 80 / currentH),
        color: strokeColor,
        strokeWidth: strokeWidth || 3,
        opacity: opacity || 1.0,
      };
      onAddAnnotation(newShape);
      setSelectedId(newShape.id);
    } else {
      // Clicked blank space: clear selection
      if (!e.target.closest('.annotation-item') && !e.target.closest('.annotation-inspector')) {
        setSelectedId(null);
      }
    }
  };

  const handleContainerPointerMove = (e) => {
    if (!isDrawingRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const normX = Math.max(0, Math.min(1, clientX / currentW));
    const normY = Math.max(0, Math.min(1, clientY / currentH));

    currentPathRef.current.push({ x: clientX, y: clientY, normX, normY });
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.globalAlpha = activeTool === 'highlighter' ? 0.35 : opacity;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = activeTool === 'highlighter' ? strokeWidth * 4.5 : strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const pts = currentPathRef.current;
    if (pts.length > 1) {
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }
    ctx.restore();
  };

  const handleContainerPointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentPathRef.current.length > 1) {
      onAddAnnotation({
        id: `draw-${Date.now()}`,
        type: 'draw',
        pageNumber,
        points: currentPathRef.current.map(p => ({ normX: p.normX, normY: p.normY })),
        color: strokeColor,
        strokeWidth: activeTool === 'highlighter' ? strokeWidth * 4.5 : strokeWidth,
        opacity: activeTool === 'highlighter' ? 0.35 : opacity,
      });
    }
    currentPathRef.current = [];
  };

  // ── Drag & Resize Handlers ──
  const startDrag = (e, item, handle = null) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(item.id);

    setDragState({
      type: handle ? 'resize' : 'move',
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origItem: { ...item },
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const onPointerMove = (e) => {
      const dx = (e.clientX - dragState.startX) / currentW;
      const dy = (e.clientY - dragState.startY) / currentH;
      const orig = dragState.origItem;

      if (dragState.type === 'move') {
        const nextX = Math.max(0, Math.min(1 - (orig.normWidth || 0.1), orig.normX + dx));
        const nextY = Math.max(0, Math.min(1 - (orig.normHeight || 0.05), orig.normY + dy));
        onUpdateAnnotation(orig.id, { normX: nextX, normY: nextY });
      } else if (dragState.type === 'resize') {
        const h = dragState.handle;
        let newX = orig.normX;
        let newY = orig.normY;
        let newW = orig.normWidth || 0.2;
        let newH = orig.normHeight || 0.1;

        if (h.includes('e')) newW = Math.max(0.04, Math.min(1 - orig.normX, orig.normWidth + dx));
        if (h.includes('s')) newH = Math.max(0.03, Math.min(1 - orig.normY, orig.normHeight + dy));
        if (h.includes('w')) {
          const maxDx = orig.normWidth - 0.04;
          const actualDx = Math.min(maxDx, dx);
          newX = orig.normX + actualDx;
          newW = orig.normWidth - actualDx;
        }
        if (h.includes('n')) {
          const maxDy = orig.normHeight - 0.03;
          const actualDy = Math.min(maxDy, dy);
          newY = orig.normY + actualDy;
          newH = orig.normHeight - actualDy;
        }

        onUpdateAnnotation(orig.id, {
          normX: newX,
          normY: newY,
          normWidth: newW,
          normHeight: newH,
        });
      }
    };

    const onPointerUp = () => {
      setDragState(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragState, currentW, currentH, onUpdateAnnotation]);

  // Keyboard shortcut: Delete key deletes selected item
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        onDeleteAnnotation(selectedId);
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, onDeleteAnnotation]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: activeTool ? 'auto' : 'none',
        zIndex: 25,
        cursor: activeTool && activeTool !== 'select' ? 'crosshair' : 'default',
        touchAction: 'none',
      }}
      onPointerDown={handleContainerPointerDown}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
    >
      {/* Freehand Strokes Canvas */}
      <canvas
        ref={canvasRef}
        width={currentW}
        height={currentH}
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />

      {/* Rendered Interactive Annotation Items */}
      {pageItems.map(item => {
        // Calculate rendered pixel dimensions from normalized coords
        const posX = (item.normX !== undefined ? item.normX * currentW : item.x || 20);
        const posY = (item.normY !== undefined ? item.normY * currentH : item.y || 20);
        const itemW = Math.max(30, (item.normWidth !== undefined ? item.normWidth * currentW : item.width || 120));
        const itemH = Math.max(20, (item.normHeight !== undefined ? item.normHeight * currentH : item.height || 60));
        const isSelected = selectedId === item.id;

        // 1. Sticky Note Comment Pin
        if (item.type === 'comment') {
          const isOpen = activeCommentId === item.id;
          return (
            <div
              key={item.id}
              className="annotation-item"
              style={{
                position: 'absolute',
                left: posX,
                top: posY,
                pointerEvents: 'auto',
                cursor: 'grab',
                zIndex: isSelected ? 40 : 25,
              }}
              onPointerDown={(e) => startDrag(e, item)}
            >
              <div
                className="sticky-note-pin"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveCommentId(isOpen ? null : item.id);
                  setSelectedId(item.id);
                }}
                style={{
                  background: item.isResolved ? '#10b981' : '#f59e0b',
                  outline: isSelected ? '2px solid #2563eb' : 'none',
                }}
                title={`Note by ${item.author}`}
              >
                <MessageSquare size={13} color="#ffffff" />
              </div>

              {/* Comment Card Popup */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-panel"
                    style={{
                      position: 'absolute', top: 30, left: -20, width: 220,
                      background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', padding: 10,
                      boxShadow: 'var(--shadow-lg)', border: '1px solid var(--glass-border)',
                      zIndex: 100, display: 'flex', flexDirection: 'column', gap: 6,
                    }}
                    onClick={e => e.stopPropagation()}
                    onPointerDown={e => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.author} • {item.timestamp}
                      </span>
                      <button
                        className="btn"
                        onClick={() => onDeleteAnnotation(item.id)}
                        style={{ padding: 2, color: '#ef4444' }}
                        title="Delete note"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <textarea
                      value={item.text}
                      onChange={e => onUpdateAnnotation(item.id, { text: e.target.value })}
                      style={{
                        width: '100%', height: 55, borderRadius: 'var(--radius-xs)', padding: 6,
                        background: 'var(--bg-subtle)', border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)', fontSize: 12, outline: 'none', resize: 'none',
                      }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={item.isResolved}
                          onChange={e => onUpdateAnnotation(item.id, { isResolved: e.target.checked })}
                        />
                        <span style={{ color: 'var(--text-secondary)' }}>Resolved</span>
                      </label>
                      <button
                        className="btn btn-primary"
                        onClick={() => setActiveCommentId(null)}
                        style={{ padding: '2px 8px', fontSize: 11, borderRadius: 'var(--radius-xs)' }}
                      >
                        Done
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        }

        // 2. Rich Text Block (Draggable & Resizable)
        if (item.type === 'text') {
          return (
            <div
              key={item.id}
              className="annotation-item"
              style={{
                position: 'absolute',
                left: posX,
                top: posY,
                width: itemW,
                minHeight: itemH,
                pointerEvents: 'auto',
                padding: '4px 6px',
                borderRadius: 'var(--radius-xs)',
                background: isSelected ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
                outline: isSelected ? '1.5px solid #2563eb' : '1px dashed rgba(0,0,0,0.15)',
                boxShadow: isSelected ? 'var(--shadow-md)' : 'none',
                zIndex: isSelected ? 40 : 25,
                cursor: isSelected ? 'move' : 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
              }}
              onPointerDown={(e) => startDrag(e, item)}
              onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}
            >
              <textarea
                value={item.content}
                onChange={e => onUpdateAnnotation(item.id, { content: e.target.value })}
                onPointerDown={e => e.stopPropagation()}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: item.color || '#18181b',
                  fontSize: item.fontSize || 15,
                  fontWeight: item.isBold ? 700 : 400,
                  fontStyle: item.isItalic ? 'italic' : 'normal',
                  outline: 'none',
                  width: '100%',
                  height: '100%',
                  resize: 'none',
                  fontFamily: 'inherit',
                  lineHeight: 1.3,
                  padding: 0,
                  margin: 0,
                }}
              />

              {/* Resize Handle */}
              {isSelected && (
                <div
                  onPointerDown={(e) => startDrag(e, item, 'se')}
                  style={{
                    position: 'absolute', right: -4, bottom: -4, width: 9, height: 9,
                    background: '#2563eb', borderRadius: 2, cursor: 'se-resize',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                />
              )}
            </div>
          );
        }

        // 3. Geometric Shapes (Rectangle, Circle, Arrow, Line)
        if (item.type === 'shape') {
          return (
            <div
              key={item.id}
              className="annotation-item"
              style={{
                position: 'absolute',
                left: posX,
                top: posY,
                width: itemW,
                height: itemH,
                pointerEvents: 'auto',
                opacity: item.opacity || 1.0,
                zIndex: isSelected ? 40 : 25,
                outline: isSelected ? '1.5px solid #2563eb' : 'none',
                cursor: 'move',
              }}
              onPointerDown={(e) => startDrag(e, item)}
              onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}
            >
              {item.shapeType === 'rect' && (
                <div style={{
                  width: '100%', height: '100%',
                  border: `${item.strokeWidth || 3}px solid ${item.color || '#2563eb'}`,
                  borderRadius: 6, background: `${item.color || '#2563eb'}12`,
                }} />
              )}

              {item.shapeType === 'circle' && (
                <div style={{
                  width: '100%', height: '100%',
                  border: `${item.strokeWidth || 3}px solid ${item.color || '#2563eb'}`,
                  borderRadius: '50%', background: `${item.color || '#2563eb'}12`,
                }} />
              )}

              {item.shapeType === 'arrow' && (
                <svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                  <defs>
                    <marker id={`head-${item.id}`} orient="auto" markerWidth="6" markerHeight="6" refX="4" refY="3">
                      <path d="M0,0 L6,3 L0,6 Z" fill={item.color || '#2563eb'} />
                    </marker>
                  </defs>
                  <path
                    d="M10,50 L85,15"
                    stroke={item.color || '#2563eb'}
                    strokeWidth={item.strokeWidth || 3}
                    fill="none"
                    markerEnd={`url(#head-${item.id})`}
                  />
                </svg>
              )}

              {item.shapeType === 'line' && (
                <div style={{
                  width: '100%', height: item.strokeWidth || 3,
                  background: item.color || '#2563eb',
                  marginTop: itemH / 2,
                }} />
              )}

              {/* 8 Resize Handles on Selection */}
              {isSelected && (
                <>
                  {['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'].map(handle => {
                    const isN = handle.includes('n');
                    const isS = handle.includes('s');
                    const isW = handle.includes('w');
                    const isE = handle.includes('e');
                    return (
                      <div
                        key={handle}
                        onPointerDown={(e) => startDrag(e, item, handle)}
                        style={{
                          position: 'absolute',
                          top: isN ? -4 : isS ? 'calc(100% - 4px)' : 'calc(50% - 4px)',
                          left: isW ? -4 : isE ? 'calc(100% - 4px)' : 'calc(50% - 4px)',
                          width: 8, height: 8,
                          background: '#ffffff',
                          border: '1.5px solid #2563eb',
                          borderRadius: 2,
                          cursor: `${handle}-resize`,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          zIndex: 50,
                        }}
                      />
                    );
                  })}
                </>
              )}
            </div>
          );
        }

        return null;
      })}

      {/* ── Floating Inspector Toolbar for Selected Annotation ── */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            className="annotation-inspector glass-panel"
            style={{
              position: 'absolute',
              left: Math.max(10, Math.min(currentW - 240, (selectedItem.normX !== undefined ? selectedItem.normX * currentW : selectedItem.x || 20))),
              top: Math.max(8, (selectedItem.normY !== undefined ? selectedItem.normY * currentH : selectedItem.y || 20) - 44),
              zIndex: 100,
              padding: '4px 8px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-card)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              pointerEvents: 'auto',
            }}
            onPointerDown={e => e.stopPropagation()}
          >
            {/* Color Swatch */}
            <input
              type="color"
              value={selectedItem.color || '#2563eb'}
              onChange={e => onUpdateAnnotation(selectedItem.id, { color: e.target.value })}
              style={{ width: 20, height: 20, borderRadius: 4, border: 'none', cursor: 'pointer', background: 'transparent' }}
              title="Change color"
            />

            {/* If Text Block: Font size & Bold */}
            {selectedItem.type === 'text' && (
              <>
                <button
                  className="btn"
                  onClick={() => onUpdateAnnotation(selectedItem.id, { isBold: !selectedItem.isBold })}
                  style={{
                    padding: '2px 5px', fontSize: 11, borderRadius: 4,
                    background: selectedItem.isBold ? 'var(--accent-soft)' : 'transparent',
                    fontWeight: 700,
                  }}
                  title="Toggle Bold"
                >
                  <Bold size={12} />
                </button>
                <button
                  className="btn"
                  onClick={() => onUpdateAnnotation(selectedItem.id, { isItalic: !selectedItem.isItalic })}
                  style={{
                    padding: '2px 5px', fontSize: 11, borderRadius: 4,
                    background: selectedItem.isItalic ? 'var(--accent-soft)' : 'transparent',
                  }}
                  title="Toggle Italic"
                >
                  <Italic size={12} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {[12, 16, 20, 24].map(sz => (
                    <button
                      key={sz}
                      className="btn"
                      onClick={() => onUpdateAnnotation(selectedItem.id, { fontSize: sz })}
                      style={{
                        padding: '1px 4px', fontSize: 10, borderRadius: 3,
                        background: (selectedItem.fontSize || 15) === sz ? 'var(--accent-soft)' : 'transparent',
                        fontWeight: 600,
                      }}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* If Shape: Stroke thickness */}
            {selectedItem.type === 'shape' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {[1, 3, 6].map(st => (
                  <button
                    key={st}
                    className="btn"
                    onClick={() => onUpdateAnnotation(selectedItem.id, { strokeWidth: st })}
                    style={{
                      padding: '1px 5px', fontSize: 10, borderRadius: 3,
                      background: (selectedItem.strokeWidth || 3) === st ? 'var(--accent-soft)' : 'transparent',
                      fontWeight: 600,
                    }}
                  >
                    {st}px
                  </button>
                ))}
              </div>
            )}

            <div style={{ width: 1, height: 14, background: 'var(--glass-border)', margin: '0 2px' }} />

            {/* Delete button */}
            <button
              className="btn"
              onClick={() => {
                onDeleteAnnotation(selectedItem.id);
                setSelectedId(null);
              }}
              style={{ padding: '2px 5px', color: '#ef4444', borderRadius: 4 }}
              title="Delete annotation (Del)"
            >
              <Trash2 size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
