export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'hard-light'
  | 'darken'
  | 'lighten'
  | 'add'
  | 'subtract'
  | 'difference'
  | 'color-dodge'
  | 'color-burn'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'add', label: 'Add (Linear Dodge)' },
  { value: 'subtract', label: 'Subtract' },
  { value: 'difference', label: 'Difference' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hue', label: 'Hue' },
  { value: 'saturation', label: 'Saturation' },
  { value: 'color', label: 'Color' },
  { value: 'luminosity', label: 'Luminosity' },
];

export type LayerType = 'raster' | 'vector' | 'group' | 'mask' | 'text' | 'comic' | 'background';

export interface LayerMeta {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  opacity: number; // 0..1
  blendMode: BlendMode;
  locked: boolean;
  alphaLock: boolean;
  clipped: boolean;
  groupId?: string;
}

export function blendModeToCanvasComposite(mode: BlendMode): GlobalCompositeOperation {
  switch (mode) {
    case 'add':
      return 'lighter';
    case 'subtract':
      return 'difference';
    default:
      return mode as GlobalCompositeOperation;
  }
}

export function blendChannelMath(base: number, top: number, mode: BlendMode): number {
  const b = Math.max(0, Math.min(255, base)) / 255;
  const t = Math.max(0, Math.min(255, top)) / 255;
  let out = t;

  switch (mode) {
    case 'normal':
      out = t;
      break;
    case 'multiply':
      out = b * t;
      break;
    case 'screen':
      out = 1 - (1 - b) * (1 - t);
      break;
    case 'overlay':
      out = b < 0.5 ? 2 * b * t : 1 - 2 * (1 - b) * (1 - t);
      break;
    case 'soft-light':
      out = t <= 0.5
        ? b - (1 - 2 * t) * b * (1 - b)
        : b + (2 * t - 1) * ((b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b)) - b);
      break;
    case 'hard-light':
      out = t < 0.5 ? 2 * b * t : 1 - 2 * (1 - b) * (1 - t);
      break;
    case 'darken':
      out = Math.min(b, t);
      break;
    case 'lighten':
      out = Math.max(b, t);
      break;
    case 'add':
      out = Math.min(1, b + t);
      break;
    case 'subtract':
      out = Math.max(0, b - t);
      break;
    case 'difference':
      out = Math.abs(b - t);
      break;
    case 'color-dodge':
      out = t >= 1 ? 1 : Math.min(1, b / (1 - t));
      break;
    case 'color-burn':
      out = t <= 0 ? 0 : Math.max(0, 1 - (1 - b) / t);
      break;
    default:
      out = t;
      break;
  }

  return Math.max(0, Math.min(255, Math.round(out * 255)));
}

export function canDrawOnLayer(layer: LayerMeta | undefined): boolean {
  if (!layer) return false;
  return layer.visible && !layer.locked;
}

export function reorderLayerList<T extends { id: string }>(
  layers: T[],
  id: string,
  direction: 'up' | 'down'
): T[] {
  const idx = layers.findIndex((l) => l.id === id);
  if (idx === -1) return layers;
  const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
  if (targetIdx < 0 || targetIdx >= layers.length) return layers;
  const copy = [...layers];
  const [moved] = copy.splice(idx, 1);
  copy.splice(targetIdx, 0, moved);
  return copy;
}
