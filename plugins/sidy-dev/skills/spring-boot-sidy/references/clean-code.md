# Clean code — référence détaillée

À lire **avant d'écrire, de relire ou de refactorer du code Java**. Ces principes (Robert C. Martin, *Clean Code*) s'appliquent à tout le code du projet, y compris les tests. En cas de doute, la lisibilité par un autre développeur prime.

## Sommaire

1. Noms
2. Fonctions
3. Commentaires
4. Formatage
5. Objets et structures de données
6. Gestion des erreurs
7. Tests (3 lois du TDD, F.I.R.S.T.)
8. Classes (et façades)
9. Principes SOLID
10. Code smells et heuristiques
11. Les 4 règles de la conception simple
12. Rappels obligatoires

## 1. Noms

- Des noms qui **révèlent l'intention** : `elapsedTimeInDays` plutôt que `d`, `activeCustomers` plutôt que `list1`.
- **Pas de désinformation** (pas de `accountList` si ce n'est pas une `List`) ni d'abréviations obscures.
- Noms **prononçables et faciles à rechercher** : pas de `genymdhms`, pas de variables ou constantes d'une lettre (hors indice de boucle très court).
- **Classes = noms** (`Customer`, `OrderValidator`), **méthodes = verbes** (`saveOrder`, `confirm`), booléens en forme de question (`isExpired`, `hasStock`).
- **Un mot par concept** : choisir un seul verbe pour une même idée dans tout le projet, jamais `fetch`, `get` et `retrieve` pour la même chose. Convention par défaut : `find…` peut ne rien trouver (`Optional` ou collection vide), `get…` doit exister (sinon exception métier).

## 2. Fonctions

- **Petites, puis encore plus petites** : ≈ 20 lignes au maximum, souvent moins de 10, un seul niveau d'indentation autant que possible.
- **Une seule chose à faire, et la faire bien.**
- **Un seul niveau d'abstraction** par fonction : ne pas mélanger orchestration de haut niveau et détails (formatage, accès bas niveau).
- **Peu d'arguments** : 0 à 2 idéalement, **4 maximum**. Au-delà : objet de paramètres (`record`) ou Builder. Un constructeur privé derrière un Builder est exempté.
- **Pas d'argument booléen** (*flag argument*) : deux méthodes explicites.
- **Pas d'effets de bord cachés** : une méthode ne fait que ce que son nom annonce (`checkPassword` n'initialise pas de session).
- **Séparer commande et requête** : une fonction fait quelque chose (`void`) **ou** retourne quelque chose, pas les deux. Exceptions pragmatiques tolérées : le `save` d'un port qui retourne l'agrégat persisté, et un use case de création qui retourne l'identifiant ou le résultat créé.
- **Exceptions plutôt que codes d'erreur** (jamais de `-1`, `null` ou `false` pour signaler une erreur).
- **Règle de la descente (Stepdown Rule)** : le code se lit de haut en bas comme un récit ; chaque méthode est suivie de celles du niveau d'abstraction inférieur qu'elle appelle, dans l'ordre d'appel.

```java
// ❌ argument booléen
void sendNotification(User user, boolean urgent)

// ✅
void sendUrgentNotification(User user)
void sendStandardNotification(User user)
```

```java
// Stepdown : le public se lit comme un récit, les détails suivent dans l'ordre d'appel
public void confirmOrder(OrderId id) {
    Order order = loadOrder(id);
    ensureOrderCanBeConfirmed(order);
    order.confirm();
    orderRepository.save(order);
    publishOrderConfirmed(order);
}

private Order loadOrder(OrderId id) { … }
private void ensureOrderCanBeConfirmed(Order order) { … }
private void publishOrderConfirmed(Order order) { … }
```

## 3. Commentaires

Un commentaire sert **uniquement** de **documentation** ou d'**explication**, dans la langue choisie pour le projet.

- **Documentation** : Javadoc sur les API publiques non évidentes (ports, use cases, façades, endpoints) : rôle, paramètres, exceptions levées, effets importants.
- **Explication** : le *pourquoi* d'un choix non évident (règle métier, contournement, contrainte d'un système externe, décision consignée dans un ADR), jamais le *quoi*.
- **À proscrire** : commentaire qui répète le code, code commenté (Git garde l'historique), signature ou journal de modifications, `TODO` sans explication, bannières décoratives.
- Si un commentaire est nécessaire pour comprendre ce que fait un bloc, extraire une méthode au nom explicite.

```java
/**
 * Confirms a pending order.
 *
 * @throws OrderNotFoundException if no order exists for the given identifier
 * @throws InvalidOrderStateException if the order is no longer pending
 */
void confirmOrder(OrderId id);

// Le fournisseur SMS rejette les numéros sans indicatif pays : on les normalise avant l'envoi.
String normalizedNumber = phoneNumberNormalizer.normalize(rawNumber);
```

## 4. Formatage

- **Cohérent dans toute l'équipe** : un `.editorconfig` à la racine (indentation, fin de ligne, encodage) et le même style partout. Pas de vérification imposée dans le build ni dans la CI.
- **Lignes courtes** (≈ 120 caractères maximum).
- **Séparation verticale entre les concepts** (ligne vide), **fonctions liées proches** les unes des autres, variables déclarées près de leur usage.
- Ordre dans une classe : constantes, champs, constructeurs, méthodes publiques, puis privées (stepdown).
- Pas d'import avec joker (`*`).

## 5. Objets et structures de données

- **Loi de Déméter** : ne parler qu'à ses proches voisins. `a.getB().getC().doSomething()` est à éviter : demander à `a` de faire le travail (*Tell, don't ask*).
- **Les objets cachent leurs données et exposent des comportements** (`account.withdraw(amount)`) ; **les structures de données exposent leurs données** sans logique (DTO, commandes, en `record`).
- Pas d'hybride (moitié objet, moitié structure) : une entité de domaine pleine de getters/setters publics et sans comportement est à éviter.

```java
// ❌
customer.getAddress().getCity().getPostalCode();

// ✅
customer.postalCode();
```

## 6. Gestion des erreurs

- **Ne pas retourner `null`, ne pas passer `null`** : `Optional` en retour, collection vide plutôt que `null`, `Objects.requireNonNull` en entrée des constructeurs.
- **Exceptions avec contexte** : quoi, quel identifiant, pourquoi. Exceptions **non vérifiées** (`RuntimeException`), dans une hiérarchie métier (`DomainException` et ses catégories `NotFoundException`, `ConflictException`, `BusinessRuleException`, `ForbiddenException`, dans `shared/domain/exception`), traduites en `ProblemDetail` par **l'unique** handler global (`references/api-docs.md`, section 6).
- **Isoler le code de gestion des erreurs** : `@RestControllerAdvice` centralisé, pas de `try/catch` dans les controllers ; un `try/catch` vit dans une méthode dédiée qui ne fait que cela.
- Ne jamais avaler une exception (pas de `catch` vide).

```java
public class OrderNotFoundException extends NotFoundException {

    private static final String CODE = "ORDER_NOT_FOUND";
    private static final String MESSAGE_TEMPLATE = "Order %s not found";

    public OrderNotFoundException(OrderId id) {
        super(CODE, MESSAGE_TEMPLATE.formatted(id.value()));
    }
}
```

## 7. Tests

**Tests obligatoires pour tout nouveau code.**

**Les 3 lois du TDD**
1. Pas de code de production sans un test qui échoue d'abord.
2. Écrire juste assez de test pour échouer (un échec de compilation compte comme un échec).
3. Écrire juste assez de code de production pour passer le test.

**Les tests suivent les règles F.I.R.S.T.**
- **Fast** : rapides (les tests unitaires tournent sans Spring, en millisecondes).
- **Independent** : aucun test ne dépend d'un autre ni de l'ordre d'exécution, pas d'état partagé.
- **Repeatable** : même résultat partout (temps via `Clock`, pas de dépendance à l'environnement ; Testcontainers pour PostgreSQL et Redis).
- **Self-validating** : réussite ou échec par assertion, jamais en lisant des logs.
- **Timely** : écrits au bon moment, **avant** le code de production.

Autres règles :
- **Un concept par test** (idéalement un seul `assert`) ; plusieurs assertions AssertJ sont acceptées si elles vérifient un même concept.
- **Le code de test est aussi important que le code de production** : mêmes règles de noms, constantes, builders, `Month.X`, pas de duplication.
- **Une seule invocation susceptible de lever une exception dans une lambda d'assertion** (`assertThrows`, `assertThatThrownBy`, `assertThatExceptionOfType`…), règle Sonar S5778 (« Refactor the code of the lambda to have only one invocation possibly throwing a runtime exception »). Sinon on ne sait pas quel appel a levé l'exception, et le test peut passer pour une mauvaise raison (par exemple un `NullPointerException` levé par la préparation des données). Tout ce qui sert à préparer la valeur (construction d'objets, appels de méthodes, `builder().build()`, récupération depuis une liste ou une `Map`) sort de la lambda, dans la partie *given*, vers des variables locales ; la lambda ne contient que l'appel testé.

```java
// ❌ plusieurs appels pouvant lever une exception dans la lambda
assertThrows(InvalidOrderException.class,
        () -> orderService.execute(CreateOrderCommand.builder().customerId(CUSTOMER_ID).lines(List.of()).build()));

// ✅ préparation hors de la lambda, un seul appel dans la lambda
CreateOrderCommand command = CreateOrderCommand.builder()
        .customerId(CUSTOMER_ID)
        .lines(List.of())
        .build();

assertThrows(InvalidOrderException.class, () -> orderService.execute(command));
```

```java
// ✅ avec AssertJ : même principe, et on vérifie aussi le message ou la cause
OrderId unknownId = OrderId.of(UNKNOWN_ORDER_ID);

assertThatThrownBy(() -> orderService.confirm(unknownId))
        .isInstanceOf(OrderNotFoundException.class)
        .hasMessageContaining(UNKNOWN_ORDER_ID);
```

Un appel enchaîné sur le résultat d'un autre (`service.find(id).orElseThrow()`) fait deux invocations : stocker le premier résultat dans une variable avant la lambda. En cas de doute sur ce que Sonar compte, extraire.

## 8. Classes (et façades)

- **Petites**, avec une seule responsabilité (SRP) : on mesure la taille en responsabilités, pas seulement en lignes. Signaux d'alerte : un nom en `…Manager`, `…Helper`, `…And…`, une classe qui change pour plusieurs raisons.
- **Trop de dépendances injectées → créer une façade.** Dès qu'une classe, **surtout un controller**, dépend de plus de 4 collaborateurs, regrouper les use cases qu'elle appelle dans une **façade** de la couche application (`application/facade/`, ex. `OrderFacade`) et injecter la façade à la place.
  - Une façade par controller ou par sous-domaine cohérent, jamais une façade « fourre-tout ».
  - Elle ne fait que **déléguer et orchestrer** : aucune logique métier, aucun DTO web, les transactions restent sur les use cases.
  - Elle n'expose que les méthodes dont le controller a besoin (ségrégation des interfaces).
  - Si la façade dépasse elle-même le seuil, la découper par sous-domaine : une façade ne doit pas devenir une *god class*.

```java
// ❌ controller à 6 dépendances
public OrderControllerImpl(CreateOrderUseCase createOrder, ConfirmOrderUseCase confirmOrder,
                       CancelOrderUseCase cancelOrder, FindOrderUseCase findOrder,
                       ListOrdersUseCase listOrders, OrderMapper mapper) { … }

// ✅ une façade applicative, le controller n'a plus que 2 dépendances
@Service
@RequiredArgsConstructor
public class OrderFacade {

    private final CreateOrderUseCase createOrder;
    private final ConfirmOrderUseCase confirmOrder;
    private final CancelOrderUseCase cancelOrder;
    private final FindOrderUseCase findOrder;
    private final ListOrdersUseCase listOrders;

    public OrderId create(CreateOrderCommand command) {
        return createOrder.execute(command);
    }

    public void confirm(OrderId id) {
        confirmOrder.execute(id);
    }

    // cancel, find, list : une délégation par méthode, rien de plus
}

public OrderControllerImpl(OrderFacade orderFacade, OrderMapper mapper) { … }
```

- **Forte cohésion** (les méthodes utilisent les champs de la classe), **faible couplage**.
- **Organisées pour que le changement soit isolé** : ajouter un comportement = ajouter une classe (nouvelle stratégie, nouvel adapter), pas modifier un `switch` existant.

## 9. Principes SOLID

- **S** — Single Responsibility : une seule raison de changer (un use case par intention).
- **O** — Open/Closed : ouvert à l'extension, fermé à la modification (Strategy, Specification, nouveaux adapters).
- **L** — Liskov Substitution : un sous-type doit pouvoir remplacer son type de base sans surprise (même contrat, mêmes exceptions, jamais `UnsupportedOperationException`).
- **I** — Interface Segregation : plusieurs interfaces spécifiques plutôt qu'une interface générale (`OrderReader` / `OrderWriter`).
- **D** — Dependency Inversion : dépendre d'abstractions (ports), jamais d'implémentations (Spring Data, Redis, client HTTP).

## 10. Code smells et heuristiques

- **DRY** : ne pas se répéter.
- **Boy Scout Rule** : laisser le code plus propre qu'on ne l'a trouvé.
- **KISS** : rester simple.
- **Supprimer le code mort** : méthodes, champs, imports et code commenté inutilisés.
- **Pas de nombres magiques** : constantes nommées (ou `enum`).
- **Encapsuler les conditions** : `if (shouldBeDeleted(timer))` plutôt qu'une expression complexe.
- **Éviter les conditions négatives** : `if (isActive())` plutôt que `if (!isInactive())`.
- **Commentaires** : uniquement documentation ou explication (voir section 3).

```java
// ❌
if (timer.hasExpired() && !timer.isRecurrent()) { … }

// ✅
if (shouldBeDeleted(timer)) { … }

private boolean shouldBeDeleted(Timer timer) {
    return timer.hasExpired() && timer.isOneShot();
}
```

## 11. Les 4 règles de la conception simple (Kent Beck, reprises par Martin)

Dans cet ordre de priorité, le code doit :
1. **Passer tous les tests.**
2. **Ne contenir aucune duplication.**
3. **Exprimer l'intention du développeur.**
4. **Minimiser le nombre de classes et de méthodes.**

## 12. Rappels obligatoires (voir aussi `SKILL.md`, §4)

- **Tests obligatoires pour tout nouveau code.**
- **Pas de ternaires imbriqués** : extraire en instructions ou méthodes séparées (ou `switch` expression).
- **Constantes pour les littéraux dupliqués** (règle Sonar S1192), y compris dans les tests.
- **Mois Java : toujours `Month.X`**, jamais un nombre.
