import type { Ambience, CompletionSound } from '../types';

type ActiveAmbience = Exclude<Ambience, 'none'>;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private activeType: Ambience = 'none';
  private cleanups: Array<() => void> = [];

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.ctx) return this.ctx;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    return ctx;
  }

  async unlock(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        /* autoplay policy: retry after the next gesture */
      }
    }
  }

  private noise(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  async playCompletion(sound: CompletionSound, volume: number): Promise<void> {
    if (sound === 'none' || volume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    await this.unlock();
    const now = ctx.currentTime + 0.02;
    const level = Math.min(1, Math.max(0.05, volume)) * 0.5;

    const note = (
      freq: number,
      start: number,
      duration: number,
      gain: number,
      type: OscillatorType,
    ) => {
      if (!this.master) return;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + start);
      env.gain.setValueAtTime(0.0001, now + start);
      env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + start + 0.015);
      env.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      osc.connect(env);
      env.connect(this.master);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.05);
    };

    if (sound === 'chime') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        note(freq, i * 0.13, 1.3, level * 0.32, 'triangle');
        note(freq / 2, i * 0.13, 1.6, level * 0.12, 'sine');
      });
    } else {
      note(392, 0, 2.6, level * 0.35, 'sine');
      note(784.5, 0.01, 2.2, level * 0.12, 'sine');
      note(587.33, 0.16, 2.4, level * 0.22, 'sine');
      note(293.66, 0.16, 2.8, level * 0.14, 'sine');
    }
  }

  setAmbience(type: Ambience, volume: number): void {
    if (type === 'none' || volume <= 0) {
      this.stopAmbience();
      return;
    }
    if (this.activeType === type && this.ambienceGain) {
      const ctx = this.ctx;
      if (ctx) {
        this.ambienceGain.gain.cancelScheduledValues(ctx.currentTime);
        this.ambienceGain.gain.linearRampToValueAtTime(volume * 0.5, ctx.currentTime + 0.3);
      }
      return;
    }
    this.stopAmbience(false);
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    void this.unlock();
    this.activeType = type;
    this.buildAmbience(ctx, type as ActiveAmbience, volume);
  }

  setAmbienceVolume(volume: number): void {
    if (!this.ctx || !this.ambienceGain) return;
    this.ambienceGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.ambienceGain.gain.linearRampToValueAtTime(
      Math.max(0.0001, volume * 0.5),
      this.ctx.currentTime + 0.25,
    );
  }

  stopAmbience(clearType = true): void {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
    const ctx = this.ctx;
    const gain = this.ambienceGain;
    if (ctx && gain) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);
      window.setTimeout(() => gain.disconnect(), 400);
    }
    this.ambienceGain = null;
    if (clearType) this.activeType = 'none';
  }

  private buildAmbience(ctx: AudioContext, type: ActiveAmbience, volume: number): void {
    if (!this.master) return;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.linearRampToValueAtTime(Math.max(0.0002, volume * 0.5), ctx.currentTime + 0.8);
    out.connect(this.master);
    this.ambienceGain = out;

    const source = ctx.createBufferSource();
    source.buffer = this.noise(ctx);
    source.loop = true;

    if (type === 'rain') {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 500;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3600;
      const body = ctx.createGain();
      body.gain.value = 0.55;
      source.connect(hp).connect(lp).connect(body).connect(out);
      source.start();
      this.cleanups.push(() => {
        try {
          source.stop();
        } catch {
          /* already stopped */
        }
        source.disconnect();
      });
    } else if (type === 'waves') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 720;
      const swell = ctx.createGain();
      swell.gain.value = 0.32;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.085;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.28;
      lfo.connect(lfoGain).connect(swell.gain);
      source.connect(lp).connect(swell).connect(out);
      source.start();
      lfo.start();
      this.cleanups.push(() => {
        try {
          source.stop();
          lfo.stop();
        } catch {
          /* already stopped */
        }
        source.disconnect();
        lfo.disconnect();
      });
    } else if (type === 'white') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 9000;
      const level = ctx.createGain();
      level.gain.value = 0.32;
      source.connect(lp).connect(level).connect(out);
      source.start();
      this.cleanups.push(() => {
        try {
          source.stop();
        } catch {
          /* already stopped */
        }
        source.disconnect();
      });
    } else {
      // forest and cafe share a soft bed with gentle randomized details
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = type === 'forest' ? 880 : 520;
      const bed = ctx.createGain();
      bed.gain.value = type === 'forest' ? 0.38 : 0.3;
      source.connect(lp).connect(bed).connect(out);
      source.start();
      const timers: number[] = [];
      const ping = () => {
        if (!this.master || this.activeType !== type) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = type === 'forest' ? 'sine' : 'triangle';
        const base = type === 'forest' ? 1900 + Math.random() * 1200 : 900 + Math.random() * 700;
        osc.frequency.setValueAtTime(base, now);
        osc.frequency.exponentialRampToValueAtTime(base * 1.25, now + 0.12);
        const peak = type === 'forest' ? 0.05 : 0.035;
        env.gain.setValueAtTime(0.0001, now);
        env.gain.exponentialRampToValueAtTime(peak, now + 0.01);
        env.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        osc.connect(env).connect(out);
        osc.start(now);
        osc.stop(now + 0.2);
        const delay = type === 'forest' ? 4000 + Math.random() * 9000 : 6000 + Math.random() * 12000;
        timers.push(window.setTimeout(ping, delay));
      };
      timers.push(window.setTimeout(ping, 1500 + Math.random() * 3000));
      this.cleanups.push(() => {
        timers.forEach((timer) => window.clearTimeout(timer));
        try {
          source.stop();
        } catch {
          /* already stopped */
        }
        source.disconnect();
      });
    }
  }
}

export const audio = new AudioEngine();
