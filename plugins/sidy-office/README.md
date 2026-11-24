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

**Au repos, le bureau vit.** Les agents qui ne travaillent pas ne restent pas plantés devant leur canapé : ils se promènent dans le coin pause, vont prendre un café, discutent à deux (les bulles se répondent) ou se lancent une balle. Dès qu'un agent reçoit du travail, il laisse tout et rejoint son poste. Le panneau de l'équipe dit ce que chacun fait (« Discute avec reviewer », « Joue à la balle avec designer »). Si ton système demande moins d'animations (`prefers-reduced-motion`), les agents restent à leur place. Pour tout couper : `"repos": false` dans `sidy-office.json` (voir *Personnaliser*).

**Voir la commande en entier.** Les lignes de l'activité et du panneau de l'équipe sont coupées quand elles sont longues. Survole une ligne pour lire le texte complet (commande, chemin, adresse, recherche), ou clique dessus (ou Entrée au clavier) pour la déployer. Le texte complet est limité à 2 000 caractères et ne contient jamais le contenu d'un fichier. Il passe par ton ordinateur seulement : le serveur n'écoute que sur `127.0.0.1`.

**Deux espaces : travail et détente.** Le bureau est maintenant en deux parties, séparées par un mur avec un passage au milieu. En haut, l'espace travail (les postes, le coin pause). En bas, l'espace détente, fait de zones : six zones : la **télé** (on s'assoit à plusieurs sur le canapé, l'écran s'allume), le **tennis de table** (à deux, avec la balle), la **discussion** (un petit groupe autour d'une table, les bulles se répondent), le **dortoir** (sieste, avec les « Zzz »), la **salle de sport** (tapis de course, haltères) et la **piscine**. Plus un agent reste longtemps sans rien faire, plus il va loin : la discussion arrive vite, la sieste seulement après un long moment. Un agent qui traîne au repos finit par aller dans une zone, puis rentre à sa place ; dès qu'il reçoit du travail, il laisse tout et retourne à son poste par le passage. Choisis les zones avec `"zones"` dans `sidy-office.json` : `["tele"]`, `["tele", "dortoir", "piscine"]`, ou `[]` pour ne garder que l'espace travail (voir *Personnaliser*). `"repos": false` coupe aussi les zones.

**Au repos, tout le monde est dans la détente.** Dès qu'un agent n'a plus de travail, il rejoint l'espace détente et y reste : il se promène le long des zones, discute, joue ou va dans une zone. Seul le café se prend dans le coin pause, côté travail ; après, il revient. Sans zones (`"zones": []`), le repos reste dans le coin pause, comme avant.

**On se détend pour de vrai.** Chaque activité (télé, sieste, sport, piscine, discussion, balle, café) dure de 2 à 5 minutes, et entre deux activités l'agent se repose aussi 2 à 5 minutes sans bouger. La promenade est rare. Seule la première envie, quand un agent vient de finir son travail, arrive vite (quelques secondes). D'une zone à l'autre, les agents restent dans la détente : ils longent le couloir sans repasser par la porte.

**S'adapte à tous les écrans.** La page essaie plusieurs dispositions (détente dessous, ou à droite avec une à trois colonnes de zones) et garde celle qui s'affiche le plus grand. Le bureau ne déborde jamais de la page : sur un téléphone, il prend toute la largeur. S'il reste de la place, le plan s'étire pour occuper l'écran sans bandes blanches : les zones de détente s'écartent, et la salle de travail gagne des rangées de postes (utiles aux renforts), avec le coin pause en bas. Redimensionne la fenêtre : la disposition change d'elle-même.

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
  "repos": true,
  "zones": ["tele", "tennis-de-table", "discussion", "dortoir", "salle-de-sport", "piscine"],
  "agents": {
    "claude": { "nom": "Chef", "couleur": "#2F4B8F" },
    "backend-dev": { "nom": "Back", "role": "API Spring Boot", "couleur": "#2E9E5B", "accessoire": "casque", "coupe": "afro", "pantalon": "#2F3A4C", "rayures": "#FFFFFF" },
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
| `coupe`              | Coupe de cheveux : `courte` (par défaut), `longue`, `afro`, `rase`    |
| `pantalon`           | Couleur du pantalon, en hexadécimal                                   |
| `rayures`            | Couleur d'une rayure sur le haut, en hexadécimal, ou `false` pour l'enlever |
| `repos`              | Au niveau du fichier : `false` coupe toutes les activités au repos (promenade, café, discussion, balle). Au niveau d'un agent : `false` le garde à sa place pendant que les autres s'animent. Par défaut : `true` |
| `zones`              | Au niveau du fichier : les zones de l'espace détente, dans l'ordre (`tele`, `tennis-de-table`, `discussion`, `dortoir`, `salle-de-sport`, `piscine`). `[]` supprime l'espace détente. Par défaut : toutes |
| `masquer`            | `true` pour retirer l'agent du bureau (il reste dans le fil d'activité) |

Un agent présent dans le fichier mais introuvable sur ta machine (par exemple `Explore`) rejoint quand même l'équipe, avec son propre poste.

Si le fichier contient une erreur, ou un réglage inconnu ou invalide (une `coupe` qui n'existe pas, une couleur mal écrite, une faute de frappe dans une clé), la page l'indique en haut et le bureau continue avec les autres réglages. Les changements s'appliquent au prochain rechargement de la page.

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

## Après une mise à jour du plugin

Le serveur du bureau tourne en arrière-plan, séparé de Claude Code. Depuis la v1.2.1, le démarrage d'une session remplace tout seul un serveur d'une autre version. Si tu viens d'une version plus ancienne, l'ancien serveur ne sait pas s'arrêter : il continue de servir l'ancienne page (par exemple sans les agents qui se promènent). Arrête-le une fois, puis relance Claude Code et recharge la page :

```
# macOS et Linux
lsof -ti :4848 | xargs kill

# Windows (PowerShell)
Get-NetTCPConnection -LocalPort 4848 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Si la page affiche toujours des agents immobiles, vérifie le réglage d'accessibilité « réduire les animations » de ton système (macOS : Réglages Système, Accessibilité, Affichage) : le bureau le respecte et garde alors tout le monde à sa place.

## Lancer à la main

Depuis le dossier du plugin :

```
npm start        # démarre le serveur en arrière-plan et ouvre le navigateur
npm run serve    # serveur au premier plan (pour voir les logs)
npm test         # tests (node:test, sans dépendance)
```
