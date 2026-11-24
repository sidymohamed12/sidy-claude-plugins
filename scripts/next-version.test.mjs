import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { bumpOf, highestBump, latestStable, nextVersion } from '../plugins/sidy-dev/skills/spring-boot-sidy/templates/ci/next-version.mjs';

const SCRIPT = resolve('plugins/sidy-dev/skills/spring-boot-sidy/templates/ci/next-version.mjs');
const c = (subject, body = '') => ({ subject, body });

test('bumpOf : feat monte le mineur, fix le correctif', () => {
  assert.equal(bumpOf(c('feat(auth): ajout de la révocation')), 'minor');
  assert.equal(bumpOf(c('fix(auth): correction du refresh')), 'patch');
  assert.equal(bumpOf(c('core(config): socle des profils')), 'patch');
});

test('bumpOf : accepte l\'espace avant les deux-points', () => {
  assert.equal(bumpOf(c('feat(auth) : ajout de la révocation')), 'minor');
  assert.equal(bumpOf(c('feat : ajout du skill design')), 'minor');
});

test('bumpOf : le point d\'exclamation et BREAKING CHANGE montent le majeur', () => {
  assert.equal(bumpOf(c('feat(api)!: nouvelle version de la réponse')), 'major');
  assert.equal(bumpOf(c('fix(api): changement', 'détail\n\nBREAKING CHANGE: le champ id devient uuid')), 'major');
});

test('bumpOf : un message hors convention ne monte que d\'un correctif', () => {
  assert.equal(bumpOf(c('mise à jour du readme')), 'patch');
});

test('highestBump retient le plus haut niveau', () => {
  assert.equal(highestBump([c('fix: a'), c('feat: b'), c('docs: c')]), 'minor');
  assert.equal(highestBump([c('fix: a'), c('feat!: b')]), 'major');
  assert.equal(highestBump([]), 'patch');
});

test('latestStable compare numériquement et ignore les préversions', () => {
  const tags = ['v1.9.0', 'v1.10.0', 'v1.11.0-dev.3', 'v0.2.0', 'latest'];
  assert.equal(latestStable(tags).tag, 'v1.10.0');
  assert.equal(latestStable(['v1.0.0-rc.1']), null);
});

test('main : v1.2.0 + feat => v1.3.0 et le tag git est à créer', () => {
  const r = nextVersion({ branch: 'main', tags: ['v1.2.0'], commits: [c('feat(x): y')] });
  assert.deepEqual([r.tag, r.createGitTag], ['v1.3.0', true]);
});

test('prod : mêmes règles que main', () => {
  const r = nextVersion({ branch: 'prod', tags: ['v1.2.0'], commits: [c('fix(x): y')] });
  assert.equal(r.tag, 'v1.2.1');
});

test('main sans nouveau commit : le dernier tag stable est réutilisé', () => {
  const r = nextVersion({ branch: 'main', tags: ['v1.2.0', 'v1.3.0-rc.1'], commits: [] });
  assert.deepEqual([r.tag, r.createGitTag], ['v1.2.0', false]);
});

test('main : le tag existe déjà => pas de nouveau tag git', () => {
  const r = nextVersion({ branch: 'main', tags: ['v1.2.0', 'v1.3.0'], reachableTags: ['v1.2.0'], commits: [c('feat: y')] });
  assert.deepEqual([r.tag, r.createGitTag], ['v1.3.0', false]);
});

test('dev : le compteur continue à partir des tags existants', () => {
  const tags = ['v1.2.0', 'v1.3.0-dev.1', 'v1.3.0-dev.2', 'v1.3.0-rc.1'];
  const r = nextVersion({ branch: 'dev', tags, commits: [c('feat: y')] });
  assert.equal(r.tag, 'v1.3.0-dev.3');
});

test('preprod : suffixe rc, compteur indépendant de dev', () => {
  const r = nextVersion({ branch: 'preprod', tags: ['v1.2.0', 'v1.3.0-dev.4'], commits: [c('feat: y')] });
  assert.equal(r.tag, 'v1.3.0-rc.1');
});

test('dev sans aucun tag : première préversion v0.1.0-dev.1', () => {
  const r = nextVersion({ branch: 'dev', tags: [], commits: [c('feat: premier')] });
  assert.equal(r.tag, 'v0.1.0-dev.1');
});

test('dev sans nouveau commit après une release : correctif suivant', () => {
  const r = nextVersion({ branch: 'dev', tags: ['v1.0.0'], commits: [] });
  assert.equal(r.tag, 'v1.0.1-dev.1');
});

test('une branche non publiable est refusée', () => {
  assert.throws(() => nextVersion({ branch: 'feat/x', tags: [], commits: [] }), /non publiable/);
});

// Test de bout en bout du CLI sur un vrai dépôt git temporaire.
function run(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } });
}
function commit(cwd, message) {
  writeFileSync(join(cwd, 'f.txt'), `${Math.random()}`);
  run(cwd, 'add', '-A');
  run(cwd, 'commit', '-q', '-m', message);
}
function cli(cwd, branch) {
  const out = execFileSync('node', [SCRIPT], { cwd, encoding: 'utf8', env: { ...process.env, BRANCH: branch } });
  return Object.fromEntries(out.trim().split('\n').map((l) => l.split('=')));
}

test('CLI : de la première version à la release, sur un vrai dépôt', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ver-'));
  run(dir, 'init', '-q', '-b', 'main');
  commit(dir, 'feat(auth): première fonctionnalité');
  assert.equal(cli(dir, 'dev').tag, 'v0.1.0-dev.1');
  run(dir, 'tag', 'v0.1.0-dev.1');
  commit(dir, 'fix(auth): correction');
  assert.equal(cli(dir, 'dev').tag, 'v0.1.0-dev.2');
  assert.equal(cli(dir, 'main').tag, 'v0.1.0');
  run(dir, 'tag', 'v0.1.0');
  assert.equal(cli(dir, 'main').create_git_tag, 'false');
  commit(dir, 'feat(pay)!: nouveau contrat');
  const next = cli(dir, 'preprod');
  assert.equal(next.tag, 'v1.0.0-rc.1');
  assert.equal(next.base, 'v0.1.0');
});
