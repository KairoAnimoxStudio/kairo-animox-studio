import type { ToolId } from './studioApp';

export interface ToolItemDef {
  id: ToolId;
  label: string;
  shortLabel: string;
  icon: string;
  shortcut?: string;
  tooltip: string;
}

export interface ToolSlotDef {
  slotId: string;
  defaultTool: ToolId;
  items: ToolItemDef[];
}

export const ALL_TOOLS_BY_ID: Record<ToolId, ToolItemDef> = {
  move: { id: 'move', label: 'Move', shortLabel: 'Move', icon: 'tool-move', shortcut: 'V', tooltip: 'Move — Reposition active layer contents (V)' },
  hand: { id: 'hand', label: 'Hand', shortLabel: 'Hand', icon: 'tool-hand', shortcut: 'H', tooltip: 'Hand — Pan canvas viewport (H / Space+Drag)' },
  zoom: { id: 'zoom', label: 'Zoom', shortLabel: 'Zoom', icon: 'tool-zoom', shortcut: 'Z', tooltip: 'Zoom — Click to zoom in, Alt+Click to zoom out (Z)' },
  brush: { id: 'brush', label: 'Brush', shortLabel: 'Brush', icon: 'tool-brush', shortcut: 'B', tooltip: 'Brush — Draw freehand strokes (B)' },
  airbrush: { id: 'airbrush', label: 'Airbrush', shortLabel: 'Air', icon: 'tool-airbrush', tooltip: 'Airbrush — Soft diffused spray painting' },
  watercolor: { id: 'watercolor', label: 'Watercolor', shortLabel: 'Water', icon: 'tool-watercolor', tooltip: 'Watercolor — Translucent pigment wash strokes' },
  blend: { id: 'blend', label: 'Blend', shortLabel: 'Blend', icon: 'tool-blend', tooltip: 'Blend — Softly blend and feather color edges' },
  pencil: { id: 'pencil', label: 'Pencil', shortLabel: 'Pencil', icon: 'tool-pencil', shortcut: 'P', tooltip: 'Pencil — Textured sketching & rough linework (P)' },
  pen: { id: 'pen', label: 'Pen', shortLabel: 'Pen', icon: 'tool-pen', tooltip: 'Pen — Crisp tapered manga ink strokes' },
  'vector-pen': { id: 'vector-pen', label: 'Vector Pen', shortLabel: 'Vector', icon: 'tool-vector-pen', tooltip: 'Vector Pen — Precision vector ink contour strokes' },
  eraser: { id: 'eraser', label: 'Eraser', shortLabel: 'Eraser', icon: 'tool-eraser', shortcut: 'E', tooltip: 'Eraser — Remove pixels from active layer (E)' },
  fill: { id: 'fill', label: 'Fill', shortLabel: 'Fill', icon: 'tool-fill', shortcut: 'G', tooltip: 'Bucket Fill — Flood fill bounded regions (G)' },
  eyedropper: { id: 'eyedropper', label: 'Eyedropper', shortLabel: 'Pick', icon: 'tool-eyedropper', shortcut: 'I', tooltip: 'Eyedropper — Sample color from canvas (I)' },
  selection: { id: 'selection', label: 'Rectangle Selection', shortLabel: 'Select', icon: 'tool-selection-rect', shortcut: 'M', tooltip: 'Rectangle Selection — Select rectangular region (M)' },
  'ellipse-selection': { id: 'ellipse-selection', label: 'Ellipse Selection', shortLabel: 'Ellipse', icon: 'tool-selection-ellipse', tooltip: 'Ellipse Selection — Select elliptical region' },
  lasso: { id: 'lasso', label: 'Lasso', shortLabel: 'Lasso', icon: 'tool-lasso', shortcut: 'L', tooltip: 'Lasso — Freehand selection boundary (L)' },
  'polygon-selection': { id: 'polygon-selection', label: 'Polygon Selection', shortLabel: 'PolySel', icon: 'tool-selection-poly', tooltip: 'Polygon Selection — Polygonal area selection' },
  'magic-wand': { id: 'magic-wand', label: 'Magic Wand', shortLabel: 'Wand', icon: 'tool-magic-wand', shortcut: 'W', tooltip: 'Magic Wand — Select contiguous color area by tolerance (W)' },
  transform: { id: 'transform', label: 'Transform', shortLabel: 'Xform', icon: 'tool-transform', tooltip: 'Transform — Drag to translate or adjust layer bounds' },
  shape: { id: 'shape', label: 'Rectangle', shortLabel: 'Rect', icon: 'tool-shape-rect', shortcut: 'U', tooltip: 'Rectangle — Draw rectangular vector/raster shape (U)' },
  'ellipse-shape': { id: 'ellipse-shape', label: 'Ellipse', shortLabel: 'Circle', icon: 'tool-shape-ellipse', tooltip: 'Ellipse — Draw elliptical or circular shape' },
  'line-shape': { id: 'line-shape', label: 'Line', shortLabel: 'Line', icon: 'tool-shape-line', tooltip: 'Line — Draw straight ruler line segment' },
  'polygon-shape': { id: 'polygon-shape', label: 'Polygon', shortLabel: 'Poly', icon: 'tool-shape-polygon', tooltip: 'Polygon — Draw regular polygon shape' },
  'curve-shape': { id: 'curve-shape', label: 'Curve', shortLabel: 'Curve', icon: 'tool-shape-curve', tooltip: 'Curve — Draw smooth quadratic Bezier arc' },
  gradient: { id: 'gradient', label: 'Gradient', shortLabel: 'Grad', icon: 'tool-gradient', tooltip: 'Gradient — Drag directional linear or radial fill' },
  text: { id: 'text', label: 'Text', shortLabel: 'Text', icon: 'tool-text', shortcut: 'T', tooltip: 'Text — Place editable typography on canvas (T)' },
  symmetry: { id: 'symmetry', label: 'Symmetry Tool', shortLabel: 'Mirror', icon: 'tool-symmetry', shortcut: 'Y', tooltip: 'Symmetry Tool — Mirrored bilateral painting (Y)' },
  comic: { id: 'comic', label: 'Comic', shortLabel: 'Comic', icon: 'tool-comic', shortcut: 'C', tooltip: 'Comic — Panels & speech bubbles (C)' },
};

export const LEFT_TOOL_SLOTS: ToolSlotDef[] = [
  { slotId: 'slot-move', defaultTool: 'move', items: [ALL_TOOLS_BY_ID.move] },
  { slotId: 'slot-transform', defaultTool: 'transform', items: [ALL_TOOLS_BY_ID.transform] },
  {
    slotId: 'slot-brush',
    defaultTool: 'brush',
    items: [ALL_TOOLS_BY_ID.brush, ALL_TOOLS_BY_ID.airbrush, ALL_TOOLS_BY_ID.watercolor, ALL_TOOLS_BY_ID.blend],
  },
  { slotId: 'slot-pencil', defaultTool: 'pencil', items: [ALL_TOOLS_BY_ID.pencil] },
  {
    slotId: 'slot-pen',
    defaultTool: 'pen',
    items: [ALL_TOOLS_BY_ID.pen, ALL_TOOLS_BY_ID['vector-pen']],
  },
  { slotId: 'slot-eraser', defaultTool: 'eraser', items: [ALL_TOOLS_BY_ID.eraser] },
  { slotId: 'slot-fill', defaultTool: 'fill', items: [ALL_TOOLS_BY_ID.fill] },
  { slotId: 'slot-eyedropper', defaultTool: 'eyedropper', items: [ALL_TOOLS_BY_ID.eyedropper] },
  {
    slotId: 'slot-select',
    defaultTool: 'selection',
    items: [
      ALL_TOOLS_BY_ID.selection,
      ALL_TOOLS_BY_ID['ellipse-selection'],
      ALL_TOOLS_BY_ID.lasso,
      ALL_TOOLS_BY_ID['polygon-selection'],
      ALL_TOOLS_BY_ID['magic-wand'],
    ],
  },
  {
    slotId: 'slot-shape',
    defaultTool: 'shape',
    items: [
      ALL_TOOLS_BY_ID.shape,
      ALL_TOOLS_BY_ID['ellipse-shape'],
      ALL_TOOLS_BY_ID['line-shape'],
      ALL_TOOLS_BY_ID['polygon-shape'],
      ALL_TOOLS_BY_ID['curve-shape'],
    ],
  },
  { slotId: 'slot-gradient', defaultTool: 'gradient', items: [ALL_TOOLS_BY_ID.gradient] },
  { slotId: 'slot-text', defaultTool: 'text', items: [ALL_TOOLS_BY_ID.text] },
  { slotId: 'slot-comic', defaultTool: 'comic', items: [ALL_TOOLS_BY_ID.comic] },
  { slotId: 'slot-symmetry', defaultTool: 'symmetry', items: [ALL_TOOLS_BY_ID.symmetry] },
  { slotId: 'slot-hand', defaultTool: 'hand', items: [ALL_TOOLS_BY_ID.hand] },
  { slotId: 'slot-zoom', defaultTool: 'zoom', items: [ALL_TOOLS_BY_ID.zoom] },
];

export interface MenuCommandDef {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  danger?: boolean;
  separatorBefore?: boolean;
}

export interface TopMenuDef {
  id: string;
  label: string;
  icon: string;
  items: MenuCommandDef[];
}

export const TOP_MENU_BAR: TopMenuDef[] = [
  {
    id: 'file',
    label: 'File',
    icon: 'menu-file',
    items: [
      { id: 'file-new', label: 'New', icon: 'tb-new', shortcut: 'Ctrl+N' },
      { id: 'file-open', label: 'Open', icon: 'tb-open', shortcut: 'Ctrl+O' },
      { id: 'file-open-recent', label: 'Open Recent', icon: 'menu-recent' },
      { id: 'file-save', label: 'Save', icon: 'tb-save', shortcut: 'Ctrl+S', separatorBefore: true },
      { id: 'file-save-as', label: 'Save As', icon: 'tb-save-as', shortcut: 'Ctrl+Shift+S' },
      { id: 'file-save-all', label: 'Save All', icon: 'tb-save-all' },
      { id: 'file-import', label: 'Import Image Layer', icon: 'dlg-import', separatorBefore: true },
      { id: 'file-export', label: 'Export Artwork / GIF', icon: 'dlg-export', shortcut: 'Ctrl+E' },
      { id: 'file-print', label: 'Print', icon: 'menu-print', shortcut: 'Ctrl+P', separatorBefore: true },
      { id: 'file-close', label: 'Close Document', icon: 'menu-close' },
      { id: 'file-exit', label: 'Exit to KaiApps', icon: 'menu-exit', danger: true, separatorBefore: true },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    icon: 'menu-edit',
    items: [
      { id: 'edit-undo', label: 'Undo', icon: 'tb-undo', shortcut: 'Ctrl+Z' },
      { id: 'edit-redo', label: 'Redo', icon: 'tb-redo', shortcut: 'Ctrl+Y' },
      { id: 'edit-cut', label: 'Cut', icon: 'tb-cut', shortcut: 'Ctrl+X', separatorBefore: true },
      { id: 'edit-copy', label: 'Copy', icon: 'tb-copy', shortcut: 'Ctrl+C' },
      { id: 'edit-paste', label: 'Paste', icon: 'tb-paste', shortcut: 'Ctrl+V' },
      { id: 'edit-delete', label: 'Delete / Clear Layer', icon: 'dlg-delete', shortcut: 'Del', danger: true },
      { id: 'edit-select-all', label: 'Select All', icon: 'menu-select-all', shortcut: 'Ctrl+A', separatorBefore: true },
      { id: 'edit-deselect', label: 'Deselect', icon: 'menu-deselect', shortcut: 'Ctrl+D' },
      { id: 'edit-prefs', label: 'Preferences', icon: 'dlg-settings', separatorBefore: true },
    ],
  },
  {
    id: 'view',
    label: 'View',
    icon: 'menu-view',
    items: [
      { id: 'view-zoom-in', label: 'Zoom In', icon: 'nav-zoom-in', shortcut: 'Ctrl++' },
      { id: 'view-zoom-out', label: 'Zoom Out', icon: 'nav-zoom-out', shortcut: 'Ctrl+-' },
      { id: 'view-fit', label: 'Fit Canvas', icon: 'nav-fit', shortcut: 'Ctrl+0' },
      { id: 'view-actual', label: 'Actual Size (100%)', icon: 'nav-actual', shortcut: 'Ctrl+1' },
      { id: 'view-fullscreen', label: 'Full Screen', icon: 'tb-fullscreen', shortcut: 'F11', separatorBefore: true },
      { id: 'view-grid', label: 'Grid', icon: 'tb-grid', separatorBefore: true },
      { id: 'view-rulers', label: 'Rulers', icon: 'tb-rulers' },
      { id: 'view-guides', label: 'Guides', icon: 'tb-guides' },
      { id: 'view-theme', label: 'Toggle Light / Dark Theme', icon: 'menu-theme', separatorBefore: true },
    ],
  },
  {
    id: 'canvas',
    label: 'Canvas',
    icon: 'menu-canvas',
    items: [
      { id: 'canvas-rot-left', label: 'Rotate View Left (-15°)', icon: 'nav-rotate-left' },
      { id: 'canvas-rot-right', label: 'Rotate View Right (+15°)', icon: 'nav-rotate-right' },
      { id: 'canvas-reset-rot', label: 'Reset Rotation', icon: 'nav-reset-rot' },
      { id: 'canvas-flip-h', label: 'Flip Horizontal', icon: 'nav-flip-h', separatorBefore: true },
      { id: 'canvas-flip-v', label: 'Flip Vertical', icon: 'nav-flip-v' },
      { id: 'canvas-reset-view', label: 'Reset View Transform', icon: 'nav-reset-view', separatorBefore: true },
    ],
  },
  {
    id: 'layer',
    label: 'Layer',
    icon: 'menu-layer',
    items: [
      { id: 'layer-new-raster', label: 'New Layer (Raster)', icon: 'layer-new-raster' },
      { id: 'layer-new-vector', label: 'New Vector Layer', icon: 'layer-new-vector' },
      { id: 'layer-new-mask', label: 'New Mask Layer', icon: 'layer-new-mask' },
      { id: 'layer-duplicate', label: 'Duplicate Layer', icon: 'layer-duplicate', separatorBefore: true },
      { id: 'layer-merge-down', label: 'Merge Down', icon: 'layer-merge-down' },
      { id: 'layer-merge-visible', label: 'Merge Visible', icon: 'layer-merge-visible' },
      { id: 'layer-group', label: 'Group Layer', icon: 'layer-new-group', separatorBefore: true },
      { id: 'layer-ungroup', label: 'Ungroup Layer', icon: 'layer-ungroup' },
      { id: 'layer-lock', label: 'Lock / Unlock', icon: 'layer-lock', separatorBefore: true },
      { id: 'layer-vis', label: 'Show / Hide', icon: 'layer-show' },
      { id: 'layer-delete', label: 'Delete Layer', icon: 'layer-delete', danger: true, separatorBefore: true },
    ],
  },
  {
    id: 'select',
    label: 'Select',
    icon: 'menu-select',
    items: [
      { id: 'sel-all', label: 'Select All', icon: 'menu-select-all', shortcut: 'Ctrl+A' },
      { id: 'sel-none', label: 'Deselect', icon: 'menu-deselect', shortcut: 'Ctrl+D' },
      { id: 'sel-rect', label: 'Rectangle Marquee Tool', icon: 'tool-selection-rect', separatorBefore: true },
      { id: 'sel-ellipse', label: 'Ellipse Marquee Tool', icon: 'tool-selection-ellipse' },
      { id: 'sel-lasso', label: 'Lasso Tool', icon: 'tool-lasso' },
      { id: 'sel-wand', label: 'Magic Wand Tool', icon: 'tool-magic-wand' },
    ],
  },
  {
    id: 'filter',
    label: 'Filter',
    icon: 'menu-filter',
    items: [
      { id: 'filter-grayscale', label: 'Grayscale (Manga Tone)', icon: 'menu-filter' },
      { id: 'filter-invert', label: 'Invert Colors', icon: 'color-swap' },
      { id: 'filter-sepia', label: 'Warm Sepia', icon: 'menu-filter' },
      { id: 'filter-brighten', label: 'Brighten (+10%)', icon: 'menu-theme', separatorBefore: true },
      { id: 'filter-darken', label: 'Darken (-10%)', icon: 'menu-filter' },
      { id: 'filter-contrast', label: 'Boost Contrast', icon: 'menu-filter' },
    ],
  },
  {
    id: 'animation',
    label: 'Animation',
    icon: 'menu-animation',
    items: [
      { id: 'anim-play', label: 'Play / Pause', icon: 'anim-play', shortcut: 'Space' },
      { id: 'anim-stop', label: 'Stop Playback', icon: 'anim-stop' },
      { id: 'anim-first', label: 'First Frame', icon: 'anim-first-frame', separatorBefore: true },
      { id: 'anim-prev', label: 'Previous Frame', icon: 'anim-prev-frame' },
      { id: 'anim-next', label: 'Next Frame', icon: 'anim-next-frame' },
      { id: 'anim-last', label: 'Last Frame', icon: 'anim-last-frame' },
      { id: 'anim-add', label: 'Add Frame', icon: 'anim-add-frame', separatorBefore: true },
      { id: 'anim-dup', label: 'Duplicate Frame', icon: 'anim-dup-frame' },
      { id: 'anim-del', label: 'Delete Frame', icon: 'anim-del-frame', danger: true },
      { id: 'anim-onion', label: 'Toggle Onion Skin', icon: 'anim-onion', separatorBefore: true },
    ],
  },
  {
    id: 'comic',
    label: 'Comic',
    icon: 'menu-comic',
    items: [
      { id: 'comic-2', label: 'Apply 2-Panel Layout', icon: 'menu-comic' },
      { id: 'comic-3', label: 'Apply 3-Panel Layout', icon: 'menu-comic' },
      { id: 'comic-4', label: 'Apply 4-Panel Grid', icon: 'tb-grid' },
      { id: 'comic-speech', label: 'Add Speech Bubble', icon: 'st-comic-speech', separatorBefore: true },
      { id: 'comic-thought', label: 'Add Thought Bubble', icon: 'st-comic-thought' },
      { id: 'comic-caption', label: 'Add Caption Box', icon: 'st-comic-caption' },
    ],
  },
  {
    id: 'window',
    label: 'Window',
    icon: 'menu-window',
    items: [
      { id: 'win-ill', label: 'Illustration Workspace', icon: 'tool-brush' },
      { id: 'win-anim', label: '2D Animation Workspace', icon: 'menu-animation' },
      { id: 'win-comic', label: 'Comic Workspace', icon: 'menu-comic' },
      { id: 'win-min', label: 'Minimal Workspace', icon: 'tb-fullscreen' },
      { id: 'win-timeline', label: 'Toggle Timeline Panel', icon: 'menu-animation', separatorBefore: true },
      { id: 'win-windows-app', label: 'Windows Software / App Install', icon: 'tb-windows-app' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: 'menu-tools',
    items: [
      { id: 'tool-brush', label: 'Brush', icon: 'tool-brush', shortcut: 'B' },
      { id: 'tool-pencil', label: 'Pencil', icon: 'tool-pencil', shortcut: 'P' },
      { id: 'tool-pen', label: 'Ink Pen', icon: 'tool-pen' },
      { id: 'tool-eraser', label: 'Eraser', icon: 'tool-eraser', shortcut: 'E' },
      { id: 'tool-fill', label: 'Bucket Fill', icon: 'tool-fill', shortcut: 'G' },
      { id: 'tool-magic-wand', label: 'Magic Wand', icon: 'tool-magic-wand', shortcut: 'W' },
      { id: 'tool-symmetry', label: 'Symmetry Painting', icon: 'tool-symmetry', shortcut: 'Y' },
      { id: 'tool-brush-settings', label: 'Brush Dynamics Settings', icon: 'brush-settings', separatorBefore: true },
    ],
  },
  {
    id: 'help',
    label: 'Help',
    icon: 'menu-help',
    items: [
      { id: 'help-welcome', label: 'Welcome Screen', icon: 'dlg-new-project' },
      { id: 'help-recovery', label: 'Crash Recovery Check', icon: 'dlg-recovery' },
      { id: 'help-shortcuts', label: 'Keyboard Shortcuts', icon: 'dlg-settings' },
      { id: 'help-about', label: 'About KAIRO ART STUDIO', icon: 'dlg-about', separatorBefore: true },
    ],
  },
];
