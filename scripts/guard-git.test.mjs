import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { evaluate, splitCommands, tokenize } from '../plugins/sidy-dev/hooks/guard-git.mjs';

const HOOK = resolve('plugins/sidy-dev/hooks/guard-git.mjs');
const run = (command, branch = 'feat/x') => evaluate({ tool_name: 'Bash', tool_input: { command } }, { branch });
const blocked = (command, branch) => assert.ok(run(command, branch), `devrait être refusé : ${command}`);
const allowed = (command, branch) => assert.equal(run(command, branch), null, `devrait passer : ${command}`);

test('tokenize respecte les guillemets et sépare les commandes', () => {
  assert.deepEqual(tokenize('git commit -m "a && b; c"'), ['git', 'commit', '-m', 'a && b; c']);
  assert.deepEqual(splitCommands('git add a && git commit -m x; git push').map((c) => c[1]), ['add', 'commit', 'push']);
});

test('push vers main ou prod refusé sous toutes ses formes', () => {
  for (const c of ['git push origin main', 'git push origin prod', 'git push -u origin main', 'git push origin HEAD:main',
    'git push origin feat/x:prod', 'git push origin +main', 'git push origin refs/heads/main', 'git push origin :main',
    'git push origin --delete main', 'git -C /repo push origin main']) blocked(c);
});

test('push d\'une branche de tâche accepté', () => {
  allowed('git push -u origin feat/auth-revocation-jwt');
  allowed('git push origin fix/x');
  allowed('git push');
  allowed('git push origin HEAD');
  allowed('git push --force-with-lease origin feat/x');
});

test('push sans branche ou HEAD depuis main ou prod refusé', () => {
  blocked('git push', 'main');
  blocked('git push origin', 'prod');
  blocked('git push origin HEAD', 'main');
});

test('force-push, --all, --mirror refusés', () => {
  blocked('git push --force origin feat/x');
  blocked('git push -f origin feat/x');
  blocked('git push origin feat/x --force');
  blocked('git push --mirror');
  blocked('git push --all');
});

test('--no-verify refusé', () => {
  blocked('git commit --no-verify -m "x"');
  blocked('git push --no-verify');
  blocked('git commit -nm "x"');
  allowed('git commit -m "ajout du mode no-verify"');
});

test('commit, merge, rebase, reset, tag refusés sur main et prod, acceptés ailleurs', () => {
  for (const c of ['git commit -m "x"', 'git merge dev', 'git rebase dev', 'git reset --hard HEAD~1', 'git cherry-pick abc', 'git tag v1.0.0']) {
    blocked(c, 'main');
    blocked(c, 'prod');
    allowed(c, 'feat/x');
    allowed(c, 'dev');
  }
});

test('lire main reste possible', () => {
  allowed('git pull', 'main');
  allowed('git log --oneline', 'main');
  allowed('git diff main...HEAD', 'feat/x');
  allowed('git switch main', 'feat/x');
});

test('le changement de branche dans la même chaîne est suivi', () => {
  blocked('git switch main && git commit -m x', 'feat/x');
  allowed('git switch -c feat/y && git commit -m x', 'main');
  allowed('git checkout -b fix/z; git commit -m x', 'prod');
  blocked('git checkout main; git merge dev', 'feat/x');
});

test('supprimer ou renommer main/prod refusé', () => {
  blocked('git branch -D main');
  blocked('git branch -f prod abc');
  allowed('git branch -d feat/fini');
  blocked('git update-ref refs/heads/main abc');
});

test('gh : fusion de PR et PR vers main/prod refusées', () => {
  blocked('gh pr merge 12 --squash');
  blocked('gh pr create --base main --title x');
  blocked('gh pr create -B prod --title x');
  blocked('gh pr create --base=main');
  allowed('gh pr create --base dev --assignee sidymohamed12 --title x');
  blocked('gh api repos/o/r/pulls/3/merge -X PUT');
  blocked('gh api repos/o/r/pulls -f base=main -f head=x');
  allowed('gh api repos/o/r/pulls -f base=dev -f head=x');
  blocked('gh api -X DELETE repos/o/r/git/refs/heads/main');
});

test('commande enveloppée dans bash -c', () => {
  blocked('bash -c "git push origin main"');
  blocked('sh -c \'git push --force origin x\'');
});

test('un message de commit qui parle de push main n\'est pas une commande', () => {
  allowed('git commit -m "docs: ne jamais faire git push origin main"');
  allowed('echo "git push origin main"');
});

test('la dérogation ne peut pas être posée dans la commande', () => {
  blocked('SIDY_GIT_ALLOW_PROTECTED=1 git push origin main');
});

test('la dérogation de l\'environnement de Sidy est respectée', () => {
  assert.equal(evaluate({ tool_name: 'Bash', tool_input: { command: 'git push origin main' } }, { branch: 'main', allow: true }), null);
});

test('un outil autre que Bash n\'est jamais bloqué', () => {
  assert.equal(evaluate({ tool_name: 'Write', tool_input: { command: 'git push origin main' } }, { branch: 'main' }), null);
});

function hook(event, env = {}) {
  return spawnSync('node', [HOOK], { input: JSON.stringify(event), encoding: 'utf8', env: { ...process.env, ...env } });
}

test('processus : code 2 + message sur main, code 0 sur une branche de tâche', () => {
  const dir = mkdtempSync(join(tmpdir(), 'guard-'));
  const g = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8' });
  g('init', '-q', '-b', 'main');
  const event = (command) => ({ tool_name: 'Bash', cwd: dir, tool_input: { command } });

  const onMain = hook(event('git commit -m "x"'));
  assert.equal(onMain.status, 2);
  assert.match(onMain.stderr, /garde-fou Git/);

  g('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init');
  g('switch', '-q', '-c', 'feat/essai');
  assert.equal(hook(event('git commit -m "x"')).status, 0);
  assert.equal(hook(event('git push origin main')).status, 2);
  assert.equal(hook(event('git push origin main'), { SIDY_GIT_ALLOW_PROTECTED: '1' }).status, 0);
});

test('processus : entrée illisible ne bloque pas', () => {
  const r = spawnSync('node', [HOOK], { input: 'pas du json', encoding: 'utf8' });
  assert.equal(r.status, 0);
});
