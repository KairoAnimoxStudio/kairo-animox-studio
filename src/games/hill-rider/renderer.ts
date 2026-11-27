import type { PhysicsState } from './physics';
import { sampleTerrain, type TerrainWorld } from './terrain';
import type { MapSpec, VehicleSpec } from './types';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface FloatingPopup {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  life: number;
  text: string;
  color: string;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  shake: number;
}

const PARTICLE_POOL_SIZE = 160;
const POPUP_POOL_SIZE = 16;

export class HillRiderRenderer {
  private particles: Particle[] = [];
  private particleCursor = 0;
  private popups: FloatingPopup[] = [];
  private popupCursor = 0;
  private weatherTime = 0;

  readonly camera: CameraState = {
    x: 120,
    y: -40,
    zoom: 1,
    shake: 0,
  };

  constructor() {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 3,
        color: '#FFF',
      });
    }
    for (let i = 0; i < POPUP_POOL_SIZE; i++) {
      this.popups.push({
        active: false,
        x: 0,
        y: 0,
        vy: -36,
        life: 0,
        text: '',
        color: '#FACC15',
      });
    }
  }

  resetCamera(targetX: number, targetY: number): void {
    this.camera.x = targetX + 120;
    this.camera.y = targetY - 40;
    this.camera.zoom = 1;
    this.camera.shake = 0;
    for (const p of this.particles) p.active = false;
    for (const pop of this.popups) pop.active = false;
  }

  addShake(amount: number): void {
    this.camera.shake = Math.min(1, this.camera.shake + amount);
  }

  spawnParticles(
    x: number,
    y: number,
    count: number,
    color: string,
    speed = 110,
    size = 4
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;
      const angle = Math.random() * Math.PI * 2;
      const mag = (0.3 + Math.random() * 0.7) * speed;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * mag;
      p.vy = Math.sin(angle) * mag - 45;
      p.life = 0;
      p.maxLife = 0.28 + Math.random() * 0.35;
      p.size = size * (0.65 + Math.random() * 0.65);
      p.color = color;
    }
  }

  spawnPopup(x: number, y: number, text: string, color = '#FACC15'): void {
    const pop = this.popups[this.popupCursor];
    this.popupCursor = (this.popupCursor + 1) % POPUP_POOL_SIZE;
    pop.active = true;
    pop.x = x;
    pop.y = y - 24;
    pop.vy = -48;
    pop.life = 1.05;
    pop.text = text;
    pop.color = color;
  }

  updateEffects(dt: number, phys: PhysicsState, isPlaying: boolean): void {
    const clamped = Math.min(dt, 0.05);
    this.weatherTime += clamped;
    this.camera.shake = Math.max(0, this.camera.shake - clamped * 2.8);

    // Wheel dust / exhaust smoke when driving on ground
    if (isPlaying && !phys.crashed && (phys.rearWheel.grounded || phys.frontWheel.grounded)) {
      if (Math.abs(phys.vx) > 95 && Math.random() < 0.45) {
        const wheel = phys.rearWheel.grounded ? phys.rearWheel : phys.frontWheel;
        this.spawnParticles(wheel.wx - 8, wheel.wy + 12, 1, 'rgba(226,232,240,0.6)', 48, 5);
      }
    }

    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += clamped;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.vy += 260 * clamped;
      p.x += p.vx * clamped;
      p.y += p.vy * clamped;
    }

    for (const pop of this.popups) {
      if (!pop.active) continue;
      pop.life -= clamped;
      if (pop.life <= 0) {
        pop.active = false;
        continue;
      }
      pop.y += pop.vy * clamped;
    }

    // Smooth look-ahead side-follow camera
    const lookAhead = Math.max(85, Math.min(240, 95 + phys.vx * 0.34));
    const targetX = phys.x + lookAhead;
    const terrainUnder = phys.y - 36;
    const targetY = terrainUnder;

    const speedNorm = Math.min(1, Math.hypot(phys.vx, phys.vy) / 520);
    const desiredZoom = 1.02 - speedNorm * 0.24 - (phys.airborne ? 0.05 : 0);

    const smooth = 1 - Math.exp(-6.5 * clamped);
    this.camera.x += (targetX - this.camera.x) * smooth;
    this.camera.y += (targetY - this.camera.y) * smooth;
    this.camera.zoom += (desiredZoom - this.camera.zoom) * (1 - Math.exp(-3.2 * clamped));
  }

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    world: TerrainWorld,
    phys: PhysicsState,
    spec: VehicleSpec,
    map: MapSpec,
    titleTourOffset: number | null
  ): void {
    // 1. Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, map.skyTop);
    skyGrad.addColorStop(0.75, map.skyBottom);
    skyGrad.addColorStop(1, map.horizonColor);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    const camX = titleTourOffset !== null ? this.camera.x + titleTourOffset : this.camera.x;
    const camY = this.camera.y;
    const zoom = (width < 680 ? 0.78 : 1.0) * this.camera.zoom;

    // 2. Celestial body / Atmosphere backdrop
    this.renderBackdrop(ctx, width, height, map, camX);

    // 3. Weather ambiance
    this.renderWeather(ctx, width, height, map);

    // 4. Camera Transform
    const shakeMag = this.camera.shake * this.camera.shake * 14;
    const shakeX = (Math.random() - 0.5) * shakeMag;
    const shakeY = (Math.random() - 0.5) * shakeMag;

    ctx.save();
    ctx.translate(width * 0.38 + shakeX, height * 0.56 + shakeY);
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);

    const viewLeft = camX - (width * 0.55) / zoom;
    const viewRight = camX + (width * 0.85) / zoom;
    const viewBottom = camY + (height * 0.8) / zoom + 400;

    // 5. Terrain surface & bridge struts
    this.renderTerrain(ctx, world, map, viewLeft, viewRight, viewBottom);

    // 6. Obstacles
    for (const obs of world.obstacles) {
      if (obs.x < viewLeft - 80 || obs.x > viewRight + 80) continue;
      this.renderObstacle(ctx, obs);
    }

    // 7. Collectibles (Coins, Gems, Fuel)
    for (const c of world.collectibles) {
      if (c.collected || c.x < viewLeft - 60 || c.x > viewRight + 60) continue;
      this.renderCollectible(ctx, c.kind, c.x, c.y);
    }

    // 8. Vehicle + Suspension + Driver
    this.renderVehicle(ctx, phys, spec, map);

    // 9. Pooled Particles
    for (const p of this.particles) {
      if (!p.active) continue;
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 10. Floating Stunt & Pickup Popups
    ctx.textAlign = 'center';
    ctx.font = '800 18px "Outfit", sans-serif';
    for (const pop of this.popups) {
      if (!pop.active) continue;
      ctx.globalAlpha = Math.min(1, pop.life * 1.4);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0F172A';
      ctx.strokeText(pop.text, pop.x, pop.y);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  private renderBackdrop(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    map: MapSpec,
    camX: number
  ): void {
    // Sun / Moon disc
    ctx.save();
    if (map.lighting === 'lunar' || map.lighting === 'night') {
      ctx.fillStyle = map.lighting === 'lunar' ? '#E2E8F0' : '#FDE68A';
      ctx.beginPath();
      ctx.arc(width * 0.82, height * 0.2, 34, 0, Math.PI * 2);
      ctx.fill();
    } else if (map.lighting !== 'volcanic') {
      ctx.fillStyle = 'rgba(254, 240, 138, 0.88)';
      ctx.beginPath();
      ctx.arc(width * 0.8, height * 0.22, 42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Far parallax mountains / skyline
    this.renderParallaxLayer(ctx, width, height, camX * 0.1, height * 0.64, 95, 220, map.mountainFar, map.id === 'night_city');
    this.renderParallaxLayer(ctx, width, height, camX * 0.24, height * 0.72, 70, 150, map.mountainNear, map.id === 'night_city');
  }

  private renderParallaxLayer(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scroll: number,
    baseY: number,
    amp: number,
    period: number,
    color: string,
    isCity: boolean
  ): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    if (isCity) {
      const step = 64;
      const offset = ((scroll % step) + step) % step;
      for (let x = -step; x <= width + step; x += step) {
        const idx = Math.floor((x + scroll) / step);
        const h = 45 + Math.abs(Math.sin(idx * 12.9898) * 140);
        ctx.lineTo(x - offset, baseY - h);
        ctx.lineTo(x - offset + step - 4, baseY - h);
        ctx.lineTo(x - offset + step - 4, baseY);
      }
    } else {
      for (let x = 0; x <= width + 40; x += 36) {
        const wx = x + scroll;
        const y =
          baseY -
          Math.abs(Math.sin(wx / period) * amp + Math.cos(wx / (period * 0.53)) * amp * 0.45);
        ctx.lineTo(x, y);
      }
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  }

  private renderWeather(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    map: MapSpec
  ): void {
    ctx.save();
    const count = 28;
    for (let i = 0; i < count; i++) {
      const seed = (i * 97 + 13) % 1000;
      if (map.weather === 'snow' || map.weather === 'stars') {
        const px = ((seed * 3.7 + (map.weather === 'snow' ? this.weatherTime * 28 : 0)) % width);
        const py =
          map.weather === 'stars'
            ? (seed * 1.9) % (height * 0.65)
            : ((seed * 2.3 + this.weatherTime * 68) % height);
        ctx.fillStyle = map.weather === 'stars' ? 'rgba(255,255,255,0.75)' : 'rgba(248,250,252,0.85)';
        ctx.beginPath();
        ctx.arc(px, py, map.weather === 'stars' ? 1.5 : 2.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (map.weather === 'embers') {
        const px = (seed * 4.1 + Math.sin(this.weatherTime * 2 + i) * 18) % width;
        const py = height - ((seed * 2.1 + this.weatherTime * 75) % height);
        ctx.fillStyle = 'rgba(251, 146, 60, 0.78)';
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (map.weather === 'rain_neon') {
        const px = (seed * 5.2) % width;
        const py = (seed * 3.3 + this.weatherTime * 340) % height;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - 4, py + 14);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private renderTerrain(
    ctx: CanvasRenderingContext2D,
    world: TerrainWorld,
    map: MapSpec,
    leftX: number,
    rightX: number,
    bottomY: number
  ): void {
    const pts = world.points;
    if (pts.length < 2) return;

    const visible: typeof pts = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.x >= leftX - 60 && p.x <= rightX + 60) {
        visible.push(p);
      }
    }
    if (visible.length < 2) return;

    // Ground fill
    ctx.beginPath();
    ctx.moveTo(visible[0].x, bottomY);
    for (const p of visible) {
      ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(visible[visible.length - 1].x, bottomY);
    ctx.closePath();
    ctx.fillStyle = map.terrainFill;
    ctx.fill();

    // Top turf/road strip + surface accents
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (let i = 0; i < visible.length - 1; i++) {
      const a = visible[i];
      const b = visible[i + 1];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineWidth = 11;
      ctx.strokeStyle =
        a.surface === 'bridge'
          ? '#92400E'
          : a.surface === 'ramp'
            ? '#F59E0B'
            : map.terrainStroke;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(a.x, a.y - 2);
      ctx.lineTo(b.x, b.y - 2);
      ctx.lineWidth = 5;
      ctx.strokeStyle =
        a.surface === 'bridge'
          ? '#D97706'
          : a.surface === 'ramp'
            ? '#FDE047'
            : map.terrainTop;
      ctx.stroke();

      // Bridge support posts
      if (a.surface === 'bridge' && i % 3 === 0) {
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y + 4);
        ctx.lineTo(a.x, a.y + 72);
        ctx.stroke();
      }
    }

    // Distance signposts every 200 meters
    const firstMark = Math.max(200, Math.floor(leftX / (200 * 14)) * 200);
    for (let m = firstMark; m * 14 <= rightX; m += 200) {
      const sx = m * 14 + 40;
      const surf = sampleTerrain(world, sx);
      ctx.fillStyle = '#334155';
      ctx.fillRect(sx - 2, surf.y - 46, 4, 46);
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.fillRect(sx - 22, surf.y - 62, 44, 20);
      ctx.strokeRect(sx - 22, surf.y - 62, 44, 20);
      ctx.fillStyle = '#0F172A';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${m}m`, sx, surf.y - 48);
    }
  }

  private renderObstacle(
    ctx: CanvasRenderingContext2D,
    obs: { kind: string; x: number; y: number; radius: number; angle: number }
  ): void {
    ctx.save();
    ctx.translate(obs.x, obs.y);
    ctx.rotate(obs.angle);
    const r = obs.radius;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0F172A';

    if (obs.kind === 'crate') {
      ctx.fillStyle = '#D97706';
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.strokeRect(-r, -r, r * 2, r * 2);
      ctx.beginPath();
      ctx.moveTo(-r, -r);
      ctx.lineTo(r, r);
      ctx.stroke();
    } else if (obs.kind === 'ice_block') {
      ctx.fillStyle = '#BAE6FD';
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.strokeRect(-r, -r, r * 2, r * 2);
    } else if (obs.kind === 'cone') {
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.2);
      ctx.lineTo(r, r);
      ctx.lineTo(-r, r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = obs.kind === 'log' ? '#78350F' : '#64748B';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderCollectible(
    ctx: CanvasRenderingContext2D,
    kind: 'coin' | 'gem' | 'fuel',
    x: number,
    y: number
  ): void {
    const bob = Math.sin(this.weatherTime * 4.5 + x * 0.02) * 3.5;
    ctx.save();
    ctx.translate(x, y + bob);

    if (kind === 'fuel') {
      // Iconic red fuel jerrycan
      ctx.fillStyle = '#EF4444';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-12, -14, 24, 28, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '800 9px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FUEL', 0, 4);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(3, -18, 6, 5);
    } else if (kind === 'gem') {
      ctx.fillStyle = '#38BDF8';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(13, 0);
      ctx.lineTo(0, 15);
      ctx.lineTo(-13, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      const spinScale = 0.65 + 0.35 * Math.abs(Math.cos(this.weatherTime * 5 + x * 0.03));
      ctx.scale(spinScale, 1);
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(-2, -6, 4, 12);
    }
    ctx.restore();
  }

  private renderVehicle(
    ctx: CanvasRenderingContext2D,
    phys: PhysicsState,
    spec: VehicleSpec,
    map: MapSpec
  ): void {
    const cosA = Math.cos(phys.angle);
    const sinA = Math.sin(phys.angle);
    const halfBase = spec.wheelBase * 0.5;

    // Suspension struts connecting chassis mounts to wheels
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 4;
    for (const [lx, wheel] of [
      [-halfBase, phys.rearWheel],
      [halfBase, phys.frontWheel],
    ] as const) {
      const mx = phys.x + lx * cosA;
      const my = phys.y + lx * sinA;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(wheel.wx, wheel.wy);
      ctx.stroke();
    }

    // Night City / Lunar headlights
    if (map.lighting === 'night' || map.lighting === 'lunar') {
      ctx.save();
      ctx.translate(phys.x, phys.y);
      ctx.rotate(phys.angle);
      const beam = ctx.createLinearGradient(halfBase, -8, halfBase + 260, 20);
      beam.addColorStop(0, 'rgba(254, 249, 195, 0.42)');
      beam.addColorStop(1, 'rgba(254, 249, 195, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(halfBase + 10, -10);
      ctx.lineTo(halfBase + 260, -55);
      ctx.lineTo(halfBase + 260, 48);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Vehicle Body + Driver
    ctx.save();
    ctx.translate(phys.x, phys.y);
    ctx.rotate(phys.angle);

    // Driver helmet & scarf
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-10, -spec.roofHeight + 10, 12, 16);
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-4, -spec.roofHeight + 6, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(-1, -spec.roofHeight + 2, 8, 5);

    // Cartoon Body Silhouette per vehicle shape
    ctx.fillStyle = spec.bodyColor;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    switch (spec.shape) {
      case 'bike':
        ctx.roundRect(-halfBase + 4, -18, spec.wheelBase - 8, 16, 6);
        break;
      case 'truck':
        ctx.roundRect(-halfBase - 8, -28, spec.wheelBase + 16, 26, 5);
        break;
      case 'sports':
      case 'supercar':
        ctx.moveTo(-halfBase - 12, 2);
        ctx.lineTo(-halfBase - 10, -18);
        ctx.lineTo(-14, -26);
        ctx.lineTo(24, -24);
        ctx.lineTo(halfBase + 14, -8);
        ctx.lineTo(halfBase + 12, 4);
        ctx.closePath();
        break;
      case 'buggy':
        ctx.moveTo(-halfBase - 6, 2);
        ctx.lineTo(-halfBase + 6, -24);
        ctx.lineTo(18, -24);
        ctx.lineTo(halfBase + 10, -4);
        ctx.closePath();
        break;
      default:
        ctx.roundRect(-halfBase - 10, -22, spec.wheelBase + 20, 22, 7);
        break;
    }
    ctx.fill();
    ctx.stroke();

    // Accent stripe & rollbar/cabin details
    ctx.fillStyle = spec.accentColor;
    ctx.fillRect(-halfBase + 8, -12, spec.wheelBase - 16, 5);
    if (spec.shape === 'jeep' || spec.shape === 'buggy' || spec.shape === 'rally') {
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-22, -22);
      ctx.lineTo(-12, -spec.roofHeight);
      ctx.lineTo(16, -spec.roofHeight);
      ctx.lineTo(24, -22);
      ctx.stroke();
    }
    ctx.restore();

    // Wheels (rendered after body with clear tread & rotating spokes)
    this.renderWheel(ctx, phys.rearWheel.wx, phys.rearWheel.wy, spec.wheelRadius, phys.rearWheel.spin, spec.accentColor);
    this.renderWheel(ctx, phys.frontWheel.wx, phys.frontWheel.wy, spec.wheelRadius, phys.frontWheel.spin, spec.accentColor);
  }

  private renderWheel(
    ctx: CanvasRenderingContext2D,
    wx: number,
    wy: number,
    radius: number,
    spin: number,
    hubColor: string
  ): void {
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(spin);

    // Tire outer
    ctx.fillStyle = '#18181B';
    ctx.strokeStyle = '#09090B';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Knobby tire tread notches
    ctx.fillStyle = '#3F3F46';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.fillRect(-2.5, -radius - 1, 5, 4);
      ctx.restore();
    }

    // Rim & spokes
    ctx.fillStyle = hubColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.52, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * radius * 0.5, Math.sin(a) * radius * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }
}
