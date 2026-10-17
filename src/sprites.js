'use strict';

/**
 * Emoji pre-rendered to bitmaps. Drawing a colour emoji with fillText every frame is
 * expensive; drawImage of a cached canvas is not. Re-rendered when the screen scale changes.
 */
const Sprites = (() => {
  const FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  const list = [];
  const ids = new Map();
  let res = 1;

  function render(s) {
    const px = Math.ceil(s.w * res);
    s.canvas.width = px;
    s.canvas.height = px;
    const g = s.canvas.getContext('2d');
    g.font = `${s.size * res}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(s.emoji, px / 2, px / 2 + s.size * res * 0.06);
  }

  function id(emoji, size) {
    const key = emoji + '@' + size;
    let i = ids.get(key);
    if (i === undefined) {
      i = list.length;
      const s = { emoji, size, w: size * 1.3, canvas: document.createElement('canvas') };
      list.push(s);
      ids.set(key, i);
      render(s);
    }
    return i;
  }

  function draw(ctx, i, x, y, scale = 1) {
    const s = list[i], w = s.w * scale;
    ctx.drawImage(s.canvas, x - w / 2, y - w / 2, w, w);
  }

  return {
    id,
    draw,
    get: i => list[i],
    setResolution(r) { res = r; list.forEach(render); },
  };
})();
