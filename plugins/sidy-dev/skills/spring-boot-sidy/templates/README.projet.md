# <Nom du projet>

<Une à trois phrases : ce que fait le produit, pour qui, quel problème il résout.>

## Sommaire
Présentation · Architecture · Fonctionnalités · Démarrage · Configuration · Tests · Base de données · CI/CD et déploiement · Contribuer · Licence et contact

## Présentation
- **Contexte** : <client, organisation, objectif>.
- **Périmètre** : <ce que le projet couvre, et ce qu'il ne couvre pas>.
- **État** : <en cours, en production, version courante>.

## Architecture
Schéma (Mermaid ou lien vers `docs/diagrams/`) montrant le front, le back, la base de données, Redis, les services externes.

| Partie | Dossier | Stack |
|---|---|---|
| Back-end | `<backend/>` | Java <25>, Spring Boot <4.x>, PostgreSQL, Flyway, Redis |
| Front-end | `<frontend/>` | <Angular 22, Tailwind v4 / HTML-CSS-JS>, <SSR ou non> |

Back : Clean Architecture (domaine, application, infrastructure, présentation), packages principaux, décisions dans `docs/adr/`.
Front : structure `core/`, `shared/`, `features/`, routing, gestion des états, thème et design (`DESIGN.md`).

## Fonctionnalités
Liste par module ou feature, une ligne chacune, avec l'état (fait, en cours, prévu).

## Démarrage
Prérequis (versions) : JDK, Node, Docker, etc.

```bash
# Base de données et services
docker compose -f docker-compose.dev.yml up -d
# Back-end
cd <backend> && ./mvnw spring-boot:run
# Front-end
cd <frontend> && npm ci && npm start
```
URLs locales : front `<http://localhost:4200>`, API `<http://localhost:8080>`, Swagger `<…/swagger-ui.html>`.

## Configuration
Tableau des variables d'environnement (nom, rôle, exemple factice, obligatoire ou non). Les valeurs réelles ne sont jamais dans le dépôt : copier `.env.example` en `.env`. Profils Spring : `dev`, `test`, `prod`.

## API
Lien vers la documentation OpenAPI et vers `docs/http/`. Authentification : <JWT, cookies, rôles>.

## Tests
```bash
./mvnw verify      # tests, couverture JaCoCo, Testcontainers
npm test           # front
```
Seuil de couverture, règles Sonar, Quality Gate.

## Base de données
Migrations Flyway dans `src/main/resources/db/migration` (une migration appliquée ne se modifie jamais). Modèle simplifié ou lien vers le diagramme.

## CI/CD et déploiement
Workflows GitHub Actions, branches (`dev`, `preprod`, `main`, `prod`), versions d'image publiées sur Docker Hub (`docker.io/<compte>/<projet>:vX.Y.Z`), déploiement Kubernetes (`deploy/k8s/`).

## Contribuer
Une branche par tâche (`feat/`, `fix/`, `hot-fix/`, `core/`…), commits `type(feature): réalisation`, PR vers `dev` ou `preprod`. `main` et `prod` sont alimentées par le responsable du projet.

## Contact
<Responsable, adresse ou lien>.
