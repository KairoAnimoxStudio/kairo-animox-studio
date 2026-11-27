export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function createStoredZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.data;
    const crc = crc32(data);

    // Local file header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // Local header signature
    lv.setUint16(4, 20, true); // Version needed to extract (2.0)
    lv.setUint16(6, 0x0800, true); // UTF-8 filename flag
    lv.setUint16(8, 0, true); // Compression method: 0 (store)
    lv.setUint16(10, 0, true); // Mod time
    lv.setUint16(12, 0x5421, true); // Mod date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // Extra length
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, data);

    // Central directory header (46 bytes + filename)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true); // Central header signature
    cv.setUint16(4, 20, true); // Version made by
    cv.setUint16(6, 20, true); // Version needed
    cv.setUint16(8, 0x0800, true); // UTF-8 flag
    cv.setUint16(10, 0, true); // Store
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x5421, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true); // Relative offset of local header
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, p) => sum + p.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // EOCD signature
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalSize = offset + centralSize + eocd.length;
  const out = new Uint8Array(totalSize);
  let cursor = 0;
  for (const part of localParts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralParts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  out.set(eocd, cursor);
  return out;
}

export function buildStandaloneHtml(opts: {
  html: string;
  css: string;
  js: string;
  logoDataUrl?: string;
}): string {
  const safeCss = opts.css.replace(/<\/style/gi, '<\\/style');
  const safeJs = opts.js.replace(/<\/script/gi, '<\\/script');

  let out = opts.html;

  // Inline stylesheet
  out = out.replace(
    /<link\s+rel=["']stylesheet["']\s+href=["']studio\.css["']\s*\/?>/i,
    `<style>\n${safeCss}\n</style>`
  );

  // Strip manifest/sw assets that aren't needed in file:// standalone mode
  out = out.replace(/<link\s+rel=["']manifest["'][^>]*>\s*/gi, '');
  out = out.replace(/<link\s+rel=["']apple-touch-icon["'][^>]*>\s*/gi, '');

  // Embed logo asset if provided
  if (opts.logoDataUrl) {
    out = out.split('images/logo/kairo-logo.png').join(opts.logoDataUrl);
  }

  // Inline bundled IIFE script and mark standalone offline mode
  out = out.replace(
    /<script[^>]*src=["']studio\/kairo-art-studio\.js["'][^>]*><\/script>/i,
    `<script>\nwindow.__KAS_STANDALONE_OFFLINE__ = true;\n${safeJs}\n</script>`
  );

  return out;
}

export function buildWindowsBatLauncher(target: string, isLocalHtml: boolean): string {
  const lines = [
    '@echo off',
    'setlocal EnableDelayedExpansion',
    'title KAIRO ART STUDIO - Windows Launcher',
  ];

  if (isLocalHtml) {
    lines.push(
      `set "STUDIO_FILE=%~dp0${target}"`,
      'if not exist "%STUDIO_FILE%" (',
      '  echo Could not find %STUDIO_FILE%',
      '  pause',
      '  exit /b 1',
      ')',
      'set "APP_URL=file:///%STUDIO_FILE:\\=/%?autostart=1"'
    );
  } else {
    lines.push(`set "APP_URL=${target}"`);
  }

  lines.push(
    'set "BROWSER="',
    'if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"',
    'if not defined BROWSER if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" set "BROWSER=%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"',
    'if not defined BROWSER if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" set "BROWSER=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"',
    'if not defined BROWSER if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"',
    'if not defined BROWSER if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" set "BROWSER=%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"',
    'if defined BROWSER (',
    '  start "" "!BROWSER!" --app="!APP_URL!" --window-size=1440,900',
    ') else (',
    isLocalHtml ? '  start "" "%STUDIO_FILE%"' : '  start "" "%APP_URL%"',
    ')',
    'endlocal'
  );

  return lines.join('\r\n') + '\r\n';
}

export function buildWindowsReadme(): string {
  return [
    'KAIRO ART STUDIO - Windows Portable Software Edition',
    '====================================================',
    '',
    'How to run KAIRO ART STUDIO as a Windows Desktop App:',
    '1. Right-click this ZIP file and select "Extract All..." to a folder on your PC.',
    '2. Double-click "Launch-Kairo-Art-Studio.bat" to open KAIRO ART STUDIO in its own',
    '   dedicated Windows app window (works 100% offline, no internet required).',
    '3. Optional Desktop Shortcut: Right-click "Launch-Kairo-Art-Studio.bat" ->',
    '   Show more options -> Send to -> Desktop (create shortcut).',
    '4. You can also open "Kairo-Art-Studio.html" directly in any modern browser.',
    '',
    'Features included offline:',
    '- Digital Painting (20 Brush Presets + Stabilization + Color Wheel)',
    '- Multi-Layer Engine (17 Blend Modes, Alpha Lock, Clipping)',
    '- 2D Frame-by-Frame Animation Timeline, Onion Skinning & GIF/PNG Export',
    '- Manga / Comic Panel Templates & Editable Speech Bubbles',
    '- Native .kas Project Save & Open',
    '',
  ].join('\r\n');
}
