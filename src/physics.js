'use strict';

/** Axis-separated box vs tile-grid collision. Bodies are { x, y, w, h } with x, y top-left. */
const Physics = {
  /** Returns true when a wall stopped the move. */
  moveX(b, dx) {
    b.x += dx;
    const r0 = Math.floor(b.y / TILE), r1 = Math.floor((b.y + b.h - 0.01) / TILE);
    if (dx > 0) {
      const c = Math.floor((b.x + b.w - 0.01) / TILE);
      for (let r = r0; r <= r1; r++) {
        if (Level.isSolid(Level.tileAt(c, r))) { b.x = c * TILE - b.w; return true; }
      }
    } else if (dx < 0) {
      const c = Math.floor(b.x / TILE);
      for (let r = r0; r <= r1; r++) {
        if (Level.isSolid(Level.tileAt(c, r))) { b.x = (c + 1) * TILE; return true; }
      }
    }
    return false;
  },

  /** Returns the tile type landed on (> 0), -1 for a ceiling hit, 0 for a free move. */
  moveY(b, dy) {
    const prevBottom = b.y + b.h;
    b.y += dy;
    const c0 = Math.floor(b.x / TILE), c1 = Math.floor((b.x + b.w - 0.01) / TILE);
    if (dy > 0) {
      const r = Math.floor((b.y + b.h - 0.01) / TILE), top = r * TILE;
      let hit = T_EMPTY;
      for (let c = c0; c <= c1; c++) {
        const t = Level.tileAt(c, r);
        const oneWay = t === T_ONEWAY || t === T_BOUNCE;
        if (Level.isSolid(t) || (oneWay && prevBottom <= top + 0.01)) {
          if (hit !== T_PAD && hit !== T_BOUNCE) hit = t;
        }
      }
      if (hit) b.y = top - b.h;
      return hit;
    }
    if (dy < 0) {
      const r = Math.floor(b.y / TILE);
      for (let c = c0; c <= c1; c++) {
        if (Level.isSolid(Level.tileAt(c, r))) { b.y = (r + 1) * TILE; return -1; }
      }
    }
    return 0;
  },

  /** Moving platforms are one-way: a body lands only if its bottom was above the top. */
  landOnMovers(b, prevBottom) {
    for (const m of Level.movers) {
      if (b.x + b.w > m.x && b.x < m.x + m.w &&
          prevBottom <= m.y + Math.abs(m.dy) + 1 && b.y + b.h >= m.y) {
        b.y = m.y - b.h;
        return m;
      }
    }
    return null;
  },

  boxFree(x, y, w, h) {
    const c0 = Math.floor(x / TILE), c1 = Math.floor((x + w - 0.01) / TILE);
    const r0 = Math.floor(y / TILE), r1 = Math.floor((y + h - 0.01) / TILE);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) if (Level.isSolid(Level.tileAt(c, r))) return false;
    }
    return true;
  },

  overlaps(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  },

  wrap(b) {
    const cx = b.x + b.w / 2;
    if (cx < 0) { b.x += VIEW_W; b.px += VIEW_W; }
    else if (cx >= VIEW_W) { b.x -= VIEW_W; b.px -= VIEW_W; }
  },

  touchesSpikes(b) {
    if (b.y + b.h > Level.waterY + 14) return true;
    const r = Math.floor((b.y + b.h - 1) / TILE);
    if (b.y + b.h <= r * TILE + 14) return false;
    const c0 = Math.floor(b.x / TILE), c1 = Math.floor((b.x + b.w - 0.01) / TILE);
    for (let c = c0; c <= c1; c++) if (Level.tileAt(c, r) === T_SPIKE) return true;
    return false;
  },
};
