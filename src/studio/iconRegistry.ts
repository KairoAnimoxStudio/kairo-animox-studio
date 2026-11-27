export type IconCategory =
  | 'toolbar'
  | 'tools'
  | 'layers'
  | 'brushes'
  | 'colors'
  | 'animation'
  | 'menus'
  | 'dialogs'
  | 'navigation'
  | 'status';

export type IconSize = 16 | 18 | 24 | 28;

export interface IconEntry {
  id: string;
  category: IconCategory;
  body: string;
}

const ICONS_LIST: IconEntry[] = [
  // ==================== MENUS ====================
  { id: 'menu-file', category: 'menus', body: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>' },
  { id: 'menu-edit', category: 'menus', body: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
  { id: 'menu-view', category: 'menus', body: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>' },
  { id: 'menu-canvas', category: 'menus', body: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>' },
  { id: 'menu-layer', category: 'menus', body: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>' },
  { id: 'menu-select', category: 'menus', body: '<path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1M9 21h1M14 3h1M14 21h1M3 9v1M21 9v1M3 14v1M21 14v1"/>' },
  { id: 'menu-filter', category: 'menus', body: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>' },
  { id: 'menu-animation', category: 'menus', body: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v16M17 4v16M2 12h20M2 8h5M2 16h5M17 8h5M17 16h5"/>' },
  { id: 'menu-comic', category: 'menus', body: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/>' },
  { id: 'menu-window', category: 'menus', body: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>' },
  { id: 'menu-tools', category: 'menus', body: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/>' },
  { id: 'menu-help', category: 'menus', body: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>' },
  { id: 'menu-recent', category: 'menus', body: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
  { id: 'menu-print', category: 'menus', body: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>' },
  { id: 'menu-close', category: 'menus', body: '<path d="M18 6 6 18M6 6l12 12"/>' },
  { id: 'menu-exit', category: 'menus', body: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>' },
  { id: 'menu-select-all', category: 'menus', body: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/>' },
  { id: 'menu-deselect', category: 'menus', body: '<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/><path d="m9 9 6 6M15 9l-6 6"/>' },
  { id: 'menu-theme', category: 'menus', body: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>' },

  // ==================== MAIN TOOLBAR ====================
  { id: 'tb-new', category: 'toolbar', body: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M12 18v-6M9 15h6"/>' },
  { id: 'tb-open', category: 'toolbar', body: '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>' },
  { id: 'tb-save', category: 'toolbar', body: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>' },
  { id: 'tb-save-as', category: 'toolbar', body: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><polyline points="17 21 17 13 7 13 7 21"/><path d="m11 6 3 3-3 3"/>' },
  { id: 'tb-save-all', category: 'toolbar', body: '<path d="M17 21H5a2 2 0 0 1-2-2V7"/><path d="M21 17H9a2 2 0 0 1-2-2V3h10l4 4v8a2 2 0 0 1-2 2Z"/><path d="M11 3v4h6"/>' },
  { id: 'tb-undo', category: 'toolbar', body: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>' },
  { id: 'tb-redo', category: 'toolbar', body: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>' },
  { id: 'tb-cut', category: 'toolbar', body: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88"/><path d="M14.47 14.48 20 20"/><path d="M8.12 8.12 12 12"/>' },
  { id: 'tb-copy', category: 'toolbar', body: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' },
  { id: 'tb-paste', category: 'toolbar', body: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>' },
  { id: 'tb-grid', category: 'toolbar', body: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>' },
  { id: 'tb-rulers', category: 'toolbar', body: '<path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4Z"/><path d="m7.5 10.5 2 2M10.5 7.5l2 2M13.5 4.5l2 2M4.5 13.5l2 2"/>' },
  { id: 'tb-guides', category: 'toolbar', body: '<path d="M12 2v20M2 12h20"/><rect x="5" y="5" width="14" height="14" rx="1" stroke-dasharray="2 2"/>' },
  { id: 'tb-fullscreen', category: 'toolbar', body: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>' },
  { id: 'tb-windows-app', category: 'toolbar', body: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><path d="m9 10 3 3 3-3M12 7v6"/>' },
  { id: 'tb-back', category: 'toolbar', body: '<path d="m15 18-6-6 6-6"/>' },

  // ==================== NAVIGATION ====================
  { id: 'nav-zoom-in', category: 'navigation', body: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>' },
  { id: 'nav-zoom-out', category: 'navigation', body: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>' },
  { id: 'nav-fit', category: 'navigation', body: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><rect x="8" y="8" width="8" height="8" rx="1"/>' },
  { id: 'nav-actual', category: 'navigation', body: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 9v6M12 9h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-2V9Z"/>' },
  { id: 'nav-rotate-left', category: 'navigation', body: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>' },
  { id: 'nav-rotate-right', category: 'navigation', body: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>' },
  { id: 'nav-reset-rot', category: 'navigation', body: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>' },
  { id: 'nav-flip-h', category: 'navigation', body: '<path d="M12 3v18"/><path d="m8 7-5 5 5 5V7Z"/><path d="m16 7 5 5-5 5V7Z"/>' },
  { id: 'nav-flip-v', category: 'navigation', body: '<path d="M3 12h18"/><path d="m7 8 5-5 5 5H7Z"/><path d="m7 16 5 5 5-5H7Z"/>' },
  { id: 'nav-reset-view', category: 'navigation', body: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><circle cx="12" cy="12" r="2"/>' },

  // ==================== 27 DRAWING TOOLS ====================
  { id: 'tool-move', category: 'tools', body: '<path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>' },
  { id: 'tool-hand', category: 'tools', body: '<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.5L3.3 15.8a2 2 0 0 1 2.9-2.7L8 15"/>' },
  { id: 'tool-zoom', category: 'tools', body: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/>' },
  { id: 'tool-brush', category: 'tools', body: '<path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02Z"/>' },
  { id: 'tool-pencil', category: 'tools', body: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>' },
  { id: 'tool-pen', category: 'tools', body: '<path d="M12 19l7-7 3 3-7 7-3-3Z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/>' },
  { id: 'tool-eraser', category: 'tools', body: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>' },
  { id: 'tool-airbrush', category: 'tools', body: '<path d="M3 14h4l3-4h6a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H9l-2-2H3Z"/><circle cx="19" cy="6" r="1"/><circle cx="21" cy="9" r="1"/><circle cx="16" cy="5" r="1"/>' },
  { id: 'tool-watercolor', category: 'tools', body: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/><path d="M8.5 14.5a3.5 3.5 0 0 0 5 3"/>' },
  { id: 'tool-blend', category: 'tools', body: '<path d="M12 3a6 6 0 0 0-6 6c0 4 4 6 4 10a2 2 0 1 0 4 0c0-4 4-6 4-10a6 6 0 0 0-6-6Z"/><path d="M5 17c-1.5 1-2 2-2 3"/><path d="M19 17c1.5 1 2 2 2 3"/>' },
  { id: 'tool-fill', category: 'tools', body: '<path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/><path d="M20 14s2 2.2 2 3.5a2 2 0 0 1-4 0c0-1.3 2-3.5 2-3.5Z"/>' },
  { id: 'tool-eyedropper', category: 'tools', body: '<path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/>' },
  { id: 'tool-selection-rect', category: 'tools', body: '<rect x="4" y="4" width="16" height="16" rx="1" stroke-dasharray="3 2"/>' },
  { id: 'tool-selection-ellipse', category: 'tools', body: '<ellipse cx="12" cy="12" rx="9" ry="7" stroke-dasharray="3 2"/>' },
  { id: 'tool-lasso', category: 'tools', body: '<path d="M7 22a5 5 0 0 1-2-4"/><path d="M7 16.93c.96.43 1.96.74 2.99.91"/><path d="M3.34 14A6.8 6.8 0 0 1 2 10c0-4.42 4.48-8 10-8s10 3.58 10 8a7.19 7.19 0 0 1-.33 2"/><path d="M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>' },
  { id: 'tool-selection-poly', category: 'tools', body: '<polygon points="4 6 14 3 20 11 15 20 5 17" stroke-dasharray="3 2"/>' },
  { id: 'tool-magic-wand', category: 'tools', body: '<path d="m15 4-1 2 2 1-2 1 1 2-2-1-1 2-1-2-2 1 1-2-2-1 2-1-1-2 2 1Z"/><path d="M3 21 14 10"/><path d="M18 14h3M19.5 12.5v3"/>' },
  { id: 'tool-transform', category: 'tools', body: '<rect x="6" y="6" width="12" height="12"/><rect x="3" y="3" width="4" height="4"/><rect x="17" y="3" width="4" height="4"/><rect x="3" y="17" width="4" height="4"/><rect x="17" y="17" width="4" height="4"/>' },
  { id: 'tool-shape-line', category: 'tools', body: '<line x1="4" y1="20" x2="20" y2="4"/><circle cx="4" cy="20" r="2"/><circle cx="20" cy="4" r="2"/>' },
  { id: 'tool-shape-rect', category: 'tools', body: '<rect x="3" y="5" width="18" height="14" rx="2"/>' },
  { id: 'tool-shape-ellipse', category: 'tools', body: '<ellipse cx="12" cy="12" rx="9" ry="7"/>' },
  { id: 'tool-shape-polygon', category: 'tools', body: '<polygon points="12 2 21 8.5 17.5 19.5 6.5 19.5 3 8.5"/>' },
  { id: 'tool-shape-curve', category: 'tools', body: '<path d="M3 19C3 10 9 5 12 12s9 2 9-7"/><circle cx="3" cy="19" r="2"/><circle cx="21" cy="5" r="2"/>' },
  { id: 'tool-gradient', category: 'tools', body: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 17 17 7M4 12h4M16 12h4"/>' },
  { id: 'tool-text', category: 'tools', body: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>' },
  { id: 'tool-vector-pen', category: 'tools', body: '<path d="M4 18C7 8 17 8 20 18"/><rect x="2" y="16" width="4" height="4"/><rect x="18" y="16" width="4" height="4"/><circle cx="12" cy="7" r="2"/><path d="M6 7h12"/>' },
  { id: 'tool-symmetry', category: 'tools', body: '<line x1="12" y1="3" x2="12" y2="21" stroke-dasharray="3 2"/><path d="m8 6-5 6 5 6V6Z"/><path d="m16 6 5 6-5 6V6Z"/>' },
  { id: 'tool-comic', category: 'tools', body: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>' },

  // ==================== LAYERS PANEL ====================
  { id: 'layer-new-raster', category: 'layers', body: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="M19 8v6M16 11h6"/>' },
  { id: 'layer-new-vector', category: 'layers', body: '<path d="M4 17C7 8 15 8 18 17"/><circle cx="11" cy="8" r="2"/><path d="M19 4v6M16 7h6"/>' },
  { id: 'layer-new-group', category: 'layers', body: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M12 10v6M9 13h6"/>' },
  { id: 'layer-ungroup', category: 'layers', body: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 13h6"/>' },
  { id: 'layer-new-mask', category: 'layers', body: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="4"/>' },
  { id: 'layer-delete', category: 'layers', body: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' },
  { id: 'layer-duplicate', category: 'layers', body: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>' },
  { id: 'layer-merge-down', category: 'layers', body: '<path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M4 19h16"/>' },
  { id: 'layer-merge-visible', category: 'layers', body: '<polygon points="12 4 3 8.5 12 13 21 8.5 12 4"/><path d="m3 14.5 9 4.5 9-4.5"/><path d="M12 13v7"/>' },
  { id: 'layer-lock', category: 'layers', body: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>' },
  { id: 'layer-unlock', category: 'layers', body: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.7"/>' },
  { id: 'layer-show', category: 'layers', body: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>' },
  { id: 'layer-hide', category: 'layers', body: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>' },
  { id: 'layer-clip', category: 'layers', body: '<path d="M18 15v-2a6 6 0 0 0-12 0v4"/><path d="m6 15-3 3 3 3"/><rect x="13" y="14" width="8" height="7" rx="1"/>' },
  { id: 'layer-alpha-lock', category: 'layers', body: '<rect x="3" y="3" width="8" height="8"/><rect x="11" y="11" width="6" height="6"/><circle cx="17" cy="7" r="3"/>' },
  { id: 'layer-up', category: 'layers', body: '<path d="m18 15-6-6-6 6"/>' },
  { id: 'layer-down', category: 'layers', body: '<path d="m6 9 6 6 6-6"/>' },

  // ==================== BRUSHES PANEL ====================
  { id: 'brush-new', category: 'brushes', body: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>' },
  { id: 'brush-dup', category: 'brushes', body: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>' },
  { id: 'brush-del', category: 'brushes', body: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>' },
  { id: 'brush-import', category: 'brushes', body: '<path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' },
  { id: 'brush-export', category: 'brushes', body: '<path d="M12 15V3"/><path d="m8 7 4-4 4 4"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' },
  { id: 'brush-search', category: 'brushes', body: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' },
  { id: 'brush-fav', category: 'brushes', body: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' },
  { id: 'brush-settings', category: 'brushes', body: '<path d="M21 4H14M10 4H3M21 12H12M8 12H3M21 20H16M12 20H3M14 2v4M8 10v4M16 18v4"/>' },
  { id: 'brush-reset', category: 'brushes', body: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>' },

  // ==================== COLORS PANEL ====================
  { id: 'color-swap', category: 'colors', body: '<path d="m17 3 4 4-4 4"/><path d="M3 7h18"/><path d="m7 21-4-4 4-4"/><path d="M21 17H3"/>' },
  { id: 'color-default', category: 'colors', body: '<rect x="3" y="3" width="11" height="11" rx="2"/><rect x="10" y="10" width="11" height="11" rx="2"/>' },
  { id: 'color-add', category: 'colors', body: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>' },
  { id: 'color-remove', category: 'colors', body: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>' },
  { id: 'color-save-pal', category: 'colors', body: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M9 17h6M12 14v6"/>' },
  { id: 'color-import-pal', category: 'colors', body: '<path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><rect x="3" y="17" width="18" height="4" rx="1"/>' },
  { id: 'color-export-pal', category: 'colors', body: '<path d="M12 15V3"/><path d="m8 7 4-4 4 4"/><rect x="3" y="17" width="18" height="4" rx="1"/>' },

  // ==================== ANIMATION TIMELINE ====================
  { id: 'anim-play', category: 'animation', body: '<polygon points="6 4 20 12 6 20 6 4"/>' },
  { id: 'anim-pause', category: 'animation', body: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>' },
  { id: 'anim-stop', category: 'animation', body: '<rect x="5" y="5" width="14" height="14" rx="2"/>' },
  { id: 'anim-loop', category: 'animation', body: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>' },
  { id: 'anim-prev-frame', category: 'animation', body: '<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>' },
  { id: 'anim-next-frame', category: 'animation', body: '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>' },
  { id: 'anim-first-frame', category: 'animation', body: '<line x1="4" y1="5" x2="4" y2="19"/><polygon points="13 19 5 12 13 5 13 19"/><polygon points="21 19 13 12 21 5 21 19"/>' },
  { id: 'anim-last-frame', category: 'animation', body: '<line x1="20" y1="5" x2="20" y2="19"/><polygon points="11 5 19 12 11 19 11 5"/><polygon points="3 5 11 12 3 19 3 5"/>' },
  { id: 'anim-add-frame', category: 'animation', body: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 8v8M8 12h8"/>' },
  { id: 'anim-del-frame', category: 'animation', body: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 12h8"/>' },
  { id: 'anim-dup-frame', category: 'animation', body: '<rect x="8" y="8" width="13" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>' },
  { id: 'anim-copy-frame', category: 'animation', body: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' },
  { id: 'anim-paste-frame', category: 'animation', body: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11v6M9 14h6"/>' },
  { id: 'anim-extend-exp', category: 'animation', body: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 12h8M14 9l3 3-3 3"/>' },
  { id: 'anim-shorten-exp', category: 'animation', body: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M16 12H8M10 9l-3 3 3 3"/>' },
  { id: 'anim-clear-frame', category: 'animation', body: '<path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>' },
  { id: 'anim-add-track', category: 'animation', body: '<path d="M3 6h18M3 12h11M3 18h11"/><path d="M18 11v8M14 15h8"/>' },
  { id: 'anim-del-track', category: 'animation', body: '<path d="M3 6h18M3 12h11M3 18h11"/><path d="M14 15h8"/>' },
  { id: 'anim-track-up', category: 'animation', body: '<path d="M3 18h11M3 12h8M3 6h11"/><path d="m17 15 0-9M14 9l3-3 3 3"/>' },
  { id: 'anim-track-down', category: 'animation', body: '<path d="M3 6h11M3 12h8M3 18h11"/><path d="m17 6 0 9M14 12l3 3 3-3"/>' },
  { id: 'anim-onion', category: 'animation', body: '<circle cx="9" cy="12" r="5" opacity="0.55"/><circle cx="15" cy="12" r="5"/>' },
  { id: 'anim-onion-prev', category: 'animation', body: '<circle cx="15" cy="12" r="4"/><path d="M7 8a5 5 0 0 0 0 8"/><path d="m6 9-3 3 3 3"/>' },
  { id: 'anim-onion-next', category: 'animation', body: '<circle cx="9" cy="12" r="4"/><path d="M17 8a5 5 0 0 1 0 8"/><path d="m18 9 3 3-3 3"/>' },
  { id: 'anim-audio-import', category: 'animation', body: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>' },
  { id: 'anim-audio-vis', category: 'animation', body: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>' },
  { id: 'anim-camera', category: 'animation', body: '<path d="M23 7l-7 5 7 5V7Z"/><rect x="1" y="5" width="15" height="14" rx="2"/>' },
  { id: 'anim-settings', category: 'animation', body: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.79 1 1.51 1H21a2 2 0 0 1 0 4h-.09c-.72 0-1.25.4-1.51 1Z"/>' },
  { id: 'anim-zoom-in', category: 'animation', body: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>' },
  { id: 'anim-zoom-out', category: 'animation', body: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6"/>' },

  // ==================== DIALOGS ====================
  { id: 'dlg-new-project', category: 'dialogs', body: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M12 18v-6M9 15h6"/>' },
  { id: 'dlg-open-project', category: 'dialogs', body: '<path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z"/>' },
  { id: 'dlg-save', category: 'dialogs', body: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>' },
  { id: 'dlg-export', category: 'dialogs', body: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>' },
  { id: 'dlg-import', category: 'dialogs', body: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' },
  { id: 'dlg-settings', category: 'dialogs', body: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>' },
  { id: 'dlg-about', category: 'dialogs', body: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>' },
  { id: 'dlg-recovery', category: 'dialogs', body: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>' },
  { id: 'dlg-confirm', category: 'dialogs', body: '<polyline points="20 6 9 17 4 12"/>' },
  { id: 'dlg-cancel', category: 'dialogs', body: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' },
  { id: 'dlg-apply', category: 'dialogs', body: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' },
  { id: 'dlg-reset', category: 'dialogs', body: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>' },
  { id: 'dlg-browse', category: 'dialogs', body: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><circle cx="14" cy="13" r="3"/><path d="m16.2 15.2 1.8 1.8"/>' },
  { id: 'dlg-delete', category: 'dialogs', body: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' },
  { id: 'dlg-warning', category: 'dialogs', body: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
  { id: 'dlg-error', category: 'dialogs', body: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' },
  { id: 'dlg-success', category: 'dialogs', body: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>' },
  { id: 'dlg-history-clear', category: 'dialogs', body: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6"/>' },
  { id: 'dlg-history-settings', category: 'dialogs', body: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>' },

  // ==================== STATUS & MISC ====================
  { id: 'st-ready', category: 'status', body: '<circle cx="12" cy="12" r="8"/><path d="m9 12 2 2 4-4"/>' },
  { id: 'st-offline', category: 'status', body: '<path d="M2 2l20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/>' },
  { id: 'st-desktop', category: 'status', body: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>' },
  { id: 'st-chevron-down', category: 'status', body: '<path d="m6 9 6 6 6-6"/>' },
  { id: 'st-chevron-right', category: 'status', body: '<path d="m9 18 6-6-6-6"/>' },
  { id: 'st-comic-speech', category: 'status', body: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>' },
  { id: 'st-comic-thought', category: 'status', body: '<ellipse cx="12" cy="10" rx="8" ry="6"/><circle cx="7" cy="18" r="1.5"/><circle cx="4" cy="21" r="1"/>' },
  { id: 'st-comic-caption', category: 'status', body: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M7 10h10M7 14h6"/>' },
];

export const ICON_REGISTRY: Record<string, IconEntry> = Object.fromEntries(
  ICONS_LIST.map((entry) => [entry.id, entry])
);

export function getAllIcons(): IconEntry[] {
  return ICONS_LIST;
}

export function buildSvgMarkup(iconId: string, size: IconSize = 18, extraClass = ''): string {
  const entry = ICON_REGISTRY[iconId] || ICON_REGISTRY['dlg-about'];
  const cls = `kas-svg kas-ico-${size}${extraClass ? ` ${extraClass}` : ''}`;
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${entry.body}</svg>`;
}

export function createIconElement(iconId: string, size: IconSize = 18, extraClass = ''): SVGSVGElement {
  const entry = ICON_REGISTRY[iconId] || ICON_REGISTRY['dlg-about'];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', `kas-svg kas-ico-${size}${extraClass ? ` ${extraClass}` : ''}`);
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.85');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = entry.body;
  return svg;
}

export function hydrateDomIcons(root: ParentNode = document): number {
  const slots = root.querySelectorAll<HTMLElement>('[data-icon]');
  let count = 0;
  slots.forEach((slot) => {
    const id = slot.dataset.icon;
    if (!id) return;
    const rawSize = Number(slot.dataset.iconSize || '18');
    const size: IconSize = rawSize === 28 || rawSize === 24 || rawSize === 18 || rawSize === 16 ? rawSize : 18;
    const svg = createIconElement(id, size, slot.dataset.iconClass || '');
    slot.replaceChildren(svg);
    count++;
  });
  return count;
}

export function buildStandaloneSvgFile(entry: IconEntry): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">${entry.body}</svg>\n`;
}
