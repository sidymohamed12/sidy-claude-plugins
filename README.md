> **Mise à jour (2026-11-25, `sidy-office` v1.14.0)** — `documentaliste` (jaune, afro, lunettes) et `security-fixer` (rouge, crâne rasé, casque) ont leur personnage dans l'exemple `sidy-office.json`.
>
> **Mise à jour (2026-11-25, `sidy-dev` v1.10.0)** — nouvel agent **`documentaliste`** : après chaque fin de développement, il repère ce qu'il faut documenter ou modifier (README, `docs/http`, flows et diagrammes tels que construits), signale les écarts avec les ADR à `architecte` et ne touche jamais au code.
>
> **Mise à jour (2026-11-25, `sidy-office` v1.13.0)** — `architecte` a son personnage dans l'exemple `sidy-office.json` (bleu, cheveux longs) et passe en tête de l'ordre de l'équipe. Il apparaissait déjà seul, avec un look généré ; copie l'exemple dans `~/.claude/` pour lui donner celui-ci.
>
> **Mise à jour (2026-11-25, `sidy-dev` v1.9.0)** — nouvel agent **`architecte`** : il conçoit avant le code (plan dans `docs/plans/`, ADR dans `docs/adr/`, choix technologiques vérifiés sur le web, system design et flows en Mermaid dans `docs/diagrams/` et `docs/flows/`) et arbitre en cours de chaîne quand un agent s'arrête ou qu'une revue bloque. Il ne touche jamais au code.
>
> **Mise à jour (2026-11-24, `sidy-office` v1.12.0)** — on peut jouer seul à la console et à la balle (jongles), plus de balle parasite à la console, et des longueurs dans la piscine.
>
> **Mise à jour (2026-11-24, `sidy-office` v1.11.0)** — les zones d'abord : les agents libres sont presque toujours dans une zone, et d'abord dans les vides. Nouvelle zone jeu de balle, gaming à deux à la manette devant la télé, nage dans la piscine, sieste bien visible.
>
> **Mise à jour (2026-11-24, `sidy-office` v1.10.0)** — ton portrait encadré au mur de la salle de travail, avec la photo de ton choix (réglage `portrait`).
>
> **Mise à jour (2026-11-24, `sidy-office` v1.9.0)** — quand Claude confie une mission à un agent, ils se retrouvent quelques secondes dans la salle de réunion avant de rejoindre leurs postes.
>
> **Mise à jour (2026-11-24, `sidy-office` v1.8.0)** — une salle de réunion vitrée dans la salle de travail, un espace gaming dans la détente et un mur de tableaux au fond de la détente.
>
> **Mise à jour (2026-11-24, `sidy-office` v1.7.0)** — les agents se détendent pour de vrai : chaque activité et chaque pause dure de 2 à 5 minutes, et ils marchent beaucoup moins. D'une zone à l'autre, ils ne ressortent plus par le passage. Sur grand écran, la salle de travail gagne des rangées de postes au lieu de laisser un vide en bas.
>
> **Mise à jour (2026-11-24, `sidy-office` v1.6.1)** — le bureau ne déborde plus de la page (tablette, téléphone, écran de 1024 px) et remplit l'écran sur les grands écrans au lieu de laisser des espaces blancs.
>
> **Mise à jour (2026-11-24, `sidy-office` v1.6.0)** — les agents au repos vivent maintenant tous dans l'espace détente (seul le café se prend dans le coin pause), et sur un grand écran la détente se place à droite du travail au lieu de dessous, pour remplir la largeur.
>
> **Mise à jour (2026-11-24, `sidy-office` v1.5.0)** — dans l'activité et dans le panneau de l'équipe, une commande trop longue reste coupée mais s'affiche en entier au survol, et un clic (ou Entrée) la déploie. Le texte complet est limité à 2 000 caractères et ne contient jamais le contenu d'un fichier.
>
> **Mise à jour (2026-11-24, `sidy-office` v1.4.0)** — quatre nouvelles zones dans l'espace détente : discussion de groupe, dortoir, salle de sport et piscine. Réglage `zones` pour choisir lesquelles garder.
>
> **Mise à jour (2026-11-24, `sidy-office` v1.3.0)** — le bureau a maintenant un espace travail et un espace détente, séparés par un passage. Premières zones : la télé et le tennis de table. Les agents au repos y vont après un moment, puis rentrent. Réglage `zones` dans `sidy-office.json` (`[]` pour ne garder que le travail). Voir le README de `sidy-office`.
>
> **Mise à jour (2026-11-24, `sidy-office` v1.2.1)** — après une mise à jour du plugin, le démarrage remplace maintenant l'ancien serveur du bureau au lieu de le laisser servir l'ancienne version (c'est pour ça que les agents ne bougeaient pas). Voir « Après une mise à jour » dans le README de `sidy-office`.
>
> **Mise à jour (2026-11-24, `sidy-office` v1.2.0)** — réglage `repos` pour couper les activités au repos (partout ou pour un seul agent), nouveaux réglages de style (`coupe`, `pantalon`, `rayures`), et la page signale les réglages invalides.
>
> **Mise à jour (2026-11-24)** — `sidy-office` v1.1.0 : quand personne ne travaille, les agents circulent dans le bureau, prennent un café, discutent à deux ou jouent à la balle.
>
> **Mise à jour (2026-11-24, v1.8.1)** — **README détaillé par projet** : `backend-dev` et `frontend-dev` créent ou mettent à jour un `README.md` qui décrit le projet, front et back, d'après le modèle `spring-boot-sidy/templates/README.projet.md`. Case dédiée dans le modèle de PR et les checklists.
>
> **Mise à jour (2026-11-24, v1.8.0)** — **garde-fou Git** : un hook du plugin refuse push, merge, commit, rebase et reset sur `main` ou `prod`, les force-push, `--no-verify` et `gh pr merge` (Node 20 ou plus requis ; dérogation par `SIDY_GIT_ALLOW_PROTECTED=1` dans ton environnement). Gabarit CI `conventions.yml` pour contrôler branches, cibles et commits des PR. Protège aussi `main` et `prod` sur GitHub : le hook ne remplace pas la règle de branche.
>
> **Mise à jour (2026-11-24, v1.7.0)** — nouveau skill **`git-sidy`** : une branche par tâche (`feat/`, `fix/`, `hot-fix/`, `core/`…), commits qui disent la réalisation et la feature, PR vers `dev` ou `preprod` assignée à Sidy et qui le mentionne. Les agents `backend-dev`, `frontend-dev`, `designer` et `security-fixer` commitent et poussent **leur branche** (plus de « ne pas commiter ») ; ils ne touchent jamais à `main` ni `prod`.
>
> **Mise à jour (2026-11-23, v1.6.1)** — nouvel agent **`security-fixer`** (v1.5.0) : il ferme un constat de sécurité confirmé, un fichier par passage, avec son test ; `security-reviewer` et `pentest-actif` renforcés. Gestion **Kubernetes** (v1.6.0) : Actuator `liveness` / `readiness`, Job Flyway avant le roll, manifestes dans `templates/k8s/`. v1.6.1 : corrections de ces manifestes (Job appliqué à part, identifiants Flyway réservés au Job, volume de logs) et documentation à jour.

> **Mise à jour (2026-11-23)** — nouvel agent **`designer`** : il conçoit le design (concepts, `DESIGN.md`, tableau de motion, maquette HTML/CSS) et le fait valider avant que `frontend-dev` l'intègre. Nouveau skill **`design-sidy`** (design front toutes stacks : maquette d'abord, motion GSAP / Three.js, ressources gratuites) ; `angular-sidy` §11 et l'agent `frontend-dev` s'appuient dessus.

> **Mise à jour (2026-11-22)** — `pentest-sidy` v2 (recon par code, matrice d'authz, budget 80 req, sinks Spring) ; agent `pentest-actif` aligné ; **pont `security-reviewer` → `pentest-actif` appliqué** (hypothèses dans le rapport + SCA lecture seule) ; `spring-boot-sidy` cible Boot **4.2.0** / Java **25** / Jackson **3**, CSRF `spa()` Security 7, starter Flyway + verrous PostgreSQL, ShedLock 7.11 avec `GRANT` via placeholder, headers `server.request.header.forwarded`, versions springdoc 3.2.1 / Bucket4j 8.23 / MapStruct 1.6.3 / Lombok 1.18.48.

# sidy-dev : skills et agents Claude Code

Plugin Claude Code qui applique les conventions de développement de Sidy (Spring Boot, Angular et design front) : 5 skills et 9 agents prêts à l'emploi.

## Ce que contient le plugin

| Type  | Nom                 | À quoi il sert                                                                                            |
| ----- | ------------------- | --------------------------------------------------------------------------------------------------------- |
| Skill | `spring-boot-sidy`  | Conventions back-end : Clean Architecture, DDD, SOLID, TDD, règles Sonar, sécurité, Flyway, Redis, Docker |
| Skill | `angular-sidy`      | Conventions Angular 21 : signals, zoneless, Tailwind v4, états de données, SEO                            |
| Skill | `design-sidy`       | Design front toutes stacks : concepts, maquette d'abord, motion GSAP / Three.js, images, polices, icônes  |
| Skill | `pentest-sidy`      | Méthode de test de sécurité dynamique (DAST) d'une app Spring Boot qui tourne, sur cible autorisée        |
| Skill | `git-sidy`          | Workflow Git : branches `feat/` `fix/` `hot-fix/` `core/`, commits explicites, PR vers dev ou preprod, jamais de push sur main ou prod |
| Agent | `architecte`        | Conçoit avant le code et arbitre en cours de route : plan, ADR, choix technologiques, system design, flows |
| Agent | `backend-dev`       | Code le back-end Spring Boot avec ses tests et lance le build                                             |
| Agent | `reviewer`          | Relit le code façon Sonar (lecture seule)                                                                 |
| Agent | `security-reviewer` | Relit la sécurité du back-end (lecture seule)                                                             |
| Agent | `designer`          | Conçoit le design avant le code : concepts, `DESIGN.md`, animations, maquette HTML/CSS à valider          |
| Agent | `frontend-dev`      | Intègre la maquette validée et code le front (Angular ou HTML/CSS/JS), motion design compris              |
| Agent | `pentest-actif`     | Teste en dynamique une app Spring Boot qui tourne (requêtes réelles), sur une cible autorisée             |
| Agent | `security-fixer`    | Corrige un constat de sécurité déjà confirmé, un fichier par passage, avec son test de non-régression     |
| Agent | `documentaliste`    | Après chaque développement : met à jour le README, `docs/http`, les flows et diagrammes tels que construits |

Les skills sont des règles que Claude applique quand ta demande correspond. Les agents sont des assistants spécialisés que tu appelles par leur nom.

## Installation

Dans Claude Code :

```
/plugin marketplace add sidymohamed12/sidy-claude-plugins
/plugin install sidy-dev@sidy
```

Quitte puis relance Claude Code. Pour vérifier, tape `/plugin` : `sidy-dev` doit apparaître, avec ses 5 skills et ses 9 agents.

## Utilisation

### Appeler un agent

Nomme l'agent dans ta demande :

```
Utilise l'agent architecte pour planifier la feature « Ordonnance » (back et front) avant de coder.
Utilise l'agent backend-dev pour créer un CRUD « Produit » avec ses tests.
Utilise l'agent reviewer pour relire mes derniers changements.
Utilise l'agent security-reviewer pour auditer l'authentification.
Utilise l'agent designer pour concevoir la page d'accueil du site vitrine.
Utilise l'agent frontend-dev pour intégrer la maquette validée dans l'application Angular.
Utilise l'agent pentest-actif pour tester en dynamique mon API sur http://localhost:8080 (j'autorise le test, voici deux comptes).
Utilise l'agent security-fixer pour corriger le constat S-03 du rapport de security-reviewer.
Utilise l'agent documentaliste pour mettre à jour la documentation après la feature « Ordonnance ».
```

| Besoin                                            | Agent               |
| ------------------------------------------------- | ------------------- |
| Planifier une feature ou arbitrer en cours de route | `architecte`      |
| Écrire ou modifier du code Spring Boot            | `backend-dev`       |
| Relire la qualité du code Java                    | `reviewer`          |
| Relire la sécurité du back-end                    | `security-reviewer` |
| Concevoir le design et la maquette (avant le code) | `designer`         |
| Intégrer la maquette et coder le front            | `frontend-dev`      |
| Tester une app Spring Boot qui tourne (DAST)      | `pentest-actif`     |
| Corriger un constat de sécurité confirmé          | `security-fixer`    |
| Documenter ce qui vient d'être développé          | `documentaliste`    |

`architecte` n'écrit que dans `docs/plans/`, `docs/adr/`, `docs/diagrams/` et `docs/flows/`, jamais le code : il intervient avant la chaîne (plan, ordre des agents, ADR et choix technologiques à valider, system design en Mermaid quand la structure change) et pendant (il arbitre quand un agent s'arrête sur une question, qu'une revue bloque ou que le plan ne tient plus). `documentaliste` intervient après chaque fin de développement, de préférence une fois la revue rendue : il compare ce qui a changé dans le code à la documentation et ne met à jour que `README.md`, `docs/http/`, `docs/flows/` et `docs/diagrams/`, tels que construits. Il ne touche ni au code, ni aux ADR, ni aux plans : un écart avec un ADR est signalé à `architecte`, un Swagger ou un `.env.example` incomplet à `backend-dev`. `reviewer` et `security-reviewer` ne modifient aucun fichier : ils lisent et rapportent. `designer` n'écrit que `DESIGN.md` et le dossier `design/`, jamais le code de l'application, et s'arrête à chaque étape pour te faire valider. `pentest-actif` envoie de vraies requêtes : il ne teste qu'une application que tu possèdes ou es autorisé à tester, te demande la cible et deux comptes avant de commencer, et s'arrête à la preuve de la faille. `security-fixer` ne corrige que des constats déjà confirmés (par `security-reviewer` après contre-épreuve, ou par `pentest-actif`), un seul à la fois, et ne modifie qu'un fichier de production par passage, plus son test. Si le correctif demande un second fichier, il le dit et te donne un bloc « Passage suivant » à lui redonner. Il commite seulement un constat fermé (test vert), en suivant `git-sidy` : branche `fix/`, commit `fix(feature): …`, PR vers `dev` ou `preprod` assignée à `sidymohamed12` et qui le mentionne, jamais de push ni de merge sur `main` ou `prod`.

### Utiliser les skills

Les skills s'activent seuls quand tu parles de Spring Boot, d'Angular ou de design d'interface. Tu peux aussi les demander directement :

```
Applique les conventions spring-boot-sidy à ce service.
Rappelle-moi les règles angular-sidy sur les états de données.
Applique design-sidy pour concevoir la page d'accueil de ce site vitrine.
```

## Voir les agents travailler (plugin `sidy-office`)

Un second plugin, optionnel, affiche un bureau en pixel art où Claude et chaque agent ont leur poste. On voit en direct qui travaille, sur quel fichier, quelle commande tourne, et qui attend ta permission. Il détecte tout seul les agents installés (les tiens ou ceux de n'importe quel plugin), et se personnalise avec un fichier `sidy-office.json`.

```
/plugin install sidy-office@sidy
```

Relance Claude Code, puis ouvre http://localhost:4848 (ou tape `/sidy-office:bureau`). Il faut Node.js 20 ou plus récent. Pour retrouver les personnages et les rôles de l'équipe sidy-dev, copie `plugins/sidy-office/exemples/sidy-office.json` dans `~/.claude/`. Détails dans [plugins/sidy-office/README.md](plugins/sidy-office/README.md).

## Mettre à jour

Quand une nouvelle version est publiée :

```
/plugin marketplace update sidy
```

Relance ensuite Claude Code.

## Proposer le plugin à toute l'équipe d'un projet

Pour que Claude Code propose le plugin à chaque personne qui ouvre ton projet, ajoute ce fichier dans le projet sous `.claude/settings.json` (ou fusionne-le s'il existe déjà), puis commite-le :

```json
{
  "extraKnownMarketplaces": {
    "sidy": {
      "source": {
        "source": "github",
        "repo": "sidymohamed12/sidy-claude-plugins"
      },
      "autoUpdate": true
    }
  },
  "enabledPlugins": {
    "sidy-dev@sidy": true
  }
}
```

Bon à savoir :

- Le plugin n'est proposé qu'après que la personne a accepté la fenêtre de confiance du dossier (« trust »).
- Il est activé au démarrage de la session suivante.
- `autoUpdate: true` garde le plugin à jour automatiquement ; mets `false` pour désactiver.
- Si le dépôt est privé, chaque personne doit avoir accès en lecture à `sidymohamed12/sidy-claude-plugins`.
- Ne mets pas `.claude/settings.json` dans le `.gitignore` du projet : il doit être partagé.

## Dépannage

- **Les agents n'apparaissent pas** : relance Claude Code après l'installation, puis vérifie avec `/plugin`.
- **Un agent répond de façon générique** : demande-lui de lister ses règles non négociables. S'il n'en connaît aucune, le skill n'est pas chargé : mets à jour le plugin et relance.
- **Doublon d'agent ou de skill** : supprime ta copie locale (`~/.claude/agents/`, `~/.claude/skills/`) pour ne garder que celle du plugin.
