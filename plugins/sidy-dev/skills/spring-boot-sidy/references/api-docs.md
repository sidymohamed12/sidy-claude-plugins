# API REST et documentation Swagger — référence détaillée

À lire pour tout ajout ou modification de controller, de DTO web ou de documentation d'API. **Chaque controller a une interface et une implémentation.** L'interface porte toute la documentation Swagger (springdoc / OpenAPI 3) ; l'implémentation ne contient que le code. La documentation est **complète** : requêtes, réponses (succès et erreurs), DTO, paramètres, exemples. Rien n'est laissé de côté.

## Sommaire

1. Arborescence du module web
2. L'interface `XxxController`
3. L'implémentation `XxxControllerImpl`
4. DTO documentés
5. Records de documentation (`web/doc`)
6. Gestion des erreurs (handler unique) et documentation des erreurs
7. Checklist par endpoint
8. Tests

## 1. Arborescence du module web

Le web est un adaptateur d'entrée, donc il vit dans `<feature>/infrastructure/web/` (même structure dans chaque feature, comme dans CETUD Mobilités) :

```
<feature>/infrastructure/web/
├── controller/             ← interfaces XxxController (mappings + annotations Swagger)
│   └── implement/          ← implémentations XxxControllerImpl (@RestController)
├── dto/
│   ├── request/            ← requêtes (records) + @Schema
│   └── response/           ← réponses (records) + @Schema
├── mapper/                 ← DTO ⇄ commandes / modèles de domaine (si nécessaire)
└── doc/                    ← records de documentation uniquement (formes de réponse pour Swagger)
```

Le controller appelle les ports `in` (`domain/port/in`) ou, au-delà de 4 dépendances, la **façade** de la couche application (voir `clean-code.md`, section 8), et son mapper. Les éléments web communs à toutes les features (enveloppes de réponse, filtres, intercepteurs) vivent dans `shared/infrastructure/web`.

## 2. L'interface `XxxController`

Elle porte : `@Tag`, `@RequestMapping`, les annotations de mapping HTTP, `@Operation`, `@ApiResponses`, `@Parameter`, `@SecurityRequirement`, et les annotations des paramètres (`@RequestBody`, `@PathVariable`, `@RequestParam`, `@Valid`).

```java
@Tag(name = "Commandes", description = "Création, consultation et confirmation des commandes")
@SecurityRequirement(name = "bearerAuth")
@RequestMapping(OrderController.BASE_PATH)
public interface OrderController {

    String BASE_PATH = "/api/v1/orders";

    String CREATE_ORDER_EXAMPLE = """
            {
              "customerId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
              "deliveryDate": "2026-11-05",
              "lines": [ { "productId": "b1a7c0de-1f2e-4a5b-9c3d-0123456789ab", "quantity": 2 } ]
            }
            """;

    @Operation(
            summary = "Créer une commande",
            description = "Crée une commande à l'état PENDING pour le client indiqué. "
                    + "La date de livraison doit être postérieure à aujourd'hui.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Commande créée",
                    headers = @Header(name = HttpHeaders.LOCATION, description = "URL de la commande créée"),
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = OrderResponse.class))),
            @ApiResponse(responseCode = "400", description = "Requête invalide (champ manquant ou mal formé)",
                    content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemDetailDoc.class))),
            @ApiResponse(responseCode = "401", description = "Non authentifié",
                    content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemDetailDoc.class))),
            @ApiResponse(responseCode = "403", description = "Accès refusé",
                    content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemDetailDoc.class))),
            @ApiResponse(responseCode = "422", description = "Règle métier violée (ex. produit indisponible)",
                    content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemDetailDoc.class))),
            @ApiResponse(responseCode = "429", description = "Trop de requêtes",
                    content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemDetailDoc.class)))
    })
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<OrderResponse> create(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Données de la commande à créer",
                    required = true,
                    content = @Content(
                            schema = @Schema(implementation = CreateOrderRequest.class),
                            examples = @ExampleObject(name = "Commande simple", value = CREATE_ORDER_EXAMPLE)))
            @Valid @RequestBody CreateOrderRequest request);

    @Operation(summary = "Lister les commandes", description = "Retourne une page de commandes, triées par date décroissante.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Page de commandes",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = OrderPageDoc.class))),
            @ApiResponse(responseCode = "401", description = "Non authentifié",
                    content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemDetailDoc.class)))
            // dans le vrai code, 403 et 429 sont documentés de la même façon : aucune réponse possible n'est omise
    })
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<PageResponse<OrderResponse>> list(
            @Parameter(description = "Numéro de page, à partir de 0", example = "0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Taille de page (1 à 100)", example = "20") @RequestParam(defaultValue = "20") int size);
}
```

Règles :

- **Les annotations Spring MVC (mapping, `@RequestBody`, `@PathVariable`, `@RequestParam`, `@Valid`) sont sur l'interface**, pas dupliquées dans l'implémentation. Un test `@WebMvcTest` confirme que le mapping et la validation fonctionnent ainsi.
- Les exemples JSON et textes répétés sont des **constantes** (Sonar S1192) ; les textes de réponses d'erreur communes (400, 401, 403, 429…) peuvent venir de constantes ou d'annotations composées pour ne pas se répéter.
- Le chemin de base est défini une fois (`BASE_PATH`) et réutilisé par les tests et par `docs/http/`.
- Avec le Swagger désactivé en prod (voir `securite.md`, section 7), ces annotations n'ont aucun effet à l'exécution en production.

## 3. L'implémentation `XxxControllerImpl`

```java
@RestController
@RequiredArgsConstructor
public class OrderControllerImpl implements OrderController {

    private final OrderFacade orderFacade;
    private final OrderWebMapper orderWebMapper;

    @Override
    public ResponseEntity<OrderResponse> create(CreateOrderRequest request) {
        OrderId orderId = orderFacade.create(orderWebMapper.toCommand(request));
        URI location = URI.create(BASE_PATH + "/" + orderId.value());
        return ResponseEntity.created(location).body(orderWebMapper.toResponse(orderFacade.find(orderId)));
    }

    // list, confirm… : valider (déjà fait par @Valid), déléguer à la façade, mapper, répondre
}
```

Aucune logique métier, aucune annotation Swagger dans l'implémentation.

## 4. DTO documentés

Chaque DTO de requête et de réponse est un `record` dont **chaque champ** est documenté avec `@Schema` (description, exemple, caractère obligatoire, contraintes) :

```java
@Schema(description = "Données nécessaires à la création d'une commande")
public record CreateOrderRequest(

        @Schema(description = "Identifiant du client", example = "7c9e6679-7425-40de-944b-e07fc1f90ae7",
                requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull UUID customerId,

        @Schema(description = "Date de livraison souhaitée (ISO-8601)", example = "2026-11-05",
                requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull @Future LocalDate deliveryDate,

        @Schema(description = "Lignes de la commande (au moins une)", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotEmpty List<@Valid OrderLineRequest> lines) {
}
```

- Les contraintes Jakarta Validation (`@NotNull`, `@Size`, `@Pattern`…) sont reprises par springdoc dans le schéma.
- Les `enum` exposés sont documentés (valeurs et signification).
- Les champs sensibles (mots de passe, PIN, jetons) ne figurent **jamais** dans un DTO de réponse ; en requête, ils sont marqués `format = "password"`.

## 5. Records de documentation (`web/doc`)

Dans `infrastructure/web/doc/`, des `record` qui servent **uniquement** à décrire dans Swagger la forme exacte d'une réponse que springdoc ne sait pas déduire (types génériques, enveloppes, erreurs). Ils ne sont jamais instanciés ni renvoyés à l'exécution : ils sont référencés dans `@Schema(implementation = …)` depuis l'interface `XxxController`.

```java
/** Documentation uniquement : forme d'une page de commandes. */
@Schema(name = "OrderPage", description = "Page de commandes")
public record OrderPageDoc(
        @Schema(description = "Commandes de la page") List<OrderResponse> content,
        @Schema(description = "Numéro de page, à partir de 0", example = "0") int page,
        @Schema(description = "Taille de page", example = "20") int size,
        @Schema(description = "Nombre total d'éléments", example = "134") long totalElements,
        @Schema(description = "Nombre total de pages", example = "7") int totalPages) {
}
```

À créer au minimum : une page par type paginé, l'enveloppe de réponse si l'API en utilise une (`ApiResponse<T>` générique → un record par `T` documenté), et `ProblemDetailDoc` pour les erreurs.

## 6. Gestion des erreurs (un seul handler) et documentation des erreurs

### Un seul handler global

**Toutes les exceptions sont traduites en réponse HTTP à un seul endroit** : un `@RestControllerAdvice` unique, `GlobalExceptionHandler`, dans `shared/infrastructure/exception`. Pas de handler par feature, pas de `@ExceptionHandler` local dans un controller, pas de `try/catch` dans un controller ou un use case pour fabriquer une réponse HTTP.

Les exceptions métier forment une **hiérarchie par catégorie**, définie dans `shared/domain/exception` (JDK uniquement, aucun type HTTP). Chaque feature ajoute seulement des sous-classes dans son `domain/exception` ; le handler n'a donc pas à changer quand on ajoute une exception.

```java
// shared/domain/exception
public abstract class DomainException extends RuntimeException {

    private final String code;

    protected DomainException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}

public abstract class NotFoundException extends DomainException { /* 404 */ }
public abstract class ConflictException extends DomainException { /* 409 */ }
public abstract class BusinessRuleException extends DomainException { /* 422 */ }
public abstract class ForbiddenException extends DomainException { /* 403 */ }

// course/domain/exception
public class CourseNotFoundException extends NotFoundException { … }
```

| Exception                                                                                   | Statut                                                        |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `NotFoundException`                                                                         | 404                                                           |
| `ConflictException`, `OptimisticLockingFailureException`, violation de contrainte d'unicité | 409                                                           |
| `BusinessRuleException`                                                                     | 422                                                           |
| `ForbiddenException`, `AccessDeniedException`                                               | 403                                                           |
| `MethodArgumentNotValidException`, `ConstraintViolationException`, corps illisible          | 400 (avec la liste des erreurs par champ)                     |
| Rate-limit dépassé                                                                          | 429 (+ `Retry-After`)                                         |
| `Exception` (inattendue)                                                                    | 500, message générique, jamais de stack trace dans la réponse |

```java
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final String PROPERTY_CODE = "code";
    private static final String PROPERTY_REQUEST_ID = "requestId";
    private static final String MDC_REQUEST_ID = "requestId";
    private static final String UNEXPECTED_ERROR_DETAIL = "Une erreur inattendue est survenue.";

    @ExceptionHandler(NotFoundException.class)
    public ProblemDetail handleNotFound(NotFoundException exception) {
        return problem(HttpStatus.NOT_FOUND, exception);
    }

    @ExceptionHandler(ConflictException.class)
    public ProblemDetail handleConflict(ConflictException exception) {
        return problem(HttpStatus.CONFLICT, exception);
    }

    // BusinessRuleException → 422, ForbiddenException → 403, OptimisticLockingFailureException → 409…

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception exception) {
        log.error("Unexpected error [requestId={}]", MDC.get(MDC_REQUEST_ID), exception);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, UNEXPECTED_ERROR_DETAIL);
        problem.setProperty(PROPERTY_REQUEST_ID, MDC.get(MDC_REQUEST_ID));
        return problem;
    }

    // handleMethodArgumentNotValid(…) surchargé pour ajouter la liste des erreurs par champ

    private ProblemDetail problem(HttpStatus status, DomainException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, exception.getMessage());
        problem.setProperty(PROPERTY_CODE, exception.code());
        problem.setProperty(PROPERTY_REQUEST_ID, MDC.get(MDC_REQUEST_ID));
        return problem;
    }
}
```

Règles :

- **Journalisation** : 4xx en `warn` (ou `info`) sans stack trace ; 5xx en `error` avec la stack trace et le `requestId`. Aucune donnée sensible dans le message ni dans les logs.
- **Hors du `@RestControllerAdvice`** : les erreurs levées par les filtres Spring Security (401, 403) et le rate-limiting (429) ne passent pas par lui. Leur `AuthenticationEntryPoint`, `AccessDeniedHandler` et `RateLimitFilter` produisent **le même `ProblemDetail`** (même fabrique partagée dans `shared/infrastructure/exception`), pour que `ProblemDetailDoc` décrive toutes les erreurs.
- **Tests** : un test `@WebMvcTest` du handler avec un controller de test qui lève chaque catégorie d'exception (statut, `code`, `requestId`, absence de stack trace) ; un test pour la liste des erreurs par champ ; un test de la réponse 500.

### Documenter les erreurs dans Swagger

`ProblemDetailDoc` reflète exactement le `ProblemDetail` (RFC 9457) renvoyé par le handler global, y compris les champs ajoutés par le projet :

```java
@Schema(name = "ProblemDetail", description = "Erreur au format RFC 9457")
public record ProblemDetailDoc(
        @Schema(description = "Type d'erreur", example = "about:blank") String type,
        @Schema(description = "Titre court", example = "Requête invalide") String title,
        @Schema(description = "Statut HTTP", example = "400") int status,
        @Schema(description = "Explication lisible", example = "Le champ deliveryDate doit être une date future") String detail,
        @Schema(description = "Chemin de la requête", example = "/api/v1/orders") String instance,
        @Schema(description = "Code d'erreur applicatif", example = "ORDER_INVALID_DELIVERY_DATE") String code,
        @Schema(description = "Identifiant de corrélation", example = "9f1c2d3e") String requestId,
        @Schema(description = "Erreurs par champ") List<FieldErrorDoc> errors) {
}
```

Chaque endpoint documente les codes qu'il peut réellement renvoyer : 400 (validation), 401, 403, 404 (ressource par identifiant), 409 (conflit, verrou optimiste), 422 (règle métier), 429 (rate-limiting), en plus du succès.

## 7. Checklist par endpoint

- [ ] `@Operation` avec `summary` et `description`.
- [ ] Succès **et** erreurs possibles dans `@ApiResponses`, avec le schéma de chaque réponse.
- [ ] Corps de requête décrit (`@RequestBody` Swagger) avec un **exemple**.
- [ ] Paramètres de chemin, de requête et d'en-tête décrits (`@Parameter`) avec exemples.
- [ ] Chaque champ de chaque DTO documenté (`@Schema`).
- [ ] Types génériques et erreurs décrits par un record dans `web/doc`.
- [ ] Exigence de sécurité indiquée (`@SecurityRequirement`) ou route publique explicitement signalée.
- [ ] Requêtes ajoutées dans `docs/http/`.

## 8. Tests

- `@WebMvcTest` du controller : mapping, validation (`400`), sécurité (`401` / `403`), format d'erreur.
- **Test de complétude de la documentation** (profil `dev`, `GET /v3/api-docs`) : pour chaque opération, `summary` et `description` non vides, au moins une réponse 2xx et une réponse d'erreur documentées, schéma présent pour le corps de requête et de réponse. Ce test échoue dès qu'un endpoint est ajouté sans documentation.
- Un test d'architecture (ArchUnit) peut vérifier que chaque `@RestController` du package `controller.implement` implémente une interface du package `controller`.
