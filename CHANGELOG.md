# Changelog

Historique des mises à jour de `sidy-dev` et `sidy-office`, de la plus récente à la plus ancienne. Le guide d'installation et d'utilisation est dans le [README](README.md).

> **Mise à jour (2026-11-25, `sidy-dev` v1.12.0)** — moins de tokens au démarrage des agents : `frontend-dev` ne précharge plus `design-sidy` (il intègre la maquette de `designer` et lit `design-sidy` à la demande) ; `spring-boot-sidy` déplace, sans modification, `§0 Setup d'un nouveau projet` et la checklist de `§14` dans `references/setup-projet.md` et `references/livraison.md` ; `git-sidy` déplace ses exemples, le repli API et le détail des garde-fous dans `references/garde-fous-et-exemples.md`. Aucun changement de modèle.

> **Mise à jour (2026-11-25, `sidy-dev` v1.11.1)** — `documentaliste`, `architecte`, `security-reviewer` et `security-fixer` ne préchargent plus `spring-boot-sidy` et `angular-sidy` en entier : ils trouvent le dossier du skill et lisent seulement les sections et fichiers `references/` utiles. `backend-dev` et `reviewer` renvoient vers les nouveaux fichiers `references/`.

> **Mise à jour (2026-11-25, `sidy-dev` v1.11.0)** — skills allégés : `spring-boot-sidy`, `design-sidy` et `angular-sidy` gardent un noyau court et déplacent, sans modification, leurs sections les plus lourdes dans `references/` (`architecture.md`, `builder-patterns.md`, `tests.md` ; `motion.md`, `ressources.md` ; `etats-donnees.md`, `pages-cookies.md`). La numérotation des § est conservée et chaque section garde un renvoi.

> **Mise à jour (2026-11-25, `sidy-dev` v1.10.1)** — chaque agent fixe son modèle (`model:`, `effort:`) au lieu d'hériter de ceux de ta session : `claude-sonnet-5-5` pour la plupart, `claude-opus-5-5` pour `architecte`, `claude-haiku-5-5` pour `documentaliste`, tous avec `effort: medium`. Pour ménager un forfait Pro, et parce qu'une session ouverte sur un modèle plus cher ne se répercute plus sur les agents. Voir « Choisir le modèle d'un agent ».

>

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
