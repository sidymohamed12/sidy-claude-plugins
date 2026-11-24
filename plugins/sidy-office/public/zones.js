// Les zones de l'espace détente : chacune est un lieu avec ses places et sa
// façon de s'en servir. Module sans dessin ni DOM (le dessin est dans
// zones-draw.js) : le plan et les activités s'appuient dessus.
//
// Coordonnées des places : en tuiles, relatives au coin haut-gauche de la zone.

export const ZONE_W = 9.5;
export const ZONE_H = 6;
/** Couloir libre le long du bas de la zone : on y marche pour rejoindre sa place. */
export const WALKWAY = 0.7;

export const ZONES = {
  tele: {
    label: "Télé",
    group: "solo", // chacun prend une place
    after: 12, // secondes de repos avant d'avoir envie d'y aller
    duration: [14, 26],
    go: "Va regarder la télé",
    doing: () => "Regarde la télé",
    seats: [3.1, 4.3, 5.5, 6.7].map((x) => ({ x, y: 4.3, pose: "sit" })),
  },
  "tennis-de-table": {
    label: "Tennis de table",
    group: "pair", // deux joueurs, un de chaque côté de la table
    after: 15,
    duration: [12, 18],
    go: "Va jouer au tennis de table",
    doing: (partner) => `Joue au tennis de table avec ${partner}`,
    ball: { period: 0.75, arc: 0.5 },
    seats: [
      { x: 1.6, y: 3.9, pose: "stand" },
      { x: 8.4, y: 3.9, pose: "stand" },
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
