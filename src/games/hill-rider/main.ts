import { HillRiderAudio } from './audio';
import { getMapById, MAPS } from './maps';
import {
  createInitialPhysicsState,
  stepVehiclePhysics,
  type PhysicsState,
} from './physics';
import { HillRiderRenderer } from './renderer';
import {
  checkDistanceMilestones,
  createInitialSaveData,
  defaultUpgrades,
  loadSaveData,
  persistSaveData,
  purchaseUpgrade,
  purchaseVehicle,
  unlockMapWithCoins,
} from './storage';
import { createTerrainWorld, ensureTerrainAhead, pruneBehind, type TerrainWorld } from './terrain';
import type { GameScreenState, RunSummary, SaveData, UpgradeKey } from './types';
import {
  getUpgradeCost,
  getVehicleById,
  MAX_UPGRADE_LEVEL,
  VEHICLES,
} from './vehicles';

class ExtremeHillRiderGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audio = new HillRiderAudio();
  private renderer = new HillRiderRenderer();

  private save: SaveData;
  private screen: GameScreenState = 'loading';
  private world!: TerrainWorld;
  private phys!: PhysicsState;

  private rafId = 0;
  private lastTimestamp = 0;
  private tourOffset = 0;
  private gameOverDelay = 0;
  private pendingGameOverReason: 'crash' | 'out_of_fuel' | null = null;
  private lastHudTick = 0;

  // Unified input state
  private keys = new Set<string>();
  private touchGas = false;
  private touchBrake = false;
  private activeGasPointers = new Set<number>();
  private activeBrakePointers = new Set<number>();

  // Cached DOM references
  private screens: Record<string, HTMLElement> = {};
  private hudDistanceEl!: HTMLElement;
  private hudCoinsEl!: HTMLElement;
  private hudBestEl!: HTMLElement;
  private hudVehicleEl!: HTMLElement;
  private hudSpeedEl!: HTMLElement;
  private hudFuelFillEl!: HTMLElement;
  private hudFuelPctEl!: HTMLElement;
  private hudFuelAlertEl!: HTMLElement;
  private hudMuteBtn!: HTMLButtonElement;
  private btnPedalGas!: HTMLButtonElement;
  private btnPedalBrake!: HTMLButtonElement;

  constructor() {
    this.canvas = document.getElementById('hill-canvas') as HTMLCanvasElement;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');
    this.ctx = context;

    this.save = loadSaveData();
    this.audio.applySettings(this.save.audio);

    this.bindDom();
    this.setupResize();
    this.initSimulationWorld();
    this.syncAudioControls();

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      this.startRun();
    } else {
      this.setScreen('title');
    }

    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  private bindDom(): void {
    const ids = [
      'screen-loading',
      'screen-title',
      'screen-garage',
      'screen-maps',
      'screen-upgrades',
      'screen-settings',
      'screen-stats',
      'hud-overlay',
      'modal-pause',
      'modal-gameover',
    ];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) this.screens[id] = el;
    }

    this.hudDistanceEl = document.getElementById('hud-distance') as HTMLElement;
    this.hudCoinsEl = document.getElementById('hud-coins') as HTMLElement;
    this.hudBestEl = document.getElementById('hud-best') as HTMLElement;
    this.hudVehicleEl = document.getElementById('hud-vehicle') as HTMLElement;
    this.hudSpeedEl = document.getElementById('hud-speed') as HTMLElement;
    this.hudFuelFillEl = document.getElementById('hud-fuel-fill') as HTMLElement;
    this.hudFuelPctEl = document.getElementById('hud-fuel-pct') as HTMLElement;
    this.hudFuelAlertEl = document.getElementById('hud-fuel-alert') as HTMLElement;
    this.hudMuteBtn = document.getElementById('btn-hud-mute') as HTMLButtonElement;
    this.btnPedalGas = document.getElementById('btn-pedal-gas') as HTMLButtonElement;
    this.btnPedalBrake = document.getElementById('btn-pedal-brake') as HTMLButtonElement;

    // Navigation & menu buttons
    document.getElementById('btn-play')?.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.playButton();
      this.startRun();
    });
    document.getElementById('btn-open-garage')?.addEventListener('click', () => this.openSubmenu('garage'));
    document.getElementById('btn-open-maps')?.addEventListener('click', () => this.openSubmenu('maps'));
    document.getElementById('btn-open-upgrades')?.addEventListener('click', () => this.openSubmenu('upgrades'));
    document.getElementById('btn-open-settings')?.addEventListener('click', () => this.openSubmenu('settings'));
    document.getElementById('btn-open-stats')?.addEventListener('click', () => this.openSubmenu('stats'));

    document.querySelectorAll<HTMLButtonElement>('[data-nav-back]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.audio.unlock();
        this.audio.playButton();
        this.setScreen('title');
      });
    });

    // Pause / Resume / Restart
    document.getElementById('btn-hud-pause')?.addEventListener('click', () => {
      this.audio.playButton();
      this.pauseGame();
    });
    document.getElementById('btn-resume')?.addEventListener('click', () => {
      this.audio.playButton();
      this.resumeGame();
    });
    document.getElementById('btn-pause-restart')?.addEventListener('click', () => {
      this.audio.playButton();
      this.startRun();
    });
    document.getElementById('btn-pause-menu')?.addEventListener('click', () => {
      this.audio.playButton();
      this.returnToMainMenu();
    });

    // Game Over actions
    document.getElementById('btn-retry')?.addEventListener('click', () => {
      this.audio.playButton();
      this.startRun();
    });
    document.getElementById('btn-gameover-garage')?.addEventListener('click', () => {
      this.audio.playButton();
      this.openSubmenu('garage');
    });
    document.getElementById('btn-gameover-menu')?.addEventListener('click', () => {
      this.audio.playButton();
      this.returnToMainMenu();
    });

    // Mute toggle
    this.hudMuteBtn?.addEventListener('click', () => {
      this.audio.unlock();
      this.save.audio.muted = !this.save.audio.muted;
      persistSaveData(this.save);
      this.audio.applySettings(this.save.audio);
      this.syncAudioControls();
      this.hudMuteBtn.blur();
    });

    // Audio settings sliders
    const musicSlider = document.getElementById('set-music-vol') as HTMLInputElement;
    const sfxSlider = document.getElementById('set-sfx-vol') as HTMLInputElement;
    const muteCheck = document.getElementById('set-mute-all') as HTMLInputElement;

    musicSlider?.addEventListener('input', () => {
      this.audio.unlock();
      this.save.audio.musicVolume = Number(musicSlider.value) / 100;
      persistSaveData(this.save);
      this.audio.applySettings(this.save.audio);
      this.syncAudioControls();
    });
    sfxSlider?.addEventListener('input', () => {
      this.audio.unlock();
      this.save.audio.sfxVolume = Number(sfxSlider.value) / 100;
      persistSaveData(this.save);
      this.audio.applySettings(this.save.audio);
      this.syncAudioControls();
    });
    muteCheck?.addEventListener('change', () => {
      this.audio.unlock();
      this.save.audio.muted = muteCheck.checked;
      persistSaveData(this.save);
      this.audio.applySettings(this.save.audio);
      this.syncAudioControls();
    });

    document.getElementById('btn-reset-save')?.addEventListener('click', () => {
      this.audio.playButton();
      const panel = document.getElementById('reset-confirm-row');
      if (panel) panel.hidden = false;
    });
    document.getElementById('btn-reset-cancel')?.addEventListener('click', () => {
      const panel = document.getElementById('reset-confirm-row');
      if (panel) panel.hidden = true;
    });
    document.getElementById('btn-reset-confirm')?.addEventListener('click', () => {
      this.save = createInitialSaveData();
      persistSaveData(this.save);
      this.audio.applySettings(this.save.audio);
      this.syncAudioControls();
      this.initSimulationWorld();
      this.refreshMenuMetadata();
      const panel = document.getElementById('reset-confirm-row');
      if (panel) panel.hidden = true;
    });

    // Multitouch Pedal Controls
    this.bindPedal(this.btnPedalGas, this.activeGasPointers, (pressed) => {
      this.touchGas = pressed;
    });
    this.bindPedal(this.btnPedalBrake, this.activeBrakePointers, (pressed) => {
      this.touchBrake = pressed;
    });

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      if (this.screen === 'title' && (code === 'Enter' || code === 'Space')) {
        e.preventDefault();
        this.audio.unlock();
        this.startRun();
        return;
      }

      if (code === 'Escape' || (code === 'KeyP' && (this.screen === 'playing' || this.screen === 'paused'))) {
        e.preventDefault();
        if (this.screen === 'playing') this.pauseGame();
        else if (this.screen === 'paused') this.resumeGame();
        return;
      }

      if (code === 'KeyR' && (this.screen === 'playing' || this.screen === 'paused' || this.screen === 'gameover')) {
        e.preventDefault();
        this.startRun();
        return;
      }

      if (
        code === 'ArrowRight' ||
        code === 'KeyD' ||
        code === 'KeyW' ||
        code === 'ArrowLeft' ||
        code === 'KeyA' ||
        code === 'KeyS'
      ) {
        if (this.screen === 'playing') e.preventDefault();
        this.audio.unlock();
        this.keys.add(code);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.clearAllInputs();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.clearAllInputs();
    });
  }

  private bindPedal(
    btn: HTMLButtonElement,
    pointerSet: Set<number>,
    onChange: (active: boolean) => void
  ): void {
    const update = () => {
      const active = pointerSet.size > 0;
      btn.classList.toggle('pressed', active);
      onChange(active);
    };

    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.audio.unlock();
      pointerSet.add(e.pointerId);
      btn.setPointerCapture?.(e.pointerId);
      update();
    });
    const release = (e: PointerEvent) => {
      pointerSet.delete(e.pointerId);
      update();
    };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
  }

  private clearAllInputs(): void {
    this.keys.clear();
    this.activeGasPointers.clear();
    this.activeBrakePointers.clear();
    this.touchGas = false;
    this.touchBrake = false;
    this.btnPedalGas?.classList.remove('pressed');
    this.btnPedalBrake?.classList.remove('pressed');
  }

  private setupResize(): void {
    const syncSize = () => {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(320, Math.round(rect.width * dpr));
      const h = Math.max(240, Math.round(rect.height * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
        if (this.world && this.phys) this.renderCurrentScene();
      }
    };
    syncSize();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(syncSize);
      ro.observe(this.canvas);
    }
    window.addEventListener('resize', syncSize);
  }

  private initSimulationWorld(): void {
    const map = getMapById(this.save.selectedMapId);
    const spec = getVehicleById(this.save.selectedVehicleId);
    const upg = this.save.upgrades[spec.id] ?? defaultUpgrades();
    const seed = Math.floor(Math.random() * 900000) + 10000;
    this.world = createTerrainWorld(map, seed);
    this.phys = createInitialPhysicsState(spec, upg);
    this.renderer.resetCamera(this.phys.x, this.phys.y);
    this.pendingGameOverReason = null;
    this.gameOverDelay = 0;
  }

  private setScreen(next: GameScreenState): void {
    this.screen = next;
    // Map detailed screen to canonical data-state attribute for tests & accessibility
    const bodyState =
      next === 'playing'
        ? 'playing'
        : next === 'paused'
          ? 'paused'
          : next === 'gameover'
            ? 'gameover'
            : 'title';
    document.body.dataset.state = bodyState;
    document.body.dataset.screen = next;

    this.screens['screen-loading'] && (this.screens['screen-loading'].hidden = next !== 'loading');
    this.screens['screen-title'] && (this.screens['screen-title'].hidden = next !== 'title');
    this.screens['screen-garage'] && (this.screens['screen-garage'].hidden = next !== 'garage');
    this.screens['screen-maps'] && (this.screens['screen-maps'].hidden = next !== 'maps');
    this.screens['screen-upgrades'] && (this.screens['screen-upgrades'].hidden = next !== 'upgrades');
    this.screens['screen-settings'] && (this.screens['screen-settings'].hidden = next !== 'settings');
    this.screens['screen-stats'] && (this.screens['screen-stats'].hidden = next !== 'stats');

    const inRun = next === 'playing' || next === 'paused' || next === 'gameover';
    if (this.screens['hud-overlay']) this.screens['hud-overlay'].hidden = !inRun;
    if (this.screens['modal-pause']) this.screens['modal-pause'].hidden = next !== 'paused';
    if (this.screens['modal-gameover']) this.screens['modal-gameover'].hidden = next !== 'gameover';

    if (next === 'title') {
      this.refreshMenuMetadata();
    }
    this.renderCurrentScene();
  }

  private openSubmenu(sub: 'garage' | 'maps' | 'upgrades' | 'settings' | 'stats'): void {
    this.audio.unlock();
    this.audio.playButton();
    if (sub === 'garage') this.renderGarage();
    if (sub === 'maps') this.renderMaps();
    if (sub === 'upgrades') this.renderUpgrades();
    if (sub === 'stats') this.renderStats();
    if (sub === 'settings') this.syncAudioControls();
    this.setScreen(sub);
  }

  private refreshMenuMetadata(): void {
    const coinsEl = document.getElementById('menu-coins');
    const vehEl = document.getElementById('menu-selected-vehicle');
    const mapEl = document.getElementById('menu-selected-map');
    const bestEl = document.getElementById('menu-best-dist');
    const map = getMapById(this.save.selectedMapId);
    const veh = getVehicleById(this.save.selectedVehicleId);
    if (coinsEl) coinsEl.textContent = this.save.coins.toLocaleString();
    if (vehEl) vehEl.textContent = veh.name;
    if (mapEl) mapEl.textContent = map.name;
    if (bestEl) bestEl.textContent = `${this.save.bestDistances[map.id] ?? 0} m`;
  }

  private startRun(): void {
    this.clearAllInputs();
    this.initSimulationWorld();
    this.setScreen('playing');
    this.updateHud(true);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.canvas.focus();
  }

  private pauseGame(): void {
    if (this.screen !== 'playing') return;
    this.clearAllInputs();
    this.audio.updateEngine(false, 0, 0, false);
    this.setScreen('paused');
  }

  private resumeGame(): void {
    if (this.screen !== 'paused') return;
    this.clearAllInputs();
    this.setScreen('playing');
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  private returnToMainMenu(): void {
    this.clearAllInputs();
    this.audio.updateEngine(false, 0, 0, false);
    this.initSimulationWorld();
    this.setScreen('title');
  }

  private finalizeRun(reason: 'crash' | 'out_of_fuel'): void {
    this.clearAllInputs();
    this.audio.updateEngine(false, 0, 0, false);

    const map = getMapById(this.save.selectedMapId);
    const dist = this.phys.distanceMeters;
    const bestBefore = this.save.bestDistances[map.id] ?? 0;
    const isNewRecord = dist > bestBefore;
    if (isNewRecord) {
      this.save.bestDistances[map.id] = dist;
    }

    const distanceBonusCoins = Math.floor(dist / 10) * 5;
    const totalRewardCoins =
      this.phys.coinsCollected + this.phys.stuntBonusCoins + distanceBonusCoins;

    this.save.coins += totalRewardCoins;
    this.save.stats.totalRuns++;
    this.save.stats.totalDistance += dist;
    this.save.stats.totalCoinsEarned += totalRewardCoins;
    this.save.stats.totalFlips += this.phys.flips;
    this.save.stats.totalFuelPickups += this.phys.fuelPickups;

    const unlockedMilestones = checkDistanceMilestones(this.save);
    persistSaveData(this.save);

    const summary: RunSummary = {
      mapId: map.id,
      vehicleId: this.save.selectedVehicleId,
      distance: dist,
      bestBefore,
      isNewRecord,
      coinsCollected: this.phys.coinsCollected,
      stuntBonusCoins: this.phys.stuntBonusCoins,
      distanceBonusCoins,
      totalRewardCoins,
      flips: this.phys.flips,
      airTimeSeconds: 0,
      reason,
    };

    this.renderGameOverModal(summary, unlockedMilestones);
    this.setScreen('gameover');
  }

  private renderGameOverModal(summary: RunSummary, newlyUnlockedMaps: string[]): void {
    const titleEl = document.getElementById('gameover-title');
    const subEl = document.getElementById('gameover-reason');
    const distEl = document.getElementById('go-distance');
    const bestEl = document.getElementById('go-best');
    const coinsEl = document.getElementById('go-coins');
    const rewardsEl = document.getElementById('go-rewards');
    const flipsEl = document.getElementById('go-flips');
    const unlockBanner = document.getElementById('go-unlock-banner');

    if (titleEl) {
      titleEl.textContent = summary.isNewRecord ? 'New Distance Record!' : 'Run Complete';
    }
    if (subEl) {
      subEl.textContent =
        summary.reason === 'out_of_fuel'
          ? 'Tank Empty — You coasted as far as momentum carried you.'
          : 'Rollover Crash — Upgrade Suspension & Tires for rougher hills.';
    }
    if (distEl) distEl.textContent = `${summary.distance} m`;
    if (bestEl) bestEl.textContent = `${this.save.bestDistances[summary.mapId] ?? summary.distance} m`;
    if (coinsEl) coinsEl.textContent = `+${summary.coinsCollected}`;
    if (rewardsEl) rewardsEl.textContent = `+${summary.totalRewardCoins} Coins`;
    if (flipsEl) flipsEl.textContent = `${summary.flips} Flips (+${summary.stuntBonusCoins})`;

    if (unlockBanner) {
      if (newlyUnlockedMaps.length > 0) {
        const names = newlyUnlockedMaps.map((id) => getMapById(id).name).join(', ');
        unlockBanner.textContent = `Milestone Unlocked: ${names}`;
        unlockBanner.hidden = false;
      } else {
        unlockBanner.hidden = true;
      }
    }
  }

  private renderGarage(): void {
    const coinHeader = document.getElementById('garage-coins');
    if (coinHeader) coinHeader.textContent = this.save.coins.toLocaleString();
    const grid = document.getElementById('garage-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (const v of VEHICLES) {
      const owned = this.save.ownedVehicles.includes(v.id);
      const selected = this.save.selectedVehicleId === v.id;
      const card = document.createElement('article');
      card.className = `hr-card${selected ? ' selected' : ''}`;

      const pctSpeed = Math.min(100, Math.round((v.maxSpeed / 50) * 100));
      const pctPower = Math.min(100, Math.round((v.enginePower / 1.85) * 100));
      const pctGrip = Math.min(100, Math.round((v.wheelGrip / 1.4) * 100));

      card.innerHTML = `
        <div class="hr-card-head">
          <div>
            <h3>${v.name}</h3>
            <p class="hr-card-desc">${v.tagline}</p>
          </div>
          <span class="hr-swatch" style="background:${v.bodyColor};border-color:${v.accentColor}"></span>
        </div>
        <div class="hr-stat-bars">
          <div class="hr-stat-line"><span>Power</span><div class="hr-bar"><i style="width:${pctPower}%"></i></div></div>
          <div class="hr-stat-line"><span>Top Speed</span><div class="hr-bar"><i style="width:${pctSpeed}%"></i></div></div>
          <div class="hr-stat-line"><span>Grip</span><div class="hr-bar"><i style="width:${pctGrip}%"></i></div></div>
          <div class="hr-stat-line"><span>Tank</span><span class="tabular-nums">${v.fuelCapacity}</span></div>
        </div>
        <div class="hr-card-actions"></div>
      `;

      const actWrap = card.querySelector('.hr-card-actions') as HTMLElement;
      const btn = document.createElement('button');
      btn.type = 'button';
      if (selected) {
        btn.className = 'hr-btn primary';
        btn.textContent = 'Selected';
        btn.disabled = true;
      } else if (owned) {
        btn.className = 'hr-btn';
        btn.textContent = 'Select Vehicle';
        btn.addEventListener('click', () => {
          this.audio.playButton();
          this.save.selectedVehicleId = v.id;
          persistSaveData(this.save);
          this.initSimulationWorld();
          this.renderGarage();
        });
      } else {
        const canAfford = this.save.coins >= v.price;
        btn.className = `hr-btn ${canAfford ? 'amber' : ''}`;
        btn.disabled = !canAfford;
        btn.textContent = `Buy · ${v.price.toLocaleString()} Coins`;
        btn.addEventListener('click', () => {
          if (purchaseVehicle(this.save, v.id)) {
            this.audio.playCoin(true);
            persistSaveData(this.save);
            this.initSimulationWorld();
            this.renderGarage();
          }
        });
      }
      actWrap.appendChild(btn);

      if (owned) {
        const upgBtn = document.createElement('button');
        upgBtn.type = 'button';
        upgBtn.className = 'hr-btn sm';
        upgBtn.textContent = 'Upgrades';
        upgBtn.addEventListener('click', () => {
          this.save.selectedVehicleId = v.id;
          persistSaveData(this.save);
          this.openSubmenu('upgrades');
        });
        actWrap.appendChild(upgBtn);
      }

      grid.appendChild(card);
    }
  }

  private renderMaps(): void {
    const coinHeader = document.getElementById('maps-coins');
    if (coinHeader) coinHeader.textContent = this.save.coins.toLocaleString();
    const grid = document.getElementById('maps-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (const m of MAPS) {
      const unlocked = this.save.unlockedMaps.includes(m.id);
      const selected = this.save.selectedMapId === m.id;
      const best = this.save.bestDistances[m.id] ?? 0;

      const card = document.createElement('article');
      card.className = `hr-card${selected ? ' selected' : ''}`;
      card.innerHTML = `
        <div class="hr-map-banner" style="background:linear-gradient(135deg, ${m.skyTop}, ${m.skyBottom});border-bottom:4px solid ${m.terrainTop};">
          <span class="hr-map-name">${m.name}</span>
          <span class="hr-map-meta tabular-nums">Best ${best} m · ${Math.round(m.gravityScale * 100)}% Gravity</span>
        </div>
        <p class="hr-card-desc" style="margin-top:8px;">${m.description}</p>
        <div class="hr-card-actions"></div>
      `;

      const actWrap = card.querySelector('.hr-card-actions') as HTMLElement;
      const btn = document.createElement('button');
      btn.type = 'button';
      if (selected) {
        btn.className = 'hr-btn primary';
        btn.textContent = 'Active Map';
        btn.disabled = true;
      } else if (unlocked) {
        btn.className = 'hr-btn';
        btn.textContent = 'Select Map';
        btn.addEventListener('click', () => {
          this.audio.playButton();
          this.save.selectedMapId = m.id;
          persistSaveData(this.save);
          this.initSimulationWorld();
          this.renderMaps();
        });
      } else {
        const canAfford = this.save.coins >= m.unlockCost;
        btn.className = `hr-btn ${canAfford ? 'amber' : ''}`;
        btn.disabled = !canAfford;
        btn.textContent = `Unlock · ${m.unlockCost.toLocaleString()} Coins (or ${m.unlockDistanceMilestone}m best)`;
        btn.addEventListener('click', () => {
          if (unlockMapWithCoins(this.save, m.id)) {
            this.audio.playCoin(true);
            persistSaveData(this.save);
            this.initSimulationWorld();
            this.renderMaps();
          }
        });
      }
      actWrap.appendChild(btn);
      grid.appendChild(card);
    }
  }

  private renderUpgrades(): void {
    const spec = getVehicleById(this.save.selectedVehicleId);
    const levels = this.save.upgrades[spec.id] ?? defaultUpgrades();
    const coinHeader = document.getElementById('upgrades-coins');
    const vehHeader = document.getElementById('upgrades-vehicle-name');
    if (coinHeader) coinHeader.textContent = this.save.coins.toLocaleString();
    if (vehHeader) vehHeader.textContent = spec.name;

    const list = document.getElementById('upgrades-grid');
    if (!list) return;
    list.innerHTML = '';

    const defs: Array<{ key: UpgradeKey; title: string; effect: string }> = [
      { key: 'engine', title: 'Engine', effect: 'Boosts torque, climbing power, and maximum speed.' },
      { key: 'suspension', title: 'Suspension', effect: 'Improves stability, landing shock absorption, and reduces bounce.' },
      { key: 'tires', title: 'Tires', effect: 'Increases slope grip, traction, and loose-dirt control.' },
      { key: 'fuel', title: 'Fuel Tank', effect: 'Expands fuel tank capacity for longer expeditions.' },
    ];

    for (const d of defs) {
      const lvl = levels[d.key];
      const maxed = lvl >= MAX_UPGRADE_LEVEL;
      const cost = maxed ? 0 : getUpgradeCost(d.key, lvl);
      const canBuy = !maxed && this.save.coins >= cost;

      const card = document.createElement('article');
      card.className = 'hr-card';
      const pips = Array.from({ length: MAX_UPGRADE_LEVEL }, (_, i) =>
        `<span class="hr-pip${i < lvl ? ' filled' : ''}"></span>`
      ).join('');

      card.innerHTML = `
        <div class="hr-card-head">
          <div>
            <h3>${d.title}</h3>
            <p class="hr-card-desc">${d.effect}</p>
          </div>
          <span class="tabular-nums" style="font-weight:700;color:#FACC15;">Lv ${lvl}/${MAX_UPGRADE_LEVEL}</span>
        </div>
        <div class="hr-pip-row">${pips}</div>
        <div class="hr-card-actions"></div>
      `;

      const actWrap = card.querySelector('.hr-card-actions') as HTMLElement;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `hr-btn ${canBuy ? 'primary' : ''}`;
      btn.disabled = maxed || !canBuy;
      btn.textContent = maxed ? 'Max Level' : `Upgrade · ${cost.toLocaleString()} Coins`;
      btn.addEventListener('click', () => {
        if (purchaseUpgrade(this.save, spec.id, d.key)) {
          this.audio.playStunt();
          persistSaveData(this.save);
          this.initSimulationWorld();
          this.renderUpgrades();
        }
      });
      actWrap.appendChild(btn);
      list.appendChild(card);
    }
  }

  private renderStats(): void {
    const mapBestList = document.getElementById('stats-map-records');
    const setText = (id: string, val: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setText('stat-runs', String(this.save.stats.totalRuns));
    setText('stat-distance', `${this.save.stats.totalDistance.toLocaleString()} m`);
    setText('stat-coins', this.save.stats.totalCoinsEarned.toLocaleString());
    setText('stat-flips', String(this.save.stats.totalFlips));
    setText('stat-vehicles', `${this.save.ownedVehicles.length} / ${VEHICLES.length}`);
    setText('stat-maps', `${this.save.unlockedMaps.length} / ${MAPS.length}`);

    if (mapBestList) {
      mapBestList.innerHTML = '';
      for (const m of MAPS) {
        const row = document.createElement('div');
        row.className = 'hr-record-row';
        row.innerHTML = `<span>${m.name}</span><strong class="tabular-nums">${this.save.bestDistances[m.id] ?? 0} m</strong>`;
        mapBestList.appendChild(row);
      }
    }
  }

  private syncAudioControls(): void {
    const musicSlider = document.getElementById('set-music-vol') as HTMLInputElement | null;
    const sfxSlider = document.getElementById('set-sfx-vol') as HTMLInputElement | null;
    const muteCheck = document.getElementById('set-mute-all') as HTMLInputElement | null;
    const musicVal = document.getElementById('set-music-val');
    const sfxVal = document.getElementById('set-sfx-val');

    if (musicSlider) musicSlider.value = String(Math.round(this.save.audio.musicVolume * 100));
    if (sfxSlider) sfxSlider.value = String(Math.round(this.save.audio.sfxVolume * 100));
    if (muteCheck) muteCheck.checked = this.save.audio.muted;
    if (musicVal) musicVal.textContent = `${Math.round(this.save.audio.musicVolume * 100)}%`;
    if (sfxVal) sfxVal.textContent = `${Math.round(this.save.audio.sfxVolume * 100)}%`;

    if (this.hudMuteBtn) {
      this.hudMuteBtn.setAttribute('aria-pressed', String(this.save.audio.muted));
      this.hudMuteBtn.textContent = this.save.audio.muted ? 'Muted' : 'Audio';
    }
  }

  private updateHud(force = false): void {
    const now = performance.now();
    if (!force && now - this.lastHudTick < 50) return;
    this.lastHudTick = now;

    const map = getMapById(this.save.selectedMapId);
    const veh = getVehicleById(this.save.selectedVehicleId);

    this.hudDistanceEl.textContent = `${this.phys.distanceMeters} m`;
    this.hudCoinsEl.textContent = String(this.phys.coinsCollected + this.phys.stuntBonusCoins);
    this.hudBestEl.textContent = `${Math.max(this.save.bestDistances[map.id] ?? 0, this.phys.distanceMeters)} m`;
    this.hudVehicleEl.textContent = veh.name;
    this.hudSpeedEl.textContent = `${this.phys.speedKmh} km/h`;

    const fuelPct = Math.max(0, Math.min(100, Math.round((this.phys.fuel / Math.max(1, this.phys.maxFuel)) * 100)));
    this.hudFuelFillEl.style.transform = `scaleX(${fuelPct / 100})`;
    this.hudFuelFillEl.dataset.low = fuelPct <= 24 ? 'true' : 'false';
    this.hudFuelPctEl.textContent = `${fuelPct}%`;
    this.hudFuelAlertEl.hidden = fuelPct > 24;
  }

  private loop = (timestamp: number): void => {
    const rawDt = Math.max(0, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;
    const dt = Math.min(rawDt, 0.05);

    const map = getMapById(this.save.selectedMapId);
    const spec = getVehicleById(this.save.selectedVehicleId);
    const upg = this.save.upgrades[spec.id] ?? defaultUpgrades();

    if (this.screen === 'playing') {
      if (this.pendingGameOverReason) {
        this.gameOverDelay -= dt;
        this.renderer.updateEffects(dt, this.phys, false);
        if (this.gameOverDelay <= 0) {
          const reason = this.pendingGameOverReason;
          this.pendingGameOverReason = null;
          this.finalizeRun(reason);
        }
      } else {
        const gas =
          this.touchGas ||
          this.keys.has('ArrowRight') ||
          this.keys.has('KeyD') ||
          this.keys.has('KeyW');
        const brake =
          this.touchBrake ||
          this.keys.has('ArrowLeft') ||
          this.keys.has('KeyA') ||
          this.keys.has('KeyS');

        ensureTerrainAhead(this.world, this.phys.x + 2800);
        const events = stepVehiclePhysics(
          this.phys,
          this.world,
          spec,
          upg,
          map,
          { gas, brake },
          dt
        );
        pruneBehind(this.world, this.phys.x - 1400);

        // Handle physics audio & particle triggers
        for (const coin of events.collectedCoins) {
          const isGem = coin.kind === 'gem';
          this.audio.playCoin(isGem);
          this.renderer.spawnParticles(coin.x, coin.y, isGem ? 14 : 7, isGem ? '#38BDF8' : '#FACC15', 140, 4);
          this.renderer.spawnPopup(coin.x, coin.y, `+${coin.value}`, isGem ? '#38BDF8' : '#FACC15');
        }
        for (const fuel of events.collectedFuel) {
          this.audio.playFuel();
          this.renderer.spawnParticles(fuel.x, fuel.y, 14, '#EF4444', 150, 5);
          this.renderer.spawnPopup(fuel.x, fuel.y, 'FUEL +', '#4ADE80');
        }
        for (const stunt of events.stunts) {
          this.audio.playStunt();
          this.renderer.spawnPopup(this.phys.x, this.phys.y - 45, `${stunt.label} +${stunt.bonus}`, '#FACC15');
        }
        for (const obs of events.hitObstacles) {
          this.audio.playLanding(0.6);
          this.renderer.spawnParticles(obs.x, obs.y, 8, '#FDBA74', 130, 4);
          this.renderer.addShake(0.25);
        }
        if (events.justJumped) {
          this.audio.playJump();
        }
        if (events.justLandedStrength > 0.15) {
          this.audio.playLanding(events.justLandedStrength);
          this.renderer.addShake(events.justLandedStrength * 0.45);
        }
        if (brake && this.phys.vx > 160 && (this.phys.rearWheel.grounded || this.phys.frontWheel.grounded)) {
          if (Math.random() < 0.25) this.audio.playBrake();
        }

        if (events.crashedNow) {
          this.audio.playCrash();
          this.renderer.addShake(0.9);
          this.renderer.spawnParticles(this.phys.x, this.phys.y - 24, 24, '#F97316', 220, 6);
          this.renderer.spawnPopup(this.phys.x, this.phys.y - 50, 'CRASH!', '#EF4444');
          this.pendingGameOverReason = 'crash';
          this.gameOverDelay = 0.55;
        } else if (events.outOfFuelNow) {
          this.renderer.spawnPopup(this.phys.x, this.phys.y - 50, 'OUT OF FUEL', '#F59E0B');
          this.pendingGameOverReason = 'out_of_fuel';
          this.gameOverDelay = 0.45;
        }

        this.audio.updateEngine(
          !this.pendingGameOverReason,
          this.phys.throttle,
          this.phys.speedKmh,
          this.phys.fuel > 0
        );
        this.renderer.updateEffects(dt, this.phys, !this.pendingGameOverReason);
        this.updateHud();
      }
      this.renderCurrentScene();
    } else if (this.screen === 'title') {
      // Gentle live world parallax pan behind title menu
      this.tourOffset = (this.tourOffset + dt * 42) % 1600;
      ensureTerrainAhead(this.world, this.phys.x + this.tourOffset + 2800);
      this.renderer.updateEffects(dt, this.phys, false);
      this.renderCurrentScene();
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private renderCurrentScene(): void {
    const map = getMapById(this.save.selectedMapId);
    const spec = getVehicleById(this.save.selectedVehicleId);
    this.renderer.render(
      this.ctx,
      this.canvas.width,
      this.canvas.height,
      this.world,
      this.phys,
      spec,
      map,
      this.screen === 'playing' || this.screen === 'paused' || this.screen === 'gameover'
        ? null
        : this.tourOffset
    );
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ExtremeHillRiderGame();
});
