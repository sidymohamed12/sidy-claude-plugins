# sidy-dev : skills et agents Claude Code

> Historique des mises à jour : voir le [CHANGELOG](CHANGELOG.md).

Plugin Claude Code qui applique les conventions de développement de Sidy (Spring Boot, Angular et design front) : 5 skills et 9 agents prêts à l'emploi.

## Ce que contient le plugin

| Type  | Nom                 | À quoi il sert                                                                                            |
| ----- | ------------------- | --------------------------------------------------------------------------------------------------------- |
| Skill | `spring-boot-sidy`  | Conventions back-end : Clean Architecture, DDD, SOLID, TDD, règles Sonar, sécurité, Flyway, Redis, Docker |
| Skill | `angular-sidy`      | Conventions Angular 22 : signals, zoneless, Tailwind v4, états de données, accessibilité, SEO              |
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

### Choisir le modèle d'un agent

Chaque agent a une ligne `model:` dans son en-tête, qui décide quel modèle le fait tourner : Haiku (léger, économe), Sonnet (équilibré, le défaut ici), Opus (le plus puissant, le plus coûteux) ou `inherit` (celui de ta session). Les alias `haiku`, `sonnet` et `opus` suivent la dernière version ; un nom complet (`claude-sonnet-5-5`) fixe la version. La ligne `effort:` règle l'effort de réflexion (`low`, `medium`, `high`…) ; ici `medium` partout. Un agent sans cette ligne hérite de ta session : ouverte sur un modèle cher, tous les agents le seraient. Ici `architecte` est sur Opus 5.5 car ses décisions se propagent à tous les autres agents ; `documentaliste` est sur Haiku 5.5 ; les autres sont sur Sonnet 5.5. Pour en changer un, modifie cette ligne dans son fichier d'agent ; si le résultat est décevant, passe-le au modèle du dessus.

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
