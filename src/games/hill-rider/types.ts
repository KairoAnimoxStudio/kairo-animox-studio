export type GameScreenState =
  | 'loading'
  | 'title'
  | 'garage'
  | 'maps'
  | 'upgrades'
  | 'settings'
  | 'stats'
  | 'playing'
  | 'paused'
  | 'gameover';

export type UpgradeKey = 'engine' | 'suspension' | 'tires' | 'fuel';

export interface UpgradeLevels {
  engine: number;
  suspension: number;
  tires: number;
  fuel: number;
}

export interface VehicleSpec {
  id: string;
  name: string;
  tagline: string;
  price: number;
  mass: number;
  enginePower: number;
  maxSpeed: number;
  suspensionStiffness: number;
  suspensionDamping: number;
  suspensionRest: number;
  wheelRadius: number;
  wheelBase: number;
  wheelGrip: number;
  airControl: number;
  fuelCapacity: number;
  roofHeight: number;
  bodyColor: string;
  accentColor: string;
  shape: 'jeep' | 'sports' | 'monster' | 'bike' | 'buggy' | 'truck' | 'supercar' | 'rally';
}

export type TerrainFeatureType =
  | 'small_hill'
  | 'steep_hill'
  | 'long_slope'
  | 'deep_valley'
  | 'rocky'
  | 'uneven'
  | 'bridge'
  | 'ramp'
  | 'large_jump';

export type SurfaceKind = 'dirt' | 'rock' | 'bridge' | 'ramp' | 'ice' | 'asphalt' | 'moon' | 'lava_rock';

export interface TerrainPoint {
  x: number;
  y: number;
  surface: SurfaceKind;
}

export interface Collectible {
  id: number;
  kind: 'coin' | 'gem' | 'fuel';
  x: number;
  y: number;
  value: number;
  collected: boolean;
  collectAnim: number;
}

export interface Obstacle {
  id: number;
  kind: 'crate' | 'rock' | 'log' | 'ice_block' | 'cone';
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  angle: number;
  hit: boolean;
}

export interface MapSpec {
  id: string;
  name: string;
  description: string;
  unlockCost: number;
  unlockDistanceMilestone: number;
  gravityScale: number;
  frictionMultiplier: number;
  roughness: number;
  hillAmplitude: number;
  skyTop: string;
  skyBottom: string;
  horizonColor: string;
  mountainFar: string;
  mountainNear: string;
  terrainTop: string;
  terrainFill: string;
  terrainStroke: string;
  weather: 'breeze' | 'sand' | 'snow' | 'leaves' | 'embers' | 'stars' | 'rain_neon' | 'mist';
  lighting: 'day' | 'sunset' | 'alpine' | 'forest' | 'volcanic' | 'lunar' | 'night' | 'overcast';
}

export interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

export interface PlayerStats {
  totalRuns: number;
  totalDistance: number;
  totalCoinsEarned: number;
  totalFlips: number;
  totalFuelPickups: number;
}

export interface SaveData {
  coins: number;
  ownedVehicles: string[];
  selectedVehicleId: string;
  selectedMapId: string;
  unlockedMaps: string[];
  upgrades: Record<string, UpgradeLevels>;
  bestDistances: Record<string, number>;
  audio: AudioSettings;
  stats: PlayerStats;
}

export interface RunSummary {
  mapId: string;
  vehicleId: string;
  distance: number;
  bestBefore: number;
  isNewRecord: boolean;
  coinsCollected: number;
  stuntBonusCoins: number;
  distanceBonusCoins: number;
  totalRewardCoins: number;
  flips: number;
  airTimeSeconds: number;
  reason: 'crash' | 'out_of_fuel';
}
