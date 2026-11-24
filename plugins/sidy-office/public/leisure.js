// La vie du bureau quand personne ne travaille : ceux qui sont au repos se
// promènent, prennent un café, discutent à deux ou jouent à la balle.
// Module sans dessin ni DOM : il décide, office.js déplace et dessine.

export const KIND = {
  WANDER: "wander",
  COFFEE: "coffee",
  CHAT: "chat",
  PLAY: "play",
};

const PHASE = { DWELL: "dwell", TRAVEL: "travel", ACT: "act" };

export const DWELL = [2.5, 8]; // secondes passées sans bouger entre deux envies
const DURATION = {
  [KIND.COFFEE]: [4, 6],
  [KIND.CHAT]: [6, 10],
  [KIND.PLAY]: [7, 11],
};
const TRAVEL_TIMEOUT = 14; // un partenaire qui n'arrive pas : on abandonne
const GO_HOME_CHANCE = 0.2;
const WEIGHTS = [
  [KIND.WANDER, 0.4],
  [KIND.COFFEE, 0.15],
  [KIND.CHAT, 0.25],
  [KIND.PLAY, 0.2],
];

const SPOT_STEP = 1.3;
const SPOT_X_MIN = 1.5;
const SPOT_X_MAX = 21.2; // la plante du coin droit prend la place au-delà
const SPOT_ROWS = [1.9, 2.4, 2.9]; // sous le canapé et la table haute
const PAIR_GAP = 1.5;
const PAIR_X_MAX = SPOT_X_MAX - PAIR_GAP;
const MIN_SPACING = 1.1;
const COFFEE_AT = { x: 1.5, dy: 1.6 };

export const BALL_PERIOD = 1.3; // secondes pour un aller de balle
export const BALL_ARC = 1.6; // hauteur du lob, en tuiles

const random = (rng, [min, max]) => min + rng() * (max - min);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Points où l'on peut se tenir debout dans le coin pause. */
export function walkSpots(layout) {
  const spots = [];
  for (const dy of SPOT_ROWS) {
    for (let x = SPOT_X_MIN; x <= SPOT_X_MAX + 1e-9; x += SPOT_STEP) {
      spots.push({ x: Math.round(x * 10) / 10, y: layout.loungeTop + dy });
    }
  }
  return spots;
}

export function coffeeSpot(layout) {
  return { x: COFFEE_AT.x, y: layout.loungeTop + COFFEE_AT.dy };
}

/** Deux places côte à côte pour discuter ou jouer. */
export function meetingSpots(layout, rng, avoid = []) {
  const left = walkSpots(layout).filter((s) => s.x <= PAIR_X_MAX);
  const free = left.filter(
    (s) =>
      avoid.every((p) => dist(p, s) >= MIN_SPACING) &&
      avoid.every((p) => dist(p, { x: s.x + PAIR_GAP, y: s.y }) >= MIN_SPACING),
  );
  const pool = free.length ? free : left;
  const a = pool[Math.floor(rng() * pool.length)];
  return [a, { x: a.x + PAIR_GAP, y: a.y }];
}

/** Position de la balle : elle va et vient entre a et b en décrivant un lob. */
export function ballAt(a, b, elapsed) {
  const cycle = Math.floor(elapsed / BALL_PERIOD);
  const p = (elapsed / BALL_PERIOD) % 1;
  const [from, to] = cycle % 2 === 0 ? [a, b] : [b, a];
  return {
    x: from.x + (to.x - from.x) * p,
    y: from.y + (to.y - from.y) * p - Math.sin(p * Math.PI) * BALL_ARC,
    thrower: cycle % 2,
    progress: p,
  };
}

export class Leisure {
  /**
   * @param layout plan du bureau (voir layout.js)
   * @param options.rng tirage aléatoire entre 0 et 1 (injectable pour les tests)
   * @param options.walk (personnage, cible) : lance la marche
   */
  constructor(layout, { rng = Math.random, walk } = {}) {
    this.rng = rng;
    this.walk = walk;
    this.states = new Map();
    this.reset(layout);
  }

  reset(layout) {
    this.layout = layout;
    this.states.clear();
  }

  /** Un personnage libre : de l'équipe, au repos, sans session ouverte. */
  static isFree(c) {
    return Boolean(
      !c.guest &&
        c.rest &&
        c.place === "rest" &&
        c.status === "idle" &&
        !c.instances,
    );
  }

  /** Arrête l'activité d'un personnage (et celle de son partenaire). */
  release(id) {
    const s = this.states.get(id);
    this.states.delete(id);
    if (s && s.partnerId) {
      const other = this.states.get(s.partnerId);
      if (other && other.partnerId === id) {
        this.toDwell(other);
      }
    }
  }

  stateOf(id) {
    return this.states.get(id) || null;
  }

  /** Texte affiché dans le panneau : null quand le personnage ne fait rien de particulier. */
  label(id) {
    const s = this.states.get(id);
    if (!s || s.phase === PHASE.DWELL) {
      return null;
    }
    if (s.kind === KIND.WANDER) {
      return "Se promène";
    }
    if (s.kind === KIND.COFFEE) {
      return s.phase === PHASE.ACT ? "Prend un café" : "Va prendre un café";
    }
    const verb = s.kind === KIND.CHAT ? "Discute avec" : "Joue à la balle avec";
    return `${verb} ${s.partnerName}`;
  }

  update(dt, characters) {
    const free = new Map();
    for (const c of characters) {
      if (Leisure.isFree(c)) {
        free.set(c.id, c);
      }
    }
    for (const id of [...this.states.keys()]) {
      if (!free.has(id)) {
        this.release(id);
      }
    }
    for (const c of free.values()) {
      if (!this.states.has(c.id)) {
        this.states.set(c.id, this.newDwell());
      }
    }
    for (const c of free.values()) {
      const s = this.states.get(c.id);
      if (!s) {
        continue;
      }
      if (s.phase === PHASE.DWELL) {
        this.tickDwell(c, s, dt, free);
      } else if (s.phase === PHASE.TRAVEL) {
        this.tickTravel(c, s, dt, free);
      } else {
        this.tickAct(s, dt);
      }
    }
  }

  newDwell() {
    return {
      phase: PHASE.DWELL,
      kind: null,
      timer: random(this.rng, DWELL),
      partnerId: null,
      partnerName: "",
      slot: 0,
      target: null,
      actStart: 0,
      elapsed: 0,
    };
  }

  toDwell(s) {
    Object.assign(s, this.newDwell());
  }

  tickDwell(c, s, dt, free) {
    s.timer -= dt;
    if (s.timer > 0) {
      return;
    }
    const kind = this.pickKind(c, free);
    if (kind === KIND.CHAT || kind === KIND.PLAY) {
      this.startPair(c, kind, free);
    } else if (kind === KIND.COFFEE) {
      this.startSolo(c, s, kind, coffeeSpot(this.layout));
    } else {
      this.startSolo(c, s, KIND.WANDER, this.wanderTarget(c, free));
    }
  }

  pickKind(c, free) {
    const hasPartner = this.partnerCandidates(c, free).length > 0;
    const coffeeTaken = [...this.states.values()].some(
      (x) => x.kind === KIND.COFFEE && x.phase !== PHASE.DWELL,
    );
    const options = WEIGHTS.filter(([kind]) => {
      if (kind === KIND.COFFEE) {
        return !coffeeTaken;
      }
      return kind === KIND.WANDER || hasPartner;
    });
    const total = options.reduce((sum, [, w]) => sum + w, 0);
    let roll = this.rng() * total;
    for (const [kind, w] of options) {
      roll -= w;
      if (roll < 0) {
        return kind;
      }
    }
    return KIND.WANDER;
  }

  /** Les autres personnages libres, qui ne font rien pour l'instant. */
  partnerCandidates(c, free) {
    return [...free.values()].filter((o) => {
      const s = this.states.get(o.id);
      return o.id !== c.id && s && s.phase === PHASE.DWELL;
    });
  }

  partnerFor(c, free) {
    const options = this.partnerCandidates(c, free);
    return options.length
      ? options[Math.floor(this.rng() * options.length)]
      : null;
  }

  /** Où se tiennent les autres, ou où ils vont : on évite de s'y poser. */
  occupied(free, exceptIds) {
    const spots = [];
    for (const o of free.values()) {
      if (exceptIds.includes(o.id)) {
        continue;
      }
      spots.push({ x: o.x, y: o.y });
      const target = this.states.get(o.id)?.target;
      if (target) {
        spots.push(target);
      }
    }
    return spots;
  }

  wanderTarget(c, free) {
    if (this.rng() < GO_HOME_CHANCE) {
      return { x: c.rest.x, y: c.rest.y };
    }
    const others = this.occupied(free, [c.id]);
    const spots = walkSpots(this.layout);
    const apart = spots.filter(
      (sp) => others.every((o) => dist(o, sp) >= MIN_SPACING) && dist(c, sp) > 2,
    );
    const pool = apart.length ? apart : spots;
    return pool[Math.floor(this.rng() * pool.length)];
  }

  startSolo(c, s, kind, target) {
    s.phase = PHASE.TRAVEL;
    s.kind = kind;
    s.target = target;
    s.timer = TRAVEL_TIMEOUT;
    this.walk?.(c, target);
  }

  startPair(c, kind, free) {
    const partner = this.partnerFor(c, free);
    if (!partner) {
      this.startSolo(c, this.states.get(c.id), KIND.WANDER, this.wanderTarget(c, free));
      return;
    }
    const others = this.occupied(free, [c.id, partner.id]);
    const [first, second] = meetingSpots(this.layout, this.rng, others);
    const duo = [
      [c, partner, first, 0],
      [partner, c, second, 1],
    ];
    for (const [who, other, spot, slot] of duo) {
      const st = this.states.get(who.id);
      st.phase = PHASE.TRAVEL;
      st.kind = kind;
      st.target = spot;
      st.timer = TRAVEL_TIMEOUT;
      st.partnerId = other.id;
      st.partnerName = other.name || other.id;
      st.slot = slot;
      this.walk?.(who, spot);
    }
  }

  tickTravel(c, s, dt, free) {
    s.timer -= dt;
    const arrived = c.path.length === 0;
    if (s.partnerId) {
      const other = this.states.get(s.partnerId);
      const partnerChar = free.get(s.partnerId);
      if (!other || !partnerChar || other.partnerId !== c.id) {
        this.toDwell(s);
        return;
      }
      if (s.timer <= 0) {
        this.toDwell(s);
        this.toDwell(other);
        return;
      }
      if (arrived && other.phase === PHASE.TRAVEL && partnerChar.path.length === 0) {
        this.beginAct(s);
        this.beginAct(other);
      }
      return;
    }
    if (arrived) {
      if (s.kind === KIND.COFFEE) {
        this.beginAct(s);
      } else {
        this.toDwell(s);
      }
    } else if (s.timer <= 0) {
      this.toDwell(s);
    }
  }

  beginAct(s) {
    s.phase = PHASE.ACT;
    s.timer = random(this.rng, DURATION[s.kind]);
    s.elapsed = 0;
  }

  tickAct(s, dt) {
    s.elapsed += dt;
    s.timer -= dt;
    if (s.timer > 0) {
      return;
    }
    const other = s.partnerId ? this.states.get(s.partnerId) : null;
    this.toDwell(s);
    if (other) {
      this.toDwell(other);
    }
  }
}
