// La scène du bureau : place les personnages, les fait marcher et les anime
// selon l'équipe et l'instantané envoyés par le serveur.

import {
  TILE,
  MAIN,
  STATUS_INFO,
  GUEST_LOOKS,
  buildLayout,
  chairOf,
} from "./layout.js";
import {
  drawBackground,
  drawDesk,
  drawScreen,
  drawRackLights,
  drawStanding,
  drawSittingFront,
  drawSeatedBack,
  drawEmptyChair,
  drawBubble,
  drawZzz,
  drawPlane,
  drawBall,
  CHAT_ICONS,
  SPRITE_H,
} from "./sprites.js";
import { Leisure, KIND, ballAt } from "./leisure.js";

const SPEED = 3.4; // tuiles par seconde
const ERROR_FLASH_MS = 1800;
const PLANE_DURATION = 1.1;
const IDLE = "idle";
const PLACE_DESK = "desk";
const PLACE_REST = "rest";
const PLACE_DOOR = "door";
const MAX_HEIGHT_MARGIN = 120;
const AT_SPOT = 0.05; // distance (tuiles) en deçà de laquelle on est « sur » sa place
const CHAT_TURN = 1.7; // secondes de parole avant que l'autre réponde
const LOUNGE_FLOOR = 1.3; // sous cette hauteur (depuis le haut du coin pause), on marche en ligne droite
const THROW_ARM = 0.25; // fraction du lancer pendant laquelle le bras est levé
const HAND_LIFT = 7; // hauteur des mains, en pixels, d'où part la balle

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

/** Choisit l'instance la plus parlante quand un agent tourne dans plusieurs sessions. */
function pickInstance(instances) {
  return instances.reduce((best, a) => {
    if (!best) {
      return a;
    }
    const bestActive = best.status !== IDLE;
    const aActive = a.status !== IDLE;
    if (aActive !== bestActive) {
      return aActive ? a : best;
    }
    return a.since > best.since ? a : best;
  }, null);
}

export class Office {
  constructor(canvas, { onHover } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.buffer = document.createElement("canvas");
    this.bctx = this.buffer.getContext("2d");
    this.background = document.createElement("canvas");
    this.onHover = onHover;
    this.characters = new Map();
    this.planes = [];
    this.guestSeats = new Map();
    this.lastDelegation = "";
    this.hovered = null;
    this.firstSnapshot = true;
    this.scale = 1;
    this.ratio = 1;
    this.screens = new Map();
    this.teamKey = null;
    this.leisure = null;
    this.team = { claude: null, members: [], hidden: [] };
    this.memberTypes = new Set();
    this.setTeam({
      title: "",
      claude: { type: MAIN, name: "Claude", role: "", look: GUEST_LOOKS[0] },
      members: [],
      hidden: [],
    });
    this.bindPointer();
    window.addEventListener("resize", () => this.resize());
  }

  get W() {
    return this.layout.cols * TILE;
  }

  get H() {
    return this.layout.rows * TILE;
  }

  /* ---------- équipe et plan ---------- */

  setTeam(team) {
    this.team = team;
    this.hidden = new Set(team.hidden || []);
    const types = team.members.map((m) => m.type);
    this.memberTypes = new Set(types);
    const key = types.join("|");
    const layoutChanged = key !== this.teamKey;
    if (layoutChanged) {
      this.teamKey = key;
      this.layout = buildLayout(types);
      this.buildBackground();
      this.resize();
      this.leisure = new Leisure(this.layout, {
        walk: (c, target) => this.walkInLounge(c, target),
      });
    }
    this.syncTeamCharacters(layoutChanged);
  }

  buildBackground() {
    for (const c of [this.buffer, this.background]) {
      c.width = this.W;
      c.height = this.H;
    }
    const ctx = this.background.getContext("2d");
    drawBackground(ctx, this.layout);
    this.screens = new Map();
    const { claudeDesk, memberDesks, guestDesks } = this.layout;
    this.screens.set(
      MAIN,
      drawDesk(ctx, claudeDesk.x, claudeDesk.y, claudeDesk.monitors),
    );
    for (const [type, desk] of memberDesks) {
      this.screens.set(type, drawDesk(ctx, desk.x, desk.y));
    }
    guestDesks.forEach((desk, i) => {
      this.screens.set(`guest-${i}`, drawDesk(ctx, desk.x, desk.y));
    });
    // le plan a changé : les renforts reprennent un poste libre
    this.guestSeats.clear();
  }

  memberProfile(type) {
    if (type === MAIN) {
      return this.team.claude;
    }
    return this.team.members.find((m) => m.type === type);
  }

  syncTeamCharacters(layoutChanged) {
    const wanted = [MAIN, ...this.memberTypes];
    for (const [id, c] of this.characters) {
      if (!c.guest && !wanted.includes(id)) {
        this.characters.delete(id);
      }
    }
    for (const type of wanted) {
      const profile = this.memberProfile(type);
      const desk =
        type === MAIN
          ? this.layout.claudeDesk
          : this.layout.memberDesks.get(type);
      const rest = type === MAIN ? null : this.layout.rests.get(type);
      let c = this.characters.get(type);
      if (!c) {
        const home = rest || chairOf(desk);
        c = {
          id: type,
          type,
          x: home.x,
          y: home.y,
          path: [],
          place: rest ? PLACE_REST : PLACE_DESK,
          status: IDLE,
          detail: "",
          instances: 0,
          errorAt: 0,
          walked: 0,
          guest: false,
        };
        this.characters.set(type, c);
      } else if (layoutChanged) {
        // nouveau plan : on remet chacun à sa place sans animation
        const home = c.place === PLACE_DESK || !rest ? chairOf(desk) : rest;
        c.x = home.x;
        c.y = home.y;
        c.path = [];
      }
      c.stays = Boolean(profile.stays);
      c.name = profile.name;
      c.role = profile.role;
      c.look = profile.look;
      c.desk = desk;
      c.deskKey = type;
      c.rest = rest;
    }
    if (layoutChanged) {
      // les renforts reviendront au prochain instantané, sur le nouveau plan
      for (const c of this.characters.values()) {
        if (c.guest) {
          this.characters.delete(c.id);
        }
      }
    }
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent || !this.layout) {
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    const fit = Math.min(
      parent.clientWidth / this.W,
      (window.innerHeight - MAX_HEIGHT_MARGIN) / this.H,
    );
    this.scale = Math.max(1, Math.floor(fit * 2) / 2);
    this.canvas.style.width = `${this.W * this.scale}px`;
    this.canvas.style.height = `${this.H * this.scale}px`;
    this.canvas.width = Math.round(this.W * this.scale * ratio);
    this.canvas.height = Math.round(this.H * this.scale * ratio);
    this.ratio = ratio;
  }

  bindPointer() {
    this.canvas.addEventListener("pointermove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const lx = ((e.clientX - rect.left) / rect.width) * this.W;
      const ly = ((e.clientY - rect.top) / rect.height) * this.H;
      const hit = [...this.characters.values()].find((c) => {
        const cx = c.x * TILE;
        const cy = c.y * TILE;
        return (
          lx > cx - 8 && lx < cx + 8 && ly > cy - SPRITE_H - 2 && ly < cy + 2
        );
      });
      this.setHovered(hit ? hit.id : null);
    });
    this.canvas.addEventListener("pointerleave", () => this.setHovered(null));
  }

  setHovered(id) {
    if (id === this.hovered) {
      return;
    }
    this.hovered = id;
    this.canvas.style.cursor = id ? "pointer" : "default";
    if (this.onHover) {
      this.onHover(id);
    }
  }

  highlight(id) {
    this.hovered = id;
  }

  /* ---------- état ---------- */

  update(snapshot) {
    if (snapshot.team) {
      this.setTeam(snapshot.team);
    }
    const agents = snapshot.agents.filter((a) => !this.hidden.has(a.type));
    const byType = new Map();
    for (const agent of agents) {
      const list = byType.get(agent.type) || [];
      list.push(agent);
      byType.set(agent.type, list);
    }
    this.updateTeam(byType);
    this.updateGuests(agents);
    this.watchDelegation(byType.get(MAIN));
    this.firstSnapshot = false;
  }

  updateTeam(byType) {
    for (const type of [MAIN, ...this.memberTypes]) {
      const c = this.characters.get(type);
      const instances = byType.get(type) || [];
      const agent = pickInstance(instances);
      c.instances = instances.length;
      c.status = agent ? agent.status : IDLE;
      c.detail = agent ? agent.detail : "";
      c.errorAt = agent ? agent.lastErrorAt : 0;
      c.project = agent ? agent.project : "";
      if (!c.rest) {
        continue;
      }
      const wantDesk = instances.length > 0;
      if (wantDesk && c.place !== PLACE_DESK) {
        this.leisure?.release(c.id);
        this.send(c, chairOf(c.desk), PLACE_DESK);
      } else if (!wantDesk && c.place !== PLACE_REST) {
        this.send(c, c.rest, PLACE_REST);
      }
    }
  }

  updateGuests(agents) {
    const guests = agents.filter(
      (a) => a.type !== MAIN && !this.memberTypes.has(a.type),
    );
    const present = new Set(guests.map((a) => a.key));
    for (const [key, c] of this.characters) {
      if (c.guest && !present.has(key) && c.place !== PLACE_DOOR) {
        this.send(c, this.layout.door, PLACE_DOOR);
        this.guestSeats.delete(key);
      }
    }
    for (const agent of guests) {
      let c = this.characters.get(agent.key);
      if (!c) {
        c = this.createGuest(agent);
      }
      c.status = agent.status;
      c.detail = agent.detail;
      c.errorAt = agent.lastErrorAt;
      c.project = agent.project;
      c.instances = 1;
    }
  }

  createGuest(agent) {
    const seat = this.freeGuestSeat();
    const desk = seat === null ? null : this.layout.guestDesks[seat];
    const { door } = this.layout;
    const c = {
      id: agent.key,
      type: agent.type,
      name: agent.type,
      role: "",
      look: GUEST_LOOKS[(seat || 0) % GUEST_LOOKS.length],
      desk,
      deskKey: seat === null ? null : `guest-${seat}`,
      x: door.x,
      y: door.y,
      path: [],
      place: PLACE_DOOR,
      walked: 0,
      guest: true,
    };
    if (seat !== null) {
      this.guestSeats.set(agent.key, seat);
    }
    this.characters.set(agent.key, c);
    const standing = {
      x: 12.5 + Math.random() * 6,
      y: this.layout.loungeTop + 2.4,
    };
    this.send(
      c,
      desk ? chairOf(desk) : standing,
      desk ? PLACE_DESK : PLACE_REST,
    );
    return c;
  }

  freeGuestSeat() {
    const used = new Set(this.guestSeats.values());
    const index = this.layout.guestDesks.findIndex((_, i) => !used.has(i));
    return index === -1 ? null : index;
  }

  watchDelegation(mains) {
    const main = pickInstance(mains || []);
    if (!main || main.status !== "delegating" || !main.delegateTo) {
      return;
    }
    const key = `${main.key}:${main.since}:${main.delegateTo}`;
    if (key === this.lastDelegation || this.firstSnapshot) {
      this.lastDelegation = key;
      return;
    }
    this.lastDelegation = key;
    const targetDesk = this.layout.memberDesks.get(main.delegateTo);
    const from = chairOf(this.layout.claudeDesk);
    const to = targetDesk ? chairOf(targetDesk) : this.layout.door;
    this.planes.push({
      from: { x: from.x, y: from.y - 1.4 },
      to: { x: to.x, y: to.y - 1.4 },
      t: 0,
    });
  }

  /* ---------- déplacements ---------- */

  corridorFor(y) {
    const { corridors } = this.layout;
    return (
      corridors.find((c) => c >= y - 0.01) ?? corridors[corridors.length - 1]
    );
  }

  nearestAisle(x) {
    const { aisles } = this.layout;
    return aisles.reduce(
      (best, a) => (Math.abs(a - x) < Math.abs(best - x) ? a : best),
      aisles[0],
    );
  }

  /** Chemin par les couloirs et les allées, sans traverser les bureaux. */
  planPath(from, to) {
    const c1 = this.corridorFor(from.y);
    const c2 = this.corridorFor(to.y);
    const path = [{ x: from.x, y: c1 }];
    if (c1 !== c2) {
      const aisle = this.nearestAisle((from.x + to.x) / 2);
      path.push({ x: aisle, y: c1 }, { x: aisle, y: c2 });
    }
    path.push({ x: to.x, y: c2 }, { x: to.x, y: to.y });
    return path;
  }

  send(c, target, place) {
    c.place = place;
    if (this.firstSnapshot || reducedMotion) {
      c.x = target.x;
      c.y = target.y;
      c.path = [];
      this.removeIfGone(c);
      return;
    }
    c.path = this.planPath({ x: c.x, y: c.y }, target);
  }

  /** Dans le coin pause on marche droit vers la cible ; ailleurs, par les couloirs. */
  walkInLounge(c, target) {
    const floor = this.layout.loungeTop + LOUNGE_FLOOR;
    c.path =
      c.y >= floor && target.y >= floor
        ? [{ x: target.x, y: target.y }]
        : this.planPath({ x: c.x, y: c.y }, target);
  }

  atRest(c) {
    return (
      Boolean(c.rest) && Math.hypot(c.x - c.rest.x, c.y - c.rest.y) < AT_SPOT
    );
  }

  removeIfGone(c) {
    if (c.guest && c.place === PLACE_DOOR && c.path.length === 0) {
      this.characters.delete(c.id);
    }
  }

  /* ---------- animation ---------- */

  step(dt) {
    const leisureOn = this.team.leisure !== false;
    if (this.leisure && leisureOn && !reducedMotion && !this.firstSnapshot) {
      this.leisure.update(dt, this.characters.values());
    }
    if (this.leisure && !leisureOn && this.leisure.states.size > 0) {
      this.leisure.reset(this.layout);
    }
    for (const c of this.characters.values()) {
      c.activity = this.leisure && leisureOn ? this.leisure.label(c.id) : null;
      // activités coupées (réglage « repos ») : celui qui traîne ailleurs rentre à sa place
      const mustStay = !leisureOn || c.stays;
      if (
        mustStay &&
        c.place === PLACE_REST &&
        c.rest &&
        c.path.length === 0 &&
        !this.atRest(c)
      ) {
        this.walkInLounge(c, c.rest);
      }
      let budget = SPEED * dt;
      while (budget > 0 && c.path.length) {
        const next = c.path[0];
        const dx = next.x - c.x;
        const dy = next.y - c.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= budget) {
          c.x = next.x;
          c.y = next.y;
          c.path.shift();
          budget -= dist;
          c.walked += dist;
        } else {
          c.x += (dx / dist) * budget;
          c.y += (dy / dist) * budget;
          c.dirUp = dy < -0.01;
          c.walked += budget;
          budget = 0;
        }
      }
      this.removeIfGone(c);
    }
    this.planes = this.planes.filter((p) => {
      p.t += dt / PLANE_DURATION;
      return p.t < 1;
    });
  }

  render(t) {
    const ctx = this.bctx;
    ctx.drawImage(this.background, 0, 0);
    drawRackLights(ctx, reducedMotion ? 0 : t);
    const now = Date.now();
    const seated = new Map();
    for (const c of this.characters.values()) {
      if (c.place === PLACE_DESK && c.path.length === 0 && c.deskKey) {
        seated.set(c.deskKey, c);
      }
    }
    this.drawScreensAndChairs(ctx, seated, t, now);
    const sorted = [...this.characters.values()].sort((a, b) => a.y - b.y);
    for (const c of sorted) {
      this.drawCharacter(ctx, c, t, now);
    }
    this.drawBalls(ctx);
    for (const p of this.planes) {
      const e = 1 - (1 - p.t) * (1 - p.t);
      const x = (p.from.x + (p.to.x - p.from.x) * e) * TILE;
      const y =
        (p.from.y + (p.to.y - p.from.y) * e) * TILE -
        Math.sin(p.t * Math.PI) * 18;
      drawPlane(ctx, x, y, p.to.x - p.from.x);
    }
    this.present(sorted);
  }

  drawScreensAndChairs(ctx, seated, t, now) {
    for (const [deskKey, screens] of this.screens) {
      const owner = seated.get(deskKey);
      const status = owner ? owner.status : "off";
      const flash = owner && now - owner.errorAt < ERROR_FLASH_MS;
      screens.forEach((s, i) => {
        const screenStatus =
          i === 1 && status === "delegating" ? "thinking" : status;
        drawScreen(ctx, s.x, s.y, screenStatus, t + i * 0.37, flash);
      });
    }
    const { claudeDesk, memberDesks, guestDesks } = this.layout;
    const desks = [
      [MAIN, claudeDesk],
      ...memberDesks,
      ...guestDesks.map((d, i) => [`guest-${i}`, d]),
    ];
    for (const [key, desk] of desks) {
      if (!seated.has(key)) {
        const chair = chairOf(desk);
        drawEmptyChair(ctx, chair.x * TILE, chair.y * TILE);
      }
    }
  }

  drawCharacter(ctx, c, t, now) {
    const x = c.x * TILE;
    const y = c.y * TILE;
    const tt = reducedMotion ? 0 : t;
    const blink = Math.floor((t + c.x) * 10) % 37 === 0;
    if (c.path.length > 0) {
      const step = Math.floor(c.walked * 4) % 2;
      drawStanding(ctx, x, y, c.look, {
        facing: c.dirUp ? "back" : "front",
        step,
      });
      return;
    }
    if (c.place === PLACE_DESK) {
      drawSeatedBack(ctx, x, y, c.look, c.status, tt);
      if (c.status !== IDLE) {
        // à droite de la tête, pour ne pas cacher l'écran
        drawBubble(ctx, x + 13, y - SPRITE_H + 6, c.status, tt);
      } else if (c.type === MAIN && c.instances === 0) {
        drawZzz(ctx, x, y - SPRITE_H, tt);
      }
      if (now - c.errorAt < ERROR_FLASH_MS) {
        ctx.fillStyle = "#D64545";
        ctx.fillRect(Math.round(x) + 6, Math.round(y - SPRITE_H - 4), 2, 4);
        ctx.fillRect(Math.round(x) + 6, Math.round(y - SPRITE_H + 1), 2, 1);
      }
      return;
    }
    const act = this.leisure && this.leisure.stateOf(c.id);
    if (act && act.phase === "act") {
      this.drawLeisure(ctx, c, act, x, y, t, blink);
      return;
    }
    if (c.rest && c.rest.sit && c.place === PLACE_REST && this.atRest(c)) {
      drawSittingFront(ctx, x, y, c.look, { blink });
    } else {
      drawStanding(ctx, x, y, c.look, { facing: "front", blink });
    }
  }

  /** Un personnage au repos qui discute, joue ou boit un café. */
  drawLeisure(ctx, c, act, x, y, t, blink) {
    let wave = false;
    if (act.kind === KIND.PLAY) {
      const partner = this.characters.get(act.partnerId);
      if (partner) {
        const [first, second] = act.slot === 0 ? [c, partner] : [partner, c];
        const ball = ballAt(first, second, act.elapsed);
        // le bras se lève juste avant de lancer et à la réception
        wave =
          (ball.thrower === act.slot && ball.progress < THROW_ARM) ||
          (ball.thrower !== act.slot && ball.progress > 1 - THROW_ARM);
      }
    }
    drawStanding(ctx, x, y, c.look, { facing: "front", blink, wave });
    const headY = y - SPRITE_H + 6;
    if (act.kind === KIND.COFFEE) {
      drawBubble(ctx, x + 13, headY, "coffee", t);
    } else if (act.kind === KIND.CHAT) {
      const turn = Math.floor(act.elapsed / CHAT_TURN);
      if (turn % 2 === act.slot) {
        const icon = CHAT_ICONS[Math.floor(turn / 2) % CHAT_ICONS.length];
        drawBubble(ctx, x, headY - 2, icon, t);
      }
    }
  }

  /** La balle des joueurs, dessinée une seule fois par paire (côté du premier). */
  drawBalls(ctx) {
    if (!this.leisure) {
      return;
    }
    for (const c of this.characters.values()) {
      const act = this.leisure.stateOf(c.id);
      if (!act || act.kind !== KIND.PLAY || act.phase !== "act" || act.slot !== 0) {
        continue;
      }
      const partner = this.characters.get(act.partnerId);
      if (!partner) {
        continue;
      }
      const ball = ballAt(c, partner, act.elapsed);
      drawBall(ctx, ball.x * TILE, ball.y * TILE - HAND_LIFT);
    }
  }

  present(sorted) {
    const ctx = this.ctx;
    const s = this.scale * this.ratio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.buffer, 0, 0, this.W * s, this.H * s);
    // étiquettes nettes, dessinées à pleine résolution
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const fontSize = Math.max(10, Math.round(4.2 * this.scale)) * this.ratio;
    ctx.font = `${fontSize}px "Pixelify Sans", ui-monospace, monospace`;
    for (const c of sorted) {
      const atDesk = c.place === PLACE_DESK && c.path.length === 0;
      const hovered = this.hovered === c.id;
      if (!atDesk && !hovered) {
        continue;
      }
      const label = c.instances > 1 ? `${c.name} ×${c.instances}` : c.name;
      const tx = c.x * TILE * s;
      const ty = (c.y * TILE + 3) * s;
      const width = ctx.measureText(label).width + 10 * this.ratio;
      const height = fontSize + 6 * this.ratio;
      ctx.fillStyle = hovered ? "#1A2233" : "rgba(255,255,255,0.92)";
      ctx.fillRect(tx - width / 2, ty, width, height);
      const info = STATUS_INFO[c.status] || STATUS_INFO.idle;
      ctx.fillStyle = info.color;
      ctx.fillRect(tx - width / 2, ty, 3 * this.ratio, height);
      ctx.fillStyle = hovered ? "#FFFFFF" : "#1A2233";
      ctx.fillText(label, tx + 1 * this.ratio, ty + 3 * this.ratio);
    }
  }

  start() {
    let last = performance.now();
    const loop = (nowMs) => {
      const dt = Math.min(0.1, (nowMs - last) / 1000);
      last = nowMs;
      this.step(dt);
      this.render(nowMs / 1000);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /** Personnages dans l'ordre d'affichage du panneau : Claude, l'équipe, puis les renforts. */
  characterList() {
    const order = [MAIN, ...this.memberTypes];
    const rank = (c) => {
      const i = order.indexOf(c.id);
      return i === -1 ? order.length : i;
    };
    return [...this.characters.values()].sort((a, b) => rank(a) - rank(b));
  }
}
