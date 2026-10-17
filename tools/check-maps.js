'use strict';

/**
 * Static checks for src/maps.js: grid size, known tiles, spawns, and a rough reachability search
 * over standable cells (jump reach measured from PHYS in src/config.js: ~146 px up, ~190 px across).
 * Run: node tools/check-maps.js [maps.js]   (exit code 1 on any problem)
 */
const fs = require('fs');
const path = require('path');

const MAPS = new Function(fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'src', 'maps.js'), 'utf8') + ';return MAPS')();
const T = 30, COLS = 32, ROWS = 18, W = 960;
const KNOWN = ' #X=vb^g<>';
const MIRROR = { '<': '>', '>': '<' };
// Glass counts as open (the specials lower it every few seconds) but its top is still a surface.
const SOLID = '#X^<>';
const SURFACE = '#X^<>=bg';

function build(m) {
  return m.rows.map(h => h + [...h].reverse().map(ch => MIRROR[ch] || ch).join(''));
}

function check(m) {
  const errors = [];
  if (m.rows.length !== ROWS) errors.push(`${m.rows.length} rows, expected ${ROWS}`);
  m.rows.forEach((r, i) => {
    if (r.length !== 16) errors.push(`row ${i} has ${r.length} chars, expected 16`);
    for (const ch of r) if (!KNOWN.includes(ch)) errors.push(`row ${i}: unknown tile '${ch}'`);
  });
  if (errors.length) return errors;

  const g = build(m);
  const cell = (c, r) => (r >= ROWS ? '#' : g[Math.max(0, r)][((c % COLS) + COLS) % COLS]);
  const free = (c, r) => !SOLID.includes(cell(c, r)) && cell(c, r) !== 'v';
  const standable = (c, r) => free(c, r) && SURFACE.includes(cell(c, r + 1));
  const reach = (c, r) => (cell(c, r + 1) === '^' ? 11 : cell(c, r + 1) === 'b' ? 6 : 4);

  const nodes = new Map();
  const key = (c, r) => `${c},${r}`;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) if (standable(c, r)) nodes.set(key(c, r), { c, r, up: reach(c, r), tile: true });
  }

  const rides = [];
  for (const def of m.movers) {
    for (const mirrored of def.mirror ? [false, true] : [false]) {
      const group = [];
      for (const s of def.manual ? [0] : [0, 0.5, 1]) {
        const x0 = def.x + (def.ax || 0) * s, x = mirrored ? W - x0 - def.w : x0;
        const y = def.y + (def.ay || 0) * s, r = Math.round(y / T) - 1;
        for (let c = Math.floor(x / T); c <= Math.floor((x + def.w - 1) / T); c++) {
          const k = key(((c % COLS) + COLS) % COLS, r);
          if (!nodes.has(k)) nodes.set(k, { c: ((c % COLS) + COLS) % COLS, r, up: 4, tile: false });
          group.push(k);
        }
      }
      rides.push(group);
    }
  }

  const clearUp = (c, from, to) => {
    for (let r = from - 1; r >= to; r--) if (!free(c, r)) return false;
    return true;
  };
  const wrapRow = r => free(0, r) && free(COLS - 1, r);

  function edges(n) {
    const out = [];
    for (const [k, t] of nodes) {
      const dr = n.r - t.r;
      if (dr > n.up) continue;
      let dc = Math.abs(t.c - n.c);
      if (wrapRow(n.r) || wrapRow(t.r)) dc = Math.min(dc, COLS - dc);
      const maxDc = dr > 4 ? 3 : dr === 4 ? 4 : dr === 3 ? 5 : dr >= 0 ? 6 : 6 + Math.min(4, -dr);
      if (dc > maxDc) continue;
      if (dr > 0 && !clearUp(n.c, n.r, t.r) && !clearUp(t.c, t.r + dr, t.r)) continue;
      out.push(k);
    }
    for (const group of rides) if (group.includes(key(n.c, n.r))) out.push(...group);
    return out;
  }

  const [a, mid, b] = m.spawns;
  if (a.x + b.x !== W || a.y !== b.y) errors.push('side spawns are not mirrored around x = 480');
  if (mid.x !== W / 2) errors.push('middle spawn is not at x = 480');

  // Every surface must be reachable from every spawn: a platform only its own spawner can stand on
  // is unreachable for the other two players.
  m.spawns.forEach((s, i) => {
    const c0 = Math.floor(s.x / T), r0 = s.y / T - 1;
    if (!Number.isInteger(r0) || !standable(c0, r0)) {
      errors.push(`spawn ${i} (${s.x}, ${s.y}) is not standing on a surface`);
      return;
    }
    const seen = new Set([key(c0, r0)]), queue = [key(c0, r0)];
    while (queue.length) {
      for (const k of edges(nodes.get(queue.shift()))) if (!seen.has(k)) { seen.add(k); queue.push(k); }
    }
    for (let r = 0; r < ROWS; r++) {
      let start = -1;
      for (let c = 0; c <= COLS; c++) {
        const bad = c < COLS && nodes.has(key(c, r)) && nodes.get(key(c, r)).tile && !seen.has(key(c, r));
        if (bad && start < 0) start = c;
        if (!bad && start >= 0) { errors.push(`unreachable from spawn ${i}: row ${r}, cols ${start}-${c - 1}`); start = -1; }
      }
    }
  });
  return errors;
}

let failed = 0;
for (const m of MAPS) {
  const errors = check(m);
  console.log(`${errors.length ? 'FAIL' : 'ok  '} ${m.name}`);
  for (const e of errors) console.log(`       ${e}`);
  if (errors.length) failed++;
}
console.log(`${MAPS.length - failed}/${MAPS.length} maps ok`);
process.exit(failed ? 1 : 0);
