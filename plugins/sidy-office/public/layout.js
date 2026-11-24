// Plan du bureau, calculé à partir de l'équipe : une rangée de 4 postes tous
// les 4 tuiles, Claude au centre de la 2e rangée, le coin pause en bas.
// Les positions sont en tuiles de 16 px.

import { ZONES, ZONE_W, ZONE_H, WALKWAY } from "./zones.js";

export const TILE = 16;
export const COLS = 24;
export const MAIN = "claude";

const FIRST_DESK_ROW = 3;
const ROW_SPACING = 4;
const DESK_XS = [2, 7, 12, 17];
const CLAUDE_DESK = { row: 1, x: 12 };
const MIN_GUEST_DESKS = 2;
const AISLES = [6, 11, 16, 21.5];
const AISLE_X = 11.5; // couloir central, passage entre travail et détente
const ZONE_X_LEFT = 1;
const ZONE_X_RIGHT = 13;

export const STATUS_INFO = {
  idle: { label: "Au repos", color: "#9AA5B5" },
  thinking: { label: "Réfléchit", color: "#5B6B82" },
  typing: { label: "Écrit du code", color: "#2E9E5B" },
  reading: { label: "Lit", color: "#2F6FEB" },
  running: { label: "Lance une commande", color: "#7A4FD8" },
  delegating: { label: "Délègue", color: "#C99A00" },
  waiting: { label: "Attend ta réponse", color: "#E07B00" },
};

export const GUEST_LOOKS = [
  { skin: "#C68A5E", hair: "#5A4632", top: "#8C97A8", pants: "#3A4558" },
  {
    skin: "#8D5A3B",
    hair: "#141414",
    top: "#B0703A",
    pants: "#3A4558",
    glasses: true,
  },
];

export const GUEST_ROLE = "Renfort";

/** Places de pause relatives au haut du coin pause (L). */
function restSpots(L, count) {
  const spots = [
    { x: 3.4, y: L + 1.55, sit: true },
    { x: 4.7, y: L + 1.55, sit: true },
    { x: 1.7, y: L + 1.9 },
    { x: 15.2, y: L + 1.9 },
    { x: 17.6, y: L + 1.9 },
    { x: 6.0, y: L + 1.55, sit: true },
    { x: 13.4, y: L + 2.2 },
    { x: 19.6, y: L + 2.2 },
    { x: 10.4, y: L + 1.6 },
  ];
  // au-delà, les agents se rangent en ligne près de la fenêtre du bas
  for (let i = spots.length; i < count; i += 1) {
    const k = i - 9;
    spots.push({ x: 9 + (k % 10) * 1.3, y: L + 2.95 });
  }
  return spots;
}

/**
 * @param memberTypes types des agents de l'équipe, dans l'ordre d'affichage
 */
/** Zones posées sur deux colonnes de part et d'autre du couloir central. */
function placeZones(zoneIds, top) {
  const gap = 0.4;
  return zoneIds.map((id, i) => {
    const def = ZONES[id];
    const x = i % 2 === 0 ? ZONE_X_LEFT : ZONE_X_RIGHT;
    const y = top + gap + Math.floor(i / 2) * (ZONE_H + gap);
    return {
      id,
      def,
      x,
      y,
      w: ZONE_W,
      h: ZONE_H,
      walkY: y + ZONE_H - WALKWAY,
      seats: def.seats.map((s) => ({
        ...s,
        x: x + s.x,
        y: y + s.y,
        zoneId: id,
        walkY: y + ZONE_H - WALKWAY,
      })),
    };
  });
}

/**
 * @param memberTypes types des agents de l'équipe, dans l'ordre d'affichage
 * @param zoneIds zones de l'espace détente (vide : pas d'espace détente)
 */
export function buildLayout(memberTypes, zoneIds = []) {
  const needed = memberTypes.length + MIN_GUEST_DESKS;
  // chaque rangée a 4 postes ; la 2e en perd un pour Claude
  const rowCount = Math.max(2, Math.ceil((needed + 1) / DESK_XS.length));
  const slots = [];
  for (let row = 0; row < rowCount; row += 1) {
    for (const x of DESK_XS) {
      if (!(row === CLAUDE_DESK.row && x === CLAUDE_DESK.x)) {
        slots.push({ x, y: FIRST_DESK_ROW + row * ROW_SPACING });
      }
    }
  }
  const lastDeskY = FIRST_DESK_ROW + (rowCount - 1) * ROW_SPACING;
  const loungeTop = lastDeskY + ROW_SPACING;
  const memberDesks = new Map(memberTypes.map((type, i) => [type, slots[i]]));
  const spots = restSpots(loungeTop, memberTypes.length);
  const rests = new Map(memberTypes.map((type, i) => [type, spots[i]]));
  const corridors = [];
  for (let row = 0; row < rowCount; row += 1) {
    corridors.push(FIRST_DESK_ROW + row * ROW_SPACING + 3);
  }
  const partitionY = loungeTop + 3.4; // mur entre le travail et la détente
  const leisureTop = loungeTop + 4;
  const zones = placeZones(zoneIds, leisureTop);
  const leisureRows = Math.ceil(zoneIds.length / 2);
  const rows = zones.length
    ? Math.ceil(leisureTop + 0.4 + leisureRows * (ZONE_H + 0.4)) + 1
    : leisureTop;
  return {
    cols: COLS,
    rows,
    loungeTop,
    partitionY,
    leisureTop,
    zones,
    aisleX: AISLE_X,
    gate: { x: AISLE_X, y: loungeTop + 3 },
    claudeDesk: {
      x: CLAUDE_DESK.x,
      y: FIRST_DESK_ROW + CLAUDE_DESK.row * ROW_SPACING,
      monitors: 2,
    },
    memberDesks,
    guestDesks: slots.slice(memberTypes.length),
    rests,
    corridors,
    aisles: AISLES,
    door: { x: AISLE_X, y: rows - 0.4 },
  };
}

export function chairOf(desk) {
  return { x: desk.x + 1.5, y: desk.y + 30 / TILE };
}

/** Zone dont le rectangle contient le point, ou null. */
export function zoneAt(layout, p) {
  return (
    layout.zones.find(
      (z) => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h,
    ) || null
  );
}

/** Le point est dans l'espace détente (sous le mur de séparation). */
export function inLeisure(layout, p) {
  return layout.zones.length > 0 && p.y > layout.partitionY;
}

/** Étapes pour sortir de l'espace détente jusqu'au passage (inclus). */
export function leisureExit(layout, from) {
  const zone = zoneAt(layout, from);
  const walkY = zone ? zone.walkY : from.y;
  const steps = [];
  if (Math.abs(from.y - walkY) > 0.01) {
    steps.push({ x: from.x, y: walkY });
  }
  if (Math.abs(from.x - layout.aisleX) > 0.01) {
    steps.push({ x: layout.aisleX, y: walkY });
  }
  steps.push(layout.gate);
  return steps;
}

/** Étapes pour rejoindre une place de zone depuis le passage. */
export function leisureEntry(layout, seat) {
  const steps = [{ x: layout.aisleX, y: seat.walkY }];
  if (Math.abs(seat.x - layout.aisleX) > 0.01) {
    steps.push({ x: seat.x, y: seat.walkY });
  }
  steps.push({ x: seat.x, y: seat.y });
  return steps;
}
