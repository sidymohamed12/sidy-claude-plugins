# Checklist de livraison (§14 du skill)

À appliquer point par point avant de livrer, ou comme grille de départ d'une revue.

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
- [ ] Index : aucune fonction, calcul ni cast sur une colonne indexée dans les requêtes (sinon index d'expression identique) ; `LIKE '%x%'` servi par `pg_trgm` ; composite avec les égalités d'abord ; `CREATE INDEX CONCURRENTLY` en un fichier par index sur une grosse table ; nommage `idx_` / `uk_` / `fk_` / `ck_` ; aucun `@Table(indexes = …)` (`references/index-postgresql.md`).
- [ ] Migration sûre : changement cassant (renommage, suppression, `NOT NULL` sans défaut) découpé en expand / contract et `DROP` avec l'accord de Sidy ; grosse table : colonne nullable, backfill par lots dans un job (ShedLock, rejouable), `NOT VALID` puis `VALIDATE`, `lock_timeout` ; migration non transactionnelle rejouable ; `ddl-auto: validate` partout, pas de H2 ; test de migration (base vide, et avec données si backfill) (`references/migrations-flyway.md`).
- [ ] N+1 : associations `LAZY` écrites explicitement, aucun `EAGER`, requête de l'adapter qui charge ce que le mapper lit, aucun `JOIN FETCH` / `@EntityGraph` de collection avec `Pageable`, pas de `findById` dans une boucle, test de comptage de requêtes (contexte vidé, assez de données) sur chaque liste importante (`references/jpa-n-plus-1.md`).
- [ ] Suppression : soft delete uniquement pour les agrégats décidés ; `deleted_at`, `@SQLDelete` + `@SQLRestriction`, unique partiel (pas de `UNIQUE` plein), `deleted_at IS NULL` dans tout SQL natif, cascades explicites, purge par use case + ShedLock + rétention lue du YAML + `Clock`, restauration réservée à un rôle admin, anonymisation ou `DELETE` pour le droit à l'effacement, tests sur PostgreSQL (`references/soft-delete.md`).
- [ ] Toute nouvelle clé de `application-prod.yml` présente dans `.env.example` (et dans le compose prod si transmise).
- [ ] Toute tâche `@Scheduled` protégée par ShedLock ; cache avec TTL et invalidation.
- [ ] Fuseau jamais en dur : `app.timezone` (YAML) ; heures via `Clock` / `Instant` ; logs sans donnée sensible.
- [ ] Hikari configuré explicitement (taille, timeouts, `max-lifetime`) ; CORS en liste blanche d'origines, jamais `*` en prod ; `app.security.bloquer-navigation-directe` présent dans le YAML et `.env.example`.
- [ ] Swagger désactivé en prod ; Dockerfile non-root avec healthcheck.
- [ ] CI : `ci.yml` vert (tests, couverture, Quality Gate, manifestes, image publiée avec un tag `vX.Y.Z` à chaque merge dans `dev`, `preprod`, `main`, `prod`) ; `deploy.yml` par digest, environnement `production` avec relecteurs ; `main` et `prod` protégées.
- [ ] Actuator : `liveness` = `livenessState` seul ; `readiness` = `readinessState,db,redis,diskSpace` ; `validate-group-membership` pas à `false` ; seuls `GET /actuator/health/liveness` et `readiness` sont publics ; les sondes ne passent pas par le rate-limit.
- [ ] Déploiement Kubernetes : Job Flyway (`prod,migration`) terminé avant le roll ; `preStop` + `terminationGracePeriodSeconds` ≥ preStop + 30 s ; `FLYWAY_ENABLED=false` sur les pods de l'app ; aucun secret dans les manifestes ; routes : `/api` seulement, jamais `/actuator`, pas d'`ingress-nginx` (archivé).
- [ ] `README.md` du projet détaillé (front et back) et à jour avec le changement.
- [ ] `docs/http/` à jour, ADR / diagrammes / flows ajoutés si nécessaire.
