export interface AnimationFrameMeta {
  id: string;
  index: number; // 1-based display index
  exposure: number; // number of frames held (>= 1)
  note: string;
  label: string;
}

export interface OnionSkinConfig {
  enabled: boolean;
  prevCount: number;
  nextCount: number;
  opacity: number; // 0..1
  prevColor: string;
  nextColor: string;
}

export interface OnionSkinTarget {
  frameIndex: number; // 0-based index in frames array
  direction: 'prev' | 'next';
  alpha: number;
  tint: string;
}

export interface AnimationCameraState {
  x: number;
  y: number;
  zoom: number;
  rotationDeg: number;
  enabled: boolean;
}

export const FPS_PRESETS = [12, 15, 24, 25, 30, 60] as const;

export function getFrameIntervalMs(fps: number): number {
  const safeFps = Math.max(1, Math.min(120, fps));
  return 1000 / safeFps;
}

export function stepPlaybackFrame(
  currentFrameIdx: number,
  totalFrames: number,
  loop: boolean
): { nextIndex: number; shouldStop: boolean } {
  if (totalFrames <= 0) return { nextIndex: 0, shouldStop: true };
  if (currentFrameIdx + 1 < totalFrames) {
    return { nextIndex: currentFrameIdx + 1, shouldStop: false };
  }
  if (loop) {
    return { nextIndex: 0, shouldStop: false };
  }
  return { nextIndex: currentFrameIdx, shouldStop: true };
}

export function getOnionSkinTargets(
  currentFrameIdx: number,
  totalFrames: number,
  config: OnionSkinConfig
): OnionSkinTarget[] {
  if (!config.enabled || totalFrames <= 1) return [];
  const targets: OnionSkinTarget[] = [];

  for (let i = 1; i <= config.prevCount; i++) {
    const idx = currentFrameIdx - i;
    if (idx >= 0) {
      const falloff = 1 - (i - 1) / Math.max(1, config.prevCount);
      targets.push({
        frameIndex: idx,
        direction: 'prev',
        alpha: Number((config.opacity * falloff).toFixed(3)),
        tint: config.prevColor,
      });
    }
  }

  for (let i = 1; i <= config.nextCount; i++) {
    const idx = currentFrameIdx + i;
    if (idx < totalFrames) {
      const falloff = 1 - (i - 1) / Math.max(1, config.nextCount);
      targets.push({
        frameIndex: idx,
        direction: 'next',
        alpha: Number((config.opacity * falloff).toFixed(3)),
        tint: config.nextColor,
      });
    }
  }

  return targets;
}

export function adjustFrameExposure(
  frames: AnimationFrameMeta[],
  frameId: string,
  delta: number
): AnimationFrameMeta[] {
  return frames.map((f) =>
    f.id === frameId
      ? { ...f, exposure: Math.max(1, Math.min(24, f.exposure + delta)) }
      : f
  );
}

export function getTotalTimelineUnits(frames: AnimationFrameMeta[]): number {
  return frames.reduce((acc, f) => acc + Math.max(1, f.exposure), 0);
}
