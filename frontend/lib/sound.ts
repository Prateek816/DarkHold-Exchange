// Subtle Web Audio sound effects synthesizer (zero external audio files needed)

class SoundFX {
  private ctx: AudioContext | null = null;
  public enabled: boolean = false;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.init();
      this.playChime(660);
    }
    return this.enabled;
  }

  public playHover() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch {
      // Audio autoplay policy catch
    }
  }

  public playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(260, this.ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch {
      // catch
    }
  }

  public playSuccess() {
    this.playChime(660);
    setTimeout(() => this.playChime(880), 90);
  }

  public playChime(freq = 580) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch {
      // catch
    }
  }

  public playPortalTransition(direction: 'ENTERING' | 'EXITING' = 'ENTERING') {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // 1. Sub-bass swell
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();

      bassOsc.type = 'triangle';
      if (direction === 'ENTERING') {
        bassOsc.frequency.setValueAtTime(65, now);
        bassOsc.frequency.exponentialRampToValueAtTime(140, now + 0.35);
      } else {
        bassOsc.frequency.setValueAtTime(140, now);
        bassOsc.frequency.exponentialRampToValueAtTime(65, now + 0.35);
      }

      bassGain.gain.setValueAtTime(0.001, now);
      bassGain.gain.linearRampToValueAtTime(0.04, now + 0.12);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      bassOsc.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.45);

      // 2. Crystalline harmonic chords (C5, E5, G5, C6)
      const chord = [523.25, 659.25, 783.99, 1046.5];
      chord.forEach((freq, idx) => {
        if (!this.ctx) return;
        const chordOsc = this.ctx.createOscillator();
        const chordGain = this.ctx.createGain();

        chordOsc.type = 'sine';
        const startTime = now + idx * 0.04;
        const endTime = startTime + 0.35;

        chordOsc.frequency.setValueAtTime(freq, startTime);
        if (direction === 'ENTERING') {
          chordOsc.frequency.exponentialRampToValueAtTime(freq * 1.05, endTime);
        } else {
          chordOsc.frequency.exponentialRampToValueAtTime(freq * 0.95, endTime);
        }

        chordGain.gain.setValueAtTime(0.0001, startTime);
        chordGain.gain.linearRampToValueAtTime(0.018, startTime + 0.05);
        chordGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

        chordOsc.connect(chordGain);
        chordGain.connect(this.ctx.destination);
        chordOsc.start(startTime);
        chordOsc.stop(endTime);
      });
    } catch {
      // Audio catch
    }
  }

  public playStepTick(step: number = 1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const stepFrequencies = [880, 1174.66, 1479.98];
      const freq = stepFrequencies[(step - 1) % stepFrequencies.length] || 1046.5;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 0.08);

      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Audio catch
    }
  }
}

export const soundFx = new SoundFX();
export const sound = soundFx;
