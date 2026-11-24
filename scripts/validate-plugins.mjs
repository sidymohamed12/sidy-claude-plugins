#!/usr/bin/env node
// Vérifie la cohérence du dépôt de plugins : manifestes, versions, nombres d'agents et de skills annoncés,
// en-têtes des agents et des skills. Sans dépendance. Usage : node scripts/validate-plugins.mjs [racine]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function readJson(path, errors) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    errors.push(`${path} : JSON illisible (${e.message})`);
    return null;
  }
}

// Valeurs des clés placées en colonne 0 dans l'en-tête `---` d'un fichier Markdown.
export function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return fields;
}

function names(dir, pick) {
  return existsSync(dir) ? readdirSync(dir).map(pick).filter(Boolean).sort() : [];
}

// « 4 skills (a, b) et 7 agents (c, d) » : compare le nombre et la liste aux dossiers réels.
function checkAnnouncement(label, text, actual, errors) {
  for (const [kind, found] of [['skills', actual.skills], ['agents', actual.agents]]) {
    const m = new RegExp(`(\\d+) ${kind} \\(([^)]*)\\)`).exec(text);
    if (!m) continue;
    const listed = m[2].split(',').map((s) => s.trim()).filter(Boolean).sort();
    if (Number(m[1]) !== found.length) {
      errors.push(`${label} : annonce ${m[1]} ${kind}, le plugin en a ${found.length}`);
    }
    if (listed.join() !== found.join()) {
      const missing = found.filter((n) => !listed.includes(n));
      const extra = listed.filter((n) => !found.includes(n));
      errors.push(`${label} : liste des ${kind} différente (absents : ${missing.join(', ') || '-'} ; en trop : ${extra.join(', ') || '-'})`);
    }
  }
}

export function validate(root) {
  const errors = [];
  const marketplace = readJson(join(root, '.claude-plugin/marketplace.json'), errors);
  if (!marketplace) return errors;

  for (const entry of marketplace.plugins ?? []) {
    const dir = join(root, entry.source);
    if (!existsSync(dir)) {
      errors.push(`marketplace : source introuvable pour ${entry.name} (${entry.source})`);
      continue;
    }
    const manifest = readJson(join(dir, '.claude-plugin/plugin.json'), errors);
    if (!manifest) continue;
    if (manifest.name !== entry.name) errors.push(`${entry.name} : plugin.json porte le nom « ${manifest.name} »`);
    if (manifest.version !== entry.version) {
      errors.push(`${entry.name} : version ${manifest.version} dans plugin.json, ${entry.version} dans marketplace.json`);
    }

    const agents = names(join(dir, 'agents'), (f) => (f.endsWith('.md') ? f.slice(0, -3) : null));
    const skills = names(join(dir, 'skills'), (f) => (existsSync(join(dir, 'skills', f, 'SKILL.md')) ? f : null));
    const actual = { agents, skills };
    checkAnnouncement(`${entry.name} (plugin.json)`, manifest.description ?? '', actual, errors);
    checkAnnouncement(`${entry.name} (marketplace.json)`, entry.description ?? '', actual, errors);

    for (const a of agents) {
      const fm = frontmatter(readFileSync(join(dir, 'agents', `${a}.md`), 'utf8'));
      if (!fm) errors.push(`${entry.name}/agents/${a}.md : en-tête absent`);
      else {
        if (fm.name !== a) errors.push(`${entry.name}/agents/${a}.md : name « ${fm.name} » différent du fichier`);
        if (fm.description === undefined) errors.push(`${entry.name}/agents/${a}.md : description absente`);
        if (!fm.tools) errors.push(`${entry.name}/agents/${a}.md : tools absent`);
      }
    }
    for (const s of skills) {
      const fm = frontmatter(readFileSync(join(dir, 'skills', s, 'SKILL.md'), 'utf8'));
      if (!fm) errors.push(`${entry.name}/skills/${s}/SKILL.md : en-tête absent`);
      else {
        if (fm.name !== s) errors.push(`${entry.name}/skills/${s}/SKILL.md : name « ${fm.name} » différent du dossier`);
        if (fm.description === undefined) errors.push(`${entry.name}/skills/${s}/SKILL.md : description absente`);
      }
    }

    // Le README annonce « N skills et M agents » pour le plugin du même nom que sa section.
    if (entry.name === 'sidy-dev' && existsSync(join(root, 'README.md'))) {
      const readme = readFileSync(join(root, 'README.md'), 'utf8');
      for (const m of readme.matchAll(/(\d+) skills et (?:ses )?(\d+) agents/g)) {
        if (Number(m[1]) !== skills.length || Number(m[2]) !== agents.length) {
          errors.push(`README.md : « ${m[0]} », le plugin a ${skills.length} skills et ${agents.length} agents`);
        }
      }
    }
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? '.');
  const errors = validate(root);
  if (errors.length) {
    console.error(`${errors.length} problème(s) :\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  console.log('Dépôt de plugins cohérent.');
}
