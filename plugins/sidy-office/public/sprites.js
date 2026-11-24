// Dessin pixel art : personnages, mobilier et écrans. Tout est tracé à la main
// avec des rectangles sur un canvas basse résolution (1 unité = 1 pixel).

import { TILE } from "./layout.js";
import { drawZone } from "./zones-draw.js";

const INK = "#1A2233";
const WHITE = "#FFFFFF";
const SHOE = "#1A2233";
const CHAIR = "#46526A";
const CHAIR_LIGHT = "#5D6A84";
const SCREEN_OFF = "#243042";

export const SPRITE_W = 12;
export const SPRITE_H = 18;

function px(ctx, color, x, y, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amount);
  const g = clamp(((n >> 8) & 0xff) + amount);
  const b = clamp((n & 0xff) + amount);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Couleur des cheveux : une tête rasée garde une ombre de la teinte de peau. */
function hairOf(look) {
  return look.cut === "rase" ? shade(look.skin, -22) : look.hair;
}

function drawHeadFront(ctx, x, y, look, blink) {
  const hair = hairOf(look);
  const hairTop = look.hood || hair;
  if (look.hood) {
    px(ctx, look.hood, x + 2, y, 8, 8);
    px(ctx, shade(look.hood, 18), x + 3, y, 6, 1);
  } else if (look.cut === "afro") {
    px(ctx, hair, x + 2, y - 1, 8, 3);
    px(ctx, hair, x + 3, y - 2, 6, 1);
  } else {
    px(ctx, hair, x + 3, y, 6, 2);
  }
  px(ctx, look.skin, x + 3, y + 2, 6, 5);
  if (!look.hood) {
    px(ctx, hairTop, x + 3, y + 2, 1, 2);
    px(ctx, hairTop, x + 8, y + 2, 1, 2);
    if (look.cut === "afro") {
      px(ctx, hair, x + 2, y + 2, 1, 3);
      px(ctx, hair, x + 9, y + 2, 1, 3);
    } else if (look.cut === "longue") {
      // cheveux qui retombent sur les épaules
      px(ctx, hair, x + 2, y + 2, 1, 6);
      px(ctx, hair, x + 9, y + 2, 1, 6);
    }
  }
  if (look.bun) {
    px(ctx, look.hair, x + 5, y - 2, 2, 2);
  }
  if (look.cap) {
    px(ctx, look.cap, x + 3, y - 1, 6, 2);
    px(ctx, look.cap, x + 2, y + 1, 8, 1);
    px(ctx, "#E5B637", x + 5, y, 2, 1);
  }
  if (!blink) {
    px(ctx, INK, x + 4, y + 4);
    px(ctx, INK, x + 7, y + 4);
  }
  if (look.glasses) {
    px(ctx, INK, x + 3, y + 4, 6, 1);
    px(ctx, "#BFD6F5", x + 4, y + 4);
    px(ctx, "#BFD6F5", x + 7, y + 4);
  }
  if (look.headphones) {
    px(ctx, look.headphones, x + 3, y - 1, 6, 1);
    px(ctx, look.headphones, x + 2, y + 2, 1, 4);
    px(ctx, look.headphones, x + 9, y + 2, 1, 4);
  }
}

function drawHeadBack(ctx, x, y, look) {
  if (look.hood) {
    px(ctx, look.hood, x + 2, y, 8, 8);
    px(ctx, shade(look.hood, 18), x + 3, y, 6, 1);
    return;
  }
  const hair = hairOf(look);
  if (look.cut === "afro") {
    px(ctx, hair, x + 2, y - 2, 8, 10);
    px(ctx, hair, x + 3, y - 3, 6, 1);
  } else if (look.cut === "longue") {
    px(ctx, hair, x + 2, y, 8, 12);
  } else {
    px(ctx, hair, x + 3, y, 6, 7);
  }
  px(ctx, shade(hair, 25), x + 4, y + 1, 3, 1);
  if (!look.cut || look.cut === "rase") {
    px(ctx, look.skin, x + 2, y + 4, 1, 1);
    px(ctx, look.skin, x + 9, y + 4, 1, 1);
  }
  if (look.bun) {
    px(ctx, look.hair, x + 5, y - 2, 2, 2);
  }
  if (look.cap) {
    px(ctx, look.cap, x + 3, y - 1, 6, 3);
  }
  if (look.headphones) {
    px(ctx, look.headphones, x + 3, y - 1, 6, 1);
    px(ctx, look.headphones, x + 2, y + 2, 1, 4);
    px(ctx, look.headphones, x + 9, y + 2, 1, 4);
  }
}

function drawTorso(ctx, x, y, look, front) {
  px(ctx, look.top, x + 2, y + 7, 8, 6);
  px(ctx, shade(look.top, 22), x + 2, y + 7, 8, 1);
  if (look.stripe) {
    px(ctx, look.stripe, x + 2, y + 10, 8, 1);
  }
  if (front && look.tie) {
    px(ctx, WHITE, x + 4, y + 7, 4, 1);
    px(ctx, look.tie, x + 5, y + 8, 2, 4);
  }
}

/**
 * Personnage debout. `facing` : 'front' ou 'back'. `step` alterne les jambes en marche.
 */
export function drawStanding(
  ctx,
  x,
  y,
  look,
  { facing = "front", step = -1, blink = false, wave = false } = {},
) {
  const ox = Math.round(x - SPRITE_W / 2);
  const oy = Math.round(y - SPRITE_H);
  // ombre
  ctx.fillStyle = "rgba(26,34,51,0.12)";
  ctx.fillRect(ox + 2, oy + SPRITE_H - 1, 8, 2);
  const leftUp = step === 0 ? 1 : 0;
  const rightUp = step === 1 ? 1 : 0;
  px(ctx, look.pants, ox + 3, oy + 13, 2, 4 - leftUp);
  px(ctx, look.pants, ox + 7, oy + 13, 2, 4 - rightUp);
  px(ctx, SHOE, ox + 3, oy + 17 - leftUp, 2, 1);
  px(ctx, SHOE, ox + 7, oy + 17 - rightUp, 2, 1);
  drawTorso(ctx, ox, oy, look, facing === "front");
  // bras
  const swing = step >= 0 ? (step === 0 ? 1 : -1) : 0;
  px(ctx, look.top, ox + 1, oy + 8 + Math.max(0, swing), 1, 4);
  px(ctx, look.skin, ox + 1, oy + 12 + Math.max(0, swing), 1, 1);
  if (wave) {
    px(ctx, look.top, ox + 10, oy + 4, 1, 4);
    px(ctx, look.skin, ox + 10, oy + 3, 1, 1);
  } else {
    px(ctx, look.top, ox + 10, oy + 8 + Math.max(0, -swing), 1, 4);
    px(ctx, look.skin, ox + 10, oy + 12 + Math.max(0, -swing), 1, 1);
  }
  if (facing === "front") {
    drawHeadFront(ctx, ox, oy, look, blink);
  } else {
    drawHeadBack(ctx, ox, oy, look);
  }
}

/** Assis sur le canapé, de face. */
export function drawSittingFront(
  ctx,
  x,
  y,
  look,
  { blink = false, sleepy = false } = {},
) {
  const ox = Math.round(x - SPRITE_W / 2);
  const oy = Math.round(y - SPRITE_H + 2);
  px(ctx, look.pants, ox + 3, oy + 13, 6, 2);
  px(ctx, look.pants, ox + 3, oy + 15, 2, 1);
  px(ctx, look.pants, ox + 7, oy + 15, 2, 1);
  drawTorso(ctx, ox, oy, look, true);
  px(ctx, look.top, ox + 1, oy + 9, 1, 3);
  px(ctx, look.top, ox + 10, oy + 9, 1, 3);
  px(ctx, look.skin, ox + 2, oy + 12, 1, 1);
  px(ctx, look.skin, ox + 9, oy + 12, 1, 1);
  drawHeadFront(ctx, ox, oy + (sleepy ? 1 : 0), look, blink || sleepy);
}

/**
 * Assis à son poste, vu de dos. `action` : typing, reading, running, thinking,
 * delegating, waiting, idle. `t` est le temps en secondes.
 */
export function drawSeatedBack(ctx, x, y, look, action, t) {
  const ox = Math.round(x - SPRITE_W / 2);
  const oy = Math.round(y - SPRITE_H);
  const tick = Math.floor(t * 8) % 2;
  let headDx = 0;
  let headDy = 0;
  if (action === "reading") {
    headDx = Math.floor(t * 0.8) % 2;
  } else if (action === "thinking") {
    headDy = Math.floor(t * 2) % 2;
  } else if (action === "idle") {
    headDy = 1;
  }
  drawTorso(ctx, ox, oy, look, false);
  // bras vers le clavier
  const leftLift = action === "typing" ? tick : 0;
  const rightLift = action === "typing" ? 1 - tick : 0;
  px(ctx, look.top, ox + 1, oy + 8 - leftLift, 1, 4);
  px(ctx, look.skin, ox + 1, oy + 7 - leftLift, 1, 1);
  if (action === "waiting") {
    px(ctx, look.top, ox + 10, oy + 2 + tick, 1, 5);
    px(ctx, look.skin, ox + 10, oy + 1 + tick, 1, 1);
  } else if (action === "delegating") {
    px(ctx, look.top, ox + 10, oy + 8, 3, 1);
    px(ctx, look.skin, ox + 13, oy + 8, 1, 1);
  } else {
    const mouse = action === "running" ? Math.floor(t * 3) % 2 : 0;
    px(ctx, look.top, ox + 10, oy + 8 - rightLift, 1, 4);
    px(ctx, look.skin, ox + 10 + mouse, oy + 7 - rightLift, 1, 1);
  }
  drawHeadBack(ctx, ox + headDx, oy + headDy, look);
  // dossier de chaise devant le bas du dos
  px(ctx, CHAIR, ox + 1, oy + 11, 10, 6);
  px(ctx, CHAIR_LIGHT, ox + 2, oy + 11, 8, 1);
  px(ctx, CHAIR, ox + 5, oy + 17, 2, 1);
}

export function drawEmptyChair(ctx, x, y) {
  const ox = Math.round(x - SPRITE_W / 2);
  const oy = Math.round(y - SPRITE_H);
  px(ctx, CHAIR, ox + 1, oy + 9, 10, 8);
  px(ctx, CHAIR_LIGHT, ox + 2, oy + 9, 8, 1);
  px(ctx, CHAIR, ox + 5, oy + 17, 2, 1);
}

/* ---------- écrans ---------- */

const CODE_COLORS = ["#7FD39A", "#8FB7FF", "#F2C46D", "#E39BC4", "#B7C3D6"];

function codeLine(seed) {
  const s = Math.sin(seed * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

/** Écran de 16 × 10 pixels à (x, y). */
export function drawScreen(ctx, x, y, status, t, errorFlash) {
  const w = 16;
  const h = 10;
  if (errorFlash) {
    px(ctx, Math.floor(t * 6) % 2 ? "#D64545" : "#8E2B2B", x, y, w, h);
    px(ctx, WHITE, x + 7, y + 2, 2, 4);
    px(ctx, WHITE, x + 7, y + 7, 2, 1);
    return;
  }
  switch (status) {
    case "typing": {
      px(ctx, "#14202E", x, y, w, h);
      const progress = Math.floor(t * 6);
      for (let row = 0; row < 4; row += 1) {
        const lineIndex = Math.floor(progress / 10) + row;
        const indent = 1 + Math.floor(codeLine(lineIndex) * 3);
        const full = 4 + Math.floor(codeLine(lineIndex + 99) * 9);
        const len = row === 3 ? Math.min(full, progress % 10) : full;
        px(
          ctx,
          CODE_COLORS[lineIndex % CODE_COLORS.length],
          x + indent,
          y + 1 + row * 2,
          len,
          1,
        );
        if (row === 3 && Math.floor(t * 3) % 2) {
          px(ctx, WHITE, x + indent + len, y + 7, 1, 1);
        }
      }
      break;
    }
    case "reading": {
      px(ctx, "#F4F7FB", x, y, w, h);
      const offset = Math.floor(t * 4) % 2;
      for (let row = 0; row < 5; row += 1) {
        const len = 6 + Math.floor(codeLine(row + Math.floor(t)) * 8);
        px(ctx, "#B4BFCE", x + 1, y + 1 + row * 2 - offset, len, 1);
      }
      px(ctx, "rgba(47,111,235,0.45)", x, y + 4, w, 2);
      break;
    }
    case "running": {
      px(ctx, "#0E141C", x, y, w, h);
      const scroll = Math.floor(t * 5);
      for (let row = 0; row < 4; row += 1) {
        const len = 3 + Math.floor(codeLine(scroll + row) * 10);
        px(ctx, "#3CCB6E", x + 1, y + 1 + row * 2, 1, 1);
        px(ctx, "#9FB0C4", x + 3, y + 1 + row * 2, len, 1);
      }
      break;
    }
    case "thinking": {
      px(ctx, SCREEN_OFF, x, y, w, h);
      const dot = Math.floor(t * 3) % 3;
      for (let i = 0; i < 3; i += 1) {
        px(ctx, i === dot ? "#DDE4EE" : "#6B7A90", x + 4 + i * 3, y + 4, 2, 2);
      }
      break;
    }
    case "delegating": {
      px(ctx, "#2A2410", x, y, w, h);
      const shift = Math.floor(t * 6) % 4;
      px(ctx, "#E5B637", x + 3 + shift, y + 4, 6, 2);
      px(ctx, "#E5B637", x + 9 + shift, y + 3, 1, 4);
      px(ctx, "#E5B637", x + 10 + shift, y + 4, 1, 2);
      break;
    }
    case "waiting": {
      const on = Math.floor(t * 2) % 2;
      px(ctx, on ? "#E07B00" : "#5A3A10", x, y, w, h);
      px(ctx, WHITE, x + 7, y + 2, 2, 4);
      px(ctx, WHITE, x + 7, y + 7, 2, 1);
      break;
    }
    default:
      px(ctx, SCREEN_OFF, x, y, w, h);
      px(ctx, "#33415A", x + 1, y + 1, 4, 1);
  }
}

/* ---------- mobilier ---------- */

const DESK_TOP = "#C3CEDC";
const DESK_EDGE = "#8E9BAD";
const DESK_LEG = "#6F7C90";

/** Bureau de 3 tuiles. Retourne les coordonnées des écrans pour l'animation. */
export function drawDesk(ctx, tx, ty, monitors = 1) {
  const x = tx * TILE;
  const y = ty * TILE;
  const w = TILE * 3;
  px(ctx, DESK_TOP, x, y + 6, w, 10);
  px(ctx, shade(DESK_TOP, 14), x, y + 6, w, 1);
  px(ctx, DESK_EDGE, x, y + 16, w, 3);
  px(ctx, DESK_LEG, x + 1, y + 19, 2, 3);
  px(ctx, DESK_LEG, x + w - 3, y + 19, 2, 3);
  const screens = [];
  const positions = monitors === 2 ? [x + 4, x + 26] : [x + 15];
  for (const mx of positions) {
    px(ctx, INK, mx - 1, y - 7, 18, 12);
    px(ctx, "#3A465C", mx + 7, y + 5, 2, 3);
    px(ctx, "#3A465C", mx + 4, y + 8, 8, 1);
    screens.push({ x: mx, y: y - 6 });
  }
  // clavier et tasse
  px(ctx, "#E8EDF3", x + 14, y + 11, 20, 3);
  px(ctx, "#B9C4D2", x + 14, y + 13, 20, 1);
  px(ctx, WHITE, x + 39, y + 9, 4, 4);
  px(ctx, "#2F6FEB", x + 39, y + 9, 4, 1);
  return screens;
}

function drawPlant(ctx, x, y) {
  px(ctx, "#2E9E5B", x + 2, y, 4, 3);
  px(ctx, "#3DBB6E", x, y + 2, 4, 3);
  px(ctx, "#248049", x + 4, y + 2, 4, 4);
  px(ctx, "#3DBB6E", x + 2, y + 4, 4, 3);
  px(ctx, "#5B6B82", x + 1, y + 7, 6, 5);
  px(ctx, "#71819A", x + 1, y + 7, 6, 1);
}

function drawWindow(ctx, x, y, w) {
  px(ctx, "#C9D2DD", x - 1, y - 1, w + 2, 22);
  px(ctx, "#D9EBFF", x, y, w, 20);
  px(ctx, "#EAF4FF", x + 3, y + 2, 6, 2);
  px(ctx, "#EAF4FF", x + w - 14, y + 9, 9, 2);
  px(ctx, "#C9D2DD", x + Math.floor(w / 2), y, 1, 20);
}

function drawFloor(ctx, cols, rows) {
  for (let ty = 3; ty < rows; ty += 1) {
    for (let tx = 0; tx < cols; tx += 1) {
      px(
        ctx,
        (tx + ty) % 2 ? "#F2F5F9" : "#EBEFF5",
        tx * TILE,
        ty * TILE,
        TILE,
        TILE,
      );
    }
  }
}

function drawWall(ctx, cols) {
  px(ctx, WHITE, 0, 0, cols * TILE, 3 * TILE);
  for (let x = 0; x < cols * TILE; x += 32) {
    px(ctx, "#F0F3F7", x, 0, 1, 3 * TILE - 4);
  }
  px(ctx, "#C9D2DD", 0, 3 * TILE - 4, cols * TILE, 4);
  drawWindow(ctx, 24, 10, 40);
  drawWindow(ctx, 104, 10, 40);
  drawWindow(ctx, 184, 10, 40);
  // tableau blanc
  px(ctx, "#C9D2DD", 270, 8, 60, 30);
  px(ctx, WHITE, 272, 10, 56, 26);
  px(ctx, "#2F6FEB", 276, 15, 18, 1);
  px(ctx, "#2E9E5B", 276, 20, 26, 1);
  px(ctx, "#D64545", 276, 25, 12, 1);
  px(ctx, "#7A4FD8", 296, 30, 22, 1);
  // horloge
  px(ctx, "#C9D2DD", 348, 14, 14, 14);
  px(ctx, WHITE, 349, 15, 12, 12);
  px(ctx, INK, 355, 17, 1, 5);
  px(ctx, INK, 355, 21, 4, 1);
}

function drawRack(ctx) {
  const x = 22 * TILE + 2;
  const y = 3 * TILE + 4;
  px(ctx, "#2A3344", x, y, 26, 58);
  for (let i = 0; i < 6; i += 1) {
    px(ctx, "#3A465C", x + 2, y + 3 + i * 9, 22, 7);
  }
}

/** Voyants du rack, redessinés à chaque image. */
export function drawRackLights(ctx, t) {
  const x = 22 * TILE + 2;
  const y = 3 * TILE + 4;
  for (let i = 0; i < 6; i += 1) {
    const on = Math.sin(t * 3 + i * 1.7) > 0;
    px(ctx, on ? "#3CCB6E" : "#1F5A35", x + 19, y + 5 + i * 9, 2, 2);
    px(ctx, i % 2 ? "#2F6FEB" : "#E5B637", x + 15, y + 5 + i * 9, 2, 2);
  }
}

function drawLounge(ctx, L) {
  // tapis
  px(ctx, "#E1E8F2", 1.5 * TILE, (L + 0.2) * TILE, 6 * TILE, 2.6 * TILE);
  px(ctx, "#D3DCE8", 1.5 * TILE, (L + 0.2) * TILE, 6 * TILE, 1);
  // canapé (dossier derrière les personnes assises)
  const cx = 2.3 * TILE;
  const cy = (L + 0.4) * TILE;
  px(ctx, "#3F5A8A", cx, cy, 52, 10);
  px(ctx, "#4E6BA0", cx, cy, 52, 2);
  px(ctx, "#3F5A8A", cx - 4, cy + 4, 6, 14);
  px(ctx, "#3F5A8A", cx + 50, cy + 4, 6, 14);
  // machine à café
  const mx = 0.5 * TILE;
  const my = (L - 0.4) * TILE;
  px(ctx, "#C9D2DD", mx - 2, my + 12, 16, 10);
  px(ctx, "#2A3344", mx, my, 12, 14);
  px(ctx, "#D64545", mx + 2, my + 3, 2, 2);
  px(ctx, "#0E141C", mx + 4, my + 8, 4, 3);
  // table haute
  const tx = 15.5 * TILE;
  const ty = (L + 0.6) * TILE;
  px(ctx, DESK_TOP, tx, ty, 34, 6);
  px(ctx, DESK_EDGE, tx, ty + 6, 34, 2);
  px(ctx, DESK_LEG, tx + 16, ty + 8, 2, 8);
  px(ctx, WHITE, tx + 6, ty + 1, 3, 3);
  px(ctx, WHITE, tx + 24, ty + 1, 3, 3);
}

function drawLowerWall(ctx, layout) {
  const bottom = layout.rows * TILE;
  const y = (layout.rows - 0.6) * TILE;
  px(ctx, "#C9D2DD", 0, y, layout.cols * TILE, bottom - y);
  const dx = (layout.door.x - 1) * TILE;
  px(ctx, "#EBEFF5", dx, y, 2 * TILE, bottom - y);
  px(ctx, "#9AA7B8", dx - 2, y, 2, bottom - y);
  px(ctx, "#9AA7B8", dx + 2 * TILE, y, 2, bottom - y);
}

/** Mur entre l'espace travail et l'espace détente, ouvert au niveau du couloir central. */
function drawPartition(ctx, layout) {
  const y = layout.partitionY * TILE;
  const h = (layout.leisureTop - layout.partitionY) * TILE;
  px(ctx, "#C9D2DD", 0, y, layout.cols * TILE, h);
  px(ctx, "#9AA7B8", 0, y + h - 2, layout.cols * TILE, 2);
  const open = (layout.aisleX - 1) * TILE;
  px(ctx, "#EBEFF5", open, y, 2 * TILE, h);
  px(ctx, "#9AA7B8", open - 2, y, 2, h);
  px(ctx, "#9AA7B8", open + 2 * TILE, y, 2, h);
}

/** Sol de l'espace détente : un damier plus froid que celui des bureaux. */
function drawLeisureFloor(ctx, layout) {
  for (let ty = Math.floor(layout.leisureTop); ty < layout.rows; ty += 1) {
    for (let tx = 0; tx < layout.cols; tx += 1) {
      px(ctx, (tx + ty) % 2 ? "#E6ECF5" : "#DFE6F1", tx * TILE, ty * TILE, TILE, TILE);
    }
  }
}

/** Décor fixe, dessiné une seule fois par plan. */
export function drawBackground(ctx, layout) {
  const L = layout.loungeTop;
  drawFloor(ctx, layout.cols, layout.rows);
  drawWall(ctx, layout.cols);
  drawRack(ctx);
  drawLounge(ctx, L);
  drawPlant(ctx, 0.3 * TILE, 3.4 * TILE);
  for (let y = 7.6; y < L - 1; y += 4) {
    drawPlant(ctx, 21.1 * TILE, y * TILE);
  }
  drawPlant(ctx, 7.4 * TILE, (L + 1.2) * TILE);
  drawPlant(ctx, 22.4 * TILE, (L + 1.6) * TILE);
  if (layout.zones.length) {
    drawLeisureFloor(ctx, layout);
    drawPartition(ctx, layout);
    for (const zone of layout.zones) {
      drawZone(ctx, zone);
    }
  }
  drawLowerWall(ctx, layout);
}

/* ---------- bulles ---------- */

const BUBBLE_ICONS = {
  typing: [
    "#2E9E5B",
    [
      [1, 1, 7, 3],
      [2, 2, 1, 1],
      [4, 2, 1, 1],
      [6, 2, 1, 1],
    ],
  ],
  reading: [
    "#2F6FEB",
    [
      [2, 0, 3, 1],
      [1, 1, 1, 3],
      [5, 1, 1, 3],
      [2, 4, 3, 1],
      [5, 4, 2, 1],
      [6, 5, 2, 1],
    ],
  ],
  running: [
    "#7A4FD8",
    [
      [1, 1, 1, 1],
      [2, 2, 1, 1],
      [1, 3, 1, 1],
      [4, 3, 4, 1],
    ],
  ],
  thinking: [
    "#5B6B82",
    [
      [1, 3, 1, 1],
      [4, 3, 1, 1],
      [7, 3, 1, 1],
    ],
  ],
  delegating: [
    "#C99A00",
    [
      [1, 2, 5, 1],
      [5, 1, 1, 3],
      [6, 2, 1, 1],
    ],
  ],
  waiting: [
    "#E07B00",
    [
      [4, 0, 1, 4],
      [4, 5, 1, 1],
    ],
  ],
  // au repos : discussion, café
  chat: [
    "#2F6FEB",
    [
      [1, 1, 7, 1],
      [1, 3, 5, 1],
    ],
  ],
  smile: [
    "#E5A000",
    [
      [2, 1, 1, 1],
      [6, 1, 1, 1],
      [1, 3, 1, 1],
      [2, 4, 5, 1],
      [7, 3, 1, 1],
    ],
  ],
  idea: [
    "#C99A00",
    [
      [3, 0, 3, 1],
      [2, 1, 1, 2],
      [6, 1, 1, 2],
      [3, 3, 3, 1],
      [4, 4, 1, 1],
    ],
  ],
  coffee: [
    "#8A5A2B",
    [
      [1, 2, 5, 3],
      [6, 2, 1, 1],
      [7, 3, 1, 1],
      [6, 4, 1, 1],
      [2, 0, 1, 1],
      [4, 0, 1, 1],
    ],
  ],
};

/** Icônes de bulle choisies à tour de rôle pendant une discussion. */
export const CHAT_ICONS = ["chat", "smile", "idea", "chat"];

/** Petite bulle pixel au-dessus de la tête (x, y = sommet de la tête). */
export function drawBubble(ctx, x, y, status, t) {
  const icon = BUBBLE_ICONS[status];
  if (!icon) {
    return;
  }
  const bob = Math.floor(t * 2) % 2;
  const bx = Math.round(x - 5);
  const by = Math.round(y - 11 - bob);
  px(ctx, INK, bx, by, 11, 9);
  px(ctx, WHITE, bx + 1, by + 1, 9, 7);
  px(ctx, INK, bx + 4, by + 9, 2, 1);
  const [color, rects] = icon;
  for (const [rx, ry, rw, rh] of rects) {
    px(ctx, color, bx + 1 + rx, by + 1 + ry, rw, rh);
  }
}

/** Balle lancée entre deux collègues (x, y en pixels du dessin). */
export function drawBall(ctx, x, y) {
  const bx = Math.round(x);
  const by = Math.round(y);
  px(ctx, INK, bx - 2, by - 1, 4, 3);
  px(ctx, INK, bx - 1, by - 2, 2, 5);
  px(ctx, "#E5A000", bx - 1, by - 1, 2, 3);
  px(ctx, "#F6CF5B", bx - 1, by - 1, 1, 1);
}

export function drawZzz(ctx, x, y, t) {
  const phase = (t * 0.7) % 1;
  const zy = Math.round(y - 4 - phase * 8);
  ctx.globalAlpha = 1 - phase;
  px(ctx, "#7D8AA0", x + 4, zy, 3, 1);
  px(ctx, "#7D8AA0", x + 5, zy + 1, 1, 1);
  px(ctx, "#7D8AA0", x + 4, zy + 2, 3, 1);
  ctx.globalAlpha = 1;
}

/** Avion en papier (délégation). */
export function drawPlane(ctx, x, y, dir) {
  const s = dir >= 0 ? 1 : -1;
  const ox = Math.round(x);
  const oy = Math.round(y);
  px(ctx, WHITE, ox - 3 * s, oy - 1, 1, 1);
  ctx.fillStyle = WHITE;
  ctx.fillRect(Math.min(ox, ox - 4 * s), oy, 5, 1);
  ctx.fillRect(Math.min(ox - s, ox - 3 * s), oy + 1, 3, 1);
  px(ctx, "#B9C4D2", ox - 2 * s, oy + 1, 1, 1);
  px(ctx, INK, ox + s, oy, 1, 1);
}
