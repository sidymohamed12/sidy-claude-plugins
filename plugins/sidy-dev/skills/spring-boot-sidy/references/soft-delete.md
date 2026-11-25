# Soft delete (suppression logique)

À lire **avant de supprimer des données** (use case de suppression, `DELETE`, entité métier à historiser) ou de poser une contrainte d'unicité sur un agrégat supprimable. Complète les sections 9 (persistance) et 11 (tâches planifiées) du skill `spring-boot-sidy`. Exemples en anglais (`users`).

## 1. Quand l'utiliser : une décision par agrégat

- **Oui** : données métier à historiser ou à conserver (clients, comptes, commandes, ventes, factures), erreurs humaines à pouvoir corriger, audit (« qui a supprimé quoi, quand »), obligations légales de conservation.
- **Non** : données temporaires (sessions, jetons, codes à usage unique, logs techniques) : `DELETE` physique, plus simple. Pas de soft delete « par réflexe ».
- **Droit à l'effacement** (RGPD, loi sénégalaise sur les données personnelles) : le soft delete **ne suffit pas**. Anonymiser la ligne (`email = 'deleted-42@invalid'`, nom effacé : cela libère aussi l'e-mail) ou la supprimer physiquement.
- Si le besoin n'est pas clair pour un agrégat, le demander (question de démarrage 10) : ne pas décider seul. Pour un nouveau projet, l'architecte le consigne dans un ADR.

## 2. Modèle

- Colonne **`deleted_at TIMESTAMPTZ NULL`** (`NULL` = actif ; une date = supprimé), jamais un booléen (on ne saurait ni quand ni pourquoi purger). Compléter par `deleted_by VARCHAR(100) NULL` quand l'audit compte.
- Le **domaine ne connaît pas Hibernate** : il expose, via un port `out`, `delete(id)` et `restore(id)` (et ce qu'il faut pour retrouver un élément supprimé). La mécanique est dans l'adapter et l'entité d'`infrastructure/persistence/entity`, seul endroit où vivent `@SQLDelete` et `@SQLRestriction`.

```java
@Entity
@Table(name = "users")
@SQLDelete(sql = "UPDATE users SET deleted_at = now() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
```

- `@SQLDelete` : tout `delete` / `deleteById` Hibernate devient un `UPDATE`. `@SQLRestriction` ajoute `deleted_at IS NULL` à `findById`, `findAll`, aux requêtes dérivées et au JPQL. Il **remplace `@Where`** (déprécié depuis Hibernate 6.3). `now()` est l'heure de la base (`timestamptz`, indépendante du fuseau).
- La lecture « y compris supprimés » et la restauration passent par des **requêtes natives** (elles contournent `@SQLRestriction`), exposées uniquement par les ports qui en ont besoin :

```java
@Query(value = "SELECT * FROM users WHERE email = :email AND deleted_at IS NOT NULL", nativeQuery = true)
Optional<UserEntity> findDeletedByEmail(@Param("email") String email);

@Modifying
@Query(value = "UPDATE users SET deleted_at = NULL, deleted_by = NULL WHERE id = :id", nativeQuery = true)
int restore(@Param("id") Long id);
```

## 3. Unicité : unique partiel

Sans précaution, une personne dont le compte est supprimé ne peut pas se réinscrire avec le même e-mail (`duplicate key value violates unique constraint`). L'unicité ne doit porter que sur les lignes actives :

```sql
-- V12__users_email_unique_active.sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS uk_users_email;
CREATE UNIQUE INDEX uk_users_email_active ON users (email) WHERE deleted_at IS NULL;
```

- Retirer `@Column(unique = true)` et `@Table(uniqueConstraints = …)` de l'entité : le schéma appartient à Flyway (`ddl-auto: validate`). Sur une grosse table : `CONCURRENTLY` (`index-postgresql.md`, section 6).
- Même logique pour les index de lecture : un index partiel `WHERE deleted_at IS NULL` sur les colonnes très filtrées reste petit et rapide. Nommage `uk_` / `idx_`.

## 4. Pièges

- **Les requêtes natives et les `@Query("DELETE …")` ignorent `@SQLRestriction` et `@SQLDelete`** : ajouter `deleted_at IS NULL` à la main dans tout SQL natif, en particulier les rapports, exports et statistiques.
- **Les cascades sont explicites** : supprimer logiquement un parent ne supprime pas logiquement ses enfants. Le use case décide (et le test le vérifie).
- **Réinscription** : *repartir de zéro* (nouvelle ligne, l'ancienne reste archivée jusqu'à la purge) ou *réactiver* (même `id`, historique récupéré). C'est une décision métier à poser, jamais automatique. Réactiver exige de vérifier que la personne est bien propriétaire (code envoyé par e-mail) ; cela échoue si un compte actif porte déjà l'e-mail (index partiel).
- **Sécurité** : un compte supprimé ne s'authentifie plus et ses jetons sont révoqués (règle 11, révocation Redis). La **restauration** est une méthode dédiée, protégée par un rôle administrateur.
- Exception métier d'un doublon (`EmailAlreadyUsedException`) : sous-classe de la catégorie `Conflict` de `shared/domain/exception` (`409`).

## 5. Purge et rétention

Le soft delete fait grossir les tables : une purge supprime physiquement (ou archive) ce qui est supprimé depuis plus que la rétention.

- Le job suit les règles du skill : **aucune logique dans le job**, il appelle un use case (`PurgeDeletedUsersUseCase`) par son port `in` ; `@SchedulerLock` **ShedLock** (règle 21) ; durée de rétention **lue du YAML** (`app.retention.soft-deleted-days`, variable dans `.env.example` si elle est dans `application-prod.yml`) ; limite calculée avec le `Clock` injecté, jamais `Instant.now()`.

```java
@Component
@RequiredArgsConstructor
class SoftDeletePurgeJob {

    private static final String LOCK_NAME = "purgeSoftDeletedUsers";

    private final PurgeDeletedUsersUseCase purgeDeletedUsersUseCase;

    @Scheduled(cron = "${app.retention.purge-cron}")
    @SchedulerLock(name = LOCK_NAME, lockAtMostFor = "PT30M")
    void purge() {
        purgeDeletedUsersUseCase.execute();
    }
}
```

```java
// UserRepository (adapter), appelé par le use case avec limit = clock.instant().minus(retention)
@Modifying
@Query(value = "DELETE FROM users WHERE deleted_at < :limit", nativeQuery = true)
int hardDeleteOlderThan(@Param("limit") Instant limit);
```

La purge est rejouable (idempotente), et sur une très grosse table se fait par lots (voir `migrations-flyway.md`, section 4).

## 6. Tests

Sur PostgreSQL (Testcontainers), car l'index partiel n'existe pas ailleurs. Au minimum : la suppression masque sans effacer la ligne ; l'e-mail est réutilisable après suppression ; la restauration rétablit l'accès ; la purge supprime au-delà de la rétention et conserve le récent (avec un `Clock` fixe) ; la cascade décidée.

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserSoftDeleteIT {

    private static final String EMAIL = "awa@mail.com";

    @Autowired
    private UserJpaRepository repository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void should_hide_user_but_keep_row_when_user_is_deleted() {
        UserEntity saved = repository.saveAndFlush(UserEntityFixture.withEmail(EMAIL));

        repository.deleteById(saved.getId());
        entityManager.flush();
        entityManager.clear();

        assertThat(repository.findById(saved.getId())).isEmpty();
        assertThat(repository.findDeletedByEmail(EMAIL)).isPresent();
    }

    @Test
    void should_allow_same_email_when_previous_user_is_soft_deleted() {
        UserEntity first = repository.saveAndFlush(UserEntityFixture.withEmail(EMAIL));
        repository.deleteById(first.getId());
        entityManager.flush();
        UserEntity second = UserEntityFixture.withEmail(EMAIL);

        assertThatCode(() -> repository.saveAndFlush(second)).doesNotThrowAnyException();
    }
}
```

Le candidat à l'assertion est préparé **avant** la lambda (une seule invocation dedans, S5778).

## 7. À éviter

Un soft delete systématique ; garder des données personnelles après une demande d'effacement ; oublier `deleted_at IS NULL` dans un SQL natif ; un `UNIQUE` plein sur une colonne d'un agrégat supprimable ; ne jamais purger ; laisser `ddl-auto: update` avec un schéma à index partiels.
