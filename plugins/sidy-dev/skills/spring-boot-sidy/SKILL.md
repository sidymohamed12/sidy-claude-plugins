---
name: "spring-boot-sidy"
description: "Conventions back-end Spring Boot de Sidy : Clean Architecture (Uncle Bob), DDD, SOLID, TDD, clean code, règles Sonar, design patterns, Builder, PostgreSQL + Flyway, Redis (cache, rate-limiting, révocation JWT), sécurité (CSRF, injections SQL), ShedLock, Docker, Actuator, Kubernetes, profils YAML, docs. À utiliser dès que l'utilisateur parle de Spring Boot, back-end Java, API REST, entité JPA, use case, service, controller, migration Flyway, JWT, Redis, Docker, Kubernetes, Actuator, tests JUnit/Mockito, ou demande de coder, relire ou refactorer du code Java côté serveur, même sans dire « skill »."
---

# Spring Boot — façon Sidy

Avant d'écrire du code dans un projet existant : lire une feature complète déjà faite et en reproduire exactement les patterns (nommage, découpage des packages, gestion d'erreurs, tests). Les fichiers fournis par l'utilisateur sont canoniques : les utiliser tels quels.

Cible (nouveau projet, nov. 2026) : **Spring Boot 4.2.0**, **Java 25** (LTS), **Jackson 3** (`tools.jackson`), **Spring Security 7.2**. Versions hors BOM à épingler ensemble : springdoc **3.2.1**, Bucket4j **8.23.0** (`com.bucket4j:bucket4j_jdk17-*`), ShedLock **7.11.0**, MapStruct **1.6.3**, Lombok **1.18.48**. Si le projet existant est plus ancien, s'aligner sur sa ligne et ne pas mélanger les majeures (ex. springdoc 2.x seulement sur Boot 3.5).

## Fichiers de référence (à lire quand la tâche les concerne)

| Fichier | À lire pour |
|---|---|
| `references/securite.md` | authentification, JWT et révocation, CSRF, injections SQL, rate-limiting, filtre `Sec-Fetch-Mode`, Swagger, données sensibles |
| `references/concurrence-idempotence.md` | **tout code qui écrit** : race conditions, verrou optimiste, mises à jour atomiques, `Idempotency-Key`, événements et jobs idempotents, tests de concurrence |
| `references/infra.md` | profils YAML, `.env.example`, time zone configurable, pool Hikari, cache Redis, ShedLock, logs et rétention, Dockerfile, docker-compose (dev / mid-dev / prod), dossier `docs/` |
| `references/ci.md` | CI / CD GitHub Actions : tests, couverture, Sonar, validation des manifestes, publication de l'image `vX.Y.Z` par branche, déploiement par digest, Dependabot (gabarits dans `templates/ci/`) |
| `references/sonarqube-local.md` | SonarQube Community Build en local sur Docker Desktop, lié à la CI par un runner GitHub auto-hébergé (gabarits dans `templates/sonarqube/`) |
| `references/kubernetes.md` | Actuator (groupes liveness / readiness), hooks de déploiement (Job Flyway, `preStop`), manifestes Kubernetes |
| `references/clean-code.md` | **tout code à écrire, relire ou refactorer** : noms, fonctions, formatage, objets, erreurs, tests (3 lois du TDD, F.I.R.S.T.), classes et façades, SOLID, heuristiques |
| `references/sonar.md` | **tout code à écrire ou relire** : catalogue des règles Sonar à respecter (`equals`/`hashCode`, tests, streams, code inutilisé, conception des classes, concurrence) |
| `references/api-docs.md` | **tout controller, DTO web ou documentation d'API** : interface `XxxController` + implémentation `XxxControllerImpl`, Swagger complet, records de documentation |
| `references/architecture.md` | **créer ou déplacer une classe, un package, une feature** : arborescence feature → domain / application / infrastructure, règle de dépendance, ports (§1) |
| `references/builder-patterns.md` | **objet à 4 paramètres ou plus, paramètres optionnels, choix d'un design pattern** (§5 et §6) |
| `references/tests.md` | **écrire ou relire des tests** : 3 lois du TDD, F.I.R.S.T., tests par couche, exceptions (§12) |
| `references/versions.md` | **nouveau projet ou montée de version** : catalogue Boot 4.2 / Java 25 / springdoc / Bucket4j / ShedLock / Jackson 3 |
| `references/setup-projet.md` | **nouveau projet** : socle à livrer dès le départ (§0) |
| `references/livraison.md` | **fin de tâche ou début de revue** : checklist de livraison (§14) |

Un nouveau projet impose de lire `securite.md` et `infra.md`. `clean-code.md` et `sonar.md` se lisent avant d'écrire ou de relire du code, `api-docs.md` avant de toucher à un controller, `architecture.md` avant de créer une classe ou un package, `tests.md` avant d'écrire un test.

## Règles non négociables

Elles s'appliquent à chaque projet, sans que l'utilisateur ait à les rappeler.

**Conception et qualité**
1. **Clean Architecture** (règle de dépendance) combinée au **DDD** (§1).
2. **SOLID** (§2) et **Clean Code** de Robert C. Martin (§3, `references/clean-code.md`).
3. **TDD** (3 lois, F.I.R.S.T.) : le test d'abord, et **tout nouveau code back-end est livré avec ses tests** (§12).
4. **Sonar** : zéro issue sur le code neuf (§4, `references/sonar.md`) ; en particulier pas de ternaire imbriqué (extraire en instructions séparées) et pas de littéral de chaîne dupliqué (constante).
5. **Builder plutôt que surcharges** : jamais de constructeurs ni de méthodes surchargés pour simuler des paramètres optionnels (§5).
6. **Mois Java : toujours `Month.X`**, jamais un nombre (`LocalDate.of(2026, Month.NOVEMBER, 5)`).
7. Jamais d'entité JPA exposée par l'API (DTO) ; injection par constructeur uniquement.

**Sécurité** (détails dans `references/securite.md`)

8. **CSRF** toujours traité explicitement, en défense en couches. Défaut : refresh token en cookie `HttpOnly` + `SameSite=Strict`, access token court en mémoire (Bearer), jeton CSRF exigé dès qu'une requête modifiante porte le cookie d'authentification, vérification `Origin` / `Sec-Fetch-Site`. Jamais désactivé globalement.
9. **Injections SQL** toujours prévenues (requêtes paramétrées, tris en liste blanche).
10. **Rate-limiting** toujours en place (Bucket4j + Redis).
11. **JWT** : révocation des jetons via cache Redis (logout, changement de mot de passe, compte désactivé).
12. **Filtre `Sec-Fetch-Mode`** : `403` sur `/api/**` ouvert directement dans un navigateur (`navigate` / `no-cors`) ; mobile, SSR et outils non concernés.
13. **Swagger** visible en dev (à la racine), **désactivé en prod**.
13 bis. **CORS** en liste blanche d'origines lues dans le YAML (jamais `*` en prod) ; **Hikari** configuré explicitement ; le filtre de §12 est activable par `app.security.bloquer-navigation-directe`.

**Configuration et infrastructure** (détails dans `references/infra.md`)

14. **Cache Redis** toujours mis en place.
15. **Profils** `application-dev.yml`, `application-prod.yml` et `application-test.yml` ; **`dev` actif par défaut** (`spring.profiles.default: dev`), `prod` toujours activé explicitement en production.
16. **`.env.example` mis à jour** à chaque clé ajoutée dans `application-prod.yml`.
17. **Dockerfile** léger : layers, utilisateur non-root, `HEALTHCHECK` sur l'Actuator.
17 bis. **Actuator et Kubernetes** : sondes `liveness` / `readiness` seulement, Job de migration avant le roll, `preStop` + arrêt gracieux. Manifestes dans `templates/k8s/` (routes Gateway API sur `/api` seulement), règles dans `references/kubernetes.md`.
18. **Trois docker-compose** : `dev` (tout dedans), `mid-dev` (Redis et annexes, sans PostgreSQL), `prod`.
19. **Time zone** : valeur lue dans le YAML (`app.timezone`, variable `APP_TIMEZONE`, défaut UTC), source unique pour `Clock`, Jackson, Hibernate, crons et logs.
20. **Logs** essentiels, sans donnée sensible, avec rétention limitée et archives en zip.
21. **ShedLock** sur toute tâche `@Scheduled`.
22. **Dossier `docs/`** : `adr/`, `http/`, `diagrams/`, `flows/`.

**API, modèle et données**

23. **Controller = interface + implémentation.** L'interface `XxxController` (dans `web/controller/`) porte toute la documentation Swagger, **complète** (requêtes, réponses succès et erreurs, DTO, paramètres, exemples, rien d'omis) ; l'implémentation `XxxControllerImpl` (dans `web/controller/implement/`) ne contient que le code (§8, `references/api-docs.md`).
24. **Records de documentation** dans `infrastructure/web/doc/` pour décrire dans Swagger les formes de réponse (pages, enveloppes, erreurs) ; ils ne servent qu'à la documentation.
25. **`equals` et `hashCode` obligatoires dans `domain/model`** (entités par identité, value objects en `record`) (`references/sonar.md`, section 2).
26. **Streams privilégiés** pour transformer et agréger des collections, tant que le code reste lisible (§7, `references/sonar.md`, section 4).
27. **Mots de passe toujours hashés** avec BCrypt ou équivalent (Argon2, scrypt, PBKDF2), jamais en clair, jamais loggés, jamais renvoyés par l'API (`references/securite.md`, section 1).
28. **Domaine sans dépendance externe** : `domain` n'importe que `java.*` ; builders, `equals`, `hashCode` écrits à la main, pas de Lombok (§1, §5).
29. **Exceptions traitées en un seul endroit** : `GlobalExceptionHandler` unique, hiérarchie d'exceptions dans `shared/domain/exception` (`references/api-docs.md`, section 6).
30. **Aucun import entre features** : communication par les ports `out` de `shared/domain/port/out` (ou événements de `shared/domain/events`) (§1).
31. **Indexation toujours gérée** : index sur chaque clé étrangère et sur les colonnes filtrées / triées, définis dans les migrations Flyway (§9).
32. **Race conditions évitées et idempotence toujours** : contrainte `UNIQUE` / `@Version` / `UPDATE` atomique, `Idempotency-Key` sur les `POST` à effet, listeners et jobs rejouables (`references/concurrence-idempotence.md`).

## Questions à poser au démarrage d'un nouveau projet

Poser en un seul bloc, en sautant ce qui est déjà précisé. Ne jamais décider à la place de l'utilisateur : l'architecture et les outils varient selon le type de projet.

1. Type de projet (API métier, back-office, microservice, MVP…) → détermine le niveau de Clean Architecture et de DDD.
2. Architecture : la structure de référence (par feature, puis `domain` / `application` / `infrastructure`, voir §1) convient-elle, ou le projet impose-t-il un allègement (très petit projet) ? Quelles sont les features (bounded contexts) ?
3. Build : Maven ou Gradle ? Versions Java / Spring Boot ?
4. Base de données : PostgreSQL par défaut, autre si le projet l'impose. **Flyway toujours.**
5. Authentification : JWT (avec `jwt-toolkit-package` de Sidy ?), OAuth2/Keycloak ? Le schéma par défaut (refresh en cookie `HttpOnly`, access en mémoire) convient-il, ou le projet impose-t-il tout en cookie / un BFF (décide du réglage CSRF) ? Clients mobiles prévus ? Front et API sous le même domaine ? Rôles et permissions ?
6. Outils de test et seuil de couverture (voir §12).
7. Langue des identifiants du code et des messages d'erreur renvoyés à l'API.
8. Déploiement : hébergement, base de données dans Compose ou managée, CI (GitHub Actions + Sonar : gabarits `templates/ci/`), Kubernetes ou non.
9. Services annexes à prévoir dans les compose (mail catcher, stockage objet, broker…).

## 0. Setup d'un nouveau projet

Nouveau projet : lire `references/setup-projet.md` (socle complet à livrer dès le départ : build, YAML, migrations, configuration de sécurité, Docker, CI, Kubernetes, README, `docs/`) ainsi que `securite.md` et `infra.md`.

## 1. Architecture — Clean Architecture et DDD

> Détail dans `references/architecture.md` : arborescence de référence (feature → `domain` / `application` / `infrastructure`), règle de dépendance, contenu de chaque package, ports, domaine sans dépendance externe. **À lire avant de créer ou déplacer une classe, un package ou une feature.**

## 2. SOLID

- **S** : une classe = une raison de changer ; un use case par intention.
- **O** : étendre par de nouvelles implémentations (Strategy, Specification) plutôt que modifier un `switch`.
- **L** : toute implémentation d'un port respecte son contrat (mêmes exceptions, mêmes garanties) ; pas de sous-classe qui lève `UnsupportedOperationException`.
- **I** : ports petits et ciblés (`OrderReader` et `OrderWriter` plutôt qu'un `OrderRepository` géant quand les usages divergent).
- **D** : le métier dépend d'abstractions (ports), jamais de Spring Data, de Redis ou d'un client HTTP concret.

## 3. Clean code

Détails et exemples dans `references/clean-code.md`, à lire avant d'écrire ou de relire du code. Résumé :

- **Noms** qui révèlent l'intention (`elapsedTimeInDays`, pas `d`), prononçables, recherchables ; classes = noms, méthodes = verbes ; **un mot par concept** (pas `fetch`, `get` et `retrieve` pour la même chose).
- **Fonctions** petites (≈ 20 lignes max), une seule chose, un seul niveau d'abstraction, **0 à 2 arguments (4 maximum)**, **pas d'argument booléen**, pas d'effet de bord caché, **commande / requête séparées**, exceptions plutôt que codes d'erreur, **Stepdown Rule** (lecture de haut en bas comme un récit). Complexité cognitive ≤ 15.
- **Commentaires** : uniquement **documentation** (Javadoc des API publiques non évidentes) ou **explication** (le *pourquoi*) ; jamais de commentaire qui répète le code ni de code commenté.
- **Formatage** cohérent (`.editorconfig` à la racine, pas de vérification imposée dans le build ni la CI), lignes courtes, séparation verticale des concepts.
- **Objets et structures** : loi de Déméter ; les objets exposent des comportements, les structures de données (DTO en `record`) exposent leurs données.
- **Erreurs** : ne pas retourner `null`, ne pas passer `null` ; exceptions non vérifiées **avec contexte** ; gestion des erreurs isolée (`@RestControllerAdvice`).
- **Classes** petites, une seule responsabilité, forte cohésion, faible couplage ; **trop d'injections (plus de 4), surtout dans un controller → une façade**.
- **Heuristiques** : DRY, KISS, Boy Scout Rule, suppression du code mort, constantes nommées (pas de nombres magiques), conditions encapsulées (`if (shouldBeDeleted(timer))`), pas de conditions négatives.
- **Les 4 règles de la conception simple** (Kent Beck) : tests verts, aucune duplication, intention exprimée, minimum de classes et de méthodes.
- **Immutabilité** par défaut : `final`, `record` pour DTO, commandes et value objects.
- **Lombok** : autorisé dans les **entités d'`infrastructure/persistence/entity`** (`@Getter`, `@Setter` si besoin, `@Builder`, `@NoArgsConstructor(access = PROTECTED)`, `@AllArgsConstructor(access = PRIVATE)`) et, dans `application` et `infrastructure` (DTO web compris), pour `@Builder`, `@Getter`, `@RequiredArgsConstructor`, `@Slf4j`. **Jamais dans `domain`** (aucune dépendance externe : getters, builder, constructeurs, `equals`, `hashCode` et `toString` écrits à la main). Jamais `@Data` ni `@EqualsAndHashCode` généré sur une entité JPA ; `@ToString` en excluant les relations. Dans `domain/model`, `equals` et `hashCode` sont écrits à la main (§1, `references/sonar.md`). Si le projet évite Lombok, écrire à la main.

## 4. Règles Sonar

Écrire le code de façon à ne produire **aucune issue Sonar** ; le catalogue complet, avec exemples, est dans `references/sonar.md` (à lire avant d'écrire ou de relire du code). Rappel des familles :

- **Ternaire imbriqué** (S3358) : variables, méthodes ou `switch` expression. **Littéral dupliqué** (S1192) : constante, y compris dans les tests. **Complexité cognitive** (S3776) et paramètres (S107) : découper.
- **Égalité** : `equals(Object)` avec `instanceof`, jamais `@Nonnull` sur son paramètre, symétrique (classes `final`), toujours avec `hashCode` (et `Comparable` ⇒ `equals`) ; pas de `==` / `!=` sur un objet qui redéfinit `equals` ; pas de `equals` sur les `Atomic*` (comparer `get()`).
- **Tests** : pas de `Thread.sleep` (Awaitility ou `Clock`) ; une seule invocation pouvant lever une exception dans la lambda de `assertThrows` / `assertThatThrownBy` (S5778).
- **Streams** : `toList()` / `collect` plutôt que `forEach(list::add)` ; pattern de record plutôt que l'accès explicite aux champs (Java 21+).
- **Code inutilisé** : imports, champs `private`, méthodes `private`, variables locales, paramètres de méthode.
- **Membres** : méthodes `private` / `final` sans donnée d'instance en `static` ; pas de `protected` dans une classe `final` ; champ `public static` = constante ; pas de `toString()` sur une `String` ; `java.time` uniquement.
- Pas de `System.out` ni `printStackTrace` (SLF4J) ; pas de `catch` vide ; `try-with-resources` ; pas de `@SuppressWarnings` ni `// NOSONAR` pour masquer un vrai problème.
- Couverture du code neuf selon le Quality Gate (80 % par défaut sauf indication contraire).

## 5. Builder — pas de surcharges

> Détail dans `references/builder-patterns.md`. Règle à retenir : jamais de constructeurs ni de méthodes surchargés pour des paramètres optionnels ; dès 4 paramètres ou plus, un Builder (écrit à la main dans le domaine, `@Builder` sur les entités d'infra). **À lire avant de créer un objet à plusieurs paramètres.**

## 6. Design patterns

> Tableau besoin → pattern dans `references/builder-patterns.md`. Un pattern ne sert que s'il résout un vrai problème, et la classe porte son nom.

## 7. Java moderne, dates et temps

- `record`, `sealed`, `switch` expressions, pattern matching et pattern de record, `var` quand le type est évident. **Privilégier les Streams** pour transformer, filtrer, regrouper et agréger (`toList()`, `Collectors`), tant qu'ils restent lisibles : 4 à 5 opérations au plus, pas d'effet de bord dans les lambdas ; une boucle reste acceptable quand elle est nettement plus claire.
- API `java.time` uniquement ; **mois : `Month.X`** dans le code comme dans les tests (jamais `LocalDate.of(2026, 11, 5)`).
- **Fuseau lu dans le YAML** (`app.timezone`, défaut UTC ; règle complète dans `references/infra.md`, section 3) ; `Clock` injecté pour tout accès à l'heure.
- Montants : `BigDecimal` ou value object `Money`, jamais `double`.

## 8. API REST

- Préfixe `/api/v1/...`, ressources au pluriel, verbes HTTP corrects, statuts précis (`201` + `Location`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `429`).
- DTO en `record`, validés par Jakarta Validation (`@Valid`). Mapping avec **MapStruct** (ou mappers à la main), jamais dans les controllers.
- **Gestion d'erreurs en un seul endroit** : un unique `GlobalExceptionHandler` (`@RestControllerAdvice`, dans `shared/infrastructure/exception`) renvoie un `ProblemDetail` (RFC 9457) : code d'erreur, message, détails de champs, `requestId`, aucune stack trace. Exceptions métier = sous-classes des catégories `NotFound` / `Conflict` / `BusinessRule` / `Forbidden` de `shared/domain/exception` (404 / 409 / 422 / 403). Ni handler par feature, ni `try/catch` dans un controller (`references/api-docs.md`, section 6).
- Pagination (`Pageable` avec champs de tri en liste blanche), tri et filtres explicites.
- Contrat consommé par Angular : `camelCase`, enums en chaînes, dates en ISO-8601 UTC. Signaler tout changement de DTO, car les modèles Angular sont calqués dessus.
- **Controller = interface `XxxController` + implémentation `XxxControllerImpl`** (dans `infrastructure/web/controller/` et `infrastructure/web/controller/implement/`). L'interface porte les mappings Spring MVC et **toute la documentation Swagger**, complète : `@Tag`, `@Operation` (summary + description), `@ApiResponses` (succès **et** erreurs 400 / 401 / 403 / 404 / 409 / 422 / 429 selon l'endpoint, avec schéma), corps de requête avec exemple, `@Parameter`, `@Schema` sur chaque champ de DTO. Rien n'est omis. L'implémentation n'a aucune annotation Swagger.
- **Records de documentation** dans `infrastructure/web/doc/` (pages, enveloppes de réponse, `ProblemDetailDoc`) : référencés par `@Schema(implementation = …)`, jamais utilisés à l'exécution.
- OpenAPI via springdoc, visible en dev uniquement. Un test échoue si un endpoint n'est pas entièrement documenté. Exemples complets dans `references/api-docs.md`.
- Chaque endpoint a ses requêtes dans `docs/http/`.

## 9. Persistance, PostgreSQL et Flyway

- **Flyway toujours** : starter Boot + module PostgreSQL, `src/main/resources/db/migration`, fichiers `V{n}__description_en_snake_case.sql`. **Ne jamais modifier une migration déjà appliquée**. Socle YAML : `validate-on-migrate: true`, `clean-disabled: true`, `lock-retry-count: 50`, `postgresql.transactional-lock: false` (requis pour `CREATE INDEX CONCURRENTLY` + fichier `.sql.conf` avec `executeInTransaction=false`). Placeholder `app_role: ${spring.datasource.username:app}` pour les `GRANT`. En prod : compte Flyway distinct (`FLYWAY_USER` / `FLYWAY_PASSWORD`), idéalement one-shot `migrate` puis app avec `FLYWAY_ENABLED=false`. Aucune migration destructive sans accord explicite.
- Contraintes (`NOT NULL`, `UNIQUE`, `FOREIGN KEY`, `CHECK`) et index définis en SQL, pas laissés à Hibernate (`ddl-auto=validate`, pas de `@Table(indexes = …)`).
- **Indexation, à traiter dans chaque migration qui touche le schéma** :
  - **Index sur chaque clé étrangère** (PostgreSQL ne les crée pas) ;
  - index sur les colonnes des `WHERE`, `JOIN` et `ORDER BY` des requêtes réellement écrites (filtres de recherche, tri par défaut des listes paginées) ;
  - index composite : colonnes d'égalité d'abord, puis de plage / tri ; index partiel (`WHERE deleted_at IS NULL`) ou unique partiel quand il réduit le volume ;
  - `GIN` pour `jsonb` et recherche texte (`pg_trgm`), `GiST` pour le géospatial ;
  - nommage `idx_<table>_<colonnes>`, `uk_…`, `fk_…` ;
  - sur une grosse table en production : `CREATE INDEX CONCURRENTLY`, dans une migration non transactionnelle (`executeInTransaction=false` dans le fichier `.conf` de la migration, à vérifier selon la version de Flyway) ;
  - vérifier avec `EXPLAIN (ANALYZE, BUFFERS)` ; ne pas sur-indexer (chaque index ralentit les écritures) ; repérer les index inutilisés via `pg_stat_user_indexes` ;
  - un test Testcontainers échoue si une clé étrangère n'a pas d'index (requête sur `pg_constraint` / `pg_index`, à valider sur la base du projet).
- Auditing (`createdAt`, `updatedAt`, `createdBy`) via `AuditingEntityListener`.
- **Concurrence et idempotence** (détails dans `references/concurrence-idempotence.md`) : toute écriture est rejouable sans effet en double ; la base arbitre (contrainte `UNIQUE`, mise à jour atomique) ; `Idempotency-Key` sur les `POST` à effet. Rappel : `@Version` (verrou optimiste) sur les agrégats modifiés en parallèle ; verrou pessimiste ou contrainte unique pour compteurs, stocks et numéros séquentiels ; `OptimisticLockingFailureException` → `409`.
- **Performance** : éviter le N+1 (`@EntityGraph`, `JOIN FETCH`, projections), `LAZY` par défaut, pagination côté base, jamais de `findAll()` sans pagination sur une grosse table.
- Requêtes **toujours paramétrées** (voir `references/securite.md`, section 3). Utilisateur applicatif PostgreSQL en moindres privilèges.

## 10. Sécurité (résumé : lire `references/securite.md`)

Spring Security stateless, routes publiques listées une à une, CSRF en défense en couches (refresh en cookie `HttpOnly`, jeton CSRF sur les requêtes portant le cookie, contrôle `Origin` / `Sec-Fetch-Site`), requêtes paramétrées, rate-limiting Bucket4j + Redis, JWT court avec révocation par Redis, mots de passe hashés (BCrypt ou équivalent), filtre anti-ouverture directe de `/api/**`, Swagger absent en prod, aucun secret ni donnée sensible dans le code, les logs ou les réponses d'erreur.

## 11. Cache, tâches planifiées, logs et Docker (résumé : lire `references/infra.md`)

Cache Redis avec TTL et invalidation explicite (Decorator du port de lecture), ShedLock sur chaque `@Scheduled`, logs essentiels en zip avec rétention, Dockerfile en layers et non-root avec healthcheck, trois fichiers compose, `.env.example` toujours synchronisé, dossier `docs/`. Actuator et manifestes Kubernetes : `references/kubernetes.md`.

## 12. TDD et tests (obligatoires)

> Détail dans `references/tests.md` : 3 lois du TDD, cycle Red → Green → Refactor, F.I.R.S.T. et conventions de test. Règle à retenir : le test d'abord, et tout nouveau code back-end est livré avec ses tests. **À lire avant d'écrire ou de relire des tests.**

## 13. Workflow pour ajouter une feature (TDD)

1. Lire une feature existante du projet et reprendre ses conventions.
2. **Domaine** (JDK uniquement, builders à la main) : test d'abord, puis `model` (avec `equals` / `hashCode`), `valueobject`, `command`, `event`, `exception`, `service` si besoin, et les ports `in` / `out` (`domain/port`).
3. **Application** : test d'abord (ports `out` mockés), puis `usecase` (implémentations des ports `in`), `service`, `listener` et `facade` si besoin.
3 bis. **Écritures** : prévoir concurrence et idempotence (`references/concurrence-idempotence.md`), test de concurrence d'abord.
4. **Migration Flyway** : nouveau fichier `V{n}__…sql`, **avec les index** (clés étrangères, filtres, tris) (et mise à jour de `.env.example` / YAML si de nouvelles clés apparaissent).
5. **Infrastructure — persistance** : test `@DataJpaTest` d'abord, puis `entity` JPA, `repository`, `mapper` (entity ⇄ model), `adapter` qui implémente le port `out` (et cache / autres packages techniques si pertinent).
6. **Infrastructure — web** : test `@WebMvcTest` d'abord, puis `dto/request` et `dto/response` documentés, interface `XxxController` dans `web/controller/` (Swagger complet), records de `web/doc` si besoin, implémentation `XxxControllerImpl` dans `web/controller/implement/`, `web/mapper`, exceptions de la feature en sous-classes des catégories de `shared/domain/exception` (le handler global ne change pas).
7. **Sécurité** : règles d'accès, rate-limit adapté, tests de sécurité de la route.
8. **Documentation** : requêtes dans `docs/http/`, ADR si décision structurante, diagramme ou flow si processus non trivial.
9. **Vérification** : checklist de `references/livraison.md`.

## 14. Livraison

- Fichiers complets, pas d'extraits avec « … ». Correction ciblée → uniquement les fichiers modifiés.
- Toujours livrer le code **et** ses tests ensemble.
- Signaler tout changement de contrat d'API (le front Angular doit suivre), toute nouvelle migration et toute nouvelle variable d'environnement.

Checklist avant de livrer : `references/livraison.md` (à lire en fin de tâche, ou au début d'une revue).
