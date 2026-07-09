export class RetroAudio {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.musicInterval = null;
    this.tempo = 140; // fast retro race beat
    this.step = 0;

    // Expanded 8-bit melody notes (frequencies) - Mario Kart style:
    // Section A (Arpeggiated happy run): C, F, G, C
    // Section B (Syncopated chorus lead): Am, F, G, C
    this.melody = [
      // Verse arpeggios (8th notes)
      261.63, 329.63, 392.00, 523.25, 392.00, 329.63, // C Major
      349.23, 440.00, 523.25, 698.46, 523.25, 440.00, // F Major
      392.00, 493.88, 587.33, 783.99, 587.33, 493.88, // G Major
      523.25, 659.25, 783.99, 1046.50, 783.99, 659.25, // C Major (high)
      
      // Chorus melody line (longer sustained notes)
      440.00, 440.00, 523.25, 440.00, 587.33, 523.25, // A minor scale lead
      349.23, 349.23, 440.00, 349.23, 523.25, 440.00, // F major
      392.00, 392.00, 493.88, 392.00, 587.33, 493.88, // G major
      523.25, 587.33, 659.25, 783.99, 880.00, 987.77, // Scale run to resolve
      
      // High key modulation chorus
      587.33, 587.33, 698.46, 587.33, 783.99, 698.46, // D minor lead
      523.25, 523.25, 659.25, 523.25, 783.99, 659.25, // C major
      493.88, 493.88, 587.33, 493.88, 783.99, 587.33, // G major
      523.25, 392.00, 329.63, 261.63, 196.00, 130.81  // Descending run back to C
    ];

    this.bass = [
      // Verse bassline
      130.81, 130.81, 130.81, 130.81, // C
      174.61, 174.61, 174.61, 174.61, // F
      196.00, 196.00, 196.00, 196.00, // G
      130.81, 130.81, 130.81, 130.81, // C
      
      // Chorus bassline
      220.00, 220.00, 220.00, 220.00, // A
      174.61, 174.61, 174.61, 174.61, // F
      196.00, 196.00, 196.00, 196.00, // G
      130.81, 130.81, 130.81, 130.81, // C
      
      // Modulated chorus bassline
      146.83, 146.83, 146.83, 146.83, // D
      130.81, 130.81, 130.81, 130.81, // C
      196.00, 196.00, 196.00, 196.00, // G
      130.81, 196.00, 261.63, 392.00  // climbing run
    ];
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // Plays a simple beep for the countdown
  playBeep(isGo = false) {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isGo ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, this.ctx.currentTime); // 880Hz for GO, 440Hz for 3,2,1
    
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  // Sound when collecting a heart
  playCollectSound() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(523.25, time); // C5
    osc.frequency.setValueAtTime(659.25, time + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, time + 0.16); // G5
    osc.frequency.setValueAtTime(1046.50, time + 0.24); // C6
    
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.4);
  }

  // Sound when using a speed boost
  playBoostSound() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, time);
    osc.frequency.exponentialRampToValueAtTime(1200, time + 0.5);
    
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.5);
  }

  // Sound when dropping a banana peel or slipping
  playBananaSound() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, time);
    osc.frequency.exponentialRampToValueAtTime(150, time + 0.4);
    
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.4);
  }

  // Starts the retro background music loop
  startMusic() {
    this.init();
    if (this.isPlaying) return;
    this.isPlaying = true;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const noteDuration = 60 / this.tempo / 2; // 8th notes

    this.musicInterval = setInterval(() => {
      this.playMusicStep();
    }, noteDuration * 1000);
  }

  playMusicStep() {
    const time = this.ctx.currentTime;

    // Melody Note (Square Wave)
    const melodyIndex = this.step % this.melody.length;
    const oscMelody = this.ctx.createOscillator();
    const gainMelody = this.ctx.createGain();
    
    oscMelody.type = 'square';
    oscMelody.frequency.setValueAtTime(this.melody[melodyIndex], time);
    
    gainMelody.gain.setValueAtTime(0.04, time);
    gainMelody.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    oscMelody.connect(gainMelody);
    gainMelody.connect(this.ctx.destination);
    oscMelody.start(time);
    oscMelody.stop(time + 0.18);

    // Bass Note (Triangle Wave)
    if (this.step % 2 === 0) {
      const bassIndex = Math.floor(this.step / 2) % this.bass.length;
      const oscBass = this.ctx.createOscillator();
      const gainBass = this.ctx.createGain();
      
      oscBass.type = 'triangle';
      oscBass.frequency.setValueAtTime(this.bass[bassIndex], time);
      
      gainBass.gain.setValueAtTime(0.08, time);
      gainBass.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

      oscBass.connect(gainBass);
      gainBass.connect(this.ctx.destination);
      oscBass.start(time);
      oscBass.stop(time + 0.35);
    }

    // Drums - Hi-Hat (Short noise burst)
    if (this.step % 2 === 1) {
      this.playNoiseHit(time, 0.02, 0.05); // quick closed hi-hat
    }

    this.step++;
  }

  // Generate white noise for retro hi-hats
  playNoiseHit(time, volume, duration) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to make it sound like a high-pitched cymbal
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(time);
    noise.stop(time + duration);
  }

  // Play a retro victory fanfare when crossing the line on Lap 3
  playFanfare() {
    this.stopMusic();
    this.init();

    const time = this.ctx.currentTime;
    const fanfareNotes = [261.63, 329.63, 392.00, 523.25, 392.00, 523.25];
    const delays = [0, 0.15, 0.3, 0.45, 0.6, 0.75];

    fanfareNotes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time + delays[idx]);

      gain.gain.setValueAtTime(0.08, time + delays[idx]);
      gain.gain.exponentialRampToValueAtTime(0.001, time + delays[idx] + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time + delays[idx]);
      osc.stop(time + delays[idx] + 0.4);
    });
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.isPlaying = false;
  }
}
