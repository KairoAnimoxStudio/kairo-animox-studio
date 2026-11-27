import { hexToRgb, hsvToRgb, rgbToHex, rgbToHsv } from './color';
import type { BrushCategory, StabilizerMode } from './brushes';
import type { BlendMode, LayerType } from './layers';
import { FPS_PRESETS } from './animation';
import { DOCUMENT_PRESETS, type WorkspaceMode } from './project';
import { KairoArtStudioApp, type ToolId } from './studioApp';
import { PwaInstallController } from './pwaInstall';
import { createIconElement, hydrateDomIcons, type IconSize } from './iconRegistry';
import {
  ALL_TOOLS_BY_ID,
  LEFT_TOOL_SLOTS,
  TOP_MENU_BAR,
  type ToolSlotDef,
} from './uiDefinitions';
import type { ImageFilterId } from './filters';

const app = new KairoArtStudioApp();
const pwa = new PwaInstallController();

const slotActiveTool: Record<string, ToolId> = Object.fromEntries(
  LEFT_TOOL_SLOTS.map((slot) => [slot.slotId, slot.defaultTool])
);
let openMenuId: string | null = null;
let openFlyoutSlotId: string | null = null;
let pendingConfirmAction: (() => void) | null = null;

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing DOM element #${id}`);
  return el;
}

function setSlotIcon(slotEl: HTMLElement, iconId: string, size: IconSize = 18): void {
  slotEl.dataset.icon = iconId;
  slotEl.dataset.iconSize = String(size);
  slotEl.replaceChildren(createIconElement(iconId, size));
}

function applyTheme(theme: 'dark' | 'light'): void {
  document.documentElement.setAttribute('data-theme', theme);
}

function showToast(msg: string, kind: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const iconMap: Record<typeof kind, string> = {
    info: 'dlg-about',
    success: 'dlg-success',
    warn: 'dlg-warning',
    error: 'dlg-error',
  };
  const toast = document.createElement('div');
  toast.className = `kas-toast kas-toast-${kind}`;
  toast.appendChild(createIconElement(iconMap[kind], 18));
  const txt = document.createElement('span');
  txt.textContent = msg;
  toast.appendChild(txt);
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 220);
  }, 2800);
}

function openModal(id: string): void {
  closeAllPopups();
  $(id).hidden = false;
}

function closeModal(id: string): void {
  $(id).hidden = true;
}

function askConfirmation(
  title: string,
  message: string,
  onConfirm: () => void,
  okLabel = 'Delete'
): void {
  $('confirm-title').textContent = title;
  $('confirm-message').textContent = message;
  const okBtn = $('btn-confirm-ok');
  const labelSpan = okBtn.querySelector('span:last-child');
  if (labelSpan) labelSpan.textContent = okLabel;
  pendingConfirmAction = onConfirm;
  openModal('confirm-modal');
}

function closeAllPopups(): void {
  if (openMenuId !== null) {
    openMenuId = null;
    updateMenuDropdownStates();
  }
  const flyout = document.getElementById('tool-flyout');
  if (flyout && !flyout.hidden) {
    flyout.hidden = true;
    openFlyoutSlotId = null;
  }
}

function setDockTab(tab: 'tool-props' | 'nav-history'): void {
  document.querySelectorAll<HTMLButtonElement>('[data-dock-tab]').forEach((b) => {
    const isMatch = b.dataset.dockTab === tab;
    b.classList.toggle('active', isMatch);
    b.setAttribute('aria-selected', isMatch ? 'true' : 'false');
  });
  $('dock-pane-tool-props').hidden = tab !== 'tool-props';
  $('dock-pane-nav-history').hidden = tab !== 'nav-history';
}

// ==================== TOP 12-MENU BAR ====================
function isMenuCommandDisabled(cmdId: string): boolean {
  const doc = app.getActiveDoc();
  const frame = app.getCurrentFrame();
  if (cmdId === 'edit-undo') return !doc?.history.canUndo();
  if (cmdId === 'edit-redo') return !doc?.history.canRedo();
  if (cmdId === 'edit-paste') return !app.clipboardPixels;
  if (cmdId === 'file-close') return app.documents.length <= 1;
  if (cmdId === 'layer-delete') return !frame || frame.layers.length <= 1;
  if (cmdId === 'anim-del') return !doc || doc.frames.length <= 1;
  return false;
}

function updateMenuDropdownStates(): void {
  document.querySelectorAll<HTMLElement>('.kas-menu-wrap').forEach((wrap) => {
    const menuId = wrap.dataset.menuId || '';
    const isOpen = openMenuId === menuId;
    const trigger = wrap.querySelector('.kas-menu-trigger');
    const dropdown = wrap.querySelector<HTMLElement>('.kas-menu-dropdown');
    if (trigger) {
      trigger.classList.toggle('open', isOpen);
      trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
    if (dropdown) {
      dropdown.hidden = !isOpen;
      if (isOpen) {
        dropdown.querySelectorAll<HTMLButtonElement>('.kas-menu-cmd').forEach((cmdBtn) => {
          const id = cmdBtn.dataset.menuCmd || '';
          cmdBtn.disabled = isMenuCommandDisabled(id);
        });
      }
    }
  });
}

function executeMenuCommand(cmdId: string): void {
  closeAllPopups();
  const doc = app.getActiveDoc();
  switch (cmdId) {
    // FILE
    case 'file-new':
      openModal('new-doc-modal');
      break;
    case 'file-open':
      ($('input-open-kas') as HTMLInputElement).click();
      break;
    case 'file-open-recent':
      populateWelcomeRecent();
      openModal('welcome-modal');
      break;
    case 'file-save':
    case 'file-save-as':
      app.saveKasProject();
      break;
    case 'file-save-all':
      app.saveAllProjects();
      break;
    case 'file-import':
      ($('input-import-img') as HTMLInputElement).click();
      break;
    case 'file-export':
      openModal('export-modal');
      break;
    case 'file-print':
      window.print();
      break;
    case 'file-close':
      app.closeDocument(app.activeDocIndex);
      break;
    case 'file-exit':
      window.location.href = 'kaiapps.html';
      break;

    // EDIT
    case 'edit-undo':
      app.undo();
      break;
    case 'edit-redo':
      app.redo();
      break;
    case 'edit-cut':
      app.cutSelectionOrLayer();
      break;
    case 'edit-copy':
      app.copySelectionOrLayer();
      break;
    case 'edit-paste':
      app.pasteClipboard();
      break;
    case 'edit-delete':
      app.clearActiveLayer();
      break;
    case 'edit-select-all':
    case 'sel-all':
      app.selectAll();
      break;
    case 'edit-deselect':
    case 'sel-none':
      app.deselectAll();
      break;
    case 'edit-prefs':
    case 'help-shortcuts':
      openSettingsModal();
      break;

    // VIEW
    case 'view-zoom-in':
      if (doc) app.setZoom(doc.zoom * 1.25);
      break;
    case 'view-zoom-out':
      if (doc) app.setZoom(doc.zoom * 0.8);
      break;
    case 'view-fit':
      app.fitCanvasToViewport();
      break;
    case 'view-actual':
      app.setZoom(1);
      break;
    case 'view-fullscreen':
      toggleFullscreen();
      break;
    case 'view-grid':
      app.settings.showGrid = !app.settings.showGrid;
      app.renderOverlay();
      syncAllUi();
      break;
    case 'view-rulers':
      app.settings.showRulers = !app.settings.showRulers;
      renderRulers();
      syncAllUi();
      break;
    case 'view-guides':
      app.settings.showGuides = !app.settings.showGuides;
      app.renderOverlay();
      syncAllUi();
      break;
    case 'view-theme':
      app.saveSettings({
        ...app.settings,
        theme: app.settings.theme === 'dark' ? 'light' : 'dark',
      });
      applyTheme(app.settings.theme);
      break;

    // CANVAS
    case 'canvas-rot-left':
      app.rotateCanvas(-15);
      break;
    case 'canvas-rot-right':
      app.rotateCanvas(15);
      break;
    case 'canvas-reset-rot':
      if (doc) {
        doc.rotationDeg = 0;
        app.applyCanvasTransform();
        syncAllUi();
      }
      break;
    case 'canvas-flip-h':
      app.toggleFlip('h');
      break;
    case 'canvas-flip-v':
      app.toggleFlip('v');
      break;
    case 'canvas-reset-view':
      app.resetCanvasTransform();
      break;

    // LAYER
    case 'layer-new-raster':
      app.addTypedLayer('raster');
      break;
    case 'layer-new-vector':
      app.addTypedLayer('vector');
      break;
    case 'layer-new-mask':
      app.addTypedLayer('mask');
      break;
    case 'layer-duplicate':
      app.duplicateActiveLayer();
      break;
    case 'layer-merge-down':
      app.mergeActiveLayerDown();
      break;
    case 'layer-merge-visible':
      app.mergeVisibleLayers();
      break;
    case 'layer-group':
      app.groupActiveLayer();
      break;
    case 'layer-ungroup':
      app.ungroupActiveLayer();
      break;
    case 'layer-lock': {
      const l = app.getActiveLayer();
      if (l) app.updateLayerMeta(l.meta.id, { locked: !l.meta.locked });
      break;
    }
    case 'layer-vis': {
      const l = app.getActiveLayer();
      if (l) app.updateLayerMeta(l.meta.id, { visible: !l.meta.visible });
      break;
    }
    case 'layer-delete':
      confirmDeleteActiveLayer();
      break;

    // SELECT
    case 'sel-rect':
      selectStudioTool('selection');
      break;
    case 'sel-ellipse':
      selectStudioTool('ellipse-selection');
      break;
    case 'sel-lasso':
      selectStudioTool('lasso');
      break;
    case 'sel-wand':
      selectStudioTool('magic-wand');
      break;

    // FILTER
    case 'filter-grayscale':
    case 'filter-invert':
    case 'filter-sepia':
    case 'filter-brighten':
    case 'filter-darken':
    case 'filter-contrast':
      app.applyFilterToActiveLayer(cmdId.replace('filter-', '') as ImageFilterId);
      break;

    // ANIMATION
    case 'anim-play':
      app.togglePlayback();
      break;
    case 'anim-stop':
      app.stopPlayback();
      break;
    case 'anim-first':
      app.switchFrame(0);
      break;
    case 'anim-prev':
      if (doc) app.switchFrame(doc.currentFrameIndex - 1);
      break;
    case 'anim-next':
      if (doc) app.switchFrame(doc.currentFrameIndex + 1);
      break;
    case 'anim-last':
      if (doc) app.switchFrame(doc.frames.length - 1);
      break;
    case 'anim-add':
      app.addFrame(false);
      break;
    case 'anim-dup':
      app.addFrame(true);
      break;
    case 'anim-del':
      confirmDeleteCurrentFrame();
      break;
    case 'anim-onion':
      if (doc) {
        doc.onionSkin.enabled = !doc.onionSkin.enabled;
        app.renderAll();
        syncAllUi();
      }
      break;

    // COMIC
    case 'comic-2':
      app.applyComicTemplate('2-panel');
      break;
    case 'comic-3':
      app.applyComicTemplate('3-panel');
      break;
    case 'comic-4':
      app.applyComicTemplate('4-grid');
      break;
    case 'comic-speech':
      app.addSpeechBubble('speech');
      break;
    case 'comic-thought':
      app.addSpeechBubble('thought');
      break;
    case 'comic-caption':
      app.addSpeechBubble('caption');
      break;

    // WINDOW
    case 'win-ill':
      app.setWorkspace('illustration');
      break;
    case 'win-anim':
      app.setWorkspace('animation');
      break;
    case 'win-comic':
      app.setWorkspace('comic');
      break;
    case 'win-min':
      app.setWorkspace('minimal');
      break;
    case 'win-timeline':
      toggleTimelinePinned();
      break;
    case 'win-windows-app':
      openModal('install-app-modal');
      break;

    // TOOLS
    case 'tool-brush':
      selectStudioTool('brush');
      break;
    case 'tool-pencil':
      selectStudioTool('pencil');
      break;
    case 'tool-pen':
      selectStudioTool('pen');
      break;
    case 'tool-eraser':
      selectStudioTool('eraser');
      break;
    case 'tool-fill':
      selectStudioTool('fill');
      break;
    case 'tool-magic-wand':
      selectStudioTool('magic-wand');
      break;
    case 'tool-symmetry':
      selectStudioTool('symmetry');
      break;
    case 'tool-brush-settings':
      openBrushSettingsModal();
      break;

    // HELP
    case 'help-welcome':
      populateWelcomeRecent();
      openModal('welcome-modal');
      break;
    case 'help-recovery': {
      const rec = app.getRecoverableAutosave();
      if (rec) {
        populateWelcomeRecent();
        openModal('welcome-modal');
      } else {
        showToast('No pending autosave recovery found — workspace is clean', 'info');
      }
      break;
    }
    case 'help-about':
      openModal('about-modal');
      break;
  }
}

function renderMenuBar(): void {
  const nav = $('kas-menubar');
  nav.innerHTML = '';
  TOP_MENU_BAR.forEach((menu) => {
    const wrap = document.createElement('div');
    wrap.className = 'kas-menu-wrap';
    wrap.dataset.menuId = menu.id;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'kas-menu-trigger';
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.title = `${menu.label} Menu`;
    trigger.appendChild(createIconElement(menu.icon, 18));
    const lbl = document.createElement('span');
    lbl.textContent = menu.label;
    trigger.appendChild(lbl);

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      openFlyoutSlotId = null;
      const flyout = document.getElementById('tool-flyout');
      if (flyout) flyout.hidden = true;
      openMenuId = openMenuId === menu.id ? null : menu.id;
      updateMenuDropdownStates();
    });

    trigger.addEventListener('mouseenter', () => {
      if (openMenuId !== null && openMenuId !== menu.id) {
        openMenuId = menu.id;
        updateMenuDropdownStates();
      }
    });

    const dropdown = document.createElement('div');
    dropdown.className = 'kas-menu-dropdown';
    dropdown.hidden = true;
    dropdown.setAttribute('role', 'menu');

    menu.items.forEach((item) => {
      if (item.separatorBefore) {
        const sep = document.createElement('div');
        sep.className = 'kas-menu-sep';
        dropdown.appendChild(sep);
      }
      const cmdBtn = document.createElement('button');
      cmdBtn.type = 'button';
      cmdBtn.className = `kas-menu-cmd${item.danger ? ' danger' : ''}`;
      cmdBtn.dataset.menuCmd = item.id;
      cmdBtn.setAttribute('role', 'menuitem');

      const left = document.createElement('span');
      left.className = 'kas-menu-cmd-left';
      left.appendChild(createIconElement(item.icon, 18));
      const labelSpan = document.createElement('span');
      labelSpan.textContent = item.label;
      left.appendChild(labelSpan);
      cmdBtn.appendChild(left);

      if (item.shortcut) {
        const sc = document.createElement('span');
        sc.className = 'kas-menu-shortcut';
        sc.textContent = item.shortcut;
        cmdBtn.appendChild(sc);
      }

      cmdBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        executeMenuCommand(item.id);
      });

      dropdown.appendChild(cmdBtn);
    });

    wrap.appendChild(trigger);
    wrap.appendChild(dropdown);
    nav.appendChild(wrap);
  });
}

// ==================== LEFT 27-TOOL RAIL & FLYOUTS ====================
function selectStudioTool(toolId: ToolId): void {
  const ownerSlot = LEFT_TOOL_SLOTS.find((s) => s.items.some((i) => i.id === toolId));
  if (ownerSlot) {
    slotActiveTool[ownerSlot.slotId] = toolId;
  }
  app.selectTool(toolId);
  if (
    [
      'fill',
      'selection',
      'ellipse-selection',
      'lasso',
      'polygon-selection',
      'magic-wand',
      'shape',
      'ellipse-shape',
      'line-shape',
      'polygon-shape',
      'curve-shape',
      'gradient',
      'text',
      'comic',
      'symmetry',
    ].includes(toolId)
  ) {
    setDockTab('tool-props');
  }
}

function openToolFlyout(slot: ToolSlotDef, anchorBtn: HTMLElement): void {
  const flyout = $('tool-flyout');
  if (openFlyoutSlotId === slot.slotId && !flyout.hidden) {
    flyout.hidden = true;
    openFlyoutSlotId = null;
    return;
  }
  openMenuId = null;
  updateMenuDropdownStates();

  flyout.innerHTML = '';
  slot.items.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `flyout-item${app.activeTool === item.id ? ' active' : ''}`;
    btn.title = item.tooltip;
    btn.setAttribute('role', 'menuitem');

    const left = document.createElement('span');
    left.className = 'flyout-item-left';
    left.appendChild(createIconElement(item.icon, 24));
    const lbl = document.createElement('span');
    lbl.textContent = item.label;
    left.appendChild(lbl);
    btn.appendChild(left);

    if (item.shortcut) {
      const sc = document.createElement('span');
      sc.className = 'kas-menu-shortcut';
      sc.textContent = item.shortcut;
      btn.appendChild(sc);
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      flyout.hidden = true;
      openFlyoutSlotId = null;
      selectStudioTool(item.id);
    });
    flyout.appendChild(btn);
  });

  const rect = anchorBtn.getBoundingClientRect();
  const parentRect = $('left-tools').getBoundingClientRect();
  const topOffset = Math.max(4, Math.min(rect.top - parentRect.top, parentRect.height - 190));
  flyout.style.top = `${topOffset}px`;
  flyout.hidden = false;
  openFlyoutSlotId = slot.slotId;
}

function renderLeftTools(): void {
  const rail = $('left-tools');
  rail.innerHTML = '';

  const separatorAfterSlots = new Set(['slot-transform', 'slot-eyedropper', 'slot-symmetry']);

  LEFT_TOOL_SLOTS.forEach((slot) => {
    const activeInSlot = slot.items.find((i) => i.id === app.activeTool);
    if (activeInSlot) {
      slotActiveTool[slot.slotId] = activeInSlot.id;
    }
    const currentId = slotActiveTool[slot.slotId] || slot.defaultTool;
    const def = ALL_TOOLS_BY_ID[currentId];
    const isSlotActive = slot.items.some((i) => i.id === app.activeTool);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `tool-btn${isSlotActive ? ' active' : ''}`;
    btn.dataset.tool = def.id;
    btn.dataset.slotId = slot.slotId;
    btn.title = slot.items.length > 1
      ? `${def.tooltip} — Click again or right-click for ${slot.items.length} tools`
      : def.tooltip;
    btn.setAttribute('aria-label', def.label);
    btn.setAttribute('aria-pressed', isSlotActive ? 'true' : 'false');

    btn.appendChild(createIconElement(def.icon, 24));
    const span = document.createElement('span');
    span.textContent = def.shortLabel;
    btn.appendChild(span);

    if (slot.items.length > 1) {
      const pip = document.createElement('span');
      pip.className = 'tool-flyout-pip';
      pip.title = 'Show related tools';
      btn.appendChild(pip);
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (slot.items.length > 1 && isSlotActive) {
        openToolFlyout(slot, btn);
        return;
      }
      const flyout = document.getElementById('tool-flyout');
      if (flyout) flyout.hidden = true;
      openFlyoutSlotId = null;
      selectStudioTool(currentId);
    });

    if (slot.items.length > 1) {
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openToolFlyout(slot, btn);
      });
    }

    rail.appendChild(btn);

    if (separatorAfterSlots.has(slot.slotId)) {
      const sep = document.createElement('div');
      sep.className = 'tool-sep';
      rail.appendChild(sep);
    }
  });
}

// ==================== RULERS & VIEWPORT ====================
function renderRulers(): void {
  const top = $('canvas-ruler-top');
  const left = $('canvas-ruler-left');
  const doc = app.getActiveDoc();
  const visible = app.settings.showRulers;
  top.hidden = !visible;
  left.hidden = !visible;
  $('btn-toggle-rulers').classList.toggle('active', visible);
  if (!visible || !doc) return;

  if (top.dataset.docW !== String(doc.width)) {
    top.dataset.docW = String(doc.width);
    top.innerHTML = '';
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const t = document.createElement('div');
      t.className = 'ruler-tick';
      t.textContent = String(Math.round((doc.width / steps) * i));
      top.appendChild(t);
    }
  }
  if (left.dataset.docH !== String(doc.height)) {
    left.dataset.docH = String(doc.height);
    left.innerHTML = '';
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const t = document.createElement('div');
      t.className = 'ruler-tick-v';
      t.textContent = String(Math.round((doc.height / steps) * i));
      left.appendChild(t);
    }
  }
}

function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

function toggleTimelinePinned(): void {
  const panel = $('timeline-panel');
  panel.dataset.pinned = panel.hidden ? 'true' : 'false';
  panel.hidden = !panel.hidden;
  $('btn-toggle-timeline').classList.toggle('active', !panel.hidden);
}

// ==================== RENDER SECTIONS ====================
function renderDocumentTabs(): void {
  const bar = $('doc-tabs');
  bar.innerHTML = '';
  app.documents.forEach((doc, idx) => {
    const tab = document.createElement('div');
    tab.className = `doc-tab ${idx === app.activeDocIndex ? 'active' : ''}`;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'doc-tab-btn';
    btn.textContent = `${doc.name}${doc.dirty ? ' *' : ''}`;
    btn.title = `Switch to ${doc.name}`;
    btn.addEventListener('click', () => app.switchDocument(idx));
    tab.appendChild(btn);

    if (app.documents.length > 1) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'doc-tab-close';
      closeBtn.title = `Close ${doc.name}`;
      closeBtn.setAttribute('aria-label', `Close ${doc.name}`);
      closeBtn.appendChild(createIconElement('menu-close', 16));
      closeBtn.addEventListener('click', () => app.closeDocument(idx));
      tab.appendChild(closeBtn);
    }
    bar.appendChild(tab);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'doc-tab-add';
  addBtn.title = 'Create New Document (Ctrl+N)';
  addBtn.setAttribute('aria-label', 'Create New Document');
  addBtn.appendChild(createIconElement('tb-new', 16));
  const addTxt = document.createElement('span');
  addTxt.textContent = 'New';
  addBtn.appendChild(addTxt);
  addBtn.addEventListener('click', () => openModal('new-doc-modal'));
  bar.appendChild(addBtn);
}

function renderWorkspaceUI(): void {
  const root = $('kas-root');
  root.setAttribute('data-workspace', app.workspace);
  document.querySelectorAll<HTMLButtonElement>('[data-workspace-btn]').forEach((btn) => {
    const ws = btn.dataset.workspaceBtn as WorkspaceMode;
    btn.classList.toggle('active', ws === app.workspace);
    btn.setAttribute('aria-pressed', ws === app.workspace ? 'true' : 'false');
  });

  const timelinePanel = $('timeline-panel');
  const showTimeline = app.workspace === 'animation' || timelinePanel.dataset.pinned === 'true';
  timelinePanel.hidden = !showTimeline;
  $('btn-toggle-timeline').classList.toggle('active', showTimeline);

  $('btn-toggle-grid').classList.toggle('active', app.settings.showGrid);
  $('btn-toggle-rulers').classList.toggle('active', app.settings.showRulers);
  $('btn-toggle-guides').classList.toggle('active', app.settings.showGuides);
  $('btn-toggle-symmetry').classList.toggle('active', app.settings.showSymmetry);

  const rightDock = $('right-dock');
  const leftTools = $('left-tools');
  const minimal = app.workspace === 'minimal';
  rightDock.classList.toggle('minimal-collapsed', minimal);
  leftTools.classList.toggle('minimal-compact', minimal);

  renderRulers();
}

function renderColorPanel(): void {
  const fgBtn = $('fg-swatch');
  const bgBtn = $('bg-swatch');
  fgBtn.style.backgroundColor = app.fgColor;
  bgBtn.style.backgroundColor = app.bgColor;

  const hexInput = $('hex-input') as HTMLInputElement;
  if (document.activeElement !== hexInput) {
    hexInput.value = app.fgColor;
  }

  const rgb = hexToRgb(app.fgColor) || { r: 59, g: 130, b: 246 };
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  ($('slider-h') as HTMLInputElement).value = String(hsv.h);
  ($('slider-s') as HTMLInputElement).value = String(hsv.s);
  ($('slider-v') as HTMLInputElement).value = String(hsv.v);
  $('val-h').textContent = `${hsv.h}°`;
  $('val-s').textContent = `${hsv.s}%`;
  $('val-v').textContent = `${hsv.v}%`;

  const palSelect = $('palette-select') as HTMLSelectElement;
  palSelect.innerHTML = '';
  app.palettes.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    palSelect.appendChild(opt);
  });
  palSelect.value = app.activePaletteId;

  const palGrid = $('palette-swatches');
  palGrid.innerHTML = '';
  const pal = app.palettes.find((p) => p.id === app.activePaletteId) || app.palettes[0];
  pal.colors.forEach((c) => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = `color-chip ${c.toUpperCase() === app.fgColor.toUpperCase() ? 'active' : ''}`;
    sw.style.backgroundColor = c;
    sw.title = `Select ${c}`;
    sw.setAttribute('aria-label', `Select color ${c}`);
    sw.addEventListener('click', () => app.setForegroundColor(c));
    palGrid.appendChild(sw);
  });

  const recentRow = $('recent-swatches');
  recentRow.innerHTML = '';
  app.recentColors.forEach((c) => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'color-chip small';
    sw.style.backgroundColor = c;
    sw.title = `Recent color ${c}`;
    sw.setAttribute('aria-label', `Recent color ${c}`);
    sw.addEventListener('click', () => app.setForegroundColor(c));
    recentRow.appendChild(sw);
  });
}

function renderBrushPanel(): void {
  const list = $('brush-list');
  list.innerHTML = '';

  const q = app.brushSearch.trim().toLowerCase();
  const filtered = app.brushes.filter((b) => {
    const catMatch = app.brushCategory === 'All' || b.category === app.brushCategory;
    const favMatch = !app.brushFavoritesOnly || b.favorite;
    const qMatch = !q || b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q);
    return catMatch && favMatch && qMatch;
  });

  filtered.forEach((b) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `brush-item ${b.id === app.activeBrushId ? 'active' : ''}`;
    btn.title = `${b.name} (${b.category}, ${b.size}px)`;

    const topRow = document.createElement('div');
    topRow.className = 'brush-item-top';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'brush-item-name';
    nameSpan.textContent = b.name;

    const favIcon = createIconElement('brush-fav', 16);
    favIcon.style.color = b.favorite ? 'var(--kas-orange)' : 'var(--kas-disabled)';
    favIcon.style.cursor = 'pointer';
    favIcon.style.pointerEvents = 'auto';
    favIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      app.toggleBrushFavorite(b.id);
    });

    topRow.appendChild(nameSpan);
    topRow.appendChild(favIcon);

    const metaSpan = document.createElement('span');
    metaSpan.className = 'brush-item-meta';
    metaSpan.textContent = `${b.category} · ${b.size}px`;

    btn.appendChild(topRow);
    btn.appendChild(metaSpan);
    btn.addEventListener('click', () => app.selectBrush(b.id));
    list.appendChild(btn);
  });

  const active = app.getActiveBrush();
  ($('brush-size') as HTMLInputElement).value = String(active.size);
  $('brush-size-val').textContent = `${active.size} px`;
  ($('brush-opacity') as HTMLInputElement).value = String(Math.round(active.opacity * 100));
  $('brush-opacity-val').textContent = `${Math.round(active.opacity * 100)}%`;
  ($('brush-hardness') as HTMLInputElement).value = String(Math.round(active.hardness * 100));
  $('brush-hardness-val').textContent = `${Math.round(active.hardness * 100)}%`;
  ($('brush-stab-mode') as HTMLSelectElement).value = active.stabilizerMode;
  ($('brush-stab') as HTMLInputElement).value = String(active.stabilization);
  $('brush-stab-val').textContent = `${active.stabilization}%`;

  ($('btn-fav-filter') as HTMLButtonElement).classList.toggle('active', app.brushFavoritesOnly);
  ($('btn-del-brush') as HTMLButtonElement).disabled = !active.isCustom;

  document.querySelectorAll<HTMLButtonElement>('[data-brush-cat]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.brushCat === app.brushCategory);
  });
}

function renderToolProperties(): void {
  const box = $('tool-props-body');
  box.innerHTML = '';

  const tool = app.activeTool;
  if (tool === 'fill' || tool === 'magic-wand') {
    box.innerHTML = `
      <div class="prop-row">
        <label for="prop-fill-tol">Color Tolerance <span id="prop-fill-tol-v">${app.fillTolerance}</span></label>
        <input id="prop-fill-tol" type="range" min="0" max="120" value="${app.fillTolerance}">
      </div>
      <div class="prop-row row-inline">
        <label for="prop-fill-all">Reference all visible layers</label>
        <input id="prop-fill-all" type="checkbox" ${app.fillAllLayers ? 'checked' : ''}>
      </div>
    `;
    ($('prop-fill-tol') as HTMLInputElement).addEventListener('input', (e) => {
      app.fillTolerance = Number((e.target as HTMLInputElement).value);
      $('prop-fill-tol-v').textContent = String(app.fillTolerance);
    });
    ($('prop-fill-all') as HTMLInputElement).addEventListener('change', (e) => {
      app.fillAllLayers = (e.target as HTMLInputElement).checked;
    });
  } else if (
    tool === 'selection' ||
    tool === 'ellipse-selection' ||
    tool === 'lasso' ||
    tool === 'polygon-selection'
  ) {
    box.innerHTML = `
      <div class="prop-row">
        <label for="prop-sel-shape">Selection Mode</label>
        <select id="prop-sel-shape">
          <option value="rect" ${app.selectionShape === 'rect' ? 'selected' : ''}>Rectangle Marquee</option>
          <option value="ellipse" ${app.selectionShape === 'ellipse' ? 'selected' : ''}>Elliptical Marquee</option>
        </select>
      </div>
      <div class="prop-actions">
        <button type="button" class="kas-btn sm" id="btn-sel-all">
          <span class="icon-slot" data-icon="menu-select-all" data-icon-size="16"></span>
          <span>Select All</span>
        </button>
        <button type="button" class="kas-btn sm" id="btn-sel-none">
          <span class="icon-slot" data-icon="menu-deselect" data-icon-size="16"></span>
          <span>Deselect</span>
        </button>
        <button type="button" class="kas-btn sm danger" id="btn-sel-clear">
          <span class="icon-slot" data-icon="dlg-delete" data-icon-size="16"></span>
          <span>Clear</span>
        </button>
      </div>
    `;
    hydrateDomIcons(box);
    ($('prop-sel-shape') as HTMLSelectElement).addEventListener('change', (e) => {
      app.selectionShape = (e.target as HTMLSelectElement).value as 'rect' | 'ellipse';
    });
    $('btn-sel-all').addEventListener('click', () => app.selectAll());
    $('btn-sel-none').addEventListener('click', () => app.deselectAll());
    $('btn-sel-clear').addEventListener('click', () => app.clearActiveLayer());
  } else if (
    tool === 'shape' ||
    tool === 'line-shape' ||
    tool === 'ellipse-shape' ||
    tool === 'polygon-shape' ||
    tool === 'curve-shape'
  ) {
    box.innerHTML = `
      <div class="prop-row">
        <label for="prop-shape-type">Shape Geometry</label>
        <select id="prop-shape-type">
          <option value="rect" ${app.shapeType === 'rect' ? 'selected' : ''}>Rectangle</option>
          <option value="ellipse" ${app.shapeType === 'ellipse' ? 'selected' : ''}>Ellipse</option>
          <option value="line" ${app.shapeType === 'line' ? 'selected' : ''}>Line</option>
          <option value="polygon" ${app.shapeType === 'polygon' ? 'selected' : ''}>Polygon</option>
          <option value="curve" ${app.shapeType === 'curve' ? 'selected' : ''}>Curve</option>
          <option value="triangle" ${app.shapeType === 'triangle' ? 'selected' : ''}>Triangle</option>
        </select>
      </div>
      <div class="prop-row">
        <label for="prop-shape-stroke">Stroke Width <span id="prop-shape-stroke-v">${app.shapeStrokeWidth}px</span></label>
        <input id="prop-shape-stroke" type="range" min="1" max="36" value="${app.shapeStrokeWidth}">
      </div>
      <div class="prop-row row-inline">
        <label for="prop-shape-fill">Fill with Background Color</label>
        <input id="prop-shape-fill" type="checkbox" ${app.shapeFill ? 'checked' : ''}>
      </div>
    `;
    ($('prop-shape-type') as HTMLSelectElement).addEventListener('change', (e) => {
      app.shapeType = (e.target as HTMLSelectElement).value as
        | 'line'
        | 'rect'
        | 'ellipse'
        | 'triangle'
        | 'polygon'
        | 'curve';
    });
    ($('prop-shape-stroke') as HTMLInputElement).addEventListener('input', (e) => {
      app.shapeStrokeWidth = Number((e.target as HTMLInputElement).value);
      $('prop-shape-stroke-v').textContent = `${app.shapeStrokeWidth}px`;
    });
    ($('prop-shape-fill') as HTMLInputElement).addEventListener('change', (e) => {
      app.shapeFill = (e.target as HTMLInputElement).checked;
    });
  } else if (tool === 'gradient') {
    box.innerHTML = `
      <div class="prop-row">
        <label for="prop-grad-type">Gradient Type</label>
        <select id="prop-grad-type">
          <option value="linear" ${app.gradientType === 'linear' ? 'selected' : ''}>Linear Gradient</option>
          <option value="radial" ${app.gradientType === 'radial' ? 'selected' : ''}>Radial Gradient</option>
        </select>
      </div>
      <div class="prop-row">
        <label for="prop-grad-mode">Color Stops</label>
        <select id="prop-grad-mode">
          <option value="fg-transparent" ${app.gradientMode === 'fg-transparent' ? 'selected' : ''}>Foreground to Transparent</option>
          <option value="fg-bg" ${app.gradientMode === 'fg-bg' ? 'selected' : ''}>Foreground to Background</option>
        </select>
      </div>
    `;
    ($('prop-grad-type') as HTMLSelectElement).addEventListener('change', (e) => {
      app.gradientType = (e.target as HTMLSelectElement).value as 'linear' | 'radial';
    });
    ($('prop-grad-mode') as HTMLSelectElement).addEventListener('change', (e) => {
      app.gradientMode = (e.target as HTMLSelectElement).value as 'fg-bg' | 'fg-transparent';
    });
  } else if (tool === 'text') {
    box.innerHTML = `
      <div class="prop-row">
        <label for="prop-text-val">Text Content (click canvas to place)</label>
        <input id="prop-text-val" type="text" value="${app.textDraft.replace(/"/g, '&quot;')}">
      </div>
      <div class="prop-row">
        <label for="prop-text-size">Font Size <span id="prop-text-size-v">${app.textSize}px</span></label>
        <input id="prop-text-size" type="range" min="12" max="140" value="${app.textSize}">
      </div>
      <div class="prop-actions">
        <button type="button" class="kas-btn sm ${app.textBold ? 'primary' : ''}" id="btn-text-bold">
          <span class="icon-slot" data-icon="tool-text" data-icon-size="16"></span>
          <span>Bold</span>
        </button>
        <button type="button" class="kas-btn sm ${app.textItalic ? 'primary' : ''}" id="btn-text-italic">
          <span class="icon-slot" data-icon="menu-edit" data-icon-size="16"></span>
          <span>Italic</span>
        </button>
      </div>
    `;
    hydrateDomIcons(box);
    ($('prop-text-val') as HTMLInputElement).addEventListener('input', (e) => {
      app.textDraft = (e.target as HTMLInputElement).value;
    });
    ($('prop-text-size') as HTMLInputElement).addEventListener('input', (e) => {
      app.textSize = Number((e.target as HTMLInputElement).value);
      $('prop-text-size-v').textContent = `${app.textSize}px`;
    });
    $('btn-text-bold').addEventListener('click', () => {
      app.textBold = !app.textBold;
      renderToolProperties();
    });
    $('btn-text-italic').addEventListener('click', () => {
      app.textItalic = !app.textItalic;
      renderToolProperties();
    });
  } else if (tool === 'comic' || app.workspace === 'comic') {
    const doc = app.getActiveDoc();
    const selBubble = doc?.speechBubbles.find((b) => b.id === app.selectedBubbleId);
    box.innerHTML = `
      <div class="prop-label">Manga Page Templates</div>
      <div class="prop-actions">
        <button type="button" class="kas-btn sm" id="comic-tpl-2"><span class="icon-slot" data-icon="menu-comic" data-icon-size="16"></span><span>2-Panel</span></button>
        <button type="button" class="kas-btn sm" id="comic-tpl-3"><span class="icon-slot" data-icon="menu-comic" data-icon-size="16"></span><span>3-Panel</span></button>
        <button type="button" class="kas-btn sm" id="comic-tpl-4"><span class="icon-slot" data-icon="tb-grid" data-icon-size="16"></span><span>4-Grid</span></button>
        <button type="button" class="kas-btn sm" id="comic-tpl-web"><span class="icon-slot" data-icon="menu-canvas" data-icon-size="16"></span><span>Webtoon</span></button>
      </div>
      <div class="prop-label">Add Dialogue Objects</div>
      <div class="prop-actions">
        <button type="button" class="kas-btn sm primary" id="comic-add-speech"><span class="icon-slot" data-icon="st-comic-speech" data-icon-size="16"></span><span>Speech</span></button>
        <button type="button" class="kas-btn sm" id="comic-add-thought"><span class="icon-slot" data-icon="st-comic-thought" data-icon-size="16"></span><span>Thought</span></button>
        <button type="button" class="kas-btn sm" id="comic-add-caption"><span class="icon-slot" data-icon="st-comic-caption" data-icon-size="16"></span><span>Caption</span></button>
      </div>
      ${
        selBubble
          ? `<div class="prop-row">
              <label for="bubble-text-edit">Selected Bubble Text</label>
              <input id="bubble-text-edit" type="text" value="${selBubble.text.replace(/"/g, '&quot;')}">
            </div>
            <div class="prop-row">
              <label for="bubble-tail-angle">Tail Direction (${selBubble.tailAngleDeg}°)</label>
              <input id="bubble-tail-angle" type="range" min="0" max="360" value="${selBubble.tailAngleDeg}">
            </div>`
          : '<p class="muted-note">Click a speech bubble on canvas to drag or edit dialogue.</p>'
      }
    `;
    hydrateDomIcons(box);
    $('comic-tpl-2').addEventListener('click', () => app.applyComicTemplate('2-panel'));
    $('comic-tpl-3').addEventListener('click', () => app.applyComicTemplate('3-panel'));
    $('comic-tpl-4').addEventListener('click', () => app.applyComicTemplate('4-grid'));
    $('comic-tpl-web').addEventListener('click', () => app.applyComicTemplate('webtoon'));
    $('comic-add-speech').addEventListener('click', () => app.addSpeechBubble('speech'));
    $('comic-add-thought').addEventListener('click', () => app.addSpeechBubble('thought'));
    $('comic-add-caption').addEventListener('click', () => app.addSpeechBubble('caption'));
    const bInput = document.getElementById('bubble-text-edit') as HTMLInputElement | null;
    if (bInput) {
      bInput.addEventListener('input', (e) => {
        app.updateSelectedBubble({ text: (e.target as HTMLInputElement).value });
      });
    }
    const bAngle = document.getElementById('bubble-tail-angle') as HTMLInputElement | null;
    if (bAngle) {
      bAngle.addEventListener('input', (e) => {
        app.updateSelectedBubble({ tailAngleDeg: Number((e.target as HTMLInputElement).value) });
      });
    }
  } else {
    const brush = app.getActiveBrush();
    const toolDef = ALL_TOOLS_BY_ID[tool];
    box.innerHTML = `
      <p class="muted-note">
        Active Tool: <strong>${toolDef.label}</strong> · Preset: <strong>${brush.name}</strong>.
        Press <kbd>[</kbd> / <kbd>]</kbd> for size, <kbd>Space+Drag</kbd> to pan canvas.
      </p>
    `;
  }
}

function getLayerTypeIconId(type: LayerType): string {
  if (type === 'vector') return 'layer-new-vector';
  if (type === 'group') return 'layer-new-group';
  if (type === 'mask') return 'layer-new-mask';
  return 'layer-new-raster';
}

function renderLayersPanel(): void {
  const doc = app.getActiveDoc();
  const frame = app.getCurrentFrame();
  const active = app.getActiveLayer();
  if (!doc || !frame || !active) return;

  const blendSel = $('layer-blend') as HTMLSelectElement;
  if (blendSel.options.length === 0) {
    app.getBlendModes().forEach((bm) => {
      const opt = document.createElement('option');
      opt.value = bm.value;
      opt.textContent = bm.label;
      blendSel.appendChild(opt);
    });
  }
  blendSel.value = active.meta.blendMode;

  ($('layer-opacity') as HTMLInputElement).value = String(Math.round(active.meta.opacity * 100));
  $('layer-opacity-val').textContent = `${Math.round(active.meta.opacity * 100)}%`;

  $('btn-alpha-lock').classList.toggle('active', active.meta.alphaLock);
  $('btn-clip-layer').classList.toggle('active', active.meta.clipped);

  const activeIdx = frame.layers.findIndex((l) => l.meta.id === doc.activeLayerId);
  ($('btn-del-layer') as HTMLButtonElement).disabled = frame.layers.length <= 1;
  ($('btn-merge-layer') as HTMLButtonElement).disabled = activeIdx <= 0;
  ($('btn-merge-visible') as HTMLButtonElement).disabled =
    frame.layers.filter((l) => l.meta.visible).length <= 1;
  ($('btn-up-layer') as HTMLButtonElement).disabled = activeIdx >= frame.layers.length - 1;
  ($('btn-down-layer') as HTMLButtonElement).disabled = activeIdx <= 0;

  const list = $('layer-list');
  list.innerHTML = '';

  [...frame.layers].reverse().forEach((layer) => {
    const row = document.createElement('div');
    row.className = `layer-row ${layer.meta.id === doc.activeLayerId ? 'active' : ''}`;

    const visBtn = document.createElement('button');
    visBtn.type = 'button';
    visBtn.className = `layer-icon-btn ${layer.meta.visible ? 'on' : ''}`;
    visBtn.title = layer.meta.visible ? `Hide ${layer.meta.name}` : `Show ${layer.meta.name}`;
    visBtn.setAttribute('aria-label', visBtn.title);
    visBtn.appendChild(createIconElement(layer.meta.visible ? 'layer-show' : 'layer-hide', 16));
    visBtn.addEventListener('click', () =>
      app.updateLayerMeta(layer.meta.id, { visible: !layer.meta.visible })
    );

    const thumb = document.createElement('canvas');
    thumb.width = 36;
    thumb.height = 28;
    thumb.className = 'layer-thumb';
    thumb.getContext('2d')!.drawImage(layer.canvas, 0, 0, 36, 28);

    const selectBtn = document.createElement('button');
    selectBtn.type = 'button';
    selectBtn.className = 'layer-select-btn';
    selectBtn.title = layer.meta.name;
    selectBtn.appendChild(createIconElement(getLayerTypeIconId(layer.meta.type), 16));
    const nameTxt = document.createElement('span');
    nameTxt.textContent = `${layer.meta.clipped ? '↳ ' : ''}${layer.meta.name}`;
    selectBtn.appendChild(nameTxt);
    selectBtn.addEventListener('click', () => {
      doc.activeLayerId = layer.meta.id;
      app.renderAll();
      renderLayersPanel();
    });

    const lockBtn = document.createElement('button');
    lockBtn.type = 'button';
    lockBtn.className = `layer-icon-btn ${layer.meta.locked ? 'locked' : ''}`;
    lockBtn.title = layer.meta.locked ? `Unlock ${layer.meta.name}` : `Lock ${layer.meta.name}`;
    lockBtn.setAttribute('aria-label', lockBtn.title);
    lockBtn.appendChild(createIconElement(layer.meta.locked ? 'layer-lock' : 'layer-unlock', 16));
    lockBtn.addEventListener('click', () =>
      app.updateLayerMeta(layer.meta.id, { locked: !layer.meta.locked })
    );

    row.appendChild(visBtn);
    row.appendChild(thumb);
    row.appendChild(selectBtn);
    row.appendChild(lockBtn);
    list.appendChild(row);
  });
}

function renderHistoryAndNav(): void {
  const doc = app.getActiveDoc();
  if (!doc) return;

  ($('nav-zoom-slider') as HTMLInputElement).value = String(Math.round(doc.zoom * 100));
  $('nav-zoom-val').textContent = `${Math.round(doc.zoom * 100)}%`;

  const histList = $('history-list');
  histList.innerHTML = '';
  const entries = doc.history.getEntries();
  const cursor = doc.history.getCurrentIndex();

  entries.forEach((entry, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `history-item ${idx === cursor ? 'active' : idx > cursor ? 'future' : ''}`;
    btn.textContent = `${idx + 1}. ${entry.label}`;
    btn.addEventListener('click', () => app.jumpHistory(idx));
    histList.appendChild(btn);
  });

  const canUndo = doc.history.canUndo();
  const canRedo = doc.history.canRedo();
  ($('btn-undo') as HTMLButtonElement).disabled = !canUndo;
  ($('btn-redo') as HTMLButtonElement).disabled = !canRedo;
  ($('btn-hist-undo') as HTMLButtonElement).disabled = !canUndo;
  ($('btn-hist-redo') as HTMLButtonElement).disabled = !canRedo;
  ($('btn-paste') as HTMLButtonElement).disabled = !app.clipboardPixels;
}

function renderTimeline(): void {
  const doc = app.getActiveDoc();
  if (!doc) return;

  ($('fps-select') as HTMLSelectElement).value = String(doc.fps);

  const playBtn = $('btn-play');
  playBtn.classList.toggle('active', app.isPlaying);
  setSlotIcon($('play-icon-slot'), app.isPlaying ? 'anim-pause' : 'anim-play', 18);

  $('btn-loop').classList.toggle('active', app.loopPlayback);
  $('btn-onion').classList.toggle('active', doc.onionSkin.enabled);
  $('btn-onion-prev').classList.toggle('active', doc.onionSkin.enabled && doc.onionSkin.prevCount > 0);
  $('btn-onion-next').classList.toggle('active', doc.onionSkin.enabled && doc.onionSkin.nextCount > 0);
  $('btn-camera-bounds').classList.toggle('active', doc.camera.enabled);
  $('btn-audio-vis').classList.toggle('active', app.showAudioStrip);
  ($('btn-del-frame') as HTMLButtonElement).disabled = doc.frames.length <= 1;
  ($('btn-del-track') as HTMLButtonElement).disabled = doc.tracks.length <= 1;
  ($('btn-paste-frame') as HTMLButtonElement).disabled = !app.copiedFrameLayers;

  const currFrame = doc.frames[doc.currentFrameIndex];
  $('frame-counter').textContent = `Frame ${doc.currentFrameIndex + 1} / ${doc.frames.length}`;
  const noteInput = $('frame-note-input') as HTMLInputElement;
  if (currFrame && document.activeElement !== noteInput) {
    noteInput.value = currFrame.meta.note;
  }

  const tracksEl = $('timeline-tracks');
  tracksEl.innerHTML = '';
  doc.tracks.forEach((tr) => {
    const tBtn = document.createElement('button');
    tBtn.type = 'button';
    tBtn.className = `timeline-track-row${tr.id === doc.activeTrackId ? ' active' : ''}`;
    tBtn.title = `Select ${tr.name}`;
    const nameSpan = document.createElement('span');
    nameSpan.textContent = tr.name;
    tBtn.appendChild(nameSpan);
    tBtn.appendChild(createIconElement(tr.visible ? 'layer-show' : 'layer-hide', 16));
    tBtn.addEventListener('click', () => {
      doc.activeTrackId = tr.id;
      renderTimeline();
    });
    tracksEl.appendChild(tBtn);
  });

  const cells = $('timeline-cells');
  cells.innerHTML = '';
  doc.frames.forEach((frame, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `timeline-cell ${idx === doc.currentFrameIndex ? 'active' : ''}`;
    btn.style.minWidth = `${Math.max(48, Math.round(frame.meta.exposure * 42 * app.timelineZoom))}px`;
    btn.innerHTML = `
      <span class="cell-num">${idx + 1}</span>
      <span class="cell-exp">${frame.meta.exposure}f</span>
    `;
    btn.title = `Frame ${idx + 1} (${frame.meta.exposure} hold)`;
    btn.setAttribute('aria-label', `Select Frame ${idx + 1}`);
    btn.addEventListener('click', () => app.switchFrame(idx));
    cells.appendChild(btn);
  });

  const audioLabel = $('audio-file-label');
  audioLabel.textContent = app.audioName || 'No Audio Track';
  const waveCanvas = $('audio-waveform-canvas') as HTMLCanvasElement;
  waveCanvas.hidden = !app.showAudioStrip;
  const wCtx = waveCanvas.getContext('2d')!;
  wCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
  if (app.audioWaveformPeaks.length > 0) {
    wCtx.fillStyle = '#3B82F6';
    const barW = waveCanvas.width / app.audioWaveformPeaks.length;
    app.audioWaveformPeaks.forEach((peak, i) => {
      const bh = Math.max(2, peak * (waveCanvas.height - 4));
      wCtx.fillRect(i * barW, (waveCanvas.height - bh) / 2, Math.max(1, barW - 1), bh);
    });
  }
}

function renderStatusBar(): void {
  const doc = app.getActiveDoc();
  if (!doc) return;
  $('status-doc-info').textContent = `${doc.width} × ${doc.height} px · ${doc.dpi} DPI`;
  $('status-zoom').textContent = `${Math.round(doc.zoom * 100)}%`;
  $('status-rot').textContent = `${Math.round(doc.rotationDeg)}°`;
  const toolDef = ALL_TOOLS_BY_ID[app.activeTool];
  $('status-tool').textContent = `${toolDef.label.toUpperCase()} (${app.getActiveBrush().name})`;
}

function syncAllUi(): void {
  renderDocumentTabs();
  renderWorkspaceUI();
  renderLeftTools();
  renderColorPanel();
  renderBrushPanel();
  renderToolProperties();
  renderLayersPanel();
  renderHistoryAndNav();
  renderTimeline();
  renderStatusBar();
}

// ==================== DIALOG HELPERS ====================
function openSettingsModal(): void {
  ($('set-theme') as HTMLSelectElement).value = app.settings.theme;
  ($('set-autosave') as HTMLInputElement).checked = app.settings.autosaveEnabled;
  ($('set-grid-size') as HTMLInputElement).value = String(app.settings.gridSize);
  ($('set-history-depth') as HTMLInputElement).value = String(app.settings.historyDepth);
  openModal('settings-modal');
}

function openBrushSettingsModal(): void {
  const b = app.getActiveBrush();
  ($('bset-spacing') as HTMLInputElement).value = String(Math.round(b.spacing * 100));
  $('bset-spacing-v').textContent = `${Math.round(b.spacing * 100)}%`;
  ($('bset-flow') as HTMLInputElement).value = String(Math.round(b.flow * 100));
  $('bset-flow-v').textContent = `${Math.round(b.flow * 100)}%`;
  ($('bset-scatter') as HTMLInputElement).value = String(Math.round(b.scatter * 100));
  $('bset-scatter-v').textContent = `${Math.round(b.scatter * 100)}%`;
  ($('bset-grain') as HTMLInputElement).value = String(Math.round(b.grain * 100));
  $('bset-grain-v').textContent = `${Math.round(b.grain * 100)}%`;
  ($('bset-pressure-size') as HTMLInputElement).checked = b.pressureSize;
  ($('bset-pressure-opacity') as HTMLInputElement).checked = b.pressureOpacity;
  openModal('brush-settings-modal');
}

function confirmDeleteActiveLayer(): void {
  const frame = app.getCurrentFrame();
  const active = app.getActiveLayer();
  if (!frame || !active || frame.layers.length <= 1) {
    app.deleteActiveLayer();
    return;
  }
  askConfirmation(
    'Delete Layer',
    `Delete layer "${active.meta.name}" from the current frame? You can restore it via Undo.`,
    () => app.deleteActiveLayer(),
    'Delete Layer'
  );
}

function confirmDeleteCurrentFrame(): void {
  const doc = app.getActiveDoc();
  if (!doc || doc.frames.length <= 1) {
    app.deleteCurrentFrame();
    return;
  }
  askConfirmation(
    'Delete Animation Frame',
    `Delete Frame ${doc.currentFrameIndex + 1} from the timeline?`,
    () => app.deleteCurrentFrame(),
    'Delete Frame'
  );
}

function populateNewDocumentModal(): void {
  const presetSel = $('new-doc-preset') as HTMLSelectElement;
  presetSel.innerHTML = '';
  DOCUMENT_PRESETS.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.label} (${p.category})`;
    presetSel.appendChild(opt);
  });
  const customOpt = document.createElement('option');
  customOpt.value = 'custom';
  customOpt.textContent = 'Custom Dimensions';
  presetSel.appendChild(customOpt);
  presetSel.value = 'fhd-1080';

  presetSel.addEventListener('change', () => {
    const found = DOCUMENT_PRESETS.find((p) => p.id === presetSel.value);
    if (found) {
      ($('new-doc-unit') as HTMLSelectElement).value = 'px';
      ($('new-doc-width') as HTMLInputElement).value = String(found.width);
      ($('new-doc-height') as HTMLInputElement).value = String(found.height);
      ($('new-doc-dpi') as HTMLInputElement).value = String(found.dpi);
    }
  });
}

function populateWelcomeRecent(): void {
  const recentEl = $('welcome-recent-list');
  const list = app.getRecentProjects();
  if (list.length === 0) {
    recentEl.innerHTML = '<p class="muted-note">No saved .kas projects yet.</p>';
  } else {
    recentEl.innerHTML = list
      .map(
        (r) =>
          `<div class="recent-item"><strong>${r.name}</strong><span>${r.width}×${r.height} · ${r.workspace} · ${r.savedAt}</span></div>`
      )
      .join('');
  }

  const recoveryBanner = $('welcome-recovery-banner');
  const recovered = app.getRecoverableAutosave();
  if (recovered) {
    recoveryBanner.hidden = false;
    $('recovery-doc-name').textContent = `${recovered.name} (${recovered.width}×${recovered.height})`;
  } else {
    recoveryBanner.hidden = true;
  }
}

// ==================== EVENT BINDINGS ====================
function bindEvents(): void {
  const mainCanvas = $('studio-canvas') as HTMLCanvasElement;
  const overlayCanvas = $('overlay-canvas') as HTMLCanvasElement;
  const navCanvas = $('navigator-canvas') as HTMLCanvasElement;
  const wheelCanvas = $('color-wheel-canvas') as HTMLCanvasElement;
  const viewportEl = $('canvas-viewport');

  app.bindDom({
    mainCanvas,
    overlayCanvas,
    navCanvas,
    wheelCanvas,
    viewportEl,
    onUiUpdate: syncAllUi,
    onNotify: showToast,
  });

  // Global click dismisses dropdown menus & tool flyout
  window.addEventListener('click', () => closeAllPopups());

  // Canvas pointer & wheel zoom
  viewportEl.addEventListener('pointerdown', (e) => {
    closeAllPopups();
    app.handlePointerDown(e);
  });
  window.addEventListener('pointermove', (e) => app.handlePointerMove(e));
  window.addEventListener('pointerup', () => app.handlePointerUp());

  viewportEl.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const doc = app.getActiveDoc();
      if (!doc) return;
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      app.setZoom(doc.zoom * factor);
    },
    { passive: false }
  );

  // Color wheel & controls
  let wheelDragging = false;
  wheelCanvas.addEventListener('pointerdown', (e) => {
    wheelDragging = true;
    app.pickColorFromWheel(e.clientX, e.clientY);
  });
  window.addEventListener('pointermove', (e) => {
    if (wheelDragging) app.pickColorFromWheel(e.clientX, e.clientY);
  });
  window.addEventListener('pointerup', () => {
    wheelDragging = false;
  });

  $('btn-swap-colors').addEventListener('click', () => app.swapColors());
  $('btn-reset-colors').addEventListener('click', () => app.resetColors());
  $('btn-save-color').addEventListener('click', () => app.saveColorToPalette());
  $('btn-remove-color').addEventListener('click', () => app.removeColorFromPalette());
  $('btn-save-palette').addEventListener('click', () => app.savePaletteAsNew());
  $('btn-export-palette').addEventListener('click', () => app.exportActivePalette());

  const importPalInput = $('input-import-palette') as HTMLInputElement;
  $('btn-import-palette').addEventListener('click', () => importPalInput.click());
  importPalInput.addEventListener('change', () => {
    if (importPalInput.files?.[0]) {
      app.importPaletteFile(importPalInput.files[0]);
      importPalInput.value = '';
    }
  });

  ($('palette-select') as HTMLSelectElement).addEventListener('change', (e) => {
    app.activePaletteId = (e.target as HTMLSelectElement).value;
    renderColorPanel();
  });

  const hexInput = $('hex-input') as HTMLInputElement;
  hexInput.addEventListener('change', () => app.setForegroundColor(hexInput.value));

  const onHsvChange = () => {
    const h = Number(($('slider-h') as HTMLInputElement).value);
    const s = Number(($('slider-s') as HTMLInputElement).value);
    const v = Number(($('slider-v') as HTMLInputElement).value);
    const rgb = hsvToRgb(h, s, v);
    app.setForegroundColor(rgbToHex(rgb.r, rgb.g, rgb.b));
  };
  $('slider-h').addEventListener('input', onHsvChange);
  $('slider-s').addEventListener('input', onHsvChange);
  $('slider-v').addEventListener('input', onHsvChange);

  // Dock Subtabs & Workspace tabs
  document.querySelectorAll<HTMLButtonElement>('[data-dock-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setDockTab(btn.dataset.dockTab as 'tool-props' | 'nav-history');
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-workspace-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ws = btn.dataset.workspaceBtn as WorkspaceMode;
      app.setWorkspace(ws);
      if (ws === 'comic') {
        setDockTab('tool-props');
      }
    });
  });

  // Brush controls
  document.querySelectorAll<HTMLButtonElement>('[data-brush-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      app.brushCategory = btn.dataset.brushCat as BrushCategory;
      renderBrushPanel();
    });
  });
  ($('brush-search') as HTMLInputElement).addEventListener('input', (e) => {
    app.brushSearch = (e.target as HTMLInputElement).value;
    renderBrushPanel();
  });
  $('btn-new-brush').addEventListener('click', () => app.createNewBrush());
  $('btn-dup-brush').addEventListener('click', () => app.duplicateActiveBrush());
  $('btn-del-brush').addEventListener('click', () => {
    const b = app.getActiveBrush();
    if (!b.isCustom) return;
    askConfirmation(
      'Delete Custom Brush',
      `Delete custom brush preset "${b.name}"?`,
      () => app.deleteActiveBrush(),
      'Delete Brush'
    );
  });
  $('btn-export-brush').addEventListener('click', () => app.exportActiveBrush());
  const importBrushInput = $('input-import-brush') as HTMLInputElement;
  $('btn-import-brush').addEventListener('click', () => importBrushInput.click());
  importBrushInput.addEventListener('change', () => {
    if (importBrushInput.files?.[0]) {
      app.importBrushFile(importBrushInput.files[0]);
      importBrushInput.value = '';
    }
  });
  $('btn-fav-filter').addEventListener('click', () => {
    app.brushFavoritesOnly = !app.brushFavoritesOnly;
    renderBrushPanel();
  });
  $('btn-brush-settings').addEventListener('click', () => openBrushSettingsModal());
  $('btn-reset-brush').addEventListener('click', () => app.resetActiveBrushSettings());

  // Brush Dynamics modal controls
  $('bset-spacing').addEventListener('input', (e) => {
    $('bset-spacing-v').textContent = `${(e.target as HTMLInputElement).value}%`;
  });
  $('bset-flow').addEventListener('input', (e) => {
    $('bset-flow-v').textContent = `${(e.target as HTMLInputElement).value}%`;
  });
  $('bset-scatter').addEventListener('input', (e) => {
    $('bset-scatter-v').textContent = `${(e.target as HTMLInputElement).value}%`;
  });
  $('bset-grain').addEventListener('input', (e) => {
    $('bset-grain-v').textContent = `${(e.target as HTMLInputElement).value}%`;
  });
  $('bset-reset').addEventListener('click', () => {
    app.resetActiveBrushSettings();
    openBrushSettingsModal();
  });
  $('bset-apply').addEventListener('click', () => {
    const b = app.getActiveBrush();
    b.spacing = Number(($('bset-spacing') as HTMLInputElement).value) / 100;
    b.flow = Number(($('bset-flow') as HTMLInputElement).value) / 100;
    b.scatter = Number(($('bset-scatter') as HTMLInputElement).value) / 100;
    b.grain = Number(($('bset-grain') as HTMLInputElement).value) / 100;
    b.pressureSize = ($('bset-pressure-size') as HTMLInputElement).checked;
    b.pressureOpacity = ($('bset-pressure-opacity') as HTMLInputElement).checked;
    if (b.isCustom) app.saveCustomBrushes();
    closeModal('brush-settings-modal');
    syncAllUi();
    showToast(`Updated dynamics for "${b.name}"`, 'success');
  });

  $('brush-size').addEventListener('input', (e) => {
    const b = app.getActiveBrush();
    b.size = Number((e.target as HTMLInputElement).value);
    renderBrushPanel();
  });
  $('brush-opacity').addEventListener('input', (e) => {
    const b = app.getActiveBrush();
    b.opacity = Number((e.target as HTMLInputElement).value) / 100;
    renderBrushPanel();
  });
  $('brush-hardness').addEventListener('input', (e) => {
    const b = app.getActiveBrush();
    b.hardness = Number((e.target as HTMLInputElement).value) / 100;
    renderBrushPanel();
  });
  $('brush-stab-mode').addEventListener('change', (e) => {
    const b = app.getActiveBrush();
    b.stabilizerMode = (e.target as HTMLSelectElement).value as StabilizerMode;
    renderBrushPanel();
  });
  $('brush-stab').addEventListener('input', (e) => {
    const b = app.getActiveBrush();
    b.stabilization = Number((e.target as HTMLInputElement).value);
    renderBrushPanel();
  });

  // Layer Actions
  $('btn-add-layer').addEventListener('click', () => app.addTypedLayer('raster'));
  $('btn-add-vector-layer').addEventListener('click', () => app.addTypedLayer('vector'));
  $('btn-add-group-layer').addEventListener('click', () => app.addTypedLayer('group'));
  $('btn-add-mask-layer').addEventListener('click', () => app.addTypedLayer('mask'));
  $('btn-dup-layer').addEventListener('click', () => app.duplicateActiveLayer());
  $('btn-merge-layer').addEventListener('click', () => app.mergeActiveLayerDown());
  $('btn-merge-visible').addEventListener('click', () => app.mergeVisibleLayers());
  $('btn-up-layer').addEventListener('click', () => app.moveActiveLayer('up'));
  $('btn-down-layer').addEventListener('click', () => app.moveActiveLayer('down'));
  $('btn-del-layer').addEventListener('click', () => confirmDeleteActiveLayer());
  $('btn-alpha-lock').addEventListener('click', () => {
    const l = app.getActiveLayer();
    if (l) app.updateLayerMeta(l.meta.id, { alphaLock: !l.meta.alphaLock });
  });
  $('btn-clip-layer').addEventListener('click', () => {
    const l = app.getActiveLayer();
    if (l) app.updateLayerMeta(l.meta.id, { clipped: !l.meta.clipped });
  });
  $('layer-blend').addEventListener('change', (e) => {
    const l = app.getActiveLayer();
    if (l) app.updateLayerMeta(l.meta.id, { blendMode: (e.target as HTMLSelectElement).value as BlendMode });
  });
  $('layer-opacity').addEventListener('input', (e) => {
    const l = app.getActiveLayer();
    if (l) app.updateLayerMeta(l.meta.id, { opacity: Number((e.target as HTMLInputElement).value) / 100 });
  });

  // Main Toolbar Actions
  $('btn-new-doc').addEventListener('click', () => openModal('new-doc-modal'));
  $('btn-save-kas').addEventListener('click', () => app.saveKasProject());
  $('btn-save-all').addEventListener('click', () => app.saveAllProjects());
  $('btn-undo').addEventListener('click', () => app.undo());
  $('btn-redo').addEventListener('click', () => app.redo());
  $('btn-cut').addEventListener('click', () => app.cutSelectionOrLayer());
  $('btn-copy').addEventListener('click', () => app.copySelectionOrLayer());
  $('btn-paste').addEventListener('click', () => app.pasteClipboard());
  $('btn-zoom-in').addEventListener('click', () => {
    const doc = app.getActiveDoc();
    if (doc) app.setZoom(doc.zoom * 1.25);
  });
  $('btn-zoom-out').addEventListener('click', () => {
    const doc = app.getActiveDoc();
    if (doc) app.setZoom(doc.zoom * 0.8);
  });
  $('btn-fit-canvas').addEventListener('click', () => app.fitCanvasToViewport());
  $('btn-actual-size').addEventListener('click', () => app.setZoom(1));
  $('btn-rot-left').addEventListener('click', () => app.rotateCanvas(-15));
  $('btn-rot-right').addEventListener('click', () => app.rotateCanvas(15));
  $('btn-reset-rot').addEventListener('click', () => {
    const doc = app.getActiveDoc();
    if (doc) {
      doc.rotationDeg = 0;
      app.applyCanvasTransform();
      syncAllUi();
    }
  });
  $('btn-flip-h').addEventListener('click', () => app.toggleFlip('h'));
  $('btn-flip-v').addEventListener('click', () => app.toggleFlip('v'));
  $('btn-toggle-grid').addEventListener('click', () => {
    app.settings.showGrid = !app.settings.showGrid;
    app.renderOverlay();
    syncAllUi();
  });
  $('btn-toggle-rulers').addEventListener('click', () => {
    app.settings.showRulers = !app.settings.showRulers;
    syncAllUi();
  });
  $('btn-toggle-guides').addEventListener('click', () => {
    app.settings.showGuides = !app.settings.showGuides;
    app.renderOverlay();
    syncAllUi();
  });
  $('btn-toggle-symmetry').addEventListener('click', () => {
    app.settings.showSymmetry = !app.settings.showSymmetry;
    app.renderOverlay();
    syncAllUi();
  });
  $('btn-fullscreen').addEventListener('click', () => toggleFullscreen());
  $('btn-open-export').addEventListener('click', () => openModal('export-modal'));
  $('btn-open-settings').addEventListener('click', () => openSettingsModal());
  $('btn-toggle-timeline').addEventListener('click', () => toggleTimelinePinned());

  // Navigator & History Panel controls
  $('nav-zoom-slider').addEventListener('input', (e) => {
    app.setZoom(Number((e.target as HTMLInputElement).value) / 100);
  });
  $('nav-zoom-in').addEventListener('click', () => {
    const doc = app.getActiveDoc();
    if (doc) app.setZoom(doc.zoom * 1.25);
  });
  $('nav-zoom-out').addEventListener('click', () => {
    const doc = app.getActiveDoc();
    if (doc) app.setZoom(doc.zoom * 0.8);
  });
  $('nav-fit').addEventListener('click', () => app.fitCanvasToViewport());
  $('nav-reset-rot').addEventListener('click', () => {
    const doc = app.getActiveDoc();
    if (doc) {
      doc.rotationDeg = 0;
      app.applyCanvasTransform();
      syncAllUi();
    }
  });
  $('nav-rot-left').addEventListener('click', () => app.rotateCanvas(-15));
  $('nav-rot-right').addEventListener('click', () => app.rotateCanvas(15));
  $('nav-flip-h').addEventListener('click', () => app.toggleFlip('h'));
  $('btn-hist-undo').addEventListener('click', () => app.undo());
  $('btn-hist-redo').addEventListener('click', () => app.redo());
  $('btn-hist-clear').addEventListener('click', () => {
    askConfirmation(
      'Clear History Steps',
      'Discard all earlier undo snapshots and keep only the current canvas state?',
      () => app.clearHistory(),
      'Clear History'
    );
  });
  $('btn-hist-settings').addEventListener('click', () => openSettingsModal());

  // File Inputs (Open .kas / Import Image / Audio)
  const openKasInput = $('input-open-kas') as HTMLInputElement;
  $('btn-open-kas').addEventListener('click', () => openKasInput.click());
  openKasInput.addEventListener('change', () => {
    if (openKasInput.files?.[0]) {
      app.openKasFile(openKasInput.files[0]);
      openKasInput.value = '';
    }
  });

  const importImgInput = $('input-import-img') as HTMLInputElement;
  $('btn-import-img').addEventListener('click', () => importImgInput.click());
  importImgInput.addEventListener('change', () => {
    if (importImgInput.files?.[0]) {
      app.importImageAsLayer(importImgInput.files[0]);
      importImgInput.value = '';
    }
  });

  const audioInput = $('input-import-audio') as HTMLInputElement;
  $('btn-import-audio').addEventListener('click', () => audioInput.click());
  audioInput.addEventListener('change', () => {
    if (audioInput.files?.[0]) {
      app.importAudioFile(audioInput.files[0]);
      audioInput.value = '';
    }
  });
  $('btn-audio-vis').addEventListener('click', () => {
    app.showAudioStrip = !app.showAudioStrip;
    renderTimeline();
  });

  // Timeline Controls (All 28)
  const fpsSel = $('fps-select') as HTMLSelectElement;
  FPS_PRESETS.forEach((f) => {
    const opt = document.createElement('option');
    opt.value = String(f);
    opt.textContent = `${f} FPS`;
    fpsSel.appendChild(opt);
  });
  fpsSel.addEventListener('change', () => {
    const doc = app.getActiveDoc();
    if (doc) {
      doc.fps = Number(fpsSel.value);
      syncAllUi();
    }
  });

  $('btn-first-frame').addEventListener('click', () => app.switchFrame(0));
  $('btn-prev-frame').addEventListener('click', () => {
    const doc = app.getActiveDoc();
    if (doc) app.switchFrame(doc.currentFrameIndex - 1);
  });
  $('btn-play').addEventListener('click', () => app.togglePlayback());
  $('btn-stop').addEventListener('click', () => app.stopPlayback());
  $('btn-next-frame').addEventListener('click', () => {
    const doc = app.getActiveDoc();
    if (doc) app.switchFrame(doc.currentFrameIndex + 1);
  });
  $('btn-last-frame').addEventListener('click', () => {
    const doc = app.getActiveDoc();
    if (doc) app.switchFrame(doc.frames.length - 1);
  });
  $('btn-loop').addEventListener('click', () => {
    app.loopPlayback = !app.loopPlayback;
    renderTimeline();
  });
  $('btn-onion').addEventListener('click', () => {
    const doc = app.getActiveDoc();
    if (doc) {
      doc.onionSkin.enabled = !doc.onionSkin.enabled;
      app.renderAll();
      renderTimeline();
    }
  });
  $('btn-onion-prev').addEventListener('click', () => app.togglePrevOnionSkin());
  $('btn-onion-next').addEventListener('click', () => app.toggleNextOnionSkin());
  $('btn-camera-bounds').addEventListener('click', () => {
    const doc = app.getActiveDoc();
    if (doc) {
      doc.camera.enabled = !doc.camera.enabled;
      app.renderOverlay();
      renderTimeline();
    }
  });
  $('btn-timeline-settings').addEventListener('click', () => openSettingsModal());
  $('btn-tl-zoom-in').addEventListener('click', () => app.adjustTimelineZoom(0.2));
  $('btn-tl-zoom-out').addEventListener('click', () => app.adjustTimelineZoom(-0.2));
  $('btn-add-frame').addEventListener('click', () => app.addFrame(false));
  $('btn-dup-frame').addEventListener('click', () => app.addFrame(true));
  $('btn-copy-frame').addEventListener('click', () => app.copyCurrentFrame());
  $('btn-paste-frame').addEventListener('click', () => app.pasteCopiedFrame());
  $('btn-clear-frame').addEventListener('click', () => app.clearCurrentFrame());
  $('btn-del-frame').addEventListener('click', () => confirmDeleteCurrentFrame());
  $('btn-exp-plus').addEventListener('click', () => app.changeCurrentFrameExposure(1));
  $('btn-exp-minus').addEventListener('click', () => app.changeCurrentFrameExposure(-1));
  $('btn-add-track').addEventListener('click', () => app.addTimelineTrack());
  $('btn-del-track').addEventListener('click', () => app.deleteActiveTimelineTrack());
  $('btn-track-up').addEventListener('click', () => app.moveActiveTimelineTrack('up'));
  $('btn-track-down').addEventListener('click', () => app.moveActiveTimelineTrack('down'));
  $('frame-note-input').addEventListener('input', (e) => {
    const f = app.getCurrentFrame();
    if (f) f.meta.note = (e.target as HTMLInputElement).value;
  });
  $('btn-export-gif').addEventListener('click', () => app.exportAnimatedGif());
  $('btn-export-seq').addEventListener('click', () => app.exportPngSequence());

  // Modals: Close & Confirm
  document.querySelectorAll<HTMLButtonElement>('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal!));
  });

  $('btn-confirm-close').addEventListener('click', () => {
    pendingConfirmAction = null;
    closeModal('confirm-modal');
  });
  $('btn-confirm-cancel').addEventListener('click', () => {
    pendingConfirmAction = null;
    closeModal('confirm-modal');
  });
  $('btn-confirm-ok').addEventListener('click', () => {
    const fn = pendingConfirmAction;
    pendingConfirmAction = null;
    closeModal('confirm-modal');
    if (fn) fn();
  });

  // New Document Form
  populateNewDocumentModal();
  $('new-doc-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = ($('new-doc-name') as HTMLInputElement).value;
    const unit = ($('new-doc-unit') as HTMLSelectElement).value as 'px' | 'mm' | 'in';
    const rawW = Number(($('new-doc-width') as HTMLInputElement).value);
    const rawH = Number(($('new-doc-height') as HTMLInputElement).value);
    const dpi = Number(($('new-doc-dpi') as HTMLInputElement).value);
    const bg = ($('new-doc-bg') as HTMLInputElement).value;
    const transparent = ($('new-doc-transparent') as HTMLInputElement).checked;
    const layers = Number(($('new-doc-layers') as HTMLInputElement).value);
    const fps = Number(($('new-doc-fps') as HTMLInputElement).value);

    const wPx = app.computePhysicalPixels(rawW, unit, dpi);
    const hPx = app.computePhysicalPixels(rawH, unit, dpi);

    app.createNewDocument({
      name,
      width: wPx,
      height: hPx,
      dpi,
      fps,
      backgroundColor: bg,
      transparentBackground: transparent,
      initialLayers: layers,
      seedDemo: false,
    });
    closeModal('new-doc-modal');
    closeModal('welcome-modal');
  });

  // Export Modal Actions
  $('btn-do-export').addEventListener('click', () => {
    const fmt = ($('export-format') as HTMLSelectElement).value;
    const quality = Number(($('export-quality') as HTMLInputElement).value) / 100;
    if (fmt === 'kas') app.saveKasProject();
    else if (fmt === 'gif') app.exportAnimatedGif();
    else if (fmt === 'png-seq') app.exportPngSequence();
    else app.exportRasterImage(fmt as 'png' | 'jpeg' | 'webp', quality);
    closeModal('export-modal');
  });

  // Settings Modal Actions
  $('btn-reset-settings').addEventListener('click', () => {
    app.saveSettings({
      autosaveEnabled: true,
      autosaveIntervalSec: 45,
      historyDepth: 35,
      gridSize: 32,
      showGrid: false,
      showRulers: true,
      showGuides: false,
      showSymmetry: false,
      theme: 'dark',
    });
    applyTheme('dark');
    openSettingsModal();
  });

  $('btn-save-settings').addEventListener('click', () => {
    const nextTheme = ($('set-theme') as HTMLSelectElement).value as 'dark' | 'light';
    app.saveSettings({
      ...app.settings,
      theme: nextTheme,
      autosaveEnabled: ($('set-autosave') as HTMLInputElement).checked,
      gridSize: Math.max(8, Number(($('set-grid-size') as HTMLInputElement).value)),
      historyDepth: Math.max(10, Number(($('set-history-depth') as HTMLInputElement).value)),
    });
    applyTheme(nextTheme);
    closeModal('settings-modal');
  });

  // Welcome Screen Quick Actions
  $('welcome-start-ill').addEventListener('click', () => {
    app.setWorkspace('illustration');
    closeModal('welcome-modal');
  });
  $('welcome-start-anim').addEventListener('click', () => {
    app.createNewDocument({
      name: '2D Animation Scene',
      width: 1280,
      height: 720,
      dpi: 96,
      fps: 24,
      backgroundColor: '#FFFFFF',
      transparentBackground: false,
      initialLayers: 2,
      workspace: 'animation',
      seedDemo: true,
    });
    closeModal('welcome-modal');
  });
  $('welcome-start-comic').addEventListener('click', () => {
    app.createNewDocument({
      name: 'Manga Page 01',
      width: 1200,
      height: 1680,
      dpi: 300,
      backgroundColor: '#FFFFFF',
      transparentBackground: false,
      initialLayers: 2,
      workspace: 'comic',
      seedDemo: true,
    });
    closeModal('welcome-modal');
  });
  $('welcome-open-kas').addEventListener('click', () => {
    openKasInput.click();
    closeModal('welcome-modal');
  });
  $('btn-restore-autosave').addEventListener('click', async () => {
    const recovered = app.getRecoverableAutosave();
    if (recovered) {
      await app.loadManifestIntoDocument(recovered);
      app.clearRecoverableAutosave();
      closeModal('welcome-modal');
      showToast('Recovered autosaved project', 'success');
    }
  });
  $('btn-dismiss-autosave').addEventListener('click', () => {
    app.clearRecoverableAutosave();
    $('welcome-recovery-banner').hidden = true;
  });

  // Windows Software / PWA Install Modal & Status
  $('btn-get-app').addEventListener('click', () => openModal('install-app-modal'));
  $('welcome-install-app').addEventListener('click', () => {
    closeModal('welcome-modal');
    openModal('install-app-modal');
  });

  const pwaInstallBtn = $('btn-pwa-install') as HTMLButtonElement;
  const pwaHint = $('pwa-install-hint');
  const connBadge = $('status-connection');
  const connIcon = $('status-conn-icon');
  const connLabel = $('status-conn-label');

  pwa.subscribe((st) => {
    if (st.isStandaloneFile) {
      connBadge.classList.remove('offline');
      setSlotIcon(connIcon, 'st-desktop', 16);
      connLabel.textContent = 'Offline App';
      $('btn-get-app').hidden = true;
    } else if (st.isInstalled) {
      connBadge.classList.remove('offline');
      setSlotIcon(connIcon, st.isOnline ? 'st-desktop' : 'st-offline', 16);
      connLabel.textContent = st.isOnline ? 'Desktop App' : 'Offline Mode';
      pwaInstallBtn.hidden = true;
      pwaHint.textContent = 'KAIRO ART STUDIO is running as an installed Desktop App.';
    } else if (!st.isOnline) {
      connBadge.classList.add('offline');
      setSlotIcon(connIcon, 'st-offline', 16);
      connLabel.textContent = 'Offline Mode';
    } else {
      connBadge.classList.remove('offline');
      setSlotIcon(connIcon, 'st-ready', 16);
      connLabel.textContent = 'Ready';
    }

    if (st.canPromptInstall) {
      const lbl = pwaInstallBtn.querySelector('span:last-child');
      if (lbl) lbl.textContent = 'Install Desktop App';
    }
  });

  pwaInstallBtn.addEventListener('click', async () => {
    const res = await pwa.promptInstall();
    if (res === 'accepted') {
      showToast('Installing KAIRO ART STUDIO Desktop App...', 'success');
      closeModal('install-app-modal');
    } else if (res === 'unavailable') {
      showToast('Use Edge/Chrome "Install app" icon or download the Windows .ZIP below', 'info');
    }
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllPopups();
      return;
    }
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      if (app.workspace === 'animation' && !e.repeat) {
        app.togglePlayback();
      } else {
        app.setSpaceHeld(true);
      }
      return;
    }

    if (e.key === 'F11') {
      e.preventDefault();
      toggleFullscreen();
      return;
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      app.clearActiveLayer();
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      const k = e.key.toLowerCase();
      if (k === 'n') {
        e.preventDefault();
        openModal('new-doc-modal');
      } else if (k === 'o') {
        e.preventDefault();
        openKasInput.click();
      } else if (k === 'e') {
        e.preventDefault();
        openModal('export-modal');
      } else if (k === 'x') {
        e.preventDefault();
        app.cutSelectionOrLayer();
      } else if (k === 'c') {
        e.preventDefault();
        app.copySelectionOrLayer();
      } else if (k === 'v') {
        e.preventDefault();
        app.pasteClipboard();
      } else if (k === 'z') {
        e.preventDefault();
        if (e.shiftKey) app.redo();
        else app.undo();
      } else if (k === 'y') {
        e.preventDefault();
        app.redo();
      } else if (k === 's') {
        e.preventDefault();
        app.saveKasProject();
      } else if (k === 'a') {
        e.preventDefault();
        app.selectAll();
      } else if (k === 'd') {
        e.preventDefault();
        app.deselectAll();
      } else if (k === '=' || k === '+') {
        e.preventDefault();
        const doc = app.getActiveDoc();
        if (doc) app.setZoom(doc.zoom * 1.2);
      } else if (k === '-') {
        e.preventDefault();
        const doc = app.getActiveDoc();
        if (doc) app.setZoom(doc.zoom * 0.8);
      } else if (k === '0') {
        e.preventDefault();
        app.fitCanvasToViewport();
      } else if (k === '1') {
        e.preventDefault();
        app.setZoom(1);
      }
      return;
    }

    const key = e.key.toLowerCase();
    const map: Record<string, ToolId> = {
      b: 'brush',
      p: 'pencil',
      e: 'eraser',
      g: 'fill',
      i: 'eyedropper',
      m: 'selection',
      l: 'lasso',
      w: 'magic-wand',
      v: 'move',
      u: 'shape',
      t: 'text',
      y: 'symmetry',
      c: 'comic',
      h: 'hand',
      z: 'zoom',
    };
    if (map[key]) {
      selectStudioTool(map[key]);
    } else if (key === 'x') {
      app.swapColors();
    } else if (key === 'd') {
      app.resetColors();
    } else if (key === '[') {
      const b = app.getActiveBrush();
      b.size = Math.max(b.minSize, Math.round(b.size - 3));
      renderBrushPanel();
    } else if (key === ']') {
      const b = app.getActiveBrush();
      b.size = Math.min(b.maxSize, Math.round(b.size + 3));
      renderBrushPanel();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      app.setSpaceHeld(false);
    }
  });
}

function init(): void {
  applyTheme(app.settings.theme);
  renderMenuBar();
  hydrateDomIcons(document);
  bindEvents();

  const params = new URLSearchParams(window.location.search);
  const wsParam = params.get('workspace') as WorkspaceMode | null;
  const autostart = params.get('autostart') === '1';

  const initialWs: WorkspaceMode =
    wsParam && ['illustration', 'animation', 'comic', 'minimal'].includes(wsParam)
      ? wsParam
      : 'illustration';

  app.workspace = initialWs;
  app.createNewDocument({
    name:
      initialWs === 'animation'
        ? 'Animation Shot 01'
        : initialWs === 'comic'
          ? 'Comic Page 01'
          : 'Kairo Illustration',
    width: initialWs === 'comic' ? 1200 : 1280,
    height: initialWs === 'comic' ? 1680 : 720,
    dpi: 150,
    fps: 24,
    backgroundColor: '#FFFFFF',
    transparentBackground: false,
    initialLayers: 2,
    workspace: initialWs,
    seedDemo: true,
  });

  populateWelcomeRecent();

  if (!autostart && !wsParam && params.get('install') !== '1') {
    openModal('welcome-modal');
  } else {
    closeModal('welcome-modal');
  }

  if (params.get('install') === '1') {
    openModal('install-app-modal');
  }
}

document.addEventListener('DOMContentLoaded', init);
