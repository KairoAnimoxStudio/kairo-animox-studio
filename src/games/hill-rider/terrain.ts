import type {
  Collectible,
  MapSpec,
  Obstacle,
  SurfaceKind,
  TerrainFeatureType,
  TerrainPoint,
} from './types';

export const TERRAIN_STEP_X = 28;

export interface TerrainSample {
  y: number;
  slope: number;
  nx: number;
  ny: number;
  tx: number;
  ty: number;
  surface: SurfaceKind;
}

export interface TerrainWorld {
  map: MapSpec;
  points: TerrainPoint[];
  startX: number;
  collectibles: Collectible[];
  obstacles: Obstacle[];
  nextId: number;
  chunkIndex: number;
  lastFuelX: number;
  seed: number;
}

function seededRand(seedObj: { seed: number }): number {
  seedObj.seed = (seedObj.seed * 1664525 + 1013904223) >>> 0;
  return seedObj.seed / 4294967296;
}

export function createTerrainWorld(map: MapSpec, initialSeed = 42077): TerrainWorld {
  const world: TerrainWorld = {
    map,
    points: [],
    startX: -336,
    collectibles: [],
    obstacles: [],
    nextId: 1,
    chunkIndex: 0,
    lastFuelX: 160,
    seed: initialSeed >>> 0,
  };

  // Flat safe start zone (-336 to +392 px)
  const flatSteps = 26;
  const startSurface = defaultSurfaceForMap(map.id);
  for (let i = 0; i <= flatSteps; i++) {
    world.points.push({
      x: world.startX + i * TERRAIN_STEP_X,
      y: 0,
      surface: startSurface,
    });
  }

  // Place starter welcome coins ahead on runway
  for (let c = 0; c < 4; c++) {
    world.collectibles.push({
      id: world.nextId++,
      kind: 'coin',
      x: 240 + c * 42,
      y: -36,
      value: 25,
      collected: false,
      collectAnim: 0,
    });
  }

  ensureTerrainAhead(world, 2800);
  return world;
}

function defaultSurfaceForMap(mapId: string): SurfaceKind {
  switch (mapId) {
    case 'snow_mountain':
      return 'ice';
    case 'moon_surface':
      return 'moon';
    case 'volcano_road':
      return 'lava_rock';
    case 'night_city':
      return 'asphalt';
    case 'rocky_highlands':
      return 'rock';
    default:
      return 'dirt';
  }
}

const FEATURE_ROTATION: TerrainFeatureType[] = [
  'small_hill',
  'uneven',
  'steep_hill',
  'bridge',
  'ramp',
  'long_slope',
  'deep_valley',
  'rocky',
  'large_jump',
];

export function ensureTerrainAhead(world: TerrainWorld, targetX: number): void {
  while (world.points[world.points.length - 1].x < targetX) {
    appendNextChunk(world);
  }
}

function appendNextChunk(world: TerrainWorld): void {
  const last = world.points[world.points.length - 1];
  const prev = world.points[world.points.length - 2] ?? last;
  const prevSlope = (last.y - prev.y) / TERRAIN_STEP_X;
  const distFactor = Math.min(2.0, 1 + Math.max(0, last.x) / 14000);
  const amp = world.map.hillAmplitude * distFactor;
  const rough = world.map.roughness;
  const baseSurface = defaultSurfaceForMap(world.map.id);

  // Pick chunk type with early gentle ramp-up
  let feature: TerrainFeatureType;
  if (world.chunkIndex === 0) {
    feature = 'small_hill';
  } else if (world.chunkIndex === 1) {
    feature = 'uneven';
  } else {
    const r = Math.floor(seededRand(world) * FEATURE_ROTATION.length);
    feature = FEATURE_ROTATION[(r + world.chunkIndex) % FEATURE_ROTATION.length];
  }
  world.chunkIndex++;

  const stepCount =
    feature === 'long_slope'
      ? 34
      : feature === 'deep_valley' || feature === 'large_jump'
        ? 28
        : feature === 'bridge'
          ? 20
          : 22;

  const baseY = last.y;
  const chunkStartX = last.x;
  let currentSlope = prevSlope;

  // Height target offset for connected driveable curves
  for (let i = 1; i <= stepCount; i++) {
    const t = i / stepCount;
    const x = chunkStartX + i * TERRAIN_STEP_X;
    let y = baseY;
    let surface: SurfaceKind = baseSurface;

    switch (feature) {
      case 'small_hill': {
        y = baseY - Math.sin(t * Math.PI) * 58 * amp;
        break;
      }
      case 'steep_hill': {
        // Smooth S-curve climb then mild descent
        const climb = t < 0.65 ? Math.sin((t / 0.65) * (Math.PI * 0.5)) : 1 - 0.35 * Math.sin(((t - 0.65) / 0.35) * (Math.PI * 0.5));
        y = baseY - climb * 125 * amp;
        break;
      }
      case 'long_slope': {
        const wave = Math.sin(t * Math.PI * 2) * 26 * amp;
        y = baseY - t * 145 * amp + wave;
        break;
      }
      case 'deep_valley': {
        y = baseY + Math.sin(t * Math.PI) * 140 * amp;
        break;
      }
      case 'rocky': {
        const macro = -Math.sin(t * Math.PI) * 48 * amp;
        const bumps = Math.sin(t * Math.PI * 7) * 11 * rough + Math.cos(t * Math.PI * 11) * 6 * rough;
        y = baseY + macro + bumps * Math.sin(t * Math.PI);
        surface = world.map.id === 'snow_mountain' ? 'ice' : 'rock';
        break;
      }
      case 'uneven': {
        y = baseY + Math.sin(t * Math.PI * 3) * 30 * amp + Math.sin(t * Math.PI * 6) * 8 * rough * Math.sin(t * Math.PI);
        break;
      }
      case 'bridge': {
        // Gentle approach, flat timber/steel bridge span in middle, smooth exit
        if (t > 0.2 && t < 0.8) {
          y = baseY - 12 + Math.sin(((t - 0.2) / 0.6) * Math.PI) * 8;
          surface = 'bridge';
        } else {
          y = baseY - Math.sin(t * Math.PI) * 16;
        }
        break;
      }
      case 'ramp': {
        if (t < 0.45) {
          const u = t / 0.45;
          y = baseY - u * u * 75 * amp;
          surface = 'ramp';
        } else {
          const u = (t - 0.45) / 0.55;
          y = baseY - 75 * amp + Math.sin(u * Math.PI) * 65 * amp + u * 75 * amp;
        }
        break;
      }
      case 'large_jump': {
        if (t < 0.36) {
          const u = t / 0.36;
          y = baseY - u * u * 105 * amp;
          surface = 'ramp';
        } else if (t < 0.72) {
          const u = (t - 0.36) / 0.36;
          y = baseY - 105 * amp + Math.sin(u * Math.PI) * 125 * amp;
        } else {
          const u = (t - 0.72) / 0.28;
          y = baseY - 105 * amp + (1 - u) * 35 * amp;
        }
        break;
      }
    }

    // Clamp extreme instantaneous height jumps so slopes stay driveable
    const prevPt = world.points[world.points.length - 1];
    const maxDelta = TERRAIN_STEP_X * Math.min(0.92, 0.52 + distFactor * 0.16);
    const desiredDelta = y - prevPt.y;
    const blendedDelta = currentSlope * TERRAIN_STEP_X * 0.25 + desiredDelta * 0.75;
    const clampedDelta = Math.max(-maxDelta, Math.min(maxDelta, blendedDelta));
    const finalY = Math.max(-900, Math.min(520, prevPt.y + clampedDelta));
    currentSlope = (finalY - prevPt.y) / TERRAIN_STEP_X;

    world.points.push({ x, y: finalY, surface });
  }

  const endX = world.points[world.points.length - 1].x;
  populateChunkEntities(world, chunkStartX + 60, endX - 60, feature);
}

function populateChunkEntities(
  world: TerrainWorld,
  fromX: number,
  toX: number,
  feature: TerrainFeatureType
): void {
  // Coin group (arc or crest trail)
  const coinCount = feature === 'large_jump' || feature === 'ramp' ? 6 : 4;
  const span = Math.max(120, toX - fromX);
  for (let i = 0; i < coinCount; i++) {
    const cx = fromX + ((i + 0.5) / coinCount) * span * 0.72;
    const surf = sampleTerrain(world, cx);
    const lift = feature === 'large_jump' || feature === 'ramp'
      ? 72 + Math.sin(((i + 0.5) / coinCount) * Math.PI) * 70
      : 42;
    world.collectibles.push({
      id: world.nextId++,
      kind: 'coin',
      x: cx,
      y: surf.y - lift,
      value: 25,
      collected: false,
      collectAnim: 0,
    });
  }

  // Special reward gem on steep peaks or large jumps
  if ((feature === 'steep_hill' || feature === 'large_jump') && seededRand(world) < 0.75) {
    const gx = fromX + span * 0.52;
    const surf = sampleTerrain(world, gx);
    world.collectibles.push({
      id: world.nextId++,
      kind: 'gem',
      x: gx,
      y: surf.y - (feature === 'large_jump' ? 135 : 58),
      value: 150,
      collected: false,
      collectAnim: 0,
    });
  }

  // Fuel container placed reliably every ~680-820 px (~50-65 meters)
  const midX = (fromX + toX) * 0.5;
  if (midX - world.lastFuelX >= 680) {
    const fx = fromX + span * 0.8;
    const surf = sampleTerrain(world, fx);
    world.collectibles.push({
      id: world.nextId++,
      kind: 'fuel',
      x: fx,
      y: surf.y - 38,
      value: 48,
      collected: false,
      collectAnim: 0,
    });
    world.lastFuelX = fx;
  }

  // Dynamic obstacle on rocky/uneven/forest/city chunks
  if (
    world.chunkIndex >= 2 &&
    (feature === 'rocky' || feature === 'uneven' || feature === 'small_hill') &&
    seededRand(world) < 0.55
  ) {
    const ox = fromX + span * 0.45;
    const surf = sampleTerrain(world, ox);
    const kind =
      world.map.id === 'snow_mountain'
        ? 'ice_block'
        : world.map.id === 'forest_trail'
          ? 'log'
          : world.map.id === 'night_city'
            ? 'cone'
            : seededRand(world) < 0.5
              ? 'crate'
              : 'rock';
    const radius = kind === 'rock' ? 14 : kind === 'cone' ? 11 : 13;
    world.obstacles.push({
      id: world.nextId++,
      kind,
      x: ox,
      y: surf.y - radius,
      radius,
      vx: 0,
      vy: 0,
      angle: 0,
      hit: false,
    });
  }
}

export function sampleTerrain(world: TerrainWorld, x: number): TerrainSample {
  const pts = world.points;
  if (pts.length < 2) {
    return { y: 0, slope: 0, nx: 0, ny: -1, tx: 1, ty: 0, surface: 'dirt' };
  }

  const rel = (x - world.startX) / TERRAIN_STEP_X;
  const idx = Math.max(0, Math.min(pts.length - 2, Math.floor(rel)));
  const a = pts[idx];
  const b = pts[idx + 1];
  const localT = Math.max(0, Math.min(1, (x - a.x) / (b.x - a.x || TERRAIN_STEP_X)));
  const y = a.y + (b.y - a.y) * localT;
  const dx = b.x - a.x || TERRAIN_STEP_X;
  const dy = b.y - a.y;
  const slope = dy / dx;
  const len = Math.hypot(1, slope) || 1;
  const tx = 1 / len;
  const ty = slope / len;
  const nx = slope / len;
  const ny = -1 / len;

  return {
    y,
    slope,
    nx,
    ny,
    tx,
    ty,
    surface: localT < 0.5 ? a.surface : b.surface,
  };
}

export function pruneBehind(world: TerrainWorld, minKeepX: number): void {
  // Trim terrain points safely behind camera
  let trimCount = 0;
  while (
    world.points.length - trimCount > 40 &&
    world.points[trimCount + 1].x < minKeepX
  ) {
    trimCount++;
  }
  if (trimCount > 0) {
    world.points.splice(0, trimCount);
    world.startX = world.points[0].x;
  }

  world.collectibles = world.collectibles.filter(
    (c) => c.x >= minKeepX && (!c.collected || c.collectAnim < 1)
  );
  world.obstacles = world.obstacles.filter((o) => o.x >= minKeepX);
}
