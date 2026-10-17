'use strict';

/** Synthesised sound effects — no audio files. */
const Sfx = (() => {
  let ctx = null, out = null, noise = null, muted = false;

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.connect(ctx.destination);
      out = ctx.createGain();
      out.gain.value = 0.45;
      out.connect(comp);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function tone(type, f0, f1, dur, vol, delay = 0) {
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function hiss(dur, vol, f0, f1, delay = 0) {
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise;
    s.loop = true;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random() * 0.25);
    s.stop(t + dur + 0.02);
  }

  function notes(type, freqs, len, vol, gap) {
    freqs.forEach((f, i) => tone(type, f, f * 0.99, i === freqs.length - 1 ? len * 3 : len, vol, i * gap));
  }

  const SOUNDS = {
    jump: p => tone('square', 320 + p * 70, 640 + p * 90, 0.12, 0.1),
    land: () => hiss(0.06, 0.12, 900, 200),
    stomp: () => { tone('square', 200, 50, 0.18, 0.28); tone('triangle', 900, 1600, 0.09, 0.15); },
    drop: () => tone('triangle', 520, 240, 0.09, 0.2),
    tick: () => tone('square', 1500, 1400, 0.025, 0.04),
    boom: () => { hiss(0.7, 0.9, 4000, 120); tone('sine', 140, 35, 0.55, 0.8); },
    hurt: () => tone('sawtooth', 440, 180, 0.16, 0.14),
    spike: () => { tone('sawtooth', 300, 90, 0.3, 0.2); hiss(0.15, 0.2, 3000, 500); },
    death: () => notes('square', [660, 523, 392, 262, 196], 0.08, 0.14, 0.07),
    pad: () => tone('sine', 160, 900, 0.28, 0.3),
    win: () => notes('triangle', [523, 659, 784, 1047, 784, 1047], 0.12, 0.25, 0.11),
    move: () => tone('square', 720, 720, 0.04, 0.06),
    confirm: () => { tone('square', 600, 600, 0.06, 0.1); tone('square', 900, 900, 0.1, 0.1, 0.06); },
    cancel: () => tone('square', 500, 250, 0.1, 0.1),
    error: () => tone('sawtooth', 130, 110, 0.15, 0.12),
    beep: () => tone('square', 440, 440, 0.12, 0.12),
    go: () => tone('square', 880, 880, 0.3, 0.14),
    roar: () => { tone('sawtooth', 110, 60, 0.5, 0.25); hiss(0.4, 0.2, 900, 200); },
    chime: () => notes('sine', [1319, 1568, 2093], 0.15, 0.18, 0.12),
    heal: () => notes('triangle', [660, 880, 1320], 0.06, 0.2, 0.05),
    wind: () => hiss(3.2, 0.25, 600, 250),
    zap: () => { tone('sawtooth', 420, 40, 0.6, 0.2); hiss(0.2, 0.25, 5000, 800); },
    boing: () => tone('sine', 220, 620, 0.18, 0.25),
    throw: () => hiss(0.12, 0.15, 2500, 600),
    splat: () => { hiss(0.15, 0.3, 1200, 200); tone('square', 160, 70, 0.1, 0.12); },
    rumble: () => { hiss(1.6, 0.35, 260, 90); tone('sine', 70, 50, 1.2, 0.3); },
    wobble: () => tone('triangle', 300, 520, 0.4, 0.12),
    fart: () => { tone('sawtooth', 95, 55, 0.45, 0.3); tone('square', 110, 70, 0.35, 0.12, 0.05); hiss(0.4, 0.15, 500, 150); },
    ghost: () => tone('sine', 520, 260, 0.6, 0.18),
    grow: () => tone('square', 200, 800, 0.35, 0.14),
    shrink: () => tone('square', 900, 220, 0.35, 0.14),
    glass: () => notes('sine', [1760, 2093, 2637], 0.05, 0.08, 0.04),
    moo: () => { tone('sawtooth', 160, 120, 0.7, 0.18); tone('sine', 165, 125, 0.7, 0.2); },
    whistle: () => tone('sine', 1800, 400, 0.5, 0.12),
    ring: () => { for (let i = 0; i < 6; i++) tone('square', 1900, 1900, 0.04, 0.05, i * 0.06); },
    horn: () => { tone('sawtooth', 220, 220, 0.5, 0.2); tone('sawtooth', 277, 277, 0.5, 0.15); },
    bell: () => { tone('triangle', 1320, 1300, 0.25, 0.2); tone('triangle', 1320, 1300, 0.25, 0.2, 0.3); },
    bass: () => { tone('sine', 90, 35, 0.6, 0.9); hiss(0.3, 0.3, 300, 80); },
    shush: () => hiss(0.9, 0.35, 7000, 3000),
    gurgle: () => { hiss(1.5, 0.3, 700, 250); tone('sine', 220, 110, 1.2, 0.15); },
    slap: () => { hiss(0.06, 0.6, 6000, 1500); tone('square', 300, 120, 0.06, 0.15); },
  };

  return {
    unlock,
    play(name, arg) {
      if (ctx && !muted && ctx.state === 'running') SOUNDS[name](arg);
    },
    toggleMute() { muted = !muted; },
    get muted() { return muted; },
  };
})();
