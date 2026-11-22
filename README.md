# sidy-claude-plugins

Marketplace Claude Code de Sidy. Il contient un plugin, **`sidy-dev`**, qui regroupe :

| Type | Nom | Rôle |
|---|---|---|
| Skill | `spring-boot-sidy` | Conventions back-end Spring Boot (Clean Architecture, DDD, Sonar, sécurité, tests) |
| Skill | `angular-sidy` | Conventions Angular 21 (signals, Tailwind v4, états de données, SEO, design) |
| Agent | `backend-dev` | Code Spring Boot et ses tests, lance le build |
| Agent | `reviewer` | Revue qualité façon Sonar (lecture seule) |
| Agent | `security-reviewer` | Revue sécurité (lecture seule) |
| Agent | `frontend-dev` | Code Angular, design d'interface compris |

## Structure

```
sidy-claude-plugins/
├── .claude-plugin/marketplace.json
└── plugins/sidy-dev/
    ├── .claude-plugin/plugin.json
    ├── skills/
    │   ├── spring-boot-sidy/   SKILL.md + references/
    │   └── angular-sidy/       SKILL.md
    └── agents/                 les 4 agents (.md)
```

## Installation

Dans Claude Code :

```
/plugin marketplace add sidymohamed12/sidy-claude-plugins
/plugin install sidy-dev@sidy
```

Relance ensuite Claude Code. Les agents et les skills sont alors disponibles dans tous tes projets.

## Proposer l'installation à l'ouverture d'un projet

Pour que Claude Code propose le plugin à toute personne qui ouvre un projet, copie `templates/project-settings.json` dans le projet sous `.claude/settings.json` (ou fusionne-le s'il existe déjà), puis commite-le :

```json
{
  "extraKnownMarketplaces": {
    "sidy": {
      "source": { "source": "github", "repo": "sidymohamed12/sidy-claude-plugins" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": {
    "sidy-dev@sidy": true
  }
}
```

Fonctionnement :

- Le marketplace n'est enregistré qu'après acceptation de la **fenêtre de confiance du dossier** (« trust ») par la personne. Dans un dossier non approuvé, ces entrées sont ignorées sans message.
- Le plugin est ensuite activé au démarrage de la session suivante.
- Si le dépôt du marketplace est **privé**, chaque personne doit avoir accès en lecture à `sidymohamed12/sidy-claude-plugins`.
- `autoUpdate: true` garde le marketplace et ses plugins à jour en arrière-plan ; mets `false` pour désactiver.
- Pour vérifier, lance `/plugin` : `sidy-dev` doit apparaître.

## Utilisation

Nomme l'agent dans ta demande :

```
Utilise l'agent backend-dev pour créer un CRUD « Produit » avec ses tests.
Utilise l'agent reviewer pour relire mes derniers changements.
```

## Mettre à jour le plugin

1. Modifie un skill ou un agent dans `plugins/sidy-dev/`.
2. Augmente `version` dans `plugins/sidy-dev/.claude-plugin/plugin.json` **et** dans `.claude-plugin/marketplace.json` (sans nouvelle version, les installations existantes peuvent ne pas voir le changement).
3. Commit et push sur GitHub.
4. Chaque personne met à jour avec :

```
/plugin marketplace update sidy
```

puis relance Claude Code.

## Références du skill Spring Boot

`plugins/sidy-dev/skills/spring-boot-sidy/references/` contient les six fichiers cités par le skill : `securite.md`, `concurrence-idempotence.md`, `infra.md`, `clean-code.md`, `sonar.md`, `api-docs.md`.
