'use strict';

/** Shared drawing helpers for the static scenery (src/themes.js, src/scenery.js). */
const Kit = (() => {
  const twinkles = [], flames = [];
  const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

  function rng(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function layer(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * k);
    c.height = Math.ceil(h * k);
    const g = c.getContext('2d');
    g.scale(k, k);
    return [c, g];
  }

  function circle(g, x, y, r) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  function tri(g, x0, y0, x1, y1, x2, y2) {
    g.beginPath();
    g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x2, y2);
    g.fill();
  }

  function hill(g, color, base, amp, f1, f2, phase) {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, VIEW_H);
    for (let x = 0; x <= VIEW_W; x += 20) {
      g.lineTo(x, base - Math.sin(x * f1 + phase) * amp - Math.sin(x * f2 + 1) * amp * 0.45);
    }
    g.lineTo(VIEW_W, VIEW_H);
    g.fill();
  }

  /** Row of houses with lit windows; with o.twinkle some flicker at runtime (only if nothing is painted over them). */
  function city(g, r, o) {
    let x = -10;
    while (x < VIEW_W) {
      const w = 34 + r() * 46, h = o.minH + r() * (o.maxH - o.minH), top = 480 - h;
      const s = Math.floor(r() * 10);
      g.fillStyle = `rgb(${o.rgb[0] + s}, ${o.rgb[1] + s}, ${o.rgb[2] + s})`;
      g.fillRect(x, top, w, h);
      const roof = r();
      if (roof < 0.35) tri(g, x - 2, top, x + w / 2, top - 14 - r() * 12, x + w + 2, top);
      else if (roof < 0.55) g.fillRect(x + w * 0.7, top - 12, 6, 12);
      for (let wy = top + 10; wy < 470; wy += 16) {
        for (let wx = x + 6; wx < x + w - 8; wx += 12) {
          const lit = r() < o.lit;
          if (r() < 0.05 && o.twinkle && !Level.solidPx(wx, wy) && !Level.solidPx(wx + 5, wy + 7)) {
            twinkles.push({ x: wx, y: wy, phase: r() * 6.28, speed: 0.3 + r() * 1.2, dark: o.dark });
          }
          g.fillStyle = lit ? 'rgba(255,205,110,0.85)' : 'rgba(0,0,0,0.25)';
          g.fillRect(wx, wy, 5, 7);
        }
      }
      x += w + 2 + r() * 6;
    }
  }

  /** Emoji painted into a static layer (painted once per build, so fillText is fine here). */
  function emoji(g, ch, x, y, size) {
    g.font = `${size}px ${EMOJI_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ch, x, y);
  }

  function text(g, s, x, y, size, color, align = 'center') {
    g.font = `bold ${size}px ${UI_FONT}`;
    g.textAlign = align;
    g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText(s, x, y);
  }

  return { rng, circle, tri, hill, city, emoji, text, twinkles, flames };
})();
