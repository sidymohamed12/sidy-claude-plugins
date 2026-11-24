// Plan du bureau, calculé à partir de l'équipe : une rangée de 4 postes tous
// les 4 tuiles, Claude au centre de la 2e rangée, le coin pause en bas.
// Les positions sont en tuiles de 16 px.

import { ZONES, ZONE_W, ZONE_H, WALKWAY } from "./zones.js";

export const TILE = 16;
export const COLS = 24;
export const MAIN = "claude";

const FIRST_DESK_ROW = 3;
const ROW_SPACING = 4;
const MEETING_XS = [12, 17]; // postes remplacés par la salle de réunion
const MAX_ROW_SPACING = 5.5; // au-delà, les postes paraîtraient perdus
const FILL_ROW_SPACING = 4.6; // écart visé quand on ajoute des rangées pour remplir la hauteur
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

/** Zones posées en colonnes (une abscisse par colonne), de haut en bas à partir de `top`. */
function placeZones(zoneIds, top, xs, gap = 0.4) {
  return zoneIds.map((id, i) => {
    const def = ZONES[id];
    const x = xs[i % xs.length];
    const y = top + gap + Math.floor(i / xs.length) * (ZONE_H + gap);
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

/** Places de repos : au pied des zones quand il y en a (les agents au repos vivent dans la détente). */
function leisureRests(zones, count) {
  return Array.from({ length: count }, (_, i) => {
    const zone = zones[i % zones.length];
    const slot = Math.floor(i / zones.length);
    return {
      x: zone.x + 1.2 + (slot * 1.6) % (zone.w - 2.4),
      y: zone.walkY,
    };
  });
}

const DECOR_WALL = 3; // mur du fond de la détente, où sont accrochés les tableaux (en tuiles)
const WALL = 1; // épaisseur du mur entre travail et détente (en tuiles, entière pour que rien ne reste sans sol)

/** Dimensions et passages de l'espace détente, dessous (écran étroit) ou à droite du travail. */
/** Écart vertical entre les rangées de zones pour occuper `rows` tuiles de haut (au moins l'écart normal). */
function spreadGap(rows, top, zoneRows) {
  const free = rows - 0.6 - top - zoneRows * ZONE_H;
  return Math.max(0.4, free / (zoneRows + 1));
}

function leisureSpace({
  zoneIds,
  side,
  loungeTop,
  workRows,
  columns: wantedColumns,
  minRows = 0,
  minCols = 0,
}) {
  if (zoneIds.length === 0) {
    return {
      zones: [],
      cols: COLS,
      rows: Math.max(workRows, minRows),
      top: workRows,
      minX: 0,
      partitionY: loungeTop + 3.4,
      aisleX: AISLE_X,
      gate: { x: AISLE_X, y: loungeTop + 3 },
      spineGate: { x: AISLE_X, y: workRows },
    };
  }
  const height = 0.4 + Math.ceil(zoneIds.length / 2) * (ZONE_H + 0.4);
  if (!side) {
    const top = loungeTop + 4;
    const zonesTop = top + DECOR_WALL; // sous le mur décoré
    const rows = Math.max(Math.ceil(zonesTop + height + 0.6), minRows);
    const zoneRows = Math.ceil(zoneIds.length / 2);
    return {
      zones: placeZones(
        zoneIds,
        zonesTop,
        [ZONE_X_LEFT, ZONE_X_RIGHT],
        spreadGap(rows, zonesTop, zoneRows),
      ),
      decorWall: { x0: 0, x1: COLS, y: top, opening: AISLE_X },
      cols: COLS,
      rows,
      top,
      minX: 0,
      partitionY: loungeTop + 3.4,
      aisleX: AISLE_X,
      gate: { x: AISLE_X, y: loungeTop + 3 },
      spineGate: { x: AISLE_X, y: zonesTop + 0.2 },
    };
  }
  // à droite : un couloir le long du mur, puis des colonnes de zones. Le nombre
  // de rangées est celui qui donne une hauteur proche de celle du travail.
  const x0 = COLS + WALL;
  const spineX = x0 + 0.5;
  const rowsFor = (r) => DECOR_WALL + 0.4 + r * (ZONE_H + 0.4);
  // pour r rangées voulues : autant de colonnes qu'il faut, donc le nombre de rangées réellement posées
  const usedRows = (r) => Math.ceil(zoneIds.length / Math.ceil(zoneIds.length / r));
  let bestRows = 1;
  for (let r = 2; r <= zoneIds.length; r += 1) {
    const gap = (n) => Math.abs(rowsFor(usedRows(n)) - workRows);
    if (gap(r) < gap(bestRows)) {
      bestRows = r;
    }
  }
  if (wantedColumns) {
    bestRows = Math.ceil(zoneIds.length / Math.min(wantedColumns, zoneIds.length));
  }
  const columns = Math.ceil(zoneIds.length / bestRows);
  const zoneRows = usedRows(bestRows);
  const baseCols = Math.ceil(x0 + 1.5 + columns * (ZONE_W + 0.4) + 0.1);
  const cols = Math.max(baseCols, minCols);
  // place en plus sur la largeur : répartie entre les colonnes de zones
  const extra = (cols - baseCols) / (columns + 1);
  const xs = Array.from(
    { length: columns },
    (_, c) => x0 + 1.5 + extra + c * (ZONE_W + 0.4 + extra),
  );
  const rows = Math.max(
    Math.ceil(Math.max(workRows, rowsFor(zoneRows) + 0.5)),
    minRows,
  );
  const gateY = loungeTop + 2.4;
  return {
    zones: placeZones(zoneIds, DECOR_WALL, xs, spreadGap(rows, DECOR_WALL, zoneRows)),
    decorWall: { x0: x0, x1: cols, y: 0, opening: null },
    cols,
    rows,
    top: 0,
    minX: COLS,
    partitionY: 0,
    aisleX: spineX,
    gate: { x: COLS - 1.4, y: gateY },
    spineGate: { x: spineX, y: gateY },
  };
}

/**
 * Postes, couloirs et coin pause de l'espace travail.
 * @param spacing écart entre deux rangées de postes, en tuiles
 * @param loungeTop haut du coin pause (null : juste sous la dernière rangée)
 */
function workArea(rowCount, spacing, loungeTop) {
  const slots = [];
  const corridors = [];
  const meetingRow = rowCount - 1; // la salle de réunion prend la place de deux postes de la dernière rangée
  for (let row = 0; row < rowCount; row += 1) {
    const y = FIRST_DESK_ROW + row * spacing;
    for (const x of DESK_XS) {
      const claude = row === CLAUDE_DESK.row && x === CLAUDE_DESK.x;
      const meeting = row === meetingRow && MEETING_XS.includes(x);
      if (!claude && !meeting) {
        slots.push({ x, y });
      }
    }
    corridors.push(y + 3);
  }
  const lastY = FIRST_DESK_ROW + meetingRow * spacing;
  const top = loungeTop ?? FIRST_DESK_ROW + rowCount * spacing;
  return {
    slots,
    corridors,
    meeting: { x: MEETING_XS[0] - 0.4, y: lastY - 0.8, w: 9, h: 3.4 },
    loungeTop: top,
    rows: top + 4,
    claudeY: FIRST_DESK_ROW + CLAUDE_DESK.row * spacing,
  };
}

/**
 * @param memberTypes types des agents de l'équipe, dans l'ordre d'affichage
 * @param zoneIds zones de l'espace détente (vide : pas d'espace détente)
 * @param options.horizontal la détente à droite du travail (grands écrans) au lieu de dessous
 * @param options.columns à droite : nombre de colonnes de zones (par défaut, la hauteur suit celle du travail)
 * @param options.minRows / options.minCols taille minimale du plan, pour occuper tout l'écran
 */
export function buildLayout(
  memberTypes,
  zoneIds = [],
  { horizontal = false, columns, minRows, minCols } = {},
) {
  const needed = memberTypes.length + MIN_GUEST_DESKS;
  // chaque rangée a 4 postes ; la 2e en perd un pour Claude, la dernière deux pour la salle de réunion
  const rowCount = Math.max(
    2,
    Math.ceil((needed + 1 + MEETING_XS.length) / DESK_XS.length),
  );
  let work = workArea(rowCount, ROW_SPACING, null);
  const side = horizontal && zoneIds.length > 0;
  const spaces = leisureSpace({
    zoneIds,
    side,
    loungeTop: work.loungeTop,
    workRows: work.rows,
    columns,
    minRows,
    minCols,
  });
  // L'espace travail occupe toute la hauteur (détente à droite, ou pas de détente) :
  // s'il reste de la place, les rangées de postes s'écartent et le coin pause descend en bas.
  const workFillsHeight = side || zoneIds.length === 0;
  if (workFillsHeight && spaces.rows > work.rows) {
    // assez de place : des rangées de postes en plus (pour les renforts), puis on les répartit
    const room = spaces.rows - 4 - FIRST_DESK_ROW;
    const rowsThatFit = Math.max(rowCount, Math.round(room / FILL_ROW_SPACING));
    const spacing = Math.min(MAX_ROW_SPACING, room / rowsThatFit);
    work = workArea(rowsThatFit, spacing, spaces.rows - 4);
    if (side) {
      const gateY = work.loungeTop + 2.4;
      spaces.gate = { ...spaces.gate, y: gateY };
      spaces.spineGate = { ...spaces.spineGate, y: gateY };
    } else {
      spaces.partitionY = work.loungeTop + 3.4;
      spaces.gate = { ...spaces.gate, y: work.loungeTop + 3 };
    }
  }
  const { slots, loungeTop, corridors } = work;
  const memberDesks = new Map(memberTypes.map((type, i) => [type, slots[i]]));
  const spots = restSpots(loungeTop, memberTypes.length);
  const rests = spaces.zones.length
    ? new Map(
        memberTypes.map((type, i) => [
          type,
          leisureRests(spaces.zones, memberTypes.length)[i],
        ]),
      )
    : new Map(memberTypes.map((type, i) => [type, spots[i]]));
  return {
    horizontal: side,
    cols: spaces.cols,
    workCols: COLS,
    rows: spaces.rows,
    loungeTop,
    partitionY: spaces.partitionY,
    leisureTop: spaces.top,
    leisureMinX: spaces.minX,
    zones: spaces.zones,
    aisleX: spaces.aisleX,
    gate: spaces.gate,
    spineGate: spaces.spineGate,
    claudeDesk: {
      x: CLAUDE_DESK.x,
      y: work.claudeY,
      monitors: 2,
    },
    memberDesks,
    guestDesks: slots.slice(memberTypes.length),
    rests,
    corridors,
    aisles: AISLES,
    meeting: work.meeting,
    decorWall: spaces.decorWall || null,
    door: { x: AISLE_X, y: spaces.rows - 0.4 },
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
  return (
    layout.zones.length > 0 && p.y > layout.partitionY && p.x > layout.leisureMinX
  );
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
  steps.push(layout.spineGate, layout.gate);
  return steps;
}

/** Étapes pour rejoindre une place de zone depuis le passage. */
export function leisureEntry(layout, seat) {
  const steps = [layout.spineGate, { x: layout.aisleX, y: seat.walkY }];
  if (Math.abs(seat.x - layout.aisleX) > 0.01) {
    steps.push({ x: seat.x, y: seat.walkY });
  }
  steps.push({ x: seat.x, y: seat.y });
  return steps;
}

/**
 * Trajet entre deux points de l'espace détente, sans repasser par le passage :
 * on rejoint le couloir de sa zone, on longe le couloir central si besoin, puis
 * le couloir de la zone d'arrivée.
 */
export function leisureRoute(layout, from, to) {
  const walkOf = (p) => {
    const zone = zoneAt(layout, p);
    return zone ? zone.walkY : p.y;
  };
  const fromWalk = walkOf(from);
  const toWalk = walkOf(to);
  const steps = [];
  if (Math.abs(from.y - fromWalk) > 0.01) {
    steps.push({ x: from.x, y: fromWalk });
  }
  const sameZone = zoneAt(layout, from) === zoneAt(layout, to) && zoneAt(layout, to);
  if (!sameZone && Math.abs(fromWalk - toWalk) > 0.01) {
    steps.push({ x: layout.aisleX, y: fromWalk }, { x: layout.aisleX, y: toWalk });
  }
  steps.push({ x: to.x, y: toWalk }, { x: to.x, y: to.y });
  return steps;
}

/** Une allée verticale entre y1 et y2 traverserait la salle de réunion. */
export function crossesMeeting(layout, x, y1, y2) {
  const m = layout.meeting;
  if (!m) {
    return false;
  }
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);
  return x > m.x && x < m.x + m.w && bottom > m.y && top < m.y + m.h;
}
