// Pure-JS image header parsers. PNG (IHDR) and JPEG (SOF). Fails gracefully:
// on any error or unrecognized header, returns null so the upload still completes.



export type Dims = { width: number; height: number } | null;

export function readImageDims(bytes: Uint8Array, mime: string): Dims {
  try {
    if (mime === "image/png" || isPng(bytes)) return readPng(bytes);
    if (mime === "image/jpeg" || isJpeg(bytes)) return readJpeg(bytes);
    return null;
  } catch {
    return null;
  }
}

function isPng(b: Uint8Array): boolean {
  return (
    b.length > 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  );
}

function isJpeg(b: Uint8Array): boolean {
  return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

function readPng(b: Uint8Array): Dims {
  // IHDR chunk starts at byte 8: 4-byte length, 4-byte type "IHDR", then 4-byte width, 4-byte height.
  if (b.length < 24) return null;
  const type = String.fromCharCode(b[12], b[13], b[14], b[15]);
  if (type !== "IHDR") return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const width = dv.getUint32(16, false);
  const height = dv.getUint32(20, false);
  if (!width || !height) return null;
  return { width, height };
}

function readJpeg(b: Uint8Array): Dims {
  // Walk markers looking for SOF0–SOF15 (skip SOF4 / SOF8 / SOF12).
  let i = 2;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  while (i < b.length) {
    if (b[i] !== 0xff) return null;
    // Skip fill bytes.
    while (b[i] === 0xff && i < b.length) i++;
    const marker = b[i];
    i++;
    if (marker === 0xd8 || marker === 0xd9) return null; // SOI/EOI
    if (marker === 0xda) return null; // start of scan
    if (i + 2 > b.length) return null;
    const segLen = dv.getUint16(i, false);
    // SOF markers: 0xC0..0xCF, except 0xC4, 0xC8, 0xCC
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      if (i + 7 > b.length) return null;
      const height = dv.getUint16(i + 3, false);
      const width = dv.getUint16(i + 5, false);
      if (!width || !height) return null;
      return { width, height };
    }
    i += segLen;
  }
  return null;
}

/**
 * Read a PDF's first page size in true physical inches (MediaBox is in 1/72" points).
 * Honors /Rotate (90/270 swap) and /UserUnit (PDF 1.6+, required for sheets over
 * 200" — the spec caps MediaBox units at 14400). Multi-page PDFs: page 1 only.
 * Never throws; returns null on any parse failure (encrypted, corrupt, missing MediaBox).
 */
export async function readPdfDims(
  bytes: Uint8Array,
): Promise<{ width_in: number; height_in: number } | null> {
  try {
    const { PDFDocument, PDFName, PDFNumber } = await import("pdf-lib");
    const doc = await PDFDocument.load(bytes, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
    const page = doc.getPage(0);
    if (!page) return null;
    const { width, height } = page.getMediaBox();
    if (!width || !height) return null;
    const rawUnit = page.node.get(PDFName.of("UserUnit"));
    let userUnit =
      rawUnit instanceof PDFNumber ? rawUnit.asNumber() : 1;
    if (!Number.isFinite(userUnit) || userUnit <= 0) userUnit = 1;
    const angle = ((page.getRotation().angle % 360) + 360) % 360;
    let widthIn = (width / 72) * userUnit;
    let heightIn = (height / 72) * userUnit;
    if (angle === 90 || angle === 270) {
      [widthIn, heightIn] = [heightIn, widthIn];
    }
    return { width_in: widthIn, height_in: heightIn };
  } catch {
    return null;
  }
}
