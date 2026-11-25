---
name: "angular-sidy"
description: "Conventions Angular 21 de Sidy : setup projet (angular.json, ngx-env, paths, SSR optionnel + splash), architecture, signals, Tailwind v4 @theme, états de données, cookies, SEO, pages légales, Sonar, vérification et déploiement."
---

# Angular 21 — façon Sidy

Avant d'écrire du code dans un projet existant : lire une feature déjà faite et en reproduire exactement les patterns (nommage, découpage, services, icônes, couleurs). Les fichiers fournis par l'utilisateur (ex. `auth.service.ts`, modèles) sont canoniques : les utiliser tels quels.

Cible : **Angular 21** (zoneless, standalone, signals). Si le projet existant est sur une version antérieure, s'aligner sur sa version.

## Questions à poser au démarrage d'un nouveau projet

Si ce n'est pas déjà précisé :

1. SSR : oui ou non ? (site public / vitrine → souvent oui ; back-office → souvent non). Ne jamais décider à la place de l'utilisateur.
2. Bibliothèque d'icônes : Font Awesome ou Phosphor ?
3. Palette / typographie du projet (aucune valeur par défaut).
4. Type de projet pour le SEO (vitrine, e-commerce, app privée…).

## 0. Setup d'un nouveau projet (toujours)

### angular.json — schematics

Dans `projects.<nom>` :

```json
"schematics": {
  "@schematics/angular:component":   { "type": "component", "skipTests": true },
  "@schematics/angular:service":     { "type": "service",   "skipTests": true },
  "@schematics/angular:directive":   { "type": "directive", "skipTests": true },
  "@schematics/angular:interceptor": { "typeSeparator": ".", "skipTests": true },
  "@schematics/angular:pipe":        { "typeSeparator": ".", "skipTests": true },
  "@schematics/angular:guard":       { "typeSeparator": ".", "skipTests": true },
  "@schematics/angular:resolver":    { "typeSeparator": ".", "skipTests": true }
}
```

Résultat : `xxx.component.ts`, `xxx.service.ts`, `auth.guard.ts`, `auth.interceptor.ts`, sans `.spec.ts`.

### Environnements — @ngx-env/builder + src/environments

- `ng add @ngx-env/builder` : builders `@ngx-env/builder:application`, `:dev-server`, `:extract-i18n`.
- Variables dans `.env` (préfixe `NG_APP_`), `.env.example` versionné, `.env` dans `.gitignore`. Typage dans `src/env.d.ts`.
- `src/environments/` : `environment.ts` (dev), `environment.staging.ts`, `environment.prod.ts`, qui lisent `import.meta.env.NG_APP_*`. Le code importe uniquement `@env/environment`.
- `fileReplacements` par configuration (`production`, `staging`).
- Budgets de production ajustés au projet ; `optimization.fonts.inline: false` si les Google Fonts posent problème.

### tsconfig.json — paths

```json
"compilerOptions": {
  "baseUrl": "./src",
  "paths": {
    "@core/*":     ["app/core/*"],
    "@shared/*":   ["app/shared/*"],
    "@features/*": ["app/features/*"],
    "@layouts/*":  ["app/layouts/*"],
    "@env/*":      ["environments/*"]
  }
}
```

Toujours importer via ces alias, jamais de `../../../`.

### app.config.ts (base commune)

`provideZonelessChangeDetection()`, `provideHttpClient(withFetch(), withInterceptors([...]))`, `provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }), withViewTransitions())`.

### SSR (optionnel, selon le projet) & splash (toujours)

**Avec SSR** :

- `ng add @angular/ssr`, `outputMode: "server"`, `app.routes.server.ts` (pages statiques/légales en `Prerender`).
- Ajouter `provideClientHydration(withEventReplay(), withHttpTransferCacheOptions({ includePostRequests: false }))`.
- Tout accès navigateur protégé (`isPlatformBrowser`, `afterNextRender`).

**Sans SSR** : pas de `provideClientHydration`, pas de fichiers serveur ; le reste est identique.

**Splash screen (dans les deux cas)** dans `src/index.html` : `<div id="splash">` (logo + loader en CSS inline, couleurs du projet, compatible dark). Retiré côté navigateur une fois l'app prête (après hydratation si SSR, après bootstrap sinon) via `afterNextRender` dans `App` ou `ApplicationRef.whenStable()`, avec un fondu puis `remove()`. Respecter `prefers-reduced-motion`. Avec SSR, le splash ne doit pas masquer le contenu aux robots ni si le JS échoue (`<noscript>` + timeout CSS de sécurité).

### Routing — lazy loading obligatoire

```ts
export const routes: Routes = [
  { path: '', loadComponent: () => import('@layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent), children: [
    { path: '', loadChildren: () => import('@features/accueil/accueil.routes').then(m => m.ACCUEIL_ROUTES) },
    { path: 'politique-de-confidentialite', loadComponent: () => import('@features/legal/pages/politique-confidentialite/politique-confidentialite.component').then(m => m.PolitiqueConfidentialiteComponent), title: 'Politique de confidentialité' },
    { path: 'mentions-legales', loadComponent: … },
    { path: 'cookies', loadComponent: … },
  ]},
  { path: '**', loadComponent: () => import('@features/not-found/not-found.component').then(m => m.NotFoundComponent), title: 'Page introuvable' },
];
```

- **Toutes** les routes sont lazy : `loadChildren` pour une feature, `loadComponent` pour une page ou un layout. Aucun `component:` importé en dur dans `app.routes.ts` ni dans les `<feature>.routes.ts`.
- Chaque feature expose `<feature>.routes.ts`, lui-même composé de `loadComponent`.
- Aucun import statique d'une page depuis une autre feature (sinon elle quitte son chunk). Vérifier dans le résultat du build que chaque feature a son propre chunk lazy.
- Préchargement : `withPreloading(PreloadAllModules)` ou stratégie personnalisée selon le projet ; `@defer` pour les blocs lourds dans une page.
- `title` sur chaque route + `TitleStrategy` personnalisée (`« Page | Nom du site »`).
- Guards fonctionnels sur les routes protégées (`canMatch` pour ne pas télécharger le chunk d'une zone interdite).

## 1. Architecture

```
src/
├── environments/
├── app/
│   ├── core/       ← singletons : auth, interceptors, guards, seo, cookies, cookie-consent, network, config
│   ├── shared/     ← réutilisé par ≥ 2 features : components/ (dont states/) directives/ pipes/ utils/ helpers/ models/
│   ├── layouts/    ← main-layout, auth-layout, dashboard-layout
│   ├── features/
│   │   ├── <feature>/  models/ services/ pages/ components/ <feature>.routes.ts
│   │   ├── legal/      pages/ politique-confidentialite, mentions-legales, cookies
│   │   └── not-found/
│   ├── app.routes.ts  app.config.ts  (+ app.routes.server.ts, app.config.server.ts si SSR)
├── styles.css
└── index.html      ← splash
public/             ← favicon, robots.txt, sitemap.xml, og-image, manifest, _redirects, _headers
```

Un élément reste dans sa feature ; partagé → `shared/` (UI) ou `core/` (singleton).

## 2. Composants & TypeScript

- Standalone implicite (ne pas écrire `standalone: true`), `ChangeDetectionStrategy.OnPush`, zoneless.
- `inject()` uniquement. API signals : `input()`, `input.required()`, `output()`, `model()`, `viewChild()`.
- Champs privés natifs `#field`. Piège : `ReturnType<typeof this.#methode>` invalide → fonction module-level.
- Pages (smart) injectent et orchestrent ; components (dumb) sans service métier.
- État : `signal()`, `computed()`, `linkedSignal()`, `effect()` ; async : `resource()` / `httpResource()` ou service + signals ; `toSignal()` pour RxJS. Pas de NgRx sauf besoin global réel.
- Panneaux d'une page pilotés par un seul signal (`panneau = signal<'creer' | 'editer' | 'detail' | null>(null)`).
- `forkJoin` pour les chargements combinés ; `debounceTime` + `distinctUntilChanged` pour la recherche.
- `as const` sur chaque branche d'un ternaire.

### Règles Sonar (côté TS / templates)

Le code livré ne doit déclencher aucune alerte SonarQube / SonarLint :

- **Pas de ternaires imbriqués** : extraire en `if`, fonction ou `Record` de correspondance.
- **Pas de chaînes littérales dupliquées** : constante, enum ou union de types.
- **Complexité cognitive faible** (≤ 15 par fonction) : découper, retours anticipés, tables de correspondance plutôt que `switch` géants.
- **Pas de nombres magiques** : constantes nommées (`DELAI_RAFRAICHISSEMENT_MS = 30_000`).
- **Typage strict** : pas de `any`, pas d'assertion non-null `!` sans garantie, `unknown` + garde de type plutôt que des casts.
- **Pas de code mort** : imports, variables, paramètres et méthodes inutilisés supprimés ; pas de code commenté ; pas de `console.log` / `debugger`.
- **Pas de blocs vides** : un `catch` gère ou propage l'erreur ; jamais `catch {}` silencieux.
- **Promesses et observables** : toute promesse est attendue ou gérée ; tout abonnement manuel est nettoyé (`takeUntilDestroyed`, `DestroyRef`).
- **Lisibilité** : `readonly` sur ce qui ne change pas, `===` uniquement, optional chaining (`a?.b`) et `??` plutôt que des enchaînements de `&&` / `||`, `for...of` plutôt que `forEach` quand on peut sortir de la boucle, pas de template literals imbriqués.
- **Fonctions** : 4 paramètres maximum (sinon un objet), pas de fonctions dupliquées, pas de méthode qui retourne toujours la même valeur.
- **Templates** : pas de logique complexe dans le HTML (passer par `computed()`), pas d'appel de méthode non pure dans un binding, `track` toujours pertinent dans `@for`.
- **Accessibilité relevée par Sonar** : `alt` sur les images, `label` associé à chaque champ, boutons avec texte ou `aria-label`, pas de `click` sur un élément non interactif sans rôle ni gestion clavier.

## 3. Services & HTTP

- Modèles calqués sur les DTO Spring Boot (mêmes champs, enums en union de string). URL d'API depuis `@env/environment`.
- Interceptor fonctionnel : authentification, gestion des 401. Guards fonctionnels dans `core/auth/`.
- Flux multi-étapes : state de navigation du Router.
- Codes d'erreur métier du back (ex. `RECHERCHE_TROP_LARGE`) traduits en messages français clairs via une table centralisée ; tout nouveau code ajouté côté back est géré côté front.
- Rafraîchissement automatique (listes de suivi en temps réel) : polling (≈ 30 s) suspendu quand l'onglet est caché et arrêté à la destruction du composant (`DestroyRef`).
- Timeout sur les requêtes (constante, ex. 15 s via `timeout()` dans un interceptor) pour détecter un back qui ne répond pas.

### Uploads de fichiers

- Envoi avec `reportProgress: true` + barre de progression réelle (pas un spinner).
- Contrôles côté client alignés sur le back (taille max, extensions) avec message clair avant envoi.
- Gérer le HTTP 413 (proxy / limite serveur) et les codes d'erreur d'import du back.
- Texte d'aide expliquant le format attendu (colonnes, images intégrées, modèle téléchargeable si pertinent).

### Stockage côté navigateur : cookies, pas localStorage

- **Jamais de `localStorage` ni de `sessionStorage`.** Toute persistance passe par des cookies.
- `CookieService` dans `core/cookies/` : lecture/écriture/suppression, compatible SSR (côté serveur, lecture depuis l'en-tête `cookie` de la requête via `REQUEST` ; côté navigateur, `document.cookie`). L'état exposé en signals.
- Attributs par défaut : `Path=/`, `SameSite=Lax` (ou `Strict`), `Secure` en production, `Max-Age` explicite. Valeurs encodées (`encodeURIComponent`), noms en constantes.
- **Tokens d'authentification** : idéalement en cookie `HttpOnly` posé par le back (Spring Boot), envoyé avec `withCredentials: true` ; le front ne lit jamais le token. Si le back ne le permet pas encore, le signaler à l'utilisateur plutôt que de retomber sur `localStorage`. Avec des cookies d'auth, prévoir la protection CSRF (XSRF-TOKEN / `withXsrfConfiguration`).
- Préférences (thème, langue, consentement) : cookies non `HttpOnly`, ce qui permet aussi au SSR de rendre directement le bon thème sans flash.
- Ne stocker que le strict nécessaire (taille < 4 Ko par cookie, aucune donnée personnelle sensible).

## 4. États de données et du template (obligatoire)

> **Obligatoire.** Toute zone qui affiche des données distantes gère tous les états (chargement, rechargement, succès, vide, erreur, hors-ligne…) : aucun écran blanc, aucun spinner infini. Détail et tableau des états dans `references/etats-donnees.md`. **À lire avant de créer ou modifier un composant qui affiche des données.**

## 5. Formulaires

- Reactive Forms avec `NonNullableFormBuilder` (`.group()` directement).
- `FormArray` pour les listes dynamiques. Erreurs sous le champ, shake sur soumission invalide.
- Jamais de template-driven. Signal Forms seulement sur demande.

## 6. Templates

- `@if`, `@for (… ; track …)` + `@empty`, `@switch`, `@let`, `@defer`. Jamais `*ngIf` / `*ngFor`.
- `[class.x]` / `[style.x]` plutôt que `ngClass` / `ngStyle`. `NgOptimizedImage` (`ngSrc`, `priority` sur l'image LCP).
- Pas de duplication en dur : contenu répété généré depuis des données TS. Textes UI en français.

## 7. Tailwind CSS v4 & thème

CSS-first, pas de `tailwind.config.js` ; `.postcssrc.json` avec `@tailwindcss/postcss`. Dans `src/styles.css` :

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Palette, typo, rayons, ombres : selon le projet, aucune valeur imposée */
  --color-primary-500: …;
  --font-sans: …;
  --radius-card: …;
  --animate-shake: shake 0.4s ease-in-out;
  @keyframes shake { … }
}
```

- Utiliser les utilitaires générés (`bg-primary-500`, `rounded-card`, `animate-shake`) ; jamais de couleurs en dur dans les templates. `var(--color-…)` en CSS pur.
- Dark mode via `dark:` uniquement ; choix du thème mémorisé en cookie. `@apply` avec parcimonie ; `@reference` dans le CSS d'un composant.
- Animations CSS (`@keyframes` dans `@theme`) ; JS seulement si la logique l'impose.

## 8. SEO (adapté au projet)

- `SeoService` dans `core/seo/` basé sur `Title` et `Meta` : title, description, canonical, Open Graph, Twitter Card, `robots`. Données par route via `data: { seo: {…} }` appliquées à chaque navigation.
- JSON-LD selon le type de projet (`Organization`, `LocalBusiness`, `Product`, `Article`, `BreadcrumbList`…).
- `index.html` : `lang="fr"`, meta par défaut, favicon, `theme-color`, preconnect fonts.
- `public/robots.txt` et `public/sitemap.xml` (URL de prod depuis l'environnement).
- Sans SSR, signaler à l'utilisateur que le SEO reste limité (rendu côté client) ; proposer le prerender si des pages publiques doivent être indexées.
- Back-offices / apps privées : SEO minimal + `noindex` global.
- Un seul `h1` par page ; `alt` sur toutes les images.

## 9. Pages obligatoires & cookies

> Détail dans `references/pages-cookies.md` : pages légales obligatoires et gestion des cookies. **À lire avant de créer le footer, les pages légales ou un bandeau de cookies.**

## 10. Icônes

- Font Awesome ou Phosphor selon le projet : reprendre celle en place, ne jamais mélanger.
- Vérifier que l'icône existe (ex. `ph-whistle` n'existe pas). Jamais d'emojis.

## 11. Design

Tout le design (concepts, maquette d'abord, palette, typo, icônes, images, motion design GSAP / Three.js, anti « look IA », composants, sources d'inspiration, vérification visuelle) est défini dans le skill **`design-sidy`** : le charger avant toute page, refonte ou choix visuel.

Côté Angular uniquement :

- les tokens du design system vont dans le `@theme` de `src/styles.css` (§7) ;
- un composant inspiré d'un exemple React (reactbits, shadcn, 21st, Magic UI…) est réécrit en Angular 21 (standalone, signals, `@if` / `@for`), sans dépendance React ;
- GSAP et Three.js : création dans `afterNextRender()`, nettoyage dans `DestroyRef.onDestroy` (détails dans `design-sidy` §13–14).

## 12. Responsive (obligatoire)

- Mobile-first, vérifié à 320, 375, 425, 768, 1024, 1440, 2560 px.
- **Grands écrans** : la mise en page doit s'étendre proprement (conteneurs à largeur max adaptée, grilles qui gagnent des colonnes, typographie qui monte en `2xl:`), pas un bloc perdu au centre, ni des barres de filtres ou en-têtes désalignés, ni des cartes étirées à l'extrême.
- `sm: md: lg: xl: 2xl:` ; grilles `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
- Tableaux → cartes sur mobile ; hamburger ; images `w-full object-cover`.
- Les skeletons et états vides/erreur suivent le même responsive que le contenu.

## 13. Vérification avant livraison

L'utilisateur ne doit pas être celui qui trouve les bugs de base. Quand l'environnement le permet :

- build sans erreur (`ng build`), aucune erreur TypeScript ni warning de template ; chunks lazy présents pour chaque feature ;
- relecture des règles Sonar ci-dessus sur tout le code modifié ;
- captures d'écran des écrans modifiés aux breakpoints clés (375, 768, 1440, 2560) en clair et en sombre, puis relecture critique ;
- chaque état de données vérifié (§4) : chargement lent (throttling), réponse vide, erreur 500, réseau coupé (mode hors ligne), back arrêté / timeout ;
- parcours principaux testés (Playwright) : navigation, formulaires, états d'erreur, hover ;
- aucun appel à `localStorage` / `sessionStorage` dans le code (recherche globale) ;
- `README.md` du projet à jour pour la partie front (stack, structure, commandes, variables d'environnement, thème). S'il n'existe pas, le créer depuis `spring-boot-sidy/templates/README.projet.md` : un projet a un seul README détaillé qui décrit le front **et** le back ;
- si une étape n'a pas pu être exécutée, le dire clairement et indiquer la commande à lancer.

## 14. Déploiement

- Netlify (SPA sans SSR) : toujours `public/_redirects` avec `/*  /index.html  200`.
- Avec SSR : utiliser l'adaptateur adapté à l'hébergeur, pas de `_redirects` SPA.
- En-têtes de sécurité et de cache configurés côté hébergeur (`_headers` sur Netlify) : cache long pour les fichiers hachés, pas de cache pour `index.html`.
- Variables d'environnement de prod définies sur l'hébergeur, jamais commitées.

## 15. Livraison

- Fichiers complets, pas d'extraits avec « … ».
- Correction ciblée → uniquement les fichiers modifiés.
- Avant de livrer : imports complets, alias `@core/…` utilisés ; si SSR, aucun accès navigateur non protégé.
