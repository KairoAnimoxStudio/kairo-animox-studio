/**
 * Minimal pure-TypeScript Animated GIF89a encoder using 216-color web-safe + grayscale palette
 * so animations export directly in-browser into real playable .gif files.
 */

function writeString(buf: number[], str: string): void {
  for (let i = 0; i < str.length; i++) {
    buf.push(str.charCodeAt(i) & 0xff);
  }
}

function writeUint16(buf: number[], val: number): void {
  buf.push(val & 0xff, (val >> 8) & 0xff);
}

function buildPalette(): Uint8Array {
  // 256 RGB triplets: 6x6x6 color cube (216) + 40 grayscale steps
  const pal = new Uint8Array(256 * 3);
  let idx = 0;
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        pal[idx++] = Math.round((r * 255) / 5);
        pal[idx++] = Math.round((g * 255) / 5);
        pal[idx++] = Math.round((b * 255) / 5);
      }
    }
  }
  for (let i = 0; i < 40; i++) {
    const v = Math.round((i * 255) / 39);
    pal[idx++] = v;
    pal[idx++] = v;
    pal[idx++] = v;
  }
  return pal;
}

const GLOBAL_PALETTE = buildPalette();

function quantizePixel(r: number, g: number, b: number, a: number): number {
  if (a < 64) {
    // Map near-transparent pixels to white or index 255
    return 255;
  }
  // Check if nearly grayscale
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  if (maxC - minC < 10) {
    const lum = Math.round(((r + g + b) / 3 / 255) * 39);
    return 216 + Math.max(0, Math.min(39, lum));
  }
  const ri = Math.round((r / 255) * 5);
  const gi = Math.round((g / 255) * 5);
  const bi = Math.round((b / 255) * 5);
  return ri * 36 + gi * 6 + bi;
}

function lzwEncode(indices: Uint8Array, minCodeSize: number): number[] {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;

  const out: number[] = [];
  let bitBuf = 0;
  let bitCount = 0;

  const emit = (code: number) => {
    bitBuf |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      out.push(bitBuf & 0xff);
      bitBuf >>= 8;
      bitCount -= 8;
    }
  };

  let dict = new Map<string, number>();
  const resetDict = () => {
    dict = new Map<string, number>();
    for (let i = 0; i < clearCode; i++) {
      dict.set(String(i), i);
    }
    codeSize = minCodeSize + 1;
    nextCode = eoiCode + 1;
  };

  resetDict();
  emit(clearCode);

  if (indices.length === 0) {
    emit(eoiCode);
    if (bitCount > 0) out.push(bitBuf & 0xff);
    return out;
  }

  let prefix = String(indices[0]);
  for (let i = 1; i < indices.length; i++) {
    const k = String(indices[i]);
    const combined = `${prefix},${k}`;
    if (dict.has(combined)) {
      prefix = combined;
    } else {
      emit(dict.get(prefix)!);
      if (nextCode < 4096) {
        dict.set(combined, nextCode++);
        if (nextCode > 1 << codeSize && codeSize < 12) {
          codeSize++;
        }
      } else {
        emit(clearCode);
        resetDict();
      }
      prefix = k;
    }
  }

  emit(dict.get(prefix)!);
  emit(eoiCode);
  if (bitCount > 0) {
    out.push(bitBuf & 0xff);
  }
  return out;
}

export interface GifFrameInput {
  imageData: ImageData;
  delayMs: number;
}

export function encodeAnimatedGif(width: number, height: number, frames: GifFrameInput[]): Uint8Array {
  const bytes: number[] = [];

  // Header
  writeString(bytes, 'GIF89a');

  // Logical Screen Descriptor
  writeUint16(bytes, width);
  writeUint16(bytes, height);
  // Global color table flag (1), color res (7), sort (0), size (7 -> 256 colors) => 0xF7
  bytes.push(0xf7, 255, 0);

  // Global Color Table (256 * 3 bytes)
  for (let i = 0; i < GLOBAL_PALETTE.length; i++) {
    bytes.push(GLOBAL_PALETTE[i]);
  }

  // Netscape 2.0 Application Extension for infinite looping
  bytes.push(0x21, 0xff, 0x0b);
  writeString(bytes, 'NETSCAPE2.0');
  bytes.push(0x03, 0x01);
  writeUint16(bytes, 0); // 0 = loop forever
  bytes.push(0x00);

  for (const frame of frames) {
    const delayCs = Math.max(2, Math.round(frame.delayMs / 10));
    // Graphic Control Extension
    bytes.push(0x21, 0xf9, 0x04, 0x04); // dispose = 1 (do not dispose)
    writeUint16(bytes, delayCs);
    bytes.push(0x00, 0x00);

    // Image Descriptor
    bytes.push(0x2c);
    writeUint16(bytes, 0);
    writeUint16(bytes, 0);
    writeUint16(bytes, width);
    writeUint16(bytes, height);
    bytes.push(0x00); // no local color table

    // LZW Image Data
    const minCodeSize = 8;
    bytes.push(minCodeSize);

    const data = frame.imageData.data;
    const indices = new Uint8Array(width * height);
    for (let i = 0, p = 0; i < indices.length; i++, p += 4) {
      indices[i] = quantizePixel(data[p], data[p + 1], data[p + 2], data[p + 3]);
    }

    const compressed = lzwEncode(indices, minCodeSize);
    // Split into 255-byte sub-blocks
    for (let offset = 0; offset < compressed.length; offset += 255) {
      const chunkLen = Math.min(255, compressed.length - offset);
      bytes.push(chunkLen);
      for (let j = 0; j < chunkLen; j++) {
        bytes.push(compressed[offset + j]);
      }
    }
    bytes.push(0x00); // block terminator
  }

  // Trailer
  bytes.push(0x3b);
  return new Uint8Array(bytes);
}
