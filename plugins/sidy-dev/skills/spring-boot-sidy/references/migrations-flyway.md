# Migrations Flyway et versionnement du schéma

Complète la section 9 du skill `spring-boot-sidy`. **À lire avant d'écrire une migration, de changer une colonne ou une contrainte, de toucher à la configuration Flyway ou à la CI des migrations.** Les valeurs de configuration (`validate-on-migrate`, `out-of-order`, `baseline-on-migrate`, `clean-disabled`…) sont dans `versions.md`. Exemples en anglais.

## 1. Règles de base

- Le schéma est du **code** : une migration se relit en pull request, se versionne, se teste, se déploie avec l'application.
- **Une migration appliquée ne se modifie jamais** (le checksum ne correspondrait plus : `Validate failed`). Pour corriger : une nouvelle migration `V{n+1}`.
- **En avant seulement (*forward-only*)** : pas de migrations d'annulation `U` (payantes, et un `DROP COLUMN` est irréversible), pas de « rollback de migration ». La protection, c'est une sauvegarde avant une migration risquée et le pattern expand / contract. Restaurer une sauvegarde est possible mais ramène aussi les données écrites entre-temps.
- **`ddl-auto: validate` dans tous les profils** (dev, test, prod) : Hibernate vérifie les entités, Flyway modifie le schéma. Jamais `update`, `create` ni `create-drop`, et pas de H2 en test : les tests tournent sur PostgreSQL (Testcontainers).
- `V` : exécutée une fois, dans l'ordre. `R__` (répétable) : rejouée quand son contenu change, après les `V` ; réservée aux vues, fonctions et triggers, et idempotente (`CREATE OR REPLACE`).
- Une migration = un changement cohérent et petit, au nom explicite (`V12__add_phone_to_customers.sql`). Ne pas mélanger DDL lourd et gros volumes de données. Aucune dépendance à des données propres à un environnement.
- Jamais `flyway clean` hors poste de dev. Jamais de DDL manuel en production.

## 2. Numérotation et collisions

- Séquentielle `V{n}__…` (défaut du skill). Flyway compare les versions numériquement (`V10` après `V9`) ; la colonne `version` de `flyway_schema_history` est du texte : trier sur `installed_rank`, jamais sur `max(version)`.
- **Deux branches qui créent la même version** ne provoquent aucun conflit Git (noms de fichier différents) : l'erreur `Found more than one migration with version 5` n'apparaît qu'au démarrage. Ce qui protège, c'est le test de CI (section 8). Renuméroter la migration qui arrive en second **seulement si elle n'a été appliquée dans aucun environnement partagé**.
- Migration de version inférieure à la dernière appliquée (`Ignored`, échec de validation) : la renuméroter à la suite. `out-of-order: true` reste exceptionnel (correctif urgent), puis retour à `false` : l'ordre réel d'exécution diffère sinon selon les environnements.
- **Séquentielle privilégiée.** Numérotation par horodatage (`V202611251400__…`) : permise quand le cas est concret (plusieurs équipes, branches qui vivent longtemps, collisions répétées), mais l'ordre suit alors la création et non le merge. `architecte` tranche selon le projet et le consigne dans un ADR ; ne jamais mélanger les deux styles dans un même projet.

## 3. Changements rétrocompatibles ou cassants : expand / contract

Pendant un déploiement progressif (ou après un retour arrière de l'application), l'ancienne et la nouvelle version tournent sur la même base. **Règle de fond : le schéma de la version N reste compatible avec l'application N-1 et N.**

| Rétrocompatible | Cassant (à découper) |
|---|---|
| ajouter une colonne nullable, une table, un index | supprimer ou renommer une colonne ou une table |
| élargir un type (`VARCHAR(100)` → `200`) | ajouter un `NOT NULL` sans valeur par défaut |
| | réduire un type, changer sa signification |

Un changement cassant se fait en plusieurs livraisons (exemple : scinder `name` en `given_name` et `family_name`) :

| Phase | Base | Application |
|---|---|---|
| 1. Expand | `V3` : ajouter les nouvelles colonnes (nullable) | N lit `name`, écrit dans les trois colonnes |
| 2. Backfill | `V4` (ou job par lots si grosse table) : remplir les anciennes lignes | N toujours en production |
| 3. Migrate | rien | N+1 lit les nouvelles colonnes, écrit encore `name` pour les anciennes instances |
| 4. Contract | `V5` : `NOT NULL` ; `V6` : `DROP COLUMN name`, quand plus aucune instance N ne tourne | N+2 n'utilise plus `name` |

Le `DROP` vient en dernier, et il exige l'accord explicite de Sidy (règle des migrations destructives). La règle métier d'un backfill (« le premier mot est le prénom ») se valide avec le métier **avant** d'être écrite : les noms composés la rendent ambiguë.

## 4. Grosses tables : verrous et volumes

Sur PostgreSQL, `ALTER TABLE … SET NOT NULL` vérifie chaque ligne sous un verrou qui bloque les écritures ; un `UPDATE` unique sur des millions de lignes sature CPU, disque, journal (WAL) et réplication.

1. Ajouter la colonne **nullable** (instantané, avec ou sans `DEFAULT` constant depuis PostgreSQL 11 ; le `DEFAULT` ne remplit pas rétroactivement les anciennes lignes si on le pose après coup).
2. **Backfill par lots** (5 000 à 10 000 lignes), dans un **job séparé**, jamais dans une migration qui bloquerait le démarrage. Le job est protégé par ShedLock, rejouable, et s'arrête quand plus aucune ligne n'est modifiée :

```sql
WITH batch AS (
    SELECT id FROM orders WHERE status IS NULL ORDER BY id LIMIT 5000 FOR UPDATE SKIP LOCKED
)
UPDATE orders o SET status = 'PENDING' FROM batch WHERE o.id = batch.id;
```

3. Vérifier : `SELECT COUNT(*) FROM orders WHERE status IS NULL` renvoie 0.
4. Poser la contrainte sans bloquer (la migration SQL suivante ne contient que cela) :

```sql
SET LOCAL lock_timeout = '5s';
ALTER TABLE orders ADD CONSTRAINT ck_orders_status_not_null CHECK (status IS NOT NULL) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT ck_orders_status_not_null;
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
ALTER TABLE orders DROP CONSTRAINT ck_orders_status_not_null;
```

- **`SET LOCAL lock_timeout = '5s'`** en tête de toute migration qui prend un verrou fort : si elle doit attendre une longue transaction, toutes les requêtes suivantes font la queue derrière elle. Mieux vaut qu'elle échoue vite et qu'on la relance à un moment calme.
- Index sans bloquer : `CREATE INDEX CONCURRENTLY`, un fichier = un index (`index-postgresql.md`, section 6).

## 5. Quand une migration échoue

| | PostgreSQL | MySQL / Oracle |
|---|---|---|
| DDL | transactionnel : la migration est **annulée entièrement**, aucune ligne dans `flyway_schema_history` | non transactionnel : état à moitié appliqué, ligne `success = false` qui bloque la suite |
| Réparation | corriger le fichier (jamais appliqué) et relancer | nettoyer à la main, `flyway repair`, corriger |

- Migration **appliquée avec succès mais erronée** : on n'y touche pas, on écrit `V{n+1}`.
- `flyway repair` répare les **métadonnées** de l'historique (entrées en échec, checksum d'une modification inoffensive validée). Il ne corrige jamais le schéma ni les données, et n'est jamais un moyen de réécrire l'histoire.
- **Cas non transactionnel** (`CREATE INDEX CONCURRENTLY`, `executeInTransaction=false`) : si l'échec survient sur la dernière instruction, les précédentes sont déjà validées (table créée, données insérées, index absent ou invalide). Ne pas relancer le même script tel quel : examiner l'état réel (objets présents, `pg_index WHERE NOT indisvalid`), nettoyer (supprimer l'index invalide, les doublons), `repair` si nécessaire après vérification, puis relancer. D'où la règle : **toute migration non transactionnelle est écrite rejouable** (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) et ne contient qu'une instruction.

## 6. Introduire Flyway sur une base existante (baseline)

Flyway refuse une base non vide sans historique. `baseline-on-migrate: true` + `baseline-version: 5` déclare « l'état actuel correspond à la V5 » : V1 à V5 ne sont pas rejouées, V6 et suivantes s'appliquent. Avant de l'activer :

- exporter le schéma réel et le **comparer** à celui que produiraient les migrations V1 à V5 : le baseline ne vérifie rien, il déclare ;
- contrôler le résultat en production, puis **retirer l'option** (`baseline-on-migrate` reste à `false` en usage normal).

## 7. Version du schéma et version de l'application

- La version vit à deux endroits qui doivent concorder : les fichiers dans Git (ce que l'application attend) et `flyway_schema_history` (ce qui est appliqué). `flyway info` donne les statuts : `Pending`, `Success`, `Failed`, `Ignored` (version inférieure à la dernière appliquée), `Missing` (appliquée mais script absent), `Future` (appliquée, inconnue de cette application).
- Un schéma **plus récent** que l'application (retour arrière de l'application) est toléré : `Future` est ignoré, l'ancienne instance démarre. Le vrai risque est SQL à l'exécution (colonne supprimée que l'ancienne version utilise) : d'où la règle N / N-1. **Retour arrière de l'application ≠ retour arrière de la base** (voir `ci.md`).
- Noter, dans les notes de version ou le `CHANGELOG` du projet, quelle version de schéma embarque chaque version de l'application et le schéma minimal qu'elle exige.
- **Garde-fou de démarrage** (échec net si le schéma est hors de l'intervalle que l'application supporte) : à utiliser **quand le besoin est concret** (schéma partagé par plusieurs applications, panne claire préférée à une erreur SQL en cours d'exécution). Il interdit le retour arrière applicatif simple : `architecte` en décide cas par cas. Les bornes viennent de la livraison (propriétés YAML), jamais d'un nombre en dur oublié. Ne pas exposer `/actuator/flyway` (Actuator limité aux sondes, `infra.md`).

```java
@Component
class SchemaVersionGuard implements ApplicationRunner {

    private static final String EMPTY_SCHEMA = "Aucune migration appliquée : schéma vide";
    private static final String OUT_OF_RANGE = "Schéma V%s hors de l'intervalle compatible V%s à V%s";

    private final Flyway flyway;
    private final MigrationVersion minimum;
    private final MigrationVersion maximum;

    SchemaVersionGuard(Flyway flyway, SchemaVersionProperties properties) {
        this.flyway = flyway;
        this.minimum = MigrationVersion.fromVersion(properties.minimum());
        this.maximum = MigrationVersion.fromVersion(properties.maximum());
    }

    @Override
    public void run(ApplicationArguments args) {
        MigrationInfo current = flyway.info().current();
        if (current == null) {
            throw new IllegalStateException(EMPTY_SCHEMA);
        }
        MigrationVersion version = current.getVersion();
        if (version.compareTo(minimum) < 0 || version.compareTo(maximum) > 0) {
            throw new IllegalStateException(OUT_OF_RANGE.formatted(version, minimum, maximum));
        }
    }
}
```

  Test (`should_reject_schema_when_version_is_out_of_range`, `@ParameterizedTest`) : construire le garde **avant** la lambda, qui ne contient que `guard.run(null)` (S5778).
- **Test « version attendue »** (`flyway.info().current()` égale une constante) : utile quand on veut qu'ajouter une migration soit visible en revue ; la constante se met à jour à chaque migration. À activer quand l'équipe le demande, pas par défaut.

## 8. Dérive du schéma, CI et tests

- **Dérive** = le schéma réel ne correspond plus aux migrations. Causes : `ALTER TABLE` ou index ajouté à la main, migration modifiée après coup, `ddl-auto=update`. `flyway validate` ne voit **pas** un DDL manuel ; `ddl-auto: validate` ne voit que ce que décrivent les entités. Prévention : aucun DDL manuel, compte applicatif sans droit DDL (`securite.md`, compte Flyway distinct). Détection : comparaison de schémas planifiée (base issue des migrations contre base réelle).
- **CI, à chaque pull request** : (1) rejouer toutes les migrations sur une base vide (attrape collisions de version et scripts invalides) ; (2) pour toute migration qui touche des données existantes (backfill, `NOT NULL`), migrer jusqu'à la version précédente, insérer des lignes, puis migrer jusqu'au bout. Les deux chemins ne se remplacent pas : une base vide ne révèle pas qu'un `NOT NULL` échoue sur des lignes existantes. En production : un Job de migration avant le roll (`kubernetes.md`), jamais un humain.

```java
@Testcontainers
class SchemaMigrationIT {

    private static final String LOCATIONS = "classpath:db/migration";
    private static final String VERSION_BEFORE_BACKFILL = "3";
    private static final String LATEST = "latest";
    private static final String EMAIL = "awa@example.com";
    private static final String INSERT_CUSTOMER = "INSERT INTO customers (name, email) VALUES (?, ?)";
    private static final String SELECT_NAMES = "SELECT given_name || '|' || family_name FROM customers WHERE email = ?";

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    private Flyway flyway(String target) {
        return Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations(LOCATIONS)
                .target(target)
                .load();
    }

    @Test
    void should_apply_and_validate_all_migrations_when_database_is_empty() {
        Flyway flyway = flyway(LATEST);

        flyway.migrate();
        flyway.validate();

        assertThat(flyway.info().pending()).isEmpty();
    }

    @Test
    void should_backfill_names_when_customers_already_exist() {
        flyway(VERSION_BEFORE_BACKFILL).migrate();
        JdbcTemplate jdbc = new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        jdbc.update(INSERT_CUSTOMER, "Awa Diop", EMAIL);

        flyway(LATEST).migrate();

        assertThat(jdbc.queryForObject(SELECT_NAMES, String.class, EMAIL)).isEqualTo("Awa|Diop");
    }
}
```

Un `@SpringBootTest` ou `@DataJpaTest` sur la même base (`ddl-auto: validate`) échoue si une entité ne correspond plus au schéma produit par les migrations. Pas de H2.

## 9. À éviter

Modifier ou supprimer une migration appliquée ; renommer ou supprimer une colonne en une seule migration pendant un déploiement progressif ; activer `out-of-order: true` en permanence ; corriger la production à la main sans migration ; considérer que « ça démarre » veut dire « c'est compatible » ; un gros `UPDATE` dans une migration ; `flyway repair` pour masquer une migration modifiée.
