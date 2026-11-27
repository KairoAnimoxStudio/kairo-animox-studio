import express from 'express';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPkgPath = path.join(__dirname, 'dist', 'windowsPackage.mjs');
const studioJsPath = path.join(__dirname, 'public', 'studio', 'kairo-art-studio.js');
const tttJsPath = path.join(__dirname, 'public', 'games', 'tic-tac-toe.js');
const hillJsPath = path.join(__dirname, 'public', 'games', 'hill-rider.js');
if (
  !fs.existsSync(distPkgPath) ||
  !fs.existsSync(studioJsPath) ||
  !fs.existsSync(tttJsPath) ||
  !fs.existsSync(hillJsPath)
) {
  execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
}

const {
  buildStandaloneHtml,
  buildWindowsBatLauncher,
  buildWindowsReadme,
  createStoredZip,
} = await import('./dist/windowsPackage.mjs');

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use((req, res, next) => {
  const blockedPrefixes = ['/src/', '/dist/', '/.playwright-cli/', '/.git/'];
  const blockedExact = [
    '/server.js',
    '/package.json',
    '/package-lock.json',
    '/metadata.json',
    '/tsconfig.json',
  ];
  if (
    blockedExact.includes(req.path) ||
    blockedPrefixes.some((p) => req.path.startsWith(p))
  ) {
    return res.status(404).send('Not Found');
  }
  next();
});

function generateStandaloneStudioHtml() {
  const html = fs.readFileSync(path.join(__dirname, 'kairo-art-studio.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, 'studio.css'), 'utf8');
  const js = fs.readFileSync(
    path.join(__dirname, 'public', 'studio', 'kairo-art-studio.js'),
    'utf8'
  );

  let logoDataUrl = '';
  try {
    const logoBytes = fs.readFileSync(
      path.join(__dirname, 'images', 'logo', 'kairo-logo.png')
    );
    logoDataUrl = `data:image/png;base64,${logoBytes.toString('base64')}`;
  } catch {
    logoDataUrl = '';
  }

  return buildStandaloneHtml({ html, css, js, logoDataUrl });
}

app.get('/api/download/standalone-html', (_req, res) => {
  try {
    const standaloneHtml = generateStandaloneStudioHtml();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Kairo-Art-Studio-Offline.html"'
    );
    res.send(standaloneHtml);
  } catch (err) {
    console.error('Standalone HTML build failed:', err);
    res.status(500).send('Unable to build standalone package');
  }
});

app.get('/api/download/windows-launcher', (req, res) => {
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('host') || `localhost:${PORT}`;
  const appUrl = `${proto}://${host}/kairo-art-studio.html?autostart=1`;
  const bat = buildWindowsBatLauncher(appUrl, false);

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="Launch-Kairo-Art-Studio-Online.bat"'
  );
  res.send(Buffer.from(bat, 'utf8'));
});

app.get('/api/download/windows-zip', (_req, res) => {
  try {
    const encoder = new TextEncoder();
    const standaloneHtml = generateStandaloneStudioHtml();
    const batLauncher = buildWindowsBatLauncher('Kairo-Art-Studio.html', true);
    const readme = buildWindowsReadme();

    const zipBytes = createStoredZip([
      {
        name: 'Kairo-Art-Studio-Windows/Kairo-Art-Studio.html',
        data: encoder.encode(standaloneHtml),
      },
      {
        name: 'Kairo-Art-Studio-Windows/Launch-Kairo-Art-Studio.bat',
        data: encoder.encode(batLauncher),
      },
      {
        name: 'Kairo-Art-Studio-Windows/README-Windows.txt',
        data: encoder.encode(readme),
      },
    ]);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Kairo-Art-Studio-Windows-Portable.zip"'
    );
    res.send(Buffer.from(zipBytes));
  } catch (err) {
    console.error('Windows ZIP build failed:', err);
    res.status(500).send('Unable to build Windows package');
  }
});

app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'ignore' }));
app.use(express.static(__dirname, { dotfiles: 'ignore' }));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`KAIRO ANIMOX static server running at http://${HOST}:${PORT}`);
});
