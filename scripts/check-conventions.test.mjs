import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { check, checkBranchName, checkSubject, checkTarget } from '../plugins/sidy-dev/skills/git-sidy/templates/check-conventions.mjs';

const SCRIPT = 'plugins/sidy-dev/skills/git-sidy/templates/check-conventions.mjs';

test('noms de branche valides et invalides', () => {
  for (const ok of ['feat/auth-revocation-jwt', 'fix/doublon', 'hot-fix/paiement-503', 'core/profils-yaml', 'ci/publication-image', 'dev', 'preprod', 'dependabot/maven/x-1']) {
    assert.deepEqual(checkBranchName(ok), [], ok);
  }
  for (const ko of ['feature/x', 'Feat/x', 'feat/Auth', 'feat/', 'feat/a b', 'fix_x', 'main', 'sidy-test', 'feat/x--y', 'feat/été']) {
    assert.equal(checkBranchName(ko).length, 1, ko);
  }
});

test('la cible main ou prod est refusée sauf promotion depuis dev ou preprod', () => {
  assert.equal(checkTarget('feat/x', 'main').length, 1);
  assert.equal(checkTarget('fix/x', 'prod').length, 1);
  assert.deepEqual(checkTarget('preprod', 'main'), []);
  assert.deepEqual(checkTarget('dev', 'preprod'), []);
  assert.deepEqual(checkTarget('feat/x', 'dev'), []);
});

test('messages de commit', () => {
  for (const ok of ['feat(auth): révoquer un jeton JWT', 'fix(ordonnance): empêcher la double délivrance', 'feat(api)!: changer le contrat', 'hot-fix(paiement): corriger le 503', 'Merge branch dev']) {
    assert.deepEqual(checkSubject(ok), [], ok);
  }
  for (const ko of ['update', 'wip', 'feat: sans feature', 'feat(Auth): majuscule', 'fix(auth) : espace avant', 'divers(auth): type inconnu', 'feat(auth):', `feat(auth): ${'x'.repeat(70)}`]) {
    assert.ok(checkSubject(ko).length >= 1, ko);
  }
});

test('check agrège les problèmes', () => {
  assert.deepEqual(check({ head: 'feat/x', base: 'dev', title: 'feat(x): y', subjects: ['feat(x): y', 'fix(x): z'] }), []);
  const p = check({ head: 'sidy-test', base: 'main', title: 'maj', subjects: ['wip'] });
  assert.equal(p.length, 4);
});

test('promotion dev → main : pas de contrôle des commits', () => {
  assert.deepEqual(check({ head: 'dev', base: 'main', title: 'Release', subjects: ['wip', 'update'] }), []);
});

test('CLI : code 1 avec annotation, code 0 quand tout est bon', () => {
  const env = { ...process.env, HEAD_REF: 'sidy-test', BASE_REF: 'main', PR_TITLE: 'x', BASE_SHA: 'HEAD', HEAD_SHA: 'HEAD' };
  const ko = spawnSync('node', [SCRIPT], { encoding: 'utf8', env });
  assert.equal(ko.status, 1);
  assert.match(ko.stderr, /::error::/);
  const ok = spawnSync('node', [SCRIPT], { encoding: 'utf8', env: { ...env, HEAD_REF: 'feat/x', BASE_REF: 'dev', PR_TITLE: 'feat(x): y' } });
  assert.equal(ok.status, 0, ok.stderr);
});
