import { hexToRgb } from './color';
import { applyPressureCurve, type BrushPreset, type StrokePoint } from './brushes';
import { blendModeToCanvasComposite, type LayerMeta } from './layers';
import type { OnionSkinTarget } from './animation';
import type { ComicPanelObj, SpeechBubbleObj, TextObject } from './project';

export interface RuntimeLayer {
  meta: LayerMeta;
  canvas: HTMLCanvasElement;
}

export interface SelectionState {
  active: boolean;
  shape: 'rect' | 'ellipse';
  x: number;
  y: number;
  width: number;
  height: number;
}

export function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  c.getContext('2d', { willReadFrequently: true });
  return c;
}

export function applySelectionClip(
  ctx: CanvasRenderingContext2D,
  sel: SelectionState | null
): void {
  if (!sel || !sel.active || sel.width <= 0 || sel.height <= 0) return;
  ctx.beginPath();
  if (sel.shape === 'ellipse') {
    ctx.ellipse(
      sel.x + sel.width / 2,
      sel.y + sel.height / 2,
      sel.width / 2,
      sel.height / 2,
      0,
      0,
      Math.PI * 2
    );
  } else {
    ctx.rect(sel.x, sel.y, sel.width, sel.height);
  }
  ctx.clip();
}

export function stampBrushPoint(
  ctx: CanvasRenderingContext2D,
  point: StrokePoint,
  brush: BrushPreset,
  fgHex: string,
  layerAlphaLock: boolean,
  selection: SelectionState | null
): void {
  const rgb = hexToRgb(fgHex) || { r: 244, g: 244, b: 245 };
  const curvedPressure = applyPressureCurve(point.pressure, brush.pressureCurve);

  const diameter = brush.pressureSize
    ? Math.max(brush.minSize, brush.size * (0.25 + 0.85 * curvedPressure))
    : brush.size;
  const radius = Math.max(0.5, diameter / 2);

  const alpha =
    brush.opacity *
    brush.flow *
    (brush.pressureOpacity ? 0.2 + 0.8 * curvedPressure : 1);

  ctx.save();
  applySelectionClip(ctx, selection);

  if (brush.isEraser) {
    ctx.globalCompositeOperation = 'destination-out';
  } else if (layerAlphaLock) {
    ctx.globalCompositeOperation = 'source-atop';
  } else {
    ctx.globalCompositeOperation = 'source-over';
  }

  // Pixel brush snaps cleanly to integer pixels
  if (brush.isPixel) {
    const pxSize = Math.max(1, Math.round(diameter));
    const px = Math.floor(point.x - pxSize / 2);
    const py = Math.floor(point.y - pxSize / 2);
    ctx.fillStyle = brush.isEraser
      ? `rgba(0,0,0,${alpha})`
      : `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
    ctx.fillRect(px, py, pxSize, pxSize);
    ctx.restore();
    return;
  }

  // Blender / smudge soft smear
  if (brush.isBlender) {
    const grad = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
    grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * 0.25})`);
    grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Scatter & textured grain dabs
  const dabCount = brush.grain > 0.25 ? Math.max(2, Math.round(3 + brush.grain * 6)) : 1;
  const angleRad = (brush.angle * Math.PI) / 180;

  for (let i = 0; i < dabCount; i++) {
    let sx = point.x;
    let sy = point.y;
    let dabR = radius;
    let dabAlpha = alpha;

    if (brush.scatter > 0 || brush.grain > 0.25) {
      const jitterRange = radius * (brush.scatter * 1.4 + brush.grain * 0.45);
      const randA = Math.random() * Math.PI * 2;
      const randD = Math.random() * jitterRange;
      sx += Math.cos(randA) * randD;
      sy += Math.sin(randA) * randD;
      if (brush.grain > 0.25) {
        dabR = Math.max(0.7, radius * (0.35 + Math.random() * 0.65));
        dabAlpha = alpha * (0.35 + Math.random() * 0.65);
      }
    }

    ctx.save();
    ctx.translate(sx, sy);
    if (angleRad !== 0) ctx.rotate(angleRad);
    ctx.scale(1, brush.roundness);

    if (brush.hardness >= 0.9) {
      ctx.fillStyle = brush.isEraser
        ? `rgba(0,0,0,${dabAlpha})`
        : `rgba(${rgb.r},${rgb.g},${rgb.b},${dabAlpha})`;
      ctx.beginPath();
      ctx.arc(0, 0, dabR, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const grad = ctx.createRadialGradient(0, 0, dabR * brush.hardness * 0.6, 0, 0, dabR);
      const baseColor = brush.isEraser ? '0,0,0' : `${rgb.r},${rgb.g},${rgb.b}`;
      grad.addColorStop(0, `rgba(${baseColor},${dabAlpha})`);
      grad.addColorStop(1, `rgba(${baseColor},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, dabR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

export function floodFillCanvas(
  targetCanvas: HTMLCanvasElement,
  referenceCanvas: HTMLCanvasElement,
  startX: number,
  startY: number,
  fillHex: string,
  tolerance: number,
  selection: SelectionState | null
): boolean {
  const w = targetCanvas.width;
  const h = targetCanvas.height;
  const sx = Math.floor(startX);
  const sy = Math.floor(startY);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return false;

  if (selection?.active) {
    if (
      sx < selection.x ||
      sy < selection.y ||
      sx >= selection.x + selection.width ||
      sy >= selection.y + selection.height
    ) {
      return false;
    }
  }

  const refCtx = referenceCanvas.getContext('2d')!;
  const tgtCtx = targetCanvas.getContext('2d')!;
  const refData = refCtx.getImageData(0, 0, w, h).data;
  const tgtImg = tgtCtx.getImageData(0, 0, w, h);
  const tgtData = tgtImg.data;

  const fillRgb = hexToRgb(fillHex) || { r: 59, g: 130, b: 246 };
  const startIdx = (sy * w + sx) * 4;
  const sr = refData[startIdx];
  const sg = refData[startIdx + 1];
  const sb = refData[startIdx + 2];
  const sa = refData[startIdx + 3];

  if (
    Math.abs(sr - fillRgb.r) <= 2 &&
    Math.abs(sg - fillRgb.g) <= 2 &&
    Math.abs(sb - fillRgb.b) <= 2 &&
    sa >= 250 &&
    targetCanvas === referenceCanvas
  ) {
    return false;
  }

  const tolSq = tolerance * tolerance * 4;
  const visited = new Uint8Array(w * h);

  const matches = (pixelIndex: number): boolean => {
    const i = pixelIndex * 4;
    const dr = refData[i] - sr;
    const dg = refData[i + 1] - sg;
    const db = refData[i + 2] - sb;
    const da = refData[i + 3] - sa;
    return dr * dr + dg * dg + db * db + da * da <= tolSq;
  };

  const inSel = (x: number, y: number): boolean => {
    if (!selection?.active) return true;
    if (selection.shape === 'rect') {
      return (
        x >= selection.x &&
        x < selection.x + selection.width &&
        y >= selection.y &&
        y < selection.y + selection.height
      );
    }
    const rx = selection.width / 2;
    const ry = selection.height / 2;
    const cx = selection.x + rx;
    const cy = selection.y + ry;
    if (rx <= 0 || ry <= 0) return false;
    const nx = (x - cx) / rx;
    const ny = (y - cy) / ry;
    return nx * nx + ny * ny <= 1;
  };

  const stack: number[] = [sx, sy];
  while (stack.length > 0) {
    const cy = stack.pop()!;
    const cx = stack.pop()!;

    let x = cx;
    while (x >= 0 && !visited[cy * w + x] && inSel(x, cy) && matches(cy * w + x)) {
      x--;
    }
    x++;

    let spanAbove = false;
    let spanBelow = false;

    while (x < w && !visited[cy * w + x] && inSel(x, cy) && matches(cy * w + x)) {
      const pIdx = cy * w + x;
      visited[pIdx] = 1;
      const dIdx = pIdx * 4;
      tgtData[dIdx] = fillRgb.r;
      tgtData[dIdx + 1] = fillRgb.g;
      tgtData[dIdx + 2] = fillRgb.b;
      tgtData[dIdx + 3] = 255;

      if (cy > 0) {
        const upIdx = (cy - 1) * w + x;
        const upValid = !visited[upIdx] && inSel(x, cy - 1) && matches(upIdx);
        if (!spanAbove && upValid) {
          stack.push(x, cy - 1);
          spanAbove = true;
        } else if (spanAbove && !upValid) {
          spanAbove = false;
        }
      }

      if (cy < h - 1) {
        const dnIdx = (cy + 1) * w + x;
        const dnValid = !visited[dnIdx] && inSel(x, cy + 1) && matches(dnIdx);
        if (!spanBelow && dnValid) {
          stack.push(x, cy + 1);
          spanBelow = true;
        } else if (spanBelow && !dnValid) {
          spanBelow = false;
        }
      }

      x++;
    }
  }

  tgtCtx.putImageData(tgtImg, 0, 0);
  return true;
}

export function drawComicPanels(
  ctx: CanvasRenderingContext2D,
  panels: ComicPanelObj[]
): void {
  for (const p of panels) {
    ctx.save();
    if (p.fillColor && p.fillColor !== 'transparent') {
      ctx.fillStyle = p.fillColor;
      ctx.fillRect(p.x, p.y, p.width, p.height);
    }
    ctx.strokeStyle = p.strokeColor;
    ctx.lineWidth = p.strokeWidth;
    ctx.strokeRect(p.x, p.y, p.width, p.height);
    ctx.restore();
  }
}

export function drawSpeechBubbles(
  ctx: CanvasRenderingContext2D,
  bubbles: SpeechBubbleObj[]
): void {
  for (const b of bubbles) {
    ctx.save();
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const rx = b.width / 2;
    const ry = b.height / 2;

    ctx.fillStyle = b.fillColor;
    ctx.strokeStyle = b.strokeColor;
    ctx.lineWidth = 3;

    if (b.kind === 'caption') {
      ctx.fillRect(b.x, b.y, b.width, b.height);
      ctx.strokeRect(b.x, b.y, b.width, b.height);
    } else if (b.kind === 'thought') {
      // Cloud/scalloped outline approximation
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.setLineDash([8, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      // Thought dots
      const rad = (b.tailAngleDeg * Math.PI) / 180;
      const d1x = cx + Math.cos(rad) * (rx + 14);
      const d1y = cy + Math.sin(rad) * (ry + 14);
      const d2x = cx + Math.cos(rad) * (rx + 28);
      const d2y = cy + Math.sin(rad) * (ry + 28);
      ctx.beginPath();
      ctx.arc(d1x, d1y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(d2x, d2y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Speech bubble with directional tail
      const rad = (b.tailAngleDeg * Math.PI) / 180;
      const tipX = cx + Math.cos(rad) * (rx + 28);
      const tipY = cy + Math.sin(rad) * (ry + 28);
      const b1x = cx + Math.cos(rad - 0.2) * (rx * 0.82);
      const b1y = cy + Math.sin(rad - 0.2) * (ry * 0.82);
      const b2x = cx + Math.cos(rad + 0.2) * (rx * 0.82);
      const b2y = cy + Math.sin(rad + 0.2) * (ry * 0.82);

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(b1x, b1y);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(b2x, b2y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cover inner stroke seam
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(4, rx - 2), Math.max(4, ry - 2), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dialogue text wrapped cleanly inside bubble
    ctx.fillStyle = b.textColor;
    ctx.font = `700 ${b.fontSize}px 'Segoe UI', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = b.text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';
    const maxTextW = Math.max(30, b.width - 24);
    for (const word of words) {
      const test = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(test).width > maxTextW && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = b.fontSize * 1.2;
    const startY = cy - ((lines.length - 1) * lineHeight) / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], cx, startY + i * lineHeight);
    }

    ctx.restore();
  }
}

export function drawTextObjects(
  ctx: CanvasRenderingContext2D,
  texts: TextObject[]
): void {
  for (const t of texts) {
    ctx.save();
    ctx.fillStyle = t.color;
    const weight = t.bold ? '700' : '400';
    const style = t.italic ? 'italic' : 'normal';
    ctx.font = `${style} ${weight} ${t.fontSize}px ${t.fontFamily}`;
    ctx.textBaseline = 'top';
    const lines = t.text.split('\n');
    lines.forEach((line, idx) => {
      ctx.fillText(line, t.x, t.y + idx * t.fontSize * 1.25);
    });
    ctx.restore();
  }
}

export interface CompositeOptions {
  width: number;
  height: number;
  backgroundColor: string;
  transparentBackground: boolean;
  layers: RuntimeLayer[];
  comicPanels: ComicPanelObj[];
  speechBubbles: SpeechBubbleObj[];
  textObjects: TextObject[];
  onionSkinFrames?: Array<{
    layers: RuntimeLayer[];
    target: OnionSkinTarget;
  }>;
  includeCheckerboard?: boolean;
}

export function compositeDocument(
  destCtx: CanvasRenderingContext2D,
  opts: CompositeOptions
): void {
  const { width, height } = opts;
  destCtx.clearRect(0, 0, width, height);

  if (opts.transparentBackground) {
    if (opts.includeCheckerboard) {
      const tile = 16;
      destCtx.fillStyle = '#242730';
      destCtx.fillRect(0, 0, width, height);
      destCtx.fillStyle = '#2e323d';
      for (let y = 0; y < height; y += tile) {
        for (let x = 0; x < width; x += tile) {
          if (((x / tile + y / tile) & 1) === 0) {
            destCtx.fillRect(x, y, tile, tile);
          }
        }
      }
    }
  } else {
    destCtx.fillStyle = opts.backgroundColor;
    destCtx.fillRect(0, 0, width, height);
  }

  // Onion skin frames (strictly excluded from exports by omitting onionSkinFrames)
  if (opts.onionSkinFrames && opts.onionSkinFrames.length > 0) {
    const tempCanvas = createOffscreenCanvas(width, height);
    const tCtx = tempCanvas.getContext('2d')!;
    for (const os of opts.onionSkinFrames) {
      tCtx.clearRect(0, 0, width, height);
      for (const layer of os.layers) {
        if (!layer.meta.visible || layer.meta.type === 'background') continue;
        tCtx.save();
        tCtx.globalAlpha = layer.meta.opacity;
        tCtx.drawImage(layer.canvas, 0, 0);
        tCtx.restore();
      }
      tCtx.save();
      tCtx.globalCompositeOperation = 'source-atop';
      tCtx.fillStyle = os.target.tint;
      tCtx.globalAlpha = 0.65;
      tCtx.fillRect(0, 0, width, height);
      tCtx.restore();

      destCtx.save();
      destCtx.globalAlpha = os.target.alpha;
      destCtx.drawImage(tempCanvas, 0, 0);
      destCtx.restore();
    }
  }

  // Composite active frame layers bottom-to-top, respecting clipping to layer below
  const clipBuffer = createOffscreenCanvas(width, height);
  const cCtx = clipBuffer.getContext('2d')!;

  for (let i = 0; i < opts.layers.length; i++) {
    const layer = opts.layers[i];
    if (!layer.meta.visible) continue;

    destCtx.save();
    destCtx.globalAlpha = layer.meta.opacity;
    destCtx.globalCompositeOperation = blendModeToCanvasComposite(layer.meta.blendMode);

    if (layer.meta.clipped && i > 0) {
      const baseLayer = opts.layers[i - 1];
      cCtx.clearRect(0, 0, width, height);
      cCtx.globalCompositeOperation = 'source-over';
      cCtx.drawImage(baseLayer.canvas, 0, 0);
      cCtx.globalCompositeOperation = 'source-in';
      cCtx.drawImage(layer.canvas, 0, 0);
      destCtx.drawImage(clipBuffer, 0, 0);
    } else {
      destCtx.drawImage(layer.canvas, 0, 0);
    }

    destCtx.restore();
  }

  // Comic panels, speech bubbles, and editable text objects
  drawComicPanels(destCtx, opts.comicPanels);
  drawSpeechBubbles(destCtx, opts.speechBubbles);
  drawTextObjects(destCtx, opts.textObjects);
}
