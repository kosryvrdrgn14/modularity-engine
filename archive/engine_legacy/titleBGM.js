class TitleBGM {
  constructor(audioCtx, musicGain) {
    this.ctx = audioCtx;
    this.masterGain = musicGain;
    this.gainNode = null;
    this.playing = false;
    this.barIndex = 0;
    this.beatTimer = 0;
    this.barDuration = (4 * 60) / 90; // 4 beats at 90 BPM
    this.firstPlay = true;
    this._activeOscs = [];
    this._scheduledBars = 0;

    // D Major scale frequencies
    this.NOTES = {
      D4: 293.66, E4: 329.63, F4: 369.99, G4: 392.00,
      A4: 440.00, B4: 493.88, C5: 554.37, D5: 587.33,
      E5: 659.25, F5: 739.99, G5: 783.99, A5: 880.00,
    };

    // Melody: Main Theme A (bars 1-8)
    this.melodyA = [
      ['D4', 'F4', 'A4', 'D5'], // Bar 1
      ['C5', 'A4', 'B4', 'A4'], // Bar 2
      ['G4', 'B4', 'D5', 'G5'], // Bar 3
      ['F5', 'E5', 'D5', null], // Bar 4 (half note)
      ['D4', 'F4', 'A4', 'D5'], // Bar 5
      ['E5', 'D5', 'C5', 'A4'], // Bar 6
      ['B4', 'G4', 'A4', 'F4'], // Bar 7
      ['E4', null, 'D4', null], // Bar 8 (half notes)
    ];

    // Flute counter-melody (bars 9-12, enters at 0:32)
    this.fluteA = [
      ['A5', 'G5', 'F5', 'E5'], // Bar 9 (dotted quarter + eighth)
      ['D5', 'E5', 'F5', null], // Bar 10
      ['G5', 'F5', 'E5', 'D5'], // Bar 11
      ['C5', 'B4', 'A4', null], // Bar 12
    ];

    // Chords for pad/strings (root notes per bar, bass movement)
    this.chords = [
      'D4', 'D4', 'G4', 'D4', // Bars 1-4: D G A D
      'D4', 'A4', 'G4', 'D4', // Bars 5-8: D Bm Em D
    ];
  }

  init() {
    if (this.gainNode) return;
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0;
    this.gainNode.connect(this.masterGain);
  }

  fadeIn(duration) {
    if (!this.gainNode) this.init();
    this.playing = true;
    const t = this.ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(t);
    this.gainNode.gain.setValueAtTime(0, t);
    this.gainNode.gain.linearRampToValueAtTime(0.4, t + duration);
    this.beatTimer = 0;
    this.barIndex = this.firstPlay ? 0 : 1; // Skip intro on loop
    this._scheduleBar();
  }

  fadeOut(duration) {
    if (!this.gainNode) return;
    const t = this.ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(t);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, t);
    this.gainNode.gain.linearRampToValueAtTime(0, t + duration);
    setTimeout(() => { this.playing = false; this._stopAll(); }, duration * 1000 + 100);
  }

  stop() {
    this.playing = false;
    this._stopAll();
    if (this.gainNode) {
      const t = this.ctx.currentTime;
      this.gainNode.gain.cancelScheduledValues(t);
      this.gainNode.gain.setValueAtTime(0, t);
    }
  }

  update(dt) {
    if (!this.playing || !this.ctx) return;
    this.beatTimer += dt;
    if (this.beatTimer >= this.barDuration) {
      this.beatTimer -= this.barDuration;
      this.barIndex++;
      // Loop: skip intro (bar 0) on repeats
      const totalBars = 12; // 8 melody + 4 flute
      if (this.barIndex >= totalBars) {
        this.barIndex = 1; // Skip intro bar, go to Theme A
        this.firstPlay = false;
      }
      this._scheduleBar();
    }
  }

  _scheduleBar() {
    const barIdx = this.barIndex % 12;
    const t = this.ctx.currentTime;

    // Piano melody (bars 0-7)
    if (barIdx < 8) {
      const notes = this.melodyA[barIdx];
      const beatDur = this.barDuration / 4;
      for (let i = 0; i < notes.length; i++) {
        if (!notes[i]) continue;
        const freq = this.NOTES[notes[i]];
        if (!freq) continue;
        const noteStart = t + i * beatDur;
        const dur = (notes[i + 1] === null || i === notes.length - 1) ? beatDur * 1.5 : beatDur * 0.8;
        this._playTone(freq, 0.25, noteStart, dur, 'triangle');
      }
    }

    // Pad layer (continuous, changes every bar)
    {
      const chordRoot = this.NOTES[this.chords[barIdx % this.chords.length]] || 293.66;
      this._playTone(chordRoot, 0.12, t, this.barDuration * 0.95, 'sawtooth', 600);
      this._playTone(chordRoot * 1.5, 0.06, t, this.barDuration * 0.95, 'sawtooth', 600); // 5th
    }

    // Strings (bars 2+)
    if (barIdx >= 2) {
      const chordRoot = this.NOTES[this.chords[barIdx % this.chords.length]] || 293.66;
      this._playTone(chordRoot, 0.15, t, this.barDuration * 0.9, 'sawtooth', 500);
      this._playTone(chordRoot * 1.25, 0.08, t, this.barDuration * 0.9, 'sawtooth', 500);
    }

    // Flute counter-melody (bars 8-11)
    if (barIdx >= 8 && barIdx < 12) {
      const fluteBar = barIdx - 8;
      const notes = this.fluteA[fluteBar];
      const beatDur = this.barDuration / 4;
      for (let i = 0; i < notes.length; i++) {
        if (!notes[i]) continue;
        const freq = this.NOTES[notes[i]];
        if (!freq) continue;
        const noteStart = t + i * beatDur;
        const dur = (i === notes.length - 1) ? beatDur * 1.5 : beatDur * 0.8;
        this._playTone(freq, 0.18, noteStart, dur, 'sine');
      }
    }
  }

  _playTone(freq, vol, startTime, duration, waveType, filterFreq) {
    const osc = this.ctx.createOscillator();
    osc.type = waveType || 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
    gain.gain.setValueAtTime(vol, startTime + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    if (filterFreq) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }
    gain.connect(this.gainNode);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
    this._activeOscs.push({ osc, gain });

    osc.onended = () => {
      const idx = this._activeOscs.findIndex(o => o.osc === osc);
      if (idx >= 0) this._activeOscs.splice(idx, 1);
      try { osc.disconnect(); gain.disconnect(); } catch(e) {}
    };
  }

  _stopAll() {
    const oscs = [...this._activeOscs];
    this._activeOscs = [];
    for (const { osc } of oscs) {
      try { osc.stop(); } catch(e) {}
    }
  }
}

// ============================================================
// TITLE MENU — Navigation and input handler
// ============================================================
