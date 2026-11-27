export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HsvColor {
  h: number; // 0..360
  s: number; // 0..100
  v: number; // 0..100
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
}

export function clampByte(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.max(0, Math.min(255, Math.round(val)));
}

export function hsvToRgb(h: number, s: number, v: number): RgbColor {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const val = Math.max(0, Math.min(100, v)) / 100;

  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (hue < 60) {
    rp = c; gp = x; bp = 0;
  } else if (hue < 120) {
    rp = x; gp = c; bp = 0;
  } else if (hue < 180) {
    rp = 0; gp = c; bp = x;
  } else if (hue < 240) {
    rp = 0; gp = x; bp = c;
  } else if (hue < 300) {
    rp = x; gp = 0; bp = c;
  } else {
    rp = c; gp = 0; bp = x;
  }

  return {
    r: clampByte((rp + m) * 255),
    g: clampByte((gp + m) * 255),
    b: clampByte((bp + m) * 255),
  };
}

export function rgbToHsv(r: number, g: number, b: number): HsvColor {
  const rn = clampByte(r) / 255;
  const gn = clampByte(g) / 255;
  const bn = clampByte(b) / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta > 0) {
    if (max === rn) {
      h = 60 * (((gn - bn) / delta) % 6);
    } else if (max === gn) {
      h = 60 * ((bn - rn) / delta + 2);
    } else {
      h = 60 * ((rn - gn) / delta + 4);
    }
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;

  return {
    h: Math.round(h) % 360,
    s: Math.round(s),
    v: Math.round(v),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clampByte(n).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex: string): RgbColor | null {
  const cleaned = hex.trim().replace(/^#/, '');
  if (/^[0-9A-Fa-f]{3}$/.test(cleaned)) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return { r, g, b };
  }
  if (/^[0-9A-Fa-f]{6}$/.test(cleaned)) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

export function rgbaToCss(r: number, g: number, b: number, a = 1): string {
  const alpha = Math.max(0, Math.min(1, a));
  return `rgba(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)}, ${alpha})`;
}

export const BUILTIN_PALETTES: ColorPalette[] = [
  {
    id: 'kairo-studio',
    name: 'Kairo Studio Core',
    colors: [
      '#090A0F', '#1E293B', '#475569', '#94A3B8', '#F4F4F5', '#FFFFFF',
      '#3B82F6', '#06B6D4', '#F28C28', '#EF4444', '#22C55E', '#A855F7',
    ],
  },
  {
    id: 'anime-character',
    name: 'Anime Skin & Cel Shade',
    colors: [
      '#FFF1E6', '#FDE2CC', '#F6C3A4', '#DF9978', '#B66E53', '#7A4235',
      '#1A1C2C', '#3B4268', '#E63946', '#F4A261', '#2A9D8F', '#F9C74F',
    ],
  },
  {
    id: 'manga-ink',
    name: 'Manga & Sumi Ink',
    colors: [
      '#000000', '#1A1A1A', '#333333', '#555555', '#777777', '#999999',
      '#BBBBBB', '#DDDDDD', '#EEEEEE', '#FFFFFF', '#2B4C7E', '#B91C1C',
    ],
  },
];
