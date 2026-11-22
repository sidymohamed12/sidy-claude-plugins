# Sécurité — référence détaillée

À lire pour toute tâche touchant à l'authentification, aux filtres, au rate-limiting, à Swagger ou aux requêtes SQL. Les règles de ce fichier s'appliquent **à chaque projet**, sans attendre que l'utilisateur les rappelle.

## Sommaire

1. Spring Security — base
2. Protection CSRF
3. Injections SQL
4. Rate-limiting (Bucket4j + Redis)
5. JWT et révocation par cache Redis
6. Blocage de l'ouverture directe de `/api/**` dans un navigateur
7. Swagger / OpenAPI
8. Données sensibles et logs
9. CORS

## 1. Spring Security — base

- `SecurityFilterChain` explicite, session `STATELESS`, routes publiques listées une par une, `anyRequest().authenticated()`.
- **Mots de passe et codes PIN : toujours hashés** avec `BCryptPasswordEncoder` ou un équivalent (Argon2, scrypt, PBKDF2), avec sel intégré. Jamais en clair, jamais loggés, jamais renvoyés dans une réponse d'API, jamais de MD5 / SHA-1 / SHA-256 seuls. Le hashage passe par un port (`PasswordHasher`) défini dans `application` et implémenté dans `infrastructure`, pour garder le domaine sans dépendance Spring ; la vérification utilise `matches`, pas une comparaison de chaînes. `DelegatingPasswordEncoder` permet de migrer d'un algorithme à un autre sans casser les hashs existants.
- Un **code PIN** (peu de combinaisons) ne résiste pas à une attaque hors ligne si la base fuite : en plus du hash, rate-limiting strict (section 4) et verrouillage temporaire après plusieurs échecs.
- Autorisation par rôles/permissions (`@PreAuthorize`) **et** contrôle de propriété de la ressource (un utilisateur n'accède qu'à ses données).
- CORS explicite : origines du front lues dans la configuration, jamais `*` en prod (section 9).
- En-têtes de sécurité activés (`X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`, `Content-Security-Policy` adaptée).
- Actuator : `health` (probes liveness/readiness) accessible pour le healthcheck Docker, le reste protégé.
- Validation de toute entrée (Jakarta Validation), taille des uploads limitée, type MIME vérifié.
- Si le projet utilise `jwt-toolkit-package` de Sidy, s'en servir pour l'émission et la validation des JWT.

## 2. Protection CSRF

La protection CSRF est **toujours traitée explicitement**, jamais désactivée globalement par réflexe, et organisée en **défense en couches**. Principe de base : le CSRF n'existe que si le navigateur joint **automatiquement** une preuve d'identité (un cookie). On exige donc un jeton CSRF dès qu'une requête modifiante porte un cookie d'authentification, et on ajoute des couches indépendantes autour.

### Schéma par défaut (SPA Angular + API, clients web et mobile)

| Élément                                                                                     | Choix                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Refresh token (web)                                                                         | Cookie `HttpOnly; Secure; SameSite=Strict`, `Path` limité (`/api/v1/auth`). Illisible par JavaScript : une faille XSS ne peut pas le voler.                                    |
| Access token                                                                                | Court (5–15 min), renvoyé dans le corps de la réponse, gardé **en mémoire** côté front, envoyé en `Authorization: Bearer`. **Jamais** dans `localStorage` ni `sessionStorage`. |
| Requêtes en Bearer                                                                          | Non exploitables par CSRF (le navigateur n'ajoute pas l'en-tête tout seul) : pas de jeton CSRF exigé.                                                                          |
| Requêtes modifiantes portant le cookie d'authentification (`/auth/refresh`, `/auth/logout`) | Jeton CSRF **obligatoire** : cookie `XSRF-TOKEN` + en-tête `X-XSRF-TOKEN`.                                                                                                     |
| Toute requête modifiante (`POST`, `PUT`, `PATCH`, `DELETE`)                                 | Vérification `Origin` / `Sec-Fetch-Site` (couche supplémentaire, couvre aussi le _login CSRF_).                                                                                |
| Clients mobile                                                                              | Jetons dans le corps de la réponse, stockage sécurisé, **aucun cookie** : hors CSRF.                                                                                           |

Configuration Spring Security (Spring Security 6+ ; vérifier l'API exacte selon la version du projet) :

```java
private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "TRACE", "OPTIONS");
private static final String REFRESH_COOKIE_NAME = "refresh_token";

@Bean
SecurityFilterChain apiSecurity(HttpSecurity http) throws Exception {
    return http
            .csrf(csrf -> csrf
                    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                    .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler())
                    .requireCsrfProtectionMatcher(SecurityConfig::isMutatingRequestWithAuthCookie))
            // session STATELESS, autorisations, filtres (Origin, rate-limit, JWT)…
            .build();
}

private static boolean isMutatingRequestWithAuthCookie(HttpServletRequest request) {
    boolean mutating = !SAFE_METHODS.contains(request.getMethod());
    boolean carriesAuthCookie = WebUtils.getCookie(request, REFRESH_COOKIE_NAME) != null;
    return mutating && carriesAuthCookie;
}
```

Handler recommandé pour les SPA (Spring Security 6) : il accepte le jeton brut envoyé en en-tête par Angular et force la création du cookie dès la première réponse, sans filtre supplémentaire.

```java
final class SpaCsrfTokenRequestHandler implements CsrfTokenRequestHandler {

    private final CsrfTokenRequestHandler plain = new CsrfTokenRequestAttributeHandler();
    private final CsrfTokenRequestHandler xor = new XorCsrfTokenRequestAttributeHandler();

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, Supplier<CsrfToken> csrfToken) {
        this.xor.handle(request, response, csrfToken);
        csrfToken.get(); // charge le jeton différé : le cookie XSRF-TOKEN est posé
    }

    @Override
    public String resolveCsrfTokenValue(HttpServletRequest request, CsrfToken csrfToken) {
        String headerValue = request.getHeader(csrfToken.getHeaderName());
        CsrfTokenRequestHandler handler = StringUtils.hasText(headerValue) ? this.plain : this.xor;
        return handler.resolveCsrfTokenValue(request, csrfToken);
    }
}
```

Cookie du refresh token à l'émission (et `maxAge` à zéro pour le logout) :

```java
ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, refreshToken)
        .httpOnly(true)
        .secure(true)
        .sameSite("Strict")
        .path(AUTH_COOKIE_PATH)
        .maxAge(refreshTokenTtl)
        .build();
response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
```

### Couche `Origin` / `Sec-Fetch-Site`

Filtre `OriginCheckFilter` (`OncePerRequestFilter`, dans `shared/infrastructure/web/filter`) sur les requêtes modifiantes de `/api/**` :

- En-tête `Origin` présent → doit appartenir à `app.security.allowed-origins` (configuration), sinon `403`.
- Sinon, `Sec-Fetch-Site` présent → doit valoir `same-origin` (ou `same-site` si le front est sur un sous-domaine frère déclaré en configuration), sinon `403`.
- Aucun des deux en-têtes (mobile, appels serveur à serveur, Postman, curl) → laisser passer.

### Côté Angular

- `HttpClient` lit le cookie `XSRF-TOKEN` et renvoie `X-XSRF-TOKEN`, **uniquement pour les requêtes modifiantes vers des URLs relatives (même origine)**. Il ne le fait pas pour une URL absolue vers un autre domaine.
- Recommandation : front et API sous le **même domaine** (reverse proxy : `/` vers le front, `/api` vers le back). Sinon, intercepteur personnalisé, `withCredentials: true` pour l'appel de refresh, CORS avec `allowCredentials(true)` et origines explicites (jamais `*`).
- Au chargement de l'application, une requête `GET` (ex. état de session) pose le cookie `XSRF-TOKEN` avant le premier `POST /auth/refresh`.

### Techniques, de la plus faible à la plus solide

| Technique                                                 | Rôle                                                                                                                                                                                                                                                  |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SameSite` seul                                           | Une couche utile, jamais suffisante seule (attaques depuis un sous-domaine, navigations de premier niveau en `Lax`).                                                                                                                                  |
| Vérification `Origin` / `Sec-Fetch-Site`                  | Couche moderne recommandée par l'OWASP, simple à ajouter.                                                                                                                                                                                             |
| Double-submit cookie (Spring `CookieCsrfTokenRepository`) | Convient à une API stateless, mais le jeton n'est pas signé : compenser par `SameSite=Strict`, HTTPS, et en option un cookie préfixé `__Host-` (nom configurable côté Spring et via `withXsrfConfiguration` côté Angular).                            |
| Jeton synchronisé (stocké côté serveur)                   | Le plus solide, mais exige une session côté serveur.                                                                                                                                                                                                  |
| **BFF** (Backend-for-Frontend)                            | Les jetons n'atteignent jamais le navigateur, seulement un cookie de session `HttpOnly` + jeton CSRF sur toutes les requêtes modifiantes. Niveau maximum, plus lourd : à proposer pour les projets sensibles (santé, paiement, données personnelles). |

### Cas particuliers

- **Authentification entièrement par cookie** (access token aussi en cookie) ou **session serveur / formulaires** : jeton CSRF sur **toutes** les requêtes modifiantes, sans exception.
- **Désactivation du CSRF** (jamais globale) : seulement pour des requêtes qui ne portent aucun cookie d'authentification ; toujours consigner la décision dans un ADR (`docs/adr/`) avec le transport des jetons retenu.

### Tests (obligatoires)

- `POST /auth/refresh` avec le cookie mais sans jeton CSRF → `403` ; avec jeton CSRF valide → succès.
- Requête modifiante en `Bearer`, sans cookie ni jeton CSRF → non bloquée par la couche CSRF.
- Requête modifiante avec `Origin` non autorisée → `403` ; `Sec-Fetch-Site: cross-site` → `403` ; sans `Origin` ni `Sec-Fetch-Site` (mobile) → acceptée.
- Attributs du cookie de refresh : `HttpOnly`, `Secure`, `SameSite=Strict`, `Path` limité.
- Logout : cookie effacé (`Max-Age=0`) et jeton révoqué (voir section 5).

## 3. Injections SQL

- Requêtes dérivées Spring Data, JPQL ou Criteria/Specification par défaut. **Toujours paramétrées** (`:param`, `?1`), jamais de concaténation ni de `String.format` dans une requête.
- SQL natif seulement si nécessaire, avec paramètres nommés (`@Param`) ; `JdbcTemplate`/`NamedParameterJdbcTemplate` avec placeholders.
- **Tri et filtres dynamiques** : liste blanche des champs triables (un `Pageable` venant du client ne doit jamais atteindre une clause `ORDER BY` sans validation) ; les noms de colonnes ne se paramètrent pas, donc les mapper depuis une `enum`/`Map` interne.
- **Pas de liste noire pour se protéger des injections** : filtrer des mots-clés (`DROP`, `--`, `'`) ou des caractères est contournable (encodages, casse, commentaires) et bloque des saisies légitimes (« O'Brien »). La protection repose sur les requêtes paramétrées ; la validation d'entrée se fait en **liste blanche** (types, formats, longueurs, valeurs d'`enum`, champs triables). La liste noire des jetons de la section 5 est un autre sujet : elle sert à la révocation, pas aux injections.
- Recherche `LIKE` : échapper `%`, `_` et le caractère d'échappement dans la saisie.
- Utilisateur PostgreSQL de l'application en **moindres privilèges** (pas de superuser, pas de DDL en prod : Flyway utilise un compte dédié).
- Tests d'injection : charge utile du type `' OR '1'='1` et `'; DROP TABLE x;--` sur chaque filtre/recherche → aucun effet, aucun `500`.

## 4. Rate-limiting (Bucket4j + Redis)

Toujours en place, partagé entre instances via Redis.

- Dépendances : `bucket4j` (module Redis/Lettuce ou Redisson selon le projet).
- Filtre `RateLimitFilter` (`OncePerRequestFilter`, dans `shared/infrastructure/ratelimit`) placé avant l'authentification pour les routes publiques, après pour les routes protégées.
- **Clé** : identifiant utilisateur si authentifié, sinon IP du client. Lire l'IP derrière un proxy uniquement via `server.forward-headers-strategy=framework` et un proxy de confiance (jamais faire confiance aveuglément à `X-Forwarded-For`).
- **Limites par catégorie**, en configuration (`@ConfigurationProperties`, jamais en dur) : défaut (ex. 100 req/min), **authentification** et réinitialisation de mot de passe (beaucoup plus strictes, ex. 5–10 req/min), endpoints coûteux (export, upload, envoi SMS/email).
- Réponse `429 Too Many Requests` en `ProblemDetail`, avec `Retry-After` et `X-RateLimit-Remaining`.
- Si Redis est indisponible : décision à consigner en ADR (défaut : laisser passer en journalisant une alerte, sauf sur les routes d'authentification où l'on refuse).
- Tests : dépasser la limite → `429` ; après la fenêtre → `200` ; deux clés indépendantes.

## 5. JWT et révocation par cache Redis

Quand JWT est utilisé, un jeton émis doit pouvoir être **révoqué avant son expiration** (déconnexion, changement ou réinitialisation de mot de passe, désactivation du compte, changement de rôle).

- Access token **court** (5–15 min) ; refresh token à rotation, stocké **haché**, avec détection de réutilisation (réutilisation d'un ancien refresh token → révoquer toute la famille).
- Transport : web → access token en mémoire côté front et refresh token en cookie `HttpOnly` (voir section 2) ; mobile → jetons dans le corps de la réponse. Le logout efface le cookie (`Max-Age=0`) **et** révoque les jetons dans Redis.
- Chaque jeton porte un `jti` (identifiant unique) et un `iat`.
- **Liste noire (denylist) des jetons** : oui. Un jeton révoqué est inscrit dans Redis et refusé tant qu'il n'a pas expiré.
- **Révocation unitaire** : clé Redis `auth:revoked:{jti}` avec un TTL égal à la durée de vie restante du jeton (la clé disparaît seule, le cache ne grossit pas).
- **Révocation globale d'un utilisateur** (changement de mot de passe, compte désactivé) : clé `auth:valid-after:{userId}` contenant un horodatage ; tout jeton émis avant (`iat`) est refusé.
- Emplacements : filtre JWT et gestion des jetons dans `auth/infrastructure/security`, entrées Redis de révocation dans `auth/infrastructure/cache`, port de révocation dans `auth/domain/port/out`.
- Le filtre JWT vérifie, **après** la validation de signature et d'expiration : `jti` non révoqué, `iat` ≥ `valid-after`. Ces lectures Redis sont O(1).
- Changement/réinitialisation de mot de passe → révoquer **tous** les jetons et refresh tokens de l'utilisateur.
- Redis indisponible : refuser l'accès (fail-closed) par défaut ; documenter la décision en ADR.
- Secret/clé de signature en variable d'environnement, rotation prévue (`kid` dans l'en-tête).
- Tests : jeton valide → `200` ; après logout → `401` ; après changement de mot de passe → `401` ; jeton expiré → `401` ; entrée Redis expirée → ne bloque plus un jeton déjà expiré.

## 6. Blocage de l'ouverture directe de `/api/**` dans un navigateur

Objectif : empêcher qu'on consulte une API publique en collant l'URL dans la barre d'adresse (ou via une balise `<img>`, `<script>`, `<a>`). Les clients légitimes (Angular `HttpClient`, `fetch`, Swagger UI) envoient `Sec-Fetch-Mode: cors` ou `same-origin`, que ce filtre laisse passer.

- Filtre `BrowserNavigationBlockFilter` (`OncePerRequestFilter`, ordre très haut, dans `shared/infrastructure/web/filter`) sur `/api/**` uniquement.
- Si l'en-tête `Sec-Fetch-Mode` vaut `navigate` ou `no-cors` → réponse **`403`** (`ProblemDetail`, sans détail technique).
- **En-tête absent → laisser passer** : applications mobiles, rendu SSR (appels serveur à serveur), Postman, curl, tests.
- Activable par propriété YAML **`app.security.bloquer-navigation-directe`** (booléen, alimentée par `BLOQUER_NAVIGATION_DIRECTE`, défaut `true`), tests inclus ; le filtre est un bean conditionnel (`@ConditionalOnProperty(name = "app.security.bloquer-navigation-directe", havingValue = "true", matchIfMissing = true)`).

```yaml
app:
  security:
    bloquer-navigation-directe: ${BLOQUER_NAVIGATION_DIRECTE:true}
```

- Limites à documenter : `Sec-Fetch-Mode` ne peut pas être falsifié par du JavaScript dans un navigateur, mais n'importe quel outil hors navigateur peut l'omettre ou l'imiter. C'est un durcissement contre l'affichage direct et le copier-coller, **pas** un mécanisme d'authentification : l'authentification et l'autorisation restent obligatoires.
- Conséquence pour le front : un téléchargement de fichier par simple lien `<a href="/api/...">` serait bloqué (navigation). Passer par `HttpClient` en `blob` puis déclencher le téléchargement, ou exclure explicitement l'endpoint concerné.
- Tests : `Sec-Fetch-Mode: navigate` → `403` ; `no-cors` → `403` ; `cors` → `200` ; en-tête absent → `200`.

## 7. Swagger / OpenAPI

- **Dev** : Swagger UI affiché, accessible **à la racine** (`springdoc.swagger-ui.path=/`), `springdoc.api-docs.path=/v3/api-docs`.
- **Prod** (et staging public) : tout désactivé, aucune route exposée :

```yaml
# application-prod.yml
springdoc:
  api-docs:
    enabled: false
  swagger-ui:
    enabled: false
```

- Le contrôle ne repose jamais sur « on ne connaît pas l'URL » : en prod les endpoints n'existent pas (`403`/`404`).
- Schéma de sécurité Bearer déclaré dans OpenAPI pour tester les routes protégées en dev.
- Test : en profil `prod`, `GET /` et `GET /v3/api-docs` → `404` ; en `dev` → `200`.

## 8. Données sensibles et logs

- Jamais dans les logs ni dans les réponses d'erreur : mots de passe, jetons (JWT, refresh), clés d'API, numéros de carte, pièces d'identité, données de santé, corps de requêtes d'authentification.
- Exclure les champs sensibles de `toString()` (`@ToString.Exclude`), des DTO loggés et des exceptions.
- Masquer les identifiants personnels si on doit les tracer (email, téléphone : `a***@d***.com`).
- Logs applicatifs essentiels uniquement (voir `infra.md`, section logs).

## 9. CORS

CORS autorise le navigateur à lire une réponse d'une origine différente ; ce n'est **pas** un mécanisme d'authentification. Il est configuré à **un seul endroit** (`config/CorsConfig`) et branché dans la `SecurityFilterChain` (`.cors(Customizer.withDefaults())`), pour que le _preflight_ `OPTIONS` soit traité **avant** l'authentification, le CSRF et le rate-limiting.

```yaml
app:
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS} # liste séparée par des virgules ; en dev : http://localhost:4200
    allowed-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
    allowed-headers: Authorization,Content-Type,X-XSRF-TOKEN,X-Request-Id
    exposed-headers: Location,X-Request-Id,Retry-After
    allow-credentials: true # cookie de refresh token
    max-age-seconds: 3600
```

```java
@Configuration
public class CorsConfig {

    private static final String API_PATTERN = "/api/**";

    @Bean
    public CorsConfigurationSource corsConfigurationSource(CorsProperties properties) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(properties.allowedOrigins());
        configuration.setAllowedMethods(properties.allowedMethods());
        configuration.setAllowedHeaders(properties.allowedHeaders());
        configuration.setExposedHeaders(properties.exposedHeaders());
        configuration.setAllowCredentials(properties.allowCredentials());
        configuration.setMaxAge(properties.maxAgeSeconds());

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration(API_PATTERN, configuration);
        return source;
    }
}
```

`CorsProperties` est un `record` annoté `@ConfigurationProperties("app.cors")` et `@Validated`.

- **Jamais `*`** quand `allow-credentials` vaut `true` (le navigateur le refuse) et jamais en production : liste d'origines explicites (schéma + domaine + port), une propriété d'environnement par déploiement. Pas de reflet aveugle de l'en-tête `Origin`.
- Méthodes et en-têtes en liste blanche ; exposer uniquement les en-têtes dont le front a besoin.
- `application-prod.yml` : `allowed-origins: ${CORS_ALLOWED_ORIGINS}` sans valeur par défaut ; `CORS_ALLOWED_ORIGINS` est ajouté à `.env.example`. Un démarrage échoue si la liste est vide.
- Si le front et l'API sont sous le **même domaine** (recommandation de la section 2), CORS n'est pas nécessaire en production ; on le garde pour le développement (`http://localhost:4200`).
- Cohérence avec le reste : l'`OriginCheckFilter` (CSRF) et le `BrowserNavigationBlockFilter` utilisent la même liste d'origines ; le filtre CORS passe en premier dans la chaîne.
- Tests (`MockMvc`) : preflight depuis une origine autorisée → `200` avec les en-têtes `Access-Control-*` ; origine non listée → `403` ; aucune origine `*` en configuration prod (test sur les propriétés).
