# sidy-dev : skills et agents Claude Code

Plugin Claude Code qui applique les conventions de développement de Sidy (Spring Boot et Angular) : 3 skills et 5 agents prêts à l'emploi.

## Ce que contient le plugin

| Type  | Nom                 | À quoi il sert                                                                                            |
| ----- | ------------------- | --------------------------------------------------------------------------------------------------------- |
| Skill | `spring-boot-sidy`  | Conventions back-end : Clean Architecture, DDD, SOLID, TDD, règles Sonar, sécurité, Flyway, Redis, Docker |
| Skill | `angular-sidy`      | Conventions Angular 21 : signals, zoneless, Tailwind v4, états de données, SEO, design                    |
| Skill | `pentest-sidy`      | Méthode de test de sécurité dynamique (DAST) d'une app Spring Boot qui tourne, sur cible autorisée        |
| Agent | `backend-dev`       | Code le back-end Spring Boot avec ses tests et lance le build                                             |
| Agent | `reviewer`          | Relit le code façon Sonar (lecture seule)                                                                 |
| Agent | `security-reviewer` | Relit la sécurité du back-end (lecture seule)                                                             |
| Agent | `frontend-dev`      | Code l'application Angular, interface comprise                                                            |
| Agent | `pentest-actif`     | Teste en dynamique une app Spring Boot qui tourne (requêtes réelles), sur une cible autorisée             |

Les skills sont des règles que Claude applique quand ta demande correspond. Les agents sont des assistants spécialisés que tu appelles par leur nom.

## Installation

Dans Claude Code :

```
/plugin marketplace add sidymohamed12/sidy-claude-plugins
/plugin install sidy-dev@sidy
```

Quitte puis relance Claude Code. Pour vérifier, tape `/plugin` : `sidy-dev` doit apparaître, avec ses 2 skills et ses 4 agents.

## Utilisation

### Appeler un agent

Nomme l'agent dans ta demande :

```
Utilise l'agent backend-dev pour créer un CRUD « Produit » avec ses tests.
Utilise l'agent reviewer pour relire mes derniers changements.
Utilise l'agent security-reviewer pour auditer l'authentification.
Utilise l'agent frontend-dev pour créer la page de liste des produits.
Utilise l'agent pentest-actif pour tester en dynamique mon API sur http://localhost:8080 (j'autorise le test, voici deux comptes).
```

| Besoin                                            | Agent               |
| ------------------------------------------------- | ------------------- |
| Écrire ou modifier du code Spring Boot            | `backend-dev`       |
| Relire la qualité du code Java                    | `reviewer`          |
| Relire la sécurité du back-end                    | `security-reviewer` |
| Écrire ou modifier du code Angular et l'interface | `frontend-dev`      |
| Tester une app Spring Boot qui tourne (DAST)      | `pentest-actif`     |

`reviewer` et `security-reviewer` ne modifient aucun fichier : ils lisent et rapportent. `pentest-actif` envoie de vraies requêtes : il ne teste qu'une application que tu possèdes ou es autorisé à tester, te demande la cible et deux comptes avant de commencer, et s'arrête à la preuve de la faille.

### Utiliser les skills

Les skills s'activent seuls quand tu parles de Spring Boot ou d'Angular. Tu peux aussi les demander directement :

```
Applique les conventions spring-boot-sidy à ce service.
Rappelle-moi les règles angular-sidy sur les états de données.
```

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
