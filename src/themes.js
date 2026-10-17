'use strict';

/**
 * Per-map look: sky, sun or moon, landmark painter, tile set, ledge / hazard style.
 * Painters draw the static background once per build; src/scenery.js adds tiles and animation.
 */
const THEMES = (() => {
  const { circle, tri, hill, city, emoji, text } = Kit;

  // ---- landmarks -------------------------------------------------------------------------

  function paintPetrov(g, r) {
    hill(g, '#2b1b4a', 380, 26, 0.011, 0.027, 0);

    g.fillStyle = '#231640';
    g.beginPath();
    g.moveTo(20, 470);
    g.bezierCurveTo(110, 300, 290, 290, 380, 470);
    g.fill();
    g.fillRect(120, 300, 160, 42);
    for (let x = 120; x < 280; x += 14) g.fillRect(x, 292, 8, 8);
    g.fillRect(186, 250, 28, 50);
    for (let x = 186; x < 214; x += 9) g.fillRect(x, 243, 6, 7);
    g.fillRect(199, 222, 2, 22);
    g.fillStyle = '#c0392b';
    tri(g, 201, 222, 218, 227, 201, 232);
    g.fillStyle = 'rgba(255,210,130,0.55)';
    for (let x = 135; x < 270; x += 26) g.fillRect(x, 318, 4, 6);

    g.fillStyle = '#26183f';
    g.beginPath();
    g.moveTo(560, 470);
    g.bezierCurveTo(640, 330, 800, 330, 880, 470);
    g.fill();
    g.fillRect(714, 325, 90, 45);
    tri(g, 710, 325, 760, 300, 808, 325);
    for (const x of [668, 694]) {
      g.fillRect(x, 268, 20, 102);
      tri(g, x - 2, 268, x + 10, 190, x + 22, 268);
    }
    g.fillStyle = 'rgba(255,210,130,0.6)';
    g.fillRect(675, 296, 6, 10);
    g.fillRect(701, 296, 6, 10);
    circle(g, 760, 345, 6);

    city(g, r, { minH: 50, maxH: 150, rgb: [28, 18, 48], lit: 0.3, dark: '#1d1233', twinkle: true });

    // the black granite clock on Náměstí Svobody, seen from afar
    g.fillStyle = '#140b26';
    g.beginPath();
    g.moveTo(289, 480);
    g.lineTo(289, 395);
    g.quadraticCurveTo(289, 352, 300, 338);
    g.quadraticCurveTo(311, 352, 311, 395);
    g.lineTo(311, 480);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(293, 370, 2, 100);
  }

  function paintSvobody(g, r) {
    hill(g, '#b9d3ec', 300, 14, 0.008, 0.02, 2);
    g.fillStyle = '#a3bfdc';
    for (const x of [812, 834]) {
      g.fillRect(x, 222, 12, 80);
      tri(g, x - 1, 222, x + 6, 172, x + 13, 222);
    }
    g.fillRect(846, 250, 60, 50);

    const facades = ['#f4d58d', '#e8a87c', '#c3d9b0', '#f2c6c2', '#e6d3a8', '#b8d4e3', '#f7e7c6'];
    let x = -10;
    while (x < VIEW_W) {
      const w = 74 + Math.floor(r() * 4) * 12, h = 190 + r() * 80, top = 480 - h;
      const color = facades[Math.floor(r() * facades.length)];
      g.fillStyle = color;
      g.fillRect(x, top, w, h);
      if (r() < 0.5) {
        g.fillStyle = '#9a3b2e';
        tri(g, x - 3, top, x + w / 2, top - 34, x + w + 3, top);
      } else {
        g.fillStyle = color;
        g.beginPath();
        g.moveTo(x + 10, top);
        g.quadraticCurveTo(x + w / 2, top - 46, x + w - 10, top);
        g.fill();
        g.fillStyle = '#9a3b2e';
        circle(g, x + w / 2, top - 26, 4);
      }
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.fillRect(x, top + 4, w, 3);
      g.fillRect(x, 418, w, 3);
      for (let wy = top + 20; wy < 400; wy += 36) {
        for (let wx = x + 12; wx < x + w - 16; wx += 24) {
          g.fillStyle = '#fff';
          g.fillRect(wx - 1, wy - 1, 14, 20);
          g.fillStyle = '#36507a';
          g.fillRect(wx + 1, wy + 1, 10, 16);
          g.fillStyle = 'rgba(255,255,255,0.35)';
          g.fillRect(wx + 1, wy + 1, 4, 16);
        }
      }
      g.fillStyle = 'rgba(0,0,0,0.25)';
      for (let ax = x + 8; ax < x + w - 24; ax += 30) {
        g.beginPath();
        g.moveTo(ax, 480);
        g.lineTo(ax, 445);
        g.arc(ax + 11, 445, 11, Math.PI, 0);
        g.lineTo(ax + 22, 480);
        g.fill();
      }
      x += w;
    }

    // plague column
    g.fillStyle = '#d6d3d1';
    g.fillRect(272, 455, 56, 25);
    g.fillStyle = '#e7e5e4';
    g.fillRect(280, 415, 40, 42);
    g.fillRect(295, 270, 10, 147);
    circle(g, 292, 285, 10);
    circle(g, 308, 300, 9);
    circle(g, 300, 268, 11);
    g.fillStyle = '#d4af37';
    g.fillRect(298, 232, 4, 26);
    circle(g, 300, 236, 5);
  }

  function paintPrehrada(g, r) {
    hill(g, '#7a4a7e', 330, 18, 0.009, 0.023, 1);
    g.fillStyle = '#4a2c58';
    g.beginPath();
    g.moveTo(0, 420);
    g.bezierCurveTo(80, 300, 260, 320, 360, 420);
    g.fill();
    g.beginPath();
    g.moveTo(560, 420);
    g.bezierCurveTo(680, 230, 900, 220, 960, 330);
    g.lineTo(960, 420);
    g.fill();
    g.fillStyle = '#2c1a38';
    for (let x = 0; x < VIEW_W; x += 9) {
      const left = x < 360, right = x > 560;
      if (!left && !right) continue;
      const t = left ? x / 360 : (x - 560) / 400;
      const y = left ? 420 - Math.sin(t * Math.PI) * 88 : 420 - Math.sin(Math.min(1, t * 0.95) * Math.PI * 0.85) * 160;
      const h = 12 + r() * 12;
      tri(g, x - 5, y + 6, x, y - h, x + 5, y + 6);
    }

    // Veveří castle
    g.fillStyle = '#24152e';
    g.fillRect(740, 228, 120, 42);
    for (let x = 740; x < 860; x += 12) g.fillRect(x, 222, 7, 7);
    g.fillRect(830, 180, 24, 50);
    tri(g, 826, 180, 842, 150, 858, 180);
    g.fillRect(752, 196, 26, 34);
    tri(g, 749, 196, 765, 176, 781, 196);
    g.fillStyle = 'rgba(255,200,120,0.75)';
    for (const [wx, wy] of [[760, 208], [838, 195], [790, 245], [812, 245], [770, 245]]) g.fillRect(wx, wy, 4, 7);

    const lake = g.createLinearGradient(0, 410, 0, VIEW_H);
    lake.addColorStop(0, '#f08a4b');
    lake.addColorStop(0.35, '#a1406a');
    lake.addColorStop(1, '#2a1640');
    g.fillStyle = lake;
    g.fillRect(0, 410, VIEW_W, VIEW_H - 410);
    for (let i = 0; i < 12; i++) {
      const w = 90 - i * 6;
      g.fillStyle = `rgba(255,225,160,${0.55 - i * 0.04})`;
      g.fillRect(720 - w / 2 + (r() - 0.5) * 10, 414 + i * 8, w, 2);
    }
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (const sx of [420, 520, 610]) {
      tri(g, sx, 418, sx + 4, 400, sx + 8, 418);
      g.fillRect(sx - 3, 418, 14, 2);
    }
  }

  function paintNadrazi(g, r) {
    hill(g, '#2b3342', 300, 10, 0.01, 0.03, 0);
    city(g, r, { minH: 170, maxH: 260, rgb: [30, 37, 50], lit: 0.25, dark: '#232a38' });

    g.fillStyle = '#8a7560';
    g.fillRect(60, 250, 840, 230);
    g.fillStyle = '#6b5a49';
    g.fillRect(50, 244, 860, 10);
    g.fillRect(60, 360, 840, 6);
    g.fillStyle = '#7a6652';
    tri(g, 380, 246, 480, 192, 580, 246);
    g.fillStyle = '#f8fafc';
    circle(g, 480, 226, 13);
    g.strokeStyle = '#1f2937';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(480, 226); g.lineTo(480, 217);
    g.moveTo(480, 226); g.lineTo(487, 229);
    g.stroke();
    for (let ax = 92; ax < 880; ax += 64) {
      g.fillStyle = '#5a4a3b';
      g.fillRect(ax - 3, 378, 46, 102);
      g.fillStyle = 'rgba(252,211,77,0.85)';
      g.beginPath();
      g.moveTo(ax, 480);
      g.lineTo(ax, 400);
      g.arc(ax + 20, 400, 20, Math.PI, 0);
      g.lineTo(ax + 40, 480);
      g.fill();
      g.fillStyle = 'rgba(120,80,30,0.5)';
      g.fillRect(ax + 19, 382, 2, 98);
      g.fillStyle = 'rgba(252,211,77,0.7)';
      g.beginPath();
      g.moveTo(ax + 10, 340);
      g.lineTo(ax + 10, 290);
      g.arc(ax + 20, 290, 10, Math.PI, 0);
      g.lineTo(ax + 30, 340);
      g.fill();
    }
    g.font = `bold 14px ${UI_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#f5e6c8';
    g.fillText('BRNO  HLAVNÍ  NÁDRAŽÍ', 480, 266);

    g.fillStyle = '#20252d';
    for (const px of [168, 786]) {
      g.fillRect(px, 290, 6, 220);
      g.fillRect(px - 30, 298, 66, 3);
    }
    g.strokeStyle = '#141820';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, 306); g.lineTo(VIEW_W, 306);
    g.moveTo(0, 318); g.lineTo(VIEW_W, 318);
    g.stroke();
  }

  /** Slits in the black granite clock (Náměstí Svobody), painted over its tiles. */
  function decorateSvobody(g) {
    g.fillStyle = 'rgba(255,255,255,0.16)';
    for (let y = 200; y < 470; y += 44) {
      g.fillRect(462, y, 3, 26);
      g.fillRect(495, y, 3, 26);
    }
    g.fillStyle = 'rgba(255,255,255,0.3)';
    g.fillRect(452, 180, 56, 2);
  }

  /** Row of narrow facades with gables and white-framed windows (old town squares). */
  function facades(g, r, palette, minH, maxH) {
    let x = -10;
    while (x < VIEW_W) {
      const w = 62 + Math.floor(r() * 4) * 12, h = minH + r() * (maxH - minH), top = 480 - h;
      const color = palette[Math.floor(r() * palette.length)];
      g.fillStyle = color;
      g.fillRect(x, top, w, h);
      g.fillStyle = '#9a3b2e';
      tri(g, x - 3, top, x + w / 2, top - 30, x + w + 3, top);
      for (let wy = top + 18; wy < 420; wy += 34) {
        for (let wx = x + 10; wx < x + w - 14; wx += 22) {
          g.fillStyle = '#fff';
          g.fillRect(wx - 1, wy - 1, 13, 19);
          g.fillStyle = '#36507a';
          g.fillRect(wx + 1, wy + 1, 9, 15);
        }
      }
      x += w;
    }
  }

  function person(g, x, y, color) {
    g.fillStyle = color;
    circle(g, x, y - 26, 5);
    g.fillRect(x - 5, y - 21, 10, 21);
  }

  function paintZelnyTrh(g, r) {
    hill(g, '#bcd3ea', 300, 12, 0.009, 0.021, 1);
    facades(g, r, ['#f1c27d', '#e9a07a', '#cde3b8', '#f4cccc', '#e8d5a9', '#c9dcec'], 170, 250);
    // Reduta theatre (young Mozart played here in 1767)
    g.fillStyle = '#efe3c4';
    g.fillRect(40, 250, 250, 230);
    g.fillStyle = '#d8c79f';
    g.fillRect(34, 244, 262, 10);
    for (let x = 60; x < 280; x += 36) { g.fillStyle = '#fff8e6'; g.fillRect(x, 290, 12, 120); }
    text(g, 'REDUTA', 165, 268, 16, '#7c5a2b');
    // stalls under the low awnings
    for (const x0 of [150, 690]) {
      g.fillStyle = '#7c4a24';
      g.fillRect(x0 + 2, 400, 4, 80);
      g.fillRect(x0 + 114, 400, 4, 80);
      g.fillStyle = '#a16207';
      g.fillRect(x0, 444, 120, 36);
      g.fillStyle = '#854d0e';
      g.fillRect(x0, 444, 120, 4);
      ['🥬', '🥕', '🍅', '🥔', '🥬'].forEach((e, i) => emoji(g, e, x0 + 14 + i * 23, 436, 18));
    }
  }

  function decorateZelnyTrh(g) {
    // Parnas: Hercules holding three-headed Cerberus in the cave, a bear climbing out of the rock
    g.fillStyle = '#2a2622';
    g.beginPath();
    g.moveTo(440, 480);
    g.lineTo(440, 430);
    g.arc(480, 430, 40, Math.PI, 0);
    g.lineTo(520, 480);
    g.fill();
    g.fillStyle = '#c9c4bb';
    circle(g, 468, 418, 6);
    g.fillRect(462, 424, 12, 30);
    g.fillRect(458, 452, 6, 22);
    g.fillRect(472, 452, 6, 22);
    for (const [hx, hy] of [[495, 452], [503, 446], [511, 452]]) circle(g, hx, hy, 4.5);
    g.fillRect(494, 456, 18, 12);
    g.strokeStyle = '#8b8378';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(474, 436); g.lineTo(497, 452);
    g.stroke();
    emoji(g, '🐻', 418, 352, 22);
  }

  /** Brno wheel: 12 spokes, as on the real one. */
  function wheel(g, x, y, rad) {
    g.strokeStyle = '#6b3f1d';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 2.5;
    g.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    g.stroke();
    g.fillStyle = '#4a2c14';
    circle(g, x, y, rad * 0.2);
  }

  function paintRadnice(g, r) {
    facades(g, r, ['#e7c98f', '#d9b27c', '#efd9a7', '#cfae7a'], 190, 270);
    // Old Town Hall tower and the Pilgram portal with the crooked middle pinnacle
    g.fillStyle = '#b79a6b';
    g.fillRect(440, 70, 80, 410);
    g.fillStyle = '#7a5c36';
    tri(g, 432, 70, 480, 6, 528, 70);
    g.fillStyle = '#3f2e1c';
    g.fillRect(470, 110, 20, 34);
    g.fillStyle = '#9d8158';
    g.beginPath();
    g.moveTo(410, 480); g.lineTo(410, 380);
    g.arc(480, 380, 70, Math.PI, 0);
    g.lineTo(550, 480);
    g.fill();
    g.fillStyle = '#2b1f14';
    g.beginPath();
    g.moveTo(430, 480); g.lineTo(430, 390);
    g.arc(480, 390, 50, Math.PI, 0);
    g.lineTo(530, 480);
    g.fill();
    g.strokeStyle = '#6e5534';
    g.lineWidth = 5;
    g.beginPath();
    for (const px of [420, 450, 510, 540]) { g.moveTo(px, 330); g.lineTo(px, 285); }
    g.moveTo(480, 320);
    g.bezierCurveTo(480, 300, 500, 300, 494, 278);
    g.stroke();
    wheel(g, 640, 380, 30);
  }

  function paintJakub(g, r) {
    // Petrov far right: the rude man is aimed at it
    g.fillStyle = '#2a2350';
    for (const x of [850, 872]) {
      g.fillRect(x, 300, 14, 90);
      tri(g, x - 1, 300, x + 7, 250, x + 15, 300);
    }
    g.fillRect(886, 340, 60, 50);
    city(g, r, { minH: 130, maxH: 230, rgb: [32, 26, 44], lit: 0.45, dark: '#231c2c', twinkle: true });
    // St. James: nave and the 92 m tower with the window of the rude little man
    g.fillStyle = '#3a3346';
    g.fillRect(40, 250, 260, 230);
    tri(g, 36, 250, 170, 170, 304, 250);
    g.fillStyle = '#463e54';
    g.fillRect(40, 60, 76, 420);
    tri(g, 34, 60, 78, -40, 122, 60);
    g.fillStyle = '#16121c';
    g.beginPath();
    g.moveTo(64, 190); g.lineTo(64, 160);
    g.arc(78, 160, 14, Math.PI, 0);
    g.lineTo(92, 190);
    g.fill();
    g.fillStyle = '#f2b49b';
    circle(g, 74, 178, 5);
    circle(g, 83, 178, 5);
    g.fillStyle = 'rgba(255,214,140,0.85)';
    for (let x = 140; x < 290; x += 34) g.fillRect(x, 300, 12, 40);
    for (let x = 340; x < 920; x += 70 + r() * 40) person(g, x, 480, '#120e18');
    text(g, 'VÝČEP', 620, 410, 13, '#f472b6');
  }

  function paintKrypta(g, r) {
    for (let x = 30; x < VIEW_W; x += 150) {
      g.fillStyle = '#211813';
      g.beginPath();
      g.moveTo(x, 480); g.lineTo(x, 140);
      g.arc(x + 60, 140, 60, Math.PI, 0);
      g.lineTo(x + 120, 480);
      g.fill();
      g.fillStyle = '#16100c';
      for (const ny of [200, 320]) {
        g.fillRect(x + 18, ny, 84, 34);
        g.fillStyle = '#7a6650';
        g.beginPath();
        g.roundRect(x + 24, ny + 10, 72, 16, 8);
        g.fill();
        g.fillStyle = '#5c4a38';
        for (let bx = x + 32; bx < x + 92; bx += 9) g.fillRect(bx, ny + 10, 2, 16);
        g.fillStyle = '#16100c';
      }
      emoji(g, '💀', x + 60, 120, 18);
    }
    for (let i = 0; i < 9; i++) {
      const fx = 60 + i * 105 + r() * 20, fy = 470 - Math.floor(r() * 3) * 120;
      g.fillStyle = '#efe6d2';
      g.fillRect(fx - 2, fy - 14, 4, 14);
      Kit.flames.push({ x: fx, y: fy - 19 });
    }
    g.fillStyle = '#4b5563';
    g.fillRect(410, 445, 140, 35);
    g.fillStyle = 'rgba(186,230,253,0.35)';
    g.fillRect(416, 448, 128, 10);
    text(g, 'baron Trenck', 480, 468, 11, '#e5e7eb');
  }

  function paintMendel(g, r) {
    hill(g, '#a7d3a0', 330, 14, 0.008, 0.02, 3);
    // Augustinian abbey in Staré Brno, brewery chimney next door
    g.fillStyle = '#e9dcc0';
    g.fillRect(40, 230, 330, 250);
    g.fillStyle = '#b45a3c';
    tri(g, 30, 230, 205, 170, 380, 230);
    g.fillStyle = '#e9dcc0';
    g.fillRect(270, 120, 50, 110);
    g.fillStyle = '#4b6b45';
    tri(g, 262, 120, 295, 70, 328, 120);
    g.fillStyle = '#6b7280';
    for (let x = 60; x < 360; x += 40) g.fillRect(x, 260, 14, 26);
    g.fillStyle = '#8b4a2b';
    g.fillRect(800, 120, 26, 360);
    g.fillRect(700, 330, 220, 150);
    text(g, 'PIVOVAR', 810, 350, 14, '#fde68a');
    // pea rows on stakes and Mendel's beehouse
    g.strokeStyle = '#6b4a2b';
    g.lineWidth = 2;
    for (let x = 190; x < 780; x += 22) {
      g.beginPath(); g.moveTo(x, 480); g.lineTo(x, 430); g.stroke();
      g.fillStyle = '#3f8f3a';
      circle(g, x + 4, 442 + r() * 20, 5);
      circle(g, x - 3, 455 + r() * 15, 4);
    }
    g.fillStyle = '#a16207';
    g.fillRect(600, 410, 70, 70);
    g.fillStyle = '#713f12';
    tri(g, 594, 410, 635, 385, 676, 410);
    emoji(g, '🐝', 690, 395, 14);
    emoji(g, '🐝', 712, 410, 12);
  }

  function decorateMendel(g) {
    g.fillStyle = 'rgba(120,53,15,0.35)';
    for (let y = 306; y < 360; y += 10) g.fillRect(420, y, 120, 2);
  }

  function paintTugendhat(g, r) {
    // view from the garden: Špilberk and Petrov far away, villa interior with chrome columns
    hill(g, '#4c3a6b', 320, 10, 0.01, 0.03, 1);
    g.fillStyle = '#3a2b55';
    g.fillRect(140, 250, 90, 30);
    g.fillRect(170, 228, 20, 22);
    for (const x of [760, 778]) { g.fillRect(x, 240, 10, 60); tri(g, x - 1, 240, x + 5, 205, x + 11, 240); }
    city(g, r, { minH: 30, maxH: 80, rgb: [40, 30, 64], lit: 0.4, dark: '#2b2240', twinkle: false });
    g.fillStyle = '#f4f1ea';
    g.fillRect(0, 330, VIEW_W, 150);
    g.fillStyle = 'rgba(253,186,116,0.25)';
    g.fillRect(0, 330, VIEW_W, 150);
    g.strokeStyle = '#5b3a1a';
    g.lineWidth = 8;
    g.beginPath();
    g.arc(480, 480, 110, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
    for (const x of [250, 710]) {
      g.fillStyle = '#e5e7eb';
      g.fillRect(x - 3, 330, 6, 150);
      g.fillStyle = '#94a3b8';
      g.fillRect(x - 6, 330, 12, 3);
      g.fillStyle = '#fff';
      g.fillRect(x - 1, 335, 2, 140);
    }
    g.fillStyle = '#4ade80';
    g.fillRect(0, 300, 150, 30);
    g.fillRect(810, 300, 150, 30);
  }

  function decorateTugendhat(g) {
    const glow = g.createRadialGradient(480, 375, 10, 480, 375, 120);
    glow.addColorStop(0, 'rgba(255,190,90,0.45)');
    glow.addColorStop(1, 'rgba(255,190,90,0)');
    g.fillStyle = glow;
    g.fillRect(360, 255, 240, 240);
  }

  function paintKraviHora(g, r) {
    city(g, r, { minH: 20, maxH: 70, rgb: [30, 24, 52], lit: 0.5, dark: '#221a3a', twinkle: true });
    g.fillStyle = '#2b2348';
    g.beginPath();
    g.moveTo(0, 420);
    g.bezierCurveTo(240, 300, 700, 280, 960, 400);
    g.lineTo(960, 540); g.lineTo(0, 540);
    g.fill();
    // observatory (opened 1954), planetarium dome on top of the hill
    g.fillStyle = '#d6d3d1';
    g.fillRect(400, 250, 160, 70);
    g.fillStyle = '#f5f5f4';
    g.beginPath();
    g.arc(480, 250, 64, Math.PI, 0);
    g.fill();
    g.fillStyle = '#334155';
    g.fillRect(474, 188, 12, 62);
    g.fillStyle = '#e7e5e4';
    g.beginPath();
    g.arc(600, 285, 26, Math.PI, 0);
    g.fill();
    g.fillStyle = '#a8a29e';
    g.fillRect(574, 285, 52, 35);
    text(g, 'HVĚZDÁRNA', 480, 290, 12, '#475569');
    g.fillStyle = '#38bdf8';
    for (const x0 of [180, 660]) g.fillRect(x0, 476, 120, 4);
  }

  function paintPalacak(g, r) {
    // dorm block, laundry and the Zeď nářků with engineers' Ing. tags
    g.fillStyle = '#cbd5e1';
    g.fillRect(70, 20, 820, 460);
    g.fillStyle = '#94a3b8';
    for (let y = 60; y < 400; y += 56) g.fillRect(70, y, 820, 4);
    for (let y = 26; y < 390; y += 56) {
      for (let x = 92; x < 880; x += 46) {
        const lit = r() < 0.45;
        g.fillStyle = lit ? '#fde68a' : '#475569';
        g.fillRect(x, y + 10, 26, 26);
        g.fillStyle = '#e2e8f0';
        g.fillRect(x + 12, y + 10, 2, 26);
      }
    }
    g.strokeStyle = '#64748b';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(120, 150); g.lineTo(300, 150);
    g.moveTo(660, 262); g.lineTo(840, 262);
    g.stroke();
    ['🧦', '👕', '🧦', '🩲'].forEach((e, i) => emoji(g, e, 140 + i * 45, 160, 16));
    ['👕', '🧦', '🧦'].forEach((e, i) => emoji(g, e, 690 + i * 55, 272, 16));
    g.fillStyle = '#e7e5e4';
    g.fillRect(30, 400, 900, 80);
    const tags = [['Ing. Šalina', '#ef4444'], ['Ing. Čurina', '#2563eb'], ['Ing. Love', '#16a34a'], ['Ing. Škopek', '#9333ea'], ['Ing. Zoncna', '#ea580c']];
    tags.forEach(([t, c], i) => text(g, t, 110 + i * 185, 424 + (i % 2) * 22, 15, c));
    text(g, 'ZEĎ NÁŘKŮ', 480, 466, 11, '#6b7280');
  }

  function decoratePalacak(g) {
    text(g, 'MENZA', 480, 350, 13, '#1f2937');
    emoji(g, '🍽️', 456, 372, 14);
    emoji(g, '🍽️', 504, 372, 14);
  }

  function paintRozjezd(g, r) {
    city(g, r, { minH: 120, maxH: 230, rgb: [18, 22, 40], lit: 0.3, dark: '#141a2c', twinkle: true });
    g.fillStyle = '#5b4a3a';
    g.fillRect(250, 120, 460, 150);
    g.fillStyle = '#44372b';
    tri(g, 240, 120, 480, 60, 720, 120);
    g.fillStyle = '#f8fafc';
    circle(g, 480, 100, 22);
    g.fillStyle = 'rgba(253,224,71,0.75)';
    for (let x = 270; x < 700; x += 48) g.fillRect(x, 150, 22, 40);
    g.fillStyle = '#0f172a';
    g.fillRect(380, 200, 200, 30);
    for (const x of [120, 350, 610, 840]) {
      g.fillStyle = '#1f2937';
      g.fillRect(x, 300, 4, 180);
      const glow = g.createRadialGradient(x + 2, 300, 2, x + 2, 300, 70);
      glow.addColorStop(0, 'rgba(253,230,138,0.5)');
      glow.addColorStop(1, 'rgba(253,230,138,0)');
      g.fillStyle = glow;
      g.fillRect(x - 70, 230, 144, 140);
    }
    for (const x of [120, 270, 690, 840]) {
      g.fillStyle = '#e5e7eb';
      g.fillRect(x - 10, 296, 24, 18);
      text(g, 'N', x + 2, 306, 12, '#1d4ed8');
    }
  }

  function paintKometa(g, r) {
    // stands full of fans, spotlights from the roof
    for (let y = 150; y < 470; y += 14) {
      for (let x = 40; x < 920; x += 12) {
        if (x > 360 && x < 600 && y < 200) continue;
        const c = r();
        g.fillStyle = c < 0.4 ? '#1d4ed8' : c < 0.7 ? '#f8fafc' : c < 0.85 ? '#ef4444' : '#475569';
        circle(g, x + (r() - 0.5) * 4, y + (r() - 0.5) * 4, 3);
      }
    }
    g.fillStyle = 'rgba(15,23,42,0.35)';
    g.fillRect(0, 140, VIEW_W, 340);
    for (const x of [160, 480, 800]) {
      g.fillStyle = 'rgba(255,255,255,0.08)';
      tri(g, x - 10, 0, x - 140, 480, x + 120, 480);
    }
    text(g, 'KOMETA', 220, 300, 30, 'rgba(255,255,255,0.35)');
    text(g, 'KOMETA', 740, 300, 30, 'rgba(255,255,255,0.35)');
    g.fillStyle = '#f8fafc';
    g.fillRect(30, 440, 900, 40);
    g.fillStyle = '#dc2626';
    g.fillRect(30, 440, 900, 4);
  }

  function decorateKometa(g) {
    text(g, 'BRNO 5 : 0 PRAHA', 480, 145, 14, '#fbbf24');
    text(g, '3. třetina', 480, 165, 10, '#94a3b8');
  }

  function paintCeska(g, r) {
    facades(g, r, ['#d9cdb8', '#c9b79c', '#e2d6c3', '#b9b2a6', '#d4c4a8'], 200, 300);
    // covered arcade, the "pod hodinama" clock, the pizza window
    g.fillStyle = '#8b7d6b';
    g.fillRect(560, 300, 330, 14);
    for (let x = 570; x < 890; x += 48) g.fillRect(x, 314, 10, 166);
    g.fillStyle = '#334155';
    g.fillRect(476, 170, 8, 150);
    g.fillStyle = '#f8fafc';
    circle(g, 480, 160, 20);
    g.strokeStyle = '#0f172a';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(480, 160, 20, 0, Math.PI * 2);
    g.moveTo(480, 160); g.lineTo(480, 146);
    g.moveTo(480, 160); g.lineTo(490, 164);
    g.stroke();
    text(g, 'pod hodinama', 480, 128, 11, '#1f2937');
    g.fillStyle = '#7c2d12';
    g.fillRect(150, 390, 110, 90);
    g.fillStyle = '#fde68a';
    g.fillRect(162, 410, 86, 40);
    emoji(g, '🍕', 205, 432, 26);
    text(g, 'PIZZA DO RUKY', 205, 400, 10, '#fef3c7');
    g.strokeStyle = '#1f2937';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, 330); g.lineTo(VIEW_W, 330);
    g.stroke();
  }

  function decorateCeska(g) {
    g.fillStyle = '#9ca3af';
    g.fillRect(0, 476, VIEW_W, 2);
    g.fillRect(0, 470, VIEW_W, 2);
  }

  function paintFilda(g, r) {
    g.fillStyle = '#e7dcc8';
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let x = 30; x < VIEW_W; x += 120) {
      g.fillStyle = '#d6c7ad';
      g.fillRect(x, 40, 70, 150);
      g.fillStyle = '#9fc5e8';
      g.fillRect(x + 6, 46, 58, 138);
    }
    // blackboard behind the lectern
    g.fillStyle = '#5b3a1e';
    g.fillRect(300, 220, 360, 150);
    g.fillStyle = '#1f3b2c';
    g.fillRect(308, 228, 344, 134);
    text(g, 'Myslím, tedy jsem.', 480, 262, 20, '#f1f5f9');
    text(g, 'Ale kde je vlevo?', 480, 300, 16, '#cbd5e1');
    text(g, '∃ smysl ⇒ ?', 480, 334, 14, '#94a3b8');
    // bookshelves and the café
    for (const x0 of [40, 700]) {
      g.fillStyle = '#6b4423';
      g.fillRect(x0, 60, 220, 4);
      for (let x = x0; x < x0 + 220; x += 7) {
        g.fillStyle = ['#b91c1c', '#1d4ed8', '#15803d', '#a16207', '#6b21a8'][Math.floor(r() * 5)];
        g.fillRect(x, 64 - 0, 6, 18 + r() * 6);
      }
    }
    g.fillStyle = '#7c2d12';
    g.fillRect(820, 150, 110, 30);
    text(g, 'KRMÍTKO ☕', 875, 165, 12, '#fde68a');
  }

  function paintMzk(g, r) {
    g.fillStyle = '#cbd5e1';
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    // atrium with the colour-coded floors (orange, red, blue, green, yellow from the bottom)
    const floors = [['#f97316', 390], ['#ef4444', 300], ['#3b82f6', 210], ['#22c55e', 120], ['#eab308', 60]];
    for (const [c, y] of floors) {
      g.fillStyle = c;
      g.globalAlpha = 0.25;
      g.fillRect(0, y - 60, VIEW_W, 60);
      g.globalAlpha = 1;
    }
    for (let y = 40; y < 470; y += 90) {
      for (let x = 60; x < 900; x += 160) {
        g.fillStyle = '#78350f';
        g.fillRect(x, y, 100, 50);
        for (let bx = x + 3; bx < x + 97; bx += 6) {
          g.fillStyle = ['#7f1d1d', '#1e3a8a', '#14532d', '#713f12', '#4c1d95', '#334155'][Math.floor(r() * 6)];
          g.fillRect(bx, y + 4 + (r() < 0.2 ? 6 : 0), 5, 40);
        }
      }
    }
    g.fillStyle = '#0f172a';
    g.fillRect(400, 430, 160, 30);
    text(g, 'TICHÁ ZÓNA', 480, 445, 14, '#f8fafc');
    emoji(g, '♟️', 120, 455, 22);
    emoji(g, '♞', 150, 455, 22);
  }

  function paintKabinet(g, r) {
    // rainbow beams over a crowd that came to be itself
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
    colors.forEach((c, i) => {
      g.fillStyle = c;
      g.globalAlpha = 0.12;
      tri(g, 480, 20, 60 + i * 170, 480, 140 + i * 170, 480);
    });
    g.globalAlpha = 1;
    emoji(g, '🪩', 480, 60, 44);
    g.fillStyle = '#111827';
    g.fillRect(330, 120, 300, 120);
    g.fillStyle = '#1e1b4b';
    g.fillRect(338, 128, 284, 104);
    text(g, 'KABINET FILMÚZ', 480, 168, 18, '#f0abfc');
    text(g, 'dnes: všichni jiní vítáni', 480, 198, 12, '#c4b5fd');
    g.fillStyle = '#18181b';
    for (const x of [40, 880]) g.fillRect(x, 300, 40, 180);
    g.fillStyle = '#3f3f46';
    for (const x of [40, 880]) { circle(g, x + 20, 350, 14); circle(g, x + 20, 420, 14); }
    for (let x = 110; x < 860; x += 34 + r() * 20) {
      g.fillStyle = '#0b0712';
      circle(g, x, 450, 7);
      g.fillRect(x - 7, 457, 14, 23);
      if (r() < 0.25) emoji(g, '🏳️‍🌈', x + 8, 430, 14);
    }
    text(g, 'BAR', 920, 270, 12, '#f472b6');
  }

  function decorateKabinet(g) {
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(300, 372, 360, 4);
  }

  function paintLuzanky(g, r) {
    hill(g, '#86c06a', 360, 16, 0.01, 0.025, 2);
    g.fillStyle = '#e7dcc8';
    g.fillRect(600, 250, 140, 90);
    g.fillStyle = '#b45309';
    tri(g, 590, 250, 670, 210, 750, 250);
    for (let i = 0; i < 9; i++) {
      const x = 40 + i * 110 + r() * 30, y = 200 + r() * 80;
      g.fillStyle = '#6b4423';
      g.fillRect(x - 5, y, 10, 480 - y);
      g.fillStyle = ['#2f7d32', '#3f8f3a', '#4caf50'][i % 3];
      circle(g, x, y, 42);
      circle(g, x - 28, y + 18, 28);
      circle(g, x + 28, y + 14, 30);
    }
    emoji(g, '🦆', 230, 492, 18);
    emoji(g, '🦆', 740, 492, 16);
  }

  return {
    petrov: {
      sky: [[0, '#0f0c29'], [0.45, '#35205e'], [0.72, '#93406f'], [0.9, '#e9785a'], [1, '#f6b06b']],
      stars: 110, orb: { x: 880, y: 110, r: 26, color: '#fbefc8', glow: '255,240,200', craters: true },
      cloud: 'rgba(255,214,230,0.16)', tiles: 'brick', ledge: 'wood', hazard: 'spikes',
      paint: paintPetrov, dragon: true,
    },
    svobody: {
      sky: [[0, '#3b82f6'], [0.6, '#93c5fd'], [1, '#e0f2fe']],
      stars: 0, orb: { x: 120, y: 95, r: 30, color: '#fff7c2', glow: '255,244,180' },
      cloud: 'rgba(255,255,255,0.8)', tiles: 'cobble', ledge: 'balcony', hazard: 'water',
      paint: paintSvobody, decorate: decorateSvobody,
    },
    prehrada: {
      sky: [[0, '#1e2a6e'], [0.4, '#6d3aa8'], [0.68, '#f0794a'], [0.8, '#fbbf68']],
      stars: 30, orb: { x: 720, y: 345, r: 42, color: '#ffd98a', glow: '255,200,120' },
      cloud: 'rgba(255,180,160,0.35)', tiles: 'rock', ledge: 'wood', hazard: 'water',
      paint: paintPrehrada,
    },
    nadrazi: {
      sky: [[0, '#0f172a'], [0.5, '#334155'], [0.85, '#64748b'], [1, '#94a3b8']],
      stars: 25, orb: { x: 140, y: 100, r: 22, color: '#e2e8f0', glow: '220,230,255', craters: true },
      cloud: 'rgba(200,210,230,0.18)', tiles: 'concrete', ledge: 'girder', hazard: 'rails',
      paint: paintNadrazi,
    },
    zelnytrh: {
      sky: [[0, '#60a5fa'], [0.7, '#bfdbfe'], [1, '#fef3c7']],
      stars: 0, orb: { x: 860, y: 95, r: 28, color: '#fff7c2', glow: '255,244,180' },
      cloud: 'rgba(255,255,255,0.8)', tiles: 'cobble', alt: 'cliff', ledge: 'wood', hazard: 'water',
      awning: ['#16a34a', '#f8fafc'], paint: paintZelnyTrh, decorate: decorateZelnyTrh,
    },
    radnice: {
      sky: [[0, '#7dd3fc'], [0.6, '#fde68a'], [1, '#fdba74']],
      stars: 0, orb: { x: 860, y: 100, r: 26, color: '#fff3c4', glow: '255,236,170' },
      cloud: 'rgba(255,255,255,0.7)', tiles: 'sandstone', ledge: 'wood', hazard: 'spikes',
      paint: paintRadnice, dragon: true,
    },
    jakub: {
      sky: [[0, '#0b1026'], [0.6, '#1e1b4b'], [1, '#4c1d95']],
      stars: 90, orb: { x: 860, y: 100, r: 20, color: '#f1f5f9', glow: '210,220,255', craters: true },
      cloud: 'rgba(200,190,255,0.12)', tiles: 'cobbleNight', ledge: 'balcony', hazard: 'bones',
      paint: paintJakub,
    },
    krypta: {
      sky: [[0, '#0c0806'], [1, '#2a1a12']],
      stars: 0, orb: null, cloud: null, tiles: 'crypt', ledge: 'coffin', hazard: 'bones',
      paint: paintKrypta,
    },
    mendel: {
      sky: [[0, '#38bdf8'], [0.7, '#bae6fd'], [1, '#ecfccb']],
      stars: 0, orb: { x: 860, y: 95, r: 28, color: '#fffbe0', glow: '255,244,180' },
      cloud: 'rgba(255,255,255,0.85)', tiles: 'garden', ledge: 'trellis', hazard: 'water',
      paint: paintMendel, decorate: decorateMendel,
    },
    tugendhat: {
      sky: [[0, '#1e3a8a'], [0.45, '#9333ea'], [0.75, '#fb923c'], [1, '#fde68a']],
      stars: 20, orb: { x: 600, y: 300, r: 34, color: '#ffd38a', glow: '255,190,110' },
      cloud: 'rgba(255,190,170,0.3)', tiles: 'plaster', alt: 'onyx', ledge: 'chrome', hazard: 'water',
      paint: paintTugendhat, decorate: decorateTugendhat,
    },
    kravihora: {
      sky: [[0, '#0f172a'], [0.5, '#3b2a6b'], [0.85, '#c2416b'], [1, '#f59e0b']],
      stars: 80, orb: { x: 150, y: 110, r: 18, color: '#f8fafc', glow: '220,220,255', craters: true },
      cloud: 'rgba(255,200,220,0.15)', tiles: 'rock', ledge: 'wood', hazard: 'water',
      paint: paintKraviHora,
    },
    palacak: {
      sky: [[0, '#0ea5e9'], [0.7, '#7dd3fc'], [1, '#e0f2fe']],
      stars: 0, orb: { x: 40, y: 140, r: 24, color: '#fff7c2', glow: '255,244,180' },
      cloud: 'rgba(255,255,255,0.8)', tiles: 'concrete', alt: 'steel', ledge: 'girder', hazard: 'water',
      paint: paintPalacak, decorate: decoratePalacak,
    },
    rozjezd: {
      sky: [[0, '#020617'], [0.6, '#172554'], [1, '#334155']],
      stars: 60, orb: { x: 860, y: 100, r: 22, color: '#e2e8f0', glow: '220,230,255', craters: true },
      cloud: 'rgba(180,190,220,0.12)', tiles: 'asphalt', ledge: 'shelter', hazard: 'rails',
      paint: paintRozjezd,
    },
    kometa: {
      sky: [[0, '#020617'], [1, '#111827']],
      stars: 0, orb: null, cloud: null, tiles: 'ice', alt: 'screen', ledge: 'bench', hazard: 'spikes',
      paint: paintKometa, decorate: decorateKometa,
    },
    ceska: {
      sky: [[0, '#93c5fd'], [0.7, '#dbeafe'], [1, '#fef9c3']],
      stars: 0, orb: { x: 860, y: 95, r: 26, color: '#fff7c2', glow: '255,244,180' },
      cloud: 'rgba(255,255,255,0.8)', tiles: 'cobble', ledge: 'girder', hazard: 'rails',
      paint: paintCeska, decorate: decorateCeska,
    },
    filda: {
      sky: [[0, '#e7dcc8'], [1, '#d6c7ad']],
      stars: 0, orb: null, cloud: null, tiles: 'sandstone', ledge: 'wood', hazard: 'spikes',
      paint: paintFilda,
    },
    mzk: {
      sky: [[0, '#cbd5e1'], [1, '#94a3b8']],
      stars: 0, orb: null, cloud: null, tiles: 'concrete', ledge: 'floor', hazard: 'spikes',
      floorColors: { 2: '#eab308', 4: '#22c55e', 7: '#3b82f6', 10: '#ef4444', 13: '#f97316' },
      paint: paintMzk,
    },
    kabinet: {
      sky: [[0, '#0b0712'], [1, '#1e1033']],
      stars: 0, orb: null, cloud: null, tiles: 'cobbleNight', ledge: 'girder', hazard: 'spikes',
      glassStyle: 'stage', disco: true, paint: paintKabinet, decorate: decorateKabinet,
    },
    luzanky: {
      sky: [[0, '#38bdf8'], [0.75, '#bae6fd'], [1, '#ecfccb']],
      stars: 0, orb: { x: 860, y: 95, r: 28, color: '#fffbe0', glow: '255,244,180' },
      cloud: 'rgba(255,255,255,0.85)', tiles: 'garden', ledge: 'wood', hazard: 'water',
      paint: paintLuzanky,
    },
  };
})();
