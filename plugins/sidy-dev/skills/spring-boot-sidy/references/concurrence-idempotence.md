# Concurrence, race conditions et idempotence

À lire pour tout code qui **écrit** : création, mise à jour, paiement, réservation, stock, compteur, numéro séquentiel, consommation d'événement, tâche planifiée, appel d'un service externe.

## Sommaire

1. Principes
2. Éviter les race conditions
3. Idempotence des endpoints (`Idempotency-Key`)
4. Idempotence des événements, listeners et jobs
5. Redis et verrous
6. Tests de concurrence

## 1. Principes

- **Toute opération d'écriture est conçue pour être rejouée** (double clic, retry réseau, rejeu d'événement, deux instances de l'application) sans effet en double.
- **La base de données est l'arbitre final** : contrainte `UNIQUE`, `@Version`, `UPDATE … WHERE` conditionnel. Un `if (!exists) save()` en Java n'est **jamais** une protection (vérifier puis agir n'est pas atomique).
- Préférer une **opération atomique** à un verrou ; préférer un verrou court à un verrou long ; jamais de verrou tenu pendant un appel externe.
- Les transactions sont courtes et portent sur un seul agrégat (`@Transactional` sur le use case).

## 2. Éviter les race conditions

| Situation                                         | Solution                                                                                                                                                                                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deux modifications simultanées d'un même agrégat  | `@Version` (verrou optimiste) → `OptimisticLockingFailureException` traitée en `409` par le handler global (le client relit puis réessaie)                                                                                          |
| Compteur, stock, solde, places restantes          | Mise à jour atomique en SQL : `UPDATE stock SET quantity = quantity - :n WHERE id = :id AND quantity >= :n` (0 ligne modifiée → règle métier violée), ou verrou pessimiste `PESSIMISTIC_WRITE` (`SELECT … FOR UPDATE`) sur la ligne |
| « Créer s'il n'existe pas »                       | Contrainte `UNIQUE` en base + gestion de la violation (`DataIntegrityViolationException` → relecture ou `409`) ; ou `INSERT … ON CONFLICT DO NOTHING / DO UPDATE`                                                                   |
| Numéro séquentiel sans trou, référence métier     | Séquence PostgreSQL, ou ligne de compteur verrouillée ; jamais `max(id) + 1`                                                                                                                                                        |
| File de travail consommée par plusieurs instances | `SELECT … FOR UPDATE SKIP LOCKED`                                                                                                                                                                                                   |
| Transition d'état (`PENDING → PAID`)              | Mise à jour conditionnelle `WHERE status = 'PENDING'` ; 0 ligne → déjà traité, répondre avec l'état courant                                                                                                                         |
| Cache et base                                     | Écrire en base d'abord, invalider le cache après le commit (`@TransactionalEventListener(AFTER_COMMIT)`), jamais avant                                                                                                              |

Règles complémentaires :

- Les contraintes `UNIQUE` (et les index qui les portent) sont définies dans Flyway (voir `SKILL.md` §9).
- Aucun état partagé mutable dans un bean singleton ; sinon `Atomic*`, `ConcurrentHashMap` ou structure immuable.
- Éviter les deadlocks : verrouiller toujours dans le **même ordre** (par identifiant croissant).
- Une exception de concurrence est **attendue** : on la traduit (409), on ne la laisse pas devenir un `500`.

## 3. Idempotence des endpoints

- `GET`, `PUT`, `DELETE` sont idempotents par construction : le vérifier (`DELETE` d'une ressource absente → `204` ou `404` constant, `PUT` remplace sans cumuler).
- **Tout `POST` qui crée ou déclenche un effet (paiement, réservation, envoi, création de compte) exige l'en-tête `Idempotency-Key`** (UUID généré par le client, un par intention).

Fonctionnement :

1. Le serveur calcule une empreinte de la requête (méthode, chemin, utilisateur, corps haché).
2. Il tente d'insérer `(key, user_id, request_hash, status = IN_PROGRESS)` dans la table `idempotency_key` — contrainte `UNIQUE (user_id, key)` : c'est elle qui sérialise deux requêtes simultanées.
3. Insertion réussie → il exécute le traitement, puis enregistre le statut HTTP et le corps de la réponse (`COMPLETED`).
4. Clé déjà présente : `COMPLETED` → **rejouer la même réponse** sans retraiter ; `IN_PROGRESS` → `409` avec `Retry-After` ; même clé mais empreinte différente → `422`.
5. TTL de 24 h à 7 jours, purge par une tâche ShedLock.

Emplacement : port `IdempotencyStore` dans `shared/domain/port/out`, adapter JPA (ou Redis `SET NX` avec TTL) dans `shared/infrastructure/persistence`, interception dans un `HandlerInterceptor` ou un aspect de `shared/infrastructure/web/interceptor`. Table créée par Flyway (`UNIQUE (user_id, idempotency_key)`).

Documentation Swagger : l'en-tête `Idempotency-Key` est déclaré dans l'interface du controller (`@Parameter`, obligatoire) avec les réponses `409` et `422`.

## 4. Idempotence des événements, listeners et jobs

- **Consommateur idempotent** : un événement peut être livré deux fois. Chaque événement porte un `eventId` ; le listener enregistre les `eventId` traités dans une table `processed_event` (`UNIQUE (consumer, event_id)`) **dans la même transaction** que son effet. Doublon → ignorer.
- Appel à un service externe (SMS, e-mail, paiement) : transmettre une clé d'idempotence au fournisseur quand il en accepte une ; sinon enregistrer l'envoi (statut `SENT`) avant de renvoyer.
- **Retries** (`@Retryable`, relance planifiée) uniquement sur des opérations idempotentes, avec backoff et nombre maximal de tentatives.
- **Jobs `@Scheduled`** : ShedLock empêche l'exécution simultanée, mais le job reste **idempotent** (il peut être relancé après un échec ; il traite « tout ce qui reste à faire », pas « ce que j'ai fait hier »).
- Outbox : pour publier un événement de façon fiable avec un changement en base, écrire l'événement dans une table `outbox` dans la même transaction, puis le publier depuis un job (livraison au moins une fois + consommateur idempotent).

## 5. Redis et verrous

- Opérations Redis atomiques (`INCR`, `SET NX EX`, script Lua) plutôt que lire-puis-écrire (rate-limiting Bucket4j et révocation JWT s'y appuient déjà).
- Verrou distribué (`SET key value NX PX`) réservé aux cas sans solution en base ; durée limitée, valeur unique pour ne libérer que son propre verrou. ShedLock reste réservé aux tâches planifiées.
- Ne jamais dépendre d'un `synchronized` ou d'un `ReentrantLock` local pour protéger une donnée partagée entre plusieurs instances.
- **Fils virtuels (Java 25, Boot 4).** `spring.threads.virtual.enabled=true`, un `Executor` de fils virtuels ou un `@Async` sans exécuteur borné ne sérialisent plus les accès qu'un petit pool de plateforme sérialisait par hasard. Un vérifier-puis-agir reste faux. Un `ThreadLocal` posé par le filtre de sécurité ne suit pas un traitement déporté : passer l'identité en argument. Ne pas partager un objet non thread-safe entre ces fils. Un `synchronized` qui épingle un carrier est un sujet de performance, pas une protection.

## 6. Tests de concurrence

- Test d'intégration (Testcontainers) lançant **N requêtes simultanées** (`ExecutorService`, `CountDownLatch` de départ commun) sur le même agrégat : une seule réussit, les autres reçoivent `409` ; stock jamais négatif ; une seule ligne créée.
- Test d'idempotence : même `Idempotency-Key` deux fois → même réponse, un seul effet en base ; même clé avec un corps différent → `422`.
- Test de rejeu d'événement : le listener appelé deux fois avec le même `eventId` → effet unique.
- Attentes asynchrones avec Awaitility, jamais `Thread.sleep` (règle Sonar).
