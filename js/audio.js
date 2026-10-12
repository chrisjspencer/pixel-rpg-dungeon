// Lightweight synthesized audio so the game needs no external sound assets.
(() => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let context, musicTimer, musicStep = 0;

  function unlock() {
    if (!AudioContext) return;
    if (!context) context = new AudioContext();
    if (context.state === 'suspended') context.resume();
  }

  function tone(frequency, duration, type, volume, delay = 0) {
    if (!context || context.state !== 'running') return;
    const start = context.currentTime + delay;
    const end = start + duration;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end);
  }

  function startMusic() {
    unlock();
    if (!context || musicTimer) return;
    const notes = [110, 130.81, 146.83, 130.81, 98, 116.54, 130.81, 116.54];
    const playStep = () => {
      const note = notes[musicStep % notes.length];
      tone(note, 0.48, 'triangle', 0.035);
      tone(note / 2, 0.48, 'sine', 0.035);
      if (musicStep % 4 === 0) tone(note * 2, 0.2, 'sine', 0.012, 0.08);
      musicStep++;
    };
    playStep();
    musicTimer = window.setInterval(playStep, 520);
  }

  window.DungeonAudio = {
    unlock,
    startMusic,
    attack() { tone(180, 0.12, 'square', 0.045); tone(90, 0.16, 'triangle', 0.035, 0.04); },
    hurt() { tone(110, 0.22, 'sawtooth', 0.05); },
    spell() { tone(440, 0.3, 'sine', 0.045); tone(660, 0.36, 'triangle', 0.03, 0.08); },
    pickup() { tone(660, 0.12, 'sine', 0.035); tone(880, 0.18, 'sine', 0.035, 0.1); },
    stairs() { tone(220, 0.3, 'triangle', 0.04); tone(165, 0.45, 'sine', 0.04, 0.16); },
    victory() { tone(440, 0.5, 'sine', 0.045); tone(554.37, 0.5, 'sine', 0.045, 0.15); tone(659.25, 0.7, 'sine', 0.045, 0.3); },
    defeat() { tone(164.81, 0.55, 'triangle', 0.05); tone(110, 0.8, 'sine', 0.05, 0.3); }
  };
})();
