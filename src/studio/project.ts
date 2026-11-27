import type { BlendMode, LayerType } from './layers';
import type { AnimationCameraState, AnimationFrameMeta, OnionSkinConfig } from './animation';

export type WorkspaceMode = 'illustration' | 'animation' | 'comic' | 'minimal';

export interface DocumentPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  dpi: number;
  category: 'Illustration' | 'Animation' | 'Comic' | 'Print';
}

export const DOCUMENT_PRESETS: DocumentPreset[] = [
  { id: 'hd-720', label: '1280 × 720 (HD)', width: 1280, height: 720, dpi: 96, category: 'Animation' },
  { id: 'fhd-1080', label: '1920 × 1080 (Full HD)', width: 1920, height: 1080, dpi: 150, category: 'Animation' },
  { id: 'qhd-1440', label: '2560 × 1440 (2K QHD)', width: 2560, height: 1440, dpi: 150, category: 'Illustration' },
  { id: 'uhd-4k', label: '3840 × 2160 (4K UHD)', width: 3840, height: 2160, dpi: 300, category: 'Illustration' },
  { id: 'vertical-1080', label: '1080 × 1920 (Vertical / Webtoon)', width: 1080, height: 1920, dpi: 150, category: 'Comic' },
  { id: 'square-2048', label: '2048 × 2048 (Square Art)', width: 2048, height: 2048, dpi: 300, category: 'Illustration' },
  { id: 'square-3000', label: '3000 × 3000 (Pro Print)', width: 3000, height: 3000, dpi: 300, category: 'Print' },
  { id: 'a4', label: 'A4 Manga (2480 × 3508 @ 300 DPI)', width: 2480, height: 3508, dpi: 300, category: 'Comic' },
  { id: 'a3', label: 'A3 Poster (3508 × 4961 @ 300 DPI)', width: 3508, height: 4961, dpi: 300, category: 'Print' },
];

export interface ComicPanelObj {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeWidth: number;
  strokeColor: string;
  fillColor: string;
}

export interface SpeechBubbleObj {
  id: string;
  kind: 'speech' | 'thought' | 'caption';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fillColor: string;
  strokeColor: string;
  textColor: string;
  tailAngleDeg: number;
}

export interface TextObject {
  id: string;
  x: number;
  y: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  color: string;
}

export interface SerializedLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  locked: boolean;
  alphaLock: boolean;
  clipped: boolean;
  dataUrl: string;
}

export interface SerializedFrame {
  meta: AnimationFrameMeta;
  layers: SerializedLayer[];
}

export interface KasManifest {
  format: 'kairo-art-studio-project';
  schemaVersion: number;
  savedAt: string;
  name: string;
  width: number;
  height: number;
  dpi: number;
  fps: number;
  workspace: WorkspaceMode;
  backgroundColor: string;
  transparentBackground: boolean;
  onionSkin: OnionSkinConfig;
  camera: AnimationCameraState;
  frames: SerializedFrame[];
  comicPanels: ComicPanelObj[];
  speechBubbles: SpeechBubbleObj[];
  textObjects: TextObject[];
}

export const KAS_SCHEMA_VERSION = 1;

export function validateKasManifest(raw: unknown): { valid: boolean; error?: string; manifest?: KasManifest } {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Project file is not a valid JSON object.' };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.format !== 'kairo-art-studio-project') {
    return { valid: false, error: 'Invalid project format identifier (expected kairo-art-studio-project).' };
  }
  if (typeof obj.schemaVersion !== 'number' || obj.schemaVersion < 1) {
    return { valid: false, error: 'Missing or unsupported schemaVersion.' };
  }
  if (typeof obj.width !== 'number' || obj.width <= 0 || typeof obj.height !== 'number' || obj.height <= 0) {
    return { valid: false, error: 'Invalid canvas dimensions in project manifest.' };
  }
  if (!Array.isArray(obj.frames) || obj.frames.length === 0) {
    return { valid: false, error: 'Project manifest must contain at least one frame.' };
  }
  return { valid: true, manifest: obj as unknown as KasManifest };
}

export function serializeKasProject(manifest: KasManifest): string {
  return JSON.stringify(manifest, null, 2);
}

export function parseKasProject(jsonText: string): { valid: boolean; error?: string; manifest?: KasManifest } {
  try {
    const parsed = JSON.parse(jsonText);
    return validateKasManifest(parsed);
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Failed to parse .kas JSON project.',
    };
  }
}

export function convertPhysicalToPixels(value: number, unit: 'px' | 'mm' | 'in', dpi: number): number {
  const safeDpi = Math.max(36, dpi);
  if (unit === 'px') return Math.max(1, Math.round(value));
  if (unit === 'in') return Math.max(1, Math.round(value * safeDpi));
  return Math.max(1, Math.round((value / 25.4) * safeDpi));
}
