"use strict";

const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { discoverAgents, parseAgentFile } = require("../server/discovery");
const {
  buildTeam,
  generateLook,
  customizeLook,
  roleFrom,
  loadConfig,
  mergeConfigs,
  resolveTeam,
  DEFAULT_TITLE,
} = require("../server/team");

let home;

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function agentMd(name, description) {
  return `---\nname: ${name}\ndescription: ${description}\ntools: Read\n---\n\nCorps de l'agent.\n`;
}

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "sidy-office-"));
});

afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
});

describe("parseAgentFile", () => {
  test("lit nom et description sur une ligne", () => {
    assert.deepEqual(
      parseAgentFile(agentMd("backend-dev", "Code le back-end.")),
      {
        name: "backend-dev",
        description: "Code le back-end.",
      },
    );
  });

  test("lit une description en bloc replié", () => {
    const text =
      "---\nname: pentest\ndescription: >\n  Teste une app\n  qui tourne.\nmodel: opus\n---\n";
    assert.equal(parseAgentFile(text).description, "Teste une app qui tourne.");
  });

  test("retire les guillemets", () => {
    assert.equal(parseAgentFile('---\nname: "qa"\n---\n').name, "qa");
  });

  test("ignore un fichier sans frontmatter ou sans nom", () => {
    assert.equal(parseAgentFile("# Titre"), null);
    assert.equal(parseAgentFile("---\ndescription: x\n---\n"), null);
  });
});

describe("discoverAgents", () => {
  test("trouve les agents personnels, de plugin et de projet", () => {
    write(
      path.join(home, ".claude/agents/perso.md"),
      agentMd("perso", "Agent perso."),
    );
    write(
      path.join(
        home,
        ".claude/plugins/cache/sidy/sidy-dev/1.2.0/agents/backend-dev.md",
      ),
      agentMd("backend-dev", "Back."),
    );
    const projet = path.join(home, "projets/meditrace");
    write(
      path.join(projet, ".claude/agents/data.md"),
      agentMd("data", "Données."),
    );
    const found = discoverAgents({
      homeDir: home,
      cwds: [path.join(projet, "src")],
    });
    assert.deepEqual(found.map((a) => `${a.source}:${a.name}`).sort(), [
      "personnel:perso",
      "plugin:backend-dev",
      "projet:data",
    ]);
  });

  test("ignore les plugins désactivés", () => {
    write(
      path.join(home, ".claude/settings.json"),
      JSON.stringify({
        enabledPlugins: { "sidy-dev@sidy": true, "autre@x": false },
      }),
    );
    write(
      path.join(home, ".claude/plugins/cache/sidy/sidy-dev/1.2.0/agents/a.md"),
      agentMd("a", "A."),
    );
    write(
      path.join(home, ".claude/plugins/cache/x/autre/1.0.0/agents/b.md"),
      agentMd("b", "B."),
    );
    assert.deepEqual(
      discoverAgents({ homeDir: home }).map((a) => a.name),
      ["a"],
    );
  });

  test("sans doublon quand plusieurs versions sont en cache", () => {
    write(
      path.join(home, ".claude/plugins/cache/sidy/sidy-dev/1.1.0/agents/a.md"),
      agentMd("a", "A."),
    );
    write(
      path.join(home, ".claude/plugins/cache/sidy/sidy-dev/1.2.0/agents/a.md"),
      agentMd("a", "A."),
    );
    assert.equal(discoverAgents({ homeDir: home }).length, 1);
  });

  test("dossier absent : liste vide", () => {
    assert.deepEqual(
      discoverAgents({ homeDir: path.join(home, "inexistant") }),
      [],
    );
  });
});

describe("apparence", () => {
  test("le même nom donne toujours le même personnage", () => {
    assert.deepEqual(generateLook("backend-dev"), generateLook("backend-dev"));
  });

  test("des noms différents donnent des personnages variés", () => {
    const tops = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map(
        (n) => generateLook(`agent-${n}`).top,
      ),
    );
    assert.ok(tops.size >= 4);
  });

  test("les réglages remplacent couleur, cheveux, peau et accessoire", () => {
    const look = customizeLook(generateLook("x"), {
      couleur: "#123456",
      cheveux: "#654321",
      peau: 1,
      accessoire: "lunettes",
    });
    assert.equal(look.top, "#123456");
    assert.equal(look.hair, "#654321");
    assert.equal(look.skin, "#5E3A26");
    assert.equal(look.glasses, true);
    assert.equal(look.headphones, undefined);
  });

  test("plusieurs accessoires", () => {
    const look = customizeLook(generateLook("x"), {
      accessoire: ["casque", "chignon"],
    });
    assert.ok(look.headphones && look.bun);
  });

  test("valeurs invalides ignorées", () => {
    const base = generateLook("x");
    const look = customizeLook(base, { couleur: "rouge", peau: 9 });
    assert.equal(look.top, base.top);
    assert.equal(look.skin, base.skin);
  });
});

describe("roleFrom", () => {
  test("garde la première phrase", () => {
    assert.equal(roleFrom("Relit le code. À utiliser après."), "Relit le code");
  });

  test("raccourcit une phrase trop longue sur un mot entier", () => {
    const role = roleFrom(
      "Développeur front-end Angular de Sidy, design d’interface compris et beaucoup plus encore.",
    );
    assert.ok(role.length <= 61);
    assert.ok(role.endsWith("…"));
  });

  test("description vide", () => {
    assert.equal(roleFrom(undefined), "");
  });
});

describe("buildTeam", () => {
  const discovered = [
    { name: "reviewer", description: "Relit le code.", source: "plugin" },
    { name: "backend-dev", description: "Code le back.", source: "plugin" },
  ];

  test("sans config : agents détectés par ordre alphabétique, titre par défaut", () => {
    const team = buildTeam(discovered);
    assert.equal(team.title, DEFAULT_TITLE);
    assert.deepEqual(
      team.members.map((m) => m.type),
      ["backend-dev", "reviewer"],
    );
    assert.equal(team.members[1].role, "Relit le code");
    assert.equal(team.claude.name, "Claude");
  });

  test("ordre, nom, rôle et titre réglés", () => {
    const team = buildTeam(discovered, {
      titre: "Mon équipe",
      ordre: ["reviewer"],
      agents: { "backend-dev": { nom: "Back", role: "API" } },
    });
    assert.equal(team.title, "Mon équipe");
    assert.deepEqual(
      team.members.map((m) => m.name),
      ["reviewer", "Back"],
    );
    assert.equal(team.members[1].role, "API");
  });

  test("masquer retire un agent et le signale", () => {
    const team = buildTeam(discovered, {
      agents: { reviewer: { masquer: true }, Explore: { masquer: true } },
    });
    assert.deepEqual(
      team.members.map((m) => m.type),
      ["backend-dev"],
    );
    assert.deepEqual(team.hidden, ["reviewer", "Explore"]);
  });

  test("un agent réglé mais non détecté rejoint l’équipe", () => {
    const team = buildTeam([], {
      agents: { Explore: { role: "Explore le code" } },
    });
    assert.deepEqual(
      team.members.map((m) => m.type),
      ["Explore"],
    );
  });

  test("Claude se règle avec la clé claude et n’est pas un membre", () => {
    const team = buildTeam([{ name: "claude", description: "" }], {
      agents: { claude: { nom: "Chef", couleur: "#000000" } },
    });
    assert.equal(team.members.length, 0);
    assert.equal(team.claude.name, "Chef");
    assert.equal(team.claude.look.top, "#000000");
  });
});

describe("exemple fourni", () => {
  test("exemples/sidy-office.json est valide et respecte l’ordre", () => {
    const { config, error } = loadConfig(
      path.join(__dirname, "..", "exemples", "sidy-office.json"),
    );
    assert.equal(error, null);
    const team = buildTeam([], config);
    assert.deepEqual(
      team.members.map((m) => m.type),
      config.ordre,
    );
    assert.equal(team.claude.look.tie, "#E5B637");
  });
});

describe("configs", () => {
  test("fichier absent : pas d’erreur", () => {
    assert.deepEqual(loadConfig(path.join(home, "absent.json")), {
      config: {},
      error: null,
    });
  });

  test("JSON invalide : erreur lisible", () => {
    const file = path.join(home, "cassé.json");
    write(file, "{ titre: ");
    assert.match(loadConfig(file).error, /n'est pas un JSON valide/);
  });

  test("la config du projet complète la globale, agent par agent", () => {
    const merged = mergeConfigs([
      { titre: "Global", agents: { a: { couleur: "#111111", role: "A" } } },
      { agents: { a: { role: "A projet" } } },
    ]);
    assert.equal(merged.titre, "Global");
    assert.deepEqual(merged.agents.a, { couleur: "#111111", role: "A projet" });
  });

  test("resolveTeam assemble détection et configs", () => {
    write(path.join(home, ".claude/agents/qa.md"), agentMd("qa", "Teste."));
    write(
      path.join(home, ".claude/sidy-office.json"),
      JSON.stringify({ titre: "Équipe" }),
    );
    const projet = path.join(home, "p");
    write(
      path.join(projet, ".claude/sidy-office.json"),
      JSON.stringify({ agents: { qa: { nom: "QA" } } }),
    );
    const { team, errors } = resolveTeam({ homeDir: home, cwds: [projet] });
    assert.deepEqual(errors, []);
    assert.equal(team.title, "Équipe");
    assert.equal(team.members[0].name, "QA");
  });
});
