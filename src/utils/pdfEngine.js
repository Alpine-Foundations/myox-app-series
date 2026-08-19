import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { pdfjs } from 'react-pdf';

/**
 * Merge multiple PDF files into one single PDF Uint8Array.
 */
export async function mergePDFDocuments(fileList) {
  const mergedPdf = await PDFDocument.create();

  for (const file of fileList) {
    const fileBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * Reorder, rotate, duplicate, or delete pages in a PDF document.
 * pageConfigs: Array of { pageIndex: number (0-based), rotation: number (0, 90, 180, 270) }
 */
export async function reorganizePDFPages(file, pageConfigs) {
  const fileBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const outputPdf = await PDFDocument.create();

  for (const config of pageConfigs) {
    const [copiedPage] = await outputPdf.copyPages(sourcePdf, [config.pageIndex]);
    if (config.rotation !== undefined && config.rotation !== null) {
      const currentRotation = copiedPage.getRotation().angle || 0;
      const targetAngle = ((currentRotation + config.rotation) % 360 + 360) % 360;
      copiedPage.setRotation(degrees(targetAngle));
    }
    outputPdf.addPage(copiedPage);
  }

  return await outputPdf.save();
}

/**
 * Split PDF by page selections or ranges.
 */
export async function splitPDFDocument(file, selectedPageIndices) {
  const fileBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const outputPdf = await PDFDocument.create();

  const copiedPages = await outputPdf.copyPages(sourcePdf, selectedPageIndices);
  copiedPages.forEach((page) => outputPdf.addPage(page));

  return await outputPdf.save();
}

/**
 * Add custom Text or Image Watermark across all pages in a PDF document.
 * options:
 *   mode: 'text' | 'image'
 *   text: string
 *   fontFamily: 'helvetica-bold' | 'helvetica' | 'times-bold' | 'times' | 'courier-bold' | 'courier'
 *   opacity: number (0.05 - 1.0)
 *   size: number (fontSize for text, scale factor 0.1 - 1.0 for image)
 *   rotation: number (-90 to +90)
 *   color: string (hex)
 *   layout: 'center' | 'diagonal' | 'tile'
 *   gridSpacing: number (distance between tiles, e.g. 80 - 300)
 *   imageBuffer: ArrayBuffer | Uint8Array (for image mode)
 *   imageType: 'image/png' | 'image/jpeg'
 */
export async function addWatermarkToPDF(file, {
  mode = 'text',
  text = 'CONFIDENTIAL',
  fontFamily = 'helvetica-bold',
  opacity = 0.35,
  size = 48,
  rotation = -45,
  color = '#ff3b30',
  layout = 'diagonal',
  gridSpacing = 140,
  imageBuffer = null,
  imageType = 'image/png',
}) {
  const fileBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  if (mode === 'text') {
    let standardFont = StandardFonts.HelveticaBold;
    if (fontFamily === 'helvetica') standardFont = StandardFonts.Helvetica;
    else if (fontFamily === 'times-bold') standardFont = StandardFonts.TimesRomanBold;
    else if (fontFamily === 'times') standardFont = StandardFonts.TimesRoman;
    else if (fontFamily === 'courier-bold') standardFont = StandardFonts.CourierBold;
    else if (fontFamily === 'courier') standardFont = StandardFonts.Courier;

    const font = await pdfDoc.embedFont(standardFont);

    // Convert hex to rgb
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
    const g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
    const b = parseInt(hex.substring(4, 6), 16) / 255 || 0;

    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, size);
      const textHeight = font.heightAtSize(size);

      if (layout === 'tile') {
        // Tiled repeating watermark grid with user-customizable distance
        const stepX = Math.max(60, gridSpacing + textWidth * 0.4);
        const stepY = Math.max(60, gridSpacing + textHeight * 0.4);
        for (let x = 30; x < width + stepX; x += stepX) {
          for (let y = 30; y < height + stepY; y += stepY) {
            page.drawText(text, {
              x,
              y,
              size: Math.max(12, size * 0.65),
              font,
              color: rgb(r, g, b),
              opacity: Math.max(0.04, Math.min(1, opacity * 0.7)),
              rotate: degrees(rotation),
            });
          }
        }
      } else {
        // Center / Diagonal single stamp
        page.drawText(text, {
          x: width / 2 - textWidth / 2 + 10,
          y: height / 2 - textHeight / 2,
          size,
          font,
          color: rgb(r, g, b),
          opacity: Math.max(0.05, Math.min(1, opacity)),
          rotate: degrees(rotation),
        });
      }
    }
  } else if (mode === 'image' && imageBuffer) {
    let embeddedImg;
    const cleanBytes = imageBuffer instanceof Uint8Array ? imageBuffer : new Uint8Array(imageBuffer);

    try {
      if (imageType && (imageType.includes('jpeg') || imageType.includes('jpg'))) {
        embeddedImg = await pdfDoc.embedJpg(cleanBytes);
      } else {
        embeddedImg = await pdfDoc.embedPng(cleanBytes);
      }
    } catch (err1) {
      try {
        embeddedImg = await pdfDoc.embedPng(cleanBytes);
      } catch (err2) {
        embeddedImg = await pdfDoc.embedJpg(cleanBytes);
      }
    }

    if (!embeddedImg) {
      throw new Error('Could not embed watermark image. Please ensure file is a valid PNG or JPEG image.');
    }

    const { width: naturalW, height: naturalH } = embeddedImg;

    for (const page of pages) {
      const { width, height } = page.getSize();
      const scaleFactor = (size / 100) * (width / (naturalW || 400));
      const targetW = naturalW * scaleFactor;
      const targetH = naturalH * scaleFactor;

      if (layout === 'tile') {
        const stepX = Math.max(60, gridSpacing + targetW * 0.6);
        const stepY = Math.max(60, gridSpacing + targetH * 0.6);
        for (let x = 30; x < width + stepX; x += stepX) {
          for (let y = 30; y < height + stepY; y += stepY) {
            page.drawImage(embeddedImg, {
              x,
              y,
              width: targetW * 0.6,
              height: targetH * 0.6,
              opacity: Math.max(0.04, Math.min(1, opacity * 0.7)),
              rotate: degrees(rotation),
            });
          }
        }
      } else {
        page.drawImage(embeddedImg, {
          x: width / 2 - targetW / 2,
          y: height / 2 - targetH / 2,
          width: targetW,
          height: targetH,
          opacity: Math.max(0.05, Math.min(1, opacity)),
          rotate: degrees(rotation),
        });
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Tint / Shade PDF Background with faint eye-comfort colors (Sepia, Soft Mint, Rose, Lavender, etc.)
 */
export async function tintPDFBackground(file, { color = '#fbf0d9', opacity = 0.18 }) {
  const fileBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255 || 0.98;
  const g = parseInt(hex.substring(2, 4), 16) / 255 || 0.94;
  const b = parseInt(hex.substring(4, 6), 16) / 255 || 0.85;

  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(r, g, b),
      opacity: Math.max(0.05, Math.min(0.5, opacity)),
    });
  }

  return await pdfDoc.save();
}

function toRoman(num) {
  const lookup = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
  let roman = '';
  for (let i in lookup) {
    while (num >= lookup[i]) {
      roman += i;
      num -= lookup[i];
    }
  }
  return roman || `${num}`;
}

/**
 * Add Page Numbers with Advanced Book Badges and Custom Formats.
 * position: 'bottom-center' | 'bottom-right' | 'top-right' | 'bottom-left' | 'top-center'
 * format: 'number' | 'page-n' | 'page-n-of-total' | 'slash' | 'dash' | 'tilde' | 'chapter' | 'roman-upper' | 'roman-lower' | 'doc-ref'
 * badgeStyle: 'none' | 'pill' | 'ribbon' | 'ring' | 'notch'
 * badgeColor: hex color (e.g. '#0a2540')
 */
export async function addPageNumbersToPDF(file, {
  position = 'bottom-center',
  format = 'page-n-of-total',
  badgeStyle = 'pill',
  badgeColor = '#0a2540',
  startNumber = 1,
  fontSize = 10,
}) {
  const fileBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  const hex = badgeColor.replace('#', '');
  const br = parseInt(hex.substring(0, 2), 16) / 255 || 0.1;
  const bg = parseInt(hex.substring(2, 4), 16) / 255 || 0.15;
  const bb = parseInt(hex.substring(4, 6), 16) / 255 || 0.25;

  pages.forEach((page, idx) => {
    const currentNum = startNumber + idx;
    let label = `${currentNum}`;
    if (format === 'page-n') label = `Page ${currentNum}`;
    else if (format === 'page-n-of-total') label = `Page ${currentNum} of ${totalPages}`;
    else if (format === 'slash') label = `${currentNum} / ${totalPages}`;
    else if (format === 'dash') label = `— ${currentNum} —`;
    else if (format === 'tilde') label = `~ ${currentNum} ~`;
    else if (format === 'chapter') label = `Page • ${currentNum}`;
    else if (format === 'roman-upper') label = toRoman(currentNum);
    else if (format === 'roman-lower') label = toRoman(currentNum).toLowerCase();
    else if (format === 'doc-ref') label = `REF-DOC • ${String(currentNum).padStart(3, '0')}`;

    const { width, height } = page.getSize();
    const activeFont = badgeStyle === 'none' ? regularFont : font;
    const textWidth = activeFont.widthOfTextAtSize(label, fontSize);
    const textHeight = activeFont.heightAtSize(fontSize);

    let x = width / 2 - textWidth / 2;
    let y = 24;

    if (position === 'bottom-right') {
      x = width - textWidth - 36;
      y = 24;
    } else if (position === 'bottom-left') {
      x = 36;
      y = 24;
    } else if (position === 'top-right') {
      x = width - textWidth - 36;
      y = height - 32;
    } else if (position === 'top-center') {
      x = width / 2 - textWidth / 2;
      y = height - 32;
    }

    // Render Badge Backgrounds
    if (badgeStyle === 'pill') {
      const padX = 14;
      const padY = 5;
      const boxW = textWidth + padX * 2;
      const boxH = textHeight + padY * 2;
      page.drawRectangle({
        x: x - padX,
        y: y - padY + 1,
        width: boxW,
        height: boxH,
        color: rgb(br, bg, bb),
        borderRadius: boxH / 2,
      });
      // Text color white on filled pill
      page.drawText(label, {
        x,
        y,
        size: fontSize,
        font: activeFont,
        color: rgb(1, 1, 1),
      });
    } else if (badgeStyle === 'ribbon') {
      const padX = 16;
      const padY = 6;
      page.drawRectangle({
        x: x - padX,
        y: y - padY,
        width: textWidth + padX * 2,
        height: textHeight + padY * 2,
        color: rgb(br, bg, bb),
        opacity: 0.15,
      });
      page.drawRectangle({
        x: x - padX,
        y: y - padY,
        width: 3,
        height: textHeight + padY * 2,
        color: rgb(br, bg, bb),
      });
      page.drawText(label, {
        x,
        y,
        size: fontSize,
        font: activeFont,
        color: rgb(br, bg, bb),
      });
    } else if (badgeStyle === 'ring') {
      const radius = Math.max(textWidth, textHeight) / 2 + 8;
      page.drawCircle({
        x: x + textWidth / 2,
        y: y + textHeight / 2 - 2,
        size: radius,
        color: rgb(br, bg, bb),
        borderColor: rgb(1, 1, 1),
        borderWidth: 1.5,
      });
      page.drawText(label, {
        x,
        y,
        size: fontSize,
        font: activeFont,
        color: rgb(1, 1, 1),
      });
    } else if (badgeStyle === 'notch') {
      // Sleek legal underline notch
      page.drawRectangle({
        x: x - 8,
        y: y - 4,
        width: textWidth + 16,
        height: 2,
        color: rgb(br, bg, bb),
      });
      page.drawText(label, {
        x,
        y,
        size: fontSize,
        font: activeFont,
        color: rgb(br, bg, bb),
      });
    } else {
      // Clean minimal text
      page.drawText(label, {
        x,
        y,
        size: fontSize,
        font: regularFont,
        color: rgb(0.25, 0.25, 0.25),
      });
    }
  });

  return await pdfDoc.save();
}

/**
 * Compress PDF Document in browser memory (downsamples pages and optimizes image streams).
 * level: 'low' (quality: 0.8) | 'medium' (quality: 0.55) | 'high' (quality: 0.35)
 */
export async function compressPDFDocument(file, { qualityLevel = 'medium' }) {
  const qualityMap = {
    low: { quality: 0.82, scale: 1.2 },
    medium: { quality: 0.58, scale: 0.95 },
    high: { quality: 0.38, scale: 0.75 },
  };

  const { quality, scale } = qualityMap[qualityLevel] || qualityMap.medium;

  const fileBuffer = await file.arrayBuffer();
  const srcPdf = await pdfjs.getDocument({ data: fileBuffer }).promise;
  const numPages = srcPdf.numPages;

  const outDoc = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    const page = await srcPdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d', { alpha: false });

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Convert canvas to compressed JPEG blob
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const base64Data = dataUrl.split(',')[1];
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let b = 0; b < binary.length; b++) {
      bytes[b] = binary.charCodeAt(b);
    }

    const embeddedJpg = await outDoc.embedJpg(bytes);
    const outPage = outDoc.addPage([viewport.width / scale, viewport.height / scale]);
    outPage.drawImage(embeddedJpg, {
      x: 0,
      y: 0,
      width: viewport.width / scale,
      height: viewport.height / scale,
    });
  }

  return await outDoc.save();
}

/**
 * Strip metadata (Title, Author, Producer, Creation Date) for complete privacy sanitization.
 */
export async function sanitizePDFMetadata(file) {
  const fileBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });

  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('Alpine Document');
  pdfDoc.setCreator('Alpine Document');
  pdfDoc.setCreationDate(new Date(0));
  pdfDoc.setModificationDate(new Date(0));

  return await pdfDoc.save();
}

/**
 * Convert Image files (PNG / JPEG) to a combined multi-page PDF.
 */
export async function convertImagesToPDF(imageList) {
  const pdfDoc = await PDFDocument.create();

  for (const item of imageList) {
    const imgBuffer = await item.file.arrayBuffer();
    let embeddedImg;

    if (item.file.type === 'image/png') {
      embeddedImg = await pdfDoc.embedPng(imgBuffer);
    } else {
      embeddedImg = await pdfDoc.embedJpg(imgBuffer);
    }

    const { width, height } = embeddedImg.scale(1.0);
    // Standard A4 dimensions or adapt to image aspect ratio
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  return await pdfDoc.save();
}

/**
 * Render all pages of a PDF to high-resolution PNGs and package into a ZIP archive.
 */
export async function exportPDFToImagesZip(pdfDocument, { dpiScale = 2.0, format = 'image/png' }) {
  const zip = new JSZip();
  const numPages = pdfDocument.numPages;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale: dpiScale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, format, 0.95));
    const ext = format === 'image/jpeg' ? 'jpg' : 'png';
    const padded = String(pageNum).padStart(String(numPages).length, '0');
    zip.file(`page_${padded}.${ext}`, blob);
  }

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Render selected pages of a PDF to high-resolution PNGs and package into a ZIP archive.
 */
export async function exportSelectedPagesAsImagesZip(file, selectedIndices, { dpiScale = 2.0 } = {}) {
  const fileBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjs.getDocument({ data: fileBuffer }).promise;
  const zip = new JSZip();

  for (let idx = 0; idx < selectedIndices.length; idx++) {
    const pageNum = selectedIndices[idx] + 1;
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: dpiScale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
    const padded = String(idx + 1).padStart(String(selectedIndices.length).length, '0');
    zip.file(`extracted_page_${padded}_(p${pageNum}).png`, blob);
  }

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Helper to download any Blob / Uint8Array to the user's computer.
 */
export function downloadFile(data, filename, type = 'application/pdf') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Bake in-memory annotations, vector signatures, rotations, and privacy sanitization
 * into a single unified PDF Uint8Array.
 */
export async function bakePDFWithModifications(file, {
  placedSignatures = [],
  annotations = [],
  rotation = 0,
  sanitizeMetadata = false,
  compressDocument = false,
  pageWidth = 600,
  defaultAspectRatio = 1.294,
} = {}) {
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
    const normY = sig.normY !== undefined ? sig.normY : (sig.y / ((pageWidth || 600) * defaultAspectRatio));
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
        const normY = ann.normY !== undefined ? ann.normY : (ann.y / ((pageWidth || 600) * defaultAspectRatio));
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

  // 3. Apply global rotation if rotated
  if (rotation && rotation !== 0) {
    for (const page of pages) {
      const curRot = page.getRotation().angle || 0;
      page.setRotation(degrees((curRot + rotation) % 360));
    }
  }

  // 4. Privacy sanitization if requested
  if (sanitizeMetadata) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('Alpine Document');
    pdfDoc.setCreator('Alpine Document');
    pdfDoc.setCreationDate(new Date(0));
    pdfDoc.setModificationDate(new Date(0));
  }

  let finalBytes = await pdfDoc.save();

  // 5. In-memory compression if requested
  if (compressDocument) {
    const tempFile = new File([finalBytes], 'temp.pdf', { type: 'application/pdf' });
    finalBytes = await compressPDFDocument(tempFile, { qualityLevel: 'medium' });
  }

  return finalBytes;
}
