import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Generates a production-grade, multi-page Interactive User Manual & Playground Document.
 */
export async function createDemoPDFDocument() {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // ── Color Palette ──
  const cDark = rgb(0.09, 0.09, 0.11);
  const cMuted = rgb(0.44, 0.44, 0.48);
  const cAccent = rgb(0.09, 0.09, 0.11);
  const cBlue = rgb(0.14, 0.39, 0.92);
  const cBorder = rgb(0.85, 0.85, 0.88);
  const cFill = rgb(0.96, 0.96, 0.98);

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1: USER GUIDE & ARCHITECTURE OVERVIEW
  // ══════════════════════════════════════════════════════════════════════════
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4 format

  // Top Header Banner
  page1.drawRectangle({
    x: 48, y: 760, width: 499, height: 44,
    color: cFill, borderColor: cBorder, borderWidth: 1,
  });
  page1.drawText('MYOX DOCUMENT — ALPINE FOUNDATIONS ENTERPRISE GUIDE', {
    x: 64, y: 778, size: 9.5, font: fontBold, color: cMuted,
  });

  // Main Title
  page1.drawText('Hardware-Accelerated Document Studio', {
    x: 48, y: 715, size: 23, font: fontBold, color: cDark,
  });
  page1.drawText('A private, 100% client-side PDF reader, markup suite and utility engine.', {
    x: 48, y: 692, size: 11.5, font: fontRegular, color: cMuted,
  });

  // Section 1: Privacy & Processing Model
  page1.drawText('1. Architecture & Privacy Architecture', {
    x: 48, y: 648, size: 14, font: fontBold, color: cDark,
  });
  page1.drawLine({
    start: { x: 48, y: 638 }, end: { x: 547, y: 638 },
    thickness: 0.75, color: cBorder,
  });

  const p1Text = [
    'Alpine Document processes all documents entirely within your local browser sandbox.',
    'No files, images, signatures, or annotations are ever transmitted to external cloud servers.',
    '',
    '• Zero Server Uploads: All rendering, rotation, compression, and page manipulation run in memory.',
    '• Hardware Accelerated: PDF text and vector graphics are rasterized at native display density.',
    '• Non-Destructive Layering: Annotations and signature seals remain editable until document export.',
    '• Universal History Stack: Full multi-level Undo (Ctrl+Z) and Redo (Ctrl+Y) across all operations.',
  ];

  let y = 618;
  for (const line of p1Text) {
    page1.drawText(line, {
      x: 48, y, size: 10.5,
      font: line.startsWith('•') ? fontBold : fontRegular,
      color: line.startsWith('•') ? cDark : cMuted,
    });
    y -= 18;
  }

  // Section 2: Essential Features & Shortcuts
  y -= 10;
  page1.drawText('2. Essential Shortcuts & Navigation', {
    x: 48, y, size: 14, font: fontBold, color: cDark,
  });
  y -= 10;
  page1.drawLine({
    start: { x: 48, y }, end: { x: 547, y },
    thickness: 0.75, color: cBorder,
  });
  y -= 20;

  const shortcuts = [
    { key: 'Ctrl + F', desc: 'Instant In-Document Search with champagne match navigation' },
    { key: 'Ctrl + Z / Y', desc: 'Universal Undo and Redo for annotations, rotation, and edits' },
    { key: 'R', desc: 'Rotate page orientation clockwise by 90 degrees' },
    { key: 'S', desc: 'Toggle sidebar thumbnails, document outline, and text extraction' },
    { key: 'Eye Menu', desc: 'Switch reading modes: Natural Paper, Warm Sepia, Soft Mint, or OLED Dark' },
  ];

  for (const item of shortcuts) {
    page1.drawRectangle({
      x: 48, y: y - 3, width: 100, height: 18,
      color: cFill, borderColor: cBorder, borderWidth: 0.5,
    });
    page1.drawText(item.key, {
      x: 54, y: y + 2, size: 9, font: fontBold, color: cDark,
    });
    page1.drawText(item.desc, {
      x: 160, y: y + 2, size: 10, font: fontRegular, color: cMuted,
    });
    y -= 24;
  }

  // Footer
  page1.drawText('Page 1 of 3 — Alpine Document User Guide', {
    x: 48, y: 40, size: 9, font: fontRegular, color: cMuted,
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 2: ANNOTATION & UTILITIES GUIDE
  // ══════════════════════════════════════════════════════════════════════════
  const page2 = pdfDoc.addPage([595.28, 841.89]);

  page2.drawText('Interactive Annotation & Utility Suite', {
    x: 48, y: 765, size: 20, font: fontBold, color: cDark,
  });
  page2.drawText('Complete guide to markups, page organization, and PDF tools.', {
    x: 48, y: 742, size: 11, font: fontRegular, color: cMuted,
  });
  page2.drawLine({
    start: { x: 48, y: 730 }, end: { x: 547, y: 730 },
    thickness: 0.75, color: cBorder,
  });

  // Tools Table Grid
  const tools = [
    { title: 'Annotation Studio', desc: 'Freehand pen, text blocks, sticky notes, rectangles, circles, and arrows.' },
    { title: 'Visual Page Organizer', desc: 'Reorder pages via drag and drop, rotate individual pages, or duplicate.' },
    { title: 'Split & Extract', desc: 'Extract selected pages as a new PDF or download high-resolution PNG image ZIP.' },
    { title: 'E-Sign & Stamp Seals', desc: 'Draw vector signatures, type calligraphy fonts, or crop custom seal stamps.' },
    { title: 'Watermark & Background Tint', desc: 'Add confidential text stamps, logo tiles, or custom reading page shaders.' },
    { title: 'Document Numbering', desc: 'Add book-style page numbers, capsule pill badges, or header/footer ribbons.' },
    { title: 'Compress & Optimize', desc: 'Reduce document file size directly in memory with zero loss in visual clarity.' },
  ];

  y = 690;
  for (const t of tools) {
    page2.drawRectangle({
      x: 48, y: y - 10, width: 499, height: 42,
      color: rgb(0.98, 0.98, 0.99), borderColor: cBorder, borderWidth: 0.75,
    });
    page2.drawText(t.title, {
      x: 62, y: y + 14, size: 11, font: fontBold, color: cDark,
    });
    page2.drawText(t.desc, {
      x: 62, y: y - 1, size: 9.5, font: fontRegular, color: cMuted,
    });
    y -= 52;
  }

  // Reading Mode Callout
  y -= 10;
  page2.drawRectangle({
    x: 48, y: y - 40, width: 499, height: 60,
    color: rgb(0.95, 0.97, 1.0), borderColor: rgb(0.8, 0.88, 0.98), borderWidth: 1,
  });
  page2.drawText('PRO TIP: EYE-CARE READING MODES', {
    x: 62, y: y + 4, size: 10, font: fontBold, color: cBlue,
  });
  page2.drawText('Click the Eye icon in the top toolbar to switch between Natural Crisp Paper, Warm Sepia,', {
    x: 62, y: y - 12, size: 9.5, font: fontRegular, color: cDark,
  });
  page2.drawText('Soft Mint Glare-Reduction, Cool Slate, or OLED Dark mode without inverting document text.', {
    x: 62, y: y - 26, size: 9.5, font: fontRegular, color: cDark,
  });

  page2.drawText('Page 2 of 3 — Alpine Document User Guide', {
    x: 48, y: 40, size: 9, font: fontRegular, color: cMuted,
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 3: INTERACTIVE PLAYGROUND & SIGNATURE VERIFICATION
  // ══════════════════════════════════════════════════════════════════════════
  const page3 = pdfDoc.addPage([595.28, 841.89]);

  page3.drawText('Interactive Testing Playground', {
    x: 48, y: 765, size: 20, font: fontBold, color: cDark,
  });
  page3.drawText('Try drawing, placing text, creating shapes, and adding your signature below.', {
    x: 48, y: 742, size: 11, font: fontRegular, color: cMuted,
  });
  page3.drawLine({
    start: { x: 48, y: 730 }, end: { x: 547, y: 730 },
    thickness: 0.75, color: cBorder,
  });

  // Annotation Practice Zone
  page3.drawRectangle({
    x: 48, y: 520, width: 499, height: 185,
    color: rgb(0.99, 0.99, 1.0), borderColor: cBorder, borderWidth: 1,
  });
  page3.drawText('ANNOTATION PRACTICE CANVAS', {
    x: 64, y: 680, size: 10, font: fontBold, color: cMuted,
  });
  page3.drawText('Click "Annotate" in the top navbar to test:', {
    x: 64, y: 658, size: 10, font: fontRegular, color: cDark,
  });
  page3.drawText('1. Draw Pen & Highlighter: Smooth freehand strokes and transparent text highlights.', {
    x: 64, y: 638, size: 9.5, font: fontRegular, color: cMuted,
  });
  page3.drawText('2. Text Block: Click anywhere to insert, drag to move, and resize bounding box.', {
    x: 64, y: 620, size: 9.5, font: fontRegular, color: cMuted,
  });
  page3.drawText('3. Geometric Shapes: Insert Rectangles, Circles, and Arrows with drag-handles.', {
    x: 64, y: 602, size: 9.5, font: fontRegular, color: cMuted,
  });
  page3.drawText('4. Sticky Notes: Add collapsible reviewer comments with timestamps and resolve state.', {
    x: 64, y: 584, size: 9.5, font: fontRegular, color: cMuted,
  });

  // Signature Certification Box
  page3.drawRectangle({
    x: 48, y: 310, width: 499, height: 175,
    color: rgb(1.0, 1.0, 1.0), borderColor: cDark, borderWidth: 1.25,
  });
  page3.drawText('DOCUMENT CERTIFICATION & SIGNATURE ZONE', {
    x: 64, y: 460, size: 11, font: fontBold, color: cDark,
  });
  page3.drawText('This area is designated for placing your digital vector signature or company stamp seal.', {
    x: 64, y: 442, size: 9.5, font: fontRegular, color: cMuted,
  });

  // Signature Placement Target Box
  page3.drawRectangle({
    x: 64, y: 330, width: 220, height: 85,
    color: cFill, borderColor: cBorder, borderWidth: 1,
  });
  page3.drawText('SIGN HERE (Click "Tools > E-Sign")', {
    x: 80, y: 370, size: 9, font: fontBold, color: cMuted,
  });

  // Stamp Seal Target Box
  page3.drawRectangle({
    x: 300, y: 330, width: 230, height: 85,
    color: cFill, borderColor: cBorder, borderWidth: 1,
  });
  page3.drawText('OFFICIAL STAMP / SEAL (Circular / Oval)', {
    x: 316, y: 370, size: 9, font: fontBold, color: cMuted,
  });

  // Verification Note
  page3.drawText('All placed signatures and annotations are baked with native resolution upon clicking Download.', {
    x: 48, y: 275, size: 9.5, font: fontOblique, color: cMuted,
  });

  page3.drawText('Page 3 of 3 — MyOx Document Guide by Alpine Foundations', {
    x: 48, y: 40, size: 9, font: fontRegular, color: cMuted,
  });

  const pdfBytes = await pdfDoc.save();
  return new File([pdfBytes], 'MyOx_Document_Enterprise_Guide.pdf', { type: 'application/pdf' });
}
