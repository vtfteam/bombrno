'use strict';

/**
 * Per-map look. Everything static (sky, landmarks, tiles) is painted once per map and screen
 * scale into two offscreen layers; per frame only clouds, window flicker, pads, movers,
 * hazard animation and the dragon are drawn.
 */
const Scenery = (() => {
  const CLOUD_W = 180, CLOUD_H = 60;
  const dragon = Sprites.id('🐊', 46);
  const { rng, circle, tri, twinkles } = Kit;
  const clouds = [];
  const moverSprites = new Map();
  const glassCols = [];
  let k = 1, theme = null, sky = null, world = null, cloud = null;


  function layer(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * k);
    c.height = Math.ceil(h * k);
    const g = c.getContext('2d');
    g.scale(k, k);
    return [c, g];
  }

  // ---- tiles, ledges, hazards ---------------------------------------------------------------

  const TILESETS = {
    brick: { base: '#3d291f', blocks: ['#5d3f2e', '#674634'], bw: 15, bh: 15, cap: 'grass' },
    cobble: { base: '#4a4542', blocks: ['#a8a29e', '#99928c'], bw: 10, bh: 10, cap: 'paving' },
    cobbleNight: { base: '#1f1c22', blocks: ['#4e4853', '#45404b'], bw: 10, bh: 10, cap: 'paving', capColor: ['#77707c', '#958d99'] },
    rock: { base: '#2f2a27', blocks: ['#6b5e55', '#5f534b'], bw: 15, bh: 15, cap: 'grass' },
    concrete: { base: '#3f4652', blocks: ['#6b7280', '#747c88'], bw: 30, bh: 15, cap: 'edge' },
    sandstone: { base: '#6e5a40', blocks: ['#c2a878', '#b49a6a'], bw: 15, bh: 15, cap: 'paving', capColor: ['#d9c49a', '#efe2c4'] },
    crypt: { base: '#141110', blocks: ['#3b3330', '#332c29'], bw: 15, bh: 10, cap: 'none' },
    garden: { base: '#352519', blocks: ['#5a4030', '#4f3829'], bw: 15, bh: 15, cap: 'grass' },
    plaster: { base: '#cfcac4', blocks: ['#f4f2ee', '#eeebe6'], bw: 30, bh: 30, cap: 'paving', capColor: ['#cbbd9f', '#e7dcc6'] },
    ice: { base: '#7fb3d6', blocks: ['#e3f4ff', '#d6eefc'], bw: 30, bh: 15, cap: 'ice' },
    asphalt: { base: '#17181b', blocks: ['#2e3036', '#2a2c31'], bw: 30, bh: 15, cap: 'road' },
  };

  function solidTile(g, x, y, ts, capped, underside, r) {
    g.fillStyle = ts.base;
    g.fillRect(x, y, TILE, TILE);
    for (let by = 0; by < TILE; by += ts.bh) {
      const shift = (((y + by) / ts.bh) & 1) * (ts.bw >> 1);
      for (let bx = -shift; bx < TILE; bx += ts.bw) {
        const x0 = Math.max(0, bx), x1 = Math.min(TILE, bx + ts.bw - 1);
        g.fillStyle = ts.blocks[r() < 0.5 ? 0 : 1];
        g.fillRect(x + x0, y + by, x1 - x0, ts.bh - 2);
        g.fillStyle = 'rgba(255,255,255,0.07)';
        g.fillRect(x + x0, y + by, x1 - x0, 2);
      }
    }
    if (underside) {
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(x, y + TILE - 3, TILE, 3);
    }
    if (!capped) return;
    if (ts.cap === 'grass') {
      g.fillStyle = '#2f7d32';
      g.fillRect(x, y, TILE, 9);
      for (let i = 0; i < 3; i++) g.fillRect(x + r() * 26, y + 9, 3, 2 + r() * 4);
      g.fillStyle = '#4caf50';
      g.fillRect(x, y, TILE, 6);
      for (let i = 0; i < 5; i++) {
        const bx = x + r() * TILE;
        tri(g, bx - 1.5, y + 1, bx, y - 3 - r() * 4, bx + 1.5, y + 1);
      }
      g.fillStyle = '#7bd36f';
      g.fillRect(x, y, TILE, 2);
    } else if (ts.cap === 'paving') {
      const [a, b] = ts.capColor || ['#d6d3d1', '#f5f5f4'];
      g.fillStyle = a;
      g.fillRect(x, y, TILE, 6);
      g.fillStyle = b;
      g.fillRect(x, y, TILE, 2);
    } else if (ts.cap === 'ice') {
      g.fillStyle = '#f8fdff';
      g.fillRect(x, y, TILE, 7);
      g.fillStyle = 'rgba(37,99,235,0.6)';
      g.fillRect(x, y + 7, TILE, 2);
    } else if (ts.cap === 'road') {
      g.fillStyle = '#3f4147';
      g.fillRect(x, y, TILE, 5);
      g.fillStyle = '#e5e7eb';
      if (((x / TILE) & 1) === 0) g.fillRect(x + 4, y + 10, 18, 3);
    } else if (ts.cap === 'edge') {
      g.fillStyle = '#9ca3af';
      g.fillRect(x, y, TILE, 6);
      g.fillStyle = '#facc15';
      g.fillRect(x, y + 1, TILE, 3);
    }
  }

  /** Alternate solid style ('X' tiles), chosen by theme.alt. */
  function altTile(g, x, y, capped, kind, r) {
    if (kind === 'cliff') {
      g.fillStyle = '#6f6a63';
      g.fillRect(x, y, TILE, TILE);
      g.fillStyle = '#8b857c';
      for (let i = 0; i < 4; i++) tri(g, x + r() * 30, y + r() * 30, x + r() * 30, y + r() * 30, x + r() * 30, y + r() * 30);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(x, y + TILE - 4, TILE, 4);
      if (capped) { g.fillStyle = '#a8a29a'; g.fillRect(x, y, TILE, 4); }
    } else if (kind === 'onyx') {
      const grd = g.createLinearGradient(x, y, x + TILE, y + TILE);
      grd.addColorStop(0, '#e9b872');
      grd.addColorStop(0.5, '#f7dca4');
      grd.addColorStop(1, '#c98c4a');
      g.fillStyle = grd;
      g.fillRect(x, y, TILE, TILE);
      g.strokeStyle = 'rgba(140,70,20,0.45)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y + 8 + r() * 10);
      g.bezierCurveTo(x + 10, y + r() * 30, x + 20, y + r() * 30, x + TILE, y + 10 + r() * 15);
      g.stroke();
    } else if (kind === 'screen') {
      g.fillStyle = '#0b0f1a';
      g.fillRect(x, y, TILE, TILE);
      g.fillStyle = '#1e293b';
      g.fillRect(x, y, TILE, 3);
      g.fillStyle = 'rgba(56,189,248,0.25)';
      for (let i = 0; i < 6; i++) g.fillRect(x + 2 + (i % 3) * 9, y + 6 + ((i / 3) | 0) * 10, 7, 7);
    } else if (kind === 'steel') {
      g.fillStyle = '#9ca3af';
      g.fillRect(x, y, TILE, TILE);
      g.fillStyle = '#d1d5db';
      g.fillRect(x, y, TILE, 4);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(x + 4, y + 6, 3, TILE - 8);
    } else {
      g.fillStyle = '#1c1917';
      g.fillRect(x, y, TILE, TILE);
      g.fillStyle = 'rgba(255,255,255,0.07)';
      g.fillRect(x + 3, y, 4, TILE);
      if (capped) {
        g.fillStyle = '#44403c';
        g.fillRect(x, y, TILE, 3);
      }
    }
  }

  function awning(g, x, y, colors) {
    for (let i = 0; i < 3; i++) {
      g.fillStyle = colors[i & 1];
      g.fillRect(x + i * 10, y, 10, 9);
      g.beginPath();
      g.arc(x + i * 10 + 5, y + 9, 5, 0, Math.PI);
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(x, y, TILE, 2);
  }

  function conveyorBase(g, x, y) {
    g.fillStyle = '#374151';
    g.fillRect(x, y, TILE, TILE);
    g.fillStyle = '#111827';
    g.fillRect(x, y, TILE, 9);
    g.fillStyle = '#6b7280';
    circle(g, x + 8, y + 18, 4);
    circle(g, x + 22, y + 18, 4);
  }

  function padBase(g, x, y) {
    g.fillStyle = '#1f2937';
    g.fillRect(x + 2, y, TILE - 4, 16);
    g.fillStyle = '#facc15';
    for (let i = 0; i < 4; i++) g.fillRect(x + 4 + i * 6, y + 12, 3, 4);
  }

  function ledge(g, x, y, w, kind, color) {
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(x, y + 10, w, 3);
    if (kind === 'floor') {
      g.fillStyle = color || '#9ca3af';
      g.fillRect(x, y, w, 10);
      g.fillStyle = 'rgba(255,255,255,0.45)';
      g.fillRect(x, y, w, 2);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(x, y + 8, w, 2);
    } else if (kind === 'balcony') {
      g.fillStyle = '#1f2937';
      for (let cx = x + 12; cx < x + w; cx += TILE) g.fillRect(cx, y + 9, 6, 7);
      g.fillRect(x, y - 1, w, 12);
      g.fillStyle = '#3b4252';
      g.fillRect(x, y + 1, w, 8);
      g.fillStyle = '#e5c07b';
      g.fillRect(x, y + 1, w, 2);
      g.fillStyle = '#b08d4a';
      for (let rx = x + 5; rx < x + w; rx += 10) g.fillRect(rx, y + 5, 2, 2);
    } else if (kind === 'coffin') {
      g.fillStyle = '#5b3a24';
      g.beginPath();
      g.moveTo(x + 1, y); g.lineTo(x + w - 1, y); g.lineTo(x + w - 4, y + 12); g.lineTo(x + 4, y + 12);
      g.fill();
      g.fillStyle = '#d4a548';
      g.fillRect(x + 1, y, w - 2, 2);
      for (let cx = x + 8; cx < x + w - 4; cx += 14) g.fillRect(cx, y + 5, 4, 3);
    } else if (kind === 'trellis') {
      g.fillStyle = '#4d7c35';
      g.fillRect(x, y, w, 8);
      g.fillStyle = '#86c06a';
      g.fillRect(x, y, w, 2);
      g.strokeStyle = '#6b4a2b';
      g.lineWidth = 1.5;
      g.beginPath();
      for (let lx = x; lx < x + w; lx += 10) { g.moveTo(lx, y + 8); g.lineTo(lx + 10, y + 16); g.moveTo(lx + 10, y + 8); g.lineTo(lx, y + 16); }
      g.stroke();
    } else if (kind === 'chrome') {
      g.fillStyle = '#f8fafc';
      g.fillRect(x, y, w, 9);
      g.fillStyle = '#94a3b8';
      g.fillRect(x, y + 7, w, 2);
      g.fillStyle = '#e2e8f0';
      for (let cx = x + 13; cx < x + w; cx += TILE) g.fillRect(cx, y + 9, 3, 6);
    } else if (kind === 'bench') {
      g.fillStyle = '#1d4ed8';
      g.fillRect(x, y, w, 10);
      g.fillStyle = '#60a5fa';
      g.fillRect(x, y, w, 2);
      g.fillStyle = '#1e3a8a';
      for (let cx = x + 3; cx < x + w; cx += 10) g.fillRect(cx, y + 4, 7, 4);
    } else if (kind === 'shelter') {
      g.fillStyle = 'rgba(148,197,233,0.55)';
      g.fillRect(x, y, w, 9);
      g.fillStyle = '#cbd5e1';
      g.fillRect(x, y, w, 2);
      g.fillStyle = '#475569';
      g.fillRect(x, y + 8, w, 2);
    } else if (kind === 'girder') {
      g.fillStyle = '#475569';
      g.fillRect(x, y, w, 10);
      g.fillStyle = '#94a3b8';
      g.fillRect(x, y, w, 2);
      g.fillStyle = '#cbd5e1';
      for (let rx = x + 4; rx < x + w; rx += 10) g.fillRect(rx, y + 5, 2, 2);
    } else {
      g.fillStyle = '#9a6233';
      g.fillRect(x, y, w, 10);
      g.fillStyle = '#c98a4b';
      g.fillRect(x, y, w, 2);
      g.fillStyle = '#6b411f';
      g.fillRect(x, y + 8, w, 2);
      for (let sx = x + TILE; sx < x + w; sx += TILE) g.fillRect(sx - 1, y + 2, 1, 6);
      g.fillStyle = '#e0c08a';
      g.fillRect(x + 4, y + 4, 2, 2);
      g.fillRect(x + w - 6, y + 4, 2, 2);
    }
  }

  function hazardTile(g, x, y, kind, r) {
    if (kind === 'bones') {
      g.fillStyle = '#0e0b0a';
      g.fillRect(x, y + 4, TILE, TILE - 4);
      g.fillStyle = '#d6cfc0';
      for (let i = 0; i < 4; i++) {
        const bx = x + r() * 24, by = y + 12 + r() * 14;
        g.fillRect(bx, by, 8, 2);
        circle(g, bx, by + 1, 2);
        circle(g, bx + 8, by + 1, 2);
      }
      Kit.emoji(g, '💀', x + 8 + r() * 14, y + 14 + r() * 6, 12);
    } else if (kind === 'water') {
      const deep = g.createLinearGradient(0, y, 0, y + TILE);
      deep.addColorStop(0, '#1d5f99');
      deep.addColorStop(1, '#0b2a4a');
      g.fillStyle = deep;
      g.fillRect(x, y + 6, TILE, TILE - 6);
    } else if (kind === 'rails') {
      g.fillStyle = '#34343a';
      g.fillRect(x, y + 10, TILE, TILE - 10);
      g.fillStyle = '#55555e';
      for (let i = 0; i < 8; i++) g.fillRect(x + r() * 28, y + 12 + r() * 16, 2, 2);
      g.fillStyle = '#5b4636';
      for (let sx = x + 2; sx < x + TILE; sx += 10) g.fillRect(sx, y + 18, 6, 5);
      g.fillStyle = '#b4b4bc';
      g.fillRect(x, y + 15, TILE, 3);
    } else {
      const lava = g.createLinearGradient(0, y, 0, y + TILE);
      lava.addColorStop(0, '#2a0a14');
      lava.addColorStop(1, '#ff6a2a');
      g.fillStyle = lava;
      g.fillRect(x, y + 6, TILE, TILE - 6);
      for (let i = 0; i < 3; i++) {
        const sx = x + i * 10;
        g.fillStyle = '#d7dde6';
        tri(g, sx, y + TILE, sx + 5, y + 8, sx + 10, y + TILE);
        g.fillStyle = '#8f99a8';
        tri(g, sx + 5, y + 8, sx + 10, y + TILE, sx + 5, y + TILE);
      }
    }
  }

  function tiles(g, r) {
    const ts = TILESETS[theme.tiles];
    for (let row = 0; row < Level.ROWS; row++) {
      for (let c = 0; c < Level.COLS; c++) {
        const t = Level.tileAt(c, row), x = c * TILE, y = row * TILE;
        if (t === T_GLASS) continue;
        if (Level.isSolid(t)) {
          const capped = row > 0 && !Level.isSolid(Level.tileAt(c, row - 1));
          const underside = row < Level.ROWS - 1 && !Level.isSolid(Level.tileAt(c, row + 1));
          if (t === T_CONV_L || t === T_CONV_R) conveyorBase(g, x, y);
          else if (Level.styleAt(c, row) === 1) altTile(g, x, y, capped, theme.alt, r);
          else solidTile(g, x, y, ts, capped && t !== T_PAD, underside, r);
          if (t === T_PAD) padBase(g, x, y);
        } else if (t === T_ONEWAY) {
          ledge(g, x, y, TILE, theme.ledge, theme.floorColors && theme.floorColors[row]);
        } else if (t === T_BOUNCE) {
          awning(g, x, y, theme.awning || ['#dc2626', '#f8fafc']);
        } else if (t === T_SPIKE) {
          hazardTile(g, x, y, theme.hazard, r);
        }
      }
    }
  }

  function buildSky() {
    const [c, g] = layer(VIEW_W, VIEW_H);
    const grd = g.createLinearGradient(0, 0, 0, VIEW_H);
    for (const [at, color] of theme.sky) grd.addColorStop(at, color);
    g.fillStyle = grd;
    g.fillRect(0, 0, VIEW_W, VIEW_H);

    const r = rng(7);
    g.fillStyle = '#fff';
    for (let i = 0; i < theme.stars; i++) {
      const y = r() * 320, s = 0.6 + r() * 1.4;
      g.globalAlpha = (1 - y / 320) * (0.4 + r() * 0.6);
      g.fillRect(r() * VIEW_W, y, s, s);
    }
    g.globalAlpha = 1;

    const o = theme.orb;
    if (!o) { sky = c; return; }
    const glow = g.createRadialGradient(o.x, o.y, o.r * 0.4, o.x, o.y, o.r * 3.5);
    glow.addColorStop(0, `rgba(${o.glow},0.4)`);
    glow.addColorStop(1, `rgba(${o.glow},0)`);
    g.fillStyle = glow;
    g.fillRect(o.x - o.r * 4, o.y - o.r * 4, o.r * 8, o.r * 8);
    g.fillStyle = o.color;
    circle(g, o.x, o.y, o.r);
    if (o.craters) {
      g.fillStyle = 'rgba(160,150,130,0.35)';
      circle(g, o.x - o.r * 0.3, o.y - o.r * 0.3, o.r * 0.23);
      circle(g, o.x + o.r * 0.38, o.y + o.r * 0.38, o.r * 0.15);
      circle(g, o.x + o.r * 0.23, o.y - o.r * 0.46, o.r * 0.12);
    }
    sky = c;
  }

  function buildWorld() {
    const [c, g] = layer(VIEW_W, VIEW_H);
    const r = rng(42);
    twinkles.length = 0;
    Kit.flames.length = 0;
    theme.paint(g, r);
    tiles(g, r);
    if (theme.decorate) theme.decorate(g);
    world = c;
  }

  function buildClouds() {
    const [c, g] = layer(CLOUD_W, CLOUD_H);
    g.fillStyle = theme.cloud || 'rgba(0,0,0,0)';
    g.beginPath();
    for (const [x, y, rad] of [[40, 38, 20], [70, 28, 26], [105, 32, 24], [135, 40, 18], [90, 44, 22]]) {
      g.moveTo(x + rad, y);
      g.arc(x, y, rad, 0, Math.PI * 2);
    }
    g.fill();
    cloud = c;
    if (!clouds.length) {
      const r = rng(3);
      for (let i = 0; i < 5; i++) clouds.push({ x: r() * VIEW_W, y: 30 + r() * 200, s: 0.6 + r() * 0.8, v: 5 + r() * 10 });
    }
  }

  const MOVER_H = { plank: 16, lift: 16, boat: 70, tram: 106, cow: 70, bus: 74 };

  function paintMover(g, kind, w, def) {
    if (kind === 'cow') {
      Kit.emoji(g, '🐄', w / 2, 34, 66);
    } else if (kind === 'bus') {
      g.fillStyle = '#b91c1c';
      g.beginPath();
      g.roundRect(0, 2, w, 60, [8, 8, 4, 4]);
      g.fill();
      g.fillStyle = '#f8fafc';
      g.fillRect(0, 40, w, 6);
      g.fillStyle = '#e5e7eb';
      g.fillRect(4, 0, w - 8, 4);
      for (let x = 8; x < w - 30; x += 24) {
        g.fillStyle = '#0f172a';
        g.fillRect(x, 10, 20, 22);
        g.fillStyle = 'rgba(253,224,71,0.4)';
        g.fillRect(x, 10, 20, 22);
      }
      g.fillStyle = '#111827';
      g.fillRect(w - 30, 8, 24, 14);
      Kit.text(g, def.line || 'N', w - 18, 15, 10, '#fbbf24');
      g.fillStyle = '#111827';
      circle(g, 28, 64, 9);
      circle(g, w - 28, 64, 9);
      g.fillStyle = '#9ca3af';
      circle(g, 28, 64, 3);
      circle(g, w - 28, 64, 3);
      g.fillStyle = '#fde68a';
      g.fillRect(w - 6, 46, 5, 6);
      g.fillRect(1, 46, 5, 6);
    } else if (kind === 'lift') {
      g.fillStyle = '#5b6478';
      g.fillRect(0, 0, w, 12);
      g.fillStyle = '#aab3c5';
      g.fillRect(0, 0, w, 3);
      g.fillStyle = '#facc15';
      g.fillRect(0, 8, w, 4);
      g.fillStyle = '#111';
      for (let x = 0; x < w; x += 10) g.fillRect(x, 8, 5, 4);
    } else if (kind === 'boat') {
      g.fillStyle = '#f8fafc';
      g.beginPath();
      g.moveTo(0, 6); g.lineTo(w, 6); g.lineTo(w - 14, 66); g.lineTo(14, 66);
      g.fill();
      g.fillStyle = '#2563eb';
      g.beginPath();
      g.moveTo(3, 18); g.lineTo(w - 3, 18); g.lineTo(w - 4.5, 24); g.lineTo(4.5, 24);
      g.fill();
      g.fillStyle = '#334155';
      for (let x = 22; x < w - 18; x += 18) circle(g, x, 34, 3);
      ledge(g, 0, 0, w, 'wood');
    } else if (kind === 'tram') {
      g.fillStyle = '#d4d4d8';
      g.fillRect(4, 0, w - 8, 6);
      g.fillStyle = '#dc2626';
      g.beginPath();
      g.roundRect(0, 5, w, 85, [10, 10, 4, 4]);
      g.fill();
      g.fillStyle = '#fef3c7';
      g.fillRect(0, 56, w, 8);
      for (let x = 10; x < w - 20; x += 26) {
        g.fillRect(x - 2, 14, 24, 30);
        g.fillStyle = '#1e293b';
        g.fillRect(x, 16, 20, 26);
        g.fillStyle = 'rgba(253,224,71,0.35)';
        g.fillRect(x, 16, 20, 26);
        g.fillStyle = '#fef3c7';
      }
      g.fillStyle = '#7f1d1d';
      g.fillRect(w / 2 - 10, 46, 20, 44);
      g.fillStyle = '#111827';
      for (const wx of [24, 44, w - 44, w - 24]) circle(g, wx, 98, 8);
      g.fillStyle = '#6b7280';
      for (const wx of [24, 44, w - 44, w - 24]) circle(g, wx, 98, 3);
      g.fillStyle = '#fde68a';
      g.fillRect(2, 70, 5, 6);
      g.fillRect(w - 7, 70, 5, 6);
    } else {
      ledge(g, 0, 0, w, theme.ledge);
    }
  }

  function buildMovers() {
    moverSprites.clear();
    for (const m of Level.movers) {
      const key = m.def.kind + m.w + (m.def.line || '');
      m.spriteKey = key;
      m.spriteH = MOVER_H[m.def.kind];
      if (moverSprites.has(key)) continue;
      const [c, g] = layer(m.w, m.spriteH);
      paintMover(g, m.def.kind, m.w, m.def);
      moverSprites.set(key, c);
    }
  }

  function drawGlass(ctx) {
    const level = Level.glassLevel;
    if (theme.glassStyle === 'stage') {
      ctx.globalAlpha = 0.15 + 0.85 * level;
      for (const gt of Level.glass) {
        ctx.fillStyle = '#7c4a24';
        ctx.fillRect(gt.x, gt.y, TILE, 12);
        ctx.fillStyle = '#b07440';
        ctx.fillRect(gt.x, gt.y, TILE, 2);
        ctx.fillStyle = `hsl(${(gt.x * 1.2) % 360}, 90%, 60%)`;
        ctx.fillRect(gt.x, gt.y + 10, TILE, 3);
      }
      ctx.globalAlpha = 1;
      return;
    }
    for (const col of glassCols) {
      const h = (col.bottom - col.top) * level;
      if (h < 2) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(col.x + 6, col.bottom - 2, 18, 2);
        continue;
      }
      ctx.fillStyle = 'rgba(56,189,248,0.45)';
      ctx.fillRect(col.x + 8, col.bottom - h, 14, h);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(col.x + 8, col.bottom - h, 14, h);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(col.x + 11, col.bottom - h + 4, 2, Math.max(0, h - 8));
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(col.x + 7, col.bottom - h, 16, 2);
    }
  }

  function drawConveyors(ctx, t) {
    ctx.fillStyle = '#fbbf24';
    for (const cv of Level.conveyors) {
      const off = ((t * PHYS.conveyorSpeed * cv.dir) % 15 + 15) % 15;
      for (let i = -1; i < 2; i++) {
        const x = cv.x + off + i * 15;
        if (x < cv.x - 2 || x > cv.x + TILE - 6) continue;
        ctx.beginPath();
        if (cv.dir > 0) { ctx.moveTo(x, cv.y + 1); ctx.lineTo(x + 5, cv.y + 4.5); ctx.lineTo(x, cv.y + 8); }
        else { ctx.moveTo(x + 5, cv.y + 1); ctx.lineTo(x, cv.y + 4.5); ctx.lineTo(x + 5, cv.y + 8); }
        ctx.fill();
      }
    }
  }

  function drawFlames(ctx, t) {
    for (let i = 0; i < Kit.flames.length; i++) {
      const f = Kit.flames[i], fl = 0.75 + 0.25 * Math.sin(t * 17 + i * 3.1) * Math.sin(t * 7 + i);
      ctx.globalAlpha = 0.18 * fl;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(f.x, f.y, 26 * fl, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, 2.5, 6 * fl, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWater(ctx, t) {
    const y = Level.waterY;
    if (y >= VIEW_H) return;
    ctx.fillStyle = 'rgba(56,140,220,0.55)';
    ctx.fillRect(0, y, VIEW_W, VIEW_H - y);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let x = 0; x < VIEW_W; x += 20) ctx.fillRect(x, y + Math.sin(t * 3 + x * 0.05) * 3, 20, 2);
  }

  function drawDisco(ctx, t) {
    for (let i = 0; i < 6; i++) {
      const x = 480 + Math.sin(t * 0.7 + i * 1.7) * 420, y = 260 + Math.cos(t * 0.9 + i * 2.3) * 200;
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = `hsl(${(i * 60 + t * 40) % 360}, 95%, 60%)`;
      ctx.beginPath();
      ctx.arc(x, y, 60, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHazards(ctx, t) {
    const list = Level.spikes;
    if (theme.hazard === 'water') {
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        for (let h = 0; h < 2; h++) {
          const x = s.x + h * 15, wave = Math.sin(t * 2.2 + x * 0.06) * 2.5;
          ctx.fillStyle = 'rgba(70,150,225,0.55)';
          ctx.fillRect(x, s.y + 6 + wave, 15, TILE - 6 - wave);
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.fillRect(x, s.y + 6 + wave, 15, 2);
        }
      }
    } else if (theme.hazard === 'rails') {
      ctx.fillStyle = '#a5f3fc';
      for (let i = 0; i < list.length; i++) {
        if (Math.sin(t * 13 + i * 7.3) < 0.93) continue;
        const s = list[i];
        ctx.fillRect(s.x + 8 + (i * 5) % 14, s.y + 8, 2, 8);
        ctx.fillRect(s.x + 4 + (i * 5) % 14, s.y + 12, 10, 2);
      }
    } else {
      ctx.fillStyle = '#ff6e28';
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        ctx.globalAlpha = 0.12 + 0.1 * Math.sin(t * 3 + i * 0.9);
        ctx.fillRect(s.x, s.y - 12, TILE, TILE + 12);
      }
      ctx.globalAlpha = 1;
    }
  }

  return {
    build(scale) {
      k = scale;
      theme = THEMES[Level.map.theme];
      buildSky();
      buildWorld();
      buildClouds();
      buildMovers();
      glassCols.length = 0;
      for (const gt of Level.glass) {
        const col = glassCols.find(o => o.x === gt.x);
        if (col) { col.top = Math.min(col.top, gt.y); col.bottom = Math.max(col.bottom, gt.y + TILE); }
        else glassCols.push({ x: gt.x, top: gt.y, bottom: gt.y + TILE });
      }
    },

    drawBack(ctx, v, t) {
      ctx.setTransform(v.k, 0, 0, v.k, 0, 0);
      ctx.drawImage(sky, 0, 0, VIEW_W, VIEW_H);
      const span = VIEW_W + CLOUD_W;
      if (theme.cloud) for (const cl of clouds) {
        ctx.drawImage(cloud, (cl.x + t * cl.v) % span - CLOUD_W, cl.y, CLOUD_W * cl.s, CLOUD_H * cl.s);
      }
      applyView(ctx, v);
      ctx.drawImage(world, 0, 0, VIEW_W, VIEW_H);
      for (const w of twinkles) {
        ctx.fillStyle = Math.sin(t * w.speed + w.phase) > 0 ? '#ffd27a' : w.dark;
        ctx.fillRect(w.x, w.y, 5, 7);
      }
    },

    drawDynamic(ctx, v, t, alpha) {
      applyView(ctx, v);
      ctx.lineWidth = 2;
      for (const p of Level.pads) {
        const plateY = p.y - 12 * p.t;
        ctx.strokeStyle = '#cbd5e1';
        ctx.beginPath();
        const bottom = p.y + 12, h = bottom - (plateY + 4);
        ctx.moveTo(p.x + 15, bottom);
        for (let i = 1; i <= 4; i++) ctx.lineTo(p.x + (i % 2 ? 7 : 23), bottom - h * i / 4);
        ctx.stroke();
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(p.x + 3, plateY, TILE - 6, 5);
        ctx.fillStyle = '#86efac';
        ctx.fillRect(p.x + 3, plateY, TILE - 6, 2);
      }

      ctx.strokeStyle = '#4b5563';
      for (const m of Level.movers) {
        const x = m.px + (m.x - m.px) * alpha, y = m.py + (m.y - m.py) * alpha;
        if (m.def.kind === 'lift') {
          ctx.beginPath();
          ctx.moveTo(x + 8, 0); ctx.lineTo(x + 8, y);
          ctx.moveTo(x + m.w - 8, 0); ctx.lineTo(x + m.w - 8, y);
          ctx.stroke();
        } else if (m.def.kind === 'tram') {
          ctx.beginPath();
          ctx.moveTo(x + m.w / 2 - 14, y); ctx.lineTo(x + m.w / 2, y - 18); ctx.lineTo(x + m.w / 2 + 14, y);
          ctx.moveTo(x + m.w / 2 - 12, y - 18); ctx.lineTo(x + m.w / 2 + 12, y - 18);
          ctx.stroke();
        }
        const bob = m.def.kind === 'boat' ? Math.sin(t * 2.5 + m.x * 0.02) * 1.5 : 0;
        const sprite = moverSprites.get(m.spriteKey);
        if (m.def.kind === 'cow' && m.dx > 0) {
          ctx.save();
          ctx.translate(x + m.w, y);
          ctx.scale(-1, 1);
          ctx.drawImage(sprite, 0, 0, m.w, m.spriteH);
          ctx.restore();
        } else {
          ctx.drawImage(sprite, x, y + bob, m.w, m.spriteH);
        }
      }

      drawHazards(ctx, t);
      drawGlass(ctx);
      drawConveyors(ctx, t);
      drawFlames(ctx, t);
      drawWater(ctx, t);
      if (theme.disco) drawDisco(ctx, t);

      if (theme.dragon) {
        ctx.translate(480, 0);
        ctx.rotate(Math.sin(t * 1.4) * 0.1);
        ctx.strokeStyle = '#8b8b8b';
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, 40);
        ctx.stroke();
        Sprites.draw(ctx, dragon, 0, 58);
      }
    },
  };
})();
