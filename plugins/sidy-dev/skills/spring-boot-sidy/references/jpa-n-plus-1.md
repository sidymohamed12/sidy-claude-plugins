# N+1 et chargement JPA

Précise la ligne « Performance » de la section 9 du skill `spring-boot-sidy`. **À lire avant de mapper une association JPA, d'écrire une requête de liste ou un adapter de persistance qui charge des relations.** Exemples en anglais (`orders` et `order_lines`).

## 1. Le problème

Pour afficher N parents avec leurs enfants, le code exécute 1 requête pour les parents puis **N requêtes**, une par parent : 101 requêtes pour 100 commandes, 10 001 pour 10 000. Il vient du chargement paresseux : la requête part quand on touche la collection (`size()`, boucle, `stream()`), souvent très loin du repository.

Dans l'architecture du skill, il se cache dans l'**adapter et le mapper de persistance** (`infrastructure/persistence`) : le mapper `entity` → `model` copie `order.getLines()` et déclenche N requêtes. Le même piège existe en `@ManyToOne` (commande → client). Avec 10 lignes de test, 11 requêtes passent ; en production, non.

## 2. Règles

1. **Toutes les associations sont `LAZY`, écrit explicitement** : `@ManyToOne` et `@OneToOne` sont `EAGER` par défaut, donc `fetch = FetchType.LAZY` partout.
2. **Jamais `EAGER`** : il ne supprime pas le N+1 (`findAll()` fait quand même N requêtes ; seul `findById` fait un `JOIN`) et il charge toujours tout.
3. **C'est la requête de l'adapter qui décide quoi charger**, selon ce que le use case a besoin. Le mapper ne doit jamais déclencher un chargement paresseux : il ne lit que ce que la requête a déjà chargé. Un port `out` expose des méthodes explicites (`findAllWithLines`, `findSummaries`), jamais un `LAZY` qui fuit vers le domaine.
4. `spring.jpa.open-in-view: false` (déjà imposé) : on est obligé de charger dans le use case, et la sérialisation ne déclenche plus de requêtes. Jamais d'entité exposée par l'API (règle 7).
5. Filet global : `spring.jpa.properties.hibernate.default_batch_fetch_size: 20` (20 à 50) dans `application.yml`, pour qu'un oubli coûte quelques requêtes et non N.
6. Pas de N+1 « fait main » : `findAllById(ids)` (un `WHERE id IN`), jamais `findById` dans une boucle.
7. **Chaque endpoint de liste important a son test de comptage de requêtes** (section 5).

## 3. Les corrections

| Solution | Requêtes (100 commandes) | Pagination | À savoir |
|---|---|---|---|
| `JOIN FETCH` / `@EntityGraph` sur un `@ManyToOne` | 1 | **oui** (une valeur par parent, lignes non multipliées) | le plus simple pour « commande + client » |
| `JOIN FETCH` / `@EntityGraph` sur une **collection** | 1 | **non** | une seule collection `List` par requête ; `distinct` inutile depuis Hibernate 6 |
| `@BatchSize(size = 20)` sur la collection | 1 + ⌈N / 20⌉ = 6 | oui | aucune requête à réécrire |
| Deux requêtes : identifiants paginés, puis `IN` | 2 à 3 | oui | un peu plus de code |
| Projection DTO (`count`, `group by`) | 1 | oui | aucune entité chargée, lecture seule |

```java
// OrderJpaRepository : un @ManyToOne se charge avec la page, sans piège
@EntityGraph(attributePaths = "customer")
Page<OrderEntity> findAll(Pageable pageable);

// collection, sans pagination
@Query("select o from OrderEntity o left join fetch o.lines")
List<OrderEntity> findAllWithLines();

// projection : le nombre de lignes par commande, sans charger les lignes
@Query("select o.id as orderId, count(l) as lineCount from OrderEntity o left join o.lines l group by o.id")
List<OrderLineCount> countLinesByOrder();
```

### Pagination d'une collection : le piège

`@EntityGraph` ou `JOIN FETCH` sur une **collection** avec un `Pageable` : Hibernate ne peut pas poser de `LIMIT` (la jointure produit une ligne SQL par ligne enfant, un `LIMIT` couperait une commande en deux). Il charge **tout en mémoire** et pagine en Java (avertissement `HHH90003004`) : un `OutOfMemoryError` en attente. `@BatchSize` règle le problème parce qu'il n'y a pas de `JOIN FETCH` ; si on garde le `JOIN FETCH`, la pagination reste en mémoire, avec ou sans `@BatchSize`.

Pagination correcte en deux requêtes :

```java
@Query("select o.id from OrderEntity o")
Page<Long> findOrderIds(Pageable pageable);

@Query("select o from OrderEntity o left join fetch o.lines where o.id in :ids")
List<OrderEntity> findWithLinesByIdIn(@Param("ids") List<Long> ids);
```

```java
// dans l'adapter : il renvoie des modèles de domaine, jamais des entités. Le domaine n'importe pas
// Spring Data : convertir `Page` vers le type de page du port `out` du projet
Page<Long> idPage = orderRepository.findOrderIds(pageable);
if (idPage.isEmpty()) {
    return Page.empty(pageable);
}
Map<Long, OrderEntity> ordersById = orderRepository.findWithLinesByIdIn(idPage.getContent()).stream()
        .collect(Collectors.toMap(OrderEntity::getId, Function.identity()));
return idPage.map(id -> orderMapper.toModel(ordersById.get(id)));
```

- **Page vide** : ne pas lancer la 2e requête (un `IN` vide est inutile). **Total conservé** : `idPage.map(…)` garde `totalElements` et le `Pageable`. **Ordre** : la 2e requête n'en garantit aucun, on remet l'ordre des identifiants (comme ci-dessus). **Tri déterministe** : sur une propriété non unique (la date), ajouter l'identifiant en second critère, sinon deux pages se chevauchent. Garder une taille de page raisonnable (limite de paramètres de PostgreSQL).
- Deux collections `List` dans le même `JOIN FETCH` : `MultipleBagFetchException`. Les charger en deux requêtes ou utiliser des `Set`.
- Note de version : d'après un article de JetBrains (mai 2026, non revérifié ici), Hibernate 7.4 pousserait la limite dans la base. Vérifier la version d'Hibernate du projet (`mvn dependency:tree`) ; les deux techniques ci-dessus restent valables quelle que soit la version. Avec la nouvelle pagination, tester le cas d'une commande sans ligne.
- Ne pas viser « une seule requête » à tout prix : surveiller aussi le volume ramené, la mémoire et le temps. Un gros `JOIN FETCH` n'est pas toujours meilleur que deux requêtes simples. L'index sur la clé étrangère (`order_lines.order_id`) est indispensable : chaque requête du N+1 filtre dessus (`index-postgresql.md`).

## 4. Configuration

```yaml
# application.yml (socle) : filet de sécurité
spring:
  jpa:
    open-in-view: false
    properties:
      hibernate:
        default_batch_fetch_size: 20

# application-dev.yml : voir le N+1 pendant le développement
logging:
  level:
    org.hibernate.SQL: DEBUG
spring:
  jpa:
    properties:
      hibernate:
        generate_statistics: true

# application-test.yml : la pagination en mémoire fait échouer le test
spring:
  jpa:
    properties:
      hibernate:
        query:
          fail_on_pagination_over_collection_fetch: true
```

`fail_on_pagination_over_collection_fetch` ne protège que de la pagination en mémoire avec un `JOIN FETCH` de collection : elle ne détecte pas tous les N+1 et ne remplace pas les tests de comptage. Le signe qui ne trompe pas dans les logs : la même requête répétée avec un identifiant différent. Les logs SQL de `dev` ne se retrouvent jamais en `prod` (logs essentiels).

## 5. Test de comptage (TDD appliqué aux performances)

Un test qui compte les requêtes échoue dès qu'un N+1 réapparaît. Sans dépendance : Hibernate Statistics. **`getPrepareStatementCount()`** compte les requêtes JDBC réellement préparées ; `getQueryExecutionCount()` ne compte que les requêtes JPQL / HQL et rate les chargements paresseux, donc le N+1.

```java
@DataJpaTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderRepositoryQueryCountIT {

    private static final long MAX_STATEMENT_COUNT = 2;

    @Autowired
    private OrderJpaRepository orderRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @Test
    void should_load_orders_with_lines_in_one_statement_when_using_join_fetch() {
        // given : plusieurs commandes, plusieurs lignes chacune, persistées par un helper de test
        entityManager.flush();
        entityManager.clear();
        Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();

        // when
        List<OrderEntity> orders = orderRepository.findAllWithLines();
        orders.forEach(order -> order.getLines().size());

        // then
        assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(MAX_STATEMENT_COUNT);
    }
}
```

Mesurer proprement, sinon le test est vert alors que le N+1 existe :

- **assez de données** : 10 à 20 parents avec plusieurs enfants (avec un seul parent, un N+1 fait 2 requêtes et passe inaperçu) ;
- **`flush()` puis `clear()`** avant la mesure : un test `@DataJpaTest` est transactionnel, une entité déjà chargée est servie par la session, sans SQL ;
- **`statistics.clear()` juste avant** le scénario, et ne mesurer que lui (pas la préparation des données) ;
- compter la requête de comptage quand le use case renvoie un `Page` ;
- le seuil est une **constante nommée** adaptée au comportement attendu, pas un nombre au hasard.

Pour compter le SQL réellement envoyé dans un test de bout en bout (`@SpringBootTest`, use case complet, sans dépendre d'Hibernate), utiliser `net.ttddyy:datasource-proxy` en scope `test`. C'est une dépendance **hors BOM et hors catalogue** : l'ajouter quand le besoin est concret (Hibernate Statistics ne suffit pas), après avoir vérifié sa version stable actuelle et l'avoir épinglée dans une propriété du `pom.xml`, comme les autres.

```java
@TestConfiguration
public class QueryCountTestConfig {

    @Bean
    static BeanPostProcessor queryCountingDataSourcePostProcessor() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) {
                if (bean instanceof DataSource dataSource && !(bean instanceof ProxyDataSource)) {
                    return ProxyDataSourceBuilder.create(dataSource).name("query-counter").countQuery().build();
                }
                return bean;
            }
        };
    }
}
```

Le test fait `QueryCountHolder.clear()` avant le scénario, puis `assertThat(QueryCountHolder.getGrandTotal().getSelect()).isLessThanOrEqualTo(MAX_SELECT_COUNT)` (constante nommée), avec les mêmes règles de mesure que ci-dessus.

## 6. À éviter

`EAGER` « pour faire taire l'erreur » ; toucher une collection `LAZY` dans un mapper sans l'avoir chargée dans la requête ; `JOIN FETCH` ou `@EntityGraph` sur une collection avec `Pageable` ; deux collections `List` dans le même `JOIN FETCH` ; renvoyer des entités JPA au JSON ; une boucle qui appelle `findById` ; corriger sans mesurer le nombre de requêtes avant et après.
