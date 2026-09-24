/**
 * 🔊 Web Audio API Sound Service (Zero External Asset Dependency)
 * Synthesizes emergency sirens, medical appointment chimes, and dispatch beeps
 * directly in the browser with 100% offline availability and zero HTTP delay.
 */

class SoundService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Check if muted in localStorage
    this.isMuted = localStorage.getItem('lifelink_sound_muted') === 'true';
  }

  private getAudioContext(): AudioContext | null {
    if (this.isMuted) return null;
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('lifelink_sound_muted', this.isMuted ? 'true' : 'false');
    return this.isMuted;
  }

  public getMutedState(): boolean {
    return this.isMuted;
  }

  /**
   * 🚨 Emergency SOS Siren (Authentic two-tone ambulance wail)
   */
  public playEmergencySiren(durationSeconds: number = 3): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';

      // Modulate frequency between 960Hz and 770Hz (Standard EMS high-low wail)
      const cycleDuration = 0.6; // 600ms per high-low cycle
      const cycles = Math.ceil(durationSeconds / cycleDuration);

      for (let i = 0; i < cycles; i++) {
        const startTime = now + i * cycleDuration;
        osc.frequency.setValueAtTime(960, startTime);
        osc.frequency.setValueAtTime(770, startTime + cycleDuration / 2);
      }

      // Smooth gain envelope (volume)
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.1);
      gain.gain.setValueAtTime(0.25, now + durationSeconds - 0.2);
      gain.gain.linearRampToValueAtTime(0.001, now + durationSeconds);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + durationSeconds);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * 🔔 Pleasant Medical Success Chime (Major triad harmonic chord C5-E5-G5)
   */
  public playSuccessChime(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.01, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.65);
      });
    } catch {
      // Fallback
    }
  }

  /**
   * 🚑 Urgent Dispatch Double-Beep
   */
  public playDispatchAlert(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.2].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now + offset); // A5

        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
      });
    } catch {
      // Fallback
    }
  }
}

export const soundService = new SoundService();
export default soundService;
