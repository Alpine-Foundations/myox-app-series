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
    if (config.rotation) {
      const currentRotation = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentRotation + config.rotation) % 360));
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
        // Tiled repeating watermark grid
        const stepX = Math.max(160, textWidth + 80);
        const stepY = Math.max(120, textHeight + 80);
        for (let x = 40; x < width; x += stepX) {
          for (let y = 40; y < height; y += stepY) {
            page.drawText(text, {
              x,
              y,
              size: Math.max(14, size * 0.55),
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
    if (imageType === 'image/jpeg' || imageType === 'image/jpg') {
      embeddedImg = await pdfDoc.embedJpg(imageBuffer);
    } else {
      embeddedImg = await pdfDoc.embedPng(imageBuffer);
    }

    const { width: naturalW, height: naturalH } = embeddedImg;

    for (const page of pages) {
      const { width, height } = page.getSize();
      const scaleFactor = (size / 100) * (width / (naturalW || 400));
      const targetW = naturalW * scaleFactor;
      const targetH = naturalH * scaleFactor;

      if (layout === 'tile') {
        const stepX = Math.max(160, targetW * 1.5);
        const stepY = Math.max(140, targetH * 1.5);
        for (let x = 40; x < width; x += stepX) {
          for (let y = 40; y < height; y += stepY) {
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
