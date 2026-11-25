# Accessibilité, performance et erreurs globales

Contenu ajouté au skill `angular-sidy` (références, pas de section numérotée). À lire pour un nouveau layout, un composant interactif, un écran lourd, ou avant la vérification finale d'un lot.

## Accessibilité (WCAG 2.2 AA)

- Structure : `header`, `nav`, `main`, `footer` ; un seul `h1`, niveaux de titres sans saut ; lien d'évitement « Aller au contenu » en premier dans le layout.
- Clavier : tout ce qui se clique se règle au clavier (`button` ou `a`, jamais un `div` cliquable). Focus toujours visible (`:focus-visible`, jamais `outline: none` sans remplacement). Ordre de tabulation logique.
- Modales, tiroirs et menus : focus placé dedans à l'ouverture, piégé tant qu'ils sont ouverts, rendu au déclencheur à la fermeture, fermeture par `Échap`. Préférer `<dialog>` natif ou `@angular/cdk` plutôt qu'une version maison. `@angular/aria` (composants headless accessibles) est stable en Angular 22 : l'utiliser pour menus, onglets, listes déroulantes et accordéons quand le design l'exige, plutôt que de réécrire la gestion du clavier ; il reste sans style, le design de `designer` s'applique par-dessus.
- Contraste : 4,5:1 pour le texte courant, 3:1 pour le grand texte et les composants d'interface, en clair **et** en sombre.
- Zones tactiles d'au moins 44 × 44 px pour les actions principales.
- Formulaires : `label` associé à chaque champ, erreur reliée au champ (`aria-describedby`), `aria-invalid` sur un champ en erreur, le focus passe au premier champ invalide à la soumission.
- Annonces : `role="alert"` pour une erreur, `aria-live="polite"` pour un succès ou un chargement ; icônes décoratives en `aria-hidden="true"`, icônes seules avec `aria-label`.
- Mouvement : `prefers-reduced-motion` coupe les animations non essentielles (CSS et GSAP : `gsap.matchMedia()`).

## Performance

- Budgets de production réglés dans `angular.json` et respectés ; en cas de dépassement, trouver la cause avant de relever le budget (`ng build --stats-json`).
- Bibliothèques lourdes (GSAP, Three.js, graphiques) importées dynamiquement (`await import('gsap')`) dans la page qui s'en sert, pas dans le chunk initial. Three.js uniquement sur les pages qui l'affichent.
- `@defer (on viewport)` pour tout bloc sous la ligne de flottaison, avec `@placeholder` aux dimensions du contenu final (pas de saut de mise en page) ; avec SSR, voir l'hydratation incrémentale (`@defer (hydrate on …)`) pour les blocs interactifs.
- Images : `NgOptimizedImage` avec `width` et `height`, `priority` sur l'image LCP seulement, formats modernes (WebP / AVIF), `loading` paresseux ailleurs.
- Polices : au plus deux familles, sous-ensemble utile, `font-display: swap`, préchargement de la police du titre principal.
- Scripts tiers (analytics, pixels) uniquement après consentement, chargés en différé.
- Templates : pas de méthode non pure dans un binding (`computed()`), `track` stable dans chaque `@for`, longues listes paginées ou virtualisées (`@angular/cdk/scrolling`).

## Erreurs globales

- Un seul `ErrorHandler` personnalisé dans `core/`, qui enregistre l'erreur sans donnée personnelle ni jeton, sans `console.log` en production. Conserver `provideBrowserGlobalErrorListeners()` quand le projet généré l'a dans `app.config.ts`.
- Une erreur de chargement d'un chunk lazy (déploiement pendant la visite) affiche un message avec « Recharger la page » au lieu d'un écran blanc.
- Les erreurs HTTP sont gérées par zone de données (voir `etats-donnees.md`), pas par un `alert` global.
