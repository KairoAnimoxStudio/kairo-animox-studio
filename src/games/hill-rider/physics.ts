import { sampleTerrain, type TerrainWorld } from './terrain';
import type { Collectible, MapSpec, Obstacle, SurfaceKind, UpgradeLevels, VehicleSpec } from './types';
import { computeEffectiveVehicleStats, type ComputedVehicleStats } from './vehicles';

export const PIXELS_PER_METER = 14;
const BASE_GRAVITY = 760;

export interface WheelRuntime {
  wx: number;
  wy: number;
  compression: number;
  spin: number;
  angularVel: number;
  grounded: boolean;
  surface: SurfaceKind;
}

export interface PhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  omega: number;
  fuel: number;
  maxFuel: number;
  throttle: number; // -1 (brake/reverse) .. +1 (gas)
  rearWheel: WheelRuntime;
  frontWheel: WheelRuntime;
  airborne: boolean;
  airTime: number;
  airRotationAccum: number;
  flips: number;
  stuntBonusCoins: number;
  coinsCollected: number;
  fuelPickups: number;
  distanceMeters: number;
  maxX: number;
  speedKmh: number;
  crashed: boolean;
  outOfFuel: boolean;
  outOfFuelCoastTimer: number;
  lastImpactStrength: number;
}

export interface StepEvents {
  collectedCoins: Collectible[];
  collectedFuel: Collectible[];
  stunts: Array<{ label: string; bonus: number }>;
  hitObstacles: Obstacle[];
  justLandedStrength: number;
  justJumped: boolean;
  crashedNow: boolean;
  outOfFuelNow: boolean;
}

function surfaceFrictionFactor(surface: SurfaceKind): number {
  switch (surface) {
    case 'ice':
      return 0.72;
    case 'asphalt':
      return 1.15;
    case 'bridge':
      return 0.96;
    case 'ramp':
      return 1.05;
    case 'moon':
      return 0.9;
    default:
      return 1.0;
  }
}

export function createInitialPhysicsState(
  spec: VehicleSpec,
  upgrades: UpgradeLevels
): PhysicsState {
  const stats = computeEffectiveVehicleStats(spec, upgrades);
  const startY = -(spec.wheelRadius + stats.suspensionRest * 0.78);
  return {
    x: 40,
    y: startY,
    vx: 0,
    vy: 0,
    angle: 0,
    omega: 0,
    fuel: stats.fuelCapacity,
    maxFuel: stats.fuelCapacity,
    throttle: 0,
    rearWheel: {
      wx: 40 - spec.wheelBase * 0.5,
      wy: startY + stats.suspensionRest * 0.78,
      compression: 0.22,
      spin: 0,
      angularVel: 0,
      grounded: true,
      surface: 'dirt',
    },
    frontWheel: {
      wx: 40 + spec.wheelBase * 0.5,
      wy: startY + stats.suspensionRest * 0.78,
      compression: 0.22,
      spin: 0,
      angularVel: 0,
      grounded: true,
      surface: 'dirt',
    },
    airborne: false,
    airTime: 0,
    airRotationAccum: 0,
    flips: 0,
    stuntBonusCoins: 0,
    coinsCollected: 0,
    fuelPickups: 0,
    distanceMeters: 0,
    maxX: 40,
    speedKmh: 0,
    crashed: false,
    outOfFuel: false,
    outOfFuelCoastTimer: 0,
    lastImpactStrength: 0,
  };
}

export function stepVehiclePhysics(
  state: PhysicsState,
  world: TerrainWorld,
  spec: VehicleSpec,
  upgrades: UpgradeLevels,
  map: MapSpec,
  rawInput: { gas: boolean; brake: boolean },
  dt: number
): StepEvents {
  const events: StepEvents = {
    collectedCoins: [],
    collectedFuel: [],
    stunts: [],
    hitObstacles: [],
    justLandedStrength: 0,
    justJumped: false,
    crashedNow: false,
    outOfFuelNow: false,
  };

  if (state.crashed) return events;

  const stats: ComputedVehicleStats = computeEffectiveVehicleStats(spec, upgrades);
  const clampedDt = Math.min(dt, 0.05);
  const substeps = 4;
  const subDt = clampedDt / substeps;

  let desiredThrottle = 0;
  if (state.fuel > 0) {
    if (rawInput.gas && !rawInput.brake) desiredThrottle = 1;
    else if (rawInput.brake && !rawInput.gas) desiredThrottle = -1;
  }
  state.throttle += (desiredThrottle - state.throttle) * Math.min(1, clampedDt * 14);

  const wasAirborne = state.airborne;
  let maxLandingImpact = 0;

  for (let step = 0; step < substeps; step++) {
    stepSubFrame(state, world, spec, stats, map, subDt, (impact) => {
      if (impact > maxLandingImpact) maxLandingImpact = impact;
    });
    if (state.crashed) {
      events.crashedNow = true;
      break;
    }
  }

  // Airborne / stunt / landing transitions
  const bothAir = !state.rearWheel.grounded && !state.frontWheel.grounded;
  state.airborne = bothAir;

  if (!wasAirborne && bothAir && state.vy < -65) {
    events.justJumped = true;
  }

  if (bothAir) {
    state.airTime += clampedDt;
    state.airRotationAccum += state.omega * clampedDt;

    // Award full 360-degree flips cleanly
    const fullTurn = Math.PI * 1.85;
    if (state.airRotationAccum <= -fullTurn) {
      state.airRotationAccum += Math.PI * 2;
      state.flips++;
      const bonus = 150;
      state.stuntBonusCoins += bonus;
      events.stunts.push({ label: 'BACKFLIP', bonus });
    } else if (state.airRotationAccum >= fullTurn) {
      state.airRotationAccum -= Math.PI * 2;
      state.flips++;
      const bonus = 150;
      state.stuntBonusCoins += bonus;
      events.stunts.push({ label: 'FRONTFLIP', bonus });
    }
  } else {
    if (wasAirborne) {
      if (state.airTime >= 1.15 && !state.crashed) {
        const airBonus = Math.round(state.airTime * 35);
        state.stuntBonusCoins += airBonus;
        events.stunts.push({ label: `BIG AIR ${state.airTime.toFixed(1)}s`, bonus: airBonus });
      }
      if (maxLandingImpact > 85) {
        events.justLandedStrength = Math.min(1, maxLandingImpact / 420);
      }
    }
    state.airTime = 0;
    state.airRotationAccum = 0;
  }

  // Fuel consumption
  if (state.fuel > 0) {
    const drainRate = 2.6 + Math.abs(state.throttle) * 2.15;
    state.fuel = Math.max(0, state.fuel - drainRate * clampedDt);
  }

  // Collectibles pickup check
  const pickupRadius = spec.wheelRadius + 30;
  for (const c of world.collectibles) {
    if (c.collected) continue;
    const dx = c.x - state.x;
    const dy = c.y - state.y;
    if (dx * dx + dy * dy <= pickupRadius * pickupRadius) {
      c.collected = true;
      if (c.kind === 'fuel') {
        state.fuel = Math.min(state.maxFuel, state.fuel + c.value);
        state.fuelPickups++;
        state.outOfFuel = false;
        state.outOfFuelCoastTimer = 0;
        events.collectedFuel.push(c);
      } else {
        state.coinsCollected += c.value;
        events.collectedCoins.push(c);
      }
    }
  }

  // Dynamic obstacle collision check
  for (const obs of world.obstacles) {
    if (obs.hit) {
      // Simulate knocked obstacle flying briefly
      obs.vy += BASE_GRAVITY * map.gravityScale * clampedDt;
      obs.x += obs.vx * clampedDt;
      obs.y += obs.vy * clampedDt;
      obs.angle += (obs.vx * 0.02) * clampedDt;
      continue;
    }
    const dx = obs.x - state.x;
    const dy = obs.y - state.y;
    const hitDist = obs.radius + spec.wheelBase * 0.42;
    if (dx * dx + dy * dy <= hitDist * hitDist) {
      obs.hit = true;
      obs.vx = Math.max(120, state.vx * 1.15);
      obs.vy = -190;
      const slowFactor = obs.kind === 'rock' ? 0.72 : 0.88;
      state.vx *= slowFactor / Math.max(0.85, stats.mass);
      state.omega += (obs.kind === 'rock' ? -1.4 : -0.6) / stats.mass;
      events.hitObstacles.push(obs);
    }
  }

  // Distance & speed metrics
  if (state.x > state.maxX) {
    state.maxX = state.x;
  }
  state.distanceMeters = Math.max(0, Math.round((state.maxX - 40) / PIXELS_PER_METER));
  state.speedKmh = Math.round((Math.hypot(state.vx, state.vy) / PIXELS_PER_METER) * 3.6);
  state.lastImpactStrength = events.justLandedStrength;

  // Out of fuel ending check (once coasted to near standstill)
  if (state.fuel <= 0 && !state.outOfFuel) {
    if (Math.abs(state.vx) < 22 && !state.airborne) {
      state.outOfFuelCoastTimer += clampedDt;
      if (state.outOfFuelCoastTimer >= 1.15) {
        state.outOfFuel = true;
        events.outOfFuelNow = true;
      }
    } else {
      state.outOfFuelCoastTimer = 0;
    }
  }

  return events;
}

function stepSubFrame(
  state: PhysicsState,
  world: TerrainWorld,
  spec: VehicleSpec,
  stats: ComputedVehicleStats,
  map: MapSpec,
  dt: number,
  onImpact: (impactSpeed: number) => void
): void {
  const gravity = BASE_GRAVITY * map.gravityScale;
  const invMass = 1 / stats.mass;
  const inertia = stats.mass * 1.05; // normalized rotational inertia scale

  const cosA = Math.cos(state.angle);
  const sinA = Math.sin(state.angle);

  // Local +X = (cosA, sinA), Local +Y (downward suspension axis) = (-sinA, cosA)
  const halfBase = spec.wheelBase * 0.5;
  const rest = stats.suspensionRest;

  let fxTotal = 0;
  let fyTotal = stats.mass * gravity;
  let tauTotal = 0;

  const wheels: Array<{ runtime: WheelRuntime; localX: number; isDrive: boolean }> = [
    { runtime: state.rearWheel, localX: -halfBase, isDrive: true },
    { runtime: state.frontWheel, localX: halfBase, isDrive: spec.shape !== 'bike' },
  ];

  for (const w of wheels) {
    const mountRx = w.localX * cosA;
    const mountRy = w.localX * sinA;
    const mountX = state.x + mountRx;
    const mountY = state.y + mountRy;

    // Suspension axis down in world
    const downX = -sinA;
    const downY = cosA;

    const fullWheelX = mountX + downX * rest;
    const fullWheelY = mountY + downY * rest;
    const sample = sampleTerrain(world, fullWheelX);
    w.runtime.surface = sample.surface;

    const wheelBottomY = fullWheelY + spec.wheelRadius;
    const penetration = wheelBottomY - sample.y;

    if (penetration > 0) {
      const wasGnd = w.runtime.grounded;
      w.runtime.grounded = true;
      const compression = Math.min(rest * 1.55, penetration);
      w.runtime.compression = Math.min(1, compression / rest);

      // Position wheel visually flush on terrain along suspension travel
      const actualTravel = Math.max(4, rest - compression);
      w.runtime.wx = mountX + downX * actualTravel;
      w.runtime.wy = mountY + downY * actualTravel;

      const rx = w.runtime.wx - state.x;
      const ry = w.runtime.wy - state.y;

      // Velocity at wheel contact point: v + omega x r
      const vWheelX = state.vx - state.omega * ry;
      const vWheelY = state.vy + state.omega * rx;

      const vNormal = vWheelX * sample.nx + vWheelY * sample.ny;
      if (!wasGnd && vNormal < -45) {
        onImpact(-vNormal);
      }

      // Spring-damper normal force pushing outward along terrain normal
      const kSpring = 38 * stats.suspensionK;
      const kDamp = 4.6 * stats.suspensionDamp;
      const normalForceMag = Math.max(0, compression * kSpring - vNormal * kDamp);
      const fnX = sample.nx * normalForceMag;
      const fnY = sample.ny * normalForceMag;

      fxTotal += fnX;
      fyTotal += fnY;
      tauTotal += rx * fnY - ry * fnX;

      // Hard bottom-out impulse protection on massive drops
      if (penetration > rest * 1.25 && vNormal < 0) {
        const excess = penetration - rest * 1.25;
        state.y -= excess * 0.42;
        state.vy *= 0.86;
      }

      // Tangential wheel traction & torque-based acceleration
      const vTan = vWheelX * sample.tx + vWheelY * sample.ty;
      const gripFactor = stats.wheelGrip * map.frictionMultiplier * surfaceFrictionFactor(sample.surface);

      let driveForce = 0;
      const maxSpeedPx = stats.maxSpeed * PIXELS_PER_METER;

      if (w.isDrive && Math.abs(state.throttle) > 0.02) {
        const engineScale = spec.shape === 'bike' ? 1.55 : 0.72;
        if (state.throttle > 0) {
          const speedRatio = Math.max(0, Math.min(1, vTan / maxSpeedPx));
          const torqueCurve = 1.0 - 0.72 * speedRatio;
          driveForce = state.throttle * stats.engineTorque * 640 * engineScale * torqueCurve;
        } else {
          // Braking if moving forward, reversing if stopped or backing up
          if (vTan > 20) {
            driveForce = state.throttle * 920 * gripFactor;
          } else {
            const revRatio = Math.max(0, Math.min(1, -vTan / (maxSpeedPx * 0.45)));
            driveForce = state.throttle * stats.engineTorque * 420 * (1 - 0.7 * revRatio);
          }
        }
      } else {
        // Gentle rolling resistance
        driveForce = -vTan * 0.55;
      }

      // Clamp tangential traction by Coulomb friction cone
      const maxTraction = Math.max(240, normalForceMag * 1.15) * gripFactor;
      const clampedDrive = Math.max(-maxTraction, Math.min(maxTraction, driveForce));

      const ftX = sample.tx * clampedDrive;
      const ftY = sample.ty * clampedDrive;
      fxTotal += ftX;
      fyTotal += ftY;
      tauTotal += rx * ftY - ry * ftX;

      w.runtime.angularVel = vTan / Math.max(8, spec.wheelRadius);
      w.runtime.spin += w.runtime.angularVel * dt;
    } else {
      w.runtime.grounded = false;
      w.runtime.compression *= Math.max(0, 1 - dt * 10);
      w.runtime.wx = fullWheelX;
      w.runtime.wy = fullWheelY;
      // Wheel free-spin with throttle in air
      w.runtime.angularVel = w.runtime.angularVel * 0.985 + state.throttle * 14 * dt;
      w.runtime.spin += w.runtime.angularVel * dt;
    }
  }

  // Airborne pitch control (brake = lean back / backflip; gas = lean forward / frontflip)
  const bothAir = !state.rearWheel.grounded && !state.frontWheel.grounded;
  if (bothAir && Math.abs(state.throttle) > 0.05) {
    const airTorque = state.throttle * 175000 * stats.airTorque;
    tauTotal += airTorque;
  }

  // Aerodynamic drag & angular damping
  fxTotal -= state.vx * 0.16;
  fyTotal -= state.vy * 0.08;
  const angDamp = bothAir ? 2.4 : 5.2;

  // Integrate linear velocities & position
  state.vx += fxTotal * invMass * dt;
  state.vy += fyTotal * invMass * dt;
  state.x += state.vx * dt;
  state.y += state.vy * dt;

  // Prevent reversing off left boundary start wall
  if (state.x < -180) {
    state.x = -180;
    if (state.vx < 0) state.vx = 0;
  }

  // Angular integration (torque scaled from pixel-lever arm)
  state.omega += (tauTotal * 0.000048) / inertia * dt;
  state.omega *= Math.max(0, 1 - angDamp * dt);
  state.omega = Math.max(-9.5, Math.min(9.5, state.omega));
  state.angle += state.omega * dt;

  // Normalize angle to [-PI, PI]
  if (state.angle > Math.PI) state.angle -= Math.PI * 2;
  if (state.angle < -Math.PI) state.angle += Math.PI * 2;

  // Chassis belly protection & rollover driver head crash check
  const headWorldX = state.x + sinA * spec.roofHeight;
  const headWorldY = state.y - cosA * spec.roofHeight;
  const headTerrain = sampleTerrain(world, headWorldX);

  const isUpsideDown = cosA < -0.22;
  if (isUpsideDown && headWorldY >= headTerrain.y - 6) {
    state.crashed = true;
    state.vx *= 0.2;
    state.vy = 0;
    state.omega = 0;
  }

  // Chassis bottom hard-stop guard so car body doesn't clip deep into sharp peaks
  const centerSample = sampleTerrain(world, state.x);
  const bellyY = state.y + 8;
  if (bellyY > centerSample.y) {
    state.y -= bellyY - centerSample.y;
    if (state.vy > 0) state.vy *= -0.15;
    state.vx *= 0.94;
  }
}
