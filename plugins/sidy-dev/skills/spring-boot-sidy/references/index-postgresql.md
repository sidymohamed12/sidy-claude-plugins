# Index PostgreSQL

Complète la règle 31 et la section 9 du skill `spring-boot-sidy`. **À lire avant d'écrire une migration qui crée un index, ou une requête de filtre, de recherche ou de tri.** Exemples en anglais (`orders`, `users`), comme le reste du skill.

## 1. Règles du skill (ex-§9, inchangées)

- **Index sur chaque clé étrangère** : PostgreSQL indexe automatiquement une `PRIMARY KEY` et un `UNIQUE`, **jamais** une `FOREIGN KEY`.
- Index sur les colonnes des `WHERE`, `JOIN` et `ORDER BY` des requêtes réellement écrites (filtres de recherche, tri par défaut des listes paginées). Un index se justifie par une requête réelle et fréquente, pas « au cas où » : chaque index ralentit les `INSERT` / `UPDATE` / `DELETE`, prend de l'espace et se maintient.
- Composite : colonnes d'égalité d'abord, puis plage ou tri. Partiel (`WHERE deleted_at IS NULL`) ou unique partiel quand il réduit le volume.
- `GIN` pour `jsonb`, tableaux et recherche texte (`pg_trgm`), `GiST` pour le géospatial, `BRIN` pour une très grosse table dont les valeurs suivent l'ordre physique (logs, séries temporelles).
- Nommage : `idx_<table>_<colonnes>`, `uk_<table>_<colonnes>` (unique), `fk_…`, `ck_…` (check). Pas de `ux_`.
- Les index se définissent **en SQL dans Flyway**, jamais dans `@Table(indexes = …)` : avec `ddl-auto: validate`, l'annotation ne crée rien et finit par mentir.
- Un test Testcontainers échoue si une clé étrangère n'a pas d'index (requête sur `pg_constraint` / `pg_index`, à valider sur la base du projet).

## 2. Règle d'or : la fonction du côté de la valeur, jamais de la colonne

Un B-tree est trié sur la valeur brute : il retrouve une valeur exacte ou une zone continue. Si PostgreSQL doit d'abord transformer la colonne, l'index est ignoré (`Seq Scan`).

| Requête | Problème | Correction |
|---|---|---|
| `WHERE LOWER(email) = ?` | fonction sur la colonne | normaliser à l'écriture (`email` stocké en minuscules, `Email` value object) et indexer la colonne ; sinon index sur `LOWER(email)` |
| `WHERE DATE(created_at) = '2026-11-24'` ou `EXTRACT(YEAR FROM created_at) = 2026` | fonction sur la colonne | intervalle : `created_at >= '2026-11-24' AND created_at < '2026-11-25'` |
| `WHERE amount * 1.18 > 100000` | calcul sur la colonne | isoler la colonne : `amount > 100000 / 1.18` |
| `WHERE COALESCE(phone, '') = ?` | fonction sur la colonne | `phone = ?` (un `NULL` ne correspond de toute façon pas) |
| `WHERE SUBSTRING(code, 1, 3) = 'ABC'` | fonction sur la colonne | `code LIKE 'ABC%'` |
| `WHERE customer_id::text = '42'` | cast sur la colonne | même type des deux côtés ; vérifier le type des paramètres envoyés par JDBC / JPA |
| `WHERE email ILIKE 'awa%'` | la casse change l'ordre | index sur `LOWER(email)` avec `LIKE LOWER(?)`, ou GIN `pg_trgm` |

Règles de l'index sur expression :
- l'expression doit être **identique** dans l'index et dans la requête (`LOWER(email)` ne sert pas `LOWER(TRIM(email))`, ni `UPPER(email)`) ;
- la fonction doit être `IMMUTABLE` : pas de `now()` ni `random()` ; `DATE(timestamptz)` dépend du fuseau (refusée) ; `unaccent` n'est pas immutable par défaut ;
- la fonction est recalculée à chaque écriture : préférer normaliser à l'écriture, ou une colonne générée (`GENERATED ALWAYS AS (LOWER(email)) STORED`) indexée.

## 3. `LIKE`, recherche de texte et unicité

| Motif | Index |
|---|---|
| `LIKE 'dup%'` (préfixe) | B-tree, avec `text_pattern_ops` si la collation n'est pas `C` (`SHOW lc_collate;`) ; cet index ne sert ni à `<` / `>` ni au tri : garder aussi l'index classique si besoin |
| `LIKE '%dupont'` (suffixe) | B-tree sur `reverse(col) text_pattern_ops`, requête `reverse(col) LIKE 'tnopud%'` |
| `LIKE '%dup%'` (n'importe où) | `CREATE EXTENSION IF NOT EXISTS pg_trgm;` puis GIN `gin_trgm_ops` (accepte aussi `ILIKE`) ; motif d'au moins 3 caractères ; index plus lourd qu'un B-tree |
| `LOWER(email) LIKE '%gmail%'` | GIN sur `LOWER(email) gin_trgm_ops`, expression identique dans la requête |

- Domaine d'une adresse : `LIKE 'gmail%'` ne trouve **pas** `amadou@gmail.com`. Utiliser `LIKE '%@gmail.com'` (GIN ou `reverse`), un index sur `split_part(email, '@', 2)`, ou une colonne `domain` dédiée et indexée.
- **Unicité insensible à la casse** : `CREATE UNIQUE INDEX uk_users_email_lower ON users (LOWER(email));`. Avant de le créer, repérer les doublons existants (`SELECT LOWER(email), count(*) FROM users GROUP BY 1 HAVING count(*) > 1;`) et fixer les règles de normalisation (`TRIM` ?) : l'application normalise de la même façon avant d'écrire.
- Faible cardinalité (`active = TRUE` pour 95 % des lignes, statut à 3 valeurs) : ne pas indexer seul ; index partiel sur la valeur rare ou colonne en tête d'un composite.

## 4. Index composite

Un index `(A, B, C)` est trié par `A`, puis `B`, puis `C` : il sert les requêtes qui commencent par ses premières colonnes (préfixe gauche).

- `WHERE A`, `A AND B`, `A AND B AND C` : utilisé. `WHERE B` seul : non. `WHERE A AND C` : l'index sert pour `A`, `C` est filtrée sans profiter de l'ordre.
- Égalités d'abord, plage ou tri en dernier : après une colonne en plage, les suivantes ne délimitent plus la zone.
- Une fonction sur une colonne du milieu coupe l'usage de cette colonne et des suivantes ; sur la première, tout l'index est inutile.
- `OR` entre deux colonnes : deux index séparés (combinés en `BitmapOr`) ou une réécriture en `UNION`.
- `ORDER BY` : l'index se lit aussi à l'envers ; si les sens sont mélangés (`B DESC, C ASC`), créer l'index avec les mêmes sens.
- `(A, B)` rend un index seul sur `A` redondant (garder le composite) ; il ne remplace pas un index sur `B`. Ne pas compter sur le *skip scan* des versions récentes.
- Partir des requêtes réelles ; à égalité, la colonne la plus sélective en premier.

Variantes utiles : **partiel** (`… (created_at) WHERE status = 'NEW'`, la requête doit contenir la même condition) ; **couvrant** (`… (customer_id) INCLUDE (amount, status)` pour un `Index Only Scan`, qui demande un `VACUUM` à jour et des requêtes sans `SELECT *`).

## 5. Pagination « keyset » pour les très grosses listes

`Pageable` (offset) reste le défaut (§8 du skill). Quand l'offset devient grand, passer en keyset, avec un tri **déterministe** (l'identifiant en dernier critère) :

```sql
CREATE INDEX idx_orders_customer_created_id ON orders (customer_id, created_at DESC, id DESC);

SELECT id, amount, created_at FROM orders
WHERE customer_id = :customerId AND (created_at, id) < (:lastCreatedAt, :lastId)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

## 6. Créer l'index dans Flyway

- **Un fichier = un index** : `V12__add_index_orders_customer_status_created.sql` contenant `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_status_created ON orders (customer_id, status, created_at);`, avec son `.sql.conf` (`executeInTransaction=false`, voir §9 du skill). Table petite ou développement : `CREATE INDEX` classique suffit. `CONCURRENTLY` ne bloque pas les écritures mais est plus long.
- Si `CONCURRENTLY` échoue, il laisse un index **invalide**. Le repérer et le refaire (la migration est écrite rejouable) :

```sql
SELECT indexrelid::regclass AS invalid_index FROM pg_index WHERE NOT indisvalid;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_customer_status_created;
```

  Voir aussi `migrations-flyway.md`, section 5 (échec d'une migration non transactionnelle).
- Tester la migration sur une copie réaliste avant la production.

## 7. Vérifier et surveiller

- `EXPLAIN (ANALYZE, BUFFERS)` **exécute** la requête : pour un `UPDATE` ou un `DELETE`, l'envelopper dans `BEGIN; … ROLLBACK;`. À lire : le type de scan (`Seq Scan`, `Index Scan`, `Index Only Scan`, `Bitmap`), `Rows Removed by Filter` énorme (index manquant), `rows` estimé très différent du réel (statistiques périmées : `ANALYZE`), `Execution Time`.
- Un `Seq Scan` est **normal** sur une petite table ou quand la requête ramène une grande partie des lignes (le planificateur a raison). Tester sur un volume réaliste, pas sur 100 lignes.
- Repérer les requêtes lentes avec `pg_stat_statements`. Index jamais utilisés : `SELECT relname, indexrelname, idx_scan FROM pg_stat_user_indexes WHERE idx_scan = 0 ORDER BY pg_relation_size(indexrelid) DESC;` ; ne rien supprimer sans vérifier qu'il ne porte pas une contrainte (`PRIMARY KEY`, `UNIQUE`) et sans avoir observé la production assez longtemps. Grosses tables lues surtout en `Seq Scan` : `pg_stat_user_tables` (`seq_scan > idx_scan`).
- Après un gros import : `ANALYZE`. En production : `REINDEX CONCURRENTLY` si un index gonfle.

Test d'intégration d'un index (la table de test est quasi vide : on interdit le `Seq Scan` pour vérifier que l'index existe et correspond à la requête) :

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class OrderIndexIT {

    private static final String EXPLAIN_SQL =
            "EXPLAIN SELECT * FROM orders WHERE customer_id = 42 AND status = 'PAID'";
    private static final String INDEX_NAME = "idx_orders_customer_status_created";

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void should_use_composite_index_when_filtering_by_customer_and_status() {
        jdbc.execute("SET LOCAL enable_seqscan = off");

        String plan = String.join("\n", jdbc.queryForList(EXPLAIN_SQL, String.class));

        assertThat(plan).contains(INDEX_NAME);
    }
}
```

## 8. À éviter

Indexer toutes les colonnes ; un `CREATE INDEX` bloquant sur une grosse table en pleine journée ; un composite dans le mauvais ordre ; `LIKE '%mot'` en espérant un B-tree ; créer ou supprimer un index sans lire le plan ; `SELECT *` partout (l'index couvrant ne sert plus) ; se fier à un test sur une table vide.
