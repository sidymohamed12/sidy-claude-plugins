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
    leisure.update(0.1, chars);
  };
  const run = (seconds) => {
    for (let t = 0; t < seconds; t += 0.1) {
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
    assert.deepEqual(Z.pickZones(["tele", "piscine", "tele"]), ["tele"]);
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
    assert.deepEqual(entry[0], { x: layout.aisleX, y: seat.walkY });
    assert.deepEqual(entry.at(-1), { x: seat.x, y: seat.y });
  });
});

describe("activités de zone", () => {
  test("rien avant d'avoir assez traîné, puis un agent va regarder la télé", () => {
    const w = world(["tele"], "a");
    w.run(Z.ZONES.tele.after - 4);
    assert.equal(w.leisure.stateOf("a").kind === L.KIND.ZONE, false);
    w.run(40);
    const kinds = new Set();
    for (let i = 0; i < 400; i += 1) {
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

  test("après la zone, l'agent rentre à sa place de repos", () => {
    const w = world(["tele"], "a");
    let inZone = false;
    let backHome = false;
    for (let i = 0; i < 4000 && !backHome; i += 1) {
      w.run(0.1);
      const s = w.leisure.stateOf("a");
      if (s.kind === L.KIND.ZONE && s.phase === "act") {
        inZone = true;
      } else if (inZone && s.kind === L.KIND.WANDER) {
        assert.deepEqual(s.target, { x: w.chars[0].rest.x, y: w.chars[0].rest.y });
        backHome = true;
      }
    }
    assert.ok(inZone && backHome);
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
    assert.deepEqual(buildTeam([], { zones: ["tele", "piscine"] }).zones, ["tele"]);
    assert.deepEqual(buildTeam([], { zones: "tele" }).zones, SERVER_ZONE_IDS);
  });

  test("les valeurs ignorées sont signalées", () => {
    assert.deepEqual(configWarnings({ ...base, zones: ["tele"] }), []);
    const unknown = configWarnings({ ...base, zones: ["piscine"] });
    assert.equal(unknown.length, 1);
    assert.match(unknown[0], /piscine/);
    assert.match(configWarnings({ ...base, zones: "tele" })[0], /liste/);
  });
});
