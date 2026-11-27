# KAIRO ANIMOX & KAIRO ART STUDIO

Creative Creator Universe portal and **KAIRO ART STUDIO**, a digital painting, manga/comic creation, and 2D animation studio supporting browser, PWA, and standalone offline Windows distribution.

## KAIRO ART STUDIO UI & Architecture

### Unified Vector Icon System
- **Local SVG Library**: `/resources/icons/{toolbar,tools,layers,brushes,colors,animation,menus,dialogs,navigation,status}/*.svg`
- **Central Icon Registry**: `src/studio/iconRegistry.ts` provides a crisp 24×24 viewBox SVG registry (`1.85` stroke weight, rounded caps/joins, `currentColor` inheritance) hydrated inline for online, PWA offline, and single-file Windows HTML builds.
- **Standardized Sizing**:
  - `28 × 28 px`: Welcome screen workspace action cards
  - `24 × 24 px`: Main toolbar & left drawing tool rail + tool flyouts
  - `18 × 18 px`: Menu bar triggers/commands, dock panel actions, timeline toolbar, and dialog headers/actions
  - `16 × 16 px`: Inline micro-controls, layer visibility/type/lock icons, search & status badges
- **Themes & Semantic States**: Dark (`default`) and Light (`data-theme="light"`) palettes with blue hover highlights, electric-blue active selections, orange secondary accents, muted disabled icons, and red destructive buttons.

### Menus, Toolbars & Drawing Tools
- **12 Top Application Menus** (`src/studio/uiDefinitions.ts`): `File`, `Edit`, `View`, `Canvas`, `Layer`, `Select`, `Filter`, `Animation`, `Comic`, `Window`, `Tools`, `Help`.
- **27 Drawing Tools with Flyout Tool Groups**:
  - `Move`, `Transform`
  - `Brush` group (`Brush`, `Airbrush`, `Watercolor`, `Blend`), `Pencil`
  - `Pen` group (`Pen`, `Vector Pen`), `Eraser`, `Fill`, `Eyedropper`
  - `Selection` group (`Rectangle Selection`, `Ellipse Selection`, `Lasso`, `Polygon Selection`, `Magic Wand`)
  - `Shape` group (`Rectangle`, `Ellipse`, `Line`, `Polygon`, `Curve`)
  - `Gradient`, `Text`, `Comic`, `Symmetry Tool`
  - `Hand`, `Zoom`
- **Canvas View & Overlays**: Pixel Grid, dynamic Top/Left Rulers, Rule-of-Thirds Guides, Mirror Symmetry axis, Canvas Rotation, Horizontal/Vertical Flip, Full Screen, and Multi-Document tabs.

### Panels, Animation Timeline & Filters
- **Layers**: Raster, Vector, Group, and Mask layers, Blend Modes (17), Alpha Lock, Clipping Mask, Duplicate, Merge Down, Merge Visible, Group/Ungroup, Show/Hide, Lock/Unlock.
- **Brushes & Colors**: 20 built-in presets + custom brush New/Duplicate/Delete/Import/Export/Favorites/Dynamics Settings/Reset, HSV color wheel + palette add/remove/save/import (`.json`, `.gpl`, hex)/export.
- **Animation Timeline**: Playback (`Play`/`Pause`, `Stop`, `Loop`, FPS presets), Frame navigation/editing (`Add`, `Duplicate`, `Copy`/`Paste Frame`, `Extend`/`Shorten Exposure`, `Clear`, `Delete`), Animation Tracks (`Add`, `Delete`, `Move Up`/`Down`), Prev/Next Onion Skinning, Camera Bounds, Timeline Zoom, Audio Waveform import/visibility toggle, and Animated GIF / PNG Sequence export.
- **Native Packaging**: `.kas` project save/open, crash recovery autosave, and offline Windows Portable `.zip` / Single-file `.html` / `.bat` launcher.

## KaiPlay Playable Games (`/kaiplay.html`)

### 1. EXTREME HILL RIDER (`/extreme-hill-rider.html`)
2D physics-based hill-climbing racing game powered by rigid-body dynamics, two-wheel spring-damper suspension, terrain friction, airborne flip physics, and rollover detection.
- **8 Unlockable Vehicles**: Starter Jeep, Dirt Bike, Racing Buggy, Sports Car, Rally Car, Monster Truck, Heavy Truck, and Supercar — each with unique mass, torque curve, max speed, suspension travel/damping, wheel grip, air pitch torque, and fuel tank capacity.
- **4 Upgrade Systems (Levels 1–5)**: Engine, Suspension, Tires, and Fuel Capacity.
- **8 Dynamic Maps**: Green Valley, Desert Canyon, Snow Mountain, Forest Trail, Volcano Road, Moon Surface (low gravity), Night City, and Rocky Highlands — unlockable via coins or distance milestones.
- **Procedural Infinite Terrain & Collectibles**: Continuous Hills, Steep Climbs, Long Slopes, Deep Valleys, Bridges, Ramps, Large Jumps, dynamic obstacles (crates, rocks, logs, ice blocks, cones), coins, gems, and fuel canisters with automatic behind-camera pruning.
- **Controls**:
  - Desktop: `ArrowRight` / `D` / `W` to accelerate (pitch forward in air), `ArrowLeft` / `A` / `S` to brake/reverse (pitch back in air), `Esc` or `P` to pause, `R` for quick restart.
  - Mobile / Touch: On-screen multitouch `BRAKE` and `GAS` pedals.
- **Audio & Persistence**: Synthesized Web Audio engine RPM sound, stunts, pickups, crash SFX, ambient music loop with independent Music/SFX volume sliders & mute toggle, plus automatic `localStorage` save progress.

### 2. TIK-TAK-TOE (`/tic-tac-toe.html`)
Playable strategy game supporting **Vs Smart AI** (Easy, Medium, and Unbeatable Minimax) and **2-Player Local Mode** on **3×3** and **4×4** grids, SVG winning-line highlight, keyboard controls (`1`–`9`, `R`, `Enter`), audio feedback, and persistent match scores.

## Local Installation, Testing & GitHub Pages Deployment

### Run & Test Locally
```bash
npm install
npm test        # Runs unit tests for studio & KaiPlay game engines
npm run lint    # TypeScript typecheck + server syntax validation
npm run build   # Bundles TypeScript sources into public/ and dist/
npm run dev     # Builds and starts the local server on http://localhost:3000
```

### Static Hosting / GitHub Pages
All KaiPlay games and frontend views run completely client-side with zero backend database requirement (`localStorage` handles persistence):
1. Run `npm run build` so `public/games/hill-rider.js`, `public/games/tic-tac-toe.js`, and `public/studio/kairo-art-studio.js` are generated.
2. Copy static site files along with `public/*` into a deployment folder (for example: `mkdir -p docs && cp -r *.html *.css images resources manifest.webmanifest sw.js public/* docs/`).
3. Push `docs/` (or deploy the merged artifact in GitHub Actions) and enable **Settings → Pages → Deploy from a branch (`docs/`)** in your repository.