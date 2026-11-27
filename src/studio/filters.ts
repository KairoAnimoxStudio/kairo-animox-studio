import { hexToRgb, rgbToHex, type ColorPalette } from './color';

export type ImageFilterId =
  | 'grayscale'
  | 'invert'
  | 'sepia'
  | 'brighten'
  | 'darken'
  | 'contrast';

export function applyPixelFilter(data: Uint8ClampedArray, filter: ImageFilterId): void {
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;

    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (filter === 'invert') {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    } else if (filter === 'grayscale') {
      const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      r = l;
      g = l;
      b = l;
    } else if (filter === 'sepia') {
      const sr = Math.min(255, Math.round(r * 0.393 + g * 0.769 + b * 0.189));
      const sg = Math.min(255, Math.round(r * 0.349 + g * 0.686 + b * 0.168));
      const sb = Math.min(255, Math.round(r * 0.272 + g * 0.534 + b * 0.131));
      r = sr;
      g = sg;
      b = sb;
    } else if (filter === 'brighten') {
      r = Math.min(255, r + 24);
      g = Math.min(255, g + 24);
      b = Math.min(255, b + 24);
    } else if (filter === 'darken') {
      r = Math.max(0, r - 24);
      g = Math.max(0, g - 24);
      b = Math.max(0, b - 24);
    } else if (filter === 'contrast') {
      const factor = 1.28;
      r = Math.max(0, Math.min(255, Math.round((r - 128) * factor + 128)));
      g = Math.max(0, Math.min(255, Math.round((g - 128) * factor + 128)));
      b = Math.max(0, Math.min(255, Math.round((b - 128) * factor + 128)));
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

export function serializePaletteExport(palette: ColorPalette): string {
  return JSON.stringify(
    {
      format: 'kairo-art-studio-palette',
      name: palette.name,
      colors: palette.colors,
    },
    null,
    2
  );
}

export function parsePaletteImport(raw: string): { name: string; colors: string[] } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Try JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as
        | { name?: string; colors?: unknown[] }
        | string[];
      if (Array.isArray(parsed)) {
        const colors = parsed
          .map((c) => (typeof c === 'string' ? hexToRgb(c) : null))
          .filter((c): c is NonNullable<typeof c> => c !== null)
          .map((rgb) => rgbToHex(rgb.r, rgb.g, rgb.b));
        return colors.length > 0 ? { name: 'Imported Palette', colors } : null;
      }
      if (parsed && Array.isArray(parsed.colors)) {
        const colors = parsed.colors
          .map((c) => (typeof c === 'string' ? hexToRgb(c) : null))
          .filter((c): c is NonNullable<typeof c> => c !== null)
          .map((rgb) => rgbToHex(rgb.r, rgb.g, rgb.b));
        if (colors.length > 0) {
          return {
            name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'Imported Palette',
            colors,
          };
        }
      }
    } catch {
      // fall through to text parsing
    }
  }

  // GIMP .gpl or plain hex list
  const lines = trimmed.split(/\r?\n/);
  let name = 'Imported Palette';
  const colors: string[] = [];

  for (const line of lines) {
    const clean = line.trim();
    if (!clean) continue;
    if (clean.startsWith('Name:')) {
      name = clean.slice(5).trim() || name;
      continue;
    }
    if (clean.startsWith('#') && !/^#[0-9A-Fa-f]{3,6}$/.test(clean)) {
      continue;
    }
    const hexDirect = hexToRgb(clean);
    if (hexDirect) {
      colors.push(rgbToHex(hexDirect.r, hexDirect.g, hexDirect.b));
      continue;
    }
    const gplMatch = clean.match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})/);
    if (gplMatch) {
      colors.push(rgbToHex(Number(gplMatch[1]), Number(gplMatch[2]), Number(gplMatch[3])));
    }
  }

  return colors.length > 0 ? { name, colors } : null;
}

export function computeMagicWandRegion(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  tolerance: number
): { x: number; y: number; width: number; height: number } | null {
  const sx = Math.floor(startX);
  const sy = Math.floor(startY);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return null;

  const sIdx = (sy * width + sx) * 4;
  const sr = pixelData[sIdx];
  const sg = pixelData[sIdx + 1];
  const sb = pixelData[sIdx + 2];
  const sa = pixelData[sIdx + 3];
  const tolSq = tolerance * tolerance * 4;

  const visited = new Uint8Array(width * height);
  const stack: number[] = [sx, sy];
  let minX = sx;
  let maxX = sx;
  let minY = sy;
  let maxY = sy;

  const matches = (pIdx: number): boolean => {
    const i = pIdx * 4;
    const dr = pixelData[i] - sr;
    const dg = pixelData[i + 1] - sg;
    const db = pixelData[i + 2] - sb;
    const da = pixelData[i + 3] - sa;
    return dr * dr + dg * dg + db * db + da * da <= tolSq;
  };

  while (stack.length > 0) {
    const cy = stack.pop()!;
    const cx = stack.pop()!;
    const idx = cy * width + cx;
    if (visited[idx] || !matches(idx)) continue;
    visited[idx] = 1;
    if (cx < minX) minX = cx;
    if (cx > maxX) maxX = cx;
    if (cy < minY) minY = cy;
    if (cy > maxY) maxY = cy;

    if (cx > 0 && !visited[idx - 1]) stack.push(cx - 1, cy);
    if (cx < width - 1 && !visited[idx + 1]) stack.push(cx + 1, cy);
    if (cy > 0 && !visited[idx - width]) stack.push(cx, cy - 1);
    if (cy < height - 1 && !visited[idx + width]) stack.push(cx, cy + 1);
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX + 1),
    height: Math.max(1, maxY - minY + 1),
  };
}
