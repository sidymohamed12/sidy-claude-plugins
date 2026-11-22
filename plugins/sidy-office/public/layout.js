// Plan du bureau, calculé à partir de l'équipe : une rangée de 4 postes tous
// les 4 tuiles, Claude au centre de la 2e rangée, le coin pause en bas.
// Les positions sont en tuiles de 16 px.

export const TILE = 16;
export const COLS = 24;
export const MAIN = "claude";

const FIRST_DESK_ROW = 3;
const ROW_SPACING = 4;
const DESK_XS = [2, 7, 12, 17];
const CLAUDE_DESK = { row: 1, x: 12 };
const MIN_GUEST_DESKS = 2;
const AISLES = [6, 11, 16, 21.5];

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
export function buildLayout(memberTypes) {
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
  return {
    cols: COLS,
    rows: loungeTop + 4,
    loungeTop,
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
    door: { x: 11.5, y: loungeTop + 3.6 },
  };
}

export function chairOf(desk) {
  return { x: desk.x + 1.5, y: desk.y + 30 / TILE };
}
