# Infrastructure, configuration et documentation — référence détaillée

À lire pour tout setup de projet, ajout de configuration, cache, tâche planifiée, logs, Docker ou documentation. Ces règles s'appliquent **à chaque projet**.

## Sommaire

1. Profils YAML
2. `.env.example` toujours synchronisé
3. Règle du time zone (valeur lue dans le YAML)
   3 bis. Pool de connexions HikariCP
4. Cache Redis
5. Tâches planifiées avec ShedLock
6. Logs essentiels et rétention
7. Dockerfile
8. Docker Compose (dev, mid-dev, prod)
9. Dossier `docs/`

## 1. Profils YAML

Spring ne charge un profil que si le fichier suit la convention `application-<profil>.yml` : c'est donc `application-dev.yml`, `application-prod.yml`, `application-test.yml` (pour ce que l'on appelle « app-dev / app-prod / app-test »).

| Fichier                | Rôle                                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `application.yml`      | Socle commun : nom de l'app, `app.timezone` (défaut UTC), pool Hikari, `ddl-auto: validate`, `open-in-view: false`, Flyway, probes Actuator, cache, limites par défaut. Aucun secret. |
| `application-dev.yml`  | Swagger activé (racine), logs en console niveau `DEBUG` sur les packages de l'app, valeurs locales pratiques (PostgreSQL et Redis locaux).                                            |
| `application-test.yml` | Tests : Testcontainers, hash de mot de passe rapide, limites de débit très hautes, schedulers désactivés.                                                                             |
| `application-prod.yml` | **Uniquement des variables d'environnement**, aucune valeur par défaut pour un secret, Swagger désactivé, logs `INFO`, erreurs sans détail technique.                                 |

**Profil par défaut : `dev`.** Sans profil explicite, l'application démarre en `dev` (Swagger, logs `DEBUG`, PostgreSQL et Redis locaux), ce qui donne un lancement local sans configuration. C'est `application.yml` qui le déclare :

```yaml
spring:
  profiles:
    default: dev # utilisé uniquement si aucun profil n'est activé
```

- `spring.profiles.default` s'efface dès qu'un profil est activé : `SPRING_PROFILES_ACTIVE=prod` (ou `test`) suffit à le remplacer, sans modifier le fichier.
- **Production : le profil `prod` est toujours activé explicitement** (`SPRING_PROFILES_ACTIVE=prod` dans `docker-compose.prod.yml` et dans le `Dockerfile` / l'orchestrateur), puisque oublier cette variable ferait démarrer la production en `dev` avec Swagger visible.
- Garde-fou : un test vérifie que `docker-compose.prod.yml` définit `SPRING_PROFILES_ACTIVE: prod`, et que `application.yml` ne contient aucun secret (il est partagé par tous les profils).
- Les tests activent `test` avec `@ActiveProfiles("test")`.

Extrait de `application-prod.yml` :

```yaml
server:
  shutdown: graceful
  request:
    header:
      forwarded:
        strategy: framework
        use-prefix: true
  error:
    include-message: never
    include-stacktrace: never
    include-binding-errors: never

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  flyway:
    enabled: ${FLYWAY_ENABLED:false}
    url: ${FLYWAY_URL:${DB_URL}}
    user: ${FLYWAY_USER:}
    password: ${FLYWAY_PASSWORD:}
  data:
    redis:
      host: ${REDIS_HOST}
      port: ${REDIS_PORT}
      password: ${REDIS_PASSWORD}

springdoc:
  api-docs:
    enabled: false
  swagger-ui:
    enabled: false

management:
  endpoint:
    health:
      probes:
        enabled: true
      show-details: never
      show-components: never
      validate-group-membership: true # Boot 4 : un membre absent fait échouer le démarrage. Ne jamais passer à false
      group:
        liveness:
          include: livenessState
        readiness:
          include: readinessState,db,redis,diskSpace
  endpoints:
    web:
      exposure:
        include: health,info
```

Le détail (sécurité des chemins, groupes, hooks, manifestes) est dans `kubernetes.md`. `liveness` ne contient **pas** `db` ni `redis`.

## 2. `.env.example` toujours synchronisé

**À chaque clé `${VARIABLE}` ajoutée dans `application-prod.yml`, ajouter la variable dans `.env.example`** (valeur factice, commentaire d'usage, jamais de vraie valeur), et dans `docker-compose.prod.yml` si elle y est transmise.

```dotenv
# Base de données PostgreSQL
DB_URL=jdbc:postgresql://localhost:5432/app
DB_USERNAME=app
DB_PASSWORD=change-me

# Flyway (compte DDL distinct en prod ; FLYWAY_ENABLED=false sur l'app si one-shot migrate ; FLYWAY_USER / FLYWAY_PASSWORD ne sont donnés qu'au Job de migration, pas aux pods de l'app)
FLYWAY_URL=jdbc:postgresql://localhost:5432/app
FLYWAY_USER=flyway
FLYWAY_PASSWORD=change-me
FLYWAY_ENABLED=false

# Fuseau de l'application (défaut UTC), source unique de app.timezone
APP_TIMEZONE=UTC

# Pool de connexions Hikari
DB_POOL_MAX_SIZE=10
DB_POOL_MIN_IDLE=2
DB_POOL_CONNECTION_TIMEOUT_MS=30000
DB_POOL_MAX_LIFETIME_MS=1800000

# CORS : origines autorisées du front, séparées par des virgules (jamais *)
CORS_ALLOWED_ORIGINS=https://app.example.com

# Blocage de l'ouverture directe de /api/** dans un navigateur
BLOQUER_NAVIGATION_DIRECTE=true

# Redis (cache, rate-limiting, révocation JWT)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=change-me
```

Garde-fou automatique (test écrit **avant** d'ajouter de nouvelles clés) :

```java
class EnvExampleConsistencyTest {

    private static final Pattern PLACEHOLDER = Pattern.compile("\\$\\{([A-Z][A-Z0-9_]*)(?::[^}]*)?}");
    private static final Path PROD_CONFIG = Path.of("src/main/resources/application-prod.yml");
    private static final Path ENV_EXAMPLE = Path.of(".env.example");

    @Test
    void should_declare_every_prod_variable_in_env_example() throws IOException {
        Set<String> required = new TreeSet<>();
        Matcher matcher = PLACEHOLDER.matcher(Files.readString(PROD_CONFIG));
        while (matcher.find()) {
            required.add(matcher.group(1));
        }

        Set<String> documented = Files.readAllLines(ENV_EXAMPLE).stream()
                .filter(line -> !line.isBlank() && !line.startsWith("#") && line.contains("="))
                .map(line -> line.substring(0, line.indexOf('=')).trim())
                .collect(Collectors.toSet());

        assertThat(documented).containsAll(required);
    }
}
```

## 3. Règle du time zone (valeur lue dans le YAML)

Le fuseau n'est **jamais écrit en dur** dans le code ni dans les fichiers de config dérivés : il est défini **une seule fois** dans le YAML, par la propriété `app.timezone`, alimentée par la variable d'environnement `APP_TIMEZONE` (défaut `UTC`). Tout le reste en dérive.

```yaml
# application.yml (socle commun)
app:
  timezone: ${APP_TIMEZONE:UTC}

spring:
  jackson:
    time-zone: ${app.timezone}
  jpa:
    properties:
      hibernate:
        jdbc:
          time_zone: ${app.timezone}
```

```java
// config/TimeConfig.java
@Configuration
public class TimeConfig {

    @Bean
    public ZoneId applicationZone(@Value("${app.timezone}") String timezone) {
        return ZoneId.of(timezone);
    }

    @Bean
    public Clock clock(ZoneId applicationZone) {
        return Clock.system(applicationZone);
    }
}
```

- **Une seule source** : `app.timezone`. `Clock`, Jackson, Hibernate, les crons (`zone = "${app.timezone}"`), le pattern de logs (`${APP_TIMEZONE:-UTC}` dans logback) et le conteneur (`TZ: ${APP_TIMEZONE:-UTC}` dans les compose) la reprennent. Ne pas mettre `-Duser.timezone=UTC` en dur dans le Dockerfile : `TZ` suffit à la JVM sous Linux.
- **Valeur par défaut `UTC`** : on ne change `APP_TIMEZONE` que si le métier l'exige. Les instants restent stockés en `TIMESTAMPTZ` (type Java `Instant` ou `OffsetDateTime`), donc indépendants du fuseau ; dates sans heure en `LocalDate`.
- `application-prod.yml` : `app.timezone: ${APP_TIMEZONE:UTC}` ; la variable est ajoutée à `.env.example` (`APP_TIMEZONE=UTC`) et aux compose.
- Un `ZoneId` valide est exigé au démarrage (`ZoneId.of` échoue vite si la valeur est incorrecte) ; un test vérifie que `Clock` et Jackson suivent `app.timezone`.
- API : ISO-8601 avec décalage ou `Z` (`2026-11-05T14:30:00Z`) ; le front convertit vers le fuseau de l'utilisateur.
- Jamais de dépendance au fuseau par défaut de la JVM : le bean `Clock` est injecté pour tout accès à l'heure et remplacé par un `Clock.fixed` dans les tests.
- Une règle métier liée à un fuseau précis (« fin de journée à Dakar ») utilise une propriété séparée (`app.business-zone`) lue dans la configuration, jamais le fuseau de la machine.

## 3 bis. Pool de connexions HikariCP

Hikari est configuré **explicitement** (jamais les valeurs par défaut sans les avoir vérifiées), avec des valeurs lues dans le YAML et surchargeables par variables d'environnement.

```yaml
# application.yml
spring:
  datasource:
    hikari:
      pool-name: app-hikari
      maximum-pool-size: ${DB_POOL_MAX_SIZE:10}
      minimum-idle: ${DB_POOL_MIN_IDLE:2}
      connection-timeout: ${DB_POOL_CONNECTION_TIMEOUT_MS:30000}
      idle-timeout: ${DB_POOL_IDLE_TIMEOUT_MS:600000}
      max-lifetime: ${DB_POOL_MAX_LIFETIME_MS:1800000}
      keepalive-time: ${DB_POOL_KEEPALIVE_MS:300000}
      validation-timeout: 5000
      leak-detection-threshold: ${DB_POOL_LEAK_DETECTION_MS:0} # 0 = désactivé
```

- **Taille du pool** : petite et calculée, pas « le plus grand possible ». Règle de départ : `maximum-pool-size` ≈ nombre de cœurs du serveur de base × 2 + disques, puis mesurer. Surtout : `max_connections` de PostgreSQL ≥ (taille du pool × nombre d'instances de l'application) + marge pour l'administration et les migrations.
- `max-lifetime` **inférieur** au délai de coupure imposé par PostgreSQL, le proxy ou le pare-feu ; `keepalive-time` < `max-lifetime`.
- `connection-timeout` court en production (échouer vite plutôt que d'empiler des requêtes) ; une `SQLTransientConnectionException` est traitée par le handler global en `503`.
- `leak-detection-threshold` : activé en dev (par exemple 20000 ms) pour repérer les connexions non rendues, désactivé ou très haut en prod.
- `application-prod.yml` : toutes les valeurs ci-dessus passent par des variables d'environnement avec défauts sûrs ; elles sont ajoutées à `.env.example`.
- `application-test.yml` : pool minuscule (`maximum-pool-size: 3`) pour les tests Testcontainers.
- Hygiène côté code : `open-in-view: false`, transactions courtes (pas d'appel HTTP ni d'attente dans une `@Transactional`), `LAZY` par défaut, pagination côté base.
- Supervision : métriques Micrometer `hikaricp.connections.*` (actives, en attente, timeout) exposées par l'Actuator ; alerte si des threads attendent une connexion.
- Si Redis, Flyway ou des jobs ShedLock partagent la base, tenir compte de leurs connexions dans le calcul de la taille du pool.

## 4. Cache Redis

Redis est **toujours présent** (cache, rate-limiting, révocation JWT). Dépendances : `spring-boot-starter-data-redis`, `spring-boot-starter-cache`.

- `@EnableCaching` + `RedisCacheManager` : préfixe de clés par application (`app:`), **TTL obligatoire** par cache (défaut en configuration, surcharge par nom de cache), sérialisation **JSON** (jamais la sérialisation Java).
- Noms de caches en **constantes** (règle Sonar des littéraux dupliqués).
- Mettre en cache des **DTO / modèles de lecture**, pas des entités JPA (proxies Hibernate, lazy loading).
- Clé qui inclut tout ce qui change le résultat (utilisateur, locale, tenant, paramètres de filtre). Jamais de données propres à un utilisateur dans une clé partagée.
- **Invalidation explicite** à chaque écriture concernée (`@CacheEvict`, `@CachePut`) ; pas de cache sur des données qui doivent être temps réel (soldes, stocks).
- Pour respecter la Clean Architecture, préférer un **Decorator** du port de lecture (`CachedProductReader implements ProductReader` qui enveloppe l'adapter JPA, dans `<feature>/infrastructure/cache/`) ou `@Cacheable` au niveau use case de lecture, jamais dans le domaine.
- Pas de mot de passe, jeton ni donnée sensible en cache, hors les clés de révocation JWT (voir `securite.md`).
- Tests : Testcontainers Redis ; 1er appel → source de données, 2ᵉ appel → cache (repository appelé une seule fois) ; écriture → cache invalidé ; TTL respecté.

```java
public final class CacheNames {
    public static final String PRODUCTS = "products";
    private CacheNames() { }
}
```

## 5. Tâches planifiées avec ShedLock

**Toute tâche `@Scheduled` est protégée par ShedLock**, pour qu'une seule instance l'exécute à la fois quand l'application est déployée en plusieurs exemplaires.

- Dépendances : `shedlock-spring` + `shedlock-provider-jdbc-template` (par défaut, verrou durable dans PostgreSQL). Le provider Redis est acceptable si le projet le préfère.
- Table créée par **migration Flyway** :

```sql
CREATE TABLE shedlock (
    name       VARCHAR(64)  NOT NULL,
    lock_until TIMESTAMP    NOT NULL,
    locked_at  TIMESTAMP    NOT NULL,
    locked_by  VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
);

GRANT SELECT, INSERT, UPDATE ON shedlock TO ${app_role};
```

Placeholder Flyway (socle `application.yml`) : `spring.flyway.placeholders.app_role: ${spring.datasource.username:app}`. En prod le `GRANT` cible le compte applicatif pendant que la migration tourne avec `FLYWAY_USER`. ShedLock n'est **pas** le verrou des migrations Flyway (verrou advisory PostgreSQL).

```java
@Configuration
@EnableScheduling
@EnableSchedulerLock(defaultLockAtMostFor = "PT10M")
@Profile("!migration")
public class SchedulingConfig {

    @Bean
    public LockProvider lockProvider(DataSource dataSource) {
        return new JdbcTemplateLockProvider(
                JdbcTemplateLockProvider.Configuration.builder()
                        .withJdbcTemplate(new JdbcTemplate(dataSource))
                        .usingDbTime()
                        .build());
    }
}

@Component
@RequiredArgsConstructor
public class ExpiredTokenCleanupJob {

    private static final String LOCK_NAME = "expiredTokenCleanup";

    private final CleanExpiredTokensUseCase cleanExpiredTokens;

    @Scheduled(cron = "${app.jobs.token-cleanup.cron}", zone = "${app.timezone}")
    @SchedulerLock(name = LOCK_NAME, lockAtMostFor = "PT10M", lockAtLeastFor = "PT30S")
    public void run() {
        cleanExpiredTokens.execute();
    }
}
```

- Un nom de verrou unique par tâche, en constante. `lockAtMostFor` > durée maximale réaliste ; `lockAtLeastFor` évite une double exécution due à un décalage d'horloge.
- Expression cron **dans la configuration**, pas en dur. Tâches **idempotentes**.
- Le job vit dans `<feature>/infrastructure/scheduling/` et `SchedulingConfig` dans `config/`. Il ne contient aucune logique : il appelle un use case via son port `in` (testable sans scheduler). Schedulers désactivés en profil `test` et en profil `migration` (`@Profile("!migration")` : le Job Flyway doit pouvoir s'arrêter, voir `kubernetes.md`).

## 6. Logs essentiels et rétention

À journaliser : démarrage/arrêt, événements métier importants (`info`), échecs d'authentification et refus d'accès (`warn`), erreurs inattendues avec identifiant de corrélation (`error`), exécution des tâches planifiées, dépassements de rate-limit. Rien de plus : pas de log par ligne de boucle, pas de corps de requête.

- Identifiant de corrélation par requête (`requestId` en MDC, renvoyé dans l'en-tête de réponse et dans le `ProblemDetail`).
- Aucune donnée sensible (voir `securite.md`, section 8).
- **Rétention : durée de vie limitée et archives compressées en zip.** Fichier `logback-spring.xml` :

```xml
<configuration>
  <springProperty name="LOG_DIR" source="app.logging.dir" defaultValue="logs"/>
  <property name="LOG_PATTERN"
            value="%d{yyyy-MM-dd'T'HH:mm:ss.SSSXXX,${APP_TIMEZONE:-UTC}} %-5level [%X{requestId}] %logger{36} - %msg%n"/>

  <springProfile name="dev,test">
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
      <encoder><pattern>${LOG_PATTERN}</pattern></encoder>
    </appender>
    <root level="INFO"><appender-ref ref="CONSOLE"/></root>
    <logger name="com.example.app" level="DEBUG"/>
  </springProfile>

  <springProfile name="prod">
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
      <file>${LOG_DIR}/app.log</file>
      <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
        <fileNamePattern>${LOG_DIR}/archive/app.%d{yyyy-MM-dd}.%i.log.zip</fileNamePattern>
        <maxFileSize>10MB</maxFileSize>
        <maxHistory>30</maxHistory>
        <totalSizeCap>1GB</totalSizeCap>
        <cleanHistoryOnStart>true</cleanHistoryOnStart>
      </rollingPolicy>
      <encoder><pattern>${LOG_PATTERN}</pattern></encoder>
    </appender>
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
      <encoder><pattern>${LOG_PATTERN}</pattern></encoder>
    </appender>
    <root level="INFO">
      <appender-ref ref="FILE"/>
      <appender-ref ref="CONSOLE"/>
    </root>
  </springProfile>
</configuration>
```

- Durée de rétention (`maxHistory`) et plafond (`totalSizeCap`) adaptés au projet (30 jours / 1 Go par défaut) ; à confirmer pour les données soumises à une obligation légale de conservation.
- En prod, le répertoire `LOG_DIR` est un **volume** monté (voir compose), pour survivre au conteneur.

## 7. Dockerfile

Exigences : **image légère**, **layers Spring Boot** pour un cache de build efficace, **utilisateur non-root**, **HEALTHCHECK** sur l'Actuator, versions d'images épinglées, aucun secret dans l'image. Adapter les commandes si le projet est en Gradle.

```dockerfile
# syntax=docker/dockerfile:1

# ---- Build ----
FROM eclipse-temurin:25-jdk-alpine AS build
WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN --mount=type=cache,target=/root/.m2 ./mvnw -q dependency:go-offline
COPY src src
RUN --mount=type=cache,target=/root/.m2 ./mvnw -q -DskipTests package \
 && cp target/*.jar application.jar \
 && java -Djarmode=tools -jar application.jar extract --layers --destination extracted

# ---- Runtime ----
FROM eclipse-temurin:25-jre-alpine
RUN addgroup -S app && adduser -S app -G app \
 && mkdir -p /var/log/app && chown app:app /var/log/app
WORKDIR /app
ENV TZ=UTC \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
# TZ est redéfini au lancement par TZ=${APP_TIMEZONE} (compose) ; pas de -Duser.timezone en dur
COPY --from=build --chown=app:app /workspace/extracted/dependencies/ ./
COPY --from=build --chown=app:app /workspace/extracted/spring-boot-loader/ ./
COPY --from=build --chown=app:app /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build --chown=app:app /workspace/extracted/application/ ./
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health/liveness || exit 1
ENTRYPOINT ["java", "-jar", "application.jar"]
```

- Les couches rarement modifiées (dépendances) viennent **avant** celles qui changent à chaque commit (`application/`).
- `.dockerignore` : `target/`, `.git/`, `.env`, `docs/`, `*.md`, fichiers d'IDE.
- Vérifier la commande `extract --layers` selon la version de Spring Boot ; adapter si besoin.
- Le healthcheck suppose `management.endpoint.health.probes.enabled=true` et `GET /actuator/health/liveness` autorisé sans authentification. Pas `/actuator/**`. Le détail est dans `kubernetes.md`.

## 8. Docker Compose (dev, mid-dev, prod)

Trois fichiers à la racine :

| Fichier                      | Usage                                                                                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker-compose.dev.yml`     | **Dev complet** : l'application + PostgreSQL + Redis + services annexes, tout dans Docker.                                                                                                                                |
| `docker-compose.mid-dev.yml` | **Mid-dev** : uniquement Redis et les services annexes (mail catcher, stockage objet…), **sans PostgreSQL** car il tourne déjà sur la machine ; l'app se lance depuis l'IDE en profil `dev` et se connecte à `localhost`. |
| `docker-compose.prod.yml`    | **Prod** : image publiée de l'app, variables via `.env`, aucun port interne exposé, redémarrage automatique, limites de ressources, volume de logs.                                                                       |

Socle commun à respecter : healthchecks sur chaque service, `depends_on` avec `condition: service_healthy`, volumes nommés, `TZ=${APP_TIMEZONE:-UTC}`, versions d'images épinglées.

```yaml
# docker-compose.dev.yml
services:
  app:
    build: .
    environment:
      SPRING_PROFILES_ACTIVE: dev
      TZ: ${APP_TIMEZONE:-UTC}
    ports: ["8080:8080"]
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      TZ: ${APP_TIMEZONE:-UTC}
    ports: ["5432:5432"]
    volumes: [postgres-data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 10s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  postgres-data:
```

```yaml
# docker-compose.mid-dev.yml (pas de PostgreSQL : celui de la machine est utilisé)
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
  # ajouter ici les autres services annexes du projet (mail catcher, MinIO, broker…)
```

```yaml
# docker-compose.prod.yml
services:
  app:
    image: ${APP_IMAGE}
    env_file: .env
    environment:
      SPRING_PROFILES_ACTIVE: prod
      TZ: ${APP_TIMEZONE:-UTC}
    restart: unless-stopped
    ports: ["8080:8080"] # ou derrière un reverse proxy, sans publier le port
    volumes: [app-logs:/var/log/app]
    security_opt: ["no-new-privileges:true"]
    deploy:
      resources:
        limits: { memory: 768M }
    depends_on:
      redis: { condition: service_healthy }

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--requirepass", "${REDIS_PASSWORD}"]
    environment:
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    restart: unless-stopped # aucun port publié : joignable seulement par le réseau Compose
    volumes: [redis-data:/data]
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "REDISCLI_AUTH=$$REDIS_PASSWORD redis-cli ping | grep PONG",
        ]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  app-logs:
  redis-data:
```

PostgreSQL de prod : base managée ou service Compose avec volume, mot de passe via `.env`, port non publié ; à demander selon le projet. Toute nouvelle variable de `docker-compose.prod.yml` est aussi ajoutée à `.env.example`.

## 9. Dossier `docs/`

Chaque projet a un dossier `docs/` à la racine :

```
docs/
├── adr/        décisions d'architecture (un fichier par décision)
├── http/       requêtes pour tester les endpoints (.http)
├── diagrams/   diagrammes (architecture, modèle de données, séquences)
└── flows/      flux de certains processus métier ou techniques
```

- **`adr/`** : fichiers `0001-titre-en-kebab-case.md` (format MADR : _Titre, Statut, Date, Contexte, Décision, Conséquences, Alternatives écartées_) + un `README.md` qui indexe les ADR. Un ADR est créé à chaque décision structurante : choix d'architecture, CSRF avec/sans cookie, comportement si Redis tombe, stratégie de cache, rétention des logs, etc. Un ADR accepté n'est jamais réécrit : on en crée un nouveau qui le remplace.
- **`http/`** : un fichier `.http` par feature (compatible IntelliJ HTTP Client et extension REST Client de VS Code) couvrant **chaque endpoint** : cas nominal et principaux cas d'erreur (`400`, `401`, `403`, `404`). Variables dans `http-client.env.json` (`baseUrl`…) ; jetons et secrets dans `http-client.private.env.json`, **ignoré par Git**. Mis à jour à chaque ajout ou modification d'endpoint.
- **`diagrams/`** : diagrammes en texte (**Mermaid** par défaut, PlantUML si le projet l'utilise) pour qu'ils restent versionnables et diffables : vue d'architecture, modèle de données (ERD), diagrammes de séquence des cas d'usage clés.
- **`flows/`** : un fichier par processus (authentification et refresh, révocation de jeton, cycle de vie d'une commande, paiement…), avec un diagramme Mermaid et quelques lignes d'explication.
- Toute feature qui ajoute un endpoint met à jour `docs/http/` ; toute décision structurante ajoute un ADR ; tout processus non trivial a son flow.
