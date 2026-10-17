# BomBrno — agent notes

3-player local platformer, vanilla JS + Canvas 2D, zero dependencies, no build.
Classic `<script>` files (not ES modules) so `index.html` also runs from `file://`.
Load order in `index.html` matters: each file uses globals of the ones before it.

Run: `python3 -m http.server -d . 8000` → http://localhost:8000 (or open `index.html`).

## Where things are
- Tuning (physics, damage, bomb, controls, emoji palette): `src/config.js`.
- Maps (layout, spawns, movers, theme, special): `src/maps.js` — only the left half of each grid is
  written, the right half is mirrored. `src/level.js` loads one. Rotation: `R` after a round and
  `Esc` both advance to the next map (`nextMap` in `src/main.js`).
- Map look: `THEMES` + landmark painters in `src/themes.js` (shared drawing helpers in `src/kit.js`);
  tile sets, ledges, hazards, glass, conveyors and mover sprites in `src/scenery.js`.
- Per-map mechanic (`special` in the map): `src/specials.js`. Glass tiles (`g`) are shared by two
  specials: Tugendhat windows and the Kabinet múz stage (`glassStyle: 'stage'` in the theme). Moving hazards and pickups it spawns
  (cabbages, wheel, gusts, meteors, puck, peas, pizza…) are generic actors in `src/actors.js`.
- Brno facts, hantec words and place nicknames used in banners and map facts:
  `docs/for_agents/external/brno-specialities.md`. Use only what it marks as confirmed.
- Map checker: `node tools/check-maps.js` — grid size, tiles, spawns, and that every surface is
  reachable from every spawn. Run it after any change to `src/maps.js`.
- States: `select` → `play` → `over` in `src/main.js`.

## Performance decisions
- Emoji are pre-rendered to canvases (`src/sprites.js`); never `fillText` an emoji per frame
  in game code. Menu/overlay text is fine.
- Static scenery + tiles are painted once per screen scale into two layers (`src/scenery.js`).
- Physics: fixed 1/120 s step, render interpolates via `px/py`. Wrap-around snaps instead of
  interpolating (`lerpWrap`).
- Particles: typed-array pool (`src/particles.js`), no per-frame allocation.
- Measured 2026-10-17 (Playwright Chromium, 1280×720): 3 players running + 3 bombs + a death
  shatter → p95 frame 17.3 ms at 60 Hz, no dropped frames. Re-measured 2026-10-18 with the 14 maps
  (Noční rozjezd, buses moving): p95 17.6 ms.

## Traps
- Noční rozjezd runs on a game clock (`clockMin` in `src/specials.js`, 1 game hour = 12 s): buses
  leave on every full hour 0:00–5:00, then the clock rolls back to 23:45. Starting at 23:58 left no
  room for the 23:50 warning, so the first departure came unannounced.
- The MZK noise meter first decayed 8/s against +12 per jump; a tapped jump is short, lands softly
  (no landing noise) and the meter never reached the limit in 8 hops. Tuned to +14 / 4 s⁻¹ (shush
  after ~6 hops in a row) — re-measure with real tapped jumps after changing either number.
- The map checker once passed a platform nobody else could reach, because one player spawned on it:
  reachability from the union of spawns is meaningless — it has to hold from each spawn separately.
- Night buses on Noční rozjezd knock a player forward and catch up again: without the per-departure
  hit cooldown one pass took 75 HP.
- When testing timed specials through Playwright, the game keeps running between tool calls —
  a ghost left on a player for the length of one model turn drained all 100 HP.
- A new map needs its spawns checked: the centre of each spawn must sit over a solid/one-way
  tile with free space above, and mirrored spawns must be mirrored around x = 480 (a spawn on a
  tile boundary mirrors onto the neighbouring column).
- Flickering city windows (`city(..., { twinkle: true })`) are drawn every frame on top of the
  static layer; turn them off when anything is painted over the city afterwards.
- The orloj marble rolled into the fountain within ~1.5 s at low friction and silently vanished —
  rolling pickups need real friction near hazards.
- Moving platforms are one-way; a body dropped onto the elevator column lands on the elevator,
  not on whatever is under it (looked like a missed stomp during testing).
- Keyboard ghosting: cheap/laptop keyboards drop some 3+ key combos (WASD + UHJK + arrows).
  Hardware limit, not a bug — rebind keys in `PLAYERS` if a combo is blocked.
