class AudioManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.ctx = null;
    this.initialized = false;
    this.player = null;

    // Master / channel gains
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.uiGain = null;

    // 16-slot SFX pool
    this.sfxSlots = [];
    this.MAX_SLOTS = 16;

    // Payout triad engine state
    this.C_MAJOR_SCALE = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
    this.comboIndex = 0;
    this.lastPickupTime = 0;
    this.COMBO_TIMEOUT = 0.6;

    // Priority ducking state
    this.activeDucks = [];
    this.duckTimers = [];

    // Boss active state
    this.bossActive = false;

    // Continuous sounds
    this._orbitHumNode = null;
    this._orbitHumGain = null;
    this._orbitHumRunning = false;
    this._magnetHumNode = null;
    this._magnetHumGain = null;
    this._magnetTimer = 0;
  }

  // ─────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;

      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);

      // Channel gains
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.85;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.7;
      this.musicGain.connect(this.masterGain);

      this.uiGain = this.ctx.createGain();
      this.uiGain.gain.value = 1.0;
      this.uiGain.connect(this.masterGain);

      // Init SFX pool
      for (let i = 0; i < this.MAX_SLOTS; i++) {
        this.sfxSlots.push({ active: false, startTime: 0, priority: 10, gainNode: null });
      }

      // Wire game events
      this._wireEvents();

    } catch (e) {
      console.warn('Web Audio not supported');
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setPlayer(player) {
    this.player = player;
  }

  // ─────────────────────────────────────────────
  // EVENT WIRING — Map game events to sounds
  // ─────────────────────────────────────────────

  _wireEvents() {
    const bus = this.eventBus;

    // PICKUP — route by pickupData.id
    bus.on('pickup', (data) => {
      const id = data.pickup?.pickupData?.id;
      if (id === 'exp_small') this._playPickupTriad(data.pickup);
      else if (id === 'gold_coin') this._playGoldArpeggio(data.pickup);
      else if (id === 'pickup_weapon_level_up' || id === 'magnet' || id === 'health') this.play('powerup_collect', { sourceX: data.pickup?.x, sourceY: data.pickup?.y });
      else if (id === 'screen_wipe') this.play('screenwipe');
    });

    // DEATH — route by enemy type (skip boss — handled by bossDeath)
    bus.on('death', (data) => {
      if (data.type === 'boss_gravekeeper') return;
      if (data.type === 'player') { this.play('player_death'); return; }
      const killMap = { zombie: 'zombie_kill', bat: 'bat_kill', skeleton: 'skeleton_kill', ghost: 'ghost_kill', caster: 'caster_kill' };
      if (killMap[data.type]) this.play(killMap[data.type]);
    });

    // WEAPON EVENTS
    bus.on('weaponFire', (data) => {
      if (data.weaponId === 'w1_projectile') this.play('w1_fire');
      else if (data.weaponId === 'w4_flame_wave') this.play('w4_fire');
      else if (data.weaponId === 'w5_arcane_bolt') this.play('w5_fire');
      else if (data.weaponId === 'w6_dagger') this.play('w6_fire');
      else if (data.weaponId === 'w7_sword') this.play('w7_fire');
      else if (data.weaponId === 'w8_claymore') this.play('w8_fire');
    });
    bus.on('projectileHit', () => this.play('weapon_hit'));
    bus.on('areaPulse', () => this.play('w3_pulse'));
    bus.on('weaponLevelUp', () => this.play('powerup_collect'));
    bus.on('weaponUnlock', (data) => {
      this.play('weapon_unlock');
      // Start W2 hum if orbit weapon unlocked
      if (data.weaponId === 'w2_orbit') this.startOrbitHum();
    });

    // PLAYER DAMAGE
    bus.on('contactDamage', () => this.play('player_hurt'));

    // LEVEL UP & UI
    bus.on('levelUp', () => this.play('levelup'));
    bus.on('selectUpgrade', () => this.play('ui_click'));

    // BOSS
    bus.on('bossSpawn', (data) => {
      this.bossActive = true;
      this.play('boss_spawn');
      this._duckForBoss(true);
    });
    bus.on('bossDeath', () => {
      this.bossActive = false;
      this.play('boss_death');
      this._duckForBoss(false);
      this.stopOrbitHum();
    });
    bus.on('bossCharge', (data) => {
      if (data.phase === 'windup') this.play('boss_charge');
    });

    // MAGNET
    bus.on('magnetActivate', () => this._startMagnetHum());

    // RESTART
    bus.on('restart', () => {
      this.play('restart');
      this.stopOrbitHum();
      this._stopMagnetHum();
      this.bossActive = false;
    });

    // GAME OVER (player death triggers this)
    bus.on('stateChange', (data) => {
      if (data.to === 'gameOver' || data.to === 'endScreen') {
        this.stopOrbitHum();
        this._stopMagnetHum();
      }
    });
  }

  // ─────────────────────────────────────────────
  // SOUND POOL — 16-slot eviction
  // ─────────────────────────────────────────────

  _acquireSlot(priority) {
    // Find free slot
    for (let i = 0; i < this.MAX_SLOTS; i++) {
      if (!this.sfxSlots[i].active) return i;
    }
    // All occupied — evict lowest priority (highest number = lowest)
    let worstIdx = 0;
    let worstPri = -1;
    for (let i = 0; i < this.MAX_SLOTS; i++) {
      if (this.sfxSlots[i].priority > worstPri) {
        worstPri = this.sfxSlots[i].priority;
        worstIdx = i;
      }
    }
    // Don't evict if new sound is lower priority
    if (priority > worstPri) return -1;
    // Stop the evicted sound
    this._stopSlot(worstIdx);
    return worstIdx;
  }

  _stopSlot(idx) {
    const slot = this.sfxSlots[idx];
    if (!slot.active) return;
    try {
      if (slot.oscillator) { slot.oscillator.stop(); slot.oscillator.disconnect(); }
      if (slot.noiseSource) { slot.noiseSource.stop(); slot.noiseSource.disconnect(); }
      if (slot.gainNode) slot.gainNode.disconnect();
      if (slot.filterNode) slot.filterNode.disconnect();
    } catch (e) { /* already stopped */ }
    slot.active = false;
  }

  _releaseSlot(idx) {
    const slot = this.sfxSlots[idx];
    if (!slot) return;
    setTimeout(() => this._stopSlot(idx), 50);
  }

  // ─────────────────────────────────────────────
  // PLAY — Main entry point
  // ─────────────────────────────────────────────

  play(soundId, opts) {
    if (!this.ctx || !this.initialized) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    opts = opts || {};
    const priority = opts.priority || 9;
    const channel = opts.channel || 'sfx';
    const dist = this._getDistance(opts.sourceX, opts.sourceY);
    const vol = this._distanceVolume(dist, opts.minVol);

    switch (soundId) {
      // WEAPONS
      case 'w1_fire': this._synthW1Fire(vol); break;
      case 'w4_fire': this._synthW4Fire(vol); break;
      case 'w5_fire': this._synthW5Fire(vol); break;
      case 'w6_fire': this._synthW6Fire(vol); break;
      case 'w7_fire': this._synthW7Fire(vol); break;
      case 'w8_fire': this._synthW8Fire(vol); break;
      case 'w3_pulse': this._synthW3Pulse(vol); break;
      case 'weapon_hit': this._synthWeaponHit(vol); break;
      case 'weapon_unlock': this._synthWeaponUnlock(vol, channel); break;

      // ENEMY KILLS
      case 'zombie_kill': this._synthEnemyKill(vol, 'zombie'); break;
      case 'bat_kill': this._synthEnemyKill(vol, 'bat'); break;
      case 'skeleton_kill': this._synthEnemyKill(vol, 'skeleton'); break;
      case 'ghost_kill': this._synthEnemyKill(vol, 'ghost'); break;
      case 'caster_kill': this._synthEnemyKill(vol, 'caster'); break;

      // BOSS
      case 'boss_spawn': this._synthBossSpawn(vol, channel); break;
      case 'boss_death': this._synthBossDeath(vol, channel); break;
      case 'boss_charge': this._synthBossCharge(vol); break;

      // PLAYER
      case 'player_hurt': this._synthPlayerHurt(vol, channel); break;
      case 'player_death': this._synthPlayerDeath(vol, channel); break;

      // UI
      case 'levelup': this._synthLevelUp(vol, channel); break;
      case 'ui_click': this._synthUIClick(vol, channel); break;
      case 'restart': this._synthRestart(vol, channel); break;

      // POWER-UPS
      case 'powerup_collect': this._synthPowerUp(vol, channel); break;
      case 'screenwipe': this._synthScreenWipe(vol, channel); break;

      default: break;
    }
  }

  // ─────────────────────────────────────────────
  // DISTANCE-BASED AUDIO
  // ─────────────────────────────────────────────

  _getDistance(sourceX, sourceY) {
    if (!this.player || sourceX == null || sourceY == null) return 0;
    const dx = sourceX - this.player.x;
    const dy = sourceY - this.player.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  _distanceVolume(dist, minVol) {
    minVol = minVol || 0.2;
    if (dist <= 0) return 1.0;
    if (dist <= 100) return 1.0;
    if (dist <= 200) return 0.7;
    if (dist <= 400) return 0.4;
    return minVol;
  }

  // ─────────────────────────────────────────────
  // PAYOUT TRIAD ENGINE — XP & Gold pickups
  // ─────────────────────────────────────────────

  _playPickupTriad(pickupEntity) {
    const now = this.ctx.currentTime;
    // Combo stepping
    if (now - this.lastPickupTime > this.COMBO_TIMEOUT) this.comboIndex = 0;
    this.lastPickupTime = now;

    const baseFreq = this.C_MAJOR_SCALE[this.comboIndex % this.C_MAJOR_SCALE.length];
    this.comboIndex++;

    const gain = 0.08 + Math.random() * 0.04; // 0.08–0.12
    const jitter = (Math.random() - 0.5) * 30; // ±15 Hz

    // 3-note arpeggio: Base → x1.5 → x2.0
    const notes = [baseFreq + jitter, (baseFreq + jitter) * 1.5, (baseFreq + jitter) * 2.0];
    const noteLen = 0.015;
    const noteGap = 0.02;

    for (let i = 0; i < notes.length; i++) {
      this._playNote(notes[i], gain, now + i * noteGap, noteLen, 'square', 'sfx');
    }
  }

  _playGoldArpeggio(pickupEntity) {
    const now = this.ctx.currentTime;
    if (now - this.lastPickupTime > this.COMBO_TIMEOUT) this.comboIndex = 0;
    this.lastPickupTime = now;

    const baseFreq = this.C_MAJOR_SCALE[this.comboIndex % this.C_MAJOR_SCALE.length];
    this.comboIndex++;

    const gain = 0.09 + Math.random() * 0.04;
    const jitter = (Math.random() - 0.5) * 30;

    // Brighter pattern: Base → x1.25 → x1.5
    const notes = [baseFreq + jitter, (baseFreq + jitter) * 1.25, (baseFreq + jitter) * 1.5];
    const noteLen = 0.012;
    const noteGap = 0.018;

    for (let i = 0; i < notes.length; i++) {
      this._playNote(notes[i], gain, now + i * noteGap, noteLen, 'square', 'sfx');
    }
  }

  // ─────────────────────────────────────────────
  // SYNTHESIS — All sound functions
  // ─────────────────────────────────────────────

  // Helper: play a single note
  _playNote(freq, vol, startTime, duration, waveform, channel) {
    const slotIdx = this._acquireSlot(9);
    if (slotIdx < 0) return;
    const slot = this.sfxSlots[slotIdx];
    slot.active = true;
    slot.startTime = startTime;
    slot.priority = 9;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = waveform || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.003);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    const dest = channel === 'ui' ? this.uiGain : this.sfxGain;
    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);

    slot.oscillator = osc;
    slot.gainNode = gain;
    slot.filterNode = null;

    osc.onended = () => {
      slot.active = false;
      try { osc.disconnect(); gain.disconnect(); } catch(e) {}
    };
  }

  // Helper: noise burst
  _playNoise(vol, startTime, duration, filterFreq, filterQ, channel) {
    const slotIdx = this._acquireSlot(8);
    if (slotIdx < 0) return;
    const slot = this.sfxSlots[slotIdx];
    slot.active = true;
    slot.startTime = startTime;
    slot.priority = 8;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq || 800;
    filter.Q.value = filterQ || 1;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.002);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    const dest = channel === 'ui' ? this.uiGain : this.sfxGain;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    source.start(startTime);
    source.stop(startTime + duration + 0.01);

    slot.noiseSource = source;
    slot.gainNode = gain;
    slot.filterNode = filter;

    source.onended = () => {
      slot.active = false;
      try { source.disconnect(); filter.disconnect(); gain.disconnect(); } catch(e) {}
    };
  }

  // --- WEAPON SOUNDS ---

  _synthW1Fire(vol) {
    // Short square blip, pitch scales with damage
    const freq = 600 + Math.random() * 200;
    this._playNote(freq, vol * 0.12, this.ctx.currentTime, 0.03, 'square', 'sfx');
  }

  _synthW4Fire(vol) {
    // Flame whoosh — noise burst + low sine
    const t = this.ctx.currentTime;
    this._playNote(180, vol * 0.15, t, 0.12, 'sawtooth', 'sfx');
    this._playNote(240, vol * 0.1, t + 0.02, 0.08, 'sine', 'sfx');
  }

  _synthW5Fire(vol) {
    // Arcane ping — rising tone
    const t = this.ctx.currentTime;
    this._playNote(500, vol * 0.1, t, 0.15, 'sine', 'sfx');
    this._playNote(800, vol * 0.08, t + 0.05, 0.1, 'sine', 'sfx');
  }

  _synthW6Fire(vol) {
    // Dagger slash — quick high swoosh
    const freq = 1200 + Math.random() * 400;
    this._playNote(freq, vol * 0.1, this.ctx.currentTime, 0.04, 'sawtooth', 'sfx');
  }

  _synthW7Fire(vol) {
    // Sword combo — punchy mid-range hit
    const t = this.ctx.currentTime;
    this._playNote(300, vol * 0.12, t, 0.06, 'square', 'sfx');
    this._playNote(250, vol * 0.08, t + 0.12, 0.05, 'square', 'sfx');
    this._playNote(350, vol * 0.14, t + 0.24, 0.08, 'square', 'sfx');
  }

  _synthW8Fire(vol) {
    // Claymore slam — deep heavy impact
    const t = this.ctx.currentTime;
    this._playNote(100, vol * 0.2, t, 0.15, 'sawtooth', 'sfx');
    this._playNote(60, vol * 0.15, t + 0.05, 0.2, 'sine', 'sfx');
  }

  _synthW3Pulse(vol) {
    // Sawtooth → LP filter burst: 800Hz → 200Hz over 0.3s
    const t = this.ctx.currentTime;
    const slotIdx = this._acquireSlot(6);
    if (slotIdx < 0) return;
    const slot = this.sfxSlots[slotIdx];
    slot.active = true; slot.startTime = t; slot.priority = 6;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.linearRampToValueAtTime(200, t + 0.3);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.2, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.4);

    slot.oscillator = osc; slot.gainNode = gain; slot.filterNode = filter;
    osc.onended = () => { slot.active = false; };
  }

  _synthWeaponHit(vol) {
    // Short noise burst 200–800Hz
    this._playNoise(vol * 0.08, this.ctx.currentTime, 0.03, 500, 1.5, 'sfx');
  }

  _synthWeaponUnlock(vol, channel) {
    // Rising triad: C5→E5→G5
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    for (let i = 0; i < notes.length; i++) {
      this._playNote(notes[i], vol * 0.18, t + i * 0.05, 0.08, 'square', channel);
    }
  }

  // --- ENEMY KILL SOUNDS ---

  _synthEnemyKill(vol, type) {
    const t = this.ctx.currentTime;
    const freqs = {
      zombie: { start: 400, end: 100, dur: 0.15, wave: 'square' },
      bat: { start: 1200, end: 800, dur: 0.08, wave: 'square' },
      skeleton: { start: 300, end: 150, dur: 0.2, wave: 'square' },
      ghost: { start: 600, end: 200, dur: 0.3, wave: 'sine' },
      caster: { start: 500, end: 200, dur: 0.15, wave: 'square' },
    };
    const s = freqs[type] || freqs.zombie;

    const slotIdx = this._acquireSlot(7);
    if (slotIdx < 0) return;
    const slot = this.sfxSlots[slotIdx];
    slot.active = true; slot.startTime = t; slot.priority = 7;

    const osc = this.ctx.createOscillator();
    osc.type = s.wave;
    osc.frequency.setValueAtTime(s.start, t);
    osc.frequency.linearRampToValueAtTime(s.end, t + s.dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.12, t);
    gain.gain.linearRampToValueAtTime(0, t + s.dur);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + s.dur + 0.01);

    slot.oscillator = osc; slot.gainNode = gain;

    // Skeleton gets a layered noise (armor clank)
    if (type === 'skeleton') {
      this._playNoise(vol * 0.06, t, 0.1, 600, 2, 'sfx');
    }
    // Ghost gets an ethereal wail (sine + slight reverb feel via second osc)
    if (type === 'ghost') {
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(s.start * 1.5, t);
      osc2.frequency.linearRampToValueAtTime(s.end * 0.5, t + s.dur);
      const g2 = this.ctx.createGain();
      g2.gain.setValueAtTime(vol * 0.05, t);
      g2.gain.linearRampToValueAtTime(0, t + s.dur);
      osc2.connect(g2); g2.connect(this.sfxGain);
      osc2.start(t); osc2.stop(t + s.dur + 0.01);
    }

    osc.onended = () => { slot.active = false; };
  }

  // --- BOSS SOUNDS ---

  _synthBossSpawn(vol, channel) {
    // Ground-shaking impact: 80Hz → 40Hz
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.linearRampToValueAtTime(40, t + 1.0);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.25, t);
    gain.gain.linearRampToValueAtTime(0, t + 1.0);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 1.05);

    // Layered noise
    this._playNoise(vol * 0.15, t, 0.5, 100, 0.5, channel);
  }

  _synthBossDeath(vol, channel) {
    // Layered: 60Hz + 120Hz + 240Hz over 2.0s
    const t = this.ctx.currentTime;
    const freqs = [60, 120, 240];
    for (const freq of freqs) {
      const osc = this.ctx.createOscillator();
      osc.type = freq === 60 ? 'sine' : 'square';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq * 0.5, t + 2.0);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.15, t);
      gain.gain.linearRampToValueAtTime(0, t + 2.0);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 2.05);
    }
    // Deep noise burst
    this._playNoise(vol * 0.12, t, 0.8, 80, 0.5, channel);
  }

  _synthBossCharge(vol) {
    // Low sweep: 80Hz → 120Hz over 0.4s (warning growl)
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.linearRampToValueAtTime(120, t + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.15, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  // --- PLAYER SOUNDS ---

  _synthPlayerHurt(vol, channel) {
    // 200Hz → 100Hz blunt impact
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.linearRampToValueAtTime(100, t + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.18, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.12);

    osc.connect(gain);
    gain.connect(channel === 'ui' ? this.uiGain : this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  _synthPlayerDeath(vol, channel) {
    // Slow descending wail: 400Hz → 50Hz over 1.5s
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.linearRampToValueAtTime(50, t + 1.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.2, t);
    gain.gain.linearRampToValueAtTime(0, t + 1.6);

    osc.connect(gain);
    gain.connect(channel === 'ui' ? this.uiGain : this.sfxGain);
    osc.start(t);
    osc.stop(t + 1.7);
  }

  // --- UI SOUNDS ---

  _synthLevelUp(vol, channel) {
    // Ascending scale: C5→E5→G5→C6 over 0.2s
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    for (let i = 0; i < notes.length; i++) {
      this._playNote(notes[i], vol * 0.2, t + i * 0.05, 0.1, 'square', channel);
    }
  }

  _synthUIClick(vol, channel) {
    // Tiny sine 800Hz
    this._playNote(800, vol * 0.08, this.ctx.currentTime, 0.02, 'sine', channel);
  }

  _synthRestart(vol, channel) {
    // Quick ascending blip: 440Hz → 880Hz
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(880, t + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.12, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.12);

    osc.connect(gain);
    gain.connect(this.uiGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // --- POWER-UP SOUNDS ---

  _synthPowerUp(vol, channel) {
    // Full 5-note arpeggio: Base→x1.25→x1.5→x2.0→x2.5
    const t = this.ctx.currentTime;
    const base = 523.25 + (Math.random() - 0.5) * 20;
    const ratios = [1, 1.25, 1.5, 2.0, 2.5];
    for (let i = 0; i < ratios.length; i++) {
      this._playNote(base * ratios[i], vol * 0.18, t + i * 0.025, 0.08, 'square', channel);
    }
  }

  _synthScreenWipe(vol, channel) {
    // Dramatic sweep: 2000Hz → 100Hz + noise burst over 1.5s
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2000, t);
    osc.frequency.linearRampToValueAtTime(100, t + 1.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.2, t);
    gain.gain.linearRampToValueAtTime(0, t + 1.6);

    const dest = channel === 'ui' ? this.uiGain : this.sfxGain;
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 1.6);

    // Noise burst layer
    this._playNoise(vol * 0.12, t, 0.8, 500, 1, channel);
  }

  // ─────────────────────────────────────────────
  // CONTINUOUS SOUNDS — W2 Orbit Hum
  // ─────────────────────────────────────────────

  startOrbitHum() {
    if (this._orbitHumRunning || !this.ctx) return;
    this._orbitHumRunning = true;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = 110;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 165; // Perfect 5th

    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);
    osc1.start();
    osc2.start();

    this._orbitHumNode = [osc1, osc2];
    this._orbitHumGain = gain;
  }

  stopOrbitHum() {
    if (!this._orbitHumRunning || !this._orbitHumGain) return;
    this._orbitHumRunning = false;
    const t = this.ctx.currentTime;
    this._orbitHumGain.gain.linearRampToValueAtTime(0, t + 0.3);
    const nodes = this._orbitHumNode;
    setTimeout(() => {
      if (nodes) nodes.forEach(n => { try { n.stop(); n.disconnect(); } catch(e) {} });
    }, 400);
    this._orbitHumNode = null;
    this._orbitHumGain = null;
  }

  // ─────────────────────────────────────────────
  // CONTINUOUS SOUNDS — Magnet Hum
  // ─────────────────────────────────────────────

  _startMagnetHum() {
    if (this._magnetHumNode) return; // already playing
    if (!this.ctx) return;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 220;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 330; // Perfect 5th

    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);
    osc1.start();
    osc2.start();

    this._magnetHumNode = [osc1, osc2];
    this._magnetHumGain = gain;
    this._magnetTimer = 10;

    // Fade out in last 0.5s, stop at 10s
    this._magnetInterval = setInterval(() => {
      this._magnetTimer -= 0.1;
      if (this._magnetTimer <= 0.5 && this._magnetHumGain) {
        this._magnetHumGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + this._magnetTimer);
      }
      if (this._magnetTimer <= 0) this._stopMagnetHum();
    }, 100);
  }

  _stopMagnetHum() {
    if (this._magnetInterval) { clearInterval(this._magnetInterval); this._magnetInterval = null; }
    if (!this._magnetHumNode) return;
    const nodes = this._magnetHumNode;
    this._magnetHumNode = null;
    this._magnetHumGain = null;
    this._magnetTimer = 0;
    setTimeout(() => {
      nodes.forEach(n => { try { n.stop(); n.disconnect(); } catch(e) {} });
    }, 50);
  }

  // ─────────────────────────────────────────────
  // DUCKING — Priority system
  // ─────────────────────────────────────────────

  _duckAll(factor, duration) {
    if (!this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.sfxGain.gain.linearRampToValueAtTime(factor, t + 0.05);
    if (duration > 0) {
      setTimeout(() => {
        if (this.sfxGain) this.sfxGain.gain.linearRampToValueAtTime(0.85, this.ctx.currentTime + 0.1);
      }, duration * 1000);
    }
  }

  _duckForBoss(active) {
    if (!this.sfxGain) return;
    const t = this.ctx.currentTime;
    if (active) {
      this.sfxGain.gain.linearRampToValueAtTime(0.6, t + 0.3);
    } else {
      this.sfxGain.gain.linearRampToValueAtTime(0.85, t + 0.5);
    }
  }

  // Level-up screen duck (called from Game)
  duckForLevelUp(active) {
    if (!this.sfxGain) return;
    const t = this.ctx.currentTime;
    if (active) {
      this.sfxGain.gain.linearRampToValueAtTime(0.1, t + 0.05);
    } else {
      this.sfxGain.gain.linearRampToValueAtTime(0.85, t + 0.2);
    }
  }

  // ═══════════════════════════════════════════════
  // MENU SFX — Title screen navigation sounds
  // ═══════════════════════════════════════════════

  playMenuSound(type) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    switch(type) {
      case 'navigate': this._menuNavigate(t); break;
      case 'select': this._menuSelect(t); break;
      case 'back': this._menuBack(t); break;
      case 'locked': this._menuLocked(t); break;
      case 'slider': this._menuSlider(t); break;
      case 'hover': this._menuHover(t); break;
    }
  }

  _menuNavigate(t) {
    this._playNote(600, 0.10, t, 0.04, 'sine', 'ui');
  }

  _menuSelect(t) {
    const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
    for (let i = 0; i < notes.length; i++) {
      this._playNote(notes[i], 0.15, t + i * 0.04, 0.08, 'square', 'ui');
    }
  }

  _menuBack(t) {
    this._playNote(659.25, 0.10, t, 0.04, 'sine', 'ui');
    this._playNote(523.25, 0.10, t + 0.04, 0.04, 'sine', 'ui');
  }

  _menuLocked(t) {
    this._playNote(200, 0.08, t, 0.08, 'square', 'ui');
  }

  _menuSlider(t) {
    this._playNote(1000, 0.06, t, 0.02, 'sine', 'ui');
  }

  _menuHover(t) {
    this._playNote(800, 0.04, t, 0.015, 'sine', 'ui');
  }

  _playCompanionGrowl() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Short bark + growl: square wave burst 200Hz-400Hz sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.linearRampToValueAtTime(400, t + 0.08);
    osc.frequency.linearRampToValueAtTime(250, t + 0.18);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  _playCompanionBark() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Two quick barks
    for (let i = 0; i < 2; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(500, t + i * 0.12);
      gain.gain.setValueAtTime(0.12, t + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.12 + 0.08);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.08);
    }
  }
}

// ============================================================
// TITLE BGM — Fantasy anime village theme synthesizer
// ============================================================
