'use strict';

/** One signature mechanic per map (MAPS[].special), announced with a banner. Hazards are Actors. */
const Specials = (() => {
  const S = {
    marble: Sprites.id('🔮', 18), leaf: Sprites.id('🍃', 14), cabbage: Sprites.id('🥬', 24),
    tomato: Sprites.id('🍅', 20), poof: Sprites.id('💨', 40), butt: Sprites.id('🍑', 26),
    pea: Sprites.id('🫛', 22), meteor: Sprites.id('☄️', 30), book: Sprites.id('📚', 22),
    clock: Sprites.id('⏰', 22), sock: Sprites.id('🧦', 20), pizza: Sprites.id('🍕', 22),
    ghost: Sprites.id('👻', 18), question: Sprites.id('❓', 18), shush: Sprites.id('🤫', 20),
    coffee: Sprites.id('☕', 22),
  };
  const WIND_DRIFT = 70, BUS_BODY = 62, TRAM_BODY = 88, NOISE_LIMIT = 60;
  const NIGHT_START = 23 * 60 + 45, MIN_PER_SEC = 5;   // 1 game hour = 12 s
  const banner = { text: '', t: 0 };
  let kind = null, timer = 0, phase = 'idle', dir = 1, leafT = 0, dark = 0;
  let count = 0, speed = 0, queue = 0, mooT = 0, u = 0, warned = false, game = null;
  let clockMin = 0, lastRun = false, extraT = 0, rent = 0;
  let buses = [];
  const busCd = new Map();

  function announce(text, t = 2.2) {
    banner.text = text;
    banner.t = t;
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function heal(p, amount) {
    const h = Math.min(amount, RULES.maxHp - p.hp);
    p.hp += h;
    Effects.text(p.cx, p.y - 8, '+' + h, '#4ade80');
    HUD.dirty = true;
    Sfx.play('heal');
  }

  function randomAlive() {
    const alive = game.players.filter(p => p.alive);
    return alive.length ? pick(alive) : null;
  }

  // ---- custom actor drawing -----------------------------------------------------------------

  function drawWheel(ctx, a, x, y) {
    const rad = a.w / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a.rot);
    ctx.strokeStyle = '#6b3f1d';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, rad - 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const ang = i * Math.PI / 6;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * (rad - 4), Math.sin(ang) * (rad - 4));
    }
    ctx.stroke();
    ctx.fillStyle = '#4a2c14';
    ctx.beginPath();
    ctx.arc(0, 0, rad * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawGust(ctx, a, x, y) {
    ctx.globalAlpha = 0.85;
    Sprites.draw(ctx, S.poof, x, y, 1.6 + Math.sin(a.t * 18) * 0.12);
    ctx.globalAlpha = 0.45;
    Sprites.draw(ctx, S.poof, x - 40, y + 6, 1.1);
    Sprites.draw(ctx, S.poof, x - 72, y - 4, 0.7);
    ctx.globalAlpha = 1;
  }

  function drawMeteor(ctx, a, x, y) {
    if (a.warn > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(a.t * 18);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2 + pulse * 2;
      ctx.beginPath();
      ctx.ellipse(a.tx, a.gy - 3, 26 + pulse * 6, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.arc(x - a.vx * 0.04, y - a.vy * 0.04, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    Sprites.draw(ctx, S.meteor, x, y, 1.2);
  }

  function drawPuck(ctx, a, x, y) {
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.ellipse(x, y, a.w / 2, a.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x - 6, y - 3, 12, 2);
  }

  // ---- helpers for individual specials --------------------------------------------------------

  function mutate(p) {
    const big = Math.random() < 0.75;
    if (game.setScale(p, big ? 1.6 : 0.6, 8)) {
      announce(big ? `🫛 Dominantní alela: ${p.cfg.name} je OBR!` : `🫛 Recesivní alela: ${p.cfg.name} je prcek!`);
      Sfx.play(big ? 'grow' : 'shrink');
    } else {
      heal(p, 10);
    }
  }

  /** Raised glass must not trap anything: move bodies out sideways, else on top of the pane. */
  function pushOutOfGlass(b) {
    if (Physics.boxFree(b.x, b.y, b.w, b.h)) return;
    for (const gt of Level.glass) {
      if (!Physics.overlaps(b, { x: gt.x, y: gt.y, w: TILE, h: TILE })) continue;
      const left = gt.x - b.w, right = gt.x + TILE;
      const sides = b.x + b.w / 2 < gt.x + TILE / 2 ? [left, right] : [right, left];
      for (const x of sides) {
        if (Physics.boxFree(x, b.y, b.w, b.h)) { b.px += x - b.x; b.x = x; return; }
      }
      let top = gt.y;
      for (const o of Level.glass) if (o.x === gt.x) top = Math.min(top, o.y);
      b.py += top - b.h - b.y;
      b.y = top - b.h;
      return;
    }
  }

  function spawnMeteor() {
    const p = Math.random() < 0.6 ? randomAlive() : null;
    const tx = Math.max(40, Math.min(VIEW_W - 40, p ? p.cx + rand(-40, 40) : rand(40, VIEW_W - 40)));
    const gy = Level.surfaceBelow(tx, 0), from = Math.random() < 0.5 ? -1 : 1;
    Actors.spawn({
      kind: 'meteor', x: tx + from * 220 - 12, y: -60, w: 24, h: 24, tx, gy, warn: 1,
      gravity: 0, collide: false, sinks: false, ttl: 4, draw: drawMeteor,
    });
  }

  /** Vehicle bodies (below the roof) hit each player once per pass; riders on the roof are safe. */
  function vehicleHits(dt, list, bodyH, cd) {
    for (const [key, t] of busCd) busCd.set(key, t - dt);
    for (const m of list) {
      if (Math.abs(m.dx) < 0.5) continue;
      const body = { x: m.x, y: m.y + 8, w: m.w, h: bodyH };
      for (const p of game.players) {
        const key = m.def.kind + m.def.x + p.idx;
        if (!p.alive || p.rider === m || (busCd.get(key) || 0) > 0 || !Physics.overlaps(body, p)) continue;
        busCd.set(key, cd);
        game.knock(p, Math.sign(m.dx) * 800, -450, 0.4);
        game.hurt(p, 25);
      }
    }
  }

  function restoreGlass() {
    Level.setGlass(true, 1);
    for (const p of game.players) if (p.alive) pushOutOfGlass(p);
    for (const b of game.bombs) pushOutOfGlass(b);
    Actors.each(a => { if (a.collide) pushOutOfGlass(a); });
  }

  /** A tram on Česká: arrives from one side, stops at the platform, leaves the other way. */
  function driveTram(m) {
    const left = -m.w - 80, right = VIEW_W + 80;
    const start = dir > 0 ? left : right, end = dir > 0 ? right : left, stop = m.def.x;
    if (phase === 'arrive') return start + (stop - start) * (1 - (1 - u) * (1 - u));
    if (phase === 'stop') return stop;
    if (phase === 'leave') return stop + (end - stop) * u * u;
    return start;
  }

  const pad2 = n => String(n).padStart(2, '0');
  const isNightHour = h => h >= 0 && h <= 5;

  /** Night bus position on its loop: leaves home, wraps around the screen, stops at home again. */
  function driveBus(m) {
    if (phase !== 'go') return m.def.x;
    const span = VIEW_W + m.w + 100, e = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
    const raw = m.def.x + m.def.dir * span * e;
    return ((raw + m.w + 50) % span + span) % span - m.w - 50;
  }

  // ---- specials --------------------------------------------------------------------------------

  const KINDS = {
    dragon: {
      start() { timer = rand(5, 8); },
      update(dt) {
        if ((timer -= dt) > 0) return;
        timer = rand(6, 9);
        game.bombs.push({
          owner: null, w: 18, h: 18, x: 471, y: 70, px: 471, py: 70,
          vx: rand(-260, 260), vy: -150, fuse: RULES.bombFuse, tick: 0, onGround: false, rider: null,
        });
        Sfx.play('roar');
        announce('🐊 Drak shodil bombu!');
      },
    },

    marble: {
      start() { timer = rand(6, 9); },
      update(dt) {
        if (Actors.count(a => a.kind === 'marble') || (timer -= dt) > 0) return;
        timer = rand(9, 13);
        // rolls out of an opening at the foot of the clock, so whoever camps on top does not get it for free
        const side = Math.random() < 0.5 ? -1 : 1, x = side < 0 ? 434 : 512;
        Actors.spawn({
          kind: 'marble', sprite: S.marble, x, y: 440, w: 14, h: 14, vx: side * rand(150, 280), vy: -420,
          bounce: 0.45, friction: 300, ttl: 10, pickup: p => heal(p, 25),
        });
        Sfx.play('chime');
        announce('🔮 Orloj vypustil kuličku: +25 HP');
      },
    },

    wind: {
      start() { timer = rand(5, 8); phase = 'idle'; },
      update(dt) {
        timer -= dt;
        if (phase === 'idle') {
          if (timer > 0) return;
          phase = 'gust';
          timer = 3.5;
          dir = Math.random() < 0.5 ? -1 : 1;
          Sfx.play('wind');
          announce(dir < 0 ? '💨 Vítr ←' : '💨 Vítr →');
          return;
        }
        if (timer <= 0) { phase = 'idle'; timer = rand(6, 9); return; }
        for (const p of game.players) if (p.alive) Physics.moveX(p, dir * WIND_DRIFT * dt);
        for (const b of game.bombs) b.vx += dir * 500 * dt;
        if ((leafT -= dt) <= 0) {
          leafT = 0.06;
          Particles.spawn(S.leaf, dir > 0 ? -10 : VIEW_W + 10, rand(40, 500), dir * rand(350, 550), rand(-60, 60),
            2.4, rand(0.7, 1.1), 0.02, false, rand(-6, 6));
        }
      },
    },

    blackout: {
      start() { timer = rand(8, 12); phase = 'idle'; },
      update(dt) {
        timer -= dt;
        if (phase === 'idle') {
          dark = 0;
          if (timer > 0) return;
          phase = 'out';
          timer = 4.5;
          Sfx.play('zap');
          announce('💡 Rožni! Výpadek proudu.');
          return;
        }
        // flicker for the first and last 0.6 s, fully dark in between
        const flicker = timer > 3.9 || timer < 0.6;
        dark = flicker ? (Math.sin(timer * 60) > 0 ? 1 : 0.3) : 1;
        if (timer <= 0) { phase = 'idle'; timer = rand(10, 14); }
      },
    },

    cabbage: {
      start() { timer = 2; },
      update(dt) {
        if ((timer -= dt) > 0) return;
        timer = rand(1.4, 2.6);
        const side = Math.random() < 0.5 ? -1 : 1, x = side < 0 ? 40 : VIEW_W - 64;
        const target = Math.random() < 0.3 ? randomAlive() : null;
        if (target) {
          const t = 0.9;
          Actors.spawn({
            sprite: S.tomato, x, y: 50, w: 18, h: 18, vx: (target.cx - x) / t,
            vy: (target.cy - 50) / t - 0.5 * PHYS.gravity * t, spin: 8, ttl: 3,
            dmg: 5, knock: 200, lift: 150, dieOnHit: true,
            onLand: a => { Particles.spawn(S.tomato, a.x + 9, a.y + 9, 0, -80, 0.4, 0.5, 0.5); Sfx.play('splat'); return true; },
            onHit: () => Sfx.play('splat'),
          });
        } else {
          Actors.spawn({
            sprite: S.cabbage, x, y: 50, w: 22, h: 22, vx: -side * rand(90, 220), vy: -rand(50, 250),
            roll: true, bounce: 0.5, friction: 25, ttl: 11, dmg: 10, knock: 420, lift: 280,
          });
        }
        Sfx.play('throw');
        if (count++ % 6 === 0) announce(pick(['🥬 Zelí ve slevě!', '🍅 Pozor, rajčata!', '🥬 Na Zelném trhu je čurina!']));
      },
    },

    wheel: {
      start() { timer = 3; speed = 280; dir = 1; },
      update(dt) {
        if (Actors.count(a => a.kind === 'wheel') || (timer -= dt) > 0) return;
        Actors.spawn({
          kind: 'wheel', x: dir > 0 ? -70 : VIEW_W + 10, y: 420, w: 60, h: 60, vx: dir * speed,
          roll: true, bounce: 0, friction: 0, ttl: 10, sinks: false,
          dmg: 20, knock: 750, lift: 450, stompable: true, draw: drawWheel,
        });
        Sfx.play('rumble');
        announce(speed < 400 ? '🛞 Birck valí kolo z Lednice!' : '🛞 Kolo zrychluje! Skoč na něj!');
        speed = Math.min(620, speed + 60);
        dir = -dir;
        timer = rand(2.5, 4);
      },
    },

    butt: {
      start() { timer = 3; phase = 'idle'; },
      update(dt) {
        timer -= dt;
        if (phase === 'idle' && timer <= 0) {
          phase = 'aim';
          timer = 0.9;
          Sfx.play('wobble');
          announce('🍑 Mužíček z Jakuba míří na Petrov!');
        } else if (phase === 'aim' && timer <= 0) {
          phase = 'idle';
          timer = rand(4, 6);
          const lane = pick(Level.map.gustLanes);
          Actors.spawn({
            kind: 'gust', x: -70, y: lane - 35, w: 70, h: 70, vx: 540, gravity: 0, collide: false,
            sinks: false, ttl: 3, dmg: 5, knock: 950, lift: 380, draw: drawGust,
          });
          Sfx.play('fart');
        }
        Actors.each(a => {
          if (a.kind !== 'gust') return;
          for (const b of game.bombs) if (Physics.overlaps(a, b)) { b.vx = 600; b.vy = Math.min(b.vy, -200); }
        });
      },
      draw(ctx, v) {
        if (phase !== 'aim') return;
        applyView(ctx, v);
        Sprites.draw(ctx, S.butt, 78, 172, 1 + 0.25 * Math.sin(timer * 30));
      },
    },

    ghosts: {
      start() {},
      update(dt) {
        for (const p of game.players) {
          if (!p.alive && !p.ghost && !game.decided && game.time - p.deadAt > 1.2) {
            p.ghost = { x: p.x, y: Math.max(20, p.y - 40), w: PLAYER_W, h: PLAYER_H, vx: 0, vy: 0, cd: 1 };
            Sfx.play('ghost');
            announce(`👻 ${p.cfg.name} straší! Kdo padne, ten straší.`);
          }
          const gh = p.ghost;
          if (!gh) continue;
          const k = p.cfg.keys;
          const tx = ((Input.isDown(k.right) ? 1 : 0) - (Input.isDown(k.left) ? 1 : 0)) * 170;
          const ty = ((Input.isDown(k.bomb) ? 1 : 0) - (Input.isDown(k.jump) ? 1 : 0)) * 170;
          gh.vx = approach(gh.vx, tx, 700 * dt);
          gh.vy = approach(gh.vy, ty, 700 * dt);
          gh.x = Math.max(0, Math.min(VIEW_W - gh.w, gh.x + gh.vx * dt));
          gh.y = Math.max(20, Math.min(VIEW_H - 60, gh.y + gh.vy * dt));
          gh.cd -= dt;
          if (gh.cd > 0) continue;
          for (const q of game.players) {
            if (!q.alive || !Physics.overlaps(gh, q)) continue;
            gh.cd = 1;
            Sfx.play('ghost');
            game.hurt(q, 10);
            break;
          }
        }
      },
      draw(ctx, v) {
        if (!game) return;
        for (const p of game.players) {
          const gh = p.ghost;
          if (!gh) continue;
          const s = Sprites.get(p.sprite), wob = Math.sin(performance.now() / 200 + p.idx) * 4;
          applyView(ctx, v);
          ctx.globalAlpha = 0.45;
          ctx.drawImage(s.canvas, gh.x + gh.w / 2 - s.w / 2, gh.y + gh.h - s.w + 3 + wob, s.w, s.w);
          ctx.globalAlpha = 0.9;
          Sprites.draw(ctx, S.ghost, gh.x + gh.w / 2, gh.y - 8 + wob);
          ctx.globalAlpha = 1;
        }
      },
    },

    peas: {
      start() { timer = 2; },
      update(dt) {
        if (Actors.count(a => a.kind === 'pea') >= 2 || (timer -= dt) > 0 || !Level.standSpots.length) return;
        timer = rand(4, 6);
        const spot = pick(Level.standSpots);
        Actors.spawn({
          kind: 'pea', sprite: S.pea, x: spot.x - 10, y: spot.y - 26, w: 20, h: 20,
          gravity: 0, collide: false, ttl: 12, pickup: mutate,
        });
        if (count++ % 3 === 0) announce('🫛 Mendel: 3 : 1. Sněz hrášek a uvidíš.');
      },
    },

    windows: {
      start() { phase = 'up'; timer = 5; Level.setGlass(true, 1); },
      update(dt) {
        timer -= dt;
        if (phase === 'up' && timer <= 0) {
          phase = 'lowering';
          timer = 0.5;
          Sfx.play('glass');
          announce('🪟 Okna zajíždějí do podlahy!');
        } else if (phase === 'lowering') {
          Level.setGlass(false, Math.max(0, timer / 0.5));
          if (timer <= 0) { phase = 'down'; timer = 4; }
        } else if (phase === 'down' && timer <= 0) {
          phase = 'rising';
          timer = 0.5;
          Sfx.play('glass');
        } else if (phase === 'rising') {
          Level.setGlass(false, Math.min(1, 1 - timer / 0.5));
          if (timer <= 0) {
            restoreGlass();
            phase = 'up';
            timer = rand(5, 7);
          }
        }
      },
    },

    meteors: {
      start() { timer = 3; queue = 0; mooT = rand(5, 8); },
      update(dt) {
        if ((mooT -= dt) <= 0) {
          mooT = rand(10, 15);
          Sfx.play('moo');
          announce('🐄 Búúú! Vítejte na Monte Bú.', 1.6);
        }
        Actors.each(a => {
          if (a.kind !== 'meteor') return;
          if (a.warn > 0) {
            a.warn -= dt;
            if (a.warn <= 0) {
              a.vx = (a.tx - (a.x + a.w / 2)) / 0.5;
              a.vy = (a.gy + 60) / 0.5;
              Sfx.play('whistle');
            }
          } else if (a.y + a.h / 2 >= a.gy - 6) {
            game.blast(a.tx, a.gy - 12, 70, 25);
            a.dead = true;
          }
        });
        if ((timer -= dt) > 0) return;
        if (queue === 0) {
          queue = 3;
          announce('☄️ Meteority nad Kravákem!');
        }
        spawnMeteor();
        queue--;
        timer = queue ? 0.45 : rand(4, 6);
      },
    },

    dorm: {
      start() { timer = 1.5; },
      update(dt) {
        if ((timer -= dt) > 0) return;
        timer = rand(1, 2);
        const x = rand(90, 860), y = rand(40, 200);
        const vx = (480 - x) * rand(0.2, 0.5) + rand(-60, 60), vy = -rand(50, 220), roll = Math.random();
        if (roll < 0.15) {
          Actors.spawn({
            kind: 'pizza', sprite: S.pizza, x, y, w: 20, h: 20, vx, vy, spin: 5,
            bounce: 0.3, friction: 400, ttl: 7, pickup: p => heal(p, 15),
          });
          announce('🍕 Někdo vyhodil pizzu: +15 HP');
          return;
        }
        const [sprite, dmg] = roll < 0.55 ? [S.book, 10] : roll < 0.8 ? [S.clock, 10] : [S.sock, 5];
        Actors.spawn({
          sprite, x, y, w: 20, h: 20, vx, vy, spin: rand(-8, 8), bounce: 0.3, friction: 400,
          ttl: 5, dmg, knock: 300, lift: 220, dieOnHit: true,
        });
        if (sprite === S.clock) Sfx.play('ring');
        if (count++ % 7 === 0) announce(pick(['📚 Zkouškové! Z oken lítají skripta.', '⏰ Je 7:00, budíky letí z oken.', '🧦 Ponožky z kolejí. Fuj.']));
      },
    },

    rozjezd: {
      start() {
        phase = 'parked';
        clockMin = NIGHT_START;
        warned = false;
        lastRun = false;
        u = 0;
        buses = Level.movers.filter(m => m.def.kind === 'bus');
        busCd.clear();
        Level.setDriver(driveBus);
      },
      update(dt) {
        // night lines leave together on every full hour from 0:00 to 5:00
        const before = Math.floor(clockMin / 60);
        clockMin += dt * MIN_PER_SEC;
        const hourIndex = Math.floor(clockMin / 60), hour = hourIndex % 24, minute = clockMin % 60;
        const next = (hour + 1) % 24;
        if (phase === 'parked' && !warned && minute >= 50 && isNightHour(next)) {
          warned = true;
          Sfx.play('horn');
          announce(`🚌 ${next}:00 – noční rozjezd! Všechny linky odjíždějí naráz!`);
        }
        if (phase === 'parked' && hourIndex !== before && isNightHour(hour)) {
          phase = 'go';
          u = 0;
          warned = false;
          lastRun = hour === 5;
        }
        if (phase === 'go') {
          u += dt / 3.4;
          if (u >= 1) {
            phase = 'parked';
            if (lastRun) {
              announce('🌅 Byl to poslední rozjezd. A je tu další noc…');
              clockMin = NIGHT_START;
            }
          }
        }
        vehicleHits(dt, buses, BUS_BODY, 3.5);
      },
      draw(ctx, v) {
        applyView(ctx, v);
        const hour = Math.floor(clockMin / 60) % 24, minute = Math.floor(clockMin % 60);
        const hourA = ((hour % 12) + minute / 60) / 12 * Math.PI * 2, minA = minute / 60 * Math.PI * 2;
        ctx.strokeStyle = '#111827';
        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(480, 100); ctx.lineTo(480 + Math.sin(hourA) * 11, 100 - Math.cos(hourA) * 11);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(480, 100); ctx.lineTo(480 + Math.sin(minA) * 17, 100 - Math.cos(minA) * 17);
        ctx.stroke();
        ctx.lineCap = 'butt';
        let dep = (hour + 1) % 24;
        while (!isNightHour(dep)) dep = (dep + 1) % 24;
        ctx.font = `bold 14px ${UI_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`${hour}:${pad2(minute)}  ·  rozjezd ${dep}:00`, 480, 215);
      },
    },

    ceska: {
      start() {
        phase = 'away';
        timer = 1.5;
        dir = 1;
        u = 0;
        extraT = rand(6, 9);
        buses = Level.movers.filter(m => m.def.kind === 'tram');
        busCd.clear();
        Level.setDriver(driveTram);
      },
      update(dt) {
        timer -= dt;
        if (phase === 'away' && timer <= 0) {
          phase = 'arrive';
          u = 0;
          Sfx.play('bell');
          announce('🚋 Šalina přijíždí na Čáru!', 1.6);
        } else if (phase === 'arrive') {
          u = Math.min(1, u + dt / 2);
          if (u >= 1) { phase = 'stop'; timer = 3; }
        } else if (phase === 'stop' && timer <= 0) {
          phase = 'leave';
          u = 0;
          Sfx.play('bell');
        } else if (phase === 'leave') {
          u = Math.min(1, u + dt / 2);
          if (u >= 1) { phase = 'away'; timer = rand(2, 4); dir = -dir; busCd.clear(); }
        }
        vehicleHits(dt, buses, TRAM_BODY, 2.5);
        if ((extraT -= dt) > 0 || Actors.count(a => a.kind === 'pizza')) return;
        extraT = rand(8, 11);
        Actors.spawn({
          kind: 'pizza', sprite: S.pizza, x: pick([65, 875]), y: 290, w: 20, h: 20,
          bounce: 0.2, friction: 400, ttl: 9, pickup: p => heal(p, 15),
        });
        announce('🍕 Pizza do ruky: +15 HP', 1.6);
      },
    },

    krize: {
      start() { timer = 5; extraT = 6; },
      update(dt) {
        if ((timer -= dt) <= 0) {
          timer = rand(6, 9);
          const calm = game.players.filter(p => p.alive && p.swapT <= 0);
          if (calm.length) {
            const p = pick(calm);
            p.swapT = 4;
            Sfx.play('wobble');
            announce(`🤯 Existenciální krize: ${p.cfg.name} neví, kde je vlevo!`);
          }
        }
        if ((extraT -= dt) > 0 || Actors.count(a => a.kind === 'coffee') || !Level.standSpots.length) return;
        extraT = rand(9, 12);
        const spot = pick(Level.standSpots);
        Actors.spawn({
          kind: 'coffee', sprite: S.coffee, x: spot.x - 10, y: spot.y - 26, w: 20, h: 20,
          gravity: 0, collide: false, ttl: 10, pickup: p => heal(p, 15),
        });
        announce('☕ Krmítko otevřelo: +15 HP', 1.6);
      },
      draw(ctx, v) {
        if (!game) return;
        applyView(ctx, v);
        for (const p of game.players) {
          if (p.alive && p.swapT > 0) Sprites.draw(ctx, S.question, p.cx, p.y - 28 + Math.sin(p.swapT * 10) * 2);
        }
      },
    },

    ticho: {
      start() {},
      update() {
        for (const p of game.players) {
          if (!p.alive || p.noise < NOISE_LIMIT) continue;
          p.noise = 0;
          p.stunT = 1;
          Sfx.play('shush');
          announce(`🤫 Psst! ${p.cfg.name}, tady je tichá zóna!`);
          game.hurt(p, 10);
        }
      },
      draw(ctx, v) {
        if (!game) return;
        applyView(ctx, v);
        for (const p of game.players) {
          if (!p.alive) continue;
          const f = Math.min(1, p.noise / NOISE_LIMIT), x = p.cx - 16, y = p.y - 22;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(x - 1, y - 1, 34, 5);
          ctx.fillStyle = `hsl(${120 - 120 * f}, 85%, 50%)`;
          ctx.fillRect(x, y, 32 * f, 3);
          if (p.stunT > 0) Sprites.draw(ctx, S.shush, p.cx, p.y - 38);
        }
      },
    },

    kabinet: {
      start() { timer = rand(4, 6); rent = 0; phase = 'up'; extraT = 0; },
      update(dt) {
        if ((timer -= dt) <= 0) {
          timer = rand(4.5, 6);
          for (const p of game.players) {
            if (p.alive && p.onGround) game.knock(p, (p.cx < VIEW_W / 2 ? 1 : -1) * 220, -560, 0.15);
          }
          game.shake = Math.min(14, game.shake + 7);
          Sfx.play('bass');
          if (count++ % 2 === 0) announce(pick(['🪩 Bass drop! Jinakosti, na parket!', '🏳️‍🌈 V Kabinetu je divnost vítaná.', '🪩 Bass drop!']), 1.4);
        }
        if (phase === 'up') {
          rent += dt / 12;
          if (rent >= 1) {
            phase = 'evicted';
            extraT = 4;
            Level.setGlass(false, 0);
            Sfx.play('shrink');
            announce('💸 Nájem nezaplacen! Pódium vystěhováno.');
          }
          return;
        }
        extraT -= dt;
        Level.setGlass(false, Math.max(0, Math.min(1, 1 - extraT / 0.5)));
        if (extraT <= 0) {
          restoreGlass();
          rent = 0;
          phase = 'up';
          announce('🎭 Nový nájemník – pódium je zpátky!', 1.6);
        }
      },
      draw(ctx, v) {
        ctx.setTransform(v.k, 0, 0, v.k, 0, 0);
        const f = phase === 'up' ? rent : 1;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(13, 47, 132, 10);
        ctx.fillStyle = f > 0.8 ? '#ef4444' : '#f0abfc';
        ctx.fillRect(14, 48, 130 * f, 8);
        ctx.font = `bold 10px ${UI_FONT}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f5d0fe';
        ctx.fillText('NÁJEM', 150, 52);
      },
    },

    ponavka: {
      start() { phase = 'idle'; timer = rand(6, 9); },
      update(dt) {
        timer -= dt;
        const LOW = VIEW_H + 20, HIGH = 400;
        if (phase === 'idle' && timer <= 0) {
          phase = 'warn';
          timer = 1.5;
          Sfx.play('gurgle');
          announce('🌊 Ponávka se vrací! Vylez výš!');
        } else if (phase === 'warn' && timer <= 0) {
          phase = 'rise';
          timer = 2;
        } else if (phase === 'rise') {
          Level.setWater(LOW + (HIGH - LOW) * Math.min(1, 1 - timer / 2));
          if (timer <= 0) { phase = 'hold'; timer = 3; }
        } else if (phase === 'hold' && timer <= 0) {
          phase = 'drain';
          timer = 2;
        } else if (phase === 'drain') {
          Level.setWater(HIGH + (LOW - HIGH) * Math.min(1, 1 - timer / 2));
          if (timer <= 0) { Level.setWater(VIEW_H + 100); phase = 'idle'; timer = rand(8, 11); }
        }
      },
    },

    puck: {
      start() { timer = 2; },
      update(dt) {
        if (Actors.count(a => a.kind === 'puck') >= 2 || (timer -= dt) > 0) return;
        timer = rand(3, 5);
        const side = Math.random() < 0.5 ? -1 : 1;
        Actors.spawn({
          kind: 'puck', x: side < 0 ? 40 : VIEW_W - 62, y: 468, w: 22, h: 10,
          vx: -side * rand(500, 750), vy: Math.random() < 0.35 ? -rand(350, 650) : 0,
          bounce: 0.9, friction: 25, ttl: 9, sinks: false, dmg: 15, knock: 600, lift: 320, draw: drawPuck,
        });
        Sfx.play('slap');
        announce(pick(['🏒 Puk! Kometa do toho!', '🏒 Bomba od modré!', '🏒 Puk letí!']), 1.4);
      },
    },
  };

  return {
    banner,

    reset(k) {
      kind = k && KINDS[k] ? k : null;
      dark = 0;
      phase = 'idle';
      count = 0;
      banner.t = 0;
      if (kind) KINDS[kind].start();
    },

    update(dt, g) {
      game = g;
      banner.t = Math.max(0, banner.t - dt);
      if (kind) KINDS[kind].update(dt);
    },

    /** Drawn after the scenery, before players, bombs and actors. */
    draw(ctx, v) {
      if (dark > 0) {
        ctx.setTransform(v.k, 0, 0, v.k, 0, 0);
        ctx.fillStyle = `rgba(4,6,16,${0.88 * dark})`;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      if (kind && KINDS[kind].draw) KINDS[kind].draw(ctx, v);
    },
  };
})();
