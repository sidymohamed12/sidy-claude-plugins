---
name: git-sidy
description: >
  Workflow Git de Sidy : nom des branches (feat/, fix/, hot-fix/, core/…), messages de commit qui disent
  la réalisation et la feature, une branche par tâche puis une PR vers dev ou preprod, assignation et
  mention de Sidy sur chaque PR, jamais de push ni de merge sur main ou prod. À utiliser dès qu'il faut
  créer une branche, commiter, pousser, ouvrir une PR ou choisir la branche cible.
---

# Git selon Sidy

Une tâche = une branche = une PR. Sidy relit et fusionne lui-même. Les agents ne touchent jamais à `main` ni `prod`.

## 1. Branches protégées

`main` et `prod` : **aucun** push, merge, rebase, reset ni tag, même avec une demande vague. Seul Sidy le fait, ou un accord explicite écrit dans la conversation, pour cette action. `dev` et `preprod` : pas de push direct non plus, on passe par une PR. Jamais `--force` sur une branche partagée, jamais `--no-verify`.

## 2. Nommer la branche

`type/description-courte-en-minuscules-avec-tirets`, 2 à 5 mots, qui dit ce qu'elle fait.

| Type | Quand |
|---|---|
| `feat/` | nouvelle fonctionnalité |
| `fix/` | correction d'un bug |
| `hot-fix/` | correction urgente d'un défaut déjà déployé |
| `core/` | socle technique : configuration, sécurité transverse, base commune |
| `refactor/` | réorganisation sans changement de comportement |
| `perf/` | performance |
| `test/` | tests seuls |
| `docs/` | documentation seule |
| `ci/` | pipeline, workflows, build |
| `chore/` | maintenance : dépendances, nettoyage |

Exemples : `feat/auth-revocation-jwt`, `fix/ordonnance-doublon-delivrance`, `core/profils-yaml-redis`. Pas d'accent, pas d'espace, pas de numéro seul, pas de nom de personne.

La branche part de la branche cible à jour (`git switch dev && git pull && git switch -c feat/...`). Une tâche non liée = une autre branche.

## 3. Choisir la cible : `dev` ou `preprod`

- Par défaut : **`dev`**.
- **`preprod`** : correction d'un défaut déjà en préproduction, stabilisation d'une version en recette, `hot-fix/` d'un défaut présent en préproduction.
- Si Sidy a donné la cible, c'est elle. Si le cas est ambigu, demande en une question courte avant d'ouvrir la PR. Ne cible jamais `main` ni `prod` : Sidy y amène lui-même `preprod` ou `dev`.
- Un `hot-fix/` qui doit atteindre `prod` : ouvre la PR vers `preprod` (ou `dev`), puis dis à Sidy que le report vers `prod` est pour lui.

## 4. Messages de commit

Un commit = une réalisation cohérente qui compile et dont les tests passent. Format :

```
type(feature): réalisation à l'infinitif ou au présent, sans point final

- détail de ce qui a été fait, un point par réalisation
- autre réalisation du même commit

Feature : <nom de la feature, en clair>
```

- `type` : `feat`, `fix`, `hot-fix`, `core`, `refactor`, `perf`, `test`, `docs`, `ci`, `chore`.
- `(feature)` : la feature ou le module concerné (`auth`, `ordonnance`, `k8s`), en minuscules, sans espace. C'est ce qui permet de savoir « quelle réalisation sur quelle feature ».
- Première ligne : 72 caractères au plus, parle de ce qui change, pas de « modifications », « update », « wip », « divers ».
- Le corps liste les réalisations ; ajoute le pourquoi quand il n'est pas évident.
- Changement cassant : `type(feature)!:` et une ligne `BREAKING CHANGE: ...` dans le corps. Cela décide de la version de l'image publiée par la CI (`feat` = mineur, `!` = majeur, le reste = correctif).
- Plusieurs réalisations indépendantes = plusieurs commits, pas un seul commit fourre-tout.
- Pas de secret, de `.env`, de fichier généré, de gros binaire. `git status` et `git diff --staged` avant chaque commit ; `git add` par chemin, pas `git add -A` à l'aveugle.

Exemples :

```
feat(auth): révoquer un jeton JWT à la déconnexion

- ajout du use case RevokeTokenUseCase et du port TokenBlacklist
- implémentation Redis avec expiration alignée sur l'expiration du jeton
- tests unitaires et test d'intégration Redis (Testcontainers)

Feature : révocation des jetons JWT
```

```
fix(ordonnance): empêcher la double délivrance simultanée

- verrou optimiste (@Version) sur Ordonnance
- test de concurrence à deux threads

Feature : délivrance des ordonnances
```

## 5. Pousser et ouvrir la PR

1. Vérifie avant : build et tests verts, `git status` propre, aucun fichier hors sujet, `README.md` du projet à jour si ton changement touche le démarrage, la configuration, l'architecture ou le déploiement.
2. `git push -u origin <branche>` : uniquement ta branche de tâche, jamais une branche protégée.
3. Ouvre la PR vers la cible choisie, **assignée à Sidy et avec sa mention** :

```
gh pr create --base dev --head <branche> --assignee sidymohamed12 \
  --title "<même forme que le commit principal>" --body-file <fichier>
```

   Si `gh` est indisponible, passe par l'API : `gh api repos/<o>/<r>/pulls` puis `POST repos/<o>/<r>/issues/<n>/assignees` avec `assignees[]=sidymohamed12`.
4. Le corps suit `templates/pull_request_template.md` et commence par `@sidymohamed12`.
5. **Assignation par défaut : `sidymohamed12`**, avec mention dans le corps, **jusqu'à ce que Sidy donne un autre nom**. S'il en donne un, utilise-le pour la suite de la conversation et mentionne aussi Sidy tant qu'il ne demande pas le contraire.
6. Ne fusionne pas la PR, ne la ferme pas, ne supprime pas la branche : c'est à Sidy.

Le dépôt peut aussi fournir `.github/pull_request_template.md` : copie `templates/pull_request_template.md` à cet endroit.

## 6. Interdits

- Push, merge, rebase, reset, tag ou suppression sur `main` ou `prod`.
- `git push --force` (autorisé seulement sur ta propre branche de tâche, avec `--force-with-lease`, si tu as réécrit tes commits).
- `--no-verify`, désactiver un hook ou une vérification pour faire passer un commit.
- Commit de secrets : si l'un a été commité, arrête et dis-le, ne le « corrige » pas en silence (le retirer de l'historique est une décision de Sidy).
- Supprimer ou réécrire des commits qui ne sont pas les tiens.

## 7. Garde-fous automatiques

- **Hook du plugin** (`hooks/guard-git.mjs`, `PreToolUse` sur Bash, Node 20 ou plus) : refuse push, merge, commit, rebase, reset et tag quand la branche courante est `main` ou `prod`, tout push vers `main` ou `prod`, `--force` (sauf `--force-with-lease`), `--all`, `--mirror`, `--no-verify`, `gh pr merge` et une PR dont la base est `main` ou `prod`. Si le hook refuse, la règle s'applique : on ne cherche pas à le contourner.
- **Dérogation de Sidy** : variable `SIDY_GIT_ALLOW_PROTECTED=1` dans l'environnement de Claude Code, posée par lui avant la session. Elle est refusée si elle apparaît dans une commande.
- **Limite** : le hook lit la commande, il n'est pas une barrière de sécurité (une commande très indirecte peut passer). La vraie protection est côté GitHub : règle de protection de branche sur `main` et `prod` (PR obligatoire, pas de push direct, pas de force-push, checks requis).
- **Contrôle en CI** : `templates/conventions.yml` + `templates/check-conventions.mjs` (à copier dans `.github/workflows/` et `.github/scripts/`) vérifient sur chaque PR le nom de la branche, la cible (`dev` ou `preprod` ; `main` et `prod` seulement depuis `dev` ou `preprod`, pour la promotion de Sidy) et le format des commits et du titre. Les PR de promotion `dev`/`preprod` vers `main`/`prod` et celles de Dependabot ne sont pas contrôlées sur leurs commits.
