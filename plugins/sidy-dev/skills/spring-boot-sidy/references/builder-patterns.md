# Builder et design patterns

Sections 5 et 6 du skill `spring-boot-sidy`, déplacées ici sans modification pour alléger le `SKILL.md`.

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
