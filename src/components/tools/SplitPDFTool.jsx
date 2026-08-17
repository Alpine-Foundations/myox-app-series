import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import { Scissors, UploadCloud, Download, X, CheckSquare, Square, CheckCircle, FileImage } from 'lucide-react';
import { splitPDFDocument, exportSelectedPagesAsImagesZip, downloadFile } from '../../utils/pdfEngine';

export default function SplitPDFTool({ initialFile, onClose }) {
  const [file, setFile] = useState(initialFile || null);
  const [numPages, setNumPages] = useState(null);
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [rangeInput, setRangeInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  const onDocLoad = ({ numPages }) => {
    setNumPages(numPages);
    // Select all pages by default
    const all = new Set();
    for (let i = 0; i < numPages; i++) all.add(i);
    setSelectedPages(all);
  };

  const togglePage = (index) => {
    setSelectedPages(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set();
    for (let i = 0; i < (numPages || 0); i++) all.add(i);
    setSelectedPages(all);
  };

  const deselectAll = () => {
    setSelectedPages(new Set());
  };

  // Parse range input like "1-3, 5, 7-10"
  const applyRangeInput = () => {
    if (!rangeInput.trim() || !numPages) return;
    const parts = rangeInput.split(',');
    const newSelected = new Set();

    parts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(n => parseInt(n.trim(), 10));
        if (!isNaN(start) && !isNaN(end)) {
          for (let p = Math.max(1, start); p <= Math.min(numPages, end); p++) {
            newSelected.add(p - 1);
          }
        }
      } else {
        const single = parseInt(trimmed, 10);
        if (!isNaN(single) && single >= 1 && single <= numPages) {
          newSelected.add(single - 1);
        }
      }
    });

    setSelectedPages(newSelected);
  };

  const handleExtract = async (format = 'pdf') => {
    if (!file || selectedPages.size === 0) {
      alert('Please select at least one page to extract.');
      return;
    }

    setIsProcessing(true);
    try {
      const sortedIndices = Array.from(selectedPages).sort((a, b) => a - b);
      if (format === 'png-zip') {
        const zipBlob = await exportSelectedPagesAsImagesZip(file, sortedIndices);
        const baseName = (file.name || 'document').replace(/\.pdf$/i, '');
        downloadFile(zipBlob, `extracted_png_pages_${baseName}.zip`, 'application/zip');
        setSuccessMsg('PNG ZIP Downloaded!');
      } else {
        const splitBytes = await splitPDFDocument(file, sortedIndices);
        downloadFile(splitBytes, `extracted_${file.name || 'document.pdf'}`);
        setSuccessMsg('PDF Downloaded!');
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSuccessMsg('');
      }, 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to extract pages: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-panel"
        style={{
          width: '100%', maxWidth: 840, maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-color)', borderRadius: 20,
          border: '1px solid var(--glass-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--glass-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255, 59, 48, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff3b30' }}>
              <Scissors size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Split & Extract PDF Pages</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Select specific pages or input a range to save as a new PDF</p>
            </div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: 6 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '48px 16px', borderRadius: 14,
                border: '2px dashed var(--glass-border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', background: 'var(--glass-bg)',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
              />
              <UploadCloud size={40} color="#ff3b30" />
              <span style={{ fontSize: 15, fontWeight: 500, marginTop: 12 }}>Open a PDF to Split</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Click to browse or drop file</span>
            </div>
          ) : (
            <div>
              {/* Range tools bar */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
                gap: 10, padding: '12px 14px', borderRadius: 12, background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)', marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="e.g. 1-3, 5, 8-10"
                    value={rangeInput}
                    onChange={e => setRangeInput(e.target.value)}
                    style={{
                      background: 'var(--bg-color)', border: '1px solid var(--glass-border)',
                      borderRadius: 8, padding: '5px 10px', fontSize: 13, color: 'var(--text-primary)',
                      outline: 'none', width: 140,
                    }}
                  />
                  <button className="btn" onClick={applyRangeInput} style={{ padding: '6px 12px', fontSize: 12, border: '1px solid var(--glass-border)' }}>
                    Apply Range
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button className="btn" onClick={selectAll} style={{ padding: '4px 8px', fontSize: 12 }}>
                    Select All
                  </button>
                  <div style={{ width: 1, height: 16, background: 'var(--glass-border)' }} />
                  <button className="btn" onClick={deselectAll} style={{ padding: '4px 8px', fontSize: 12 }}>
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Pages Grid */}
              <Document file={file} onLoadSuccess={onDocLoad}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: 14,
                }}>
                  {Array.from({ length: numPages || 0 }, (_, i) => {
                    const isSelected = selectedPages.has(i);
                    return (
                      <div
                        key={i}
                        onClick={() => togglePage(i)}
                        style={{
                          cursor: 'pointer',
                          borderRadius: 10,
                          padding: 6,
                          background: isSelected ? 'rgba(255, 59, 48, 0.08)' : 'var(--glass-bg)',
                          border: isSelected ? '2px solid #ff3b30' : '1px solid var(--glass-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.15s ease',
                          position: 'relative',
                        }}
                      >
                        <div style={{
                          width: '100%',
                          height: 160,
                          borderRadius: 6,
                          overflow: 'hidden',
                          background: '#ffffff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Page
                            pageNumber={i + 1}
                            width={120}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
                          {isSelected ? (
                            <CheckSquare size={14} color="#ff3b30" />
                          ) : (
                            <Square size={14} color="var(--text-secondary)" />
                          )}
                          <span>Page {i + 1}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Document>
            </div>
          )}
        </div>

        {/* Footer */}
        {file && (
          <div style={{
            padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {selectedPages.size} of {numPages || 0} page{numPages === 1 ? '' : 's'} selected
            </span>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={onClose} disabled={isProcessing}>
                Cancel
              </button>
              <button
                className="btn"
                disabled={selectedPages.size === 0 || isProcessing}
                onClick={() => handleExtract('png-zip')}
                style={{ gap: 6, opacity: selectedPages.size === 0 ? 0.5 : 1 }}
                title="Download extracted pages as individual high-res PNG images"
              >
                <FileImage size={15} color="#30b0c7" /> Download as PNGs (ZIP)
              </button>
              <button
                className="btn btn-primary"
                disabled={selectedPages.size === 0 || isProcessing}
                onClick={() => handleExtract('pdf')}
                style={{ gap: 6, opacity: selectedPages.size === 0 ? 0.5 : 1 }}
              >
                {success ? <CheckCircle size={16} /> : <Download size={16} />}
                {isProcessing ? 'Extracting…' : success ? successMsg : 'Extract & Download PDF'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
