"use strict";

/**
 * Compose l'équipe affichée : agents détectés + réglages de sidy-office.json.
 * Chaque agent sans réglage reçoit une apparence calculée à partir de son nom :
 * le même nom donne toujours le même personnage.
 */

const fs = require("node:fs");
const path = require("node:path");
const { discoverAgents, projectClaudeDir } = require("./discovery");

const CONFIG_NAME = "sidy-office.json";
const MAIN_TYPE = "claude";
const DEFAULT_TITLE = "Le bureau des agents";
const ROLE_MAX = 60;
const INK = "#1A2233";
const TIE = "#E5B637";
const NO_ACCESSORY = "aucun";
const CUTS = ["courte", "longue", "afro", "rase"];
const DEFAULT_CUT = "courte";
const HEX = /^#[0-9a-f]{6}$/i;

const SKINS = ["#5E3A26", "#8D5A3B", "#A86B45", "#C68A5E", "#E0AC85"];
const HAIRS = [
  "#141414",
  "#1E1E1E",
  "#2B2118",
  "#3B2A20",
  "#5A4632",
  "#7A2E1F",
];
const TOPS = [
  "#2E9E5B",
  "#E8618C",
  "#7A4FD8",
  "#1F8A8A",
  "#2F6FEB",
  "#D64545",
  "#E07B00",
  "#232A36",
  "#3F7D3A",
  "#B03A7A",
  "#0E6BA8",
  "#5B6B82",
];
const PANTS = ["#2F3A4C", "#28334A", "#34405A", "#1F2633", "#3A4558"];
const ACCESSORIES = [
  "casque",
  "lunettes",
  "casquette",
  "capuche",
  "chignon",
  "cravate",
];
// « aucun » revient plus souvent pour que l'équipe ne soit pas surchargée
const GENERATED_ACCESSORIES = [
  ...ACCESSORIES.filter((a) => a !== "cravate"),
  NO_ACCESSORY,
  NO_ACCESSORY,
];

const CLAUDE_DEFAULT = {
  name: "Claude",
  role: "Chef d'orchestre",
  look: {
    skin: SKINS[3],
    hair: "#2B2118",
    top: "#2F4B8F",
    pants: "#28334A",
    tie: TIE,
  },
};

/** Hachage FNV-1a 32 bits. */
function hash(text) {
  let h = 0x811c9dc5;
  for (const char of String(text)) {
    h ^= char.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function pick(list, seed, shift) {
  return list[(seed >>> shift) % list.length];
}

function darken(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, v - 40);
  const r = ch(n >> 16);
  const g = ch((n >> 8) & 0xff);
  const b = ch(n & 0xff);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function applyAccessory(look, accessory) {
  const result = { ...look };
  switch (accessory) {
    case "casque":
      result.headphones = INK;
      break;
    case "lunettes":
      result.glasses = true;
      break;
    case "casquette":
      result.cap = INK;
      break;
    case "capuche":
      result.hood = darken(look.top);
      break;
    case "chignon":
      result.bun = true;
      break;
    case "cravate":
      result.tie = TIE;
      break;
    default:
      break;
  }
  return result;
}

/** Apparence déterministe pour un nom d'agent. */
function generateLook(name) {
  const seed = hash(name);
  const look = {
    skin: pick(SKINS, seed, 0),
    hair: pick(HAIRS, seed, 3),
    top: pick(TOPS, seed, 7),
    pants: pick(PANTS, seed, 12),
  };
  return applyAccessory(look, pick(GENERATED_ACCESSORIES, seed, 17));
}

function skinFrom(value) {
  if (Number.isInteger(value) && value >= 1 && value <= SKINS.length) {
    return SKINS[value - 1];
  }
  return typeof value === "string" && HEX.test(value) ? value : null;
}

function accessoriesFrom(value) {
  const list = Array.isArray(value) ? value : [value];
  return list.filter((a) => ACCESSORIES.includes(a) || a === NO_ACCESSORY);
}

/** Style : coupe de cheveux, pantalon, rayures. Les valeurs inconnues sont ignorées. */
function applyStyle(look, settings) {
  const result = { ...look };
  if (CUTS.includes(settings.coupe) && settings.coupe !== DEFAULT_CUT) {
    result.cut = settings.coupe;
  } else if (settings.coupe === DEFAULT_CUT) {
    delete result.cut;
  }
  if (HEX.test(settings.pantalon || "")) {
    result.pants = settings.pantalon;
  }
  if (HEX.test(settings.rayures || "")) {
    result.stripe = settings.rayures;
  } else if (settings.rayures === false) {
    delete result.stripe;
  }
  return result;
}

/** Applique les réglages d'apparence du fichier de config sur une apparence de base. */
function customizeLook(base, settings) {
  const look = { ...base };
  if (HEX.test(settings.couleur || "")) {
    look.top = settings.couleur;
  }
  if (HEX.test(settings.cheveux || "")) {
    look.hair = settings.cheveux;
  }
  const skin = skinFrom(settings.peau);
  if (skin) {
    look.skin = skin;
  }
  if (settings.accessoire === undefined) {
    return applyStyle(look, settings);
  }
  // un accessoire choisi remplace ceux de l'apparence générée
  const plain = {
    skin: look.skin,
    hair: look.hair,
    top: look.top,
    pants: look.pants,
  };
  const dressed = accessoriesFrom(settings.accessoire).reduce(
    applyAccessory,
    plain,
  );
  return applyStyle(dressed, settings);
}

const KNOWN_KEYS = new Set([
  "nom",
  "role",
  "couleur",
  "cheveux",
  "peau",
  "accessoire",
  "coupe",
  "pantalon",
  "rayures",
  "repos",
  "masquer",
]);

/** Zones de l'espace détente (même liste que public/zones.js : un test les compare). */
const ZONE_IDS = ["tele", "tennis-de-table"];

/** Zones à afficher : toutes par défaut, aucune avec une liste vide, sinon celles qui existent. */
function pickZones(value) {
  if (!Array.isArray(value)) {
    return [...ZONE_IDS];
  }
  return [...new Set(value)].filter((id) => ZONE_IDS.includes(id));
}

/** Valeurs du fichier de réglages qui ne seront pas appliquées, en phrases lisibles. */
function configWarnings(config) {
  const warnings = [];
  if (config.zones !== undefined) {
    if (!Array.isArray(config.zones)) {
      warnings.push(
        `« zones » doit être une liste, par exemple ["tele", "tennis-de-table"].`,
      );
    } else {
      for (const id of config.zones) {
        if (!ZONE_IDS.includes(id)) {
          warnings.push(
            `zones : « ${id} » n'existe pas (zones connues : ${ZONE_IDS.join(", ")}).`,
          );
        }
      }
    }
  }
  if (config.repos !== undefined && typeof config.repos !== "boolean") {
    warnings.push('« repos » doit valoir true ou false.');
  }
  const agents =
    config.agents && typeof config.agents === "object" ? config.agents : {};
  for (const [type, s] of Object.entries(agents)) {
    if (!s || typeof s !== "object") {
      continue;
    }
    const bad = (key, why) => warnings.push(`${type} : « ${key} » ${why}.`);
    for (const key of Object.keys(s)) {
      if (!KNOWN_KEYS.has(key)) {
        bad(key, "n'est pas un réglage connu");
      }
    }
    for (const key of ["couleur", "cheveux", "pantalon"]) {
      if (s[key] !== undefined && !HEX.test(s[key])) {
        bad(key, "attend une couleur comme #2E9E5B");
      }
    }
    if (s.rayures !== undefined && s.rayures !== false && !HEX.test(s.rayures)) {
      bad("rayures", "attend une couleur comme #FFFFFF, ou false");
    }
    if (s.peau !== undefined && !skinFrom(s.peau)) {
      bad("peau", `attend un nombre de 1 à ${SKINS.length} ou une couleur`);
    }
    if (s.coupe !== undefined && !CUTS.includes(s.coupe)) {
      bad("coupe", `attend ${CUTS.join(", ")}`);
    }
    if (s.accessoire !== undefined) {
      const list = Array.isArray(s.accessoire) ? s.accessoire : [s.accessoire];
      for (const a of list) {
        if (!ACCESSORIES.includes(a) && a !== NO_ACCESSORY) {
          bad("accessoire", `« ${a} » est inconnu (${ACCESSORIES.join(", ")}, ${NO_ACCESSORY})`);
        }
      }
    }
    if (s.repos !== undefined && typeof s.repos !== "boolean") {
      bad("repos", "doit valoir true ou false");
    }
  }
  return warnings;
}

/** Première phrase de la description, raccourcie. */
function roleFrom(description) {
  const first = String(description || "")
    .split(/(?<=[.!?])\s/)[0]
    .replace(/[.!?]$/, "")
    .trim();
  if (first.length <= ROLE_MAX) {
    return first;
  }
  const cut = first.slice(0, ROLE_MAX);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/**
 * Lit un fichier sidy-office.json. Retourne { config, error }.
 * Un fichier absent n'est pas une erreur.
 */
function loadConfig(file) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return { config: {}, error: null };
  }
  try {
    const config = JSON.parse(text);
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      return { config: {}, error: `${file} doit contenir un objet JSON.` };
    }
    return { config, error: null };
  } catch (err) {
    return {
      config: {},
      error: `${file} n'est pas un JSON valide : ${err.message}`,
    };
  }
}

function settingsOf(config, type) {
  const agents =
    config.agents && typeof config.agents === "object" ? config.agents : {};
  const settings = agents[type];
  return settings && typeof settings === "object" ? settings : {};
}

function buildMember(type, settings, discovered) {
  return {
    type,
    name:
      typeof settings.nom === "string" && settings.nom ? settings.nom : type,
    role:
      typeof settings.role === "string"
        ? settings.role
        : roleFrom(discovered && discovered.description),
    look: customizeLook(generateLook(type), settings),
    source: discovered ? discovered.source : "réglage",
    stays: settings.repos === false,
  };
}

function orderMembers(members, order) {
  const wanted = Array.isArray(order) ? order : [];
  const rank = (type) => {
    const i = wanted.indexOf(type);
    return i === -1 ? wanted.length : i;
  };
  return members.sort(
    (a, b) => rank(a.type) - rank(b.type) || a.type.localeCompare(b.type),
  );
}

/**
 * Construit l'équipe à afficher.
 * @param discovered agents trouvés par discovery.js
 * @param config contenu de sidy-office.json
 */
function buildTeam(discovered, config = {}) {
  const agents =
    config.agents && typeof config.agents === "object" ? config.agents : {};
  const hidden = Object.entries(agents)
    .filter(([, s]) => s && s.masquer === true)
    .map(([type]) => type);
  const byName = new Map(discovered.map((d) => [d.name, d]));
  const types = new Set([...byName.keys(), ...Object.keys(agents)]);
  types.delete(MAIN_TYPE);
  const members = [...types]
    .filter((type) => !hidden.includes(type))
    .map((type) =>
      buildMember(type, settingsOf(config, type), byName.get(type)),
    );

  const claudeSettings = settingsOf(config, MAIN_TYPE);
  const claude = {
    type: MAIN_TYPE,
    name: claudeSettings.nom || CLAUDE_DEFAULT.name,
    role:
      typeof claudeSettings.role === "string"
        ? claudeSettings.role
        : CLAUDE_DEFAULT.role,
    look: customizeLook(CLAUDE_DEFAULT.look, claudeSettings),
  };

  return {
    title:
      typeof config.titre === "string" && config.titre
        ? config.titre
        : DEFAULT_TITLE,
    claude,
    members: orderMembers(members, config.ordre),
    hidden,
    leisure: config.repos !== false,
    zones: pickZones(config.zones),
  };
}

/** Fusionne plusieurs configs : les suivantes complètent ou remplacent les précédentes, agent par agent. */
function mergeConfigs(configs) {
  return configs.reduce((merged, config) => {
    const result = { ...merged, ...config };
    const agents = { ...(merged.agents || {}) };
    for (const [type, settings] of Object.entries(config.agents || {})) {
      agents[type] = { ...(agents[type] || {}), ...settings };
    }
    result.agents = agents;
    return result;
  }, {});
}

/**
 * Lit tout ce qui définit l'équipe : agents installés, config globale,
 * puis config de chaque projet ouvert (le projet l'emporte).
 */
function resolveTeam({ homeDir, cwds = [], globalConfigFile }) {
  const configFile =
    globalConfigFile || path.join(homeDir, ".claude", CONFIG_NAME);
  const files = [configFile];
  for (const cwd of cwds) {
    const claudeDir = projectClaudeDir(cwd, homeDir);
    if (claudeDir) {
      files.push(path.join(claudeDir, CONFIG_NAME));
    }
  }
  const loaded = [...new Set(files)].map(loadConfig);
  const config = mergeConfigs(loaded.map((l) => l.config));
  const errors = [
    ...loaded.map((l) => l.error).filter(Boolean),
    ...configWarnings(config),
  ];
  const team = buildTeam(discoverAgents({ homeDir, cwds }), config);
  return { team, errors };
}

module.exports = {
  buildTeam,
  generateLook,
  customizeLook,
  configWarnings,
  ZONE_IDS,
  roleFrom,
  loadConfig,
  mergeConfigs,
  resolveTeam,
  DEFAULT_TITLE,
};
