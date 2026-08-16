import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Creates an interactive sample demo document in-memory for instant testing.
 */
export async function createDemoPDFDocument() {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // ── Page 1: Overview & Feature Highlights ──
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
  page1.drawText('Alpine Document — Next-Gen PDF Suite', {
    x: 48,
    y: 780,
    size: 22,
    font: fontBold,
    color: rgb(0, 0.44, 0.89),
  });

  page1.drawText('Interactive Demo Document for Testing All Studio Features', {
    x: 48,
    y: 752,
    size: 13,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.4),
  });

  page1.drawLine({
    start: { x: 48, y: 738 },
    end: { x: 545, y: 738 },
    thickness: 1.5,
    color: rgb(0, 0.44, 0.89),
  });

  const body1 = [
    'Welcome to Alpine Document Lab! You can test all new features directly in this document:',
    '',
    '1. Universal Undo / Redo: Use Ctrl+Z and Ctrl+Y (or the navbar Undo/Redo buttons) to step back and forth.',
    '2. Inline Title Rename: Click the Pencil icon next to the title in the top navbar to rename the file.',
    '3. Ultra-Fast Search with Neon Glow: Press Ctrl+F and type "Alpine" or "Security" to see instant jumping.',
    '4. Annotations Studio: Click the "Annotate" button in the toolbar to draw with freehand pen, use highlighters,',
    '   drop sticky note comments, insert text blocks, and draw rectangles, circles, or arrows.',
    '5. Digital E-Sign: Open "Tools > E-Sign Signature" to draw or type Google calligraphy signatures.',
    '6. Watermarks & Eye-Care Shading: Open "Tools > Watermark & Tint" to apply stamps or soft sepia reading tints.',
    '7. Book-Style Page Numbering: Open "Tools > Page Numbers" to add capsule pills, ribbon tabs, or Roman numerals.',
    '8. Compress PDF & Share: Shrink file size in browser memory and share via AirDrop, Email, or WhatsApp.',
  ];

  let yOffset = 700;
  for (const line of body1) {
    page1.drawText(line, {
      x: 48,
      y: yOffset,
      size: 11,
      font: line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.') || line.startsWith('5.') || line.startsWith('6.') || line.startsWith('7.') || line.startsWith('8.') ? fontBold : fontRegular,
      color: rgb(0.15, 0.15, 0.15),
    });
    yOffset -= 22;
  }

  // ── Page 2: High Performance Architecture ──
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  page2.drawText('Section 2: High Performance Architecture', {
    x: 48,
    y: 780,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.2),
  });

  page2.drawText('Confidential Enterprise Documentation & Specifications', {
    x: 48,
    y: 755,
    size: 12,
    font: fontTimes,
    color: rgb(0.5, 0.2, 0.2),
  });

  const body2 = [
    'The Alpine Document platform is engineered for high-throughput browser-based document processing.',
    'By leveraging Web Workers and direct client-side buffer transformations via PDF-Lib and WebAssembly,',
    'documents are manipulated in-memory without ever being uploaded to external cloud servers.',
    '',
    'Key Capabilities Verified in Lab Branch:',
    '• Search Engine: Pre-indexes textual layout and delivers instantaneous match jumping with multi-layer neon bloom.',
    '• Virtualized Viewport: Maintains a low memory footprint by mounting only nearby pages in the DOM.',
    '• Responsive Two-Page Spread: Adapts fluidly to wide desktop monitors and split screens.',
    '• Non-Destructive Annotation Layer: Text blocks, comments, and vector shapes render over native canvas.',
    '• Universal History Stack: Seamlessly reverts and reapplies any sequence of modifications.',
  ];

  yOffset = 710;
  for (const line of body2) {
    page2.drawText(line, {
      x: 48,
      y: yOffset,
      size: 11,
      font: line.startsWith('•') || line.startsWith('Key Capabilities') ? fontBold : fontRegular,
      color: rgb(0.15, 0.15, 0.15),
    });
    yOffset -= 24;
  }

  // ── Page 3: Signature & Authorization ──
  const page3 = pdfDoc.addPage([595.28, 841.89]);
  page3.drawText('Section 3: Document Verification & Authorization', {
    x: 48,
    y: 780,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.2),
  });

  page3.drawText('Place your digital signature or stamp below to authorize this document.', {
    x: 48,
    y: 750,
    size: 12,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Draw signature placeholder box
  page3.drawRectangle({
    x: 48,
    y: 540,
    width: 495,
    height: 140,
    borderColor: rgb(0.7, 0.7, 0.75),
    borderWidth: 1,
  });

  page3.drawText('AUTHORIZED SIGNATURE / SEAL BOX', {
    x: 68,
    y: 650,
    size: 10,
    font: fontBold,
    color: rgb(0.5, 0.5, 0.55),
  });

  page3.drawText('Click "Tools > E-Sign Signature" or "Annotate" in the navbar above to place a signature here.', {
    x: 68,
    y: 620,
    size: 10,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.45),
  });

  const pdfBytes = await pdfDoc.save();
  return new File([pdfBytes], 'Alpine_Document_Lab_Demo.pdf', {
    type: 'application/pdf',
    lastModified: Date.now(),
  });
}
