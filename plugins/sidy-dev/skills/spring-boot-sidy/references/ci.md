# CI / CD avec GitHub Actions

À lire pour toute demande de CI, de pipeline, de déploiement automatisé ou de Quality Gate. Les fichiers à copier sont dans `templates/ci/`. On ne les réécrit pas de mémoire.

| Fichier du gabarit | Copier vers | Rôle |
|---|---|---|
| `ci.yml` | `.github/workflows/ci.yml` | Tests, couverture, Sonar, validation des manifestes, publication de l'image |
| `next-version.mjs` | `.github/scripts/next-version.mjs` | Calcule la version `vX.Y.Z` de l'image (Node 20 ou plus, aucune dépendance) |
| `deploy.yml` | `.github/workflows/deploy.yml` | Déploiement manuel validé par un humain |
| `dependabot.yml` | `.github/dependabot.yml` | Mises à jour des actions, de Maven et des images Docker |

## 1. `ci.yml`

Déclenché sur les PR vers `dev`, `preprod`, `main`, `prod` et sur chaque push (donc chaque merge) dans ces quatre branches. Quatre jobs : `publish` (push) et `image` (PR) attendent `test` et `manifests`.

- **`test`** : JDK 25 (Temurin), `./mvnw -B -ntp verify`. Testcontainers utilise le Docker du runner. Le seuil JaCoCo fait échouer le build (80 % du code neuf par défaut, `sonar.md`). Si `SONAR_ENABLED=true`, analyse Sonar avec `-Dsonar.qualitygate.wait=true` : un Quality Gate rouge fait échouer le job. `fetch-depth: 0` est nécessaire à Sonar. Le secret `SONAR_TOKEN` n'est donné qu'à cette étape. L'analyse part de `main` ; les PR ne sont analysées que si `SONAR_PR_ANALYSIS=true` (SonarQube Developer ou SonarCloud), et jamais depuis un fork. SonarQube local sur Docker Desktop : `sonarqube-local.md`. Le runner du job se choisit par la variable `CI_RUNNER_LABELS` (défaut : `ubuntu-latest`).
- **`manifests`** : `kubectl kustomize deploy/k8s` plus le Job, validés par `kubeconform` (version et empreinte SHA-256 épinglées, schémas Gateway API inclus). Une erreur de YAML ou d'API est vue avant le cluster.
- **`image`** (PR seulement) : build du Dockerfile sans publication, pour vérifier qu'il compile avant la fusion.
- **`publish`** (push dans `dev`, `preprod`, `main`, `prod`) : calcule la version avec `next-version.mjs`, publie l'image, puis pose le tag git. Une publication à la fois par branche. Le digest est écrit dans le résumé du run : c'est lui qu'on déploie.

### Versions publiées

| Branche | Tag de l'image | Exemple |
|---|---|---|
| `main`, `prod` | `vX.Y.Z` | `v1.4.0` |
| `preprod` | `vX.Y.Z-rc.N` | `v1.5.0-rc.2` |
| `dev` | `vX.Y.Z-dev.N` | `v1.5.0-dev.7` |

L'image reçoit aussi le nom de la branche (`dev`, `main`…) et `sha-<commit complet>`. La base est le dernier tag stable `vX.Y.Z` atteignable ; le niveau de montée vient des messages de commit depuis ce tag : `feat` = mineur, `type!:` ou `BREAKING CHANGE` = majeur, le reste = correctif. Sans nouveau commit depuis le dernier tag, `main`/`prod` republie ce tag. Le tag git n'est posé qu'après la publication réussie de l'image.

**Registre.** Docker Hub, donc `docker.io`, par défaut : c'est le choix de Sidy. Secret `REGISTRY_TOKEN` (jeton d'accès Docker Hub) et variable `REGISTRY_USERNAME`. Variable `IMAGE_NAME` (`monpseudo/mon-api`) ; à défaut, `propriétaire/dépôt` GitHub, ce qui ne convient que pour GHCR. Pour GHCR : `REGISTRY=ghcr.io`, et ajouter `packages: write` aux permissions du job `publish` (le `GITHUB_TOKEN` suffit alors). Le nom de l'image doit être en minuscules.

**Branches protégées.** Si `main` ou `prod` exigent une PR, le tag git est poussé par `github-actions[bot]` : un tag n'est pas une branche, mais une règle de protection de tags (`v*`) le refuserait. Autoriser le bot, ou ne pas protéger les tags.

Réglages du dépôt : secret `SONAR_TOKEN` ; variables `SONAR_ENABLED`, `SONAR_PROJECT_KEY`, `SONAR_HOST_URL` (défaut SonarCloud), `SONAR_ORGANIZATION` (SonarCloud seulement), `SONAR_PR_ANALYSIS` (facultatif), `CI_RUNNER_LABELS` (facultatif). Variables de publication : `REGISTRY`, `IMAGE_NAME`, `REGISTRY_USERNAME`, secret `REGISTRY_TOKEN`. Protéger `main` et `prod` : PR obligatoire, checks `test`, `manifests` et `image` requis.

## 2. `deploy.yml`

Déclenché à la main (`workflow_dispatch`) avec l'image **par digest**. Un tag peut être réécrit, un digest non. L'entrée est validée par expression régulière avant tout usage, et passe par une variable d'environnement, jamais directement dans un script.

Ordre, qui reprend `kubernetes.md` §2 :

1. `namespace.yaml`, puis `serviceaccount.yaml` et `configmap.yaml` (le Job en a besoin au premier déploiement). Vérification que le Secret `app-secret` existe : il est géré hors dépôt.
2. Suppression de l'ancien Job Flyway, application du nouveau, `kubectl wait --for=condition=complete` (180 s). En cas d'échec, les logs du Job sont affichés et le déploiement s'arrête.
3. `kubectl apply -k deploy/k8s`, puis `rollout status` (300 s).
4. Si une étape échoue : `rollout undo` du Deployment.

Environnement GitHub `production` : relecteurs requis, et le secret `KUBE_CONFIG` (kubeconfig encodé en base64) est défini **là**, pas au niveau du dépôt. Un compte de service Kubernetes limité au namespace `app` suffit : pas de cluster-admin. Si l'hébergeur propose OIDC (jetons à durée courte), le préférer à un kubeconfig stocké.

**Limite du retour arrière.** `rollout undo` remet l'ancienne version de l'application, pas l'ancien schéma. Les migrations Flyway doivent donc rester compatibles avec la version précédente : ajouter une colonne ou une table d'abord, supprimer l'ancienne dans une version suivante.

## 3. Règles qui s'appliquent à tout workflow

- `permissions: contents: read` par défaut ; `contents: write` seulement sur le job `publish` (tag git), `packages: write` en plus si le registre est GHCR.
- Pas de `pull_request_target` avec du code de PR : les PR de forks n'ont pas accès aux secrets, et c'est voulu.
- Jamais `${{ ... }}` d'une donnée externe (titre de PR, nom de branche, entrée de workflow) directement dans un `run:`. Passer par `env:` et citer la variable.
- Actions épinglées par version majeure ; Dependabot propose les montées. Pour un durcissement maximal, épingler par SHA de commit.
- Aucun secret dans les logs, dans l'image ni dans le dépôt.

## 4. Ce qui n'est pas inclus

- **Scan de vulnérabilités de l'image** (Trivy ou équivalent) : à ajouter une fois la version de l'action vérifiée sur le projet.
- **Environnement de recette** : le gabarit déploie `production` (les images `-rc` de `preprod` se déploient avec le même workflow, en l'adaptant). Pour une recette, dupliquer `deploy.yml` avec un environnement `staging` et un namespace dédié.
- **Gradle** : les gabarits supposent Maven et `./mvnw`. Adapter `cache: gradle` et les commandes.
