'use strict';

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const view = { k: 1, ox: 0, oy: 0 };
  let state = 'select';
  let entries = [];
  let needResize = true;
  let mapIndex = 0;
  let last = performance.now(), acc = 0, time = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const s = Math.min(innerWidth / VIEW_W, innerHeight / VIEW_H);
    canvas.style.width = `${Math.floor(VIEW_W * s)}px`;
    canvas.style.height = `${Math.floor(VIEW_H * s)}px`;
    view.k = s * dpr;
    canvas.width = Math.round(VIEW_W * view.k);
    canvas.height = Math.round(VIEW_H * view.k);
    Sprites.setResolution(view.k);
    Scenery.build(view.k);
    HUD.resize(view.k);
  }
  addEventListener('resize', () => { needResize = true; });

  function nextMap() {
    mapIndex = (mapIndex + 1) % MAPS.length;
    Level.load(MAPS[mapIndex]);
    Scenery.build(view.k);
  }

  function startMatch() {
    Particles.clear();
    Effects.clear();
    Game.start(entries);
    HUD.dirty = true;
    acc = 0;
    state = 'play';
  }

  function toSelect() {
    Game.stop();
    Particles.clear();
    Effects.clear();
    Select.reset();
    state = 'select';
  }

  Input.onPress(code => {
    Sfx.unlock();
    if (code === 'KeyM') { Sfx.toggleMute(); return; }
    if (state === 'select') {
      if (Select.press(code)) { entries = Select.entries(); startMatch(); }
      return;
    }
    if (code === 'Escape') { nextMap(); toSelect(); return; }
    if (state === 'over' && code === 'KeyR') { nextMap(); startMatch(); return; }
    Game.press(code);
  });

  function render(alpha) {
    const sh = Game.shake;
    view.ox = sh ? (Math.random() * 2 - 1) * sh : 0;
    view.oy = sh ? (Math.random() * 2 - 1) * sh : 0;
    Scenery.drawBack(ctx, view, time);
    Scenery.drawDynamic(ctx, view, time, alpha);
    if (state !== 'select') {
      Specials.draw(ctx, view);
      Game.draw(ctx, view, alpha);
      Actors.draw(ctx, view, alpha);
    }
    Particles.draw(ctx, view);
    Effects.draw(ctx, view);
    if (state === 'select') {
      Select.draw(ctx, view, time);
    } else {
      HUD.draw(ctx, view, Game.players, Game.score);
      Overlay.countdown(ctx, view, Game.countdown, Level.map);
      Overlay.banner(ctx, view, Specials.banner);
      if (state === 'over') Overlay.result(ctx, view, time, Game.winner);
    }
    if (Sfx.muted) Overlay.mute(ctx, view);
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    time += dt;
    if (needResize) { needResize = false; resize(); }
    if (state === 'select') {
      Level.update(dt);
      if (Select.update(dt)) { entries = Select.entries(); startMatch(); }
    } else {
      acc += dt;
      while (acc >= STEP) { Game.update(STEP); acc -= STEP; }
      if (state === 'play' && Game.result) state = 'over';
    }
    Particles.update(dt);
    Effects.update(dt);
    Game.shake = Math.max(0, Game.shake - 45 * dt);
    render(state === 'select' ? 1 : acc / STEP);
    requestAnimationFrame(frame);
  }

  Level.load(MAPS[mapIndex]);
  requestAnimationFrame(frame);
})();
