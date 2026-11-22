---
name: "spring-boot-sidy"
description: "Conventions back-end Spring Boot de Sidy : Clean Architecture (Uncle Bob), DDD, SOLID, TDD, clean code, règles Sonar, design patterns, Builder, PostgreSQL + Flyway, Redis (cache, rate-limiting, révocation JWT), sécurité (CSRF, injections SQL), ShedLock, Docker, profils YAML, docs. À utiliser dès que l'utilisateur parle de Spring Boot, back-end Java, API REST, entité JPA, use case, service, controller, migration Flyway, JWT, Redis, Docker, tests JUnit/Mockito, ou demande de coder, relire ou refactorer du code Java côté serveur, même sans dire « skill »."
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
| `references/clean-code.md` | **tout code à écrire, relire ou refactorer** : noms, fonctions, formatage, objets, erreurs, tests (3 lois du TDD, F.I.R.S.T.), classes et façades, SOLID, heuristiques |
| `references/sonar.md` | **tout code à écrire ou relire** : catalogue des règles Sonar à respecter (`equals`/`hashCode`, tests, streams, code inutilisé, conception des classes, concurrence) |
| `references/api-docs.md` | **tout controller, DTO web ou documentation d'API** : interface `XxxController` + implémentation `XxxControllerImpl`, Swagger complet, records de documentation |
| `references/versions.md` | **nouveau projet ou montée de version** : catalogue Boot 4.2 / Java 25 / springdoc / Bucket4j / ShedLock / Jackson 3 |

Un nouveau projet impose de lire `securite.md` et `infra.md`. `clean-code.md` et `sonar.md` se lisent avant d'écrire ou de relire du code, `api-docs.md` avant de toucher à un controller.

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
8. Déploiement : hébergement, base de données dans Compose ou managée, CI (GitHub Actions + Sonar).
9. Services annexes à prévoir dans les compose (mail catcher, stockage objet, broker…).

## 0. Setup d'un nouveau projet

Livrer, dès le départ, tout ce socle (détails dans les références) :

- `pom.xml` / `build.gradle` : parent Boot **4.2.0** ; starters **sans version** : `webmvc` (ou `web`), `validation`, `data-jpa`, `security`, `actuator`, `data-redis`, `cache`, **`spring-boot-starter-flyway`** + `flyway-database-postgresql` (runtime, sans version), driver `postgresql` ; hors BOM : springdoc **3.2.1**, MapStruct **1.6.3**, Lombok **1.18.48**, Bucket4j **8.23.0** (`bucket4j_jdk17-core` + `bucket4j_jdk17-lettuce`), ShedLock **7.11.0** (`shedlock-spring` + `shedlock-provider-jdbc-template`) ; tests : `test`, Testcontainers, `awaitility`, `jacoco`. **Pas** de `jackson-databind` 2.x ni de `spring-boot-jackson2` sauf migration temporaire écrite.
- `application.yml`, `application-dev.yml`, `application-test.yml`, `application-prod.yml`, `logback-spring.xml`, `.env.example`, `.gitignore` (dont `.env`).
- Migration Flyway `V1__init.sql` et migration de la table `shedlock` (avec `GRANT` vers le rôle applicatif via placeholder `${app_role}`).
- Configuration : `SecurityConfig` (CSRF : préférer `csrf.spa()` Security 7 + matcher Sidy), CORS, `RateLimitFilter`, `OriginCheckFilter`, `BrowserNavigationBlockFilter`, `CacheConfig` (**JsonMapper** Jackson 3, pas `ObjectMapper` Jackson 2), `SchedulingConfig`, bean `Clock` UTC, handler d'erreurs global, OpenAPI.
- `Dockerfile`, `.dockerignore`, `docker-compose.dev.yml`, `docker-compose.mid-dev.yml`, `docker-compose.prod.yml`.
- `docs/` avec `adr/` (premier ADR : choix d'architecture), `http/`, `diagrams/`, `flows/`.
- Spring : `spring.jpa.hibernate.ddl-auto=validate`, `spring.jpa.open-in-view=false`, configuration typée avec `@ConfigurationProperties` sur un `record` validé (jamais de `@Value` éparpillés), secrets uniquement via variables d'environnement.

## 1. Architecture — Clean Architecture et DDD

Structure de référence : celle du backend **CETUD Mobilités** (feature d'abord, puis `domain` / `application` / `infrastructure`). Les noms de features sont dans la langue du projet (`actualite`, `course`, `tarification`…), les noms de couches restent ceux ci-dessous. **Un dossier n'est créé que s'il contient quelque chose** : toutes les features n'ont pas `event/`, `valueobject/`, `facade/`, `listener/`, `service/`…

```
src/main/java/<package-racine>/
├── <feature>/                          ← un bounded context
│   ├── domain/                         ← le cœur : zéro Spring, zéro JPA
│   │   ├── model/                      ← agrégats et entités (avec equals/hashCode)
│   │   ├── valueobject/                ← value objects (records)
│   │   ├── command/                    ← commandes d'entrée des use cases (records)
│   │   ├── event/                      ← événements de domaine (records)
│   │   ├── exception/                  ← exceptions métier
│   │   ├── service/                    ← services de domaine (règle qui ne tient dans aucun agrégat)
│   │   └── port/
│   │       ├── in/                     ← interfaces des use cases
│   │       └── out/                    ← interfaces vers la persistance et les systèmes externes
│   ├── application/                    ← orchestration ; dépend uniquement du domain
│   │   ├── usecase/                    ← implémentations des ports in (un use case = une classe)
│   │   ├── service/                    ← services applicatifs partagés entre plusieurs use cases
│   │   ├── facade/                     ← façades regroupant les use cases d'un controller
│   │   └── listener/                   ← réactions aux événements de domaine
│   └── infrastructure/                 ← adaptateurs ; dépend de application et domain
│       ├── persistence/
│       │   ├── entity/                 ← entités JPA (Lombok autorisé)
│       │   ├── repository/             ← repositories Spring Data
│       │   ├── mapper/                 ← entity ⇄ model
│       │   ├── adapter/                ← implémentent les ports out de persistance
│       │   └── converter/              ← AttributeConverter JPA (si besoin)
│       ├── web/
│       │   ├── controller/             ← interfaces XxxController (mappings + Swagger complet)
│       │   │   └── implement/          ← implémentations XxxControllerImpl (@RestController)
│       │   ├── dto/
│       │   │   ├── request/
│       │   │   └── response/
│       │   ├── mapper/                 ← dto ⇄ command / model (si nécessaire)
│       │   └── doc/                    ← records de documentation Swagger uniquement
│       └── <technique>/                ← un package par préoccupation technique :
│                                         cache/, scheduling/, storage/, notification/, security/,
│                                         exportation/, importation/, service/ (clients externes)…
├── shared/                             ← transverse, même découpage domain / application / infrastructure
│   ├── domain/                         ← events, exception, model, port/out, projection, service, valueobject
│   ├── application/service/
│   └── infrastructure/                 ← cache, event, exception, mail, message, metrics, otp, persistence,
│                                         ratelimit, scheduling, security, storage, util, validation,
│                                         web/{client, filter, interceptor, response…}, websocket…
├── config/                             ← classes @Configuration Spring
└── bootstrap/                          ← initialisation au démarrage
```

Emplacements usuels des éléments transverses (à adapter au projet) : `RateLimitFilter` dans `shared/infrastructure/ratelimit`, `OriginCheckFilter` et `BrowserNavigationBlockFilter` dans `shared/infrastructure/web/filter`, handler d'erreurs global (`@RestControllerAdvice`) dans `shared/infrastructure/exception`, publication des événements de domaine dans `shared/infrastructure/event`, `SecurityConfig` / `CacheConfig` / `SchedulingConfig` / bean `Clock` / OpenAPI dans `config/`, jetons JWT et révocation Redis dans `auth/infrastructure/security` et `auth/infrastructure/cache`.

**Clean Architecture**
- Dépendances : `infrastructure` → `application` → `domain`. Jamais l'inverse. Le `domain` (modèle, value objects, commandes, événements, exceptions, services et ports) n'a **aucune dépendance externe : JDK uniquement** (`java.*`) et ses propres packages. Ni Spring, JPA, Jackson, Lombok, Jakarta Validation, SLF4J ni MapStruct.
- Les **ports** vivent dans `domain/port` : les adaptateurs d'`infrastructure` (controllers) appellent les ports `in` ; les use cases d'`application/usecase` implémentent les ports `in` et appellent les ports `out` ; les `adapter` d'`infrastructure` implémentent les ports `out` (inversion de dépendances).
- Un **use case = une classe = une intention métier** (`CreateOrderUseCaseImpl implements CreateOrderUseCase`). Les controllers appellent des interfaces de use case (ports `in`) ou une façade.
- `@Transactional` sur les use cases, pas sur les controllers ni les repositories.
- **Entre features, jamais d'import direct** : une feature n'importe aucun type d'une autre feature. Elle communique **uniquement par un port `out` situé dans `shared/domain/port/out`** (ex. `CustomerLookupPort`), avec ses types d'échange dans `shared/domain/projection` ou `shared/domain/valueobject`. La feature consommatrice injecte ce port dans son use case ; l'`adapter` qui l'implémente vit dans l'`infrastructure` de la feature **qui fournit** la donnée (il appelle son propre port `in`). Pour le asynchrone : événement dans `shared/domain/events`, consommé par un `application/listener`. Seuls `shared`, `config` et `bootstrap` peuvent être importés par plusieurs features.
- **Chaque controller a son interface** (`controller/OrderController`, documentation Swagger) **et son implémentation** (`controller/implement/OrderControllerImpl`), voir §8.
- Un controller ne contient aucune logique métier : valider, déléguer, mapper, répondre. **Au-delà de 4 dépendances injectées, créer une façade** (`application/facade/`) qui regroupe les use cases ; le controller n'injecte que la façade (voir `references/clean-code.md`, section 8).
- Domaine pur et entités JPA **séparées** (`model` ≠ `entity`, reliés par un `mapper`), sur tous les projets. Pour un très petit projet on allège en ne créant que les dossiers utiles, jamais en supprimant la règle de dépendance ni la séparation DTO / entité.

**DDD**
- **Langage omniprésent** : les noms du code reprennent le vocabulaire métier, dans la langue choisie pour le projet. Un bounded context par feature cohérente ; la carte des contextes vit dans `docs/diagrams/`.
- **Agrégats** : une racine d'agrégat qui protège ses invariants ; les objets internes ne sont accessibles que par elle ; autre agrégat référencé **par son identifiant**, jamais par l'objet. **Une transaction = un agrégat.**
- **Pas de modèle anémique** : le comportement est dans le domaine (`order.confirm()`, `account.withdraw(amount)`), pas dans des services qui manipulent des setters. Pas de setters publics ; création par constructeur privé + Builder ou méthode de fabrique statique.
- **Value objects** (`domain/valueobject`) immuables et auto-validés, en `record` (`Money`, `PhoneNumber`, `OrderId`), comparés par valeur.
- **Classes de base (principe, pas imposées)** : une classe de base d'agrégat racine (identité + événements de domaine collectés) et une base de builder peuvent vivre dans `shared/domain/model` ; les erreurs ont une exception racine du projet et une `ErrorCategory` qui pilote le statut HTTP dans le handler unique. Écrites en JDK pur.
- **Services de domaine** (`domain/service`) pour une règle qui ne tient dans aucun agrégat ; **repository = port `out` par racine d'agrégat** (`domain/port/out`), implémenté par un `adapter` d'`infrastructure/persistence`.
- **Événements de domaine** (`domain/event`, en `record`) publiés par les use cases via un port `out` (`DomainEventPublisher`, implémenté dans `shared/infrastructure/event`) ; réactions dans `application/listener`.
- **Couche anticorruption** (adapter + traduction vers le langage du domaine) face à tout système externe.
- Proportionnalité : un contexte purement CRUD reste léger (peu de comportement) ; les tests et la règle de dépendance restent obligatoires.

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

Pas de constructeurs télescopiques ni de méthodes surchargées pour gérer les paramètres optionnels. Dès qu'un objet a **4 paramètres ou plus**, ou des paramètres optionnels, utiliser un Builder.

- Objets de domaine (`domain/model`, `domain/command`) : **builder écrit à la main** (classe statique imbriquée `Builder`), car le domaine n'a aucune dépendance externe, donc pas de Lombok. Constructeur privé ; **les invariants sont validés dans le constructeur** (ou dans `build()`), pour qu'un objet ne soit jamais incohérent.
- Entités JPA : constructeur `protected` sans argument (exigé par JPA) + `@Builder` sur un constructeur privé avec arguments.
- DTO web, requêtes : `record` ; `@Builder` (Lombok) sur le record au-delà de 4 champs. **Commandes du domaine** (`domain/command`) : `record` ; au-delà de 4 champs, builder écrit à la main (pas de Lombok dans le domaine).
- Tests : un *test data builder* par agrégat (`OrderTestBuilder`).

```java
// domain/model : JDK uniquement, builder écrit à la main
public final class Order {

    private final OrderId id;
    private final CustomerId customerId;
    private final List<OrderLine> lines;
    private final LocalDate deliveryDate;
    private final String comment;

    private Order(Builder builder) {
        if (builder.lines == null || builder.lines.isEmpty()) {
            throw new InvalidOrderException("An order must contain at least one line");
        }
        this.id = builder.id;
        this.customerId = Objects.requireNonNull(builder.customerId, "customerId");
        this.lines = List.copyOf(builder.lines);
        this.deliveryDate = builder.deliveryDate;
        this.comment = builder.comment;
    }

    public static Builder builder() {
        return new Builder();
    }

    public OrderId id() {
        return id;
    }

    public CustomerId customerId() {
        return customerId;
    }

    public List<OrderLine> lines() {
        return lines;
    }

    // equals et hashCode sur l'identité (id) : obligatoires dans domain/model, voir references/sonar.md, section 2

    public static final class Builder {

        private OrderId id;
        private CustomerId customerId;
        private List<OrderLine> lines;
        private LocalDate deliveryDate;
        private String comment;

        private Builder() {
        }

        public Builder id(OrderId id) {
            this.id = id;
            return this;
        }

        public Builder customerId(CustomerId customerId) {
            this.customerId = customerId;
            return this;
        }

        public Builder lines(List<OrderLine> lines) {
            this.lines = lines;
            return this;
        }

        public Builder deliveryDate(LocalDate deliveryDate) {
            this.deliveryDate = deliveryDate;
            return this;
        }

        public Builder comment(String comment) {
            this.comment = comment;
            return this;
        }

        public Order build() {
            return new Order(this);
        }
    }
}

Order order = Order.builder()
        .customerId(customerId)
        .lines(lines)
        .deliveryDate(LocalDate.of(2026, Month.NOVEMBER, 5))
        .build();
```

## 6. Design patterns

Utiliser un pattern quand il résout un vrai problème (jamais pour décorer) et nommer la classe d'après lui.

| Besoin | Pattern | Exemple Spring Boot |
|---|---|---|
| Remplacer un `switch`/`if` sur un type | **Strategy** | `PaymentStrategy` (Wave, Orange Money, carte), injectées en `Map` ou `List` |
| Créer un objet selon un contexte | **Factory** | `NotificationFactory` |
| Construire un objet complexe | **Builder** | §5 |
| Isoler un système externe | **Adapter** (ports & adapters) | `SmsGatewayAdapter implements SmsPort` |
| Squelette d'algorithme à étapes variables | **Template Method** | import/export de fichiers |
| Réagir à un événement sans couplage | **Observer** | `ApplicationEventPublisher` + `@TransactionalEventListener` |
| Ajouter un comportement transversal | **Decorator** / AOP | cache (`CachedProductReader`), audit, métriques |
| Chaîne de validations | **Chain of Responsibility** | règles de validation d'une commande |
| Trop de dépendances injectées (surtout un controller) | **Facade** | `OrderFacade` (couche application) qui regroupe les use cases du controller |
| Filtres dynamiques de recherche | **Specification** | `JpaSpecificationExecutor` |
| Valeur métier typée | **Value Object** | `Money`, `PhoneNumber`, `OrderId` |

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

Cache Redis avec TTL et invalidation explicite (Decorator du port de lecture), ShedLock sur chaque `@Scheduled`, logs essentiels en zip avec rétention, Dockerfile en layers et non-root avec healthcheck, trois fichiers compose, `.env.example` toujours synchronisé, dossier `docs/`.

## 12. TDD et tests (obligatoires)

**Les 3 lois du TDD**
1. Pas de code de production sans un test qui échoue d'abord.
2. Écrire juste assez de test pour échouer.
3. Écrire juste assez de code pour passer le test.

**Cycle Red → Green → Refactor.** Écrire d'abord un test qui échoue pour la plus petite portion de comportement, puis le code minimal qui le fait passer, puis refactorer avec les tests au vert. Un seul test rouge à la fois.

**Règles F.I.R.S.T.** : *Fast* (tests unitaires sans Spring), *Independent* (aucune dépendance entre tests), *Repeatable* (`Clock`, Testcontainers), *Self-validating* (assertions, pas de lecture de logs), *Timely* (écrits avant le code). **Un concept par test** (idéalement un assert). Le code de test est aussi important que le code de production.

- **Livraison : le test est présenté avant l'implémentation** qu'il pilote, et les deux sont livrés ensemble.
- **Correction de bug** : écrire d'abord le test qui reproduit le bug, puis corriger.
- Ordre par défaut : de l'intérieur vers l'extérieur — domaine, puis use cases, puis adapters, puis controllers.
- **Garde-fous d'architecture (ArchUnit, recommandé)** : un test d'architecture vérifie (1) que `..domain..` ne dépend que de `java..` et de `..domain..` (ou `shared.domain`), (2) que `domain` et `application` n'importent jamais `infrastructure`, (3) qu'aucune feature n'importe une autre (règle par tranches `com.<projet>.(*)..` en excluant `shared`, `config`, `bootstrap`), (4) que chaque controller implémente son interface `XxxController` (implémentation `XxxControllerImpl`).
- Outils choisis selon le projet ; base par défaut : JUnit 5, Mockito, AssertJ, Spring Test, Testcontainers (PostgreSQL, Redis), JaCoCo.

| Niveau | Cible | Outils |
|---|---|---|
| Unitaire | domaine et use cases, sans Spring | JUnit 5, Mockito, AssertJ |
| Slice web | controllers, validation, format d'erreur, sécurité des routes | `@WebMvcTest`, MockMvc |
| Slice persistance | repositories, requêtes, migrations Flyway | `@DataJpaTest` + Testcontainers PostgreSQL (pas H2 : comportement différent) |
| Cache / Redis | cache, rate-limiting, révocation JWT | Testcontainers Redis |
| Intégration | parcours complet d'une feature | `@SpringBootTest` + Testcontainers |

Règles :

- Nommage `should_<résultat>_when_<condition>` ; structure *Given / When / Then* ; une intention par test.
- Test d'exception : la préparation (*given*) sort de la lambda, qui ne contient **qu'un seul appel** (S5778) :

```java
CreateOrderCommand command = CreateOrderCommand.builder().customerId(CUSTOMER_ID).lines(List.of()).build();

assertThrows(InvalidOrderException.class, () -> createOrderUseCase.execute(command));
```

- Chaque use case : cas nominal, erreurs, cas limites. Chaque endpoint : succès, validation (`400`), sécurité (`401`/`403`), introuvable (`404`).
- Tests de sécurité systématiques : CSRF, injection SQL, rate-limit (`429`), jeton révoqué (`401`), filtre `Sec-Fetch-Mode` (`403`), Swagger absent en profil `prod`.
- Assertions AssertJ ; temps contrôlé via `Clock` ; constantes pour les valeurs répétées ; `Month.X` pour les dates ; test data builders ; mocker les ports `out`, pas le domaine.
- JaCoCo configuré, seuil du Quality Gate sur le code neuf.

```java
@ExtendWith(MockitoExtension.class)
class CreateOrderUseCaseImplTest {

    private static final String CUSTOMER_ID = "customer-1";

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private CreateOrderUseCaseImpl createOrderUseCase;

    @Test
    void should_save_order_when_command_is_valid() {
        // given
        CreateOrderCommand command = CreateOrderCommand.builder()
                .customerId(CUSTOMER_ID)
                .deliveryDate(LocalDate.of(2026, Month.NOVEMBER, 5))
                .build();
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // when
        Order result = createOrderUseCase.execute(command);

        // then
        assertThat(result.getCustomerId().value()).isEqualTo(CUSTOMER_ID);
        verify(orderRepository).save(any(Order.class));
    }
}
```

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
9. **Vérification** : checklist ci-dessous.

## 14. Livraison

- Fichiers complets, pas d'extraits avec « … ». Correction ciblée → uniquement les fichiers modifiés.
- Toujours livrer le code **et** ses tests ensemble.
- Signaler tout changement de contrat d'API (le front Angular doit suivre), toute nouvelle migration et toute nouvelle variable d'environnement.

Checklist avant de livrer :

- [ ] `domain` n'importe que `java.*` (aucun Lombok, Spring, Jakarta, SLF4J, Jackson) ; builders du domaine écrits à la main.
- [ ] Exceptions : un seul `GlobalExceptionHandler`, aucun `try/catch` ni `@ExceptionHandler` local dans les controllers.
- [ ] Règle de dépendance respectée (aucun import `infrastructure` dans `domain`/`application`) ; agrégats avec comportement, pas de modèle anémique.
- [ ] `equals` / `hashCode` présents dans chaque classe de `domain/model` (identité pour les entités, `record` pour les value objects) ; aucun `==` sur des objets qui redéfinissent `equals`.
- [ ] Structure respectée (`domain/port` pour les ports, `application/usecase` pour leurs implémentations, `infrastructure/persistence/{entity,repository,mapper,adapter}`, `infrastructure/web/...`) ; aucun import d'une feature par une autre (passage par `shared/domain/port/out` ou événement).
- [ ] Chaque controller a son interface `XxxController` (`web/controller/`) et son implémentation `XxxControllerImpl` (`web/controller/implement/`) ; Swagger complet (réponses, requêtes, DTO, erreurs) ; records de documentation dans `web/doc` ; test de complétude au vert.
- [ ] Mots de passe (et codes PIN) hashés, jamais en clair, jamais loggés ni renvoyés.
- [ ] Streams utilisés quand ils sont lisibles (`toList()` / `collect`, jamais `forEach(list::add)`) ; aucun import, champ, méthode, variable ni paramètre inutilisé ; aucun `Thread.sleep` dans les tests.
- [ ] Tests écrits d'abord et cohérents avec le code (unitaires + slice concernée + tests de sécurité).
- [ ] Aucune entité exposée par l'API ; DTO validés ; tris en liste blanche ; requêtes paramétrées.
- [ ] CSRF traité (jeton CSRF sur les requêtes portant le cookie, contrôle `Origin`, ADR du transport des jetons), rate-limit configuré, jetons révocables via Redis.
- [ ] Aucun mois numérique (`Month.X` partout), aucun ternaire imbriqué, aucun littéral dupliqué.
- [ ] Pas de surcharge pour simuler des paramètres optionnels : Builder utilisé.
- [ ] Clean code : noms qui révèlent l'intention, fonctions courtes (≤ 4 arguments, aucun booléen), commande/requête séparées, aucun `null` retourné ni passé, exceptions avec contexte, aucun code mort, commentaires = documentation ou explication, façade si une classe (surtout un controller) dépasse 4 dépendances.
- [ ] Tests : un concept par test, F.I.R.S.T., écrits avant le code ; lambdas `assertThrows` / `assertThatThrownBy` avec un seul appel (S5778).
- [ ] Pas d'issue Sonar évidente (imports inutilisés, `System.out`, `catch` vide, complexité).
- [ ] Écritures sans race condition (`UNIQUE`, `@Version`, `UPDATE` conditionnel) et idempotentes (`Idempotency-Key`, `eventId` traité une seule fois) ; test de concurrence écrit.
- [ ] Migration Flyway ajoutée si le schéma change, aucune migration existante modifiée ; index créés (clés étrangères, colonnes filtrées / triées).
- [ ] Toute nouvelle clé de `application-prod.yml` présente dans `.env.example` (et dans le compose prod si transmise).
- [ ] Toute tâche `@Scheduled` protégée par ShedLock ; cache avec TTL et invalidation.
- [ ] Fuseau jamais en dur : `app.timezone` (YAML) ; heures via `Clock` / `Instant` ; logs sans donnée sensible.
- [ ] Hikari configuré explicitement (taille, timeouts, `max-lifetime`) ; CORS en liste blanche d'origines, jamais `*` en prod ; `app.security.bloquer-navigation-directe` présent dans le YAML et `.env.example`.
- [ ] Swagger désactivé en prod ; Dockerfile non-root avec healthcheck.
- [ ] `docs/http/` à jour, ADR / diagrammes / flows ajoutés si nécessaire.
