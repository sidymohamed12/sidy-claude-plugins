#!/usr/bin/env node
// Vérifie, sur une PR, le nom de la branche, la branche cible et les messages de commit.
// À copier dans .github/scripts/check-conventions.mjs (workflow : conventions.yml). Sans dépendance.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const TYPES = ['feat', 'fix', 'hot-fix', 'core', 'refactor', 'perf', 'test', 'docs', 'ci', 'chore'];
export const PROTECTED = ['main', 'prod'];
const PROMOTERS = ['dev', 'preprod']; // seules branches qui peuvent viser main ou prod (promotion faite par Sidy)

const BRANCH = new RegExp(`^(${TYPES.join('|')})/[a-z0-9]+(-[a-z0-9]+)*$`);
const SUBJECT = new RegExp(`^(${[...TYPES, 'revert'].join('|')})\\([a-z0-9]+(-[a-z0-9]+)*\\)!?: \\S`);
const MAX_SUBJECT = 72;

export function checkBranchName(head) {
  if (PROMOTERS.includes(head) || head.startsWith('dependabot/')) return [];
  return BRANCH.test(head)
    ? []
    : [`Nom de branche « ${head} » invalide. Attendu : type/description-courte (types : ${TYPES.join(', ')}), minuscules et tirets.`];
}

export function checkTarget(head, base) {
  if (PROTECTED.includes(base) && !PROMOTERS.includes(head)) {
    return [`La PR vise ${base}. Une branche de tâche cible dev ou preprod ; ${base} est alimentée par Sidy.`];
  }
  return [];
}

export function checkSubject(subject, label = 'Commit') {
  if (subject.startsWith('Merge ')) return [];
  const problems = [];
  if (!SUBJECT.test(subject)) problems.push(`${label} « ${subject} » : format attendu type(feature): réalisation.`);
  if (subject.length > MAX_SUBJECT) problems.push(`${label} « ${subject.slice(0, 40)}… » : ${subject.length} caractères, ${MAX_SUBJECT} au plus.`);
  return problems;
}

export function check({ head, base, title, subjects }) {
  const bot = head.startsWith('dependabot/');
  return [
    ...checkBranchName(head),
    ...checkTarget(head, base),
    ...(bot || PROMOTERS.includes(head) ? [] : checkSubject(title, 'Titre de PR')),
    ...(bot || PROMOTERS.includes(head) ? [] : subjects.flatMap((s) => checkSubject(s))),
  ];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { HEAD_REF, BASE_REF, PR_TITLE, BASE_SHA, HEAD_SHA } = process.env;
  if (!HEAD_REF || !BASE_REF || !BASE_SHA || !HEAD_SHA) throw new Error('Variables HEAD_REF, BASE_REF, BASE_SHA, HEAD_SHA attendues');
  const log = execFileSync('git', ['log', '--no-merges', '--format=%s', `${BASE_SHA}..${HEAD_SHA}`], { encoding: 'utf8' });
  const problems = check({ head: HEAD_REF, base: BASE_REF, title: PR_TITLE ?? '', subjects: log.split('\n').filter(Boolean) });
  if (problems.length) {
    for (const p of problems) console.error(`::error::${p.replaceAll('\n', ' ')}`);
    process.exit(1);
  }
  console.log('Conventions Git respectées.');
}
