'use strict';

/**
 * Moving hazards and pickups spawned by map specials (cabbages, wheel, gusts, meteors, puck, peas…).
 * Each actor is a plain object; spawn() fills defaults. Behaviour knobs:
 *   gravity (multiplier), collide (tile collision), bounce, friction, roll / spin (rotation),
 *   dmg / knock / lift (hit a player), onHit(actor, player), dieOnHit, stompable (landing on it bounces the player),
 *   pickup(player, actor), onLand(actor, game, fallSpeed) → true removes it, wrap, sinks (dies in hazards),
 *   draw(ctx, actor, x, y) to replace the default sprite drawing.
 */
const Actors = (() => {
  const list = [];

  function spawn(o) {
    const a = Object.assign({
      x: 0, y: 0, w: 20, h: 20, vx: 0, vy: 0, rot: 0, t: 0,
      sprite: -1, scale: 1, gravity: 1, collide: true, bounce: 0.4, friction: 200,
      roll: false, spin: 0, wrap: false, sinks: true, ttl: 8,
      dmg: 0, knock: 400, lift: 300, dieOnHit: false, stompable: false,
      pickup: null, onLand: null, onHit: null, draw: null, dead: false,
    }, o);
    a.px = a.x;
    a.py = a.y;
    a.hitCd = [0, 0, 0];
    list.push(a);
    return a;
  }

  function touch(a, p, game) {
    if (a.pickup) {
      a.pickup(p, a);
      a.dead = true;
      return;
    }
    if (a.stompable && p.vy > 0 && p.py + p.h <= a.py + 10) {
      p.y = a.y - p.h;
      game.knock(p, p.vx, -PHYS.stompBounceHeld, 0);
      Sfx.play('stomp');
      return;
    }
    if (!a.dmg || a.hitCd[p.idx] > 0) return;
    a.hitCd[p.idx] = 0.7;
    const dir = Math.sign(a.vx) || Math.sign(p.cx - (a.x + a.w / 2)) || 1;
    game.knock(p, dir * a.knock, -a.lift);
    game.hurt(p, a.dmg);
    if (a.onHit) a.onHit(a, p);
    if (a.dieOnHit) a.dead = true;
  }

  function update(dt, game) {
    const P = Level.phys;
    for (const a of list) {
      a.px = a.x; a.py = a.y;
      a.t += dt;
      a.ttl -= dt;
      for (let i = 0; i < 3; i++) a.hitCd[i] = Math.max(0, a.hitCd[i] - dt);
      if (a.gravity) a.vy = Math.min(a.vy + P.gravity * a.gravity * dt, P.maxFall);
      if (a.collide) {
        if (Physics.moveX(a, a.vx * dt)) a.vx = -a.vx * a.bounce;
        const fallV = a.vy, hit = Physics.moveY(a, a.vy * dt);
        if (hit > 0) {
          if (a.onLand && a.onLand(a, game, fallV)) { a.dead = true; continue; }
          a.vy = fallV > 160 ? -fallV * a.bounce : 0;
          a.vx = approach(a.vx, 0, a.friction * dt);
        } else if (hit < 0) {
          a.vy = 0;
        }
      } else {
        a.x += a.vx * dt;
        a.y += a.vy * dt;
      }
      a.rot += a.roll ? a.vx * dt / (a.w / 2) : a.spin * dt;
      if (a.wrap) Physics.wrap(a);
      if (a.ttl <= 0 || a.y > VIEW_H + 80 || a.x < -320 || a.x > VIEW_W + 320 ||
          (a.sinks && Physics.touchesSpikes(a))) {
        a.dead = true;
        continue;
      }
      for (const p of game.players) {
        if (a.dead) break;
        if (p.alive && Physics.overlaps(a, p)) touch(a, p, game);
      }
    }
    let j = 0;
    for (const a of list) if (!a.dead) list[j++] = a;
    list.length = j;
  }

  function draw(ctx, v, alpha) {
    const k = v.k;
    for (const a of list) {
      if (a.pickup && a.ttl < 2 && ((a.ttl * 8) | 0) % 2 === 0) continue;
      const x = lerpWrap(a.px, a.x, alpha) + a.w / 2, y = a.py + (a.y - a.py) * alpha + a.h / 2;
      if (a.draw) {
        applyView(ctx, v);
        a.draw(ctx, a, x, y);
        continue;
      }
      const s = Sprites.get(a.sprite), sc = a.scale * k;
      const c = Math.cos(a.rot) * sc, sn = Math.sin(a.rot) * sc;
      const bob = a.pickup ? Math.sin(a.t * 4) * 3 : 0;
      ctx.setTransform(c, sn, -sn, c, (x + v.ox) * k, (y + bob + v.oy) * k);
      ctx.drawImage(s.canvas, -s.w / 2, -s.w / 2, s.w, s.w);
    }
  }

  return {
    spawn, update, draw,
    clear() { list.length = 0; },
    count(pred) { let n = 0; for (const a of list) if (pred(a)) n++; return n; },
    each(fn) { for (const a of list) fn(a); },
  };
})();
