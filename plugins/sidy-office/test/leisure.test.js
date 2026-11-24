"use strict";

const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const PUBLIC = path.join(__dirname, "..", "public");
let L; // leisure.js
let LAYOUT; // layout.js

before(async () => {
  L = await import(pathToFileURL(path.join(PUBLIC, "leisure.js")));
  LAYOUT = await import(pathToFileURL(path.join(PUBLIC, "layout.js")));
});

/** Tirages prédéfinis, puis 0,5 une fois la liste épuisée. */
function seq(...values) {
  let i = 0;
  return () => (i < values.length ? values[i++] : 0.5);
}

function makeChar(id, x, y, extra = {}) {
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
    ...extra,
  };
}

/** Marche instantanée : la cible devient l'unique étape, puis on « arrive ». */
function makeWorld(rng, ...chars) {
  const layout = LAYOUT.buildLayout(["a", "b", "c"]);
  const leisure = new L.Leisure(layout, {
    rng,
    walk: (c, target) => {
      c.path = [target];
    },
  });
  const arrive = () => {
    for (const c of chars) {
      if (c.path.length) {
        c.x = c.path[0].x;
        c.y = c.path[0].y;
        c.path = [];
      }
    }
  };
  const tick = (dt) => leisure.update(dt, chars);
  return { layout, leisure, tick, arrive, chars };
}

const LONG = 301; // plus long que toute attente (activités et pauses durent 2 à 5 min)

/** Fait avancer le temps par pas réalistes (0,1 s au plus, comme la boucle d'animation). */
function run(world, seconds, dt = 0.1) {
  for (let t = 0; t < seconds; t += dt) {
    world.tick(dt);
  }
}

describe("géométrie du coin pause", () => {
  test("les points de marche restent dans le coin pause, sous le canapé", () => {
    for (const members of [[], ["a"], ["a", "b", "c", "d", "e", "f", "g"]]) {
      const layout = LAYOUT.buildLayout(members);
      const spots = L.walkSpots(layout);
      assert.ok(spots.length > 20);
      for (const s of spots) {
        assert.ok(s.x > 1 && s.x < layout.cols - 2, `x ${s.x}`);
        assert.ok(s.y >= layout.loungeTop + 1.9, `y ${s.y}`);
        assert.ok(s.y <= layout.loungeTop + 3, `y ${s.y}`);
      }
    }
  });

  test("deux places de discussion : côte à côte, dans le coin pause", () => {
    const layout = LAYOUT.buildLayout(["a", "b"]);
    for (let i = 0; i < 50; i += 1) {
      const [a, b] = L.meetingSpots(layout, Math.random);
      assert.equal(a.y, b.y);
      assert.ok(b.x - a.x >= 1.2 && b.x - a.x <= 2);
      assert.ok(b.x < layout.cols - 2);
    }
  });

  test("les places évitent ceux qui sont déjà là", () => {
    const layout = LAYOUT.buildLayout(["a"]);
    const near = L.walkSpots(layout)
      .filter((s) => s.x <= 10)
      .map((s) => ({ x: s.x, y: s.y }));
    for (let i = 0; i < 30; i += 1) {
      const [a] = L.meetingSpots(layout, Math.random, near);
      assert.ok(a.x > 10, `pris à ${a.x}`);
    }
  });

  test("le café se prend à côté de la machine, dans le coin pause", () => {
    const layout = LAYOUT.buildLayout(["a"]);
    const spot = L.coffeeSpot(layout);
    assert.ok(spot.x < 3);
    assert.equal(spot.y, layout.loungeTop + 1.6);
  });
});

describe("la balle", () => {
  const a = { x: 10, y: 20 };
  const b = { x: 12, y: 20 };

  test("part de a, arrive en b, puis revient", () => {
    assert.equal(L.ballAt(a, b, 0).x, 10);
    assert.ok(Math.abs(L.ballAt(a, b, L.BALL_PERIOD * 0.999).x - 12) < 0.01);
    assert.equal(L.ballAt(a, b, L.BALL_PERIOD).x, 12);
    assert.ok(Math.abs(L.ballAt(a, b, L.BALL_PERIOD * 1.999).x - 10) < 0.01);
  });

  test("elle monte au milieu du lob et retombe aux mains", () => {
    const mid = L.ballAt(a, b, L.BALL_PERIOD / 2);
    assert.ok(Math.abs(mid.y - (20 - L.BALL_ARC)) < 0.001);
    assert.equal(L.ballAt(a, b, 0).y, 20);
  });

  test("le lanceur alterne", () => {
    assert.equal(L.ballAt(a, b, 0.1).thrower, 0);
    assert.equal(L.ballAt(a, b, L.BALL_PERIOD + 0.1).thrower, 1);
  });
});

describe("qui peut flâner", () => {
  test("seuls les membres de l'équipe, au repos et sans session, sont libres", () => {
    assert.equal(L.Leisure.isFree(makeChar("a", 5, 5)), true);
    assert.equal(L.Leisure.isFree(makeChar("a", 5, 5, { status: "typing" })), false);
    assert.equal(L.Leisure.isFree(makeChar("a", 5, 5, { instances: 1 })), false);
    assert.equal(L.Leisure.isFree(makeChar("a", 5, 5, { place: "desk" })), false);
    assert.equal(L.Leisure.isFree(makeChar("a", 5, 5, { guest: true })), false);
    assert.equal(L.Leisure.isFree(makeChar("a", 5, 5, { stays: true })), false);
    assert.equal(L.Leisure.isFree(makeChar("claude", 5, 5, { rest: null })), false);
  });

  test("un agent qui travaille ne part jamais en balade", () => {
    const busy = makeChar("a", 5, 5, { status: "typing", instances: 1, place: "desk" });
    const w = makeWorld(Math.random, busy);
    for (let i = 0; i < 100; i += 1) {
      w.tick(1);
    }
    assert.equal(busy.path.length, 0);
    assert.equal(w.leisure.stateOf("a"), null);
  });
});

describe("réglage « repos »", () => {
  test("un agent qui doit rester à sa place ne flâne jamais, même avec des collègues libres", () => {
    const stays = makeChar("a", 5, 40, { stays: true });
    const b = makeChar("b", 9, 40);
    const c = makeChar("c", 13, 40);
    const w = makeWorld(Math.random, stays, b, c);
    for (let i = 0; i < 600; i += 1) {
      w.tick(0.3);
      w.arrive();
      assert.equal(w.leisure.stateOf("a"), null);
      for (const id of ["b", "c"]) {
        assert.notEqual(w.leisure.stateOf(id)?.partnerId, "a");
      }
    }
    assert.deepEqual([stays.x, stays.y], [5, 40]);
  });

  test("si le réglage change en cours de route, l'agent est libéré aussitôt", () => {
    const a = makeChar("a", 8, 40);
    const b = makeChar("b", 16, 40);
    const w = makeWorld(seq(0, 0, 0.6, 0, 0.2), a, b);
    w.tick(0.1);
    run(w, 3);
    assert.equal(w.leisure.stateOf("a").kind, "chat");
    a.stays = true;
    w.tick(0.1);
    assert.equal(w.leisure.stateOf("a"), null);
    assert.equal(w.leisure.stateOf("b").phase, "dwell");
  });
});

describe("promenade", () => {
  test("après une pause, il marche vers un point du coin pause", () => {
    // 1er tirage : durée d'attente ; 2e : choix (0 = se promener) ; 3e : pas de retour à la place ; 4e : le point
    const a = makeChar("a", 10, 40);
    const w = makeWorld(seq(0, 0, 0.9, 0.5), a);
    w.tick(0.1); // l'attente est créée
    w.tick(LONG);
    assert.equal(a.path.length, 1);
    const spots = L.walkSpots(w.layout).map((s) => `${s.x},${s.y}`);
    assert.ok(spots.includes(`${a.path[0].x},${a.path[0].y}`));
    assert.equal(w.leisure.label("a"), "Se promène");
  });

  test("arrivé, il se repose de nouveau puis repart", () => {
    const a = makeChar("a", 10, 40);
    const w = makeWorld(seq(0, 0, 0.9, 0.5), a);
    w.tick(0.1);
    w.tick(LONG);
    w.arrive();
    w.tick(0.1);
    assert.equal(w.leisure.label("a"), null);
    assert.equal(w.leisure.stateOf("a").phase, "dwell");
  });

  test("parfois, il rentre à sa place", () => {
    const a = makeChar("a", 3.4, 40, { rest: { x: 3.4, y: 40, sit: true } });
    a.x = 15;
    const w = makeWorld(seq(0, 0, 0.1), a);
    w.tick(0.1);
    w.tick(LONG);
    assert.deepEqual(a.path[0], { x: 3.4, y: 40 });
  });
});

describe("café", () => {
  test("il va à la machine, boit, puis retourne se reposer", () => {
    const a = makeChar("a", 10, 40);
    // seul : promenade 0 à 0,73, café au-delà (le tirage 0,9 tombe sur le café)
    const w = makeWorld(seq(0, 0.9), a);
    w.tick(0.1);
    w.tick(LONG);
    assert.equal(w.leisure.stateOf("a").kind, "coffee");
    assert.equal(w.leisure.label("a"), "Va prendre un café");
    w.arrive();
    w.tick(0.1);
    assert.equal(w.leisure.stateOf("a").phase, "act");
    assert.equal(w.leisure.label("a"), "Prend un café");
    w.tick(LONG);
    assert.equal(w.leisure.stateOf("a").phase, "dwell");
  });

  test("une seule personne à la fois à la machine", () => {
    const a = makeChar("a", 10, 40);
    const b = makeChar("b", 14, 40);
    // les deux veulent le café : le second se rabat sur autre chose
    const w = makeWorld(() => 0.42, a, b);
    w.tick(0.1);
    w.tick(LONG);
    const kinds = ["a", "b"].map((id) => w.leisure.stateOf(id)?.kind);
    assert.ok(kinds.filter((k) => k === "coffee").length <= 1, kinds.join());
  });
});

describe("discussion et jeu à deux", () => {
  function startPair(roll) {
    const a = makeChar("a", 8, 40);
    const b = makeChar("b", 16, 40);
    // attente a, attente b, choix, partenaire, place
    const w = makeWorld(seq(0, 0, roll, 0, 0.2), a, b);
    w.tick(0.1);
    run(w, 3); // l'attente de 2,5 s se termine : la rencontre démarre
    return { w, a, b };
  }
  // roll : 0,6 -> discussion (0,4 + 0,15 < 0,6 < 0,8) ; 0,9 -> balle

  test("discussion : les deux marchent vers deux places voisines", () => {
    const { w, a, b } = startPair(0.6);
    assert.equal(w.leisure.stateOf("a").kind, "chat");
    assert.equal(w.leisure.stateOf("b").kind, "chat");
    assert.equal(a.path.length, 1);
    assert.equal(b.path.length, 1);
    assert.equal(a.path[0].y, b.path[0].y);
    assert.ok(b.path[0].x - a.path[0].x >= 1.2);
    assert.equal(w.leisure.label("a"), "Discute avec b");
    assert.equal(w.leisure.label("b"), "Discute avec a");
  });

  test("ils commencent ensemble, quand les deux sont arrivés", () => {
    const { w, a, b } = startPair(0.6);
    a.x = a.path[0].x;
    a.y = a.path[0].y;
    a.path = [];
    w.tick(0.1);
    assert.equal(w.leisure.stateOf("a").phase, "travel", "b n'est pas arrivé");
    b.x = b.path[0].x;
    b.y = b.path[0].y;
    b.path = [];
    w.tick(0.1);
    assert.equal(w.leisure.stateOf("a").phase, "act");
    assert.equal(w.leisure.stateOf("b").phase, "act");
    assert.deepEqual([w.leisure.stateOf("a").slot, w.leisure.stateOf("b").slot], [0, 1]);
  });

  test("jeu de balle : même mécanique, autre étiquette", () => {
    const { w } = startPair(0.9);
    assert.equal(w.leisure.stateOf("a").kind, "play");
    assert.equal(w.leisure.label("a"), "Joue à la balle avec b");
    w.arrive();
    w.tick(0.1);
    assert.equal(w.leisure.stateOf("a").phase, "act");
  });

  test("la fin d'une activité libère les deux", () => {
    const { w } = startPair(0.6);
    w.arrive();
    w.tick(0.1);
    let guard = 0;
    while (w.leisure.stateOf("a").phase === "act" && guard < 400) {
      w.tick(1);
      guard += 1;
    }
    assert.ok(guard >= 119 && guard <= 301, `la discussion dure de 2 à 5 minutes (${guard} s)`);
    for (const id of ["a", "b"]) {
      assert.equal(w.leisure.stateOf(id).phase, "dwell");
      assert.equal(w.leisure.label(id), null);
    }
  });

  test("si l'un se met au travail, l'autre est libéré", () => {
    const { w, a, b } = startPair(0.6);
    w.arrive();
    w.tick(0.1);
    b.status = "typing";
    b.instances = 1;
    b.place = "desk";
    w.tick(0.1);
    assert.equal(w.leisure.stateOf("b"), null);
    assert.equal(w.leisure.stateOf("a").phase, "dwell");
    assert.equal(a.status, "idle");
  });

  test("un partenaire qui n'arrive pas fait abandonner la rencontre", () => {
    const { w, a, b } = startPair(0.6);
    a.x = a.path[0].x;
    a.y = a.path[0].y;
    a.path = [];
    b.path = [{ x: 0, y: 0 }]; // b ne finit jamais sa marche
    run(w, 14.5);
    assert.equal(w.leisure.stateOf("a").phase, "dwell");
    assert.equal(w.leisure.stateOf("b").phase, "dwell");
  });

  test("seul au bureau : jamais de partenaire inventé", () => {
    const a = makeChar("a", 10, 40);
    const w = makeWorld(() => 0.6, a); // le tirage vise la discussion
    w.tick(0.1);
    w.tick(LONG);
    assert.notEqual(w.leisure.stateOf("a").kind, "chat");
    assert.notEqual(w.leisure.stateOf("a").kind, "play");
  });

  test("on ne dérange pas quelqu'un déjà occupé", () => {
    const a = makeChar("a", 8, 40);
    const b = makeChar("b", 16, 40);
    const c = makeChar("c", 12, 40);
    const w = makeWorld(Math.random, a, b, c);
    for (let i = 0; i < 400; i += 1) {
      w.tick(0.5);
      w.arrive();
      const pairs = new Map();
      for (const id of ["a", "b", "c"]) {
        const s = w.leisure.stateOf(id);
        if (s?.partnerId) {
          pairs.set(id, s.partnerId);
          const back = w.leisure.stateOf(s.partnerId);
          assert.equal(back.partnerId, id, "la paire doit être réciproque");
          assert.equal(back.kind, s.kind);
        }
      }
    }
  });
});

describe("robustesse", () => {
  test("un long enchaînement aléatoire ne laisse aucune activité orpheline", () => {
    const chars = ["a", "b", "c", "d"].map((id, i) => makeChar(id, 5 + i * 3, 40));
    const w = makeWorld(Math.random, ...chars);
    for (let i = 0; i < 2000; i += 1) {
      if (i % 97 === 0) {
        const c = chars[i % 4];
        const work = c.place === "rest";
        c.place = work ? "desk" : "rest";
        c.status = work ? "typing" : "idle";
        c.instances = work ? 1 : 0;
        c.path = [];
      }
      w.tick(0.3);
      w.arrive();
      for (const c of chars) {
        const s = w.leisure.stateOf(c.id);
        if (!L.Leisure.isFree(c)) {
          assert.equal(s, null, `${c.id} travaille mais flâne`);
        }
        if (s?.partnerId) {
          assert.equal(w.leisure.stateOf(s.partnerId)?.partnerId, c.id);
        }
      }
    }
  });

  test("un nouveau plan efface toutes les activités", () => {
    const a = makeChar("a", 10, 40);
    const w = makeWorld(seq(0, 0, 0.9, 0.5), a);
    w.tick(0.1);
    w.tick(LONG);
    assert.ok(w.leisure.stateOf("a"));
    w.leisure.reset(LAYOUT.buildLayout(["a", "b"]));
    assert.equal(w.leisure.stateOf("a"), null);
  });
});

describe("on se détend longtemps", () => {
  test("une pause sans rien faire dure de 2 à 5 minutes, la première est courte", () => {
    assert.deepEqual(L.DWELL, [120, 300]);
    assert.ok(L.FIRST_DWELL[1] <= 10);
  });
});
