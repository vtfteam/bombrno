'use strict';

function label(ctx, s, x, y, size, color, align = 'center', outline = 0) {
  ctx.font = `bold ${size}px ${UI_FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (outline) {
    ctx.lineWidth = outline;
    ctx.strokeStyle = 'rgba(10,6,30,0.9)';
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

/** Player cards; repainted into a cached canvas only when HP or score changes. */
const HUD = {
  H: 46,
  X: [12, VIEW_W / 2 - 75, VIEW_W - 162],
  canvas: document.createElement('canvas'),
  dirty: true,
  k: 1,

  resize(k) {
    this.k = k;
    this.canvas.width = Math.ceil(VIEW_W * k);
    this.canvas.height = Math.ceil(this.H * k);
    this.dirty = true;
  },

  render(players, score) {
    const g = this.canvas.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.setTransform(this.k, 0, 0, this.k, 0, 0);
    for (const p of players) {
      const x = this.X[p.idx];
      g.beginPath();
      g.roundRect(x, 6, 150, 34, 8);
      g.fillStyle = 'rgba(12,8,30,0.72)';
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = p.cfg.color;
      g.stroke();
      g.globalAlpha = p.alive ? 1 : 0.3;
      Sprites.draw(g, Sprites.id(p.emoji, 24), x + 20, 23);
      g.globalAlpha = 1;
      label(g, p.cfg.name, x + 38, 17, 11, p.cfg.color, 'left');
      label(g, '🏆 ' + score[p.idx], x + 144, 17, 11, '#ffd36b', 'right');
      g.fillStyle = 'rgba(255,255,255,0.15)';
      g.fillRect(x + 38, 26, 104, 8);
      g.fillStyle = hpColor(p.hp);
      g.fillRect(x + 38, 26, 104 * p.hp / RULES.maxHp, 8);
      if (!p.alive) label(g, '💀', x + 20, 23, 16, '#fff');
    }
    this.dirty = false;
  },

  draw(ctx, v, players, score) {
    if (this.dirty) this.render(players, score);
    ctx.setTransform(v.k, 0, 0, v.k, 0, 0);
    ctx.drawImage(this.canvas, 0, 0, VIEW_W, this.H);
  },
};

/** Character select: each player browses with their own left/right, jump confirms, bomb cancels. */
const Select = {
  CX: [170, 480, 790],
  slots: [0, 1, 2].map(i => ({ cursor: i, ready: false })),
  startT: 0,

  reset() {
    for (const s of this.slots) s.ready = false;
    this.startT = 0;
  },

  isTaken(cursor, by) {
    return this.slots.some((s, i) => i !== by && s.ready && s.cursor === cursor);
  },

  readyCount() {
    return this.slots.filter(s => s.ready).length;
  },

  entries() {
    const out = [];
    this.slots.forEach((s, idx) => { if (s.ready) out.push({ idx, emoji: PALETTE[s.cursor] }); });
    return out;
  },

  /** Returns true when the match should start now. */
  press(code) {
    for (let i = 0; i < PLAYERS.length; i++) {
      const keys = PLAYERS[i].keys, s = this.slots[i];
      if (code === keys.left || code === keys.right) {
        if (s.ready) return false;
        const d = code === keys.left ? -1 : 1, n = PALETTE.length;
        let c = s.cursor;
        do c = (c + d + n) % n; while (this.isTaken(c, i) && c !== s.cursor);
        s.cursor = c;
        Sfx.play('move');
      } else if (code === keys.jump) {
        if (s.ready) return false;
        if (this.isTaken(s.cursor, i)) { Sfx.play('error'); return false; }
        s.ready = true;
        Sfx.play('confirm');
        this.slots.forEach((o, j) => {
          while (!o.ready && this.isTaken(o.cursor, j)) o.cursor = (o.cursor + 1) % PALETTE.length;
        });
        if (this.readyCount() === PLAYERS.length) this.startT = 0.8;
      } else if (code === keys.bomb) {
        if (!s.ready) return false;
        s.ready = false;
        this.startT = 0;
        Sfx.play('cancel');
      }
    }
    return code === 'Space' && this.readyCount() >= 2;
  },

  update(dt) {
    if (this.startT <= 0) return false;
    this.startT -= dt;
    return this.startT <= 0;
  },

  draw(ctx, v, t) {
    ctx.setTransform(v.k, 0, 0, v.k, 0, 0);
    ctx.fillStyle = 'rgba(10,8,30,0.62)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    Sprites.draw(ctx, Sprites.id('💣', 56), 248, 82 + Math.sin(t * 3) * 4);
    label(ctx, 'BomBrno', 500, 86, 72, '#ffb347', 'center', 8);
    label(ctx, `3 hráči · 1 klávesnice · mapa: ${Level.map.name}`, 480, 136, 16, '#e9d5ff');

    const n = PALETTE.length;
    this.slots.forEach((s, i) => {
      const cfg = PLAYERS[i], keys = cfg.keys, cx = this.CX[i], top = 165;
      const taken = this.isTaken(s.cursor, i);
      ctx.beginPath();
      ctx.roundRect(cx - 130, top, 260, 290, 14);
      ctx.fillStyle = s.ready ? 'rgba(30,60,40,0.75)' : 'rgba(20,14,46,0.78)';
      ctx.fill();
      ctx.lineWidth = s.ready ? 3 : 2;
      ctx.strokeStyle = cfg.color;
      ctx.stroke();

      label(ctx, cfg.name, cx, top + 30, 22, cfg.color);
      const bob = s.ready ? -Math.abs(Math.sin(t * 6)) * 10 : 0;
      ctx.globalAlpha = taken ? 0.25 : 1;
      Sprites.draw(ctx, Sprites.id(PALETTE[s.cursor], 72), cx, top + 110 + bob);
      ctx.globalAlpha = s.ready ? 0.25 : 0.9;
      label(ctx, '◀', cx - 88, top + 110, 26, '#fff');
      label(ctx, '▶', cx + 88, top + 110, 26, '#fff');
      ctx.globalAlpha = 1;
      if (taken) label(ctx, 'obsazeno', cx, top + 110, 18, '#f87171', 'center', 4);

      for (let o = -2; o <= 2; o++) {
        const c = (s.cursor + o + n) % n;
        ctx.globalAlpha = o === 0 ? 1 : this.isTaken(c, i) ? 0.15 : 0.55;
        Sprites.draw(ctx, Sprites.id(PALETTE[c], 22), cx + o * 40, top + 185);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 17, top + 168, 34, 34);

      if (s.ready) label(ctx, '✔ PŘIPRAVEN', cx, top + 228, 18, '#4ade80');
      else label(ctx, `${keyLabel(keys.jump)} = potvrdit`, cx, top + 228, 16, '#cbd5e1');
      label(ctx, `${keyLabel(keys.left)} ${keyLabel(keys.right)} výběr · ${keyLabel(keys.jump)} skok · ${keyLabel(keys.bomb)} bomba`,
        cx, top + 262, 13, '#94a3b8');
    });

    const ready = this.readyCount();
    const hint = ready === PLAYERS.length ? 'Jde se na to!'
      : ready >= 2 ? 'MEZERNÍK = začít ve dvou · nebo počkejte na třetího'
      : 'Vyberte si postavičku a potvrďte skokem';
    label(ctx, hint, 480, 490, 18, '#fde68a', 'center', 4);
    label(ctx, 'Skoč soupeři na hlavu (−25) · bomba ubere až 40 · M = zvuk', 480, 518, 13, '#cbd5e1');
  },
};

/** Hantec flourishes for the winner screen (only words confirmed in docs/for_agents/external/brno-specialities.md). */
const WIN_LINES = ['Betálná čurina!', 'Zdar jak sviňa!', 'To byla hokna!', 'Love se nevrací.'];

const Overlay = {
  countdown(ctx, v, cd, map) {
    if (cd <= -0.6) return;
    ctx.setTransform(v.k, 0, 0, v.k, 0, 0);
    ctx.globalAlpha = Math.min(1, 1 + cd / 0.6);
    label(ctx, '📍 ' + map.name, 480, 150, 30, '#fde68a', 'center', 6);
    if (map.fact) label(ctx, map.fact, 480, 184, 15, '#f1f5f9', 'center', 4);
    if (cd > 0) {
      const n = Math.ceil(cd / 0.6), f = (cd % 0.6) / 0.6;
      ctx.globalAlpha = 0.4 + 0.6 * f;
      label(ctx, String(n), 480, 250, 80 + 40 * f, '#fff', 'center', 8);
    } else {
      ctx.globalAlpha = 1 + cd / 0.6;
      label(ctx, 'BOMB!', 480, 250, 90, '#ffb347', 'center', 8);
    }
    ctx.globalAlpha = 1;
  },

  result(ctx, v, t, winner) {
    ctx.setTransform(v.k, 0, 0, v.k, 0, 0);
    ctx.fillStyle = 'rgba(8,6,24,0.6)';
    ctx.fillRect(0, 150, VIEW_W, 230);
    if (winner) {
      Sprites.draw(ctx, Sprites.id('👑', 40), 480, 185 + Math.sin(t * 4) * 3);
      Sprites.draw(ctx, Sprites.id(winner.emoji, 80), 480, 245 - Math.abs(Math.sin(t * 5)) * 12);
      label(ctx, `${winner.cfg.name} vyhrává!`, 480, 315, 34, winner.cfg.color, 'center', 6);
      label(ctx, WIN_LINES[(Game.score[winner.idx] - 1) % WIN_LINES.length], 480, 337, 14, '#fde68a');
    } else {
      label(ctx, 'Remíza!', 480, 255, 48, '#fff', 'center', 6);
    }
    label(ctx, 'R = další kolo na nové mapě   ·   Esc = výběr postav', 480, 355, 16, '#e2e8f0');
  },

  banner(ctx, v, b) {
    if (b.t <= 0) return;
    ctx.setTransform(v.k, 0, 0, v.k, 0, 0);
    ctx.globalAlpha = Math.min(1, b.t / 0.4);
    label(ctx, b.text, VIEW_W / 2, 68, 20, '#fde68a', 'center', 5);
    ctx.globalAlpha = 1;
  },

  mute(ctx, v) {
    ctx.setTransform(v.k, 0, 0, v.k, 0, 0);
    label(ctx, '🔇 M', VIEW_W - 10, VIEW_H - 14, 14, '#fff', 'right', 3);
  },
};
