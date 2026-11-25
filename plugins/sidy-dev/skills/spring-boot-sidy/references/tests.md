# TDD et tests

Section 12 du skill `spring-boot-sidy`, déplacée ici sans modification pour alléger le `SKILL.md`.

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
