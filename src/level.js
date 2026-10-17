'use strict';

const T_EMPTY = 0, T_SOLID = 1, T_ONEWAY = 2, T_SPIKE = 3, T_PAD = 4;
const T_BOUNCE = 5, T_GLASS = 6, T_CONV_L = 7, T_CONV_R = 8;

/** The loaded arena: tile grid, jump pads, hazards, moving platforms, spawns. Maps: src/maps.js. */
const Level = (() => {
  const COLS = 32, ROWS = 18;
  const CHARS = {
    ' ': [T_EMPTY, 0], '#': [T_SOLID, 0], 'X': [T_SOLID, 1], '=': [T_ONEWAY, 0], 'v': [T_SPIKE, 0],
    '^': [T_PAD, 0], 'b': [T_BOUNCE, 0], 'g': [T_GLASS, 0], '<': [T_CONV_L, 0], '>': [T_CONV_R, 0],
  };
  const MIRROR = { '<': '>', '>': '<' };
  const grid = new Uint8Array(COLS * ROWS), style = new Uint8Array(COLS * ROWS);
  const pads = [], spikes = [], spawns = [], movers = [], glass = [], conveyors = [], standSpots = [];
  const NO_WATER = VIEW_H + 100;
  let time = 0, map = null, phys = PHYS, glassUp = true, glassLevel = 1, driver = null, waterY = NO_WATER;

  function place(m) {
    if (m.def.manual) {
      m.x = driver ? driver(m) : m.def.x;
      m.y = m.def.y;
      return;
    }
    const s = 0.5 - 0.5 * Math.cos(2 * Math.PI * time / m.def.period);
    const x = m.def.x + m.def.ax * s;
    m.x = m.mirrored ? VIEW_W - x - m.w : x;
    m.y = m.def.y + m.def.ay * s;
  }

  function tileAt(c, r) {
    if (r >= ROWS) return T_SOLID;
    if (r < 0) r = 0;
    c = ((c % COLS) + COLS) % COLS;
    return grid[r * COLS + c];
  }

  function isSolid(t) {
    return t === T_SOLID || t === T_PAD || t === T_CONV_L || t === T_CONV_R || (t === T_GLASS && glassUp);
  }

  function isSurface(t) {
    return t === T_SOLID || t === T_ONEWAY || t === T_CONV_L || t === T_CONV_R;
  }

  function reset() {
    time = 0;
    glassUp = true;
    glassLevel = 1;
    driver = null;
    waterY = NO_WATER;
    for (const m of movers) { place(m); m.px = m.x; m.py = m.y; m.dx = m.dy = 0; }
    for (const p of pads) p.t = 0;
  }

  function load(m) {
    map = m;
    phys = Object.assign({}, PHYS, m.physics);
    m.rows.forEach((half, r) => {
      const row = half + [...half].reverse().map(ch => MIRROR[ch] || ch).join('');
      for (let c = 0; c < COLS; c++) [grid[r * COLS + c], style[r * COLS + c]] = CHARS[row[c]];
    });
    for (const list of [pads, spikes, glass, conveyors, standSpots]) list.length = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = grid[r * COLS + c], at = { c, r, x: c * TILE, y: r * TILE };
        if (t === T_PAD) pads.push({ ...at, t: 0 });
        else if (t === T_SPIKE) spikes.push(at);
        else if (t === T_GLASS) glass.push(at);
        else if (t === T_CONV_L || t === T_CONV_R) conveyors.push({ ...at, dir: t === T_CONV_L ? -1 : 1 });
        else if (t === T_EMPTY && r + 1 < ROWS && isSurface(grid[(r + 1) * COLS + c])) {
          standSpots.push({ x: c * TILE + TILE / 2, y: (r + 1) * TILE });
        }
      }
    }
    spawns.length = 0;
    spawns.push(...m.spawns);
    movers.length = 0;
    for (const def of m.movers) {
      movers.push({ def, mirrored: false, w: def.w, x: 0, y: 0, px: 0, py: 0, dx: 0, dy: 0 });
      if (def.mirror) movers.push({ def, mirrored: true, w: def.w, x: 0, y: 0, px: 0, py: 0, dx: 0, dy: 0 });
    }
    reset();
  }

  return {
    COLS, ROWS, pads, spikes, spawns, movers, glass, conveyors, standSpots,
    load, reset, tileAt, isSolid,
    get map() { return map; },
    get phys() { return phys; },
    get glassUp() { return glassUp; },
    get glassLevel() { return glassLevel; },
    get waterY() { return waterY; },
    styleAt: (c, r) => style[r * COLS + (((c % COLS) + COLS) % COLS)],
    solidPx: (x, y) => isSolid(tileAt(Math.floor(x / TILE), Math.floor(y / TILE))),

    setGlass(up, level) { glassUp = up; glassLevel = level; },
    /** Flood line for the 'ponavka' special; below it counts as a hazard. */
    setWater(y) { waterY = y; },
    /** Positions movers with def.manual (e.g. night buses) instead of the sine path. */
    setDriver(fn) { driver = fn; },

    /** Direction (-1 / 1) of a conveyor under the body's feet, 0 if none. */
    conveyorUnder(b) {
      const t = tileAt(Math.floor((b.x + b.w / 2) / TILE), Math.floor((b.y + b.h + 1) / TILE));
      return t === T_CONV_L ? -1 : t === T_CONV_R ? 1 : 0;
    },

    /** Top y of the first surface at or below fromY in the column of x. */
    surfaceBelow(x, fromY) {
      const c = Math.floor(x / TILE);
      for (let r = Math.max(0, Math.floor(fromY / TILE)); r < ROWS; r++) {
        const t = tileAt(c, r);
        if (isSolid(t) || t === T_ONEWAY || t === T_BOUNCE || t === T_SPIKE) return r * TILE;
      }
      return VIEW_H;
    },

    update(dt) {
      time += dt;
      for (const m of movers) {
        m.px = m.x; m.py = m.y;
        place(m);
        m.dx = m.x - m.px; m.dy = m.y - m.py;
        if (Math.abs(m.dx) > VIEW_W / 2) { m.px = m.x; m.dx = 0; }
      }
      for (const p of pads) p.t = Math.max(0, p.t - dt * 4);
    },

    /** Fires the pad animation under a body that just landed on a pad tile. */
    triggerPad(b) {
      const r = Math.floor((b.y + b.h + 1) / TILE);
      const c0 = Math.floor(b.x / TILE), c1 = Math.floor((b.x + b.w - 0.01) / TILE);
      for (const p of pads) {
        if (p.r !== r) continue;
        for (let c = c0; c <= c1; c++) if (((c % COLS) + COLS) % COLS === p.c) p.t = 1;
      }
    },
  };
})();
