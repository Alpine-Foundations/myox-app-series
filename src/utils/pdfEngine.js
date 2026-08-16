import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';

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

/**
 * Add Page Numbers to all pages in a PDF.
 * position: 'bottom-center' | 'bottom-right' | 'top-right' | 'bottom-left'
 * format: 'number' ('1') | 'page-n' ('Page 1') | 'page-n-of-total' ('Page 1 of 12')
 */
export async function addPageNumbersToPDF(file, { position = 'bottom-center', format = 'page-n-of-total', startNumber = 1, fontSize = 10 }) {
  const fileBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  pages.forEach((page, idx) => {
    const currentNum = startNumber + idx;
    let label = `${currentNum}`;
    if (format === 'page-n') label = `Page ${currentNum}`;
    if (format === 'page-n-of-total') label = `Page ${currentNum} of ${totalPages}`;

    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(label, fontSize);
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

    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  });

  return await pdfDoc.save();
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
