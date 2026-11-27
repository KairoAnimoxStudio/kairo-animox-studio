import type { AudioSettings } from './types';

export class HillRiderAudio {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;

  private settings: AudioSettings = {
    musicVolume: 0.35,
    sfxVolume: 0.75,
    muted: false,
  };

  applySettings(next: AudioSettings): void {
    this.settings = { ...next };
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const sfxVal = this.settings.muted ? 0 : this.settings.sfxVolume;
    const musVal = this.settings.muted ? 0 : this.settings.musicVolume;
    this.sfxGain?.gain.setTargetAtTime(sfxVal, now, 0.04);
    this.musicGain?.gain.setTargetAtTime(musVal * 0.25, now, 0.06);
  }

  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.connect(this.ctx.destination);
      this.musicGain.connect(this.ctx.destination);

      // Continuous engine synth
      this.engineOsc = this.ctx.createOscillator();
      this.engineSubOsc = this.ctx.createOscillator();
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineSubOsc.type = 'triangle';
      this.engineOsc.frequency.value = 58;
      this.engineSubOsc.frequency.value = 29;
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 240;
      this.engineGain.gain.value = 0;

      this.engineOsc.connect(this.engineFilter);
      this.engineSubOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.sfxGain);

      this.engineOsc.start();
      this.engineSubOsc.start();
      this.startMusicLoop();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.applySettings(this.settings);
  }

  private startMusicLoop(): void {
    if (this.musicTimer !== null || typeof window === 'undefined') return;
    const bassNotes = [130.81, 130.81, 164.81, 196.0, 146.83, 146.83, 174.61, 196.0];
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.ctx.state !== 'running') return;
      if (this.settings.muted || this.settings.musicVolume <= 0.01) return;
      const now = this.ctx.currentTime;
      const freq = bassNotes[this.musicStep % bassNotes.length];
      this.musicStep++;

      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 0.36);

      if (this.musicStep % 2 === 1) {
        const lead = this.ctx.createOscillator();
        const lg = this.ctx.createGain();
        lead.type = 'sine';
        lead.frequency.setValueAtTime(freq * 3, now);
        lg.gain.setValueAtTime(0.08, now);
        lg.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        lead.connect(lg);
        lg.connect(this.musicGain);
        lead.start(now);
        lead.stop(now + 0.24);
      }
    }, 360);
  }

  updateEngine(active: boolean, throttle: number, speedKmh: number, hasFuel: boolean): void {
    if (!this.ctx || !this.engineOsc || !this.engineSubOsc || !this.engineGain || !this.engineFilter) {
      return;
    }
    const now = this.ctx.currentTime;
    if (!active || !hasFuel || this.settings.muted) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    const rpmFactor = Math.min(1.6, Math.abs(throttle) * 0.75 + speedKmh / 110);
    const baseFreq = 48 + rpmFactor * 88;
    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);
    this.engineFilter.frequency.setTargetAtTime(220 + rpmFactor * 520, now, 0.06);
    const vol = 0.055 + Math.abs(throttle) * 0.045;
    this.engineGain.gain.setTargetAtTime(vol, now, 0.06);
  }

  playButton(): void {
    this.tone(540, 680, 0.06, 'sine', 0.11);
  }

  playCoin(isGem = false): void {
    if (isGem) {
      this.tone(880, 1320, 0.18, 'triangle', 0.18);
      setTimeout(() => this.tone(1174, 1568, 0.18, 'sine', 0.14), 60);
    } else {
      this.tone(920, 1280, 0.11, 'sine', 0.15);
    }
  }

  playFuel(): void {
    this.tone(320, 640, 0.16, 'triangle', 0.18);
    setTimeout(() => this.tone(480, 820, 0.18, 'sine', 0.14), 85);
  }

  playJump(): void {
    this.tone(180, 380, 0.16, 'sine', 0.12);
  }

  playLanding(strength: number): void {
    const amp = Math.min(0.24, 0.08 + strength * 0.16);
    this.tone(120, 48, 0.14, 'triangle', amp);
  }

  playBrake(): void {
    this.tone(240, 160, 0.07, 'sawtooth', 0.05);
  }

  playStunt(): void {
    this.tone(587, 880, 0.15, 'triangle', 0.16);
    setTimeout(() => this.tone(784, 1174, 0.2, 'triangle', 0.16), 90);
  }

  playCrash(): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    // White noise burst + low thud
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.28);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 640;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    noise.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    noise.start(now);
    this.tone(110, 38, 0.28, 'sawtooth', 0.25);
  }

  private tone(
    startFreq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    volume: number
  ): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    g.gain.setValueAtTime(volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }
}
