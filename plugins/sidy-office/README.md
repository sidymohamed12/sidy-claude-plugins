# sidy-office : le bureau des agents

Une page web locale en pixel art qui montre Claude et tes agents en train de travailler, en direct.

Le bureau se construit tout seul à partir des agents que tu as installés : chacun a son poste, son personnage et son rôle. Claude est au centre et distribue le travail. Quand il confie une tâche, un avion en papier part vers l'agent concerné, qui quitte le coin pause et rejoint son bureau. Son écran montre ce qu'il fait : du code qui s'écrit, un document qui défile, un terminal, ou un écran rouge si une commande échoue. Sa mission finie, il retourne en pause.

Les agents intégrés à Claude Code (Explore, Plan, general-purpose…) entrent par la porte en renfort, prennent un poste libre, puis repartent.

À droite, le panneau donne pour chacun ce qu'il fait (« Écrit Produit.java », « $ ./mvnw verify »), le nombre d'outils utilisés et de fichiers modifiés, et le bilan de sa dernière mission. En dessous, le fil d'activité.

## Installation

Il faut Node.js 20 ou plus récent et `curl` (déjà présent sur macOS et Linux).

```
/plugin marketplace add sidymohamed12/sidy-claude-plugins
/plugin install sidy-office@sidy
```

Quitte puis relance Claude Code.

## Utilisation

Le serveur du bureau démarre tout seul à l'ouverture d'une session Claude Code. Ouvre simplement :

**http://localhost:4848**

Ou, dans Claude Code :

```
/sidy-office:bureau
```

Pas de session en cours ? Clique sur **Voir une démo** : tes quatre premiers agents rejouent une mission complète.

Le bureau montre toutes tes sessions Claude Code en même temps. Si un même agent tourne dans deux sessions, son nom porte « ×2 ».

## Ton équipe, détectée automatiquement

Sans aucun réglage, le bureau affiche les agents qu'il trouve :

| Où                                   | Agents                                         |
| ------------------------------------ | ---------------------------------------------- |
| `~/.claude/agents/`                  | tes agents personnels                          |
| plugins installés et activés         | les agents fournis par tes plugins             |
| `.claude/agents/` d'un projet ouvert | les agents du projet, dès qu'une session y tourne |

Pour chaque agent :

- **Rôle :** la première phrase de sa `description`.
- **Personnage :** son apparence (haut, coiffure, accessoire) est calculée à partir de son nom. Le même nom donne toujours le même personnage.
- **Poste :** un bureau dans l'ordre alphabétique. Au-delà de 5 agents, la salle ajoute des rangées de bureaux.

La liste est relue toutes les minutes et à chaque rechargement de la page : un nouvel agent apparaît sans redémarrer le serveur.

## Personnaliser

Crée un fichier `sidy-office.json` :

- dans `~/.claude/sidy-office.json` pour tous tes projets ;
- et/ou dans `.claude/sidy-office.json` d'un projet : ses réglages complètent ou remplacent les réglages globaux, agent par agent.

Tout est facultatif :

```json
{
  "titre": "Le bureau de l'équipe MediTrace",
  "ordre": ["backend-dev", "frontend-dev", "reviewer"],
  "agents": {
    "claude": { "nom": "Chef", "couleur": "#2F4B8F" },
    "backend-dev": { "nom": "Back", "role": "API Spring Boot", "couleur": "#2E9E5B", "accessoire": "casque" },
    "data-analyst": { "role": "Analyse les données", "peau": 2, "accessoire": ["lunettes", "chignon"] },
    "Explore": { "masquer": true }
  }
}
```

| Clé                  | Effet                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| `titre`              | Titre de la page                                                      |
| `ordre`              | Agents placés en premier, dans cet ordre (les autres suivent, par ordre alphabétique) |
| `agents.<nom>`       | Réglages d'un agent (`claude` pour Claude lui-même)                   |
| `nom`                | Nom affiché                                                           |
| `role`               | Rôle affiché sous le nom                                              |
| `couleur`            | Couleur du haut, en hexadécimal (`#2E9E5B`)                           |
| `cheveux`            | Couleur des cheveux, en hexadécimal                                   |
| `peau`               | Teinte de peau, de `1` (la plus foncée) à `5`, ou en hexadécimal      |
| `accessoire`         | `casque`, `lunettes`, `casquette`, `capuche`, `chignon`, `cravate`, `aucun`, ou une liste |
| `masquer`            | `true` pour retirer l'agent du bureau (il reste dans le fil d'activité) |

Un agent présent dans le fichier mais introuvable sur ta machine (par exemple `Explore`) rejoint quand même l'équipe, avec son propre poste.

Si le fichier contient une erreur, la page l'indique en haut et le bureau continue avec les autres réglages. Les changements s'appliquent au prochain rechargement de la page.

Le fichier [`exemples/sidy-office.json`](exemples/sidy-office.json) reproduit l'équipe de Sidy (`backend-dev`, `designer`, `frontend-dev`, `reviewer`, `security-reviewer`, `pentest-actif`) : copie-le dans `~/.claude/` pour partir de là.

## Comment ça marche

```
Claude Code ──hooks──▶ curl POST /event ──▶ serveur local (127.0.0.1:4848) ──SSE──▶ navigateur
```

- **Les hooks :** le plugin en déclare dans `hooks/hooks.json` sur les événements de Claude Code : demande envoyée, outil lancé ou terminé, échec, permission demandée, sous-agent démarré ou arrêté, fin de réponse, fin de session.
- **L'envoi :** chaque hook envoie son JSON au serveur avec `curl`, **en arrière-plan** (`async`). Il ne ralentit jamais Claude Code, et si le serveur est arrêté, rien ne se passe.
- **Savoir qui travaille :** les hooks déclenchés dans un sous-agent portent `agent_type`. C'est ce qui permet de savoir quel agent travaille.
- **Ce qui est gardé :** le serveur ne garde qu'un résumé (nom du fichier, début de la commande, type d'outil). Pour détecter les agents, il ne lit que leur nom et leur description. Le contenu des fichiers n'est jamais conservé ni affiché.
- **La sécurité :** le serveur n'écoute que sur `127.0.0.1`, il n'est pas visible depuis le réseau.

## Réglages du serveur

| Variable             | Effet                                    | Par défaut                   |
| -------------------- | ---------------------------------------- | ---------------------------- |
| `SIDY_OFFICE_PORT`   | Port du serveur et des hooks             | `4848`                       |
| `SIDY_OFFICE_CONFIG` | Chemin du fichier de réglages global     | `~/.claude/sidy-office.json` |

Pour les changer, ajoute-les dans le bloc `env` de `~/.claude/settings.json`.

## Lancer à la main

Depuis le dossier du plugin :

```
npm start        # démarre le serveur en arrière-plan et ouvre le navigateur
npm run serve    # serveur au premier plan (pour voir les logs)
npm test         # tests (node:test, sans dépendance)
```
