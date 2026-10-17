'use strict';

const FX = {
  bomb: Sprites.id('💣', 24),
  boom: Sprites.id('💥', 30),
  fire: Sprites.id('🔥', 18),
  star: Sprites.id('✨', 16),
  poof: Sprites.id('💨', 20),
};

const PLAYER_W = 26, PLAYER_H = 28;

const WRAP_NONE = [0], WRAP_RIGHT = [0, VIEW_W], WRAP_LEFT = [0, -VIEW_W];

function wrapOffsets(x, w) {
  if (x < 0) return WRAP_RIGHT;
  if (x + w > VIEW_W) return WRAP_LEFT;
  return WRAP_NONE;
}

function fuseRate(fuse) {
  return fuse > 1 ? 3 : fuse > 0.5 ? 6 : 12;
}

class Player {
  constructor(idx, emoji) {
    this.idx = idx;
    this.cfg = PLAYERS[idx];
    this.emoji = emoji;
    this.sprite = Sprites.id(emoji, 32);
    this.shard = Sprites.id(emoji, 14);
  }

  spawn(at) {
    this.w = PLAYER_W;
    this.h = PLAYER_H;
    this.scale = 1;
    this.mutT = 0;
    this.ghost = null;
    this.deadAt = 0;
    this.swapT = this.stunT = this.noise = 0;
    this.x = this.px = at.x - this.w / 2;
    this.y = this.py = at.y - this.h;
    this.vx = this.vy = 0;
    this.hp = RULES.maxHp;
    this.alive = true;
    this.onGround = false;
    this.rider = null;
    this.coyote = this.jumpBuf = 0;
    this.jumping = false;
    this.facing = at.x < VIEW_W / 2 ? 1 : -1;
    this.invuln = this.stompImmune = this.kbT = this.bombCd = this.squash = this.hurtT = 0;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
}

const Game = {
  players: [],
  bombs: [],
  score: [0, 0, 0],
  shake: 0,
  countdown: 0,
  lastBeep: 0,
  decided: false,
  endT: 0,
  winner: null,
  result: false,
  time: 0,

  /** entries: [{ idx, emoji }] */
  start(entries) {
    this.players = entries.map(e => new Player(e.idx, e.emoji));
    for (const p of this.players) p.spawn(Level.spawns[p.idx]);
    this.bombs.length = 0;
    Actors.clear();
    Level.reset();
    this.time = 0;
    this.countdown = 1.8;
    this.lastBeep = 4;
    this.decided = false;
    this.endT = 0;
    this.winner = null;
    this.result = false;
    this.shake = 0;
    Specials.reset(Level.map.special);
  },

  stop() {
    Specials.reset(null);
    this.players = [];
    this.bombs.length = 0;
    Actors.clear();
  },

  press(code) {
    if (this.countdown > 0) return;
    for (const p of this.players) {
      if (!p.alive || p.stunT > 0) continue;
      if (code === p.cfg.keys.jump) p.jumpBuf = PHYS.jumpBuffer;
      else if (code === p.cfg.keys.bomb) this.dropBomb(p);
    }
  },

  update(dt) {
    this.time += dt;
    this.countdown -= dt;
    if (this.lastBeep > 0) {
      const n = Math.max(0, Math.ceil(this.countdown / 0.6));
      if (n < this.lastBeep) {
        this.lastBeep = n;
        Sfx.play(n > 0 ? 'beep' : 'go');
      }
    }
    Level.update(dt);
    for (const p of this.players) if (p.alive) this.updatePlayer(p, dt);
    if (this.countdown <= 0) Specials.update(dt, this);
    Actors.update(dt, this);
    this.interact();
    for (const b of this.bombs) this.updateBomb(b, dt);
    let j = 0;
    for (const b of this.bombs) {
      if (b.fuse <= 0) this.explode(b);
      else this.bombs[j++] = b;
    }
    this.bombs.length = j;
    this.checkEnd(dt);
  },

  updatePlayer(p, dt) {
    p.px = p.x; p.py = p.y;
    p.invuln = Math.max(0, p.invuln - dt);
    p.stompImmune = Math.max(0, p.stompImmune - dt);
    p.kbT = Math.max(0, p.kbT - dt);
    p.bombCd = Math.max(0, p.bombCd - dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.squash = Math.max(0, p.squash - dt * 5);
    p.swapT = Math.max(0, p.swapT - dt);
    p.stunT = Math.max(0, p.stunT - dt);
    p.noise = Math.max(0, p.noise - 4 * dt);
    if (p.mutT > 0) p.mutT -= dt;
    else if (p.scale !== 1) this.setScale(p, 1, 0);
    if (p.rider) { Physics.moveX(p, p.rider.dx); p.y += p.rider.dy; }
    if (p.onGround) {
      const belt = Level.conveyorUnder(p);
      if (belt) Physics.moveX(p, belt * PHYS.conveyorSpeed * dt);
    }

    const P = Level.phys, keys = p.cfg.keys;
    const run = P.runSpeed * (p.scale > 1.2 ? 0.85 : p.scale < 0.8 ? 1.25 : 1);
    const frozen = this.countdown > 0 || p.stunT > 0;
    const dir = frozen ? 0 : ((Input.isDown(keys.right) ? 1 : 0) - (Input.isDown(keys.left) ? 1 : 0)) * (p.swapT > 0 ? -1 : 1);
    if (dir) p.facing = dir;
    if (p.kbT > 0) p.vx = approach(p.vx, dir * run, P.airAccel * 0.3 * dt);
    else if (dir) p.vx = approach(p.vx, dir * run, (p.onGround ? P.groundAccel : P.airAccel) * dt);
    else p.vx = approach(p.vx, 0, (p.onGround ? P.groundFriction : P.airDrag) * dt);

    p.coyote = p.onGround ? P.coyote : p.coyote - dt;
    p.jumpBuf -= dt;
    if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = -P.jumpSpeed * (p.scale < 0.8 ? 1.12 : 1);
      p.jumpBuf = p.coyote = 0;
      p.onGround = false;
      p.rider = null;
      p.jumping = true;
      p.noise += 14;
      Sfx.play('jump', p.idx);
    }
    if (p.jumping && p.vy < 0 && !Input.isDown(keys.jump)) {
      p.vy *= P.jumpCut;
      p.jumping = false;
    }
    if (p.vy >= 0) p.jumping = false;

    p.vy = Math.min(p.vy + P.gravity * dt, P.maxFall);
    const fallV = p.vy, wasGround = p.onGround;
    if (Physics.moveX(p, p.vx * dt)) p.vx = 0;
    const prevBottom = p.y + p.h;
    const hit = Physics.moveY(p, p.vy * dt);
    p.onGround = false;
    p.rider = null;
    if (hit > 0) {
      p.vy = 0;
      p.onGround = true;
    } else if (hit < 0) {
      p.vy = 0;
    } else if (p.vy >= 0) {
      const m = Physics.landOnMovers(p, prevBottom);
      if (m) { p.vy = 0; p.onGround = true; p.rider = m; }
    }
    if (hit === T_PAD || hit === T_BOUNCE) {
      if (hit === T_PAD) Level.triggerPad(p);
      p.vy = -(hit === T_PAD ? P.padSpeed : P.bounceSpeed);
      p.onGround = false;
      p.coyote = 0;
      Sfx.play(hit === T_PAD ? 'pad' : 'boing');
    } else if (p.onGround && !wasGround && fallV > 450) {
      Sfx.play('land');
      p.noise += 6;
      p.squash = Math.min(1, fallV / 1100);
    }
    Physics.wrap(p);
    if (Physics.touchesSpikes(p)) this.spike(p);
  },

  interact() {
    const ps = this.players;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j];
        if (!a.alive || !b.alive) continue;
        if (a.x >= b.x + b.w || b.x >= a.x + a.w || a.y >= b.y + b.h || b.y >= a.y + a.h) continue;
        if (this.tryStomp(a, b) || this.tryStomp(b, a)) continue;
        const push = Math.min(a.x + a.w - b.x, b.x + b.w - a.x) / 2;
        const dirA = a.cx < b.cx ? -1 : 1;
        Physics.moveX(a, dirA * push);
        Physics.moveX(b, -dirA * push);
      }
    }
  },

  tryStomp(top, bottom) {
    if (top.vy <= 0 || top.py + top.h > bottom.py + 10) return false;
    top.y = bottom.y - top.h;
    top.vy = -(Input.isDown(top.cfg.keys.jump) ? PHYS.stompBounceHeld : PHYS.stompBounce);
    top.jumping = false;
    top.onGround = false;
    top.rider = null;
    top.noise += 15;
    if (!bottom.onGround) bottom.vy = Math.max(bottom.vy, 350);
    if (bottom.stompImmune <= 0) {
      bottom.stompImmune = 0.3;
      bottom.squash = 1;
      Sfx.play('stomp');
      for (let i = 0; i < 5; i++) {
        Particles.spawn(FX.star, bottom.cx, bottom.y, (Math.random() - 0.5) * 300, -100 - Math.random() * 200, 0.5, 0.8, 0.5);
      }
      this.hurt(bottom, top.scale > 1.2 ? 40 : RULES.stompDamage);
    }
    return true;
  },

  dropBomb(p) {
    if (p.bombCd > 0) return;
    let own = 0;
    for (const b of this.bombs) if (b.owner === p) own++;
    if (own >= RULES.bombMax) return;
    this.bombs.push({
      owner: p, w: 18, h: 18,
      x: p.cx - 9, y: p.y + p.h - 18, px: p.cx - 9, py: p.y + p.h - 18,
      vx: p.vx * 0.25, vy: Math.max(0, p.vy * 0.5),
      fuse: RULES.bombFuse, tick: 0, onGround: false, rider: null,
    });
    p.bombCd = RULES.bombCooldown;
    p.noise += 10;
    Sfx.play('drop');
  },

  updateBomb(b, dt) {
    b.px = b.x; b.py = b.y;
    if (b.rider) { Physics.moveX(b, b.rider.dx); b.y += b.rider.dy; }
    const P = Level.phys;
    b.vy = Math.min(b.vy + P.gravity * dt, P.maxFall);
    if (b.onGround) {
      b.vx = approach(b.vx, 0, P.bombFriction * dt);
      const belt = Level.conveyorUnder(b);
      if (belt) Physics.moveX(b, belt * P.conveyorSpeed * dt);
    }
    if (Physics.moveX(b, b.vx * dt)) b.vx = -b.vx * 0.4;
    const prevBottom = b.y + b.h, fallV = b.vy;
    const hit = Physics.moveY(b, b.vy * dt);
    b.onGround = false;
    b.rider = null;
    if (hit === T_PAD || hit === T_BOUNCE) {
      if (hit === T_PAD) Level.triggerPad(b);
      b.vy = -(hit === T_PAD ? P.padSpeed : P.bounceSpeed) * 0.85;
      Sfx.play(hit === T_PAD ? 'pad' : 'boing');
    } else if (hit > 0) {
      if (fallV > 300) b.vy = -fallV * 0.35;
      else { b.vy = 0; b.onGround = true; }
    } else if (hit < 0) {
      b.vy = 0;
    } else if (b.vy >= 0) {
      const m = Physics.landOnMovers(b, prevBottom);
      if (m) { b.vy = 0; b.onGround = true; b.rider = m; }
    }
    Physics.wrap(b);
    b.fuse -= dt;
    b.tick -= dt;
    if (b.tick <= 0) {
      b.tick = 1 / fuseRate(b.fuse);
      Sfx.play('tick');
    }
  },

  explode(b) {
    this.blast(b.x + b.w / 2, b.y + b.h / 2, RULES.blastRadius, RULES.blastDamage, b);
  },

  /** Explosion at (x, y): damage and knockback falling off linearly to the radius; chains bombs. */
  blast(x, y, R, damage, source = null) {
    Sfx.play('boom');
    if (source && source.owner) source.owner.noise += 20;
    this.shake = Math.min(14, this.shake + 9);
    Effects.ring(x, y, R);
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 220;
      Particles.spawn(FX.boom, x, y, Math.cos(a) * s, Math.sin(a) * s, 0.35 + Math.random() * 0.25,
        0.6 + Math.random() * 0.7, 0, false, (Math.random() - 0.5) * 6);
    }
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, s = 150 + Math.random() * 350;
      Particles.spawn(FX.fire, x, y, Math.cos(a) * s, Math.sin(a) * s - 120, 0.5 + Math.random() * 0.4,
        0.5 + Math.random() * 0.5, -0.15, false, (Math.random() - 0.5) * 10);
    }
    for (const p of this.players) {
      if (!p.alive) continue;
      const nx = Math.max(p.x, Math.min(x, p.x + p.w)), ny = Math.max(p.y, Math.min(y, p.y + p.h));
      const d = Math.hypot(nx - x, ny - y);
      if (d >= R) continue;
      const f = 1 - d / R;
      let ux = p.cx - x, uy = p.cy - y;
      const len = Math.hypot(ux, uy) || 1;
      ux /= len; uy /= len;
      this.knock(p, p.vx + ux * RULES.blastKnockback * f,
        Math.min(p.vy, 0) + uy * RULES.blastKnockback * f - 260 * f, 0.1 + 0.35 * f);
      this.hurt(p, Math.round(damage * f));
    }
    for (const o of this.bombs) {
      if (o === source || o.fuse <= 0) continue;
      const dx = o.x + o.w / 2 - x, dy = o.y + o.h / 2 - y, d = Math.hypot(dx, dy);
      if (d >= R) continue;
      o.fuse = Math.min(o.fuse, 0.12);
      o.vx += dx / (d || 1) * 300;
      o.vy -= 250;
    }
  },

  knock(p, vx, vy, t = 0.3) {
    p.vx = vx;
    p.vy = vy;
    p.kbT = t;
    p.onGround = false;
    p.rider = null;
    p.jumping = false;
  },

  /** Resizes a player around their feet; fails (returns false) when the new box would overlap tiles. */
  setScale(p, scale, duration) {
    const w = PLAYER_W * scale, h = PLAYER_H * scale;
    const x = p.cx - w / 2, y = p.y + p.h - h;
    if (!Physics.boxFree(x, y, w, h)) return false;
    p.px += x - p.x; p.py += y - p.y;
    p.x = x; p.y = y; p.w = w; p.h = h;
    p.scale = scale;
    p.mutT = duration;
    return true;
  },

  hurt(p, dmg, force = false) {
    if (!p.alive || this.decided || dmg <= 0) return;
    if (p.invuln > 0 && !force) return;
    p.hp = Math.max(0, p.hp - dmg);
    p.hurtT = 0.25;
    Effects.text(p.cx, p.y - 8, '-' + dmg, '#ff6b6b');
    HUD.dirty = true;
    if (p.hp <= 0) this.kill(p);
    else Sfx.play('hurt');
  },

  spike(p) {
    Sfx.play('spike');
    this.hurt(p, RULES.spikeDamage, true);
    if (p.alive) this.respawn(p);
  },

  respawn(p) {
    let best = Level.spawns[0], bestD = -1;
    for (const s of Level.spawns) {
      let d = Infinity;
      for (const o of this.players) if (o !== p && o.alive) d = Math.min(d, Math.hypot(o.cx - s.x, o.cy - s.y));
      if (d > bestD) { bestD = d; best = s; }
    }
    const hp = p.hp;
    p.spawn(best);
    p.hp = hp;
    p.invuln = RULES.respawnInvuln;
    for (let i = 0; i < 8; i++) {
      Particles.spawn(FX.poof, p.cx, p.cy, (Math.random() - 0.5) * 240, (Math.random() - 0.5) * 240, 0.5, 0.7, 0);
    }
  },

  kill(p) {
    p.alive = false;
    p.deadAt = this.time;
    Sfx.play('death');
    this.shake = Math.min(14, this.shake + 6);
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, s = 120 + Math.random() * 380;
      Particles.spawn(p.shard, p.cx, p.cy, Math.cos(a) * s, Math.sin(a) * s - 250, 1.3 + Math.random() * 0.7,
        0.7 + Math.random() * 0.6, 1, true, (Math.random() - 0.5) * 16);
    }
  },

  checkEnd(dt) {
    if (!this.decided) {
      let alive = 0, last = null;
      for (const p of this.players) if (p.alive) { alive++; last = p; }
      if (alive <= 1) {
        this.decided = true;
        this.endT = 1.4;
        this.winner = last;
      }
    } else if (!this.result) {
      this.endT -= dt;
      if (this.endT <= 0) {
        this.result = true;
        if (this.winner) this.score[this.winner.idx]++;
        HUD.dirty = true;
        Sfx.play('win');
      }
    }
  },

  draw(ctx, v, alpha) {
    applyView(ctx, v);
    for (const b of this.bombs) {
      const x = lerpWrap(b.px, b.x, alpha) + b.w / 2, y = b.py + (b.y - b.py) * alpha + b.h / 2;
      if ((b.fuse * fuseRate(b.fuse)) % 1 < 0.5) {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = b.owner ? b.owner.cfg.color : '#ef4444';
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      const pulse = b.fuse < 0.5 ? 1 + (0.5 - b.fuse) * 0.6 : 1;
      for (const off of wrapOffsets(x - b.w / 2, b.w)) Sprites.draw(ctx, FX.bomb, x + off, y - 2, pulse);
    }
    for (const p of this.players) if (p.alive) this.drawPlayer(ctx, v, p, alpha);
  },

  drawPlayer(ctx, v, p, alpha) {
    if (p.invuln > 0 && ((p.invuln * 10) | 0) % 2 === 0) return;
    const x = lerpWrap(p.px, p.x, alpha), y = p.py + (p.y - p.py) * alpha;
    const s = Sprites.get(p.sprite);
    let sx = 1, sy = 1;
    if (p.squash > 0) {
      sx = 1 + 0.3 * p.squash;
      sy = 1 - 0.25 * p.squash;
    } else if (!p.onGround) {
      const st = Math.min(0.12, Math.abs(p.vy) / 6000);
      sx -= st;
      sy += st;
    }
    const tilt = (p.vx / PHYS.runSpeed) * (p.onGround ? 0.12 : 0.06);
    ctx.globalAlpha = p.hurtT > 0 ? 0.55 : 1;
    for (const off of wrapOffsets(x, p.w)) {
      ctx.setTransform(v.k, 0, 0, v.k, (x + p.w / 2 + off + v.ox) * v.k, (y + p.h + v.oy) * v.k);
      ctx.rotate(tilt);
      ctx.scale(sx * p.facing * p.scale, sy * p.scale);
      ctx.drawImage(s.canvas, -s.w / 2, -s.w + 3, s.w, s.w);
    }
    ctx.globalAlpha = 1;

    applyView(ctx, v);
    const bx = x + p.w / 2 - 16, by = y - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx - 1, by - 1, 34, 6);
    ctx.fillStyle = hpColor(p.hp);
    ctx.fillRect(bx, by, 32 * p.hp / RULES.maxHp, 4);
    ctx.fillStyle = p.cfg.color;
    ctx.fillRect(bx - 1, by - 3, 34, 2);
  },
};

function hpColor(hp) {
  return hp > 60 ? '#4ade80' : hp > 30 ? '#facc15' : '#f87171';
}
