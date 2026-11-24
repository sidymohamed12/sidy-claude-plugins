#!/usr/bin/env node
// Calcule la version de l'image à publier à chaque push sur dev, preprod, main ou prod.
// À copier dans .github/scripts/next-version.mjs. Sans dépendance, lit seulement l'historique git.
//
// Règles (Conventional Commits) :
//   - `feat` => version mineure ; `type!:` ou « BREAKING CHANGE » => majeure ; le reste => correctif.
//   - la base est le dernier tag stable vX.Y.Z atteignable depuis HEAD (0.0.0 s'il n'y en a pas).
//   - main et prod : vX.Y.Z ; preprod : vX.Y.Z-rc.N ; dev : vX.Y.Z-dev.N (N repart de 1 à chaque X.Y.Z).
//   - sur main ou prod, sans nouveau commit depuis le dernier tag stable, on réutilise ce tag.
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const BRANCH_KINDS = { main: 'release', prod: 'release', preprod: 'rc', dev: 'dev' };

const STABLE = /^v(\d+)\.(\d+)\.(\d+)$/;
const HEADER = /^(\w[\w-]*)(?:\([^)]*\))?(!)?\s?:\s/;
const PATCH_TYPES = new Set(['fix', 'hotfix', 'hot-fix', 'core', 'refactor', 'perf', 'revert']);

export function parseSemver(tag) {
  const m = STABLE.exec(tag);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function compare(a, b) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

export function latestStable(tags) {
  return tags
    .map((tag) => ({ tag, v: parseSemver(tag) }))
    .filter((t) => t.v)
    .sort((a, b) => compare(a.v, b.v))
    .at(-1) ?? null;
}

// Niveau de montée d'un commit : 'major' | 'minor' | 'patch'. Un type inconnu ne monte que d'un correctif.
export function bumpOf({ subject, body = '' }) {
  const m = HEADER.exec(subject);
  if (m?.[2] || /^BREAKING[ -]CHANGE:/m.test(body)) return 'major';
  if (m?.[1] === 'feat') return 'minor';
  if (m && PATCH_TYPES.has(m[1])) return 'patch';
  return 'patch';
}

export function highestBump(commits) {
  const order = { patch: 0, minor: 1, major: 2 };
  return commits.reduce((best, c) => (order[bumpOf(c)] > order[best] ? bumpOf(c) : best), 'patch');
}

function bump([major, minor, patch], level) {
  if (level === 'major') return [major + 1, 0, 0];
  if (level === 'minor') return [major, minor + 1, 0];
  return [major, minor, patch + 1];
}

// tags : tous les tags v* du dépôt (évite les doublons et sert aux compteurs).
// reachableTags : ceux atteignables depuis HEAD (la base de la montée de version).
// commits : commits non-fusion depuis le dernier tag stable atteignable.
export function nextVersion({ branch, tags, commits, reachableTags = tags }) {
  const kind = BRANCH_KINDS[branch];
  if (!kind) throw new Error(`Branche « ${branch} » non publiable (attendu : ${Object.keys(BRANCH_KINDS).join(', ')})`);

  const last = latestStable(reachableTags);
  if (kind === 'release' && last && commits.length === 0) {
    return { tag: last.tag, version: last.tag.slice(1), createGitTag: false, kind };
  }
  const next = bump(last ? last.v : [0, 0, 0], highestBump(commits)).join('.');

  if (kind === 'release') {
    const tag = `v${next}`;
    return { tag, version: next, createGitTag: !tags.includes(tag), kind };
  }
  const prefix = `v${next}-${kind}.`;
  const used = tags
    .filter((t) => t.startsWith(prefix))
    .map((t) => Number(t.slice(prefix.length)))
    .filter(Number.isInteger);
  const n = (used.length ? Math.max(...used) : 0) + 1;
  return { tag: `${prefix}${n}`, version: `${next}-${kind}.${n}`, createGitTag: true, kind };
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function readCommits(range) {
  const out = git(['log', '--no-merges', '--format=%s%x1f%b%x1e', ...range]);
  return out.split('\x1e').map((r) => r.trim()).filter(Boolean).map((r) => {
    const [subject, body = ''] = r.split('\x1f');
    return { subject: subject.trim(), body: body.trim() };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const branch = process.env.BRANCH;
  if (!branch) throw new Error('Variable BRANCH manquante');
  const lines = (out) => out.split('\n').filter(Boolean);
  const tags = lines(git(['tag', '--list', 'v*']));
  const reachableTags = lines(git(['tag', '--merged', 'HEAD', '--list', 'v*']));
  const base = latestStable(reachableTags);
  const commits = readCommits(base ? [`${base.tag}..HEAD`] : ['HEAD']);
  const result = nextVersion({ branch, tags, reachableTags, commits });
  const outputs = { tag: result.tag, version: result.version, create_git_tag: String(result.createGitTag), base: base?.tag ?? 'aucun' };
  for (const [k, v] of Object.entries(outputs)) console.log(`${k}=${v}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(outputs).map(([k, v]) => `${k}=${v}\n`).join(''));
  }
}
