'use strict';

const VIEW_W = 960, VIEW_H = 540, TILE = 30;
const STEP = 1 / 120;
const UI_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

const PHYS = {
  gravity: 2300, maxFall: 1100,
  runSpeed: 270, groundAccel: 2600, airAccel: 1600, groundFriction: 2800, airDrag: 400,
  jumpSpeed: 820, jumpCut: 0.45, coyote: 0.08, jumpBuffer: 0.1,
  padSpeed: 1250, bounceSpeed: 920, stompBounce: 620, stompBounceHeld: 840,
  bombFriction: 900, conveyorSpeed: 110,
};

const RULES = {
  maxHp: 100, stompDamage: 25, spikeDamage: 20, respawnInvuln: 1.5,
  bombFuse: 2, bombMax: 2, bombCooldown: 0.4,
  blastRadius: 90, blastDamage: 40, blastKnockback: 750,
};

const PLAYERS = [
  { name: 'Hráč 1', color: '#4ade80', keys: { left: 'KeyA', right: 'KeyD', jump: 'KeyW', bomb: 'KeyS' } },
  { name: 'Hráč 2', color: '#facc15', keys: { left: 'KeyH', right: 'KeyK', jump: 'KeyU', bomb: 'KeyJ' } },
  { name: 'Hráč 3', color: '#60a5fa', keys: { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', bomb: 'ArrowDown' } },
];

const PALETTE = ['🐸', '🐱', '🐵', '🐷', '🐶', '🦊', '🐼', '🐨', '🐯', '🦁', '🐮', '🐔', '🐧', '🦄', '👽', '🤖'];

const ARROW_LABELS = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };

function keyLabel(code) {
  return code.startsWith('Key') ? code.slice(3) : ARROW_LABELS[code] || code;
}

function approach(v, target, delta) {
  return v < target ? Math.min(v + delta, target) : Math.max(v - delta, target);
}

/** Interpolates a position, snapping when the body wrapped around the screen edge. */
function lerpWrap(a, b, t) {
  return Math.abs(b - a) > VIEW_W / 2 ? b : a + (b - a) * t;
}

function applyView(ctx, v) {
  ctx.setTransform(v.k, 0, 0, v.k, v.ox * v.k, v.oy * v.k);
}
