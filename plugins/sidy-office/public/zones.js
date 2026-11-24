// Les zones de l'espace détente : chacune est un lieu avec ses places et sa
// façon de s'en servir. Module sans dessin ni DOM (le dessin est dans
// zones-draw.js) : le plan et les activités s'appuient dessus.
//
// Coordonnées des places : en tuiles, relatives au coin haut-gauche de la zone.

/** Durée d'une activité de zone, en secondes : de 2 à 5 minutes. */
const ACTIVITY = [120, 300];

export const ZONE_W = 9.5;
export const ZONE_H = 6;
/** Couloir libre le long du bas de la zone : on y marche pour rejoindre sa place. */
export const WALKWAY = 0.7;

export const ZONES = {
  tele: {
    label: "Télé",
    group: "solo", // chacun prend une place
    duration: ACTIVITY,
    go: "Va regarder la télé",
    doing: () => "Regarde la télé",
    seats: [3.1, 4.3, 5.5, 6.7].map((x) => ({ x, y: 4.3, pose: "sit" })),
  },
  "tennis-de-table": {
    label: "Tennis de table",
    group: "pair", // deux joueurs, un de chaque côté de la table
    duration: ACTIVITY,
    go: "Va jouer au tennis de table",
    doing: (partner) => `Joue au tennis de table avec ${partner}`,
    ball: { period: 0.75, arc: 0.5 },
    seats: [
      { x: 1.6, y: 3.9, pose: "stand" },
      { x: 8.4, y: 3.9, pose: "stand" },
    ],
  },
  discussion: {
    label: "Discussion",
    group: "circle", // plusieurs agents autour d'une table, qui se répondent
    duration: ACTIVITY,
    go: "Va discuter avec les collègues",
    doing: () => "Discute en groupe",
    seats: [
      { x: 3.0, y: 3.8, pose: "chat" },
      { x: 6.4, y: 3.8, pose: "chat" },
      { x: 4.1, y: 4.8, pose: "chat" },
      { x: 5.3, y: 2.9, pose: "chat" },
    ],
  },
  dortoir: {
    label: "Dortoir",
    group: "solo",
    duration: ACTIVITY,
    go: "Va faire une sieste",
    doing: () => "Fait une sieste",
    seats: [1.4, 3.2, 5.0, 6.8].map((x) => ({ x: x + 0.8, y: 3.6, pose: "lie" })),
  },
  "salle-de-sport": {
    label: "Salle de sport",
    group: "solo",
    duration: ACTIVITY,
    go: "Va à la salle de sport",
    doing: (_, seat) => (seat.pose === "run" ? "Court sur le tapis" : "Soulève des haltères"),
    seats: [
      { x: 1.6, y: 3.2, pose: "run" },
      { x: 3.6, y: 3.2, pose: "run" },
      { x: 6.0, y: 3.9, pose: "lift" },
      { x: 7.6, y: 3.9, pose: "lift" },
    ],
  },
  piscine: {
    label: "Piscine",
    group: "solo",
    duration: ACTIVITY,
    go: "Va à la piscine",
    doing: () => "Nage",
    water: { x: 0.6, y: 1.0, w: 8.3, h: 3.9 }, // le bassin : on y nage, on n'y marche pas
    seats: [
      { x: 2.2, y: 2.9, pose: "swim" },
      { x: 4.7, y: 3.7, pose: "swim" },
      { x: 7.2, y: 2.9, pose: "swim" },
    ],
  },
  gaming: {
    label: "Gaming",
    group: "pair", // une partie à deux, manette en main, devant la télé
    duration: ACTIVITY,
    go: "Va jouer à la console",
    doing: (partner) => `Joue à la console avec ${partner}`,
    seats: [
      { x: 3.9, y: 4.2, pose: "game" },
      { x: 5.6, y: 4.2, pose: "game" },
    ],
  },
  balle: {
    label: "Jeu de balle",
    group: "pair",
    duration: ACTIVITY,
    go: "Va jouer à la balle",
    doing: (partner) => `Joue à la balle avec ${partner}`,
    ball: { period: 1.3, arc: 1.6 },
    seats: [
      { x: 2.4, y: 4.0, pose: "stand" },
      { x: 7.1, y: 4.0, pose: "stand" },
    ],
  },
};

export const ZONE_IDS = Object.keys(ZONES);

/** Zones proposées quand le réglage « zones » est absent. */
export const DEFAULT_ZONES = ZONE_IDS;

/** Garde les zones connues, sans doublon, dans l'ordre demandé. */
export function pickZones(ids) {
  if (!Array.isArray(ids)) {
    return DEFAULT_ZONES;
  }
  return [...new Set(ids)].filter((id) => Object.hasOwn(ZONES, id));
}

/** Le point est dans l'eau d'une piscine du plan. */
export function inWater(zones, p) {
  return zones.some((z) => {
    const w = z.def.water;
    return (
      w &&
      p.x >= z.x + w.x &&
      p.x <= z.x + w.x + w.w &&
      p.y >= z.y + w.y &&
      p.y <= z.y + w.y + w.h
    );
  });
}
