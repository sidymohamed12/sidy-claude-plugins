// La vie du bureau quand personne ne travaille : ceux qui sont au repos se
// promènent, prennent un café, discutent à deux ou jouent à la balle.
// Module sans dessin ni DOM : il décide, office.js déplace et dessine.

export const KIND = {
  WANDER: "wander",
  COFFEE: "coffee",
  CHAT: "chat",
  PLAY: "play",
  ZONE: "zone", // une activité de l'espace détente (télé, tennis de table…)
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
const RETURN_DELAY = 0.8; // secondes avant de rentrer après une zone
const ZONE_WEIGHT = 0.5; // poids d'une envie d'aller à l'espace détente

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
export function ballAt(a, b, elapsed, { period = BALL_PERIOD, arc = BALL_ARC } = {}) {
  const cycle = Math.floor(elapsed / period);
  const p = (elapsed / period) % 1;
  const [from, to] = cycle % 2 === 0 ? [a, b] : [b, a];
  return {
    x: from.x + (to.x - from.x) * p,
    y: from.y + (to.y - from.y) * p - Math.sin(p * Math.PI) * arc,
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
        !c.stays &&
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

  zoneOf(id) {
    return this.layout.zones.find((z) => z.id === id) || null;
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
    if (s.kind === KIND.ZONE) {
      const def = this.zoneOf(s.zoneId)?.def;
      if (!def) {
        return null;
      }
      return s.phase === PHASE.ACT ? def.doing(s.partnerName, s.target) : def.go;
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
      s.age += dt;
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
      zoneId: null,
      returnHome: false,
      elapsed: 0,
      age: 0, // temps passé au repos, qui ne se remet pas à zéro entre deux envies
    };
  }

  toDwell(s) {
    const { age } = s;
    Object.assign(s, this.newDwell());
    s.age = age;
  }

  tickDwell(c, s, dt, free) {
    s.timer -= dt;
    if (s.timer > 0) {
      return;
    }
    if (s.returnHome) {
      s.age = 0;
      this.startSolo(c, s, KIND.WANDER, { x: c.rest.x, y: c.rest.y });
      return;
    }
    const kind = this.pickKind(c, free);
    if (kind === KIND.ZONE) {
      this.startZone(c, s, free);
    } else if (kind === KIND.CHAT || kind === KIND.PLAY) {
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
    const weights = this.zoneChoices(c, free).length
      ? [...WEIGHTS, [KIND.ZONE, ZONE_WEIGHT]]
      : WEIGHTS;
    const options = weights.filter(([kind]) => {
      if (kind === KIND.COFFEE) {
        return !coffeeTaken;
      }
      return kind === KIND.WANDER || kind === KIND.ZONE || hasPartner;
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

  /** Places d'une zone déjà prises, ou visées, par quelqu'un. */
  takenSeats(zoneId, exceptId = null) {
    const taken = new Set();
    for (const [id, st] of this.states) {
      if (id !== exceptId && st.kind === KIND.ZONE && st.zoneId === zoneId) {
        taken.add(st.target?.seat);
      }
    }
    return taken;
  }

  /** Zones où ce personnage peut aller : assez de repos, une place libre (et un partenaire si on joue à deux). */
  zoneChoices(c, free) {
    const s = this.states.get(c.id);
    const age = s ? s.age : 0;
    return this.layout.zones.filter((z) => {
      if (age < z.def.after) {
        return false;
      }
      const used = this.takenSeats(z.id, c.id).size;
      if (z.def.group === "pair") {
        return used === 0 && this.partnerCandidates(c, free).length > 0;
      }
      if (z.def.group === "circle") {
        // on ne discute pas seul : il faut quelqu'un à entraîner
        return used === 0 && this.partnerCandidates(c, free).length > 0;
      }
      return used < z.seats.length;
    });
  }

  startZone(c, s, free) {
    const zones = this.zoneChoices(c, free);
    if (!zones.length) {
      this.startSolo(c, s, KIND.WANDER, this.wanderTarget(c, free));
      return;
    }
    const zone = zones[Math.floor(this.rng() * zones.length)];
    if (zone.def.group === "pair") {
      this.startZonePair(c, zone, free);
      return;
    }
    if (zone.def.group === "circle") {
      this.startZoneCircle(c, zone, free);
      return;
    }
    const taken = this.takenSeats(zone.id, c.id);
    const seats = zone.seats.filter((_, i) => !taken.has(i));
    const seat = seats[Math.floor(this.rng() * seats.length)];
    this.startSolo(c, s, KIND.ZONE, { ...seat, seat: zone.seats.indexOf(seat) });
    s.zoneId = zone.id;
  }

  /** Un groupe : celui qui lance la discussion entraîne un ou deux collègues. */
  startZoneCircle(c, zone, free) {
    const others = this.partnerCandidates(c, free);
    const wanted = 1 + Math.floor(this.rng() * 2); // 1 ou 2 collègues
    const guests = [];
    while (guests.length < wanted && others.length) {
      guests.push(others.splice(Math.floor(this.rng() * others.length), 1)[0]);
    }
    [c, ...guests].forEach((who, i) => {
      const st = this.states.get(who.id);
      this.startSolo(who, st, KIND.ZONE, { ...zone.seats[i], seat: i });
      st.zoneId = zone.id;
    });
  }

  startZonePair(c, zone, free) {
    const partner = this.partnerFor(c, free);
    const duo = [
      [c, partner, 0],
      [partner, c, 1],
    ];
    for (const [who, other, i] of duo) {
      const st = this.states.get(who.id);
      this.startSolo(who, st, KIND.ZONE, { ...zone.seats[i], seat: i });
      st.zoneId = zone.id;
      st.partnerId = other.id;
      st.partnerName = other.name || other.id;
      st.slot = i;
    }
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
      if (s.kind === KIND.COFFEE || s.kind === KIND.ZONE) {
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
    const range =
      s.kind === KIND.ZONE ? this.zoneOf(s.zoneId).def.duration : DURATION[s.kind];
    s.timer = random(this.rng, range);
    s.elapsed = 0;
  }

  /** Après une activité de zone, on rentre au bout d'un court instant. */
  leaveZone(s, fromZone) {
    if (fromZone) {
      s.returnHome = true;
      s.timer = RETURN_DELAY;
    }
  }

  tickAct(s, dt) {
    s.elapsed += dt;
    s.timer -= dt;
    if (s.timer > 0) {
      return;
    }
    const other = s.partnerId ? this.states.get(s.partnerId) : null;
    const fromZone = s.kind === KIND.ZONE;
    this.toDwell(s);
    this.leaveZone(s, fromZone);
    if (other) {
      this.toDwell(other);
      this.leaveZone(other, fromZone);
    }
  }
}
