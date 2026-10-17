'use strict';

const Input = (() => {
  const held = new Set();
  const listeners = [];
  const NO_SCROLL = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

  addEventListener('keydown', e => {
    if (NO_SCROLL.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    held.add(e.code);
    for (const fn of listeners) fn(e.code);
  });
  addEventListener('keyup', e => held.delete(e.code));
  addEventListener('blur', () => held.clear());

  return {
    isDown: code => held.has(code),
    onPress: fn => listeners.push(fn),
  };
})();
