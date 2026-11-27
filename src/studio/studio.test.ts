import test from 'node:test';
import assert from 'node:assert/strict';
import { hsvToRgb, rgbToHsv, rgbToHex, hexToRgb, clampByte } from './color';
import {
  BUILTIN_BRUSHES,
  applyPressureCurve,
  stabilizePoint,
  interpolateStrokePoints,
} from './brushes';
import {
  BLEND_MODES,
  blendChannelMath,
  canDrawOnLayer,
  reorderLayerList,
} from './layers';
import { CommandHistory } from './history';
import {
  getFrameIntervalMs,
  stepPlaybackFrame,
  getOnionSkinTargets,
  adjustFrameExposure,
  getTotalTimelineUnits,
} from './animation';
import {
  DOCUMENT_PRESETS,
  KAS_SCHEMA_VERSION,
  serializeKasProject,
  parseKasProject,
  convertPhysicalToPixels,
} from './project';
import {
  buildStandaloneHtml,
  buildWindowsBatLauncher,
  buildWindowsReadme,
  crc32,
  createStoredZip,
} from './windowsPackage';
import fs from 'node:fs';
import path from 'node:path';
import { getAllIcons, buildSvgMarkup, ICON_REGISTRY } from './iconRegistry';
import { ALL_TOOLS_BY_ID, LEFT_TOOL_SLOTS, TOP_MENU_BAR } from './uiDefinitions';
import {
  applyPixelFilter,
  computeMagicWandRegion,
  parsePaletteImport,
  serializePaletteExport,
} from './filters';
import { getBuiltinBrushDefault } from './brushes';

test('color conversions round-trip accurately', () => {
  const rgb = hsvToRgb(217, 76, 96); // electric blue region
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
  const parsed = hexToRgb(hex);
  assert.ok(parsed);
  if (!parsed) throw new Error('Expected parsed RGB');
  assert.equal(parsed.r, rgb.r);
  assert.equal(parsed.g, rgb.g);
  assert.equal(parsed.b, rgb.b);

  const hsv = rgbToHsv(59, 130, 246);
  assert.ok(hsv.h >= 215 && hsv.h <= 220);
  assert.equal(clampByte(300), 255);
  assert.equal(clampByte(-12), 0);
});

test('20 distinct built-in brush presets exist with unique ids and varied configs', () => {
  assert.equal(BUILTIN_BRUSHES.length, 20);
  const ids = new Set(BUILTIN_BRUSHES.map((b) => b.id));
  assert.equal(ids.size, 20);
  const gPen = BUILTIN_BRUSHES.find((b) => b.id === 'g-pen');
  const airbrush = BUILTIN_BRUSHES.find((b) => b.id === 'airbrush');
  assert.ok(gPen && airbrush);
  if (!gPen || !airbrush) throw new Error('Missing brush presets');
  assert.notEqual(gPen.hardness, airbrush.hardness);
  assert.notEqual(gPen.stabilization, airbrush.stabilization);

  const defaultGPen = getBuiltinBrushDefault('g-pen');
  assert.ok(defaultGPen);
  assert.equal(defaultGPen?.id, 'g-pen');
  assert.equal(getBuiltinBrushDefault('non-existent'), undefined);
});

test('stroke stabilization and interpolation work deterministically', () => {
  const p = applyPressureCurve(0.5, 1.0);
  assert.equal(p, 0.5);

  const stabilized = stabilizePoint(
    [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 10, y: 10, pressure: 0.5 },
    ],
    { x: 30, y: 30, pressure: 1.0 },
    'weighted',
    60
  );
  assert.ok(stabilized.x < 30 && stabilized.x > 10);

  const pts = interpolateStrokePoints(
    { x: 0, y: 0, pressure: 0.2 },
    { x: 100, y: 0, pressure: 1.0 },
    20
  );
  assert.equal(pts.length, 5);
  assert.equal(pts[4].x, 100);
  assert.equal(pts[4].pressure, 1.0);
});

test('layer blend modes, locks, and reordering math behave properly', () => {
  assert.equal(BLEND_MODES.length, 17);
  assert.equal(blendChannelMath(255, 128, 'multiply'), 128);
  assert.equal(blendChannelMath(0, 128, 'screen'), 128);
  assert.equal(blendChannelMath(200, 100, 'add'), 255);
  assert.equal(blendChannelMath(100, 150, 'subtract'), 0);
  assert.equal(blendChannelMath(200, 50, 'difference'), 150);

  assert.equal(
    canDrawOnLayer({
      id: '1',
      name: 'Ink',
      type: 'raster',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      locked: false,
      alphaLock: false,
      clipped: false,
    }),
    true
  );
  assert.equal(
    canDrawOnLayer({
      id: '1',
      name: 'Ink',
      type: 'raster',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      locked: true,
      alphaLock: false,
      clipped: false,
    }),
    false
  );

  const reordered = reorderLayerList([{ id: 'a' }, { id: 'b' }, { id: 'c' }], 'a', 'up');
  assert.deepEqual(reordered.map((x) => x.id), ['b', 'a', 'c']);
});

test('command history undo/redo and truncation work reliably', () => {
  const history = new CommandHistory<string>(5);
  history.push('Init', 'state-0');
  history.push('Brush Stroke 1', 'state-1');
  history.push('Brush Stroke 2', 'state-2');
  assert.equal(history.canUndo(), true);
  assert.equal(history.canRedo(), false);

  const u1 = history.undo();
  assert.equal(u1?.data, 'state-1');
  assert.equal(history.canRedo(), true);

  history.push('Eraser Stroke', 'state-1b');
  assert.equal(history.canRedo(), false);
  assert.equal(history.getEntries().length, 3);
});

test('animation playback, exposure, and onion skin calculations', () => {
  assert.ok(Math.abs(getFrameIntervalMs(24) - 41.6667) < 0.01);
  assert.deepEqual(stepPlaybackFrame(2, 3, true), { nextIndex: 0, shouldStop: false });
  assert.deepEqual(stepPlaybackFrame(2, 3, false), { nextIndex: 2, shouldStop: true });

  const targets = getOnionSkinTargets(2, 5, {
    enabled: true,
    prevCount: 2,
    nextCount: 1,
    opacity: 0.4,
    prevColor: '#3B82F6',
    nextColor: '#F28C28',
  });
  assert.equal(targets.length, 3);
  assert.equal(targets[0].frameIndex, 1);
  assert.equal(targets[0].direction, 'prev');
  assert.equal(targets[2].frameIndex, 3);
  assert.equal(targets[2].direction, 'next');

  const frames = [
    { id: 'f1', index: 1, exposure: 2, note: '', label: 'F1' },
    { id: 'f2', index: 2, exposure: 1, note: '', label: 'F2' },
  ];
  const updated = adjustFrameExposure(frames, 'f1', 2);
  assert.equal(getTotalTimelineUnits(updated), 5);
});

test('.kas project manifest serialization, validation, and physical print conversion', () => {
  assert.ok(DOCUMENT_PRESETS.length >= 9);
  assert.equal(convertPhysicalToPixels(10, 'in', 300), 3000);
  assert.equal(convertPhysicalToPixels(25.4, 'mm', 300), 300);

  const json = serializeKasProject({
    format: 'kairo-art-studio-project',
    schemaVersion: KAS_SCHEMA_VERSION,
    savedAt: '2026-11-26T00:00:00Z',
    name: 'Test Project',
    width: 1280,
    height: 720,
    dpi: 96,
    fps: 24,
    workspace: 'animation',
    backgroundColor: '#FFFFFF',
    transparentBackground: false,
    onionSkin: {
      enabled: true,
      prevCount: 1,
      nextCount: 1,
      opacity: 0.35,
      prevColor: '#3B82F6',
      nextColor: '#F28C28',
    },
    camera: { x: 0, y: 0, zoom: 1, rotationDeg: 0, enabled: false },
    frames: [
      {
        meta: { id: 'f1', index: 1, exposure: 1, note: 'Key', label: 'Key 1' },
        layers: [],
      },
    ],
    comicPanels: [],
    speechBubbles: [],
    textObjects: [],
  });

  const parsed = parseKasProject(json);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.manifest?.name, 'Test Project');

  const invalid = parseKasProject('{"format":"unknown"}');
  assert.equal(invalid.valid, false);
});

test('Windows portable ZIP builder, CRC32, standalone HTML, and BAT launcher generate valid outputs', () => {
  const encoder = new TextEncoder();
  assert.equal(crc32(encoder.encode('123456789')), 0xcbf43926);

  const bundledHtml = buildStandaloneHtml({
    html: '<html><head><link rel="manifest" href="/manifest.webmanifest"><link rel="stylesheet" href="studio.css"></head><body><img src="images/logo/kairo-logo.png"><script defer src="studio/kairo-art-studio.js"></script></body></html>',
    css: 'body{background:#17191E}',
    js: 'console.log("KAS READY");',
    logoDataUrl: 'data:image/png;base64,AAAA',
  });
  assert.ok(bundledHtml.includes('<style>'));
  assert.ok(bundledHtml.includes('window.__KAS_STANDALONE_OFFLINE__ = true;'));
  assert.ok(bundledHtml.includes('data:image/png;base64,AAAA'));
  assert.equal(bundledHtml.includes('studio/kairo-art-studio.js'), false);
  assert.equal(bundledHtml.includes('manifest.webmanifest'), false);

  const bat = buildWindowsBatLauncher('Kairo-Art-Studio.html', true);
  assert.ok(bat.includes('msedge.exe'));
  assert.ok(bat.includes('chrome.exe'));
  assert.ok(bat.includes('--app='));
  assert.ok(bat.includes('\r\n'));

  const readme = buildWindowsReadme();
  assert.ok(readme.includes('Launch-Kairo-Art-Studio.bat'));

  const zip = createStoredZip([
    { name: 'Kairo-Art-Studio-Windows/Kairo-Art-Studio.html', data: encoder.encode(bundledHtml) },
    { name: 'Kairo-Art-Studio-Windows/Launch-Kairo-Art-Studio.bat', data: encoder.encode(bat) },
  ]);
  // Local file header PK\x03\x04 at 0
  assert.equal(zip[0], 0x50);
  assert.equal(zip[1], 0x4b);
  assert.equal(zip[2], 0x03);
  assert.equal(zip[3], 0x04);
  // EOCD PK\x05\x06 at end - 22
  const eocdOffset = zip.length - 22;
  assert.equal(zip[eocdOffset], 0x50);
  assert.equal(zip[eocdOffset + 1], 0x4b);
  assert.equal(zip[eocdOffset + 2], 0x05);
  assert.equal(zip[eocdOffset + 3], 0x06);
});

test('SVG icon registry and /resources/icons directory cover all 10 categories without missing assets', () => {
  const icons = getAllIcons();
  assert.ok(icons.length >= 130);

  const categories = new Set(icons.map((i) => i.category));
  const expectedCategories = [
    'toolbar',
    'tools',
    'layers',
    'brushes',
    'colors',
    'animation',
    'menus',
    'dialogs',
    'navigation',
    'status',
  ];
  for (const cat of expectedCategories) {
    assert.ok(categories.has(cat as typeof icons[number]['category']), `Missing category ${cat}`);
    const dir = path.join(process.cwd(), 'resources', 'icons', cat);
    assert.ok(fs.existsSync(dir), `Missing /resources/icons/${cat} folder`);
  }

  for (const icon of icons) {
    const svgPath = path.join(process.cwd(), 'resources', 'icons', icon.category, `${icon.id}.svg`);
    assert.ok(fs.existsSync(svgPath), `Missing SVG file ${svgPath}`);
    const content = fs.readFileSync(svgPath, 'utf8');
    assert.ok(content.includes('<svg') && content.includes('</svg>'));
    assert.ok(buildSvgMarkup(icon.id, 24).includes('kas-ico-24'));
  }
});

test('Top 12 menus and all 27 drawing tools reference valid icons', () => {
  assert.equal(TOP_MENU_BAR.length, 12);
  for (const menu of TOP_MENU_BAR) {
    assert.ok(ICON_REGISTRY[menu.icon], `Missing menu icon ${menu.icon}`);
    for (const item of menu.items) {
      assert.ok(ICON_REGISTRY[item.icon], `Missing menu command icon ${item.icon} in ${menu.id}`);
    }
  }

  const slotToolIds = new Set(LEFT_TOOL_SLOTS.flatMap((s) => s.items.map((i) => i.id)));
  const requiredTools = [
    'move',
    'hand',
    'zoom',
    'brush',
    'pencil',
    'pen',
    'eraser',
    'airbrush',
    'watercolor',
    'blend',
    'fill',
    'eyedropper',
    'selection',
    'ellipse-selection',
    'lasso',
    'polygon-selection',
    'magic-wand',
    'transform',
    'line-shape',
    'shape',
    'ellipse-shape',
    'polygon-shape',
    'curve-shape',
    'gradient',
    'text',
    'vector-pen',
    'symmetry',
  ] as const;

  for (const reqId of requiredTools) {
    assert.ok(slotToolIds.has(reqId), `Missing required drawing tool ${reqId} in left rail`);
    const def = ALL_TOOLS_BY_ID[reqId];
    assert.ok(ICON_REGISTRY[def.icon], `Missing icon ${def.icon} for tool ${reqId}`);
  }
});

test('Pixel filters, palette serialization/parsing, and magic wand region behave accurately', () => {
  const px = new Uint8ClampedArray([200, 100, 50, 255]);
  applyPixelFilter(px, 'invert');
  assert.deepEqual(Array.from(px), [55, 155, 205, 255]);

  applyPixelFilter(px, 'grayscale');
  assert.equal(px[0], px[1]);
  assert.equal(px[1], px[2]);

  const jsonExport = serializePaletteExport({
    id: 'pal-1',
    name: 'Hero Palette',
    colors: ['#3B82F6', '#F28C28'],
  });
  const parsedJson = parsePaletteImport(jsonExport);
  assert.ok(parsedJson);
  assert.equal(parsedJson?.name, 'Hero Palette');
  assert.deepEqual(parsedJson?.colors, ['#3B82F6', '#F28C28']);

  const parsedGpl = parsePaletteImport('GIMP Palette\nName: Ink Set\n0 0 0 Black\n255 128 0 Orange');
  assert.ok(parsedGpl);
  assert.equal(parsedGpl?.name, 'Ink Set');
  assert.deepEqual(parsedGpl?.colors, ['#000000', '#FF8000']);

  // 4x4 image with a 2x2 blue square in center (x:1..2, y:1..2)
  const w = 4;
  const h = 4;
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const inSquare = x >= 1 && x <= 2 && y >= 1 && y <= 2;
      buf[idx] = inSquare ? 59 : 255;
      buf[idx + 1] = inSquare ? 130 : 255;
      buf[idx + 2] = inSquare ? 246 : 255;
      buf[idx + 3] = 255;
    }
  }
  const region = computeMagicWandRegion(buf, w, h, 1, 1, 10);
  assert.deepEqual(region, { x: 1, y: 1, width: 2, height: 2 });
});


