"use strict";

/**
 * Trouve les agents installés en lisant leurs fichiers Markdown :
 * - agents personnels : ~/.claude/agents/*.md
 * - agents des plugins installés : ~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/agents/*.md
 * - agents des projets ouverts : <projet>/.claude/agents/*.md
 * Seuls le nom et la description sont lus.
 */

const fs = require("node:fs");
const path = require("node:path");

const MAX_PLUGIN_DEPTH = 5;
const MAX_PARENT_LEVELS = 6;
const AGENTS_DIR = "agents";
const SOURCE_USER = "personnel";
const SOURCE_PLUGIN = "plugin";
const SOURCE_PROJECT = "projet";

function frontmatterOf(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  return match ? match[1].split(/\r?\n/) : null;
}

function cleanValue(value) {
  return value.trim().replace(/^(['"])(.*)\1$/, "$2");
}

/** Lit `name` et `description` d'un frontmatter YAML simple (valeur sur une ligne ou bloc `>` / `|`). */
function parseAgentFile(text) {
  const lines = frontmatterOf(text);
  if (!lines) {
    return null;
  }
  const fields = {};
  for (let i = 0; i < lines.length; i += 1) {
    const match = /^(name|description):\s*(.*)$/.exec(lines[i]);
    if (!match) {
      continue;
    }
    const [, key, raw] = match;
    if (/^[>|][-+]?\s*$/.test(raw)) {
      const block = [];
      while (
        i + 1 < lines.length &&
        (/^\s+\S/.test(lines[i + 1]) || lines[i + 1].trim() === "")
      ) {
        i += 1;
        block.push(lines[i].trim());
      }
      fields[key] = block.join(" ").replace(/\s+/g, " ").trim();
    } else {
      fields[key] = cleanValue(raw);
    }
  }
  if (!fields.name) {
    return null;
  }
  return { name: fields.name, description: fields.description || "" };
}

function readAgentsDir(dir, source, extra = {}) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const agents = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }
    try {
      const parsed = parseAgentFile(
        fs.readFileSync(path.join(dir, entry.name), "utf8"),
      );
      if (parsed) {
        agents.push({ ...parsed, source, ...extra });
      }
    } catch {
      // fichier illisible : on l'ignore
    }
  }
  return agents;
}

/** Plugins activés dans ~/.claude/settings.json (null si l'information manque). */
function enabledPlugins(claudeDir) {
  try {
    const settings = JSON.parse(
      fs.readFileSync(path.join(claudeDir, "settings.json"), "utf8"),
    );
    if (
      !settings.enabledPlugins ||
      typeof settings.enabledPlugins !== "object"
    ) {
      return null;
    }
    const names = Object.entries(settings.enabledPlugins)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key.split("@")[0]);
    return new Set(names);
  } catch {
    return null;
  }
}

function findAgentDirs(root, depth, found = []) {
  if (depth > MAX_PLUGIN_DEPTH) {
    return found;
  }
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (
      !entry.isDirectory() ||
      entry.name === "node_modules" ||
      entry.name.startsWith(".")
    ) {
      continue;
    }
    const full = path.join(root, entry.name);
    if (entry.name === AGENTS_DIR) {
      found.push(full);
    } else {
      findAgentDirs(full, depth + 1, found);
    }
  }
  return found;
}

function pluginAgents(claudeDir) {
  const cache = path.join(claudeDir, "plugins", "cache");
  const enabled = enabledPlugins(claudeDir);
  const agents = [];
  for (const dir of findAgentDirs(cache, 0)) {
    // cache/<marketplace>/<plugin>/[<version>/]agents
    const parts = path.relative(cache, dir).split(path.sep);
    const plugin = parts.length >= 3 ? parts[1] : parts[0];
    if (enabled && !enabled.has(plugin)) {
      continue;
    }
    agents.push(...readAgentsDir(dir, SOURCE_PLUGIN, { plugin }));
  }
  return agents;
}

/** Dossier .claude du projet qui contient `cwd` (en remontant les parents), ou null. */
function projectClaudeDir(cwd, homeDir) {
  let dir = cwd;
  for (let level = 0; level < MAX_PARENT_LEVELS && dir; level += 1) {
    if (dir === homeDir) {
      return null;
    }
    const candidate = path.join(dir, ".claude");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
  return null;
}

function projectAgents(cwd, homeDir) {
  const claudeDir = projectClaudeDir(cwd, homeDir);
  if (!claudeDir) {
    return [];
  }
  return readAgentsDir(path.join(claudeDir, AGENTS_DIR), SOURCE_PROJECT, {
    project: path.basename(path.dirname(claudeDir)),
  });
}

/**
 * Retourne la liste des agents installés, sans doublon (le premier trouvé l'emporte :
 * projet, puis personnel, puis plugin).
 */
function discoverAgents({ homeDir, cwds = [] }) {
  const claudeDir = path.join(homeDir, ".claude");
  const all = [
    ...cwds.flatMap((cwd) => projectAgents(cwd, homeDir)),
    ...readAgentsDir(path.join(claudeDir, AGENTS_DIR), SOURCE_USER),
    ...pluginAgents(claudeDir),
  ];
  const byName = new Map();
  for (const agent of all) {
    if (!byName.has(agent.name)) {
      byName.set(agent.name, agent);
    }
  }
  return [...byName.values()];
}

module.exports = { discoverAgents, parseAgentFile, projectClaudeDir };
