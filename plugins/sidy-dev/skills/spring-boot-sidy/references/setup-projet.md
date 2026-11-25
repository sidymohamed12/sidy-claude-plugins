# Setup d'un nouveau projet (§0 du skill)

Livrer, dès le départ, tout ce socle (détails dans les références) :

- `pom.xml` / `build.gradle` : parent Boot **4.2.0** ; starters **sans version** : `webmvc` (ou `web`), `validation`, `data-jpa`, `security`, `actuator`, `data-redis`, `cache`, **`spring-boot-starter-flyway`** + `flyway-database-postgresql` (runtime, sans version), driver `postgresql` ; hors BOM : springdoc **3.2.1**, MapStruct **1.6.3**, Lombok **1.18.48**, Bucket4j **8.23.0** (`bucket4j_jdk17-core` + `bucket4j_jdk17-lettuce`), ShedLock **7.11.0** (`shedlock-spring` + `shedlock-provider-jdbc-template`) ; tests : `test`, Testcontainers, `awaitility`, `jacoco`. **Pas** de `jackson-databind` 2.x ni de `spring-boot-jackson2` sauf migration temporaire écrite.
- `application.yml`, `application-dev.yml`, `application-test.yml`, `application-prod.yml`, `logback-spring.xml`, `.env.example`, `.gitignore` (dont `.env`).
- Migration Flyway `V1__init.sql` et migration de la table `shedlock` (avec `GRANT` vers le rôle applicatif via placeholder `${app_role}`).
- Configuration : `SecurityConfig` (CSRF : préférer `csrf.spa()` Security 7 + matcher Sidy), CORS, `RateLimitFilter`, `OriginCheckFilter`, `BrowserNavigationBlockFilter`, `CacheConfig` (**JsonMapper** Jackson 3, pas `ObjectMapper` Jackson 2), `SchedulingConfig`, bean `Clock` UTC, handler d'erreurs global, OpenAPI.
- `Dockerfile`, `.dockerignore`, `docker-compose.dev.yml`, `docker-compose.mid-dev.yml`, `docker-compose.prod.yml`.
- `.github/workflows/ci.yml`, `deploy.yml` et `.github/dependabot.yml` : copie de `templates/ci/` (`references/ci.md`), avec `next-version.mjs` dans `.github/scripts/`.
- `deploy/k8s/` : copie de `templates/k8s/` (sans `secret.example.yaml` ; `job-flyway.yaml` s'applique à part, avant le `kustomize`), image et namespace adaptés. Secret réel hors git.
- `README.md` détaillé qui décrit tout le projet, front et back : copie de `templates/README.projet.md`, rempli avec les vraies commandes, variables et versions, et tenu à jour à chaque changement qui touche l'architecture, le démarrage, la configuration ou le déploiement.
- `docs/` avec `adr/` (premier ADR : choix d'architecture), `http/`, `diagrams/`, `flows/`.
- Spring : `spring.jpa.hibernate.ddl-auto=validate`, `spring.jpa.open-in-view=false`, configuration typée avec `@ConfigurationProperties` sur un `record` validé (jamais de `@Value` éparpillés), secrets uniquement via variables d'environnement.
