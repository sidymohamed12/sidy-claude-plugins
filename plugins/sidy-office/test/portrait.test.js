"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { resolveTeam, checkPortrait } = require("../server/team");
const { createOfficeServer } = require("../server/server");

// PNG de 1×1 pixel
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

function home(config, files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sidy-portrait-"));
  fs.mkdirSync(path.join(dir, ".claude"), { recursive: true });
  for (const [name, data] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), data);
  }
  if (config) {
    fs.writeFileSync(path.join(dir, ".claude", "sidy-office.json"), JSON.stringify(config));
  }
  return dir;
}

describe("réglage « portrait »", () => {
  test("absent : silhouette (null) ; false : pas de tableau", () => {
    assert.equal(resolveTeam({ homeDir: home({}) }).team.portrait, null);
    assert.equal(resolveTeam({ homeDir: home({ portrait: false }) }).team.portrait, false);
  });

  test("chemin relatif au fichier de réglages : la page ne reçoit qu'une version, jamais le chemin", () => {
    const dir = home({ portrait: "moi.png" }, { ".claude/moi.png": PNG });
    const resolved = resolveTeam({ homeDir: dir });
    assert.match(resolved.team.portrait.version, /^\d+-\d+$/);
    assert.ok(!JSON.stringify(resolved.team).includes("moi.png"));
    assert.equal(resolved.portraitFile.path, path.join(dir, ".claude", "moi.png"));
    assert.equal(resolved.portraitFile.type, "image/png");
    assert.deepEqual(resolved.errors, []);
  });

  test("~/… part du dossier personnel", () => {
    const dir = home({ portrait: "~/Images/moi.png" }, { "Images/moi.png": PNG });
    assert.equal(resolveTeam({ homeDir: dir }).portraitFile.path, path.join(dir, "Images", "moi.png"));
  });

  test("format refusé, fichier absent, dossier ou valeur invalide : signalés, silhouette affichée", () => {
    const cases = [
      [{ portrait: "~/secret.txt" }, { "secret.txt": "x" }, /seules les images/],
      [{ portrait: "~/absent.png" }, {}, /introuvable/],
      [{ portrait: "~/dossier.png" }, { "dossier.png/x": "x" }, /pas un fichier/],
      [{ portrait: 12 }, {}, /chemin d'une image/],
    ];
    for (const [config, files, message] of cases) {
      const resolved = resolveTeam({ homeDir: home(config, files) });
      assert.equal(resolved.team.portrait, null);
      assert.equal(resolved.portraitFile, null);
      assert.ok(resolved.errors.some((e) => message.test(e)), resolved.errors.join(" "));
    }
  });

  test("une image de plus de 5 Mo est refusée", () => {
    const big = path.join(home(null), "gros.png");
    fs.writeFileSync(big, Buffer.alloc(5 * 1024 * 1024 + 1));
    assert.match(checkPortrait(big).warning, /5 Mo/);
  });

  test("la version change quand on remplace la photo", () => {
    const dir = home({ portrait: "~/moi.png" }, { "moi.png": PNG });
    const before = resolveTeam({ homeDir: dir }).team.portrait.version;
    fs.writeFileSync(path.join(dir, "moi.png"), Buffer.concat([PNG, Buffer.from([0])]));
    assert.notEqual(resolveTeam({ homeDir: dir }).team.portrait.version, before);
  });
});

describe("adresse /portrait", () => {
  async function serve(dir) {
    const office = createOfficeServer({ homeDir: dir });
    await new Promise((resolve) => office.server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${office.server.address().port}/portrait`;
    return {
      url,
      close: () => {
        office.server.closeAllConnections();
        office.server.close();
      },
    };
  }

  test("sert la photo choisie, avec son type", async () => {
    const s = await serve(home({ portrait: "~/moi.png" }, { "moi.png": PNG }));
    try {
      const res = await fetch(s.url);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-type"), "image/png");
      assert.equal(res.headers.get("x-content-type-options"), "nosniff");
      assert.deepEqual(Buffer.from(await res.arrayBuffer()), PNG);
    } finally {
      s.close();
    }
  });

  test("rien sans photo valide, et aucun autre fichier accessible par cette adresse", async () => {
    const s = await serve(home({ portrait: "~/secret.txt" }, { "secret.txt": "x" }));
    try {
      assert.equal((await fetch(s.url)).status, 404);
      assert.equal((await fetch(`${s.url}?file=../secret.txt`)).status, 404);
    } finally {
      s.close();
    }
  });
});
