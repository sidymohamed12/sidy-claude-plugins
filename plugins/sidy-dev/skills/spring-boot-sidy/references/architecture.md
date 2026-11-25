# Architecture Spring Boot — Clean Architecture et DDD

Section 1 du skill `spring-boot-sidy`, déplacée ici sans modification pour alléger le `SKILL.md`.

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
