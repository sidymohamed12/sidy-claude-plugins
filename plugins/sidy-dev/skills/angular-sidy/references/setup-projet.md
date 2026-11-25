# Setup d'un nouveau projet

Section 0 du skill `angular-sidy`, déplacée ici sans modification pour alléger le `SKILL.md`. À lire à la création d'un projet, jamais pour une feature dans un projet existant.

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
