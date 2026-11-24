"use strict";

const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const PUBLIC = path.join(__dirname, "..", "public");
const { ZONE_IDS: SERVER_ZONE_IDS, buildTeam, configWarnings } = require("../server/team.js");
let Z; // zones.js
let LAYOUT; // layout.js
let L; // leisure.js

before(async () => {
  Z = await import(pathToFileURL(path.join(PUBLIC, "zones.js")));
  LAYOUT = await import(pathToFileURL(path.join(PUBLIC, "layout.js")));
  L = await import(pathToFileURL(path.join(PUBLIC, "leisure.js")));
});

/** Tirage pseudo-aléatoire reproductible. */
function lcg(seed) {
  let x = seed;
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
}

function makeChar(id, x, y) {
  return {
    id,
    name: id,
    x,
    y,
    path: [],
    place: "rest",
    status: "idle",
    instances: 0,
    guest: false,
    rest: { x, y },
  };
}

const STEP = 0.5; // secondes par pas : les activités durent plusieurs minutes

/** Monde de test : la marche est instantanée, le temps avance par pas de 0,1 s. */
function world(zoneIds, ...ids) {
  const layout = LAYOUT.buildLayout(["a", "b", "c", "d"], zoneIds);
  const chars = ids.map((id, i) => makeChar(id, 3 + i * 1.5, layout.loungeTop + 2));
  const leisure = new L.Leisure(layout, {
    rng: lcg(7),
    walk: (c, target) => {
      c.path = [target];
    },
  });
  const tick = () => {
    for (const c of chars) {
      if (c.path.length) {
        c.x = c.path[0].x;
        c.y = c.path[0].y;
        c.path = [];
      }
    }
    leisure.update(STEP, chars);
  };
  const run = (seconds) => {
    for (let t = 0; t < seconds - 1e-9; t += STEP) {
      tick();
    }
  };
  return { layout, chars, leisure, run };
}

describe("registre des zones", () => {
  test("le serveur connaît les mêmes zones que la page", () => {
    assert.deepEqual([...SERVER_ZONE_IDS].sort(), [...Z.ZONE_IDS].sort());
  });

  test("pickZones : défaut = toutes, liste vide = aucune, inconnues et doublons écartés", () => {
    assert.deepEqual(Z.pickZones(undefined), Z.ZONE_IDS);
    assert.deepEqual(Z.pickZones([]), []);
    assert.deepEqual(Z.pickZones(["tele", "plage", "tele"]), ["tele"]);
    assert.deepEqual(Z.pickZones("tele"), Z.ZONE_IDS);
  });

  test("chaque place reste dans sa zone et au-dessus du couloir de marche", () => {
    for (const [id, def] of Object.entries(Z.ZONES)) {
      assert.ok(def.seats.length >= 1, id);
      for (const s of def.seats) {
        assert.ok(s.x > 0 && s.x < Z.ZONE_W, `${id} x ${s.x}`);
        assert.ok(s.y > 0 && s.y <= Z.ZONE_H - Z.WALKWAY, `${id} y ${s.y}`);
      }
      if (def.group === "pair") {
        assert.equal(def.seats.length, 2, id);
      }
    }
  });
});

describe("plan avec espace détente", () => {
  test("sans zone, le plan est celui d'avant : pas de détente, porte dans le mur du bas", () => {
    const layout = LAYOUT.buildLayout(["a", "b"]);
    assert.equal(layout.zones.length, 0);
    assert.equal(layout.rows, layout.loungeTop + 4);
    assert.equal(layout.door.y, layout.loungeTop + 3.6);
    assert.equal(LAYOUT.inLeisure(layout, { x: 5, y: layout.rows - 1 }), false);
  });

  test("avec des zones, la détente est sous le mur et la porte tout en bas", () => {
    const layout = LAYOUT.buildLayout(["a", "b"], ["tele", "tennis-de-table"]);
    assert.equal(layout.zones.length, 2);
    assert.ok(layout.rows > layout.loungeTop + 4 + Z.ZONE_H);
    assert.equal(layout.door.y, layout.rows - 0.4);
    assert.ok(layout.gate.y < layout.partitionY);
    for (const z of layout.zones) {
      assert.ok(z.y >= layout.leisureTop);
      assert.ok(z.y + z.h < layout.rows - 0.6, "la zone ne touche pas le mur du bas");
      // le couloir central reste libre
      assert.ok(z.x + z.w <= layout.aisleX - 1 || z.x >= layout.aisleX + 1);
      for (const s of z.seats) {
        assert.ok(s.x >= z.x && s.x <= z.x + z.w);
        assert.ok(s.y < z.walkY);
        assert.equal(s.zoneId, z.id);
      }
    }
  });

  test("les zones se rangent par deux sur autant de rangées que nécessaire", () => {
    const one = LAYOUT.buildLayout([], ["tele"]);
    const two = LAYOUT.buildLayout([], ["tele", "tennis-de-table"]);
    const three = LAYOUT.buildLayout([], ["tele", "tennis-de-table", "tele"]);
    assert.equal(one.rows, two.rows);
    assert.ok(three.rows > two.rows);
    assert.ok(two.zones[0].x < two.aisleX && two.zones[1].x > two.aisleX);
  });

  test("sortir d'une zone passe par le couloir central jusqu'au passage", () => {
    const layout = LAYOUT.buildLayout(["a"], ["tele", "tennis-de-table"]);
    const seat = layout.zones[1].seats[1];
    const out = LAYOUT.leisureExit(layout, { x: seat.x, y: seat.y });
    assert.deepEqual(out.at(-1), layout.gate);
    assert.ok(out.some((p) => p.x === layout.aisleX && p.y === seat.walkY));
    // aucune étape ne traverse un mur : on reste dans la zone ou dans le couloir
    for (const p of out.slice(0, -1)) {
      assert.ok(p.y >= layout.leisureTop);
    }
  });

  test("rejoindre une place : couloir central, puis couloir de la zone, puis la place", () => {
    const layout = LAYOUT.buildLayout(["a"], ["tele"]);
    const seat = layout.zones[0].seats[0];
    const entry = LAYOUT.leisureEntry(layout, seat);
    assert.deepEqual(entry[0], layout.spineGate);
    assert.deepEqual(entry[1], { x: layout.aisleX, y: seat.walkY });
    assert.deepEqual(entry.at(-1), { x: seat.x, y: seat.y });
  });
});

describe("espace détente à côté du travail (grands écrans)", () => {
  const team = ["a", "b", "c", "d", "e"];

  test("la détente est à droite du mur, le passage relie le coin pause au couloir de la détente", () => {
    const layout = LAYOUT.buildLayout(team, Z.ZONE_IDS, { horizontal: true });
    assert.equal(layout.horizontal, true);
    assert.ok(layout.cols > layout.workCols * 1.5, "plan élargi");
    assert.ok(layout.gate.x < layout.workCols, "le passage commence côté travail");
    assert.ok(layout.spineGate.x > layout.workCols, "et finit côté détente");
    assert.equal(layout.gate.y, layout.spineGate.y);
    assert.ok(layout.gate.y >= layout.loungeTop + 1.3, "à hauteur du coin pause");
    for (const z of layout.zones) {
      assert.ok(z.x > layout.workCols + 1, `zone ${z.id} derrière le mur`);
      assert.ok(z.x + z.w <= layout.cols);
      assert.ok(z.y + z.h <= layout.rows);
    }
    assert.ok(layout.door.x < layout.workCols, "la porte des renforts reste côté travail");
  });

  test("le point est dans la détente seulement à droite du mur", () => {
    const layout = LAYOUT.buildLayout(team, Z.ZONE_IDS, { horizontal: true });
    assert.equal(LAYOUT.inLeisure(layout, layout.zones[0].seats[0]), true);
    assert.equal(LAYOUT.inLeisure(layout, { x: 5, y: layout.rows - 2 }), false);
    assert.equal(LAYOUT.inLeisure(layout, layout.gate), false);
  });

  test("sortir d'une zone mène au passage, en passant par le couloir le long du mur", () => {
    const layout = LAYOUT.buildLayout(team, Z.ZONE_IDS, { horizontal: true });
    const seat = layout.zones.at(-1).seats[0];
    const out = LAYOUT.leisureExit(layout, { x: seat.x, y: seat.y });
    assert.deepEqual(out.at(-2), layout.spineGate);
    assert.deepEqual(out.at(-1), layout.gate);
    assert.ok(out.some((p) => p.x === layout.aisleX));
  });

  test("la hauteur de la détente suit celle du travail : pas de grande bande vide", () => {
    for (const members of [["a"], team, [...team, "f", "g", "h", "i", "j"]]) {
      const layout = LAYOUT.buildLayout(members, Z.ZONE_IDS, { horizontal: true });
      const lowest = Math.max(...layout.zones.map((z) => z.y + z.h));
      assert.ok(layout.rows - lowest <= 7, `${members.length} agents : ${layout.rows - lowest} tuiles vides`);
    }
  });

  test("sans zone, l'orientation horizontale est ignorée", () => {
    const layout = LAYOUT.buildLayout(team, [], { horizontal: true });
    assert.equal(layout.horizontal, false);
    assert.equal(layout.cols, layout.workCols);
  });
});

describe("le plan s'étire pour remplir l'écran", () => {
  const team = ["a", "b", "c", "d", "e"];

  for (const horizontal of [false, true]) {
    test(`plus haut (${horizontal ? "détente à droite" : "détente dessous"}) : les zones s'écartent sans sortir du plan`, () => {
      const base = LAYOUT.buildLayout(team, Z.ZONE_IDS, { horizontal });
      const tall = LAYOUT.buildLayout(team, Z.ZONE_IDS, { horizontal, minRows: base.rows + 8 });
      assert.equal(tall.rows, base.rows + 8);
      assert.equal(tall.cols, base.cols);
      const lowest = Math.max(...tall.zones.map((z) => z.y + z.h));
      assert.ok(lowest < tall.rows - 0.6, "au-dessus du mur du bas");
      assert.ok(lowest > Math.max(...base.zones.map((z) => z.y + z.h)), "les zones descendent");
      assert.equal(tall.door.y, tall.rows - 0.4);
    });
  }

  test("plus large (détente à droite) : les colonnes de zones se répartissent sans se chevaucher", () => {
    const base = LAYOUT.buildLayout(team, Z.ZONE_IDS, { horizontal: true });
    const wide = LAYOUT.buildLayout(team, Z.ZONE_IDS, { horizontal: true, minCols: base.cols + 10 });
    assert.equal(wide.cols, base.cols + 10);
    const xs = [...new Set(wide.zones.map((z) => z.x))].sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i += 1) {
      assert.ok(xs[i] - xs[i - 1] >= Z.ZONE_W + 0.4);
    }
    assert.ok(xs.at(-1) + Z.ZONE_W <= wide.cols);
    assert.ok(xs[0] > wide.workCols + 1);
  });

  test("nombre de colonnes imposé à droite : 1, 2 ou 3", () => {
    for (const columns of [1, 2, 3]) {
      const layout = LAYOUT.buildLayout(team, Z.ZONE_IDS, { horizontal: true, columns });
      assert.equal(new Set(layout.zones.map((z) => z.x)).size, columns);
    }
  });
});

describe("trajets dans la détente", () => {
  for (const horizontal of [false, true]) {
    test(`d'une zone à l'autre, on ne repasse jamais par le passage (${horizontal ? "à droite" : "dessous"})`, () => {
      const layout = LAYOUT.buildLayout(["a", "b"], Z.ZONE_IDS, { horizontal });
      const spots = layout.zones.flatMap((z) => z.seats);
      for (const from of spots) {
        for (const to of spots) {
          const route = LAYOUT.leisureRoute(layout, from, to);
          assert.deepEqual(route.at(-1), { x: to.x, y: to.y });
          for (const p of route) {
            assert.equal(LAYOUT.inLeisure(layout, p), true, `${JSON.stringify(p)} hors de la détente`);
            assert.notDeepEqual(p, layout.gate);
          }
        }
      }
    });
  }

  test("dans la même zone, on longe son couloir sans passer par le couloir central", () => {
    const layout = LAYOUT.buildLayout(["a"], ["tele"], { horizontal: true });
    const [a, b] = layout.zones[0].seats;
    const route = LAYOUT.leisureRoute(layout, a, b);
    assert.ok(route.every((p) => p.x !== layout.aisleX));
  });
});

describe("la salle de travail occupe toute la hauteur", () => {
  test("détente à droite et plan étiré : les postes s'écartent et le coin pause descend en bas", () => {
    const team = ["a", "b", "c", "d", "e"];
    const base = LAYOUT.buildLayout(team, Z.ZONE_IDS, { horizontal: true });
    const tall = LAYOUT.buildLayout(team, Z.ZONE_IDS, { horizontal: true, minRows: base.rows + 8 });
    assert.equal(tall.loungeTop, tall.rows - 4, "coin pause en bas");
    const ys = [...new Set([...tall.memberDesks.values()].map((d) => d.y))].sort((a, b) => a - b);
    const baseYs = [...new Set([...base.memberDesks.values()].map((d) => d.y))].sort((a, b) => a - b);
    assert.ok(ys[1] - ys[0] > baseYs[1] - baseYs[0], "rangées plus espacées");
    assert.ok(ys[1] - ys[0] <= 5.5);
    assert.equal(tall.gate.y, tall.loungeTop + 2.4);
    assert.equal(tall.spineGate.y, tall.gate.y);
    assert.ok(tall.claudeDesk.y > base.claudeDesk.y);
  });
});

describe("au repos, on vit dans la détente", () => {
  test("avec des zones, les places de repos sont dans l'espace détente, au pied des zones", () => {
    for (const horizontal of [false, true]) {
      const layout = LAYOUT.buildLayout(["a", "b", "c", "d", "e", "f", "g"], Z.ZONE_IDS, { horizontal });
      for (const rest of layout.rests.values()) {
        assert.equal(LAYOUT.inLeisure(layout, rest), true, JSON.stringify(rest));
        assert.ok(layout.zones.some((z) => rest.y === z.walkY && rest.x > z.x && rest.x < z.x + z.w));
      }
    }
  });

  test("sans zone, le repos reste dans le coin pause", () => {
    const layout = LAYOUT.buildLayout(["a", "b"]);
    for (const rest of layout.rests.values()) {
      assert.ok(rest.y >= layout.loungeTop);
      assert.ok(rest.y < layout.loungeTop + 4);
    }
  });

  test("promenade, discussion et jeu se font dans la détente, seul le café est dans le coin pause", () => {
    const layout = LAYOUT.buildLayout(["a", "b"], Z.ZONE_IDS);
    for (const spot of L.walkSpots(layout)) {
      assert.equal(LAYOUT.inLeisure(layout, spot), true);
    }
    for (let i = 0; i < 40; i += 1) {
      const [a, b] = L.meetingSpots(layout, lcg(i + 1));
      assert.equal(a.y, b.y);
      assert.ok(LAYOUT.inLeisure(layout, a) && LAYOUT.inLeisure(layout, b));
      assert.ok(b.x - a.x >= 1.2 && b.x - a.x <= 2);
      const zone = LAYOUT.zoneAt(layout, a);
      assert.ok(zone && b.x <= zone.x + zone.w, "les deux restent dans la même zone");
    }
    assert.equal(LAYOUT.inLeisure(layout, L.coffeeSpot(layout)), false);
  });
});

describe("activités de zone", () => {
  test("dès qu'il est libre, un agent va vite dans une zone", () => {
    const w = world(["tele"], "a");
    let seen = false;
    for (let i = 0; i < 200 && !seen; i += 1) {
      w.run(0.5);
      seen = w.leisure.stateOf("a").kind === L.KIND.ZONE;
    }
    assert.ok(seen, "en zone en moins de 100 s (même après un café)");
    const kinds = new Set();
    for (let i = 0; i < 3000; i += 1) {
      w.run(0.1);
      kinds.add(w.leisure.stateOf("a")?.kind);
    }
    assert.ok(kinds.has(L.KIND.ZONE), `activités vues : ${[...kinds]}`);
  });

  test("à la télé, plusieurs agents s'assoient sur des places différentes", () => {
    const w = world(["tele"], "a", "b", "c");
    const seen = new Set();
    for (let i = 0; i < 4000; i += 1) {
      w.run(0.1);
      const seats = [...w.leisure.states.values()]
        .filter((s) => s.kind === L.KIND.ZONE && s.phase === "act")
        .map((s) => s.target.seat);
      assert.equal(new Set(seats).size, seats.length, "deux agents sur la même place");
      seats.forEach((x) => seen.add(x));
    }
    assert.ok(seen.size >= 2);
  });

  test("le tennis de table se joue à deux, un joueur de chaque côté", () => {
    const w = world(["tennis-de-table"], "a", "b");
    let played = false;
    for (let i = 0; i < 4000 && !played; i += 1) {
      w.run(0.1);
      const sa = w.leisure.stateOf("a");
      const sb = w.leisure.stateOf("b");
      if (sa.kind === L.KIND.ZONE && sa.phase === "act" && sb.phase === "act") {
        played = true;
        assert.equal(sa.partnerId, "b");
        assert.notEqual(sa.target.seat, sb.target.seat);
        assert.ok(sa.target.x < sb.target.x || sa.target.x > sb.target.x);
        assert.match(w.leisure.label("a"), /Joue au tennis de table avec b/);
      }
    }
    assert.ok(played, "aucune partie en 400 s");
  });

  test("seul, personne n'ouvre une partie de tennis de table", () => {
    const w = world(["tennis-de-table"], "a");
    for (let i = 0; i < 3000; i += 1) {
      w.run(0.1);
      assert.notEqual(w.leisure.stateOf("a").kind, L.KIND.ZONE);
    }
  });

  test("après la zone, l'agent sort sur le couloir de la zone (pas dans l'eau ni au lit)", () => {
    const w = world(["piscine"], "a");
    let seat = null;
    let out = false;
    for (let i = 0; i < 4000 && !out; i += 1) {
      w.run(0.1);
      const s = w.leisure.stateOf("a");
      if (s.kind === L.KIND.ZONE && s.phase === "act") {
        seat = s.target;
      } else if (seat && s.kind === L.KIND.WANDER) {
        assert.deepEqual(s.target, { x: seat.x, y: seat.walkY });
        assert.equal(Z.inWater(w.layout.zones, s.target), false);
        out = true;
      }
    }
    assert.ok(out);
  });

  test("les zones d'abord : la plupart du temps, les agents libres sont en activité dans une zone", () => {
    const w = world(Z.ZONE_IDS, "a", "b", "c", "d", "e");
    w.run(120);
    let inZone = 0;
    let total = 0;
    for (let i = 0; i < 2000; i += 1) {
      w.run(0.5);
      for (const s of w.leisure.states.values()) {
        total += 1;
        if (s.kind === L.KIND.ZONE) {
          inZone += 1;
        }
      }
    }
    assert.ok(inZone / total > 0.75, `${Math.round((inZone / total) * 100)} % du temps en zone`);
  });

  test("on remplit d'abord les zones vides", () => {
    const w = world(["tele", "dortoir"], "a", "b");
    w.run(30);
    const zones = [...w.leisure.states.values()].filter((s) => s.kind === L.KIND.ZONE).map((s) => s.zoneId);
    assert.deepEqual(zones.sort(), ["dortoir", "tele"]);
  });

  test("du travail arrive : l'activité s'arrête et la place se libère", () => {
    const w = world(["tele"], "a");
    for (let i = 0; i < 4000; i += 1) {
      w.run(0.1);
      const s = w.leisure.stateOf("a");
      if (s.kind === L.KIND.ZONE && s.phase === "act") {
        break;
      }
    }
    w.chars[0].status = "typing";
    w.run(0.2);
    assert.equal(w.leisure.stateOf("a"), null);
    assert.equal(w.leisure.takenSeats("tele").size, 0);
  });

  test("la discussion de groupe réunit au moins deux agents, sur des places différentes", () => {
    const w = world(["discussion"], "a", "b", "c");
    let grouped = false;
    for (let i = 0; i < 4000; i += 1) {
      w.run(0.1);
      const acting = [...w.leisure.states.values()].filter(
        (s) => s.kind === L.KIND.ZONE && s.phase === "act",
      );
      const seats = acting.map((s) => s.target.seat);
      assert.equal(new Set(seats).size, seats.length);
      if (acting.length >= 2) {
        grouped = true;
      }
    }
    assert.ok(grouped);
  });

  test("seul, personne ne se met à discuter en groupe", () => {
    const w = world(["discussion"], "a");
    for (let i = 0; i < 3000; i += 1) {
      w.run(0.1);
      assert.notEqual(w.leisure.stateOf("a").kind, L.KIND.ZONE);
    }
  });

  test("le dortoir sert vraiment : seul avec lui, l'agent finit au lit", () => {
    const w = world(["dortoir"], "a");
    let slept = false;
    for (let i = 0; i < 400 && !slept; i += 1) {
      w.run(0.5);
      const s = w.leisure.stateOf("a");
      slept = s.kind === L.KIND.ZONE && s.phase === "act" && s.target.pose === "lie";
    }
    assert.ok(slept);
  });

  test("balle et gaming : à deux quand un collègue est libre, une place chacun", () => {
    for (const id of ["balle", "gaming"]) {
      const w = world([id], "a", "b");
      let both = false;
      for (let i = 0; i < 400 && !both; i += 1) {
        w.run(0.5);
        const [sa, sb] = ["a", "b"].map((x) => w.leisure.stateOf(x));
        both = sa.kind === L.KIND.ZONE && sa.phase === "act" && sb.phase === "act";
        if (both) {
          assert.equal(sa.partnerId, "b");
          assert.notEqual(sa.target.seat, sb.target.seat);
        }
      }
      assert.ok(both, id);
    }
  });

  test("avec des zones, plus de balle ni de discussion à côté d'une zone : elles ont leur zone", () => {
    const w = world(Z.ZONE_IDS, "a", "b", "c", "d");
    for (let i = 0; i < 3000; i += 1) {
      w.run(0.5);
      for (const s of w.leisure.states.values()) {
        assert.notEqual(s.kind, L.KIND.PLAY);
        assert.notEqual(s.kind, L.KIND.CHAT);
      }
    }
  });

  test("chaque zone a ses places libres, les textes du panneau et une pose connue", () => {
    const poses = new Set(["sit", "stand", "chat", "lie", "run", "lift", "swim", "game"]);
    for (const [id, def] of Object.entries(Z.ZONES)) {
      for (const seat of def.seats) {
        assert.ok(poses.has(seat.pose), `${id} : pose ${seat.pose}`);
      }
      assert.ok(def.go && def.doing("x", def.seats[0]), id);
    }
  });

  test("sans zone, aucune activité de zone n'est jamais choisie", () => {
    const w = world([], "a", "b");
    for (let i = 0; i < 3000; i += 1) {
      w.run(0.1);
      for (const s of w.leisure.states.values()) {
        assert.notEqual(s.kind, L.KIND.ZONE);
      }
    }
  });
});

describe("réglage « zones »", () => {
  const base = { members: [], agents: {} };

  test("absent : toutes les zones ; vide : aucune ; sinon la liste filtrée", () => {
    assert.deepEqual(buildTeam([], {}).zones, SERVER_ZONE_IDS);
    assert.deepEqual(buildTeam([], { zones: [] }).zones, []);
    assert.deepEqual(buildTeam([], { zones: ["tele", "plage"] }).zones, ["tele"]);
    assert.deepEqual(buildTeam([], { zones: "tele" }).zones, SERVER_ZONE_IDS);
  });

  test("les valeurs ignorées sont signalées", () => {
    assert.deepEqual(configWarnings({ ...base, zones: ["tele"] }), []);
    const unknown = configWarnings({ ...base, zones: ["plage"] });
    assert.equal(unknown.length, 1);
    assert.match(unknown[0], /plage/);
    assert.match(configWarnings({ ...base, zones: "tele" })[0], /liste/);
  });
});

describe("salle de réunion et mur décoré", () => {
  for (const [label, zones, opts] of [
    ["sans détente", [], {}],
    ["détente dessous", SERVER_ZONE_IDS, {}],
    ["détente à droite", SERVER_ZONE_IDS, { horizontal: true }],
    ["à droite, étiré", SERVER_ZONE_IDS, { horizontal: true, minRows: 40 }],
  ]) {
    test(`la salle de réunion ne chevauche aucun poste ni couloir (${label})`, () => {
      const team = ["a", "b", "c", "d", "e", "f", "g"];
      const layout = LAYOUT.buildLayout(team, zones, opts);
      const m = layout.meeting;
      assert.ok(m.x + m.w <= layout.workCols);
      const desks = [...layout.memberDesks.values(), ...layout.guestDesks, layout.claudeDesk];
      for (const d of desks) {
        const overlaps = d.x + 3 > m.x && d.x < m.x + m.w && d.y + 2 > m.y && d.y - 0.5 < m.y + m.h;
        assert.equal(overlaps, false, `poste ${d.x},${d.y}`);
      }
      assert.equal(new Set(team.map((t) => `${layout.memberDesks.get(t).x},${layout.memberDesks.get(t).y}`)).size, team.length);
      for (const y of layout.corridors) {
        assert.ok(y <= m.y || y >= m.y + m.h, `couloir ${y} dans la salle`);
      }
      assert.ok(layout.guestDesks.length >= 2, "toujours des postes pour les renforts");
      // au moins une allée permet de passer d'une rangée à l'autre sans traverser la salle
      const [c1, c2] = [layout.corridors.at(-2), layout.corridors.at(-1)];
      assert.ok(layout.aisles.some((a) => !LAYOUT.crossesMeeting(layout, a, c1, c2)));
      assert.ok(LAYOUT.crossesMeeting(layout, m.x + m.w / 2, c1, c2));
    });
  }

  test("le mur décoré est en haut de la détente, les zones en dessous", () => {
    for (const horizontal of [false, true]) {
      const layout = LAYOUT.buildLayout(["a"], Z.ZONE_IDS, { horizontal });
      const wall = layout.decorWall;
      assert.ok(wall);
      for (const z of layout.zones) {
        assert.ok(z.y >= wall.y + 3, `zone ${z.id} sous le mur`);
      }
      assert.ok(layout.spineGate.y > wall.y + 3, "le passage débouche sous le mur");
    }
    assert.equal(LAYOUT.buildLayout(["a"]).decorWall, null);
  });

  test("le gaming : seul ou à deux, assis devant la télé, manette en main", () => {
    assert.equal(Z.ZONES.gaming.group, "flex");
    assert.equal(Z.ZONES.gaming.seats.length, 2);
    assert.ok(Z.ZONES.gaming.seats.every((s) => s.pose === "game"));
    assert.equal(Z.ZONES.gaming.doing("b"), "Joue à la console avec b");
    assert.equal(Z.ZONES.gaming.doing(""), "Joue à la console");
  });

  for (const [id, label, pose] of [
    ["gaming", "Joue à la console", "game"],
    ["balle", "Fait des jongles", "juggle"],
  ]) {
    test(`${id} : seul, on y joue aussi (${label})`, () => {
      const w = world([id], "a");
      let solo = false;
      for (let i = 0; i < 400 && !solo; i += 1) {
        w.run(0.5);
        const s = w.leisure.stateOf("a");
        if (s.kind === L.KIND.ZONE && s.phase === "act") {
          solo = true;
          assert.equal(s.partnerId, null);
          assert.equal(s.target.pose, pose);
          assert.equal(w.leisure.label("a"), label);
        }
      }
      assert.ok(solo);
    });
  }

  test("seul, on jongle au milieu du terrain, entre les deux places de passes", () => {
    const layout = LAYOUT.buildLayout(["a"], ["balle"]);
    const z = layout.zones[0];
    assert.ok(z.soloSeat.x > z.seats[0].x && z.soloSeat.x < z.seats[1].x);
    assert.equal(z.soloSeat.walkY, z.walkY);
  });

  test("piscine : des longueurs d'un bord à l'autre, sans sortir de l'eau, dans sa ligne", () => {
    const layout = LAYOUT.buildLayout(["a"], ["piscine"]);
    const z = layout.zones[0];
    const ys = z.seats.map((s) => s.y);
    assert.equal(new Set(ys).size, ys.length, "une ligne par nageur");
    for (const seat of z.seats) {
      const xs = [];
      for (let t = 0; t < 40; t += 0.25) {
        const x = Z.lapX(z, seat, t);
        xs.push(x);
        assert.equal(Z.inWater(layout.zones, { x, y: seat.y }), true);
      }
      assert.equal(Z.lapX(z, seat, 0).toFixed(3), seat.x.toFixed(3), "on part de sa place");
      const span = Math.max(...xs) - Math.min(...xs);
      assert.ok(span > z.def.water.w - 2, "d'un bord à l'autre");
      // aller puis retour : le sens change
      const dirs = new Set();
      for (let i = 1; i < xs.length; i += 1) {
        dirs.add(Math.sign(xs[i] - xs[i - 1]));
      }
      assert.ok(dirs.has(1) && dirs.has(-1));
    }
  });

  test("les places de la piscine sont dans l'eau, son couloir non", () => {
    const layout = LAYOUT.buildLayout(["a"], ["piscine"]);
    const zone = layout.zones[0];
    for (const seat of zone.seats) {
      assert.equal(Z.inWater(layout.zones, seat), true);
      assert.equal(Z.inWater(layout.zones, { x: seat.x, y: seat.walkY }), false);
    }
  });
});
