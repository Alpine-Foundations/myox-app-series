import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Trash2, Check, X, Move, CornerDownRight } from 'lucide-react';

export default function PDFAnnotationOverlay({
  pageNumber,
  pageWidth,
  pageHeight,
  scale,
  activeTool, // null | 'pen' | 'highlighter' | 'text' | 'comment' | 'rect' | 'circle' | 'arrow'
  strokeColor = '#ff0055',
  strokeWidth = 3,
  opacity = 1.0,
  annotations = [],
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
}) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef([]);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);

  // Filter annotations for this page
  const pageItems = annotations.filter(a => a.pageNumber === pageNumber);

  // Setup freehand canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw saved freehand strokes for this page
    pageItems.filter(a => a.type === 'draw').forEach(item => {
      if (!item.points || item.points.length < 2) return;
      ctx.save();
      ctx.globalAlpha = item.opacity || 1.0;
      ctx.strokeStyle = item.color || '#ff0055';
      ctx.lineWidth = item.strokeWidth || 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(item.points[0].x, item.points[0].y);
      for (let i = 1; i < item.points.length; i++) {
        ctx.lineTo(item.points[i].x, item.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    });
  }, [pageItems, pageWidth, pageHeight]);

  const handlePointerDown = (e) => {
    if (!activeTool) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      isDrawingRef.current = true;
      currentPathRef.current = [{ x, y }];
    } else if (activeTool === 'comment') {
      const newComment = {
        id: `comment-${Date.now()}`,
        type: 'comment',
        pageNumber,
        x: Math.max(10, x - 14),
        y: Math.max(10, y - 14),
        text: 'New feedback note…',
        author: 'Reviewer',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isResolved: false,
      };
      onAddAnnotation(newComment);
      setActiveCommentId(newComment.id);
    } else if (activeTool === 'text') {
      const newText = {
        id: `text-${Date.now()}`,
        type: 'text',
        pageNumber,
        x: Math.max(10, x),
        y: Math.max(10, y),
        content: 'Type custom text…',
        fontSize: 16,
        color: strokeColor,
        isBold: true,
      };
      onAddAnnotation(newText);
      setEditingTextId(newText.id);
    } else if (activeTool === 'rect' || activeTool === 'circle' || activeTool === 'arrow') {
      const newShape = {
        id: `shape-${Date.now()}`,
        type: 'shape',
        shapeType: activeTool,
        pageNumber,
        x: Math.max(10, x - 40),
        y: Math.max(10, y - 25),
        width: 100,
        height: 60,
        color: strokeColor,
        strokeWidth: strokeWidth,
        opacity: opacity,
      };
      onAddAnnotation(newShape);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    currentPathRef.current.push({ x, y });
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.globalAlpha = activeTool === 'highlighter' ? 0.35 : opacity;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = activeTool === 'highlighter' ? strokeWidth * 3.5 : strokeWidth;
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

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentPathRef.current.length > 1) {
      onAddAnnotation({
        id: `draw-${Date.now()}`,
        type: 'draw',
        pageNumber,
        points: [...currentPathRef.current],
        color: strokeColor,
        strokeWidth: activeTool === 'highlighter' ? strokeWidth * 3.5 : strokeWidth,
        opacity: activeTool === 'highlighter' ? 0.35 : opacity,
      });
    }
    currentPathRef.current = [];
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: activeTool ? 'auto' : 'none',
        zIndex: 25,
        cursor: activeTool ? 'crosshair' : 'default',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Freehand Canvas */}
      <canvas
        ref={canvasRef}
        width={pageWidth || 600}
        height={pageHeight || 800}
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
      />

      {/* Rendered Text Blocks, Shapes, and Comment Pins */}
      {pageItems.map(item => {
        if (item.type === 'comment') {
          const isOpen = activeCommentId === item.id;
          return (
            <div key={item.id} style={{ position: 'absolute', left: item.x, top: item.y, pointerEvents: 'auto' }}>
              <div
                className="sticky-note-pin"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveCommentId(isOpen ? null : item.id);
                }}
                style={{ background: item.isResolved ? '#34c759' : '#ffd60a' }}
                title={`Comment by ${item.author}`}
              >
                <MessageSquare size={14} color="#000" />
              </div>

              {/* Comment Card Popup */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="glass-panel"
                    style={{
                      position: 'absolute', top: 32, left: -20, width: 230,
                      background: 'var(--bg-color)', borderRadius: 12, padding: 12,
                      boxShadow: '0 12px 36px rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)',
                      zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8,
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>
                        {item.author} • {item.timestamp}
                      </span>
                      <button
                        className="btn"
                        onClick={() => onDeleteAnnotation(item.id)}
                        style={{ padding: 2, color: '#ff3b30' }}
                        title="Delete note"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <textarea
                      value={item.text}
                      onChange={e => onUpdateAnnotation(item.id, { text: e.target.value })}
                      style={{
                        width: '100%', height: 60, borderRadius: 6, padding: 6,
                        background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
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
                        <span>Resolved</span>
                      </label>
                      <button
                        className="btn btn-primary"
                        onClick={() => setActiveCommentId(null)}
                        style={{ padding: '2px 8px', fontSize: 11 }}
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

        if (item.type === 'text') {
          return (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                left: item.x,
                top: item.y,
                pointerEvents: 'auto',
                padding: '4px 8px',
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1px dashed var(--accent)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              onClick={e => e.stopPropagation()}
            >
              <input
                type="text"
                value={item.content}
                onChange={e => onUpdateAnnotation(item.id, { content: e.target.value })}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: item.color || '#000000',
                  fontSize: item.fontSize || 16,
                  fontWeight: item.isBold ? 700 : 400,
                  outline: 'none',
                  minWidth: 80,
                }}
              />
              <button
                className="btn"
                onClick={() => onDeleteAnnotation(item.id)}
                style={{ padding: 2, color: '#ff3b30' }}
                title="Delete text block"
              >
                <X size={12} />
              </button>
            </div>
          );
        }

        if (item.type === 'shape') {
          return (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                left: item.x,
                top: item.y,
                width: item.width,
                height: item.height,
                pointerEvents: 'auto',
                opacity: item.opacity || 1.0,
              }}
              onClick={e => e.stopPropagation()}
            >
              {item.shapeType === 'rect' && (
                <div style={{
                  width: '100%', height: '100%',
                  border: `${item.strokeWidth || 3}px solid ${item.color || '#ff0055'}`,
                  borderRadius: 6, background: 'rgba(255, 0, 85, 0.08)',
                }} />
              )}
              {item.shapeType === 'circle' && (
                <div style={{
                  width: '100%', height: '100%',
                  border: `${item.strokeWidth || 3}px solid ${item.color || '#ff0055'}`,
                  borderRadius: '50%', background: 'rgba(255, 0, 85, 0.08)',
                }} />
              )}
              {item.shapeType === 'arrow' && (
                <svg width="100%" height="100%" viewBox="0 0 100 60" style={{ overflow: 'visible' }}>
                  <defs>
                    <marker id={`head-${item.id}`} orient="auto" markerWidth="6" markerHeight="6" refX="4" refY="3">
                      <path d="M0,0 L6,3 L0,6 Z" fill={item.color || '#ff0055'} />
                    </marker>
                  </defs>
                  <path
                    d="M10,50 L85,15"
                    stroke={item.color || '#ff0055'}
                    strokeWidth={item.strokeWidth || 3}
                    fill="none"
                    markerEnd={`url(#head-${item.id})`}
                  />
                </svg>
              )}
              <button
                className="btn"
                onClick={() => onDeleteAnnotation(item.id)}
                style={{
                  position: 'absolute', top: -10, right: -10,
                  padding: 2, background: 'var(--bg-color)', borderRadius: '50%',
                  border: '1px solid var(--glass-border)', boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
                title="Delete shape"
              >
                <X size={10} color="#ff3b30" />
              </button>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
