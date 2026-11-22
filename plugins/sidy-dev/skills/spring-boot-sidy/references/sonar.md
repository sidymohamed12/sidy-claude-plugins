# Règles Sonar — référence détaillée

À lire **avant d'écrire du code** et pour toute relecture. Objectif : **zéro issue Sonar** sur le code neuf, dès la première version. On corrige la cause ; on n'ajoute jamais `// NOSONAR` ni `@SuppressWarnings` pour masquer un vrai problème.

## Sommaire

1. Règles les plus fréquentes
2. Égalité : `equals`, `hashCode`, `==`
3. Tests
4. Streams, collections et pattern matching
5. Code inutilisé
6. Conception des classes et des membres
7. Dates et temps
8. Concurrence

## 1. Règles les plus fréquentes

- **Pas de ternaire imbriqué** (S3358) : extraire en variables ou méthodes, ou utiliser un `switch` expression.
- **Littéral dupliqué** (S1192) : constante `private static final String`, y compris dans les tests.
- **Complexité cognitive** (S3776) : découper les méthodes (≤ 15).
- **Trop de paramètres** (S107) : au-delà de 7, objet de paramètres ou Builder (notre règle interne est plus stricte : 4 maximum, voir `clean-code.md`).
- Injection par constructeur ; pas de `System.out` ni `printStackTrace` (SLF4J).
- Pas de `catch` vide ; ne pas attraper `Exception` / `Throwable` sans raison ; ne pas ignorer un retour (`Optional.get()` sans vérification).
- `try-with-resources` pour toute ressource fermable.
- Nommage conforme (classes `PascalCase`, méthodes `camelCase`, constantes `UPPER_SNAKE_CASE`).
- Couverture du code neuf selon le Quality Gate (80 % par défaut sauf indication contraire).

```java
// ❌ ternaire imbriqué
String label = status == Status.ACTIVE ? "Actif" : status == Status.SUSPENDED ? "Suspendu" : "Inconnu";

// ✅
private static final String LABEL_ACTIVE = "Actif";
private static final String LABEL_SUSPENDED = "Suspendu";
private static final String LABEL_UNKNOWN = "Inconnu";

private String toLabel(Status status) {
    return switch (status) {
        case ACTIVE -> LABEL_ACTIVE;
        case SUSPENDED -> LABEL_SUSPENDED;
        default -> LABEL_UNKNOWN;
    };
}
```

## 2. Égalité : `equals`, `hashCode`, `==`

Règles Sonar concernées :

- `"equals"` method overrides should accept `"Object"` parameters.
- `"equals"` method parameters should not be marked `"@Nonnull"`.
- `"equals"` methods should be symmetric and work for subclasses.
- `"equals(Object obj)"` and `"hashCode()"` should be overridden in pairs.
- `"equals(Object obj)"` should be overridden along with the `"compareTo(T obj)"` method.
- `"equals(Object obj)"` should test the argument's type.
- `"=="` and `"!="` should not be used when `"equals"` is overridden.
- `".equals()"` should not be used to test the values of `"Atomic"` classes.

Application :

- **Signature** : toujours `public boolean equals(Object other)` avec `@Override` (une surcharge `equals(Order other)` n'est pas un `equals`). Le paramètre n'est **jamais** annoté `@NonNull` / `@Nonnull` (le contrat exige de gérer `null`), y compris avec Lombok.
- **Type** : tester le type de l'argument avec `instanceof` (qui gère aussi `null`).
- **Symétrie et sous-classes** : classes du domaine **`final`** (ou `getClass() == other.getClass()` si l'héritage est nécessaire) ; jamais d'`equals` qui accepte une sous-classe d'un côté et pas de l'autre.
- **Par paire** : `equals` et `hashCode` sont toujours écrits ensemble, sur **les mêmes champs**.
- **`Comparable`** : une classe qui implémente `compareTo` redéfinit aussi `equals` et `hashCode`, et `compareTo(x) == 0` doit équivaloir à `equals(x)`.
- **`==` / `!=`** : réservés aux primitives, aux `enum` et aux comparaisons à `null`. Pour tout objet qui redéfinit `equals` (dont les `record`, `String`, `Long`, `OrderId`…), utiliser `.equals()` ou `Objects.equals(a, b)`. Seule exception admise : `this == other` en tête de `equals`.
- **Classes `Atomic*`** : elles ne redéfinissent pas `equals`. Comparer leurs valeurs : `counter.get()`, ou en test `assertThat(counter).hasValue(3)` (AssertJ).

### Dans `domain/model` : `equals` et `hashCode` obligatoires

Ne jamais oublier `equals` / `hashCode` sur les classes du modèle de domaine :

- **Entités et racines d'agrégat** : égalité par **identité** (l'identifiant). L'identité est **générée par le domaine à la création** (ex. UUID), donc jamais `null`.
- **Value objects** : `record` (égalité par valeur générée par le compilateur).

```java
public final class Order {

    private final OrderId id;
    // autres champs…

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        return other instanceof Order order && id.equals(order.id);
    }

    @Override
    public int hashCode() {
        return id.hashCode();
    }
}
```

Test à écrire avec chaque entité : deux instances de même identifiant sont égales et ont le même `hashCode` ; deux identifiants différents ne le sont pas ; comparaison avec `null` et avec un autre type → `false`. (`EqualsVerifier` est une bonne option si le projet l'accepte.)

### Entités JPA (`infrastructure`)

Pas de `@Data` ni de `@EqualsAndHashCode` généré sur une entité JPA. Si une égalité est nécessaire, l'écrire à la main sur l'identifiant, avec un `hashCode` constant (par exemple `getClass().hashCode()`) pour rester stable avant et après la persistance. Voir `SKILL.md` §3 pour le périmètre de Lombok.

## 3. Tests

- **`Thread.sleep` interdit dans les tests.** Attendre une condition avec **Awaitility** (`await().atMost(Duration.ofSeconds(5)).untilAsserted(…)`), contrôler le temps avec un `Clock` injecté (horloge modifiable en test), ou synchroniser avec `CountDownLatch` / `CompletableFuture`. Pour tester un TTL Redis, utiliser un TTL très court avec Awaitility.
- **Lambda d'assertion d'exception (S5778)** : une seule invocation susceptible de lever une exception dans `assertThrows` / `assertThatThrownBy`. La préparation sort dans des variables locales (voir `clean-code.md`, section 7).
- **`Atomic*`** : assertions sur la valeur (`hasValue`, `get()`), jamais `equals`.
- Constantes pour les littéraux répétés (S1192), `Month.X` pour les dates, méthodes utilitaires de test `private static` quand elles n'utilisent pas d'état.

```java
// ❌
Thread.sleep(2_000);
assertThat(cache.get(KEY)).isNull();

// ✅
await().atMost(Duration.ofSeconds(5))
        .untilAsserted(() -> assertThat(cache.get(KEY)).isNull());
```

## 4. Streams, collections et pattern matching

**Privilégier les Streams** pour transformer, filtrer, regrouper et agréger des collections, tant que le résultat reste lisible : pas de chaîne de plus de 4 à 5 opérations (extraire des méthodes ou des variables intermédiaires), pas d'effet de bord dans les lambdas (`peek`, modification d'une variable externe), pas de checked exception cachée dans une lambda. Une boucle `for` reste acceptable quand elle est nettement plus claire.

- **`collect` / `toList()` plutôt que `list::add`** : ne jamais remplir une liste avec `forEach(list::add)`.
  - `Stream.toList()` donne une liste non modifiable (Java 16+) ;
  - `Collectors.toCollection(ArrayList::new)` si la liste doit être modifiable ;
  - `Collectors.groupingBy`, `toMap`, `joining`, `partitioningBy` pour le reste.

```java
// ❌
List<String> names = new ArrayList<>();
customers.stream().map(Customer::name).forEach(names::add);

// ✅
List<String> names = customers.stream()
        .map(Customer::name)
        .toList();
```

- **Pattern de record** (Java 21+) plutôt que l'accès explicite aux champs : déconstruire le `record` directement dans le `instanceof` ou le `switch`.

```java
// ❌ accès explicite aux champs
if (event instanceof OrderConfirmed confirmed) {
    notify(confirmed.orderId(), confirmed.occurredAt());
}

// ✅
if (event instanceof OrderConfirmed(OrderId orderId, Instant occurredAt)) {
    notify(orderId, occurredAt);
}

// event est un type sealed (OrderConfirmed, OrderCancelled) : le switch est exhaustif
String message = switch (event) {
    case OrderConfirmed(OrderId orderId, Instant occurredAt) -> CONFIRMED_TEMPLATE.formatted(orderId.value(), occurredAt);
    case OrderCancelled(OrderId orderId, String reason) -> CANCELLED_TEMPLATE.formatted(orderId.value(), reason);
};
```

Appliquer seulement si le projet cible Java 21 ou plus ; sinon, s'aligner sur la version du projet. Avec Java 21, tous les composants du `record` doivent être liés : s'ils ne sont pas tous utiles, garder l'accesseur (`event.orderId()`) plutôt que de créer une variable inutilisée.

## 5. Code inutilisé

À supprimer systématiquement (pas de commentaire, pas de « au cas où ») :

- **Imports inutilisés** (et pas d'import avec joker).
- **Champs `private` inutilisés**.
- **Méthodes `private` inutilisées**.
- **Variables locales inutilisées**.
- **Paramètres de méthode inutilisés** : les retirer (et adapter les appels). Un paramètre imposé par une interface ou un `@Override` reste, car la signature est un contrat.

## 6. Conception des classes et des membres

- **Classes `final` sans membre `protected`** : dans une classe `final`, `protected` n'a pas de sens, utiliser `private` ou package-private. (Les entités JPA ne sont pas `final` : Hibernate a besoin de proxys, et leur constructeur sans argument `protected` est normal.)
- **Méthodes `private` ou `final` qui n'accèdent à aucune donnée d'instance → `static`.** Typiquement les petites méthodes de conversion, de formatage ou de calcul pur, et les méthodes utilitaires de test.
- **Méthode `private` appelée seulement par une classe interne → la déplacer dans cette classe interne.**
- **Champ `public static` → constante** (`public static final`, immuable : `List.of`, `Map.of`, jamais une collection modifiable exposée). Sinon le rendre `private` avec un accesseur.
- **Pas de `toString()` sur une `String`** : retirer l'appel (et ne pas écrire `String.valueOf(uneString)`).

## 7. Dates et temps

- **Classes de `java.time` uniquement** (`LocalDate`, `Instant`, `Duration`, `OffsetDateTime`) : jamais `Date`, `Calendar`, `SimpleDateFormat`.
- Mois en `Month.X`, jamais en nombre ; fuseau lu dans le YAML (`app.timezone`), `Clock` injecté (voir `infra.md`, section 3).

## 8. Concurrence

Dans une application Spring Boot, éviter les primitives bas niveau (`wait`, `notify`, `synchronized` à plusieurs verrous) : préférer `ExecutorService`, `CompletableFuture`, `BlockingQueue`, `Lock` + `Condition`, et ShedLock pour les tâches planifiées. Si `wait` est inévitable :

- **Ne jamais appeler `wait` en détenant plusieurs verrous** (risque d'interblocage : `wait` ne relâche que le verrou de l'objet attendu).
- **Utiliser `wait(...)` plutôt que `Thread.sleep(...)` quand un verrou est détenu** : `sleep` garde le verrou pendant l'attente et bloque les autres threads, `wait` le relâche.
- Toujours appeler `wait` dans une boucle qui retest la condition.
