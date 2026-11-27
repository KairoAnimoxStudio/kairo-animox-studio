import {
  BUILTIN_PALETTES,
  hexToRgb,
  hsvToRgb,
  rgbToHex,
  rgbToHsv,
  type ColorPalette,
} from './color';
import {
  BUILTIN_BRUSHES,
  getBuiltinBrushDefault,
  interpolateStrokePoints,
  stabilizePoint,
  type BrushCategory,
  type BrushPreset,
  type StabilizerMode,
  type StrokePoint,
} from './brushes';
import {
  BLEND_MODES,
  canDrawOnLayer,
  reorderLayerList,
  type BlendMode,
  type LayerType,
} from './layers';
import { CommandHistory } from './history';
import {
  adjustFrameExposure,
  getFrameIntervalMs,
  getOnionSkinTargets,
  stepPlaybackFrame,
  type AnimationCameraState,
  type AnimationFrameMeta,
  type OnionSkinConfig,
} from './animation';
import {
  convertPhysicalToPixels,
  DOCUMENT_PRESETS,
  KAS_SCHEMA_VERSION,
  parseKasProject,
  serializeKasProject,
  type ComicPanelObj,
  type KasManifest,
  type SpeechBubbleObj,
  type TextObject,
  type WorkspaceMode,
} from './project';
import {
  compositeDocument,
  createOffscreenCanvas,
  floodFillCanvas,
  stampBrushPoint,
  type RuntimeLayer,
  type SelectionState,
} from './canvasRenderer';
import { encodeAnimatedGif } from './gifEncoder';
import {
  applyPixelFilter,
  computeMagicWandRegion,
  parsePaletteImport,
  serializePaletteExport,
  type ImageFilterId,
} from './filters';

export type ToolId =
  | 'move'
  | 'hand'
  | 'zoom'
  | 'brush'
  | 'pencil'
  | 'pen'
  | 'eraser'
  | 'airbrush'
  | 'watercolor'
  | 'blend'
  | 'fill'
  | 'eyedropper'
  | 'selection'
  | 'ellipse-selection'
  | 'lasso'
  | 'polygon-selection'
  | 'magic-wand'
  | 'transform'
  | 'line-shape'
  | 'shape'
  | 'ellipse-shape'
  | 'polygon-shape'
  | 'curve-shape'
  | 'gradient'
  | 'text'
  | 'vector-pen'
  | 'symmetry'
  | 'comic';

export interface TimelineTrackMeta {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface FrameSnapshot {
  meta: AnimationFrameMeta;
  layers: RuntimeLayer[];
}

export interface HistorySnapshot {
  frameIndex: number;
  activeLayerId: string;
  layers: Array<{
    meta: RuntimeLayer['meta'];
    imageData: ImageData;
  }>;
  comicPanels: ComicPanelObj[];
  speechBubbles: SpeechBubbleObj[];
  textObjects: TextObject[];
}

export interface StudioDocument {
  id: string;
  name: string;
  width: number;
  height: number;
  dpi: number;
  fps: number;
  backgroundColor: string;
  transparentBackground: boolean;
  frames: FrameSnapshot[];
  currentFrameIndex: number;
  activeLayerId: string;
  zoom: number;
  panX: number;
  panY: number;
  rotationDeg: number;
  flipH: boolean;
  flipV: boolean;
  onionSkin: OnionSkinConfig;
  camera: AnimationCameraState;
  tracks: TimelineTrackMeta[];
  activeTrackId: string;
  comicPanels: ComicPanelObj[];
  speechBubbles: SpeechBubbleObj[];
  textObjects: TextObject[];
  selection: SelectionState | null;
  history: CommandHistory<HistorySnapshot>;
  dirty: boolean;
}

export interface StudioSettings {
  autosaveEnabled: boolean;
  autosaveIntervalSec: number;
  historyDepth: number;
  gridSize: number;
  showGrid: boolean;
  showRulers: boolean;
  showGuides: boolean;
  showSymmetry: boolean;
  theme: 'dark' | 'light';
}

export interface RecentProjectEntry {
  name: string;
  width: number;
  height: number;
  workspace: WorkspaceMode;
  savedAt: string;
}

const STORAGE_SETTINGS_KEY = 'kairo_art_studio_settings_v1';
const STORAGE_CUSTOM_BRUSHES_KEY = 'kairo_art_studio_custom_brushes_v1';
const STORAGE_CUSTOM_PALETTES_KEY = 'kairo_art_studio_palettes_v1';
const STORAGE_AUTOSAVE_KEY = 'kairo_art_studio_autosave_v1';
const STORAGE_RECENT_KEY = 'kairo_art_studio_recent_v1';

export class KairoArtStudioApp {
  public documents: StudioDocument[] = [];
  public activeDocIndex = 0;
  public workspace: WorkspaceMode = 'illustration';
  public activeTool: ToolId = 'brush';

  public brushes: BrushPreset[] = [];
  public activeBrushId = 'g-pen';
  public brushCategory: BrushCategory = 'All';
  public brushSearch = '';
  public brushFavoritesOnly = false;

  public fgColor = '#3B82F6';
  public bgColor = '#FFFFFF';
  public recentColors: string[] = ['#3B82F6', '#F28C28', '#FFFFFF', '#090A0F', '#EF4444', '#22C55E'];
  public palettes: ColorPalette[] = [...BUILTIN_PALETTES.map((p) => ({ ...p, colors: [...p.colors] }))];
  public activePaletteId = BUILTIN_PALETTES[0].id;

  // Tool-specific options
  public fillTolerance = 32;
  public fillAllLayers = true;
  public selectionShape: 'rect' | 'ellipse' = 'rect';
  public shapeType: 'line' | 'rect' | 'ellipse' | 'triangle' | 'polygon' | 'curve' = 'rect';
  public shapeStrokeWidth = 4;
  public shapeFill = false;
  public gradientType: 'linear' | 'radial' = 'linear';
  public gradientMode: 'fg-bg' | 'fg-transparent' = 'fg-transparent';
  public textDraft = 'KAIRO STUDIO';
  public textFont = 'Plus Jakarta Sans, Segoe UI, sans-serif';
  public textSize = 42;
  public textBold = true;
  public textItalic = false;

  public selectedBubbleId: string | null = null;
  public clipboardPixels: ImageData | null = null;
  public copiedFrameLayers: Array<{ meta: RuntimeLayer['meta']; canvas: HTMLCanvasElement; note: string; exposure: number }> | null = null;
  public timelineZoom = 1;
  public showAudioStrip = true;

  public settings: StudioSettings = {
    autosaveEnabled: true,
    autosaveIntervalSec: 45,
    historyDepth: 35,
    gridSize: 32,
    showGrid: false,
    showRulers: true,
    showGuides: false,
    showSymmetry: false,
    theme: 'dark',
  };

  // Animation playback state
  public isPlaying = false;
  public loopPlayback = true;
  private playbackRafId: number | null = null;
  private lastFrameTimestamp = 0;

  // Audio state
  public audioUrl: string | null = null;
  public audioName = '';
  public audioElement: HTMLAudioElement | null = null;
  public audioWaveformPeaks: number[] = [];

  // Pointer drawing state
  private isPointerDown = false;
  private isPanning = false;
  private spaceHeld = false;
  private panStartX = 0;
  private panStartY = 0;
  private docPanStartX = 0;
  private docPanStartY = 0;
  private strokeHistory: StrokePoint[] = [];
  private lassoPoints: Array<{ x: number; y: number }> = [];
  private lastStampPoint: StrokePoint | null = null;
  private dragStartDoc: { x: number; y: number } | null = null;
  private dragCurrentDoc: { x: number; y: number } | null = null;
  private moveLayerSnapshot: ImageData | null = null;
  private moveStartDoc: { x: number; y: number } | null = null;

  // DOM references
  private mainCanvas!: HTMLCanvasElement;
  private overlayCanvas!: HTMLCanvasElement;
  private navCanvas!: HTMLCanvasElement;
  private wheelCanvas!: HTMLCanvasElement;
  private viewportEl!: HTMLElement;

  private onUiUpdate: () => void = () => {};
  private onNotify: (msg: string, kind?: 'info' | 'success' | 'warn' | 'error') => void = () => {};

  constructor() {
    this.loadSettings();
    this.loadBrushes();
  }

  public bindDom(refs: {
    mainCanvas: HTMLCanvasElement;
    overlayCanvas: HTMLCanvasElement;
    navCanvas: HTMLCanvasElement;
    wheelCanvas: HTMLCanvasElement;
    viewportEl: HTMLElement;
    onUiUpdate: () => void;
    onNotify: (msg: string, kind?: 'info' | 'success' | 'warn' | 'error') => void;
  }): void {
    this.mainCanvas = refs.mainCanvas;
    this.mainCanvas.getContext('2d', { willReadFrequently: true });
    this.overlayCanvas = refs.overlayCanvas;
    this.navCanvas = refs.navCanvas;
    this.wheelCanvas = refs.wheelCanvas;
    this.viewportEl = refs.viewportEl;
    this.onUiUpdate = refs.onUiUpdate;
    this.onNotify = refs.onNotify;

    this.startAutosaveLoop();
  }

  private loadSettings(): void {
    try {
      const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (raw) {
        this.settings = { ...this.settings, ...JSON.parse(raw) };
      }
    } catch {
      // keep defaults
    }
  }

  public saveSettings(next: StudioSettings): void {
    this.settings = { ...next };
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      // ignore storage quota errors
    }
    const doc = this.getActiveDoc();
    if (doc) {
      doc.history.setMaxDepth(this.settings.historyDepth);
    }
    this.renderAll();
    this.onUiUpdate();
    this.onNotify('Settings saved', 'success');
  }

  private loadBrushes(): void {
    const builtIns = BUILTIN_BRUSHES.map((b) => ({ ...b }));
    try {
      const raw = localStorage.getItem(STORAGE_CUSTOM_BRUSHES_KEY);
      if (raw) {
        const custom = JSON.parse(raw) as BrushPreset[];
        this.brushes = [...builtIns, ...custom];
        return;
      }
    } catch {
      // ignore
    }
    this.brushes = builtIns;
  }

  public saveCustomBrushes(): void {
    const custom = this.brushes.filter((b) => b.isCustom);
    try {
      localStorage.setItem(STORAGE_CUSTOM_BRUSHES_KEY, JSON.stringify(custom));
    } catch {
      // ignore
    }
  }

  public selectTool(tool: ToolId): void {
    this.activeTool = tool;
    if (tool === 'pen') {
      this.activeBrushId = 'g-pen';
    } else if (tool === 'pencil') {
      this.activeBrushId = 'pencil';
    } else if (tool === 'airbrush') {
      this.activeBrushId = 'airbrush';
    } else if (tool === 'watercolor') {
      this.activeBrushId = 'watercolor';
    } else if (tool === 'blend') {
      this.activeBrushId = 'blend-brush';
    } else if (tool === 'eraser') {
      this.activeBrushId = 'hard-eraser';
    } else if (tool === 'selection') {
      this.selectionShape = 'rect';
    } else if (tool === 'ellipse-selection') {
      this.selectionShape = 'ellipse';
    } else if (tool === 'line-shape') {
      this.shapeType = 'line';
    } else if (tool === 'shape') {
      this.shapeType = 'rect';
    } else if (tool === 'ellipse-shape') {
      this.shapeType = 'ellipse';
    } else if (tool === 'polygon-shape') {
      this.shapeType = 'polygon';
    } else if (tool === 'curve-shape') {
      this.shapeType = 'curve';
    } else if (tool === 'symmetry') {
      this.settings.showSymmetry = true;
    }
    this.renderOverlay();
    this.onUiUpdate();
  }

  public getActiveBrush(): BrushPreset {
    return this.brushes.find((b) => b.id === this.activeBrushId) || this.brushes[0];
  }

  public selectBrush(id: string): void {
    const brush = this.brushes.find((b) => b.id === id);
    if (!brush) return;
    this.activeBrushId = brush.id;
    if (brush.isEraser) {
      this.activeTool = 'eraser';
    } else if (brush.id === 'airbrush') {
      this.activeTool = 'airbrush';
    } else if (brush.id === 'watercolor') {
      this.activeTool = 'watercolor';
    } else if (brush.isBlender) {
      this.activeTool = 'blend';
    } else if (brush.category === 'Sketch') {
      this.activeTool = 'pencil';
    } else if (brush.category === 'Ink') {
      this.activeTool = 'pen';
    } else {
      this.activeTool = 'brush';
    }
    this.onUiUpdate();
  }

  public createNewBrush(): void {
    const base = this.getActiveBrush();
    const next: BrushPreset = {
      ...base,
      id: `custom-${Date.now()}`,
      name: `Studio Brush ${this.brushes.filter((b) => b.isCustom).length + 1}`,
      isCustom: true,
      favorite: true,
    };
    this.brushes.push(next);
    this.activeBrushId = next.id;
    this.saveCustomBrushes();
    this.onUiUpdate();
    this.onNotify(`Created brush "${next.name}"`, 'success');
  }

  public duplicateActiveBrush(): void {
    const current = this.getActiveBrush();
    const copy: BrushPreset = {
      ...current,
      id: `custom-${Date.now()}`,
      name: `${current.name} Copy`,
      isCustom: true,
    };
    this.brushes.push(copy);
    this.activeBrushId = copy.id;
    this.saveCustomBrushes();
    this.onUiUpdate();
    this.onNotify(`Duplicated preset "${copy.name}"`, 'success');
  }

  public deleteActiveBrush(): void {
    const current = this.getActiveBrush();
    if (!current.isCustom) {
      this.onNotify('Built-in presets cannot be deleted (use Reset Settings instead)', 'warn');
      return;
    }
    this.brushes = this.brushes.filter((b) => b.id !== current.id);
    this.activeBrushId = this.brushes[0].id;
    this.saveCustomBrushes();
    this.onUiUpdate();
    this.onNotify(`Deleted custom preset "${current.name}"`, 'info');
  }

  public toggleBrushFavorite(id?: string): void {
    const target = this.brushes.find((b) => b.id === (id || this.activeBrushId));
    if (!target) return;
    target.favorite = !target.favorite;
    if (target.isCustom) this.saveCustomBrushes();
    this.onUiUpdate();
  }

  public resetActiveBrushSettings(): void {
    const current = this.getActiveBrush();
    const def = getBuiltinBrushDefault(current.id);
    if (def) {
      const idx = this.brushes.findIndex((b) => b.id === current.id);
      if (idx !== -1) this.brushes[idx] = def;
      this.onUiUpdate();
      this.onNotify(`Reset "${def.name}" to factory settings`, 'success');
    } else {
      current.size = 18;
      current.opacity = 1;
      current.hardness = 0.9;
      current.stabilization = 25;
      this.saveCustomBrushes();
      this.onUiUpdate();
      this.onNotify(`Reset "${current.name}" sliders`, 'info');
    }
  }

  public exportActiveBrush(): void {
    const brush = this.getActiveBrush();
    const payload = JSON.stringify({ format: 'kairo-brush-preset', preset: brush }, null, 2);
    this.triggerDownload(
      new Blob([payload], { type: 'application/json' }),
      `${brush.name.replace(/\s+/g, '_')}.kbr.json`
    );
    this.onNotify(`Exported brush "${brush.name}"`, 'success');
  }

  public async importBrushFile(file: File): Promise<void> {
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as { preset?: BrushPreset } | BrushPreset;
      const candidate = 'preset' in parsed && parsed.preset ? parsed.preset : (parsed as BrushPreset);
      if (!candidate || typeof candidate.name !== 'string' || typeof candidate.size !== 'number') {
        this.onNotify('Invalid brush preset file', 'error');
        return;
      }
      const imported: BrushPreset = {
        ...this.getActiveBrush(),
        ...candidate,
        id: `custom-${Date.now()}`,
        isCustom: true,
      };
      this.brushes.push(imported);
      this.activeBrushId = imported.id;
      this.saveCustomBrushes();
      this.onUiUpdate();
      this.onNotify(`Imported brush "${imported.name}"`, 'success');
    } catch {
      this.onNotify('Could not read brush preset JSON', 'error');
    }
  }

  public getActiveDoc(): StudioDocument | undefined {
    return this.documents[this.activeDocIndex];
  }

  public getCurrentFrame(): FrameSnapshot | undefined {
    const doc = this.getActiveDoc();
    if (!doc) return undefined;
    return doc.frames[doc.currentFrameIndex];
  }

  public getActiveLayer(): RuntimeLayer | undefined {
    const frame = this.getCurrentFrame();
    const doc = this.getActiveDoc();
    if (!frame || !doc) return undefined;
    return frame.layers.find((l) => l.meta.id === doc.activeLayerId) || frame.layers[frame.layers.length - 1];
  }

  public createNewDocument(opts: {
    name: string;
    width: number;
    height: number;
    dpi: number;
    fps?: number;
    backgroundColor: string;
    transparentBackground: boolean;
    initialLayers: number;
    workspace?: WorkspaceMode;
    seedDemo?: boolean;
  }): StudioDocument {
    const w = Math.max(64, Math.min(4096, Math.round(opts.width)));
    const h = Math.max(64, Math.min(4096, Math.round(opts.height)));

    const layers: RuntimeLayer[] = [];
    const layerCount = Math.max(1, Math.min(8, opts.initialLayers));
    for (let i = 0; i < layerCount; i++) {
      const c = createOffscreenCanvas(w, h);
      layers.push({
        meta: {
          id: `layer-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          name: i === 0 ? 'Layer 1 (Sketch)' : i === 1 ? 'Layer 2 (Ink)' : `Layer ${i + 1}`,
          type: 'raster',
          visible: true,
          opacity: 1,
          blendMode: 'normal',
          locked: false,
          alphaLock: false,
          clipped: false,
        },
        canvas: c,
      });
    }

    const doc: StudioDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: opts.name.trim() || 'Untitled Artwork',
      width: w,
      height: h,
      dpi: opts.dpi || 150,
      fps: opts.fps || 24,
      backgroundColor: opts.backgroundColor || '#FFFFFF',
      transparentBackground: opts.transparentBackground,
      frames: [
        {
          meta: {
            id: `frame-${Date.now()}-1`,
            index: 1,
            exposure: 1,
            note: 'Key Frame 1',
            label: 'F1',
          },
          layers,
        },
      ],
      currentFrameIndex: 0,
      activeLayerId: layers[layers.length - 1].meta.id,
      zoom: 1,
      panX: 0,
      panY: 0,
      rotationDeg: 0,
      flipH: false,
      flipV: false,
      onionSkin: {
        enabled: true,
        prevCount: 1,
        nextCount: 1,
        opacity: 0.35,
        prevColor: '#3B82F6',
        nextColor: '#F28C28',
      },
      camera: {
        x: 0,
        y: 0,
        zoom: 1,
        rotationDeg: 0,
        enabled: false,
      },
      tracks: [
        { id: 'track-main', name: 'Main Animation', visible: true, locked: false },
      ],
      activeTrackId: 'track-main',
      comicPanels: [],
      speechBubbles: [],
      textObjects: [],
      selection: null,
      history: new CommandHistory<HistorySnapshot>(this.settings.historyDepth),
      dirty: false,
    };

    if (opts.seedDemo) {
      this.paintStarterIllustration(doc);
    }

    this.documents.push(doc);
    this.activeDocIndex = this.documents.length - 1;
    if (opts.workspace) {
      this.workspace = opts.workspace;
    }

    this.pushHistory('New Document');
    this.fitCanvasToViewport();
    this.renderAll();
    this.onUiUpdate();
    return doc;
  }

  private paintStarterIllustration(doc: StudioDocument): void {
    const baseLayer = doc.frames[0].layers[0];
    const inkLayer = doc.frames[0].layers[1] || baseLayer;
    const ctx0 = baseLayer.canvas.getContext('2d')!;
    const ctx1 = inkLayer.canvas.getContext('2d')!;
    const cx = doc.width / 2;
    const cy = doc.height / 2;

    // Soft character silhouette + cel sky backdrop on Layer 1
    const sky = ctx0.createLinearGradient(0, 0, 0, doc.height);
    sky.addColorStop(0, '#DBEAFE');
    sky.addColorStop(1, '#F8FAFC');
    ctx0.fillStyle = sky;
    ctx0.fillRect(0, 0, doc.width, doc.height);

    // Horizon accent ring
    ctx0.strokeStyle = '#93C5FD';
    ctx0.lineWidth = 4;
    ctx0.beginPath();
    ctx0.arc(cx, cy, Math.min(doc.width, doc.height) * 0.28, 0, Math.PI * 2);
    ctx0.stroke();

    // Clean manga character crest / mascot line art on Layer 2
    ctx1.strokeStyle = '#0F172A';
    ctx1.lineWidth = 6;
    ctx1.lineCap = 'round';
    ctx1.lineJoin = 'round';

    const r = Math.min(doc.width, doc.height) * 0.16;
    ctx1.beginPath();
    ctx1.arc(cx, cy - r * 0.15, r, 0, Math.PI * 2);
    ctx1.stroke();

    // Dynamic anime hair spikes
    ctx1.fillStyle = '#3B82F6';
    ctx1.beginPath();
    ctx1.moveTo(cx - r * 0.9, cy - r * 0.5);
    ctx1.lineTo(cx - r * 0.35, cy - r * 1.45);
    ctx1.lineTo(cx, cy - r * 0.95);
    ctx1.lineTo(cx + r * 0.45, cy - r * 1.5);
    ctx1.lineTo(cx + r * 0.9, cy - r * 0.45);
    ctx1.quadraticCurveTo(cx, cy - r * 0.8, cx - r * 0.9, cy - r * 0.5);
    ctx1.fill();
    ctx1.stroke();

    // Expressive eyes
    ctx1.fillStyle = '#0F172A';
    ctx1.beginPath();
    ctx1.ellipse(cx - r * 0.36, cy - r * 0.12, r * 0.12, r * 0.17, 0, 0, Math.PI * 2);
    ctx1.ellipse(cx + r * 0.36, cy - r * 0.12, r * 0.12, r * 0.17, 0, 0, Math.PI * 2);
    ctx1.fill();

    // Eye catchlights
    ctx1.fillStyle = '#FFFFFF';
    ctx1.beginPath();
    ctx1.arc(cx - r * 0.39, cy - r * 0.18, r * 0.045, 0, Math.PI * 2);
    ctx1.arc(cx + r * 0.33, cy - r * 0.18, r * 0.045, 0, Math.PI * 2);
    ctx1.fill();

    // Confident smile
    ctx1.beginPath();
    ctx1.arc(cx, cy + r * 0.15, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx1.stroke();

    // If comic workspace, seed a 2-panel template + speech bubble
    if (this.workspace === 'comic') {
      this.applyComicTemplate('2-panel');
    }
  }

  public closeDocument(index: number): void {
    if (this.documents.length <= 1) return;
    this.documents.splice(index, 1);
    this.activeDocIndex = Math.max(0, Math.min(this.activeDocIndex, this.documents.length - 1));
    this.fitCanvasToViewport();
    this.renderAll();
    this.onUiUpdate();
  }

  public switchDocument(index: number): void {
    if (index < 0 || index >= this.documents.length) return;
    this.stopPlayback();
    this.activeDocIndex = index;
    this.renderAll();
    this.onUiUpdate();
  }

  public setWorkspace(mode: WorkspaceMode): void {
    this.workspace = mode;
    if (mode !== 'animation') {
      this.stopPlayback();
    }
    this.fitCanvasToViewport();
    this.renderAll();
    this.onUiUpdate();
  }

  public setForegroundColor(hex: string): void {
    const parsed = hexToRgb(hex);
    if (!parsed) return;
    const normalized = rgbToHex(parsed.r, parsed.g, parsed.b);
    this.fgColor = normalized;
    if (!this.recentColors.includes(normalized)) {
      this.recentColors = [normalized, ...this.recentColors].slice(0, 12);
    }
    this.drawColorWheel();
    this.onUiUpdate();
  }

  public swapColors(): void {
    const prevFg = this.fgColor;
    this.fgColor = this.bgColor;
    this.bgColor = prevFg;
    this.drawColorWheel();
    this.onUiUpdate();
  }

  public resetColors(): void {
    this.fgColor = '#000000';
    this.bgColor = '#FFFFFF';
    this.drawColorWheel();
    this.onUiUpdate();
  }

  public saveColorToPalette(): void {
    const pal = this.palettes.find((p) => p.id === this.activePaletteId);
    if (!pal) return;
    if (!pal.colors.includes(this.fgColor)) {
      pal.colors.push(this.fgColor);
      this.persistCustomPalettes();
      this.onUiUpdate();
      this.onNotify(`Added ${this.fgColor} to ${pal.name}`, 'success');
    } else {
      this.onNotify(`${this.fgColor} is already in ${pal.name}`, 'info');
    }
  }

  public removeColorFromPalette(hex?: string): void {
    const pal = this.palettes.find((p) => p.id === this.activePaletteId);
    if (!pal) return;
    const target = (hex || this.fgColor).toUpperCase();
    const before = pal.colors.length;
    pal.colors = pal.colors.filter((c) => c.toUpperCase() !== target);
    if (pal.colors.length < before) {
      this.persistCustomPalettes();
      this.onUiUpdate();
      this.onNotify(`Removed ${target} from ${pal.name}`, 'info');
    } else {
      this.onNotify('Select a palette color to remove', 'warn');
    }
  }

  public savePaletteAsNew(): void {
    const pal = this.palettes.find((p) => p.id === this.activePaletteId);
    if (!pal) return;
    const customCount = this.palettes.length + 1;
    const created: ColorPalette = {
      id: `pal-${Date.now()}`,
      name: `${pal.name.split(' ')[0]} Custom ${customCount}`,
      colors: [...pal.colors],
    };
    this.palettes.push(created);
    this.activePaletteId = created.id;
    this.persistCustomPalettes();
    this.onUiUpdate();
    this.onNotify(`Saved palette "${created.name}"`, 'success');
  }

  public exportActivePalette(): void {
    const pal = this.palettes.find((p) => p.id === this.activePaletteId);
    if (!pal) return;
    const payload = serializePaletteExport(pal);
    this.triggerDownload(
      new Blob([payload], { type: 'application/json' }),
      `${pal.name.replace(/\s+/g, '_')}.palette.json`
    );
    this.onNotify(`Exported palette "${pal.name}"`, 'success');
  }

  public async importPaletteFile(file: File): Promise<void> {
    const raw = await file.text();
    const parsed = parsePaletteImport(raw);
    if (!parsed) {
      this.onNotify('Invalid palette file (.json, .gpl, or hex list)', 'error');
      return;
    }
    const next: ColorPalette = {
      id: `pal-${Date.now()}`,
      name: parsed.name,
      colors: parsed.colors,
    };
    this.palettes.push(next);
    this.activePaletteId = next.id;
    this.persistCustomPalettes();
    this.onUiUpdate();
    this.onNotify(`Imported palette "${next.name}" (${next.colors.length} colors)`, 'success');
  }

  private persistCustomPalettes(): void {
    try {
      localStorage.setItem(STORAGE_CUSTOM_PALETTES_KEY, JSON.stringify(this.palettes));
    } catch {
      // ignore storage limits
    }
  }

  // ==================== HISTORY ====================
  public pushHistory(label: string): void {
    const doc = this.getActiveDoc();
    const frame = this.getCurrentFrame();
    if (!doc || !frame) return;

    const layers = frame.layers.map((l) => {
      const ctx = l.canvas.getContext('2d')!;
      return {
        meta: { ...l.meta },
        imageData: ctx.getImageData(0, 0, doc.width, doc.height),
      };
    });

    doc.history.push(label, {
      frameIndex: doc.currentFrameIndex,
      activeLayerId: doc.activeLayerId,
      layers,
      comicPanels: doc.comicPanels.map((p) => ({ ...p })),
      speechBubbles: doc.speechBubbles.map((b) => ({ ...b })),
      textObjects: doc.textObjects.map((t) => ({ ...t })),
    });
    doc.dirty = true;
  }

  private restoreHistorySnapshot(snap: HistorySnapshot): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    doc.currentFrameIndex = Math.max(0, Math.min(snap.frameIndex, doc.frames.length - 1));
    const frame = doc.frames[doc.currentFrameIndex];
    if (!frame) return;

    frame.layers = snap.layers.map((item) => {
      const c = createOffscreenCanvas(doc.width, doc.height);
      c.getContext('2d')!.putImageData(item.imageData, 0, 0);
      return {
        meta: { ...item.meta },
        canvas: c,
      };
    });
    doc.activeLayerId = snap.activeLayerId;
    doc.comicPanels = snap.comicPanels.map((p) => ({ ...p }));
    doc.speechBubbles = snap.speechBubbles.map((b) => ({ ...b }));
    doc.textObjects = snap.textObjects.map((t) => ({ ...t }));
    this.renderAll();
    this.onUiUpdate();
  }

  public undo(): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    const entry = doc.history.undo();
    if (entry) {
      this.restoreHistorySnapshot(entry.data);
    }
  }

  public redo(): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    const entry = doc.history.redo();
    if (entry) {
      this.restoreHistorySnapshot(entry.data);
    }
  }

  public jumpHistory(index: number): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    const entry = doc.history.jumpTo(index);
    if (entry) {
      this.restoreHistorySnapshot(entry.data);
    }
  }

  public clearHistory(): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    doc.history = new CommandHistory<HistorySnapshot>(this.settings.historyDepth);
    this.pushHistory('History Reset');
    this.renderAll();
    this.onUiUpdate();
    this.onNotify('Cleared undo history up to current state', 'info');
  }

  // ==================== CLIPBOARD & FILTERS ====================
  public copySelectionOrLayer(): boolean {
    const doc = this.getActiveDoc();
    const layer = this.getActiveLayer();
    if (!doc || !layer) return false;
    const ctx = layer.canvas.getContext('2d')!;
    if (doc.selection?.active && doc.selection.width > 0 && doc.selection.height > 0) {
      this.clipboardPixels = ctx.getImageData(
        doc.selection.x,
        doc.selection.y,
        doc.selection.width,
        doc.selection.height
      );
    } else {
      this.clipboardPixels = ctx.getImageData(0, 0, doc.width, doc.height);
    }
    this.onNotify('Copied pixels to Studio Clipboard', 'success');
    this.onUiUpdate();
    return true;
  }

  public cutSelectionOrLayer(): boolean {
    const doc = this.getActiveDoc();
    const layer = this.getActiveLayer();
    if (!doc || !layer || layer.meta.locked) return false;
    this.copySelectionOrLayer();
    this.clearActiveLayer();
    this.onNotify('Cut selection to Studio Clipboard', 'info');
    return true;
  }

  public pasteClipboard(): boolean {
    const doc = this.getActiveDoc();
    if (!doc || !this.clipboardPixels) {
      this.onNotify('Studio Clipboard is empty', 'warn');
      return false;
    }
    this.addTypedLayer('raster', 'Pasted Layer');
    const layer = this.getActiveLayer();
    if (!layer) return false;
    const ctx = layer.canvas.getContext('2d')!;
    const ox = Math.max(0, Math.round((doc.width - this.clipboardPixels.width) / 2));
    const oy = Math.max(0, Math.round((doc.height - this.clipboardPixels.height) / 2));
    ctx.putImageData(this.clipboardPixels, ox, oy);
    this.pushHistory('Paste Clipboard');
    this.renderAll();
    this.onUiUpdate();
    this.onNotify('Pasted clipboard onto new layer', 'success');
    return true;
  }

  public applyFilterToActiveLayer(filter: ImageFilterId): void {
    const doc = this.getActiveDoc();
    const layer = this.getActiveLayer();
    if (!doc || !layer || layer.meta.locked) {
      this.onNotify('Unlock layer to apply filter', 'warn');
      return;
    }
    const ctx = layer.canvas.getContext('2d')!;
    const img = ctx.getImageData(0, 0, doc.width, doc.height);
    applyPixelFilter(img.data, filter);
    ctx.putImageData(img, 0, 0);
    this.pushHistory(`Filter: ${filter}`);
    this.renderAll();
    this.onUiUpdate();
    this.onNotify(`Applied ${filter} filter`, 'success');
  }

  // ==================== LAYERS ====================
  public addLayer(): void {
    this.addTypedLayer('raster');
  }

  public addTypedLayer(type: Extract<LayerType, 'raster' | 'vector' | 'group' | 'mask'>, customName?: string): void {
    const doc = this.getActiveDoc();
    const frame = this.getCurrentFrame();
    if (!doc || !frame) return;
    const c = createOffscreenCanvas(doc.width, doc.height);
    const labelMap: Record<typeof type, string> = {
      raster: `Layer ${frame.layers.length + 1}`,
      vector: `Vector ${frame.layers.length + 1}`,
      group: `Group ${frame.layers.length + 1}`,
      mask: `Mask ${frame.layers.length + 1}`,
    };
    const newLayer: RuntimeLayer = {
      meta: {
        id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: customName || labelMap[type],
        type,
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        locked: false,
        alphaLock: false,
        clipped: type === 'mask',
      },
      canvas: c,
    };
    frame.layers.push(newLayer);
    doc.activeLayerId = newLayer.meta.id;
    this.pushHistory(`Add ${newLayer.meta.name}`);
    this.renderAll();
    this.onUiUpdate();
  }

  public mergeVisibleLayers(): void {
    const doc = this.getActiveDoc();
    const frame = this.getCurrentFrame();
    if (!doc || !frame) return;
    const visible = frame.layers.filter((l) => l.meta.visible);
    if (visible.length <= 1) {
      this.onNotify('Need at least 2 visible layers to merge visible', 'warn');
      return;
    }
    const mergedCanvas = createOffscreenCanvas(doc.width, doc.height);
    const mCtx = mergedCanvas.getContext('2d')!;
    for (const layer of visible) {
      mCtx.save();
      mCtx.globalAlpha = layer.meta.opacity;
      mCtx.drawImage(layer.canvas, 0, 0);
      mCtx.restore();
    }
    const hidden = frame.layers.filter((l) => !l.meta.visible);
    const mergedLayer: RuntimeLayer = {
      meta: {
        id: `layer-${Date.now()}-merged`,
        name: 'Merged Visible',
        type: 'raster',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        locked: false,
        alphaLock: false,
        clipped: false,
      },
      canvas: mergedCanvas,
    };
    frame.layers = [...hidden, mergedLayer];
    doc.activeLayerId = mergedLayer.meta.id;
    this.pushHistory('Merge Visible Layers');
    this.renderAll();
    this.onUiUpdate();
    this.onNotify('Merged all visible layers', 'success');
  }

  public groupActiveLayer(): void {
    const doc = this.getActiveDoc();
    const frame = this.getCurrentFrame();
    const active = this.getActiveLayer();
    if (!doc || !frame || !active) return;
    const groupId = `grp-${Date.now()}`;
    const c = createOffscreenCanvas(doc.width, doc.height);
    const grp: RuntimeLayer = {
      meta: {
        id: groupId,
        name: `Group (${active.meta.name})`,
        type: 'group',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        locked: false,
        alphaLock: false,
        clipped: false,
      },
      canvas: c,
    };
    active.meta.groupId = groupId;
    const idx = frame.layers.findIndex((l) => l.meta.id === active.meta.id);
    frame.layers.splice(idx + 1, 0, grp);
    doc.activeLayerId = grp.meta.id;
    this.pushHistory('Group Layer');
    this.renderAll();
    this.onUiUpdate();
  }

  public ungroupActiveLayer(): void {
    const doc = this.getActiveDoc();
    const frame = this.getCurrentFrame();
    const active = this.getActiveLayer();
    if (!doc || !frame || !active) return;
    if (active.meta.type === 'group') {
      const gid = active.meta.id;
      frame.layers.forEach((l) => {
        if (l.meta.groupId === gid) delete l.meta.groupId;
      });
      if (frame.layers.length > 1) {
        frame.layers = frame.layers.filter((l) => l.meta.id !== gid);
        doc.activeLayerId = frame.layers[frame.layers.length - 1].meta.id;
      }
      this.pushHistory('Ungroup Layer');
      this.renderAll();
      this.onUiUpdate();
    } else if (active.meta.groupId) {
      delete active.meta.groupId;
      this.pushHistory('Remove from Group');
      this.renderAll();
      this.onUiUpdate();
    }
  }

  public duplicateActiveLayer(): void {
    const doc = this.getActiveDoc();
    const frame = this.getCurrentFrame();
    const active = this.getActiveLayer();
    if (!doc || !frame || !active) return;

    const c = createOffscreenCanvas(doc.width, doc.height);
    c.getContext('2d')!.drawImage(active.canvas, 0, 0);
    const copy: RuntimeLayer = {
      meta: {
        ...active.meta,
        id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: `${active.meta.name} Copy`,
      },
      canvas: c,
    };
    const idx = frame.layers.findIndex((l) => l.meta.id === active.meta.id);
    frame.layers.splice(idx + 1, 0, copy);
    doc.activeLayerId = copy.meta.id;
    this.pushHistory(`Duplicate ${active.meta.name}`);
    this.renderAll();
    this.onUiUpdate();
  }

  public deleteActiveLayer(): void {
    const doc = this.getActiveDoc();
    const frame = this.getCurrentFrame();
    if (!doc || !frame || frame.layers.length <= 1) {
      this.onNotify('Document requires at least 1 layer', 'warn');
      return;
    }
    const idx = frame.layers.findIndex((l) => l.meta.id === doc.activeLayerId);
    if (idx === -1) return;
    const removed = frame.layers.splice(idx, 1)[0];
    doc.activeLayerId = frame.layers[Math.max(0, idx - 1)].meta.id;
    this.pushHistory(`Delete ${removed.meta.name}`);
    this.renderAll();
    this.onUiUpdate();
  }

  public moveActiveLayer(dir: 'up' | 'down'): void {
    const doc = this.getActiveDoc();
    const frame = this.getCurrentFrame();
    if (!doc || !frame) return;
    const mapped = frame.layers.map((l) => ({ id: l.meta.id, layer: l }));
    const next = reorderLayerList(mapped, doc.activeLayerId, dir);
    frame.layers = next.map((x) => x.layer);
    this.pushHistory(`Move Layer ${dir}`);
    this.renderAll();
    this.onUiUpdate();
  }

  public mergeActiveLayerDown(): void {
    const doc = this.getActiveDoc();
    const frame = this.getCurrentFrame();
    if (!doc || !frame) return;
    const idx = frame.layers.findIndex((l) => l.meta.id === doc.activeLayerId);
    if (idx <= 0) {
      this.onNotify('No layer below to merge with', 'warn');
      return;
    }
    const top = frame.layers[idx];
    const bottom = frame.layers[idx - 1];
    const bCtx = bottom.canvas.getContext('2d')!;
    bCtx.save();
    bCtx.globalAlpha = top.meta.opacity;
    bCtx.drawImage(top.canvas, 0, 0);
    bCtx.restore();
    frame.layers.splice(idx, 1);
    doc.activeLayerId = bottom.meta.id;
    this.pushHistory(`Merge ${top.meta.name} Down`);
    this.renderAll();
    this.onUiUpdate();
  }

  public clearActiveLayer(): void {
    const doc = this.getActiveDoc();
    const layer = this.getActiveLayer();
    if (!doc || !layer || layer.meta.locked) return;
    const ctx = layer.canvas.getContext('2d')!;
    if (doc.selection?.active) {
      ctx.clearRect(doc.selection.x, doc.selection.y, doc.selection.width, doc.selection.height);
    } else {
      ctx.clearRect(0, 0, doc.width, doc.height);
    }
    this.pushHistory('Clear Layer');
    this.renderAll();
    this.onUiUpdate();
  }

  public updateLayerMeta(
    layerId: string,
    patch: Partial<{
      visible: boolean;
      opacity: number;
      blendMode: BlendMode;
      locked: boolean;
      alphaLock: boolean;
      clipped: boolean;
      name: string;
    }>
  ): void {
    const frame = this.getCurrentFrame();
    if (!frame) return;
    const layer = frame.layers.find((l) => l.meta.id === layerId);
    if (!layer) return;
    Object.assign(layer.meta, patch);
    this.renderAll();
    this.onUiUpdate();
  }

  // ==================== CANVAS NAVIGATION & VIEW ====================
  public fitCanvasToViewport(): void {
    const doc = this.getActiveDoc();
    if (!doc || !this.viewportEl) return;
    const rect = this.viewportEl.getBoundingClientRect();
    const pad = 64;
    const availW = Math.max(200, rect.width - pad);
    const availH = Math.max(200, rect.height - pad);
    const scale = Math.min(availW / doc.width, availH / doc.height, 2);
    doc.zoom = Number(Math.max(0.1, scale).toFixed(3));
    doc.panX = 0;
    doc.panY = 0;
    this.applyCanvasTransform();
    this.onUiUpdate();
  }

  public setZoom(nextZoom: number): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    doc.zoom = Number(Math.max(0.1, Math.min(8, nextZoom)).toFixed(3));
    this.applyCanvasTransform();
    this.onUiUpdate();
  }

  public rotateCanvas(deltaDeg: number): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    doc.rotationDeg = ((doc.rotationDeg + deltaDeg) % 360 + 360) % 360;
    this.applyCanvasTransform();
    this.onUiUpdate();
  }

  public resetCanvasTransform(): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    doc.rotationDeg = 0;
    doc.flipH = false;
    doc.flipV = false;
    this.fitCanvasToViewport();
  }

  public toggleFlip(axis: 'h' | 'v'): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    if (axis === 'h') doc.flipH = !doc.flipH;
    else doc.flipV = !doc.flipV;
    this.applyCanvasTransform();
    this.onUiUpdate();
  }

  public selectAll(): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    doc.selection = {
      active: true,
      shape: 'rect',
      x: 0,
      y: 0,
      width: doc.width,
      height: doc.height,
    };
    this.renderOverlay();
    this.onUiUpdate();
  }

  public deselectAll(): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    doc.selection = null;
    this.renderOverlay();
    this.onUiUpdate();
  }

  // ==================== ANIMATION ENGINE ====================
  public switchFrame(index: number): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    const clamped = Math.max(0, Math.min(doc.frames.length - 1, index));
    doc.currentFrameIndex = clamped;
    const frame = doc.frames[clamped];
    if (frame && !frame.layers.some((l) => l.meta.id === doc.activeLayerId)) {
      doc.activeLayerId = frame.layers[frame.layers.length - 1].meta.id;
    }
    this.renderAll();
    this.onUiUpdate();
  }

  public addFrame(duplicateCurrent = false): void {
    const doc = this.getActiveDoc();
    const curr = this.getCurrentFrame();
    if (!doc || !curr) return;

    const layers: RuntimeLayer[] = curr.layers.map((l) => {
      const c = createOffscreenCanvas(doc.width, doc.height);
      if (duplicateCurrent) {
        c.getContext('2d')!.drawImage(l.canvas, 0, 0);
      }
      return {
        meta: {
          ...l.meta,
          id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        },
        canvas: c,
      };
    });

    const newIndex = doc.currentFrameIndex + 1;
    const newFrame: FrameSnapshot = {
      meta: {
        id: `frame-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        index: newIndex + 1,
        exposure: 1,
        note: duplicateCurrent ? 'In-between' : 'New Cell',
        label: `F${doc.frames.length + 1}`,
      },
      layers,
    };
    doc.frames.splice(newIndex, 0, newFrame);
    doc.frames.forEach((f, i) => {
      f.meta.index = i + 1;
    });
    doc.currentFrameIndex = newIndex;
    doc.activeLayerId = layers[layers.length - 1].meta.id;
    this.pushHistory(duplicateCurrent ? 'Duplicate Frame' : 'Add Frame');
    this.renderAll();
    this.onUiUpdate();
  }

  public deleteCurrentFrame(): void {
    const doc = this.getActiveDoc();
    if (!doc || doc.frames.length <= 1) {
      this.onNotify('Animation requires at least 1 frame', 'warn');
      return;
    }
    doc.frames.splice(doc.currentFrameIndex, 1);
    doc.frames.forEach((f, i) => {
      f.meta.index = i + 1;
    });
    doc.currentFrameIndex = Math.max(0, Math.min(doc.currentFrameIndex, doc.frames.length - 1));
    this.pushHistory('Delete Frame');
    this.renderAll();
    this.onUiUpdate();
  }

  public clearCurrentFrame(): void {
    const doc = this.getActiveDoc();
    const frame = this.getCurrentFrame();
    if (!doc || !frame) return;
    for (const layer of frame.layers) {
      if (!layer.meta.locked) {
        layer.canvas.getContext('2d')!.clearRect(0, 0, doc.width, doc.height);
      }
    }
    this.pushHistory('Clear Frame');
    this.renderAll();
    this.onUiUpdate();
  }

  public changeCurrentFrameExposure(delta: number): void {
    const doc = this.getActiveDoc();
    const frame = this.getCurrentFrame();
    if (!doc || !frame) return;
    const metas = adjustFrameExposure(
      doc.frames.map((f) => f.meta),
      frame.meta.id,
      delta
    );
    doc.frames.forEach((f, i) => {
      f.meta = metas[i];
    });
    this.onUiUpdate();
  }

  public copyCurrentFrame(): void {
    const frame = this.getCurrentFrame();
    if (!frame) return;
    this.copiedFrameLayers = frame.layers.map((l) => {
      const c = createOffscreenCanvas(l.canvas.width, l.canvas.height);
      c.getContext('2d')!.drawImage(l.canvas, 0, 0);
      return {
        meta: { ...l.meta },
        canvas: c,
        note: frame.meta.note,
        exposure: frame.meta.exposure,
      };
    });
    this.onUiUpdate();
    this.onNotify(`Copied Frame ${frame.meta.index}`, 'success');
  }

  public pasteCopiedFrame(): void {
    const doc = this.getActiveDoc();
    if (!doc || !this.copiedFrameLayers || this.copiedFrameLayers.length === 0) {
      this.onNotify('Frame clipboard is empty', 'warn');
      return;
    }
    const newLayers: RuntimeLayer[] = this.copiedFrameLayers.map((item) => {
      const c = createOffscreenCanvas(item.canvas.width, item.canvas.height);
      c.getContext('2d')!.drawImage(item.canvas, 0, 0);
      return {
        meta: {
          ...item.meta,
          id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        },
        canvas: c,
      };
    });
    const newIdx = doc.currentFrameIndex + 1;
    const sample = this.copiedFrameLayers[0];
    doc.frames.splice(newIdx, 0, {
      meta: {
        id: `frame-${Date.now()}`,
        index: newIdx + 1,
        exposure: sample.exposure,
        note: sample.note || 'Pasted Frame',
        label: `F${doc.frames.length + 1}`,
      },
      layers: newLayers,
    });
    doc.frames.forEach((f, i) => {
      f.meta.index = i + 1;
    });
    doc.currentFrameIndex = newIdx;
    doc.activeLayerId = newLayers[newLayers.length - 1].meta.id;
    this.pushHistory('Paste Frame');
    this.renderAll();
    this.onUiUpdate();
    this.onNotify('Pasted frame into timeline', 'success');
  }

  public addTimelineTrack(): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    const nextNum = doc.tracks.length + 1;
    const t: TimelineTrackMeta = {
      id: `track-${Date.now()}`,
      name: `Track ${nextNum}`,
      visible: true,
      locked: false,
    };
    doc.tracks.push(t);
    doc.activeTrackId = t.id;
    this.onUiUpdate();
    this.onNotify(`Added ${t.name}`, 'success');
  }

  public deleteActiveTimelineTrack(): void {
    const doc = this.getActiveDoc();
    if (!doc || doc.tracks.length <= 1) {
      this.onNotify('Timeline requires at least 1 track', 'warn');
      return;
    }
    const idx = doc.tracks.findIndex((t) => t.id === doc.activeTrackId);
    if (idx === -1) return;
    const removed = doc.tracks.splice(idx, 1)[0];
    doc.activeTrackId = doc.tracks[Math.max(0, idx - 1)].id;
    this.onUiUpdate();
    this.onNotify(`Deleted ${removed.name}`, 'info');
  }

  public moveActiveTimelineTrack(dir: 'up' | 'down'): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    const idx = doc.tracks.findIndex((t) => t.id === doc.activeTrackId);
    if (idx === -1) return;
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= doc.tracks.length) return;
    const [moved] = doc.tracks.splice(idx, 1);
    doc.tracks.splice(target, 0, moved);
    this.onUiUpdate();
  }

  public togglePrevOnionSkin(): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    doc.onionSkin.enabled = true;
    doc.onionSkin.prevCount = doc.onionSkin.prevCount > 0 ? 0 : 1;
    this.renderAll();
    this.onUiUpdate();
  }

  public toggleNextOnionSkin(): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    doc.onionSkin.enabled = true;
    doc.onionSkin.nextCount = doc.onionSkin.nextCount > 0 ? 0 : 1;
    this.renderAll();
    this.onUiUpdate();
  }

  public adjustTimelineZoom(delta: number): void {
    this.timelineZoom = Math.max(0.6, Math.min(2.2, Number((this.timelineZoom + delta).toFixed(2))));
    this.onUiUpdate();
  }

  public togglePlayback(): void {
    if (this.isPlaying) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
  }

  public startPlayback(): void {
    const doc = this.getActiveDoc();
    if (!doc || doc.frames.length <= 1) return;
    this.isPlaying = true;
    this.lastFrameTimestamp = performance.now();

    if (this.audioElement) {
      this.audioElement.currentTime = (doc.currentFrameIndex / doc.fps);
      this.audioElement.play().catch(() => {});
    }

    const tick = (now: number) => {
      if (!this.isPlaying) return;
      const active = this.getActiveDoc();
      if (!active) return;
      const currMeta = active.frames[active.currentFrameIndex]?.meta;
      const interval = getFrameIntervalMs(active.fps) * (currMeta?.exposure || 1);
      if (now - this.lastFrameTimestamp >= interval) {
        this.lastFrameTimestamp = now;
        const step = stepPlaybackFrame(
          active.currentFrameIndex,
          active.frames.length,
          this.loopPlayback
        );
        active.currentFrameIndex = step.nextIndex;
        if (step.shouldStop) {
          this.stopPlayback();
          return;
        }
        this.renderAll();
        this.onUiUpdate();
      }
      this.playbackRafId = requestAnimationFrame(tick);
    };
    this.playbackRafId = requestAnimationFrame(tick);
    this.onUiUpdate();
  }

  public stopPlayback(): void {
    this.isPlaying = false;
    if (this.playbackRafId !== null) {
      cancelAnimationFrame(this.playbackRafId);
      this.playbackRafId = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.onUiUpdate();
  }

  public async importAudioFile(file: File): Promise<void> {
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
    }
    this.audioUrl = URL.createObjectURL(file);
    this.audioName = file.name;
    this.audioElement = new Audio(this.audioUrl);

    try {
      const arrayBuf = await file.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      const chan = decoded.getChannelData(0);
      const buckets = 96;
      const step = Math.max(1, Math.floor(chan.length / buckets));
      const peaks: number[] = [];
      for (let i = 0; i < buckets; i++) {
        let max = 0;
        const start = i * step;
        for (let j = 0; j < step && start + j < chan.length; j++) {
          const v = Math.abs(chan[start + j]);
          if (v > max) max = v;
        }
        peaks.push(max);
      }
      this.audioWaveformPeaks = peaks;
      ctx.close().catch(() => {});
    } catch {
      this.audioWaveformPeaks = [];
    }

    this.onUiUpdate();
    this.onNotify(`Imported audio: ${file.name}`, 'success');
  }

  // ==================== COMIC WORKSPACE ====================
  public applyComicTemplate(template: '2-panel' | '3-panel' | '4-grid' | 'webtoon'): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    const m = Math.round(Math.min(doc.width, doc.height) * 0.04);
    const g = Math.round(m * 0.65);
    const iw = doc.width - m * 2;
    const ih = doc.height - m * 2;

    doc.comicPanels = [];
    if (template === '2-panel') {
      const h1 = Math.round((ih - g) * 0.45);
      doc.comicPanels.push(
        { id: `panel-1`, x: m, y: m, width: iw, height: h1, strokeWidth: 5, strokeColor: '#111827', fillColor: 'transparent' },
        { id: `panel-2`, x: m, y: m + h1 + g, width: iw, height: ih - h1 - g, strokeWidth: 5, strokeColor: '#111827', fillColor: 'transparent' }
      );
    } else if (template === '3-panel') {
      const rowH = Math.round((ih - g * 2) / 3);
      doc.comicPanels.push(
        { id: `panel-1`, x: m, y: m, width: iw, height: rowH, strokeWidth: 5, strokeColor: '#111827', fillColor: 'transparent' },
        { id: `panel-2`, x: m, y: m + rowH + g, width: iw, height: rowH, strokeWidth: 5, strokeColor: '#111827', fillColor: 'transparent' },
        { id: `panel-3`, x: m, y: m + (rowH + g) * 2, width: iw, height: ih - (rowH + g) * 2, strokeWidth: 5, strokeColor: '#111827', fillColor: 'transparent' }
      );
    } else if (template === '4-grid') {
      const cw = Math.round((iw - g) / 2);
      const ch = Math.round((ih - g) / 2);
      doc.comicPanels.push(
        { id: `panel-1`, x: m, y: m, width: cw, height: ch, strokeWidth: 5, strokeColor: '#111827', fillColor: 'transparent' },
        { id: `panel-2`, x: m + cw + g, y: m, width: cw, height: ch, strokeWidth: 5, strokeColor: '#111827', fillColor: 'transparent' },
        { id: `panel-3`, x: m, y: m + ch + g, width: cw, height: ch, strokeWidth: 5, strokeColor: '#111827', fillColor: 'transparent' },
        { id: `panel-4`, x: m + cw + g, y: m + ch + g, width: cw, height: ch, strokeWidth: 5, strokeColor: '#111827', fillColor: 'transparent' }
      );
    } else {
      const ch = Math.round((ih - g * 2) / 3);
      doc.comicPanels.push(
        { id: `panel-1`, x: m + Math.round(iw * 0.08), y: m, width: Math.round(iw * 0.84), height: ch, strokeWidth: 5, strokeColor: '#111827', fillColor: 'transparent' },
        { id: `panel-2`, x: m + Math.round(iw * 0.08), y: m + ch + g, width: Math.round(iw * 0.84), height: ch, strokeWidth: 5, strokeColor: '#111827', fillColor: 'transparent' }
      );
    }

    this.pushHistory(`Apply Comic Template (${template})`);
    this.renderAll();
    this.onUiUpdate();
  }

  public addSpeechBubble(kind: 'speech' | 'thought' | 'caption'): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    const bubble: SpeechBubbleObj = {
      id: `bubble-${Date.now()}`,
      kind,
      x: Math.round(doc.width * 0.52),
      y: Math.round(doc.height * 0.14 + doc.speechBubbles.length * 40),
      width: 240,
      height: 110,
      text: kind === 'caption' ? 'SCENE 01 — STUDIO' : 'Let us animate!',
      fontSize: 22,
      fillColor: '#FFFFFF',
      strokeColor: '#0F172A',
      textColor: '#0F172A',
      tailAngleDeg: 135,
    };
    doc.speechBubbles.push(bubble);
    this.selectedBubbleId = bubble.id;
    this.pushHistory(`Add ${kind} bubble`);
    this.renderAll();
    this.onUiUpdate();
  }

  public updateSelectedBubble(patch: Partial<SpeechBubbleObj>): void {
    const doc = this.getActiveDoc();
    if (!doc || !this.selectedBubbleId) return;
    const b = doc.speechBubbles.find((item) => item.id === this.selectedBubbleId);
    if (!b) return;
    Object.assign(b, patch);
    this.renderAll();
    this.onUiUpdate();
  }

  // ==================== POINTER & DRAWING INPUT ====================
  public clientToDocCoords(clientX: number, clientY: number): { x: number; y: number } {
    const doc = this.getActiveDoc();
    if (!doc || !this.mainCanvas) return { x: 0, y: 0 };
    const rect = this.mainCanvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;

    // Undo CSS rotation & flip & zoom
    const rad = (-doc.rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    let rx = dx * cos - dy * sin;
    let ry = dx * sin + dy * cos;

    if (doc.flipH) rx = -rx;
    if (doc.flipV) ry = -ry;

    const docX = rx / doc.zoom + doc.width / 2;
    const docY = ry / doc.zoom + doc.height / 2;
    return { x: docX, y: docY };
  }

  public handlePointerDown(e: PointerEvent): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    try {
      this.mainCanvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic or already-released pointerIds
    }

    // Middle mouse button OR Space+drag OR Hand tool => pan
    if (e.button === 1 || this.spaceHeld || this.activeTool === 'hand') {
      this.isPanning = true;
      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      this.docPanStartX = doc.panX;
      this.docPanStartY = doc.panY;
      return;
    }

    if (e.button !== 0) return;

    const pt = this.clientToDocCoords(e.clientX, e.clientY);
    const pressure = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.65;

    if (this.activeTool === 'zoom') {
      this.setZoom(e.altKey ? doc.zoom * 0.8 : doc.zoom * 1.25);
      return;
    }

    if (this.activeTool === 'eyedropper') {
      this.sampleColorAt(pt.x, pt.y);
      return;
    }

    const activeLayer = this.getActiveLayer();
    if (!activeLayer) return;

    if (this.activeTool === 'comic') {
      // Check if clicking an existing speech bubble to drag/select it
      const hitBubble = [...doc.speechBubbles]
        .reverse()
        .find((b) => pt.x >= b.x && pt.x <= b.x + b.width && pt.y >= b.y && pt.y <= b.y + b.height);
      if (hitBubble) {
        this.selectedBubbleId = hitBubble.id;
        this.isPointerDown = true;
        this.dragStartDoc = pt;
        this.dragCurrentDoc = pt;
        this.onUiUpdate();
        return;
      }
      this.addSpeechBubble('speech');
      return;
    }

    if (this.activeTool === 'text') {
      const txt: TextObject = {
        id: `txt-${Date.now()}`,
        x: Math.round(pt.x),
        y: Math.round(pt.y),
        text: this.textDraft || 'KAIRO STUDIO',
        fontFamily: this.textFont,
        fontSize: this.textSize,
        bold: this.textBold,
        italic: this.textItalic,
        color: this.fgColor,
      };
      doc.textObjects.push(txt);
      this.pushHistory('Add Text');
      this.renderAll();
      this.onUiUpdate();
      return;
    }

    if (this.activeTool === 'magic-wand') {
      const ctx = this.mainCanvas.getContext('2d')!;
      const img = ctx.getImageData(0, 0, doc.width, doc.height);
      const region = computeMagicWandRegion(
        img.data,
        doc.width,
        doc.height,
        pt.x,
        pt.y,
        this.fillTolerance
      );
      if (region) {
        doc.selection = {
          active: true,
          shape: 'rect',
          ...region,
        };
        this.renderOverlay();
        this.onUiUpdate();
        this.onNotify(`Magic Wand selected ${region.width}×${region.height}px`, 'info');
      }
      return;
    }

    if (
      this.activeTool === 'selection' ||
      this.activeTool === 'ellipse-selection' ||
      this.activeTool === 'lasso' ||
      this.activeTool === 'polygon-selection'
    ) {
      this.isPointerDown = true;
      this.dragStartDoc = pt;
      this.dragCurrentDoc = pt;
      this.lassoPoints = [pt];
      this.selectionShape = this.activeTool === 'ellipse-selection' ? 'ellipse' : 'rect';
      doc.selection = {
        active: true,
        shape: this.selectionShape,
        x: Math.round(pt.x),
        y: Math.round(pt.y),
        width: 0,
        height: 0,
      };
      this.renderOverlay();
      return;
    }

    if (!canDrawOnLayer(activeLayer.meta)) {
      this.onNotify('Active layer is hidden or locked', 'warn');
      return;
    }

    if (this.activeTool === 'fill') {
      const refCanvas = this.fillAllLayers ? this.mainCanvas : activeLayer.canvas;
      const changed = floodFillCanvas(
        activeLayer.canvas,
        refCanvas,
        pt.x,
        pt.y,
        this.fgColor,
        this.fillTolerance,
        doc.selection
      );
      if (changed) {
        this.pushHistory('Flood Fill');
        this.renderAll();
        this.onUiUpdate();
      }
      return;
    }

    if (this.activeTool === 'move' || this.activeTool === 'transform') {
      this.isPointerDown = true;
      this.moveStartDoc = pt;
      const ctx = activeLayer.canvas.getContext('2d')!;
      this.moveLayerSnapshot = ctx.getImageData(0, 0, doc.width, doc.height);
      return;
    }

    if (
      this.activeTool === 'shape' ||
      this.activeTool === 'line-shape' ||
      this.activeTool === 'ellipse-shape' ||
      this.activeTool === 'polygon-shape' ||
      this.activeTool === 'curve-shape' ||
      this.activeTool === 'gradient'
    ) {
      this.isPointerDown = true;
      this.dragStartDoc = pt;
      this.dragCurrentDoc = pt;
      return;
    }

    // Brush / Pencil / Pen / Airbrush / Watercolor / Blend / Vector-Pen / Symmetry / Eraser freehand stroke
    this.isPointerDown = true;
    const brush = this.getActiveBrush();
    const initialPoint: StrokePoint = { x: pt.x, y: pt.y, pressure };
    this.strokeHistory = [initialPoint];
    this.lastStampPoint = initialPoint;

    const ctx = activeLayer.canvas.getContext('2d')!;
    const effBrush = this.getEffectiveBrush(brush);
    stampBrushPoint(
      ctx,
      initialPoint,
      effBrush,
      this.fgColor,
      activeLayer.meta.alphaLock,
      doc.selection
    );
    if (this.settings.showSymmetry || this.activeTool === 'symmetry') {
      stampBrushPoint(
        ctx,
        { x: doc.width - initialPoint.x, y: initialPoint.y, pressure: initialPoint.pressure },
        effBrush,
        this.fgColor,
        activeLayer.meta.alphaLock,
        doc.selection
      );
    }
    this.renderMainCanvasOnly();
  }

  private getEffectiveBrush(brush: BrushPreset): BrushPreset {
    if (this.activeTool === 'eraser' && !brush.isEraser) {
      return { ...brush, isEraser: true };
    }
    return brush;
  }

  public handlePointerMove(e: PointerEvent): void {
    const doc = this.getActiveDoc();
    if (!doc) return;

    const pt = this.clientToDocCoords(e.clientX, e.clientY);
    this.updateStatusCoords(Math.round(pt.x), Math.round(pt.y));

    if (this.isPanning) {
      doc.panX = this.docPanStartX + (e.clientX - this.panStartX);
      doc.panY = this.docPanStartY + (e.clientY - this.panStartY);
      this.applyCanvasTransform();
      return;
    }

    if (!this.isPointerDown) return;

    if (this.activeTool === 'comic' && this.selectedBubbleId && this.dragStartDoc) {
      const b = doc.speechBubbles.find((item) => item.id === this.selectedBubbleId);
      if (b && this.dragCurrentDoc) {
        b.x += Math.round(pt.x - this.dragCurrentDoc.x);
        b.y += Math.round(pt.y - this.dragCurrentDoc.y);
        this.dragCurrentDoc = pt;
        this.renderMainCanvasOnly();
      }
      return;
    }

    if (
      (this.activeTool === 'selection' ||
        this.activeTool === 'ellipse-selection' ||
        this.activeTool === 'lasso' ||
        this.activeTool === 'polygon-selection') &&
      this.dragStartDoc
    ) {
      this.dragCurrentDoc = pt;
      this.lassoPoints.push(pt);
      if (this.activeTool === 'lasso' || this.activeTool === 'polygon-selection') {
        const xs = this.lassoPoints.map((p) => p.x);
        const ys = this.lassoPoints.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const w = Math.max(...xs) - minX;
        const h = Math.max(...ys) - minY;
        doc.selection = {
          active: w > 2 && h > 2,
          shape: 'rect',
          x: Math.round(minX),
          y: Math.round(minY),
          width: Math.round(w),
          height: Math.round(h),
        };
      } else {
        const x = Math.min(this.dragStartDoc.x, pt.x);
        const y = Math.min(this.dragStartDoc.y, pt.y);
        const w = Math.abs(pt.x - this.dragStartDoc.x);
        const h = Math.abs(pt.y - this.dragStartDoc.y);
        doc.selection = {
          active: w > 2 && h > 2,
          shape: this.selectionShape,
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(w),
          height: Math.round(h),
        };
      }
      this.renderOverlay();
      return;
    }

    const activeLayer = this.getActiveLayer();
    if (!activeLayer) return;

    if ((this.activeTool === 'move' || this.activeTool === 'transform') && this.moveStartDoc && this.moveLayerSnapshot) {
      const dx = Math.round(pt.x - this.moveStartDoc.x);
      const dy = Math.round(pt.y - this.moveStartDoc.y);
      const ctx = activeLayer.canvas.getContext('2d')!;
      ctx.clearRect(0, 0, doc.width, doc.height);
      ctx.putImageData(this.moveLayerSnapshot, dx, dy);
      this.renderMainCanvasOnly();
      return;
    }

    if (
      (this.activeTool === 'shape' ||
        this.activeTool === 'line-shape' ||
        this.activeTool === 'ellipse-shape' ||
        this.activeTool === 'polygon-shape' ||
        this.activeTool === 'curve-shape' ||
        this.activeTool === 'gradient') &&
      this.dragStartDoc
    ) {
      this.dragCurrentDoc = pt;
      this.renderOverlay();
      return;
    }

    // Freehand Brush / Pencil / Pen / Airbrush / Watercolor / Blend / Vector-Pen / Symmetry / Eraser
    const brush = this.getEffectiveBrush(this.getActiveBrush());
    const rawPressure =
      e.pointerType === 'pen' && e.pressure > 0
        ? e.pressure
        : Math.max(0.25, Math.min(1, 0.85 - Math.hypot(e.movementX, e.movementY) * 0.01));

    const stabilized = stabilizePoint(
      this.strokeHistory,
      { x: pt.x, y: pt.y, pressure: rawPressure },
      brush.stabilizerMode,
      brush.stabilization
    );
    this.strokeHistory.push(stabilized);

    const prev = this.lastStampPoint || stabilized;
    const spacingPx = Math.max(1, brush.size * brush.spacing);
    const stamps = interpolateStrokePoints(prev, stabilized, spacingPx);
    const ctx = activeLayer.canvas.getContext('2d')!;
    const useSym = this.settings.showSymmetry || this.activeTool === 'symmetry';

    for (const s of stamps) {
      stampBrushPoint(ctx, s, brush, this.fgColor, activeLayer.meta.alphaLock, doc.selection);
      if (useSym) {
        stampBrushPoint(
          ctx,
          { x: doc.width - s.x, y: s.y, pressure: s.pressure },
          brush,
          this.fgColor,
          activeLayer.meta.alphaLock,
          doc.selection
        );
      }
    }
    this.lastStampPoint = stabilized;
    this.renderMainCanvasOnly();
  }

  public handlePointerUp(): void {
    if (this.isPanning) {
      this.isPanning = false;
      return;
    }
    if (!this.isPointerDown) return;
    this.isPointerDown = false;

    const doc = this.getActiveDoc();
    const activeLayer = this.getActiveLayer();

    if (this.activeTool === 'comic' && this.selectedBubbleId) {
      this.pushHistory('Move Speech Bubble');
      this.dragStartDoc = null;
      this.dragCurrentDoc = null;
      this.renderAll();
      this.onUiUpdate();
      return;
    }

    if (
      this.activeTool === 'selection' ||
      this.activeTool === 'ellipse-selection' ||
      this.activeTool === 'lasso' ||
      this.activeTool === 'polygon-selection'
    ) {
      this.dragStartDoc = null;
      this.dragCurrentDoc = null;
      this.lassoPoints = [];
      this.renderOverlay();
      this.onUiUpdate();
      return;
    }

    if (this.activeTool === 'move' || this.activeTool === 'transform') {
      this.moveLayerSnapshot = null;
      this.moveStartDoc = null;
      this.pushHistory(this.activeTool === 'transform' ? 'Transform Layer' : 'Move Layer');
      this.renderAll();
      this.onUiUpdate();
      return;
    }

    if (
      (this.activeTool === 'shape' ||
        this.activeTool === 'line-shape' ||
        this.activeTool === 'ellipse-shape' ||
        this.activeTool === 'polygon-shape' ||
        this.activeTool === 'curve-shape') &&
      this.dragStartDoc &&
      this.dragCurrentDoc &&
      activeLayer &&
      doc
    ) {
      this.commitShape(activeLayer, this.dragStartDoc, this.dragCurrentDoc);
      this.dragStartDoc = null;
      this.dragCurrentDoc = null;
      this.pushHistory(`Draw ${this.shapeType}`);
      this.renderAll();
      this.onUiUpdate();
      return;
    }

    if (this.activeTool === 'gradient' && this.dragStartDoc && this.dragCurrentDoc && activeLayer && doc) {
      this.commitGradient(activeLayer, this.dragStartDoc, this.dragCurrentDoc);
      this.dragStartDoc = null;
      this.dragCurrentDoc = null;
      this.pushHistory(`Apply ${this.gradientType} Gradient`);
      this.renderAll();
      this.onUiUpdate();
      return;
    }

    this.strokeHistory = [];
    this.lastStampPoint = null;
    const label =
      this.activeTool === 'eraser'
        ? 'Eraser Stroke'
        : `${this.getActiveBrush().name} Stroke`;
    this.pushHistory(label);
    this.renderAll();
    this.onUiUpdate();
  }

  private commitShape(
    layer: RuntimeLayer,
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    const ctx = layer.canvas.getContext('2d')!;
    ctx.save();
    if (doc.selection?.active) {
      ctx.beginPath();
      ctx.rect(doc.selection.x, doc.selection.y, doc.selection.width, doc.selection.height);
      ctx.clip();
    }
    ctx.strokeStyle = this.fgColor;
    ctx.fillStyle = this.bgColor;
    ctx.lineWidth = this.shapeStrokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);

    ctx.beginPath();
    if (this.shapeType === 'line') {
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    } else if (this.shapeType === 'rect') {
      if (this.shapeFill) ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    } else if (this.shapeType === 'ellipse') {
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      if (this.shapeFill) ctx.fill();
      ctx.stroke();
    } else if (this.shapeType === 'curve') {
      const mx = (start.x + end.x) / 2;
      const my = Math.min(start.y, end.y) - Math.max(40, h * 0.6);
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(mx, my, end.x, end.y);
      ctx.stroke();
    } else if (this.shapeType === 'polygon') {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rx = Math.max(4, w / 2);
      const ry = Math.max(4, h / 2);
      const sides = 5;
      for (let i = 0; i < sides; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
        const px = cx + Math.cos(a) * rx;
        const py = cy + Math.sin(a) * ry;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (this.shapeFill) ctx.fill();
      ctx.stroke();
    } else if (this.shapeType === 'triangle') {
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      if (this.shapeFill) ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  private commitGradient(
    layer: RuntimeLayer,
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    const ctx = layer.canvas.getContext('2d')!;
    ctx.save();
    if (doc.selection?.active) {
      ctx.beginPath();
      ctx.rect(doc.selection.x, doc.selection.y, doc.selection.width, doc.selection.height);
      ctx.clip();
    }
    const fgRgb = hexToRgb(this.fgColor) || { r: 59, g: 130, b: 246 };
    const bgRgb = hexToRgb(this.bgColor) || { r: 255, g: 255, b: 255 };
    const endColor =
      this.gradientMode === 'fg-transparent'
        ? `rgba(${fgRgb.r},${fgRgb.g},${fgRgb.b},0)`
        : `rgb(${bgRgb.r},${bgRgb.g},${bgRgb.b})`;

    let grad: CanvasGradient;
    if (this.gradientType === 'radial') {
      const r = Math.max(10, Math.hypot(end.x - start.x, end.y - start.y));
      grad = ctx.createRadialGradient(start.x, start.y, 0, start.x, start.y, r);
    } else {
      grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
    }
    grad.addColorStop(0, this.fgColor);
    grad.addColorStop(1, endColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, doc.width, doc.height);
    ctx.restore();
  }

  private sampleColorAt(docX: number, docY: number): void {
    const doc = this.getActiveDoc();
    if (!doc || !this.mainCanvas) return;
    const x = Math.max(0, Math.min(doc.width - 1, Math.floor(docX)));
    const y = Math.max(0, Math.min(doc.height - 1, Math.floor(docY)));
    const ctx = this.mainCanvas.getContext('2d')!;
    const px = ctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(px[0], px[1], px[2]);
    this.setForegroundColor(hex);
    this.onNotify(`Sampled color ${hex}`, 'info');
  }

  public setSpaceHeld(held: boolean): void {
    this.spaceHeld = held;
    if (this.viewportEl) {
      this.viewportEl.style.cursor = held ? 'grab' : '';
    }
  }

  // ==================== RENDERING ====================
  public renderAll(): void {
    this.renderMainCanvasOnly();
    this.renderOverlay();
    this.renderNavigator();
    this.drawColorWheel();
  }

  public renderMainCanvasOnly(): void {
    const doc = this.getActiveDoc();
    const frame = this.getCurrentFrame();
    if (!doc || !frame || !this.mainCanvas) return;

    if (this.mainCanvas.width !== doc.width || this.mainCanvas.height !== doc.height) {
      this.mainCanvas.width = doc.width;
      this.mainCanvas.height = doc.height;
      this.overlayCanvas.width = doc.width;
      this.overlayCanvas.height = doc.height;
    }

    const onionTargets = !this.isPlaying
      ? getOnionSkinTargets(doc.currentFrameIndex, doc.frames.length, doc.onionSkin)
      : [];
    const onionSkinFrames = onionTargets
      .map((t) => ({
        target: t,
        layers: doc.frames[t.frameIndex]?.layers || [],
      }))
      .filter((item) => item.layers.length > 0);

    const ctx = this.mainCanvas.getContext('2d')!;
    compositeDocument(ctx, {
      width: doc.width,
      height: doc.height,
      backgroundColor: doc.backgroundColor,
      transparentBackground: doc.transparentBackground,
      layers: frame.layers,
      comicPanels: doc.comicPanels,
      speechBubbles: doc.speechBubbles,
      textObjects: doc.textObjects,
      onionSkinFrames,
      includeCheckerboard: true,
    });

    this.applyCanvasTransform();
  }

  public applyCanvasTransform(): void {
    const doc = this.getActiveDoc();
    if (!doc || !this.mainCanvas || !this.overlayCanvas) return;
    const sx = doc.flipH ? -doc.zoom : doc.zoom;
    const sy = doc.flipV ? -doc.zoom : doc.zoom;
    const transform = `translate(-50%, -50%) translate(${doc.panX}px, ${doc.panY}px) rotate(${doc.rotationDeg}deg) scale(${sx}, ${sy})`;
    this.mainCanvas.style.transform = transform;
    this.overlayCanvas.style.transform = transform;
  }

  public renderOverlay(): void {
    const doc = this.getActiveDoc();
    if (!doc || !this.overlayCanvas) return;
    const ctx = this.overlayCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, doc.width, doc.height);

    // Grid display
    if (this.settings.showGrid) {
      const step = Math.max(8, this.settings.gridSize);
      ctx.save();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
      ctx.lineWidth = 1;
      for (let x = step; x < doc.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, doc.height);
        ctx.stroke();
      }
      for (let y = step; y < doc.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(doc.width, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Center & Rule-of-thirds guides
    if (this.settings.showGuides) {
      ctx.save();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(doc.width / 2, 0);
      ctx.lineTo(doc.width / 2, doc.height);
      ctx.moveTo(0, doc.height / 2);
      ctx.lineTo(doc.width, doc.height / 2);
      ctx.moveTo(doc.width / 3, 0);
      ctx.lineTo(doc.width / 3, doc.height);
      ctx.moveTo((doc.width * 2) / 3, 0);
      ctx.lineTo((doc.width * 2) / 3, doc.height);
      ctx.stroke();
      ctx.restore();
    }

    // Symmetry guide
    if (this.settings.showSymmetry) {
      ctx.save();
      ctx.strokeStyle = '#F28C28';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(doc.width / 2, 0);
      ctx.lineTo(doc.width / 2, doc.height);
      ctx.stroke();
      ctx.restore();
    }

    // Animation camera bounds overlay
    if (doc.camera.enabled) {
      ctx.save();
      ctx.strokeStyle = '#F28C28';
      ctx.lineWidth = 3;
      const cw = doc.width / doc.camera.zoom;
      const ch = doc.height / doc.camera.zoom;
      const cx = doc.width / 2 - cw / 2 + doc.camera.x;
      const cy = doc.height / 2 - ch / 2 + doc.camera.y;
      ctx.strokeRect(cx, cy, cw, ch);
      ctx.restore();
    }

    // Active selection box
    if (doc.selection?.active) {
      ctx.save();
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      if (doc.selection.shape === 'ellipse') {
        ctx.ellipse(
          doc.selection.x + doc.selection.width / 2,
          doc.selection.y + doc.selection.height / 2,
          doc.selection.width / 2,
          doc.selection.height / 2,
          0,
          0,
          Math.PI * 2
        );
      } else {
        ctx.rect(doc.selection.x, doc.selection.y, doc.selection.width, doc.selection.height);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Live shape/gradient preview during drag
    if (this.isPointerDown && this.dragStartDoc && this.dragCurrentDoc) {
      if (
        this.activeTool === 'shape' ||
        this.activeTool === 'line-shape' ||
        this.activeTool === 'ellipse-shape' ||
        this.activeTool === 'polygon-shape' ||
        this.activeTool === 'curve-shape'
      ) {
        ctx.save();
        ctx.strokeStyle = this.fgColor;
        ctx.lineWidth = this.shapeStrokeWidth;
        const x = Math.min(this.dragStartDoc.x, this.dragCurrentDoc.x);
        const y = Math.min(this.dragStartDoc.y, this.dragCurrentDoc.y);
        const w = Math.abs(this.dragCurrentDoc.x - this.dragStartDoc.x);
        const h = Math.abs(this.dragCurrentDoc.y - this.dragStartDoc.y);
        ctx.beginPath();
        if (this.shapeType === 'line') {
          ctx.moveTo(this.dragStartDoc.x, this.dragStartDoc.y);
          ctx.lineTo(this.dragCurrentDoc.x, this.dragCurrentDoc.y);
          ctx.stroke();
        } else if (this.shapeType === 'rect') {
          ctx.strokeRect(x, y, w, h);
        } else if (this.shapeType === 'ellipse') {
          ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (this.shapeType === 'curve') {
          const mx = (this.dragStartDoc.x + this.dragCurrentDoc.x) / 2;
          const my = Math.min(this.dragStartDoc.y, this.dragCurrentDoc.y) - Math.max(40, h * 0.6);
          ctx.moveTo(this.dragStartDoc.x, this.dragStartDoc.y);
          ctx.quadraticCurveTo(mx, my, this.dragCurrentDoc.x, this.dragCurrentDoc.y);
          ctx.stroke();
        } else if (this.shapeType === 'polygon') {
          const cx = x + w / 2;
          const cy = y + h / 2;
          const rx = Math.max(4, w / 2);
          const ry = Math.max(4, h / 2);
          for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
            const px = cx + Math.cos(a) * rx;
            const py = cy + Math.sin(a) * ry;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        } else {
          ctx.moveTo(x + w / 2, y);
          ctx.lineTo(x + w, y + h);
          ctx.lineTo(x, y + h);
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
      } else if (this.activeTool === 'gradient') {
        ctx.save();
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(this.dragStartDoc.x, this.dragStartDoc.y);
        ctx.lineTo(this.dragCurrentDoc.x, this.dragCurrentDoc.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  public renderNavigator(): void {
    const doc = this.getActiveDoc();
    if (!doc || !this.navCanvas || !this.mainCanvas) return;
    const ctx = this.navCanvas.getContext('2d')!;
    const nw = this.navCanvas.width;
    const nh = this.navCanvas.height;
    ctx.clearRect(0, 0, nw, nh);
    ctx.fillStyle = '#17191E';
    ctx.fillRect(0, 0, nw, nh);

    const scale = Math.min((nw - 12) / doc.width, (nh - 12) / doc.height);
    const dw = doc.width * scale;
    const dh = doc.height * scale;
    const ox = (nw - dw) / 2;
    const oy = (nh - dh) / 2;
    ctx.drawImage(this.mainCanvas, ox, oy, dw, dh);
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ox, oy, dw, dh);
  }

  public drawColorWheel(): void {
    if (!this.wheelCanvas) return;
    const ctx = this.wheelCanvas.getContext('2d')!;
    const size = this.wheelCanvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 4;
    const innerR = outerR - 14;
    ctx.clearRect(0, 0, size, size);

    // Hue ring
    for (let deg = 0; deg < 360; deg += 2) {
      const a0 = ((deg - 1) * Math.PI) / 180;
      const a1 = ((deg + 2) * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(cx, cy, (outerR + innerR) / 2, a0, a1);
      ctx.strokeStyle = `hsl(${deg}, 100%, 50%)`;
      ctx.lineWidth = outerR - innerR;
      ctx.stroke();
    }

    const rgb = hexToRgb(this.fgColor) || { r: 59, g: 130, b: 246 };
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

    // SV square inside wheel
    const boxSize = Math.floor(innerR * 1.28);
    const bx = Math.floor(cx - boxSize / 2);
    const by = Math.floor(cy - boxSize / 2);

    const hueRgb = hsvToRgb(hsv.h, 100, 100);
    ctx.fillStyle = `rgb(${hueRgb.r},${hueRgb.g},${hueRgb.b})`;
    ctx.fillRect(bx, by, boxSize, boxSize);

    const whiteGrad = ctx.createLinearGradient(bx, by, bx + boxSize, by);
    whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
    whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(bx, by, boxSize, boxSize);

    const blackGrad = ctx.createLinearGradient(bx, by, bx, by + boxSize);
    blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
    blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = blackGrad;
    ctx.fillRect(bx, by, boxSize, boxSize);

    // Hue marker on ring
    const hRad = (hsv.h * Math.PI) / 180;
    const mr = (outerR + innerR) / 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(hRad) * mr, cy + Math.sin(hRad) * mr, 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // SV cursor
    const sx = bx + (hsv.s / 100) * boxSize;
    const sy = by + (1 - hsv.v / 100) * boxSize;
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.strokeStyle = hsv.v > 55 ? '#090A0F' : '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  public pickColorFromWheel(clientX: number, clientY: number): void {
    if (!this.wheelCanvas) return;
    const rect = this.wheelCanvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * this.wheelCanvas.width;
    const y = ((clientY - rect.top) / rect.height) * this.wheelCanvas.height;
    const size = this.wheelCanvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 4;
    const innerR = outerR - 14;
    const dist = Math.hypot(x - cx, y - cy);

    const rgb = hexToRgb(this.fgColor) || { r: 59, g: 130, b: 246 };
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

    if (dist >= innerR && dist <= outerR + 4) {
      let deg = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      const next = hsvToRgb(deg, hsv.s, hsv.v);
      this.setForegroundColor(rgbToHex(next.r, next.g, next.b));
      return;
    }

    const boxSize = Math.floor(innerR * 1.28);
    const bx = Math.floor(cx - boxSize / 2);
    const by = Math.floor(cy - boxSize / 2);
    if (x >= bx && x <= bx + boxSize && y >= by && y <= by + boxSize) {
      const s = Math.max(0, Math.min(100, ((x - bx) / boxSize) * 100));
      const v = Math.max(0, Math.min(100, (1 - (y - by) / boxSize) * 100));
      const next = hsvToRgb(hsv.h, s, v);
      this.setForegroundColor(rgbToHex(next.r, next.g, next.b));
    }
  }

  private updateStatusCoords(x: number, y: number): void {
    const el = document.getElementById('status-coords');
    if (el) {
      el.textContent = `${x}, ${y} px`;
    }
  }

  // ==================== FILE SAVE / LOAD / IMPORT / EXPORT ====================
  public buildManifest(doc: StudioDocument): KasManifest {
    return {
      format: 'kairo-art-studio-project',
      schemaVersion: KAS_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      name: doc.name,
      width: doc.width,
      height: doc.height,
      dpi: doc.dpi,
      fps: doc.fps,
      workspace: this.workspace,
      backgroundColor: doc.backgroundColor,
      transparentBackground: doc.transparentBackground,
      onionSkin: { ...doc.onionSkin },
      camera: { ...doc.camera },
      frames: doc.frames.map((f) => ({
        meta: { ...f.meta },
        layers: f.layers.map((l) => ({
          ...l.meta,
          dataUrl: l.canvas.toDataURL('image/png'),
        })),
      })),
      comicPanels: doc.comicPanels.map((p) => ({ ...p })),
      speechBubbles: doc.speechBubbles.map((b) => ({ ...b })),
      textObjects: doc.textObjects.map((t) => ({ ...t })),
    };
  }

  public saveAllProjects(): void {
    if (this.documents.length === 0) return;
    this.documents.forEach((doc) => {
      const manifest = this.buildManifest(doc);
      const json = serializeKasProject(manifest);
      this.triggerDownload(
        new Blob([json], { type: 'application/json' }),
        `${doc.name.replace(/\s+/g, '_')}.kas`
      );
      doc.dirty = false;
      this.recordRecentProject(doc);
    });
    this.onUiUpdate();
    this.onNotify(`Saved all ${this.documents.length} open project(s)`, 'success');
  }

  public saveKasProject(): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    const manifest = this.buildManifest(doc);
    const json = serializeKasProject(manifest);
    this.triggerDownload(
      new Blob([json], { type: 'application/json' }),
      `${doc.name.replace(/\s+/g, '_')}.kas`
    );
    doc.dirty = false;
    this.recordRecentProject(doc);
    this.onUiUpdate();
    this.onNotify(`Saved ${doc.name}.kas`, 'success');
  }

  public async openKasFile(file: File): Promise<void> {
    const text = await file.text();
    const res = parseKasProject(text);
    if (!res.valid || !res.manifest) {
      this.onNotify(res.error || 'Invalid .kas file', 'error');
      return;
    }
    await this.loadManifestIntoDocument(res.manifest);
    this.onNotify(`Opened ${res.manifest.name}`, 'success');
  }

  public async loadManifestIntoDocument(manifest: KasManifest): Promise<void> {
    const loadImg = (dataUrl: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
      });

    const frames: FrameSnapshot[] = [];
    for (const f of manifest.frames) {
      const layers: RuntimeLayer[] = [];
      for (const l of f.layers) {
        const c = createOffscreenCanvas(manifest.width, manifest.height);
        if (l.dataUrl) {
          try {
            const img = await loadImg(l.dataUrl);
            c.getContext('2d')!.drawImage(img, 0, 0);
          } catch {
            // blank layer on corrupted dataUrl
          }
        }
        layers.push({
          meta: {
            id: l.id,
            name: l.name,
            type: l.type,
            visible: l.visible,
            opacity: l.opacity,
            blendMode: l.blendMode,
            locked: l.locked,
            alphaLock: l.alphaLock,
            clipped: l.clipped,
          },
          canvas: c,
        });
      }
      frames.push({ meta: { ...f.meta }, layers });
    }

    const doc: StudioDocument = {
      id: `doc-${Date.now()}`,
      name: manifest.name,
      width: manifest.width,
      height: manifest.height,
      dpi: manifest.dpi,
      fps: manifest.fps,
      backgroundColor: manifest.backgroundColor,
      transparentBackground: manifest.transparentBackground,
      frames,
      currentFrameIndex: 0,
      activeLayerId: frames[0].layers[frames[0].layers.length - 1]?.meta.id || '',
      zoom: 1,
      panX: 0,
      panY: 0,
      rotationDeg: 0,
      flipH: false,
      flipV: false,
      onionSkin: { ...manifest.onionSkin },
      camera: { ...manifest.camera },
      tracks: [{ id: 'track-main', name: 'Main Animation', visible: true, locked: false }],
      activeTrackId: 'track-main',
      comicPanels: manifest.comicPanels || [],
      speechBubbles: manifest.speechBubbles || [],
      textObjects: manifest.textObjects || [],
      selection: null,
      history: new CommandHistory<HistorySnapshot>(this.settings.historyDepth),
      dirty: false,
    };

    this.documents.push(doc);
    this.activeDocIndex = this.documents.length - 1;
    this.workspace = manifest.workspace || 'illustration';
    this.pushHistory('Loaded Project');
    this.fitCanvasToViewport();
    this.renderAll();
    this.onUiUpdate();
  }

  public async importImageAsLayer(file: File): Promise<void> {
    const doc = this.getActiveDoc();
    if (!doc) return;
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = url;
      });
      this.addLayer();
      const layer = this.getActiveLayer();
      if (layer) {
        layer.meta.name = file.name.replace(/\.[^.]+$/, '');
        const ctx = layer.canvas.getContext('2d')!;
        const scale = Math.min(doc.width / img.width, doc.height / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (doc.width - w) / 2, (doc.height - h) / 2, w, h);
        this.pushHistory(`Import ${file.name}`);
        this.renderAll();
        this.onUiUpdate();
        this.onNotify(`Imported ${file.name} as new layer`, 'success');
      }
    } catch {
      this.onNotify(`Could not decode image: ${file.name}`, 'error');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  public renderCleanFrameCanvas(frameIndex: number, includeBackground = true): HTMLCanvasElement | null {
    const doc = this.getActiveDoc();
    if (!doc || !doc.frames[frameIndex]) return null;
    const c = createOffscreenCanvas(doc.width, doc.height);
    const ctx = c.getContext('2d')!;
    compositeDocument(ctx, {
      width: doc.width,
      height: doc.height,
      backgroundColor: doc.backgroundColor,
      transparentBackground: includeBackground ? doc.transparentBackground : true,
      layers: doc.frames[frameIndex].layers,
      comicPanels: doc.comicPanels,
      speechBubbles: doc.speechBubbles,
      textObjects: doc.textObjects,
      onionSkinFrames: [], // strictly excluded from exports
      includeCheckerboard: false,
    });
    return c;
  }

  public exportRasterImage(format: 'png' | 'jpeg' | 'webp', quality = 0.92): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    const clean = this.renderCleanFrameCanvas(doc.currentFrameIndex, format === 'jpeg' ? false : true);
    if (!clean) return;
    const mime =
      format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp';
    clean.toBlob(
      (blob) => {
        if (!blob) {
          this.onNotify('Export failed: unable to encode image', 'error');
          return;
        }
        this.triggerDownload(blob, `${doc.name.replace(/\s+/g, '_')}.${format}`);
        this.onNotify(`Exported ${format.toUpperCase()}`, 'success');
      },
      mime,
      quality
    );
  }

  public exportAnimatedGif(): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    // Scale down large animations to max 640px wide for fast responsive browser GIF encoding
    const maxDim = 640;
    const scale = Math.min(1, maxDim / Math.max(doc.width, doc.height));
    const gw = Math.max(1, Math.round(doc.width * scale));
    const gh = Math.max(1, Math.round(doc.height * scale));
    const scaledCanvas = createOffscreenCanvas(gw, gh);
    const sCtx = scaledCanvas.getContext('2d')!;

    const framesInput = doc.frames.map((f, idx) => {
      const full = this.renderCleanFrameCanvas(idx, true)!;
      sCtx.clearRect(0, 0, gw, gh);
      sCtx.fillStyle = doc.backgroundColor || '#FFFFFF';
      sCtx.fillRect(0, 0, gw, gh);
      sCtx.drawImage(full, 0, 0, gw, gh);
      return {
        imageData: sCtx.getImageData(0, 0, gw, gh),
        delayMs: getFrameIntervalMs(doc.fps) * Math.max(1, f.meta.exposure),
      };
    });

    const gifBytes = encodeAnimatedGif(gw, gh, framesInput);
    const gifCopy = new Uint8Array(gifBytes);
    this.triggerDownload(
      new Blob([gifCopy], { type: 'image/gif' }),
      `${doc.name.replace(/\s+/g, '_')}_anim.gif`
    );
    this.onNotify(`Exported Animated GIF (${doc.frames.length} frames)`, 'success');
  }

  public exportPngSequence(): void {
    const doc = this.getActiveDoc();
    if (!doc) return;
    doc.frames.forEach((_f, idx) => {
      const clean = this.renderCleanFrameCanvas(idx, true);
      if (!clean) return;
      clean.toBlob((blob) => {
        if (blob) {
          const num = String(idx + 1).padStart(3, '0');
          this.triggerDownload(blob, `${doc.name.replace(/\s+/g, '_')}_frame_${num}.png`);
        }
      }, 'image/png');
    });
    this.onNotify(`Exported ${doc.frames.length} PNG frame(s)`, 'success');
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  // ==================== AUTOSAVE & RECOVERY ====================
  private startAutosaveLoop(): void {
    window.setInterval(() => {
      if (!this.settings.autosaveEnabled) return;
      const doc = this.getActiveDoc();
      if (!doc || !doc.dirty) return;
      try {
        const manifest = this.buildManifest(doc);
        const json = serializeKasProject(manifest);
        if (json.length < 2_500_000) {
          localStorage.setItem(STORAGE_AUTOSAVE_KEY, json);
        }
      } catch {
        // ignore storage limits
      }
    }, Math.max(15, this.settings.autosaveIntervalSec) * 1000);
  }

  public getRecoverableAutosave(): KasManifest | null {
    try {
      const raw = localStorage.getItem(STORAGE_AUTOSAVE_KEY);
      if (!raw) return null;
      const parsed = parseKasProject(raw);
      return parsed.valid && parsed.manifest ? parsed.manifest : null;
    } catch {
      return null;
    }
  }

  public clearRecoverableAutosave(): void {
    try {
      localStorage.removeItem(STORAGE_AUTOSAVE_KEY);
    } catch {
      // ignore
    }
  }

  public getRecentProjects(): RecentProjectEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_RECENT_KEY);
      return raw ? (JSON.parse(raw) as RecentProjectEntry[]) : [];
    } catch {
      return [];
    }
  }

  private recordRecentProject(doc: StudioDocument): void {
    const list = this.getRecentProjects().filter((r) => r.name !== doc.name);
    list.unshift({
      name: doc.name,
      width: doc.width,
      height: doc.height,
      workspace: this.workspace,
      savedAt: new Date().toLocaleString(),
    });
    try {
      localStorage.setItem(STORAGE_RECENT_KEY, JSON.stringify(list.slice(0, 6)));
    } catch {
      // ignore
    }
  }

  public getDocumentPresets() {
    return DOCUMENT_PRESETS;
  }

  public getBlendModes() {
    return BLEND_MODES;
  }

  public computePhysicalPixels(val: number, unit: 'px' | 'mm' | 'in', dpi: number): number {
    return convertPhysicalToPixels(val, unit, dpi);
  }
}
