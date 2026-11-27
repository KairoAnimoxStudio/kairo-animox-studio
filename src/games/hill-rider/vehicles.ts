import type { UpgradeKey, UpgradeLevels, VehicleSpec } from './types';

export const MAX_UPGRADE_LEVEL = 5;

export const VEHICLES: VehicleSpec[] = [
  {
    id: 'starter_jeep',
    name: 'Starter Jeep',
    tagline: 'Balanced 4x4 trail climber with dependable suspension.',
    price: 0,
    mass: 1.0,
    enginePower: 1.0,
    maxSpeed: 28,
    suspensionStiffness: 1.0,
    suspensionDamping: 1.0,
    suspensionRest: 24,
    wheelRadius: 21,
    wheelBase: 86,
    wheelGrip: 1.0,
    airControl: 1.0,
    fuelCapacity: 100,
    roofHeight: 40,
    bodyColor: '#EF4444',
    accentColor: '#F8FAFC',
    shape: 'jeep',
  },
  {
    id: 'dirt_bike',
    name: 'Dirt Bike',
    tagline: 'Featherweight motocross frame built for huge flips.',
    price: 1200,
    mass: 0.72,
    enginePower: 1.15,
    maxSpeed: 33,
    suspensionStiffness: 0.92,
    suspensionDamping: 0.88,
    suspensionRest: 26,
    wheelRadius: 20,
    wheelBase: 76,
    wheelGrip: 1.06,
    airControl: 1.65,
    fuelCapacity: 88,
    roofHeight: 38,
    bodyColor: '#F97316',
    accentColor: '#1E293B',
    shape: 'bike',
  },
  {
    id: 'racing_buggy',
    name: 'Racing Buggy',
    tagline: 'Long-travel desert cage that soaks up deep jumps.',
    price: 2600,
    mass: 0.88,
    enginePower: 1.24,
    maxSpeed: 35,
    suspensionStiffness: 1.18,
    suspensionDamping: 1.15,
    suspensionRest: 30,
    wheelRadius: 22,
    wheelBase: 92,
    wheelGrip: 1.14,
    airControl: 1.32,
    fuelCapacity: 105,
    roofHeight: 39,
    bodyColor: '#06B6D4',
    accentColor: '#FACC15',
    shape: 'buggy',
  },
  {
    id: 'sports_car',
    name: 'Sports Car',
    tagline: 'Low-slung street coupe with sharp high-speed acceleration.',
    price: 4200,
    mass: 1.04,
    enginePower: 1.4,
    maxSpeed: 42,
    suspensionStiffness: 1.28,
    suspensionDamping: 1.08,
    suspensionRest: 18,
    wheelRadius: 19,
    wheelBase: 94,
    wheelGrip: 1.18,
    airControl: 0.92,
    fuelCapacity: 98,
    roofHeight: 33,
    bodyColor: '#3B82F6',
    accentColor: '#E2E8F0',
    shape: 'sports',
  },
  {
    id: 'rally_car',
    name: 'Rally Car',
    tagline: 'All-wheel gravel specialist with relentless slope traction.',
    price: 6500,
    mass: 1.06,
    enginePower: 1.46,
    maxSpeed: 40,
    suspensionStiffness: 1.24,
    suspensionDamping: 1.22,
    suspensionRest: 24,
    wheelRadius: 21,
    wheelBase: 92,
    wheelGrip: 1.35,
    airControl: 1.15,
    fuelCapacity: 112,
    roofHeight: 37,
    bodyColor: '#22C55E',
    accentColor: '#0F172A',
    shape: 'rally',
  },
  {
    id: 'monster_truck',
    name: 'Monster Truck',
    tagline: 'Oversized knobby tires crush boulders and steep craters.',
    price: 9000,
    mass: 1.45,
    enginePower: 1.56,
    maxSpeed: 34,
    suspensionStiffness: 1.38,
    suspensionDamping: 1.3,
    suspensionRest: 34,
    wheelRadius: 31,
    wheelBase: 102,
    wheelGrip: 1.32,
    airControl: 0.95,
    fuelCapacity: 122,
    roofHeight: 48,
    bodyColor: '#A855F7',
    accentColor: '#FDE047',
    shape: 'monster',
  },
  {
    id: 'heavy_truck',
    name: 'Heavy Truck',
    tagline: 'High-torque diesel hauler with giant fuel reserves.',
    price: 12000,
    mass: 1.65,
    enginePower: 1.68,
    maxSpeed: 33,
    suspensionStiffness: 1.45,
    suspensionDamping: 1.35,
    suspensionRest: 27,
    wheelRadius: 25,
    wheelBase: 114,
    wheelGrip: 1.28,
    airControl: 0.72,
    fuelCapacity: 145,
    roofHeight: 46,
    bodyColor: '#EAB308',
    accentColor: '#1E293B',
    shape: 'truck',
  },
  {
    id: 'supercar',
    name: 'Supercar',
    tagline: 'Hyper-tuned mid-engine rocket built for record speed.',
    price: 16500,
    mass: 0.96,
    enginePower: 1.82,
    maxSpeed: 49,
    suspensionStiffness: 1.35,
    suspensionDamping: 1.2,
    suspensionRest: 19,
    wheelRadius: 20,
    wheelBase: 98,
    wheelGrip: 1.34,
    airControl: 1.18,
    fuelCapacity: 115,
    roofHeight: 31,
    bodyColor: '#F43F5E',
    accentColor: '#F8FAFC',
    shape: 'supercar',
  },
];

export function getVehicleById(id: string): VehicleSpec {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
}

export function getUpgradeCost(key: UpgradeKey, currentLevel: number): number {
  const baseCost: Record<UpgradeKey, number> = {
    engine: 250,
    suspension: 220,
    tires: 220,
    fuel: 180,
  };
  return Math.round(baseCost[key] * Math.pow(1.65, currentLevel - 1));
}

export interface ComputedVehicleStats {
  mass: number;
  engineTorque: number;
  maxSpeed: number;
  suspensionK: number;
  suspensionDamp: number;
  suspensionRest: number;
  wheelGrip: number;
  airTorque: number;
  fuelCapacity: number;
}

export function computeEffectiveVehicleStats(
  spec: VehicleSpec,
  levels: UpgradeLevels
): ComputedVehicleStats {
  const eng = Math.max(1, levels.engine) - 1;
  const sus = Math.max(1, levels.suspension) - 1;
  const tir = Math.max(1, levels.tires) - 1;
  const ful = Math.max(1, levels.fuel) - 1;

  return {
    mass: spec.mass,
    engineTorque: spec.enginePower * (1 + eng * 0.14),
    maxSpeed: spec.maxSpeed * (1 + eng * 0.08),
    suspensionK: spec.suspensionStiffness * (1 + sus * 0.12),
    suspensionDamp: spec.suspensionDamping * (1 + sus * 0.16),
    suspensionRest: spec.suspensionRest + sus * 1.4,
    wheelGrip: spec.wheelGrip * (1 + tir * 0.14),
    airTorque: spec.airControl * (1 + tir * 0.05),
    fuelCapacity: Math.round(spec.fuelCapacity * (1 + ful * 0.16)),
  };
}
