#!/usr/bin/env node
// Garde-fou Git (hook PreToolUse sur Bash). Lit l'événement JSON sur stdin.
// Refuse (code 2, message sur stderr) les commandes qui modifient main ou prod, les force-push,
// --no-verify et la fusion de PR. Ce n'est PAS une frontière de sécurité (une commande très indirecte
// peut passer) : la vraie protection est la règle de protection de branche GitHub (voir git-sidy).
// Dérogation de Sidy : variable SIDY_GIT_ALLOW_PROTECTED=1 dans l'environnement de Claude Code,
// posée par lui avant de lancer la session. Inutile dans la commande : elle y est refusée.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const PROTECTED = ['main', 'prod'];
const SEPARATORS = new Set(['&&', '||', ';', '|', '&', '\n']);
const GLOBAL_OPTS_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace']);

// Découpe une ligne de shell en jetons (guillemets respectés) et en séparateurs de commandes.
export function tokenize(input) {
  const tokens = [];
  let cur = '';
  let started = false;
  let quote = null;
  const flush = () => {
    if (started) tokens.push(cur);
    cur = '';
    started = false;
  };
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === '\\' && quote === '"' && i + 1 < input.length) cur += input[++i];
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; started = true; continue; }
    if (ch === '\\' && i + 1 < input.length) { cur += input[++i]; started = true; continue; }
    if (ch === '\n' || ch === ';') { flush(); tokens.push(ch === ';' ? ';' : '\n'); continue; }
    if (ch === '&' || ch === '|') {
      flush();
      if (input[i + 1] === ch) { tokens.push(ch + ch); i++; } else tokens.push(ch);
      continue;
    }
    if (ch === ' ' || ch === '\t') { flush(); continue; }
    cur += ch;
    started = true;
  }
  flush();
  return tokens;
}

export function splitCommands(input) {
  const out = [];
  let cur = [];
  for (const t of tokenize(input)) {
    if (SEPARATORS.has(t)) { if (cur.length) out.push(cur); cur = []; } else cur.push(t);
  }
  if (cur.length) out.push(cur);
  return out;
}

const isProtected = (name) => PROTECTED.includes(name);
const stripRef = (ref) => ref.replace(/^\+/, '').replace(/^refs\/heads\//, '').replace(/^.*:/, '');

// Retire les affectations VAR=val de tête ; signale la dérogation posée dans la commande elle-même.
function stripEnv(words) {
  const env = [];
  let i = 0;
  while (i < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i])) env.push(words[i++]);
  return { env, rest: words.slice(i) };
}

// Trouve le sous-commande git et ses arguments (en sautant -C <dir>, -c k=v, --git-dir=…).
function gitParts(words) {
  let i = 1;
  while (i < words.length && words[i].startsWith('-')) {
    i += GLOBAL_OPTS_WITH_VALUE.has(words[i]) ? 2 : 1;
  }
  return { sub: words[i], args: words.slice(i + 1) };
}

// Regarde une commande simple. state.branch = branche courante (suivie entre les commandes d'une chaîne).
function checkSimple(words, state) {
  const { env, rest } = stripEnv(words);
  if (env.some((e) => e.startsWith('SIDY_GIT_ALLOW_PROTECTED='))) {
    return 'SIDY_GIT_ALLOW_PROTECTED ne se pose pas dans une commande : seule la personne qui lance la session peut le définir.';
  }
  if (!rest.length) return null;
  const bin = rest[0].split('/').pop();

  if (['bash', 'sh', 'zsh'].includes(bin)) {
    const c = rest.indexOf('-c');
    if (c !== -1 && rest[c + 1]) return checkCommandLine(rest[c + 1], state);
    return null;
  }
  if (bin === 'gh') return checkGh(rest);
  if (bin !== 'git') return null;

  const { sub, args } = gitParts(rest);
  const positional = args.filter((a) => !a.startsWith('-'));
  const has = (...flags) => args.some((a) => flags.includes(a));

  if (has('--no-verify') || (sub === 'commit' && args.some((a) => /^-[a-zA-Z]*n[a-zA-Z]*$/.test(a) && !a.startsWith('--')))) {
    return '--no-verify (ou -n sur commit) contourne les vérifications : interdit.';
  }

  if (sub === 'push') {
    if (has('--force', '-f') || args.some((a) => /^-[a-zA-Z]*f[a-zA-Z]*$/.test(a))) {
      return 'git push --force est interdit. Sur ta propre branche de tâche, utilise --force-with-lease.';
    }
    if (has('--mirror', '--all', '--prune')) return 'git push --mirror/--all/--prune est interdit : pousse seulement ta branche de tâche.';
    const refs = positional.slice(1); // le premier est le remote
    const deleting = has('--delete', '-d');
    const target = refs.map(stripRef);
    if (target.some(isProtected) || refs.some((r) => /^:?(refs\/heads\/)?(main|prod)$/.test(r.replace(/^\+/, '')))) {
      return `Push vers ${PROTECTED.join(' ou ')} interdit : ouvre une PR vers dev ou preprod, Sidy fusionne.`;
    }
    if (deleting && refs.some(isProtected)) return 'Suppression d\'une branche protégée interdite.';
    // « git push » ou « git push origin » sans branche : part de la branche courante.
    if (refs.length === 0 && isProtected(state.branch)) {
      return `Tu es sur ${state.branch} : push interdit. Crée une branche de tâche.`;
    }
    if (refs.length === 1 && refs[0] === 'HEAD' && isProtected(state.branch)) {
      return `HEAD est ${state.branch} : push interdit. Crée une branche de tâche.`;
    }
    return null;
  }

  if (['checkout', 'switch'].includes(sub)) {
    const create = args.findIndex((a) => ['-b', '-B', '-c', '-C', '--create', '--force-create'].includes(a));
    if (create !== -1 && args[create + 1]) state.branch = args[create + 1];
    else if (positional[0] && !args.includes('--') && !args.includes('-')) state.branch = positional[0];
    return null;
  }

  if (['commit', 'merge', 'rebase', 'cherry-pick', 'revert', 'am', 'pull', 'tag'].includes(sub) && isProtected(state.branch)) {
    if (sub === 'pull' && !has('--rebase') ) return null; // lire main à jour reste possible
    return `Tu es sur ${state.branch} : git ${sub} interdit. Crée d'abord une branche de tâche (git-sidy).`;
  }
  if (sub === 'reset' && isProtected(state.branch) && has('--hard', '--merge', '--keep')) {
    return `Tu es sur ${state.branch} : git reset interdit.`;
  }
  if (sub === 'branch' && (has('-D', '-d', '-f', '--force', '--delete', '-m', '-M')) && positional.some(isProtected)) {
    return 'Modifier ou supprimer une branche protégée est interdit.';
  }
  if (sub === 'update-ref' && positional.some((p) => /^refs\/heads\/(main|prod)$/.test(p))) {
    return 'update-ref sur une branche protégée est interdit.';
  }
  return null;
}

function checkGh(words) {
  const sub = words.slice(1).filter((w) => !w.startsWith('-'));
  const flag = (name) => {
    const i = words.findIndex((w) => w === name || w.startsWith(`${name}=`));
    if (i === -1) return null;
    return words[i].includes('=') ? words[i].split('=').slice(1).join('=') : words[i + 1];
  };
  if (sub[0] === 'pr' && sub[1] === 'merge') return 'Fusionner une PR est réservé à Sidy.';
  if (sub[0] === 'pr' && ['create', 'edit'].includes(sub[1])) {
    const base = flag('--base') ?? flag('-B');
    if (base && isProtected(base)) return `PR vers ${base} interdite : la cible est dev ou preprod (git-sidy).`;
  }
  if (sub[0] === 'api') {
    const text = words.join(' ');
    if (/\/pulls\/\d+\/merge\b/.test(text)) return 'Fusionner une PR via l\'API est réservé à Sidy.';
    if (/(^|[ =])base=(main|prod)\b/.test(text) && /\/pulls\b/.test(text)) return 'PR vers main ou prod interdite : la cible est dev ou preprod.';
    if (/\/git\/refs\/heads\/(main|prod)\b/.test(text)) return 'Modifier une branche protégée via l\'API est interdit.';
  }
  return null;
}

export function checkCommandLine(line, state) {
  for (const words of splitCommands(line)) {
    const reason = checkSimple(words, state);
    if (reason) return reason;
  }
  return null;
}

export function currentBranch(cwd) {
  try {
    return execFileSync('git', ['-C', cwd, 'symbolic-ref', '--short', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

export function evaluate(event, { branch, allow = false } = {}) {
  if (allow) return null;
  if (event?.tool_name && event.tool_name !== 'Bash') return null;
  const command = event?.tool_input?.command;
  if (typeof command !== 'string' || !/\bgit\b|\bgh\b|\bbash\b|\bsh\b|\bzsh\b|SIDY_GIT_ALLOW_PROTECTED/.test(command)) return null;
  return checkCommandLine(command, { branch: branch ?? currentBranch(event.cwd || process.cwd()) });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let event;
  try {
    event = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    process.exit(0); // entrée illisible : on ne bloque pas le travail
  }
  const reason = evaluate(event, { allow: process.env.SIDY_GIT_ALLOW_PROTECTED === '1' });
  if (reason) {
    process.stderr.write(`Refusé par le garde-fou Git de sidy-dev : ${reason}\nRègle : skill git-sidy (branche de tâche, PR vers dev ou preprod, Sidy fusionne).\n`);
    process.exit(2);
  }
}
