// Décor des zones de l'espace détente, en pixel art (1 unité = 1 pixel).
// drawZone trace le décor fixe ; drawZoneLive les parties qui bougent.

import { ZONES } from "./zones.js";

const TILE = 16;
const INK = "#1A2233";
const WHITE = "#FFFFFF";

function px(ctx, color, x, y, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function rug(ctx, ox, oy, x, y, w, h, color, edge) {
  px(ctx, color, ox + x * TILE, oy + y * TILE, w * TILE, h * TILE);
  px(ctx, edge, ox + x * TILE, oy + y * TILE, w * TILE, 1);
  px(ctx, edge, ox + x * TILE, oy + (y + h) * TILE - 1, w * TILE, 1);
}

const TV = { x: 2.7, y: 0.5, w: 4.4, h: 1.5 }; // en tuiles, dans la zone

function drawTele(ctx, ox, oy) {
  rug(ctx, ox, oy, 1.6, 2.4, 6.6, 3.0, "#D3DCE8", "#C1CCDB");
  // meuble et téléviseur
  const tx = ox + TV.x * TILE;
  const ty = oy + TV.y * TILE;
  px(ctx, "#6F7C90", tx - 4, ty + TV.h * TILE - 2, TV.w * TILE + 8, 6);
  px(ctx, INK, tx, ty, TV.w * TILE, TV.h * TILE - 2);
  px(ctx, "#243042", tx + 2, ty + 2, TV.w * TILE - 4, TV.h * TILE - 6);
  // canapé, vu de dos : dossier puis assise
  const sx = ox + 2.2 * TILE;
  const sy = oy + 3.0 * TILE;
  const sw = 5.8 * TILE;
  px(ctx, "#3F5A8A", sx, sy, sw, 18);
  px(ctx, "#4E6BA0", sx, sy, sw, 2);
  px(ctx, "#35507D", sx, sy + 18, sw, 8);
  px(ctx, "#3F5A8A", sx - 4, sy + 6, 6, 22);
  px(ctx, "#3F5A8A", sx + sw - 2, sy + 6, 6, 22);
  // table basse
  px(ctx, "#C3CEDC", ox + 4.2 * TILE, oy + 5.2 * TILE - 2, 22, 5);
}

/** Écran de la télé : il scintille tant que quelqu'un regarde. */
function drawTeleLive(ctx, ox, oy, t, active) {
  const x = ox + (TV.x + 0.125) * TILE;
  const y = oy + (TV.y + 0.125) * TILE;
  const w = TV.w * TILE - 4;
  const h = TV.h * TILE - 6;
  if (!active) {
    px(ctx, "#243042", x, y, w, h);
    return;
  }
  const frame = Math.floor(t * 1.5);
  const colors = ["#7FD39A", "#8FB7FF", "#F2C46D", "#E39BC4"];
  px(ctx, colors[frame % colors.length], x, y, w, h);
  px(ctx, colors[(frame + 2) % colors.length], x + 6, y + 3, 16, h - 6);
  px(ctx, colors[(frame + 1) % colors.length], x + w - 24, y + 5, 14, h - 10);
  px(ctx, "rgba(255,255,255,0.35)", x, y, w, 1);
}

function drawTennis(ctx, ox, oy) {
  rug(ctx, ox, oy, 0.6, 2.0, 8.8, 3.2, "#DCE5DF", "#C9D6CE");
  const tx = ox + 2.4 * TILE;
  const ty = oy + 2.9 * TILE;
  const tw = 5.2 * TILE;
  // pieds
  px(ctx, "#6F7C90", tx + 4, ty + 12, 2, 10);
  px(ctx, "#6F7C90", tx + tw - 6, ty + 12, 2, 10);
  // plateau
  px(ctx, "#25507A", tx, ty, tw, 11);
  px(ctx, "#2F6296", tx, ty, tw, 2);
  px(ctx, WHITE, tx + 2, ty + 5, tw - 4, 1);
  px(ctx, "#1B3E60", tx, ty + 11, tw, 2);
  // filet
  const nx = tx + Math.floor(tw / 2);
  px(ctx, INK, nx - 1, ty - 7, 2, 9);
  px(ctx, "#E6ECF5", nx - 1, ty - 6, 2, 6);
  px(ctx, WHITE, nx, ty - 6, 1, 8);
}

function drawDiscussion(ctx, ox, oy) {
  rug(ctx, ox, oy, 1.6, 2.2, 6.2, 3.0, "#D6E2F0", "#C3D3E6");
  const tx = ox + 4.7 * TILE;
  const ty = oy + 3.6 * TILE;
  px(ctx, "#6F7C90", tx - 1, ty + 3, 2, 8);
  px(ctx, "#C3CEDC", tx - 11, ty - 4, 22, 8);
  px(ctx, "#8E9BAD", tx - 11, ty + 3, 22, 2);
  px(ctx, WHITE, tx - 6, ty - 3, 3, 3);
  px(ctx, WHITE, tx + 3, ty - 2, 3, 3);
}

function drawDortoir(ctx, ox, oy) {
  for (const seat of ZONES.dortoir.seats) {
    const bx = ox + seat.x * TILE - 14;
    const by = oy + seat.y * TILE - 13;
    px(ctx, "#46526A", bx, by, 28, 15);
    px(ctx, "#5D6A84", bx, by, 28, 2);
    px(ctx, "#B9C8DC", bx + 2, by + 2, 24, 11);
    px(ctx, "#46526A", bx, by + 15, 2, 3);
    px(ctx, "#46526A", bx + 26, by + 15, 2, 3);
  }
  // table de nuit et lampe
  px(ctx, "#8E9BAD", ox + 0.2 * TILE, oy + 2.9 * TILE, 8, 10);
  px(ctx, "#F2C46D", ox + 0.2 * TILE + 2, oy + 2.9 * TILE - 4, 4, 4);
}

function drawSport(ctx, ox, oy) {
  rug(ctx, ox, oy, 0.4, 2.0, 8.8, 3.3, "#E1E8F2", "#CBD5E3");
  for (const seat of ZONES["salle-de-sport"].seats.filter((s) => s.pose === "run")) {
    const x = ox + seat.x * TILE;
    const y = oy + seat.y * TILE;
    px(ctx, "#2A3344", x - 11, y - 4, 22, 7); // tapis
    px(ctx, "#46526A", x - 11, y - 4, 22, 1);
    px(ctx, "#6F7C90", x - 9, y - 26, 2, 22); // montants
    px(ctx, "#6F7C90", x + 7, y - 26, 2, 22);
    px(ctx, "#2A3344", x - 10, y - 29, 20, 5); // console
    px(ctx, "#7FD39A", x - 6, y - 28, 6, 2);
  }
  // porte-haltères
  const rx = ox + 5.2 * TILE;
  const ry = oy + 2.3 * TILE;
  px(ctx, "#6F7C90", rx, ry + 10, 52, 3);
  for (let i = 0; i < 5; i += 1) {
    px(ctx, i % 2 ? "#D64545" : "#2F6FEB", rx + 3 + i * 10, ry + 4, 6, 6);
  }
  // tapis de sol
  px(ctx, "#7A4FD8", ox + 5.3 * TILE, oy + 3.9 * TILE, 3.4 * TILE, 5);
}

const POOL = ZONES.piscine.water;

function drawPiscine(ctx, ox, oy) {
  const x = ox + POOL.x * TILE;
  const y = oy + POOL.y * TILE;
  const w = POOL.w * TILE;
  const h = POOL.h * TILE;
  px(ctx, "#C9D2DD", x - 4, y - 4, w + 8, h + 8); // margelle
  px(ctx, "#8CC6F0", x, y, w, h);
  px(ctx, "#A8D6F5", x, y, w, 3);
  px(ctx, "#6BB0E0", x, y + h - 3, w, 3);
  // lignes d'eau dans le sens de la nage, entre les lignes des nageurs
  const seats = ZONES.piscine.seats;
  for (let i = 1; i < seats.length; i += 1) {
    const ly = oy + Math.round(((seats[i - 1].y + seats[i].y) / 2 + 0.1) * TILE);
    for (let k = 0; k < w; k += 4) {
      px(ctx, k % 8 ? "#E5484D" : WHITE, x + k, ly, 3, 1);
    }
  }
  // échelle
  px(ctx, "#9AA7B8", x + w - 10, y - 8, 2, 10);
  px(ctx, "#9AA7B8", x + w - 5, y - 8, 2, 10);
}

/** Reflets qui glissent sur l'eau. */
function drawPiscineLive(ctx, ox, oy, t) {
  const x = ox + POOL.x * TILE;
  const y = oy + POOL.y * TILE;
  const w = POOL.w * TILE;
  const h = POOL.h * TILE;
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 14; i += 1) {
    const px0 = (i * 37 + t * 8 * (1 + (i % 3))) % (w - 8);
    const py0 = 6 + ((i * 23) % (h - 12));
    px(ctx, "#E8F5FF", x + px0, y + py0, 6, 1);
  }
  ctx.globalAlpha = 1;
}

const GAME_TV = { x: 2.6, y: 0.7, w: 4.3, h: 1.6 }; // télé de la console, en tuiles dans la zone

function drawGaming(ctx, ox, oy) {
  rug(ctx, ox, oy, 1.2, 2.6, 7.0, 2.8, "#2A2440", "#3A3358");
  // meuble, télé et console
  const tx = ox + GAME_TV.x * TILE;
  const ty = oy + GAME_TV.y * TILE;
  const tw = GAME_TV.w * TILE;
  const th = GAME_TV.h * TILE;
  px(ctx, "#1A1F2B", tx - 6, ty + th - 2, tw + 12, 7);
  px(ctx, "#E5484D", tx - 6, ty + th + 5, (tw + 12) / 3, 1); // bande LED
  px(ctx, "#7A4FD8", tx - 6 + (tw + 12) / 3, ty + th + 5, (tw + 12) / 3, 1);
  px(ctx, "#2F6FEB", tx - 6 + (2 * (tw + 12)) / 3, ty + th + 5, (tw + 12) / 3, 1);
  px(ctx, INK, tx, ty, tw, th - 2);
  px(ctx, "#243042", tx + 2, ty + 2, tw - 4, th - 6);
  px(ctx, WHITE, tx + tw / 2 - 6, ty + th, 12, 3); // console
  px(ctx, "#3CCB6E", tx + tw / 2 + 3, ty + th + 1, 1, 1);
  // canapé pour deux, vu de dos
  const sx = ox + 3.0 * TILE;
  const sy = oy + 3.0 * TILE;
  const sw = 3.5 * TILE;
  px(ctx, "#7A4FD8", sx, sy, sw, 18);
  px(ctx, "#9B76F0", sx, sy, sw, 2);
  px(ctx, "#5E3BB0", sx, sy + 18, sw, 8);
  px(ctx, "#7A4FD8", sx - 4, sy + 6, 6, 22);
  px(ctx, "#7A4FD8", sx + sw - 2, sy + 6, 6, 22);
  // pouf
  px(ctx, "#E5484D", ox + 7.6 * TILE, oy + 4.1 * TILE, 12, 9);
  px(ctx, "#F06A6E", ox + 7.6 * TILE, oy + 4.1 * TILE, 12, 2);
}

/** Écran de la console : un jeu de plateforme tant que quelqu'un joue. */
function drawGamingLive(ctx, ox, oy, t, active) {
  const x = ox + GAME_TV.x * TILE + 2;
  const y = oy + GAME_TV.y * TILE + 2;
  const w = GAME_TV.w * TILE - 4;
  const h = GAME_TV.h * TILE - 6;
  if (!active) {
    px(ctx, "#243042", x, y, w, h);
    return;
  }
  const f = Math.floor(t * 6);
  px(ctx, "#5BB8F5", x, y, w, h); // ciel
  px(ctx, "#FFFFFF", x + ((f * 2) % (w - 10)), y + 3, 8, 2); // nuage
  px(ctx, "#3CCB6E", x, y + h - 4, w, 4); // sol
  px(ctx, "#8B5A2B", x + 20, y + h - 10, 10, 6); // bloc
  const jump = Math.abs(Math.sin(t * 3)) * 6;
  px(ctx, "#E5484D", x + 8 + (f % 30), y + h - 9 - jump, 4, 5); // joueur 1
  px(ctx, "#2F6FEB", x + 40 - (f % 26), y + h - 9 - Math.abs(Math.cos(t * 3)) * 6, 4, 5); // joueur 2
  px(ctx, "#F6CF5B", x + w - 10, y + 4 + (f % 2), 3, 3); // pièce
}

function drawBalle(ctx, ox, oy) {
  // petit terrain en gazon avec ses lignes et deux plots
  const x = ox + 0.8 * TILE;
  const y = oy + 2.4 * TILE;
  const w = 7.9 * TILE;
  const h = 2.6 * TILE;
  px(ctx, "#7CC48A", x, y, w, h);
  px(ctx, "#8CD29A", x, y, w, 2);
  px(ctx, "#FFFFFF", x, y, w, 1);
  px(ctx, "#FFFFFF", x, y + h - 1, w, 1);
  px(ctx, "#FFFFFF", x, y, 1, h);
  px(ctx, "#FFFFFF", x + w - 1, y, 1, h);
  px(ctx, "#FFFFFF", x + w / 2, y, 1, h);
  for (const cx of [x + 6, x + w - 10]) {
    px(ctx, "#F2A33A", cx, y + 6, 4, 5);
    px(ctx, "#FFFFFF", cx, y + 8, 4, 1);
  }
}

const DRAWERS = {
  gaming: drawGaming,
  balle: drawBalle,
  discussion: drawDiscussion,
  dortoir: drawDortoir,
  "salle-de-sport": drawSport,
  piscine: drawPiscine,
  tele: drawTele,
  "tennis-de-table": drawTennis,
};

const LIVE = {
  gaming: drawGamingLive,
  piscine: drawPiscineLive,
  tele: drawTeleLive,
};

export function drawZone(ctx, zone) {
  DRAWERS[zone.id]?.(ctx, zone.x * TILE, zone.y * TILE);
}

export function drawZoneLive(ctx, zone, t, active) {
  LIVE[zone.id]?.(ctx, zone.x * TILE, zone.y * TILE, t, active);
}
