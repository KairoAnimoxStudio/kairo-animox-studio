export type BrushCategory = 'All' | 'Sketch' | 'Ink' | 'Paint' | 'Texture' | 'Eraser';
export type StabilizerMode = 'none' | 'basic' | 'moving_avg' | 'weighted' | 'advanced';

export interface BrushPreset {
  id: string;
  name: string;
  category: Exclude<BrushCategory, 'All'>;
  size: number;
  minSize: number;
  maxSize: number;
  opacity: number; // 0..1
  flow: number; // 0..1
  hardness: number; // 0..1
  spacing: number; // 0.05..2.0 (fraction of diameter)
  density: number; // 0..1
  scatter: number; // 0..1
  grain: number; // 0..1 (texture intensity)
  angle: number; // 0..360
  roundness: number; // 0.15..1.0
  taper: number; // 0..1
  stabilizerMode: StabilizerMode;
  stabilization: number; // 0..100
  pressureSize: boolean;
  pressureOpacity: boolean;
  pressureCurve: number; // gamma 0.4..2.2
  isEraser: boolean;
  isPixel: boolean;
  isBlender: boolean;
  favorite?: boolean;
  isCustom?: boolean;
}

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
}

export const BUILTIN_BRUSHES: BrushPreset[] = [
  {
    id: 'hard-round',
    name: 'Hard Round',
    category: 'Paint',
    size: 18,
    minSize: 2,
    maxSize: 200,
    opacity: 1,
    flow: 1,
    hardness: 0.95,
    spacing: 0.12,
    density: 1,
    scatter: 0,
    grain: 0,
    angle: 0,
    roundness: 1,
    taper: 0.15,
    stabilizerMode: 'basic',
    stabilization: 15,
    pressureSize: true,
    pressureOpacity: false,
    pressureCurve: 1.0,
    isEraser: false,
    isPixel: false,
    isBlender: false,
    favorite: true,
  },
  {
    id: 'soft-round',
    name: 'Soft Round',
    category: 'Paint',
    size: 36,
    minSize: 4,
    maxSize: 300,
    opacity: 0.85,
    flow: 0.6,
    hardness: 0.2,
    spacing: 0.15,
    density: 0.9,
    scatter: 0,
    grain: 0,
    angle: 0,
    roundness: 1,
    taper: 0.25,
    stabilizerMode: 'basic',
    stabilization: 15,
    pressureSize: true,
    pressureOpacity: true,
    pressureCurve: 1.0,
    isEraser: false,
    isPixel: false,
    isBlender: false,
    favorite: true,
  },
  {
    id: 'pencil',
    name: 'Pencil',
    category: 'Sketch',
    size: 6,
    minSize: 1,
    maxSize: 60,
    opacity: 0.85,
    flow: 0.85,
    hardness: 0.75,
    spacing: 0.12,
    density: 0.85,
    scatter: 0.05,
    grain: 0.55,
    angle: 20,
    roundness: 0.85,
    taper: 0.4,
    stabilizerMode: 'moving_avg',
    stabilization: 25,
    pressureSize: true,
    pressureOpacity: true,
    pressureCurve: 1.1,
    isEraser: false,
    isPixel: false,
    isBlender: false,
    favorite: true,
  },
  {
    id: 'mechanical-pencil',
    name: 'Mechanical Pencil',
    category: 'Sketch',
    size: 2.5,
    minSize: 1,
    maxSize: 20,
    opacity: 0.9,
    flow: 0.95,
    hardness: 0.92,
    spacing: 0.1,
    density: 0.95,
    scatter: 0.02,
    grain: 0.25,
    angle: 0,
    roundness: 1,
    taper: 0.3,
    stabilizerMode: 'weighted',
    stabilization: 30,
    pressureSize: false,
    pressureOpacity: true,
    pressureCurve: 1.0,
    isEraser: false,
    isPixel: false,
    isBlender: false,
  },
  {
    id: 'realistic-pencil',
    name: 'Realistic Pencil',
    category: 'Sketch',
    size: 9,
    minSize: 2,
    maxSize: 80,
    opacity: 0.78,
    flow: 0.75,
    hardness: 0.65,
    spacing: 0.14,
    density: 0.75,
    scatter: 0.12,
    grain: 0.8,
    angle: 35,
    roundness: 0.65,
    taper: 0.5,
    stabilizerMode: 'moving_avg',
    stabilization: 20,
    pressureSize: true,
    pressureOpacity: true,
    pressureCurve: 1.2,
    isEraser: false,
    isPixel: false,
    isBlender: false,
  },
  {
    id: 'ink-pen',
    name: 'Ink Pen',
    category: 'Ink',
    size: 7,
    minSize: 1,
    maxSize: 80,
    opacity: 1,
    flow: 1,
    hardness: 1,
    spacing: 0.08,
    density: 1,
    scatter: 0,
    grain: 0,
    angle: 0,
    roundness: 1,
    taper: 0.5,
    stabilizerMode: 'weighted',
    stabilization: 55,
    pressureSize: true,
    pressureOpacity: false,
    pressureCurve: 0.9,
    isEraser: false,
    isPixel: false,
    isBlender: false,
    favorite: true,
  },
  {
    id: 'g-pen',
    name: 'G-Pen',
    category: 'Ink',
    size: 10,
    minSize: 1,
    maxSize: 90,
    opacity: 1,
    flow: 1,
    hardness: 1,
    spacing: 0.06,
    density: 1,
    scatter: 0,
    grain: 0,
    angle: 0,
    roundness: 0.92,
    taper: 0.85,
    stabilizerMode: 'advanced',
    stabilization: 70,
    pressureSize: true,
    pressureOpacity: false,
    pressureCurve: 0.8,
    isEraser: false,
    isPixel: false,
    isBlender: false,
    favorite: true,
  },
  {
    id: 'mapping-pen',
    name: 'Mapping Pen',
    category: 'Ink',
    size: 4,
    minSize: 1,
    maxSize: 40,
    opacity: 1,
    flow: 1,
    hardness: 1,
    spacing: 0.07,
    density: 1,
    scatter: 0,
    grain: 0,
    angle: 0,
    roundness: 1,
    taper: 0.7,
    stabilizerMode: 'advanced',
    stabilization: 65,
    pressureSize: true,
    pressureOpacity: false,
    pressureCurve: 0.85,
    isEraser: false,
    isPixel: false,
    isBlender: false,
  },
  {
    id: 'marker',
    name: 'Marker',
    category: 'Ink',
    size: 24,
    minSize: 4,
    maxSize: 180,
    opacity: 0.72,
    flow: 0.9,
    hardness: 0.85,
    spacing: 0.1,
    density: 0.95,
    scatter: 0,
    grain: 0.08,
    angle: 45,
    roundness: 0.45,
    taper: 0.05,
    stabilizerMode: 'basic',
    stabilization: 25,
    pressureSize: false,
    pressureOpacity: true,
    pressureCurve: 1.0,
    isEraser: false,
    isPixel: false,
    isBlender: false,
  },
  {
    id: 'airbrush',
    name: 'Airbrush',
    category: 'Paint',
    size: 68,
    minSize: 10,
    maxSize: 400,
    opacity: 0.45,
    flow: 0.25,
    hardness: 0.05,
    spacing: 0.12,
    density: 0.65,
    scatter: 0.15,
    grain: 0.1,
    angle: 0,
    roundness: 1,
    taper: 0,
    stabilizerMode: 'basic',
    stabilization: 10,
    pressureSize: true,
    pressureOpacity: true,
    pressureCurve: 1.2,
    isEraser: false,
    isPixel: false,
    isBlender: false,
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    category: 'Paint',
    size: 40,
    minSize: 8,
    maxSize: 240,
    opacity: 0.55,
    flow: 0.45,
    hardness: 0.35,
    spacing: 0.18,
    density: 0.75,
    scatter: 0.08,
    grain: 0.45,
    angle: 15,
    roundness: 0.85,
    taper: 0.2,
    stabilizerMode: 'moving_avg',
    stabilization: 20,
    pressureSize: true,
    pressureOpacity: true,
    pressureCurve: 1.1,
    isEraser: false,
    isPixel: false,
    isBlender: false,
    favorite: true,
  },
  {
    id: 'oil-brush',
    name: 'Oil Brush',
    category: 'Paint',
    size: 32,
    minSize: 6,
    maxSize: 220,
    opacity: 0.95,
    flow: 0.88,
    hardness: 0.7,
    spacing: 0.12,
    density: 0.95,
    scatter: 0.04,
    grain: 0.35,
    angle: 25,
    roundness: 0.6,
    taper: 0.2,
    stabilizerMode: 'moving_avg',
    stabilization: 20,
    pressureSize: true,
    pressureOpacity: false,
    pressureCurve: 1.0,
    isEraser: false,
    isPixel: false,
    isBlender: false,
  },
  {
    id: 'flat-brush',
    name: 'Flat Brush',
    category: 'Paint',
    size: 34,
    minSize: 6,
    maxSize: 240,
    opacity: 0.9,
    flow: 0.9,
    hardness: 0.82,
    spacing: 0.1,
    density: 0.95,
    scatter: 0,
    grain: 0.2,
    angle: 30,
    roundness: 0.32,
    taper: 0.1,
    stabilizerMode: 'basic',
    stabilization: 18,
    pressureSize: true,
    pressureOpacity: true,
    pressureCurve: 1.0,
    isEraser: false,
    isPixel: false,
    isBlender: false,
  },
  {
    id: 'chalk',
    name: 'Chalk',
    category: 'Texture',
    size: 26,
    minSize: 4,
    maxSize: 180,
    opacity: 0.82,
    flow: 0.78,
    hardness: 0.6,
    spacing: 0.22,
    density: 0.72,
    scatter: 0.25,
    grain: 0.9,
    angle: 12,
    roundness: 0.75,
    taper: 0.2,
    stabilizerMode: 'basic',
    stabilization: 15,
    pressureSize: true,
    pressureOpacity: true,
    pressureCurve: 1.05,
    isEraser: false,
    isPixel: false,
    isBlender: false,
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    category: 'Texture',
    size: 28,
    minSize: 4,
    maxSize: 200,
    opacity: 0.88,
    flow: 0.75,
    hardness: 0.5,
    spacing: 0.18,
    density: 0.8,
    scatter: 0.32,
    grain: 0.95,
    angle: 40,
    roundness: 0.65,
    taper: 0.35,
    stabilizerMode: 'basic',
    stabilization: 15,
    pressureSize: true,
    pressureOpacity: true,
    pressureCurve: 1.15,
    isEraser: false,
    isPixel: false,
    isBlender: false,
  },
  {
    id: 'texture-brush',
    name: 'Texture Brush',
    category: 'Texture',
    size: 42,
    minSize: 6,
    maxSize: 260,
    opacity: 0.78,
    flow: 0.7,
    hardness: 0.55,
    spacing: 0.35,
    density: 0.7,
    scatter: 0.55,
    grain: 0.85,
    angle: 0,
    roundness: 0.8,
    taper: 0.1,
    stabilizerMode: 'none',
    stabilization: 0,
    pressureSize: true,
    pressureOpacity: true,
    pressureCurve: 1.0,
    isEraser: false,
    isPixel: false,
    isBlender: false,
  },
  {
    id: 'pixel-brush',
    name: 'Pixel Brush',
    category: 'Texture',
    size: 4,
    minSize: 1,
    maxSize: 64,
    opacity: 1,
    flow: 1,
    hardness: 1,
    spacing: 0.25,
    density: 1,
    scatter: 0,
    grain: 0,
    angle: 0,
    roundness: 1,
    taper: 0,
    stabilizerMode: 'none',
    stabilization: 0,
    pressureSize: false,
    pressureOpacity: false,
    pressureCurve: 1.0,
    isEraser: false,
    isPixel: true,
    isBlender: false,
  },
  {
    id: 'blend-brush',
    name: 'Blend Brush',
    category: 'Paint',
    size: 32,
    minSize: 6,
    maxSize: 220,
    opacity: 0.4,
    flow: 0.35,
    hardness: 0.15,
    spacing: 0.15,
    density: 0.7,
    scatter: 0.05,
    grain: 0.1,
    angle: 0,
    roundness: 1,
    taper: 0.2,
    stabilizerMode: 'moving_avg',
    stabilization: 20,
    pressureSize: true,
    pressureOpacity: true,
    pressureCurve: 1.0,
    isEraser: false,
    isPixel: false,
    isBlender: true,
  },
  {
    id: 'hard-eraser',
    name: 'Hard Eraser',
    category: 'Eraser',
    size: 24,
    minSize: 2,
    maxSize: 300,
    opacity: 1,
    flow: 1,
    hardness: 0.95,
    spacing: 0.12,
    density: 1,
    scatter: 0,
    grain: 0,
    angle: 0,
    roundness: 1,
    taper: 0,
    stabilizerMode: 'basic',
    stabilization: 15,
    pressureSize: true,
    pressureOpacity: false,
    pressureCurve: 1.0,
    isEraser: true,
    isPixel: false,
    isBlender: false,
  },
  {
    id: 'soft-eraser',
    name: 'Soft Eraser',
    category: 'Eraser',
    size: 42,
    minSize: 4,
    maxSize: 350,
    opacity: 0.85,
    flow: 0.65,
    hardness: 0.2,
    spacing: 0.15,
    density: 0.9,
    scatter: 0,
    grain: 0,
    angle: 0,
    roundness: 1,
    taper: 0,
    stabilizerMode: 'basic',
    stabilization: 15,
    pressureSize: true,
    pressureOpacity: true,
    pressureCurve: 1.0,
    isEraser: true,
    isPixel: false,
    isBlender: false,
  },
];

export function getBuiltinBrushDefault(id: string): BrushPreset | undefined {
  const found = BUILTIN_BRUSHES.find((b) => b.id === id);
  return found ? { ...found } : undefined;
}

export function applyPressureCurve(rawPressure: number, gamma = 1.0): number {
  const clamped = Math.max(0.05, Math.min(1, rawPressure));
  const safeGamma = Math.max(0.3, Math.min(2.5, gamma));
  return Math.pow(clamped, safeGamma);
}

export function stabilizePoint(
  history: StrokePoint[],
  next: StrokePoint,
  mode: StabilizerMode,
  strength: number
): StrokePoint {
  if (mode === 'none' || strength <= 0 || history.length === 0) {
    return next;
  }

  const norm = Math.max(0, Math.min(1, strength / 100));

  if (mode === 'basic') {
    const prev = history[history.length - 1];
    const alpha = 1 - norm * 0.65;
    return {
      x: prev.x + (next.x - prev.x) * alpha,
      y: prev.y + (next.y - prev.y) * alpha,
      pressure: prev.pressure + (next.pressure - prev.pressure) * alpha,
    };
  }

  const windowSize =
    mode === 'moving_avg'
      ? Math.max(2, Math.round(2 + norm * 5))
      : mode === 'weighted'
      ? Math.max(3, Math.round(3 + norm * 7))
      : Math.max(4, Math.round(4 + norm * 10));

  const slice = history.slice(-(windowSize - 1));
  const pts = [...slice, next];

  if (mode === 'moving_avg') {
    let sx = 0;
    let sy = 0;
    let sp = 0;
    for (const p of pts) {
      sx += p.x;
      sy += p.y;
      sp += p.pressure;
    }
    return {
      x: sx / pts.length,
      y: sy / pts.length,
      pressure: sp / pts.length,
    };
  }

  // Weighted & Advanced: newer points carry higher weight, modulated by strength
  let wx = 0;
  let wy = 0;
  let wp = 0;
  let wTotal = 0;
  for (let i = 0; i < pts.length; i++) {
    const w = mode === 'advanced' ? (i + 1) * (i + 1) : i + 1;
    wx += pts[i].x * w;
    wy += pts[i].y * w;
    wp += pts[i].pressure * w;
    wTotal += w;
  }
  const smoothed = {
    x: wx / wTotal,
    y: wy / wTotal,
    pressure: wp / wTotal,
  };
  const blend = mode === 'advanced' ? 0.35 + 0.55 * norm : 0.25 + 0.5 * norm;
  return {
    x: next.x * (1 - blend) + smoothed.x * blend,
    y: next.y * (1 - blend) + smoothed.y * blend,
    pressure: next.pressure * (1 - blend) + smoothed.pressure * blend,
  };
}

export function interpolateStrokePoints(
  p0: StrokePoint,
  p1: StrokePoint,
  spacingPx: number
): StrokePoint[] {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const dist = Math.hypot(dx, dy);
  const step = Math.max(0.75, spacingPx);
  if (dist <= step) {
    return [p1];
  }
  const count = Math.ceil(dist / step);
  const points: StrokePoint[] = [];
  for (let i = 1; i <= count; i++) {
    const t = i / count;
    points.push({
      x: p0.x + dx * t,
      y: p0.y + dy * t,
      pressure: p0.pressure + (p1.pressure - p0.pressure) * t,
    });
  }
  return points;
}
