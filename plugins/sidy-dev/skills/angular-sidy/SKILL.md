---
name: "angular-sidy"
description: "Conventions Angular 22 de Sidy : architecture, signals, règles Sonar, états de données, Tailwind v4 @theme, responsive, vérification. Détails à la demande dans references/ : setup projet, HTTP et cookies, SEO et déploiement, pages légales, accessibilité et performance."
---

# Angular 22 — façon Sidy

Avant d'écrire du code dans un projet existant : lire une feature déjà faite et en reproduire exactement les patterns (nommage, découpage, services, icônes, couleurs). Les fichiers fournis par l'utilisateur (ex. `auth.service.ts`, modèles) sont canoniques : les utiliser tels quels.

Cible : **Angular 22** (zoneless, `OnPush` par défaut, standalone, signals ; TypeScript 6, Node 26). Si le projet existant est sur une version antérieure (21 ou moins), s'aligner sur sa version : en 21 on écrit `ChangeDetectionStrategy.OnPush` et `@Injectable({ providedIn: 'root' })`, `resource` / `httpResource` / Signal Forms sont expérimentaux et on ne les utilise pas sans accord de Sidy. Ne jamais migrer un projet de version sans demande ; à sa demande, `ng update` puis revue de `references/migration-22.md`.

## Quoi lire, et quand

Le noyau ci-dessous suffit pour une feature courante. Ouvrir un fichier de `references/` seulement quand la tâche le demande :

| La tâche touche… | Lire |
|---|---|
| un nouveau projet (config, routing, SSR, splash) | `references/setup-projet.md` |
| une zone qui affiche des données distantes | `references/etats-donnees.md` |
| un upload, un cookie, l'authentification, un thème mémorisé | `references/http-stockage.md` |
| le footer, les pages légales, le bandeau de cookies | `references/pages-cookies.md` |
| le SEO, un déploiement | `references/seo-deploiement.md` |
| la mise en ligne d'un site public (contenu mixte, clés, image de partage, liens, CGU, anti-spam, sitemap et robots) | `references/mise-en-ligne.md` |
| l'accessibilité, la performance du bundle, les erreurs globales | `references/accessibilite-performance.md` |
| une migration 21 → 22 demandée par Sidy | `references/migration-22.md` |

## Questions à poser au démarrage d'un nouveau projet

Si ce n'est pas déjà précisé :

1. SSR : oui ou non ? (site public / vitrine → souvent oui ; back-office → souvent non). Ne jamais décider à la place de l'utilisateur.
2. Bibliothèque d'icônes : Font Awesome ou Phosphor ?
3. Palette / typographie du projet (aucune valeur par défaut).
4. Type de projet pour le SEO (vitrine, e-commerce, app privée…).
5. Formulaires : Reactive Forms (défaut historique) ou Signal Forms (stables en 22) ?

## 0. Setup d'un nouveau projet (toujours)

> Détail dans `references/setup-projet.md` : `angular.json` (schematics), environnements `@ngx-env`, alias `tsconfig`, `app.config.ts`, SSR optionnel et splash, routing 100 % lazy. **À lire avant de créer un projet, jamais pour une feature dans un projet existant.** Règle à retenir sans l'ouvrir : toutes les routes sont lazy (`loadChildren` / `loadComponent`) et on importe via les alias `@core/`, `@shared/`, `@features/`, `@layouts/`, `@env/`, jamais via `../../`.

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

- Standalone implicite (ne pas écrire `standalone: true`). `OnPush` et zoneless sont le défaut en 22 : ne pas écrire `changeDetection` ; `ChangeDetectionStrategy.Eager` (ancien `Default`) seulement pour un composant qui l'exige, avec un commentaire qui dit pourquoi.
- Services singleton : `@Service()` (remplace `@Injectable({ providedIn: 'root' })`) ; `injectAsync()` pour charger un service lourd à la demande.
- `inject()` uniquement. API signals : `input()`, `input.required()`, `output()`, `model()`, `viewChild()`.
- Champs privés natifs `#field`. Piège : `ReturnType<typeof this.#methode>` invalide → fonction module-level.
- Pages (smart) injectent et orchestrent ; components (dumb) sans service métier.
- État : `signal()`, `computed()`, `linkedSignal()`, `effect()` ; async : `httpResource()` pour une lecture (GET), `resource()` / `rxResource()` pour le reste, `chain()` pour enchaîner deux ressources dépendantes, sinon service + signals ; `toSignal()` pour RxJS. Pas de NgRx sauf besoin global réel.
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

> Détail dans `references/http-stockage.md` : uploads (progression réelle, contrôles, 413), `CookieService`, attributs des cookies, jeton d'authentification, CSRF. **À lire avant un upload, un cookie ou une authentification.**
>
> **Règle absolue : jamais de `localStorage` ni de `sessionStorage`.** Toute persistance passe par des cookies (via `CookieService`), et le jeton d'authentification idéalement en cookie `HttpOnly` posé par le back. Si le back ne le permet pas, le signaler au lieu de retomber sur `localStorage`.

## 4. États de données et du template (obligatoire)

> **Obligatoire.** Toute zone qui affiche des données distantes gère tous les états (chargement, rechargement, succès, vide, erreur, hors-ligne…) : aucun écran blanc, aucun spinner infini. Détail et tableau des états dans `references/etats-donnees.md`. **À lire avant de créer ou modifier un composant qui affiche des données.**

## 5. Formulaires

- Reactive Forms avec `NonNullableFormBuilder` (`.group()` directement).
- `FormArray` pour les listes dynamiques. Erreurs sous le champ, shake sur soumission invalide.
- Jamais de template-driven.
- Signal Forms (`@angular/forms/signals`) sont stables en 22 mais ne sont pas le défaut : sur un projet qui utilise Reactive Forms, rester dessus ; sur un nouveau projet, poser la question (voir « Questions à poser »). Ne jamais mélanger les deux dans un même formulaire.

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

> Détail dans `references/seo-deploiement.md` : `SeoService`, JSON-LD, `robots.txt`, `sitemap.xml`, limites sans SSR. **À lire pour un projet public ou une page indexable.** Toujours : un seul `h1` par page, `alt` sur toutes les images, `noindex` global sur un back-office.

## 9. Pages obligatoires & cookies

> Détail dans `references/pages-cookies.md` : pages légales obligatoires et gestion des cookies. **À lire avant de créer le footer, les pages légales ou un bandeau de cookies.** Les CGU (comptes, achats, contenus d'utilisateurs) sont dans `references/mise-en-ligne.md` §5.

## 10. Icônes

- Font Awesome ou Phosphor selon le projet : reprendre celle en place, ne jamais mélanger.
- Vérifier que l'icône existe (ex. `ph-whistle` n'existe pas). Jamais d'emojis.

## 11. Design

Tout le design (concepts, maquette d'abord, palette, typo, icônes, images, motion design GSAP / Three.js, anti « look IA », composants, sources d'inspiration, vérification visuelle) est défini dans le skill **`design-sidy`**, appliqué par l'agent `designer`. Source de vérité, dans cet ordre :

1. `design/HANDOFF.md`, `DESIGN.md` et la maquette validée, s'ils existent : les intégrer fidèlement, sans rien réinventer.
2. Écran simple dans un projet qui a déjà son design system : reprendre ses tokens et composants ; lire seulement la section utile de `design-sidy` (couleurs §3, typo §4, micro-interactions §12, `references/motion.md`, `references/ressources.md`).
3. Écran structurant (accueil, refonte, identité) sans maquette ni `DESIGN.md` : ne pas l'inventer, demander de passer d'abord par `designer`.

Côté Angular uniquement :

- les tokens du design system vont dans le `@theme` de `src/styles.css` (§7) ;
- un composant inspiré d'un exemple React (reactbits, shadcn, 21st, Magic UI…) est réécrit en Angular 22 (standalone, signals, `@if` / `@for`), sans dépendance React ;
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
- site public : liste de contrôle de `references/mise-en-ligne.md` passée avant la livraison (contenu mixte, aucune clé secrète dans le front, image de partage, liens, anti-spam) ;
- accessibilité et performance contrôlées selon `references/accessibilite-performance.md` (navigation clavier, contraste, `prefers-reduced-motion`, poids du bundle initial) ;
- chaque état de données vérifié (§4) : chargement lent (throttling), réponse vide, erreur 500, réseau coupé (mode hors ligne), back arrêté / timeout ;
- parcours principaux testés (Playwright) : navigation, formulaires, états d'erreur, hover ;
- aucun appel à `localStorage` / `sessionStorage` dans le code (recherche globale) ;
- aucun `.spec.ts` n'est généré (`skipTests` est voulu) : n'en écrire que sur demande de Sidy (Vitest est le lanceur de tests par défaut depuis Angular 21) ; les parcours importants se vérifient avec Playwright ;
- `README.md` du projet à jour pour la partie front (stack, structure, commandes, variables d'environnement, thème). S'il n'existe pas, le créer depuis `spring-boot-sidy/templates/README.projet.md` : un projet a un seul README détaillé qui décrit le front **et** le back ;
- si une étape n'a pas pu être exécutée, le dire clairement et indiquer la commande à lancer.

## 14. Déploiement

> Détail dans `references/seo-deploiement.md` : Netlify (`_redirects` SPA), SSR, en-têtes de cache et de sécurité, variables d'environnement de production. **À lire avant de configurer un déploiement.**

## 15. Livraison

- Fichiers complets, pas d'extraits avec « … ».
- Correction ciblée → uniquement les fichiers modifiés.
- Avant de livrer : imports complets, alias `@core/…` utilisés ; si SSR, aucun accès navigateur non protégé.
