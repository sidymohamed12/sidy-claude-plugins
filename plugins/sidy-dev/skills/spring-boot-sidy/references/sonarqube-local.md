# SonarQube local (Docker Desktop) relié à GitHub Actions

À lire pour brancher la CI sur un SonarQube qui tourne sur la machine de Sidy. Fichiers : `templates/sonarqube/` (Compose et `.env` d'exemple) et `templates/ci/ci.yml`.

## 1. Le problème à comprendre d'abord

Les runners hébergés par GitHub tournent dans le cloud : ils ne voient pas le `localhost:9000` d'un Docker Desktop. Deux façons de les relier, la première est celle qui est préparée :

1. **Runner auto-hébergé** sur la machine qui héberge SonarQube. Le job `test` (tests, couverture, analyse) tourne chez Sidy et joint `http://localhost:9000`. Les jobs `manifests` et `image` restent sur les runners GitHub.
2. **Tunnel** (Tailscale, Cloudflare Tunnel) qui expose SonarQube à GitHub. Non préparé : il ouvre un serveur d'analyse à Internet, à n'envisager qu'avec une authentification forte.

```
push main ─► GitHub ─► runner auto-hébergé (machine de Sidy)
                         ├─ ./mvnw verify (Testcontainers via Docker Desktop)
                         └─ sonar:sonar ─► http://localhost:9000 (SonarQube + PostgreSQL)
```

## 2. Démarrer SonarQube

```
cp templates/sonarqube/.env.sonarqube.example .env.sonarqube   # choisir un mot de passe
docker compose --env-file .env.sonarqube -f templates/sonarqube/docker-compose.sonarqube.yml up -d
```

- Interface : `http://localhost:9000`, liée à `127.0.0.1` seulement. Premier démarrage : une à deux minutes. Se connecter en `admin` / `admin`, puis changer le mot de passe tout de suite.
- Image `sonarqube:<version>-community`, **version épinglée** (un tag flottant peut sauter plusieurs versions et casser la migration de la base). Vérifier que le tag existe sur Docker Hub ; pour monter de version, changer le tag et relancer.
- PostgreSQL dans le même Compose, données dans des volumes nommés. Sauvegarde : `docker compose ... exec db pg_dump -U sonarqube sonarqube > sonarqube.sql`. Ne jamais lancer `down -v` sans sauvegarde : ça efface l'historique.
- `.env.sonarqube` ne se commit pas (l'ajouter au `.gitignore`).

## 3. Créer le projet et le jeton

1. SonarQube : *Projects* > *Create project* > *Manually*. Noter la **clé du projet**.
2. *My Account* > *Security* : générer un jeton d'analyse. Le copier, il ne s'affiche qu'une fois.
3. Quality Gate : « Sonar way » exige 80 % de couverture sur le code neuf, ce qui correspond au seuil du skill (`sonar.md`).

## 4. Installer le runner auto-hébergé

Dépôt GitHub > *Settings* > *Actions* > *Runners* > *New self-hosted runner* : GitHub affiche les commandes de téléchargement et un jeton d'enregistrement (valable peu de temps). Puis, dans le dossier du runner :

```
./config.sh --url https://github.com/<proprietaire>/<depot> --token <JETON> --labels sonar-local
./svc.sh install && ./svc.sh start     # macOS et Linux : démarre avec la session
```

(Windows : `.\config.cmd`, puis installer comme service quand l'assistant le propose.)

Pré-requis sur cette machine : Docker Desktop lancé (Testcontainers), `git`. Le JDK 25 est installé par `actions/setup-java` dans le job.

## 5. Régler le dépôt GitHub

*Settings* > *Secrets and variables* > *Actions* :

| Type | Nom | Valeur |
|---|---|---|
| Secret | `SONAR_TOKEN` | le jeton de l'étape 3 |
| Variable | `SONAR_ENABLED` | `true` |
| Variable | `SONAR_HOST_URL` | `http://localhost:9000` |
| Variable | `SONAR_PROJECT_KEY` | la clé du projet |
| Variable | `CI_RUNNER_LABELS` | `["self-hosted", "sonar-local"]` |

Ne pas définir `SONAR_ORGANIZATION` (SonarCloud seulement).

## 6. Vérifier

Pousser sur `main` : le job `test` doit partir sur le runner (visible dans le run), l'étape « Analyse Sonar et Quality Gate » doit passer, et le projet doit apparaître dans SonarQube avec sa couverture. Un Quality Gate rouge fait échouer le job : c'est voulu.

## 7. Limites et risques

- **Community Build : une seule branche, pas d'analyse de PR.** Analyser une PR écraserait les résultats de `main`. La CI analyse donc `main` seulement, et le Quality Gate se vérifie **après** la fusion. Avant, la PR est protégée par les tests et le seuil JaCoCo du build. Pour analyser les PR : SonarQube Developer ou SonarCloud (`SONAR_PR_ANALYSIS=true`).
- **Dépôt public : ne pas utiliser de runner auto-hébergé.** Une PR de fork pourrait y exécuter du code sur la machine de Sidy. Réservé aux dépôts privés, avec l'approbation obligatoire des workflows des contributeurs externes.
- **Machine éteinte ou Docker Desktop fermé** : le job reste en file d'attente sans erreur claire. Repasser `CI_RUNNER_LABELS` à `["ubuntu-latest"]` et `SONAR_ENABLED` à `false` le temps de l'absence.
- **Runner persistant** : l'espace de travail et le cache Maven restent entre deux runs. Pas de secret écrit sur disque par les workflows.
- Le runner donne au dépôt un accès à la machine : l'installer dans un compte utilisateur dédié, pas en administrateur.
