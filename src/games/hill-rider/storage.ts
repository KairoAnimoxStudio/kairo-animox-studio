import { MAPS } from './maps';
import type { SaveData, UpgradeKey, UpgradeLevels } from './types';
import { getUpgradeCost, getVehicleById, MAX_UPGRADE_LEVEL, VEHICLES } from './vehicles';

export const HILL_RIDER_SAVE_KEY = 'kairo_extreme_hill_rider_save_v1';

export function defaultUpgrades(): UpgradeLevels {
  return { engine: 1, suspension: 1, tires: 1, fuel: 1 };
}

export function createInitialSaveData(): SaveData {
  const upgrades: Record<string, UpgradeLevels> = {};
  for (const v of VEHICLES) {
    upgrades[v.id] = defaultUpgrades();
  }
  const bestDistances: Record<string, number> = {};
  for (const m of MAPS) {
    bestDistances[m.id] = 0;
  }
  return {
    coins: 500,
    ownedVehicles: ['starter_jeep'],
    selectedVehicleId: 'starter_jeep',
    selectedMapId: 'green_valley',
    unlockedMaps: ['green_valley'],
    upgrades,
    bestDistances,
    audio: {
      musicVolume: 0.35,
      sfxVolume: 0.75,
      muted: false,
    },
    stats: {
      totalRuns: 0,
      totalDistance: 0,
      totalCoinsEarned: 0,
      totalFlips: 0,
      totalFuelPickups: 0,
    },
  };
}

export function normalizeSaveData(raw: unknown): SaveData {
  const base = createInitialSaveData();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Partial<SaveData>;

  const ownedSet = new Set<string>(Array.isArray(obj.ownedVehicles) ? obj.ownedVehicles : []);
  ownedSet.add('starter_jeep');

  const unlockedSet = new Set<string>(Array.isArray(obj.unlockedMaps) ? obj.unlockedMaps : []);
  unlockedSet.add('green_valley');

  const upgrades = { ...base.upgrades };
  if (obj.upgrades && typeof obj.upgrades === 'object') {
    for (const v of VEHICLES) {
      const u = obj.upgrades[v.id];
      if (u && typeof u === 'object') {
        upgrades[v.id] = {
          engine: clampLvl(u.engine),
          suspension: clampLvl(u.suspension),
          tires: clampLvl(u.tires),
          fuel: clampLvl(u.fuel),
        };
      }
    }
  }

  const bestDistances = { ...base.bestDistances };
  if (obj.bestDistances && typeof obj.bestDistances === 'object') {
    for (const m of MAPS) {
      const d = Number(obj.bestDistances[m.id]);
      if (Number.isFinite(d) && d >= 0) bestDistances[m.id] = Math.round(d);
    }
  }

  const selectedVehicleId =
    typeof obj.selectedVehicleId === 'string' && ownedSet.has(obj.selectedVehicleId)
      ? obj.selectedVehicleId
      : 'starter_jeep';
  const selectedMapId =
    typeof obj.selectedMapId === 'string' && unlockedSet.has(obj.selectedMapId)
      ? obj.selectedMapId
      : 'green_valley';

  return {
    coins: Math.max(0, Math.round(Number(obj.coins) || 0)),
    ownedVehicles: Array.from(ownedSet),
    selectedVehicleId,
    selectedMapId,
    unlockedMaps: Array.from(unlockedSet),
    upgrades,
    bestDistances,
    audio: {
      musicVolume: clampUnit(obj.audio?.musicVolume, 0.35),
      sfxVolume: clampUnit(obj.audio?.sfxVolume, 0.75),
      muted: Boolean(obj.audio?.muted),
    },
    stats: {
      totalRuns: Math.max(0, Math.round(Number(obj.stats?.totalRuns) || 0)),
      totalDistance: Math.max(0, Math.round(Number(obj.stats?.totalDistance) || 0)),
      totalCoinsEarned: Math.max(0, Math.round(Number(obj.stats?.totalCoinsEarned) || 0)),
      totalFlips: Math.max(0, Math.round(Number(obj.stats?.totalFlips) || 0)),
      totalFuelPickups: Math.max(0, Math.round(Number(obj.stats?.totalFuelPickups) || 0)),
    },
  };
}

function clampLvl(v: unknown): number {
  const n = Math.round(Number(v) || 1);
  return Math.max(1, Math.min(MAX_UPGRADE_LEVEL, n));
}

function clampUnit(v: unknown, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

export function loadSaveData(): SaveData {
  try {
    const str = localStorage.getItem(HILL_RIDER_SAVE_KEY);
    if (!str) return createInitialSaveData();
    return normalizeSaveData(JSON.parse(str));
  } catch {
    return createInitialSaveData();
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    localStorage.setItem(HILL_RIDER_SAVE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

export function purchaseVehicle(save: SaveData, vehicleId: string): boolean {
  if (save.ownedVehicles.includes(vehicleId)) {
    save.selectedVehicleId = vehicleId;
    return true;
  }
  const spec = getVehicleById(vehicleId);
  if (spec.id !== vehicleId || save.coins < spec.price) return false;
  save.coins -= spec.price;
  save.ownedVehicles.push(vehicleId);
  save.selectedVehicleId = vehicleId;
  return true;
}

export function purchaseUpgrade(save: SaveData, vehicleId: string, key: UpgradeKey): boolean {
  if (!save.ownedVehicles.includes(vehicleId)) return false;
  const levels = save.upgrades[vehicleId] ?? defaultUpgrades();
  const current = levels[key];
  if (current >= MAX_UPGRADE_LEVEL) return false;
  const cost = getUpgradeCost(key, current);
  if (save.coins < cost) return false;
  save.coins -= cost;
  levels[key] = current + 1;
  save.upgrades[vehicleId] = levels;
  return true;
}

export function unlockMapWithCoins(save: SaveData, mapId: string): boolean {
  if (save.unlockedMaps.includes(mapId)) {
    save.selectedMapId = mapId;
    return true;
  }
  const map = MAPS.find((m) => m.id === mapId);
  if (!map || save.coins < map.unlockCost) return false;
  save.coins -= map.unlockCost;
  save.unlockedMaps.push(mapId);
  save.selectedMapId = mapId;
  return true;
}

export function checkDistanceMilestones(save: SaveData): string[] {
  const maxBest = Math.max(0, ...Object.values(save.bestDistances));
  const newlyUnlocked: string[] = [];
  for (const m of MAPS) {
    if (!save.unlockedMaps.includes(m.id) && m.unlockDistanceMilestone > 0 && maxBest >= m.unlockDistanceMilestone) {
      save.unlockedMaps.push(m.id);
      newlyUnlocked.push(m.id);
    }
  }
  return newlyUnlocked;
}
