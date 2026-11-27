import test from 'node:test';
import assert from 'node:assert/strict';

import { getMapById, MAPS } from './maps';
import {
  createInitialPhysicsState,
  stepVehiclePhysics,
} from './physics';
import {
  checkDistanceMilestones,
  createInitialSaveData,
  defaultUpgrades,
  normalizeSaveData,
  purchaseUpgrade,
  purchaseVehicle,
  unlockMapWithCoins,
} from './storage';
import {
  createTerrainWorld,
  ensureTerrainAhead,
  pruneBehind,
  sampleTerrain,
} from './terrain';
import {
  computeEffectiveVehicleStats,
  getUpgradeCost,
  getVehicleById,
  MAX_UPGRADE_LEVEL,
  VEHICLES,
} from './vehicles';

test('catalog includes all 8 distinct vehicles and 8 distinct maps', () => {
  assert.equal(VEHICLES.length, 8);
  assert.equal(MAPS.length, 8);

  const vehicleIds = new Set(VEHICLES.map((v) => v.id));
  const mapIds = new Set(MAPS.map((m) => m.id));
  assert.equal(vehicleIds.size, 8);
  assert.equal(mapIds.size, 8);

  const jeep = getVehicleById('starter_jeep');
  const bike = getVehicleById('dirt_bike');
  const monster = getVehicleById('monster_truck');
  const supercar = getVehicleById('supercar');

  assert.ok(bike.airControl > monster.airControl);
  assert.ok(supercar.maxSpeed > jeep.maxSpeed);
  assert.ok(monster.wheelRadius > jeep.wheelRadius);
});

test('vehicle upgrades strictly improve performance stats', () => {
  const jeep = getVehicleById('starter_jeep');
  const baseStats = computeEffectiveVehicleStats(jeep, defaultUpgrades());
  const maxedStats = computeEffectiveVehicleStats(jeep, {
    engine: MAX_UPGRADE_LEVEL,
    suspension: MAX_UPGRADE_LEVEL,
    tires: MAX_UPGRADE_LEVEL,
    fuel: MAX_UPGRADE_LEVEL,
  });

  assert.ok(maxedStats.engineTorque > baseStats.engineTorque);
  assert.ok(maxedStats.maxSpeed > baseStats.maxSpeed);
  assert.ok(maxedStats.suspensionK > baseStats.suspensionK);
  assert.ok(maxedStats.suspensionDamp > baseStats.suspensionDamp);
  assert.ok(maxedStats.wheelGrip > baseStats.wheelGrip);
  assert.ok(maxedStats.fuelCapacity > baseStats.fuelCapacity);
});

test('terrain generates flat starting runway, connects smoothly, and prunes behind camera', () => {
  const map = getMapById('green_valley');
  const world = createTerrainWorld(map, 12345);

  const startSample = sampleTerrain(world, 0);
  const runwaySample = sampleTerrain(world, 200);
  assert.equal(startSample.y, 0);
  assert.equal(runwaySample.y, 0);

  ensureTerrainAhead(world, 6000);
  assert.ok(world.points[world.points.length - 1].x >= 6000);

  // Verify collectibles including fuel spawned ahead
  const fuelPickups = world.collectibles.filter((c) => c.kind === 'fuel');
  const coinPickups = world.collectibles.filter((c) => c.kind === 'coin');
  assert.ok(fuelPickups.length >= 3);
  assert.ok(coinPickups.length >= 15);

  // Prune behind camera
  const prevLen = world.points.length;
  pruneBehind(world, 3000);
  assert.ok(world.points.length < prevLen);
  assert.ok(world.points[0].x >= 2900);
  assert.ok(world.collectibles.every((c) => c.x >= 3000 || c.collectAnim < 1));
});

test('physics engine accelerates forward with gas, brakes/reverses, and stays stable idle', () => {
  const jeep = getVehicleById('starter_jeep');
  const map = getMapById('green_valley');
  const upgrades = defaultUpgrades();
  const world = createTerrainWorld(map, 42);

  // Idle stability check (no input for 2 seconds)
  const idleState = createInitialPhysicsState(jeep, upgrades);
  for (let i = 0; i < 120; i++) {
    stepVehiclePhysics(idleState, world, jeep, upgrades, map, { gas: false, brake: false }, 1 / 60);
  }
  assert.equal(idleState.crashed, false);
  assert.ok(Math.abs(idleState.x - 40) < 25);

  // Gas acceleration check
  const driveState = createInitialPhysicsState(jeep, upgrades);
  const startFuel = driveState.fuel;
  for (let i = 0; i < 180; i++) {
    ensureTerrainAhead(world, driveState.x + 2500);
    stepVehiclePhysics(driveState, world, jeep, upgrades, map, { gas: true, brake: false }, 1 / 60);
  }
  assert.ok(driveState.x > 350, `Expected forward progress, got x=${driveState.x}`);
  assert.ok(driveState.distanceMeters > 20);
  assert.ok(driveState.fuel < startFuel);
  assert.ok(driveState.coinsCollected >= 100, 'Expected collecting starter runway coins');

  // Braking slows positive velocity
  const speedBeforeBrake = driveState.vx;
  for (let i = 0; i < 60; i++) {
    stepVehiclePhysics(driveState, world, jeep, upgrades, map, { gas: false, brake: true }, 1 / 60);
  }
  assert.ok(driveState.vx < speedBeforeBrake);
});

test('physics detects airborne 360 flips, fuel pickup refills, out of fuel end, and rollover crash', () => {
  const bike = getVehicleById('dirt_bike');
  const moon = getMapById('moon_surface');
  const upgrades = defaultUpgrades();
  const world = createTerrainWorld(moon, 99);

  // High altitude drop for clean backflip
  const flipState = createInitialPhysicsState(bike, upgrades);
  flipState.y = -480;
  flipState.vx = 180;
  flipState.vy = -120;
  let totalFlipsSeen = 0;
  for (let i = 0; i < 120; i++) {
    const ev = stepVehiclePhysics(
      flipState,
      world,
      bike,
      upgrades,
      moon,
      { gas: false, brake: true },
      1 / 60
    );
    totalFlipsSeen += ev.stunts.filter((s) => s.label === 'BACKFLIP').length;
    if (!flipState.airborne && i > 10) break;
  }
  assert.ok(totalFlipsSeen >= 1, 'Expected at least 1 backflip in low-gravity air');
  assert.ok(flipState.stuntBonusCoins >= 150);

  // Fuel pickup test
  const fuelState = createInitialPhysicsState(bike, upgrades);
  fuelState.fuel = 10;
  world.collectibles.push({
    id: 99999,
    kind: 'fuel',
    x: fuelState.x,
    y: fuelState.y,
    value: 48,
    collected: false,
    collectAnim: 0,
  });
  const fuelEv = stepVehiclePhysics(
    fuelState,
    world,
    bike,
    upgrades,
    moon,
    { gas: false, brake: false },
    1 / 60
  );
  assert.equal(fuelEv.collectedFuel.length, 1);
  assert.ok(fuelState.fuel > 50);

  // Out of fuel ending test
  const emptyState = createInitialPhysicsState(bike, upgrades);
  emptyState.fuel = 0;
  emptyState.vx = 0;
  for (let i = 0; i < 100; i++) {
    stepVehiclePhysics(emptyState, world, bike, upgrades, moon, { gas: true, brake: false }, 1 / 60);
  }
  assert.equal(emptyState.outOfFuel, true);

  // Rollover crash test
  const crashState = createInitialPhysicsState(bike, upgrades);
  crashState.angle = Math.PI; // upside down
  crashState.y = 5; // roof touching ground
  stepVehiclePhysics(crashState, world, bike, upgrades, moon, { gas: false, brake: false }, 1 / 60);
  assert.equal(crashState.crashed, true);
});

test('save progression supports purchases, upgrades, coin unlock, and distance milestones', () => {
  const save = createInitialSaveData();
  save.coins = 5000;

  // Upgrade engine on starter jeep
  const upgradeCost = getUpgradeCost('engine', 1);
  assert.equal(purchaseUpgrade(save, 'starter_jeep', 'engine'), true);
  assert.equal(save.upgrades.starter_jeep.engine, 2);
  assert.equal(save.coins, 5000 - upgradeCost);

  // Buy Dirt Bike
  assert.equal(purchaseVehicle(save, 'dirt_bike'), true);
  assert.ok(save.ownedVehicles.includes('dirt_bike'));
  assert.equal(save.selectedVehicleId, 'dirt_bike');

  // Cannot buy expensive Supercar without enough coins
  assert.equal(purchaseVehicle(save, 'supercar'), false);

  // Unlock Desert Canyon with coins
  assert.equal(unlockMapWithCoins(save, 'desert_canyon'), true);
  assert.ok(save.unlockedMaps.includes('desert_canyon'));
  assert.equal(save.selectedMapId, 'desert_canyon');

  // Distance milestone unlocks Snow Mountain automatically
  save.bestDistances.green_valley = 950;
  const unlockedByDist = checkDistanceMilestones(save);
  assert.ok(unlockedByDist.includes('snow_mountain'));
  assert.ok(save.unlockedMaps.includes('snow_mountain'));

  // Normalization recovers cleanly from malformed inputs
  const restored = normalizeSaveData({
    coins: -99,
    ownedVehicles: ['dirt_bike'],
    selectedVehicleId: 'invalid_car',
    unlockedMaps: [],
  });
  assert.equal(restored.coins, 0);
  assert.ok(restored.ownedVehicles.includes('starter_jeep'));
  assert.equal(restored.selectedVehicleId, 'starter_jeep');
  assert.ok(restored.unlockedMaps.includes('green_valley'));
});
