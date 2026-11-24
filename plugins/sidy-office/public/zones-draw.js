// Décor des zones de l'espace détente, en pixel art (1 unité = 1 pixel).
// drawZone trace le décor fixe ; drawZoneLive les parties qui bougent.

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

const DRAWERS = {
  tele: drawTele,
  "tennis-de-table": drawTennis,
};

const LIVE = {
  tele: drawTeleLive,
};

export function drawZone(ctx, zone) {
  DRAWERS[zone.id]?.(ctx, zone.x * TILE, zone.y * TILE);
}

export function drawZoneLive(ctx, zone, t, active) {
  LIVE[zone.id]?.(ctx, zone.x * TILE, zone.y * TILE, t, active);
}
