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
