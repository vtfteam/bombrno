'use strict';

/** Pooled sprite particles in typed arrays — no per-frame allocation, no GC hitches. */
const Particles = (() => {
  const MAX = 1200;
  const x = new Float32Array(MAX), y = new Float32Array(MAX);
  const vx = new Float32Array(MAX), vy = new Float32Array(MAX);
  const rot = new Float32Array(MAX), vr = new Float32Array(MAX);
  const life = new Float32Array(MAX), max = new Float32Array(MAX);
  const size = new Float32Array(MAX), grav = new Float32Array(MAX);
  const spr = new Uint16Array(MAX), bounce = new Uint8Array(MAX);
  let n = 0;

  function copy(from, to) {
    x[to] = x[from]; y[to] = y[from]; vx[to] = vx[from]; vy[to] = vy[from];
    rot[to] = rot[from]; vr[to] = vr[from]; life[to] = life[from]; max[to] = max[from];
    size[to] = size[from]; grav[to] = grav[from]; spr[to] = spr[from]; bounce[to] = bounce[from];
  }

  return {
    spawn(sprite, px, py, pvx, pvy, l, s = 1, g = 1, b = false, pvr = 0) {
      if (n >= MAX) return;
      const i = n++;
      spr[i] = sprite; x[i] = px; y[i] = py; vx[i] = pvx; vy[i] = pvy;
      life[i] = max[i] = l; size[i] = s; grav[i] = g; bounce[i] = b ? 1 : 0;
      rot[i] = Math.random() * 0.6 - 0.3; vr[i] = pvr;
    },

    update(dt) {
      const G = PHYS.gravity;
      for (let i = 0; i < n;) {
        life[i] -= dt;
        if (life[i] <= 0) { copy(--n, i); continue; }
        vy[i] += G * grav[i] * dt;
        x[i] += vx[i] * dt;
        y[i] += vy[i] * dt;
        rot[i] += vr[i] * dt;
        if (bounce[i] && vy[i] > 0 && Level.solidPx(x[i], y[i] + 5)) {
          y[i] -= vy[i] * dt;
          vy[i] *= -0.45; vx[i] *= 0.7; vr[i] *= 0.6;
        }
        i++;
      }
    },

    draw(ctx, v) {
      const k = v.k, ox = v.ox * k, oy = v.oy * k;
      for (let i = 0; i < n; i++) {
        const s = Sprites.get(spr[i]), a = life[i] / max[i];
        ctx.globalAlpha = a < 0.4 ? a / 0.4 : 1;
        const sc = size[i] * k, c = Math.cos(rot[i]) * sc, sn = Math.sin(rot[i]) * sc;
        ctx.setTransform(c, sn, -sn, c, x[i] * k + ox, y[i] * k + oy);
        ctx.drawImage(s.canvas, -s.w / 2, -s.w / 2, s.w, s.w);
      }
      ctx.globalAlpha = 1;
    },

    clear() { n = 0; },
    get count() { return n; },
  };
})();

/** Shock rings and floating damage numbers. */
const Effects = (() => {
  const RING_T = 0.35, TEXT_T = 0.9;
  const rings = [], texts = [];

  function prune(arr, ttl) {
    let j = 0;
    for (const o of arr) if (o.t < ttl) arr[j++] = o;
    arr.length = j;
  }

  return {
    ring(x, y, r) { rings.push({ x, y, r, t: 0 }); },
    text(x, y, s, color) { texts.push({ x, y, s, color, t: 0 }); },
    clear() { rings.length = 0; texts.length = 0; },

    update(dt) {
      for (const o of rings) o.t += dt;
      for (const o of texts) { o.t += dt; o.y -= 40 * dt; }
      prune(rings, RING_T);
      prune(texts, TEXT_T);
    },

    draw(ctx, v) {
      applyView(ctx, v);
      for (const o of rings) {
        const p = o.t / RING_T, e = 1 - (1 - p) * (1 - p);
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r * e, 0, Math.PI * 2);
        ctx.globalAlpha = (1 - p) * 0.35;
        ctx.fillStyle = '#ffd36b';
        ctx.fill();
        ctx.globalAlpha = 1 - p;
        ctx.lineWidth = 4 * (1 - p) + 1;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
      }
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000';
      for (const o of texts) {
        ctx.globalAlpha = 1 - o.t / TEXT_T;
        ctx.strokeText(o.s, o.x, o.y);
        ctx.fillStyle = o.color;
        ctx.fillText(o.s, o.x, o.y);
      }
      ctx.globalAlpha = 1;
    },
  };
})();
