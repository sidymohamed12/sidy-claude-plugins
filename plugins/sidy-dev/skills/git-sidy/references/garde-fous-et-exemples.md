# Git selon Sidy — exemples, repli API et garde-fous (§4, §5 et §7 du skill)

## Exemples de commits (§4)

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

## Repli si `gh` est indisponible (§5)

Passe par l'API : `gh api repos/<o>/<r>/pulls` puis `POST repos/<o>/<r>/issues/<n>/assignees` avec `assignees[]=sidymohamed12`.

## Garde-fous automatiques (§7)

- **Hook du plugin** (`hooks/guard-git.mjs`, `PreToolUse` sur Bash, Node 20 ou plus) : refuse push, merge, commit, rebase, reset et tag quand la branche courante est `main` ou `prod`, tout push vers `main` ou `prod`, `--force` (sauf `--force-with-lease`), `--all`, `--mirror`, `--no-verify`, `gh pr merge` et une PR dont la base est `main` ou `prod`. Si le hook refuse, la règle s'applique : on ne cherche pas à le contourner.
- **Dérogation de Sidy** : variable `SIDY_GIT_ALLOW_PROTECTED=1` dans l'environnement de Claude Code, posée par lui avant la session. Elle est refusée si elle apparaît dans une commande.
- **Limite** : le hook lit la commande, il n'est pas une barrière de sécurité (une commande très indirecte peut passer). La vraie protection est côté GitHub : règle de protection de branche sur `main` et `prod` (PR obligatoire, pas de push direct, pas de force-push, checks requis).
- **Contrôle en CI** : `templates/conventions.yml` + `templates/check-conventions.mjs` (à copier dans `.github/workflows/` et `.github/scripts/`) vérifient sur chaque PR le nom de la branche, la cible (`dev` ou `preprod` ; `main` et `prod` seulement depuis `dev` ou `preprod`, pour la promotion de Sidy) et le format des commits et du titre. Les PR de promotion `dev`/`preprod` vers `main`/`prod` et celles de Dependabot ne sont pas contrôlées sur leurs commits.
