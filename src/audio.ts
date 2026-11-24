// Synthesized Cumbia-Arcade Music & SFX Engine (Pure Web Audio API)

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// 16 steps per bar, 4 bars = 64 steps loop (Am -> G -> F -> E7 cumbia sonidera arcade!)
// Bass notes per 16-step bar: classic syncopated cumbia tum-pa-tum-tum
const BASS_BARS: number[][] = [
  // Am: A2(45), C3(48), E3(52)
  [45, 0, 0, 48, 0, 0, 52, 0, 45, 0, 0, 48, 0, 0, 52, 0],
  // G: G2(43), B2(47), D3(50)
  [43, 0, 0, 47, 0, 0, 50, 0, 43, 0, 0, 47, 0, 0, 50, 0],
  // F: F2(41), A2(45), C3(48)
  [41, 0, 0, 45, 0, 0, 48, 0, 41, 0, 0, 45, 0, 0, 48, 0],
  // E7: E2(40), G#2(44), B2(47), D3(50)
  [40, 0, 0, 44, 0, 0, 47, 0, 40, 0, 44, 0, 47, 0, 50, 0],
];

// Upbeat joyful cumbia-accordion / arcade synth lead (2 rotating sections A + B, 64 steps each)
const LEAD_A: number[] = [
  // Bar 1 (Am)
  69, 0, 72, 0, 76, 0, 72, 76, 79, 0, 76, 0, 72, 0, 69, 0,
  // Bar 2 (G)
  67, 0, 71, 0, 74, 0, 71, 74, 76, 0, 74, 0, 71, 0, 67, 0,
  // Bar 3 (F)
  65, 0, 69, 0, 72, 0, 69, 72, 76, 0, 72, 0, 69, 0, 72, 0,
  // Bar 4 (E7)
  71, 0, 68, 0, 71, 0, 74, 0, 76, 0, 74, 0, 71, 0, 68, 0,
];

const LEAD_B: number[] = [
  // Bar 1 (Am) — hotter frantic arcade chorus!
  81, 0, 81, 79, 76, 0, 72, 0, 76, 0, 79, 0, 76, 0, 72, 0,
  // Bar 2 (G)
  79, 0, 79, 76, 74, 0, 71, 0, 74, 0, 76, 0, 74, 0, 71, 0,
  // Bar 3 (F)
  77, 0, 77, 76, 72, 0, 69, 0, 72, 0, 76, 0, 77, 0, 76, 0,
  // Bar 4 (E7)
  76, 0, 74, 0, 71, 0, 74, 76, 80, 0, 79, 0, 76, 0, 71, 0,
];

// Chord off-beat electric organ ("skank") for authentic Mexican cumbia bounce
const CHORDS: number[][] = [
  [57, 60, 64], // Am
  [55, 59, 62], // G
  [53, 57, 60], // F
  [52, 56, 59], // E
];

export class ArcadeAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Engine continuous voice
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private engineActive = false;

  // Sequencer
  private musicPlaying = false;
  private schedulerId: number | null = null;
  private nextNoteTime = 0;
  private stepIndex = 0;
  private currentBpm = 136;
  private targetBpm = 136;
  private isTurboMusic = false;
  private isUrgentMusic = false;

  private muted = false;
  private lastSkidTime = 0;

  constructor(initialMuted = false) {
    this.muted = initialMuted;
  }

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.72;
      this.masterGain.connect(this.ctx.destination);

      // Gentle dynamics protection
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 18;
      comp.ratio.value = 5;
      comp.attack.value = 0.004;
      comp.release.value = 0.14;
      comp.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.42;
      this.musicGain.connect(comp);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.78;
      this.sfxGain.connect(comp);

      this.noiseBuffer = this.buildNoiseBuffer(this.ctx);
      this.initEngineVoice();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private buildNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = ctx.sampleRate * 1.5;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private initEngineVoice(): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.value = 55;
    osc2.frequency.value = 110;

    filter.type = 'lowpass';
    filter.frequency.value = 260;
    filter.Q.value = 2.4;

    gain.gain.value = 0.0001;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start();
    osc2.start();

    this.engineOsc1 = osc1;
    this.engineOsc2 = osc2;
    this.engineFilter = filter;
    this.engineGain = gain;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.72, this.ctx.currentTime, 0.03);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public startMusic(): void {
    this.unlock();
    if (!this.ctx) return;
    if (this.musicPlaying) return;
    this.musicPlaying = true;
    this.stepIndex = 0;
    this.currentBpm = 136;
    this.targetBpm = 136;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.schedulerId = window.setInterval(() => this.scheduleSteps(), 25);
  }

  public stopMusic(): void {
    this.musicPlaying = false;
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    this.setEngineEnabled(false);
  }

  public setMusicIntensity(turbo: boolean, lowTime: boolean): void {
    this.isTurboMusic = turbo;
    this.isUrgentMusic = lowTime;
    if (lowTime && turbo) {
      this.targetBpm = 184;
    } else if (lowTime) {
      this.targetBpm = 174;
    } else if (turbo) {
      this.targetBpm = 160;
    } else {
      this.targetBpm = 136;
    }
  }

  public setEngineEnabled(enabled: boolean): void {
    this.engineActive = enabled;
    if (!enabled && this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.06);
    }
  }

  public updateEngine(speedNorm: number, turbo: boolean, airborne: boolean, blueFlame: boolean): void {
    if (!this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain) return;
    if (!this.engineActive || this.muted) {
      this.engineGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
      return;
    }
    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1.5, speedNorm));
    const baseFreq = 52 + clamped * 92 + (turbo ? 28 : 0) + (blueFlame && turbo ? 22 : 0) + (airborne ? 14 : 0);
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.045);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * (turbo ? 2.02 : 1.5), now, 0.045);
    this.engineFilter.frequency.setTargetAtTime(
      240 + clamped * 440 + (turbo ? 380 : 0),
      now,
      0.05
    );
    const vol = (0.045 + Math.min(1, clamped) * 0.075 + (turbo ? 0.035 : 0)) * (airborne ? 0.72 : 1);
    this.engineGain.gain.setTargetAtTime(vol, now, 0.05);
  }

  private scheduleSteps(): void {
    if (!this.ctx || !this.musicPlaying) return;
    // Smoothly approach target BPM so speed-up sounds thrilling!
    this.currentBpm += (this.targetBpm - this.currentBpm) * 0.14;
    const stepDur = 60 / this.currentBpm / 4; // 16th note

    while (this.nextNoteTime < this.ctx.currentTime + 0.11) {
      this.playMusicStep(this.stepIndex, this.nextNoteTime, stepDur);
      this.nextNoteTime += stepDur;
      this.stepIndex = (this.stepIndex + 1) % 128;
    }
  }

  private playMusicStep(step: number, time: number, stepDur: number): void {
    if (!this.ctx || !this.musicGain) return;
    const barStep = step % 16;
    const barIndex = Math.floor(step / 16) % 4;
    const sectionB = step >= 64;

    // 1. Punchy electronic cumbia kick on beats 0, 4, 8, 12 (plus urgent pickup on 14)
    if (barStep % 4 === 0 || (this.isUrgentMusic && barStep === 14)) {
      this.trigKick(time, barStep % 4 === 0 ? 0.42 : 0.24);
    }

    // 2. Classic Güiro scraper pattern (16th-note groove: ch-chika ch-chika)
    if (barStep % 4 === 0) {
      this.trigGuiro(time, 0.06, 0.12);
    } else if (barStep % 4 === 2) {
      this.trigGuiro(time, 0.045, 0.18);
    } else if (barStep % 4 === 3) {
      this.trigGuiro(time, 0.03, 0.11);
    }

    // 3. Cencerro (cumbia cowbell) on upbeat accents — double energy in turbo/low-time!
    if (barStep === 2 || barStep === 6 || barStep === 10 || barStep === 14) {
      this.trigCowbell(time, this.isUrgentMusic || this.isTurboMusic ? 0.14 : 0.09);
    } else if ((this.isUrgentMusic || this.isTurboMusic) && (barStep === 7 || barStep === 15)) {
      this.trigCowbell(time, 0.08);
    }

    // 4. Crisp electronic clap/timbale pop on 4 and 12
    if (barStep === 4 || barStep === 12) {
      this.trigSnare(time, 0.14);
    }

    // 5. Bouncy Cumbia Bass (tum-ta-tum)
    const bassMidi = BASS_BARS[barIndex][barStep];
    if (bassMidi > 0) {
      this.trigBass(time, midiToFreq(bassMidi), stepDur * 2.2);
    }

    // 6. Cumbia off-beat upbeat organ chop ("skank" on 2, 6, 10, 14)
    if (barStep === 2 || barStep === 6 || barStep === 10 || barStep === 14) {
      this.trigChordChop(time, CHORDS[barIndex], stepDur * 0.85);
    }

    // 7. Catchy vibrant arcade cumbia-accordion lead!
    const pattern = sectionB ? LEAD_B : LEAD_A;
    const leadMidi = pattern[step % 64];
    if (leadMidi > 0) {
      const octaveLift = this.isTurboMusic && barStep % 8 === 0 ? 12 : 0;
      this.trigLead(time, midiToFreq(leadMidi + octaveLift), stepDur * 1.55);
    }
  }

  private trigKick(time: number, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(46, time + 0.09);
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  private trigGuiro(time: number, dur: number, vol: number): void {
    if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(4200, time);
    bp.Q.value = 3.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.musicGain);
    src.start(time, Math.random() * 0.5, dur + 0.01);
  }

  private trigSnare(time: number, vol: number): void {
    if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.musicGain);
    src.start(time, Math.random() * 0.4, 0.1);
  }

  private trigCowbell(time: number, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const f1 = 560;
    const f2 = 845;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 780;
    bp.Q.value = 2.6;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.085);
    bp.connect(g);
    g.connect(this.musicGain);

    for (const freq of [f1, f2]) {
      const o = this.ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = freq;
      o.connect(bp);
      o.start(time);
      o.stop(time + 0.09);
    }
  }

  private trigBass(time: number, freq: number, dur: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const lp = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(520, time);
    g.gain.setValueAtTime(0.38, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private trigChordChop(time: number, notes: number[], dur: number): void {
    if (!this.ctx || !this.musicGain) return;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(0.075, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    g.connect(this.musicGain);

    for (const m of notes) {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = midiToFreq(m);
      o.connect(g);
      o.start(time);
      o.stop(time + dur + 0.01);
    }
  }

  private trigLead(time: number, freq: number, dur: number): void {
    if (!this.ctx || !this.musicGain) return;
    // Slightly detuned square + saw creates unmistakable joyous Mexican accordion/arcade-synth sparkle
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(this.isTurboMusic ? 3400 : 2500, time);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(0.115, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    lp.connect(g);
    g.connect(this.musicGain);

    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    o1.type = 'sawtooth';
    o2.type = 'square';
    o1.frequency.value = freq;
    o2.frequency.value = freq * 1.005;
    o1.connect(lp);
    o2.connect(lp);
    o1.start(time);
    o2.start(time);
    o1.stop(time + dur + 0.02);
    o2.stop(time + dur + 0.02);
  }

  // ===================== SOUND EFFECTS =====================

  /** Authentic friendly Mexican moto claxon: "¡pip-pip!" */
  public playHorn(): void {
    if (this.muted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const toots = [
      { start: 0, dur: 0.095 },
      { start: 0.135, dur: 0.16 },
    ];
    for (const t of toots) {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 920;
      bp.Q.value = 1.4;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now + t.start);
      g.gain.linearRampToValueAtTime(0.24, now + t.start + 0.012);
      g.gain.setValueAtTime(0.22, now + t.start + t.dur - 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + t.start + t.dur);
      bp.connect(g);
      g.connect(this.sfxGain);

      // Dual classic car/moto horn intervals (F#5 + A#5)
      for (const freq of [523.25, 659.25]) {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = freq;
        o.connect(bp);
        o.start(now + t.start);
        o.stop(now + t.start + t.dur + 0.02);
      }
    }
  }

  /** Happy green taco-stand order pickup + tiny friendly toot */
  public playPickup(): void {
    if (this.muted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      const t = now + i * 0.048;
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.24, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g);
      g.connect(this.sfxGain);
      o.start(t);
      o.stop(t + 0.2);
    });
  }

  /** Sparkling golden coin cascade on delivery, climbing in pitch with combo! */
  public playDelivery(combo: number): void {
    if (this.muted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const lift = 1 + Math.min(combo - 1, 4) * 0.07;
    const notes = [987.77, 1318.5, 1567.98, 2093.0, 2637.0];
    notes.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = idx < 3 ? 'sine' : 'triangle';
      o.frequency.value = f * lift;
      const t = now + idx * 0.052;
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.24, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      o.connect(g);
      g.connect(this.sfxGain);
      o.start(t);
      o.stop(t + 0.28);
    });
  }

  /** Crisp coin spark for "¡POR UN PELO!" near miss */
  public playNearMiss(): void {
    if (this.muted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Quick doppler zip + double coin ding
    const zip = this.ctx.createOscillator();
    const zg = this.ctx.createGain();
    zip.type = 'sine';
    zip.frequency.setValueAtTime(340, now);
    zip.frequency.exponentialRampToValueAtTime(1250, now + 0.09);
    zg.gain.setValueAtTime(0.18, now);
    zg.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    zip.connect(zg);
    zg.connect(this.sfxGain);
    zip.start(now);
    zip.stop(now + 0.12);

    for (let i = 0; i < 2; i++) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = i === 0 ? 1174.66 : 1760;
      const t = now + 0.05 + i * 0.055;
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g);
      g.connect(this.sfxGain);
      o.start(t);
      o.stop(t + 0.18);
    }
  }

  /** Elastic spring jump */
  public playJump(): void {
    if (this.muted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(210, now);
    o.frequency.exponentialRampToValueAtTime(590, now + 0.14);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(now);
    o.stop(now + 0.17);
  }

  /** Epic launch off a tianguis ramp */
  public playRampStunt(): void {
    if (this.muted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [587.33, 739.99, 880, 1174.66].forEach((f, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2600;
      o.frequency.value = f;
      const t = now + i * 0.04;
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      o.connect(lp);
      lp.connect(g);
      g.connect(this.sfxGain);
      o.start(t);
      o.stop(t + 0.26);
    });
  }

  /** Turbo flames ignite whoosh */
  public playTurboStart(blueFlame: boolean): void {
    if (this.muted || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(420, now);
    bp.frequency.exponentialRampToValueAtTime(blueFlame ? 2800 : 1800, now + 0.22);
    bp.Q.value = 1.6;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfxGain);
    src.start(now, 0, 0.3);

    const sub = this.ctx.createOscillator();
    const sg = this.ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(blueFlame ? 180 : 120, now);
    sub.frequency.exponentialRampToValueAtTime(blueFlame ? 420 : 240, now + 0.18);
    sg.gain.setValueAtTime(0.2, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    sub.connect(sg);
    sg.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 0.24);
  }

  /** Brief crisp drifting tire skid chirp */
  public playSkid(): void {
    if (this.muted || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    if (now - this.lastSkidTime < 0.22) return;
    this.lastSkidTime = now;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1950 + Math.random() * 450, now);
    bp.Q.value = 7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.11, now + 0.025);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfxGain);
    src.start(now, Math.random() * 0.5, 0.18);
  }

  /** Comical cartoon explosion + descending spring crash! */
  public playCrash(): void {
    if (this.muted || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    // 1. Punchy boom burst
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1200, now);
    lp.frequency.exponentialRampToValueAtTime(140, now + 0.42);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.42, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
    src.connect(lp);
    lp.connect(ng);
    ng.connect(this.sfxGain);
    src.start(now, 0, 0.46);

    // 2. Comical falling cartoon slide whistle / boing!
    const whistle = this.ctx.createOscillator();
    const wg = this.ctx.createGain();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(920, now + 0.05);
    whistle.frequency.exponentialRampToValueAtTime(150, now + 0.52);
    wg.gain.setValueAtTime(0.24, now + 0.05);
    wg.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    whistle.connect(wg);
    wg.connect(this.sfxGain);
    whistle.start(now + 0.05);
    whistle.stop(now + 0.56);

    // 3. Wobble boing harmonic
    const boing = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const bg = this.ctx.createGain();
    boing.type = 'triangle';
    boing.frequency.setValueAtTime(220, now);
    boing.frequency.exponentialRampToValueAtTime(125, now + 0.36);
    lfo.frequency.value = 26;
    lfoGain.gain.value = 48;
    lfo.connect(lfoGain);
    lfoGain.connect(boing.frequency);
    bg.gain.setValueAtTime(0.24, now);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    boing.connect(bg);
    bg.connect(this.sfxGain);
    boing.start(now);
    lfo.start(now);
    boing.stop(now + 0.4);
    lfo.stop(now + 0.4);
  }

  /** La Tortillera Turbo heavy armored cooler bounce! */
  public playShieldBlock(): void {
    if (this.muted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [330, 660, 990].forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = idx === 0 ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(f, now);
      o.frequency.exponentialRampToValueAtTime(f * 1.18, now + 0.14);
      g.gain.setValueAtTime(0.22 / (idx + 1), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      o.connect(g);
      g.connect(this.sfxGain);
      o.start(now);
      o.stop(now + 0.3);
    });
  }

  /** Urgent countdown blip in final 10 seconds */
  public playClockTick(urgent: boolean): void {
    if (this.muted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'square';
    o.frequency.value = urgent ? 1180 : 880;
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(now);
    o.stop(now + 0.06);
  }

  /** Purchase / unlock new moto celebration */
  public playPurchase(): void {
    this.unlock();
    if (this.muted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      const t = now + i * 0.055;
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g);
      g.connect(this.sfxGain);
      o.start(t);
      o.stop(t + 0.27);
    });
  }

  /** Time's up celebratory end-of-run brass sting */
  public playTimeUp(): void {
    if (this.muted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [659.25, 587.33, 523.25, 783.99].forEach((f, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1800;
      const dur = i === 3 ? 0.55 : 0.14;
      const t = now + i * 0.13;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(lp);
      lp.connect(g);
      g.connect(this.sfxGain);
      o.start(t);
      o.stop(t + dur + 0.02);
    });
  }

  public playClick(): void {
    this.unlock();
    if (this.muted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(660, now);
    o.frequency.exponentialRampToValueAtTime(920, now + 0.045);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(now);
    o.stop(now + 0.065);
  }

  public dispose(): void {
    this.stopMusic();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
