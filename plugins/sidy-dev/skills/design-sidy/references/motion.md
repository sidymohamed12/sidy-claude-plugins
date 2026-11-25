# Motion design (GSAP) et 3D (Three.js)

Sections 13 et 14 du skill `design-sidy`, déplacées ici sans modification pour alléger le `SKILL.md`.

## 13. Motion design avec GSAP

### Principe

Sur les vitrines, sites et applications web, **le motion design est un point fort du livrable, pas une option** : la page doit captiver dès l'ouverture et pendant tout le scroll. Captivant ne veut pas dire chargé : chaque animation sert le récit, le contenu ou l'action, et reste fluide (60 fps), accessible et réversible sous `prefers-reduced-motion`.

### Recherche dans les références (avant toute proposition)

1. Pour chaque section, **chercher réellement** les effets candidats dans les références : reactbits.dev, uiverse.io, 21st.dev, freefrontend.com, animata.design, hover.dev, magicui.design, awwwards.com (sites primés pour l'orchestration au scroll), details.so/inspo (détails et micro-interactions de vrais produits), ui.shadcn.com (interactions d'interface), et les règles de motion de taste-skill / impeccable. Ouvrir les pages (navigateur ou WebFetch), ne pas citer de mémoire.
2. Retenir pour chaque section 1 effet principal (et au besoin 1 alternative), avec le **nom exact de l'effet et le lien** de la page où il a été trouvé.
3. Écarter ce qui ne sert pas le concept ou le contenu (§10), ce qui est trop lourd pour le mobile, ou ce qui n'a pas de version accessible.
4. Si une référence n'est pas accessible depuis l'environnement, le dire et décrire l'effet sans lien.

### Proposition à faire valider (avant de coder)

Présenter à l'utilisateur un tableau, **une ligne par section** (dans l'ordre de la page), puis attendre sa validation :

| Section | Animation proposée | Raison | Déclencheur | Référence (effet + lien) | Mobile / reduced-motion |
| --- | --- | --- | --- | --- | --- |
| Hero | Titre révélé mot par mot depuis des masques, photo qui se pose | Le nom du projet arrive d'abord, puis l'action | Chargement (une fois) | reactbits — *Split Text* (lien) | Version courte / titre affiché directement |
| Chiffres clés | Compteurs qui défilent jusqu'à la valeur | Rendre l'impact concret | Scroll (entrée dans l'écran, une fois) | reactbits — *Count Up* (lien) | Valeur finale affichée |
| … | … | … | Chargement · scroll (entrée) · scroll (scrub / pin) · survol · clic · navigation | … | … |

- **Raison** : ce que l'animation apporte au récit ou à l'usage, en une phrase. Pas de raison → pas d'animation.
- **Déclencheur** : chargement, scroll (entrée), scroll (scrub / pin), survol, clic, navigation.
- Ajouter sous le tableau : les **moments forts** retenus (2–3 sur une vitrine), les effets au pointeur, les transitions de pages, Lenis oui / non et pourquoi, le niveau de motion (§13) et le poids JS estimé (GSAP, plugins, Three.js).
- Proposer au besoin 2 variantes pour les sections clés (hero, moment fort) et laisser l'utilisateur choisir.
- Le tableau validé est recopié dans la section **Motion** du `DESIGN.md` et sert de référence pendant la maquette, l'intégration et la vérification.
- Les effets repris sont **réécrits** dans la stack du projet (Angular / HTML + GSAP) avec les tokens du projet : pas de dépendance React, pas de copier-coller brut, licence vérifiée.

### Niveau 1 — Vitrines, sites, portfolios (Convaincre, Exposer) : motion riche

1. **Entrée du hero** orchestrée en timeline (~1.1–1.6 s) : `h1` qui monte ligne par ligne ou mot par mot depuis des masques (SplitText), texte et boutons en cascade, image qui se pose (`scale(1.05 → 1)`, révélation en `clip-path`) ou scène 3D qui s'assemble. Jamais de loader bloquant.
2. **Chaque section a sa propre entrée, différente de la voisine** (pas le même fade-up partout) : révélation d'image en `clip-path`, titres en SplitText, listes en cascade courte, chiffres qui défilent, lignes / tracés SVG qui se dessinent, cartes qui se posent avec un léger décalage de profondeur.
3. **2 à 3 moments forts** pinés et scrubés, séparés par des sections plus calmes : chapitres photo, titre qui s'éclaire mot à mot, défilement horizontal de projets, image ou objet 3D qui tourne au scroll, texte géant traversé par une image, changement de couleur de fond entre chapitres.
4. **Couche interactive** : micro-interactions (§12), un effet lié au pointeur bien choisi (spotlight, image qui suit le survol d'une liste, bouton magnétique discret sur le CTA principal), parallaxe légère sur les images et fonds (jamais sur le texte courant).
5. **Transitions de pages** (View Transitions API ou overlay GSAP) et liens d'ancres animés ; Lenis possible pour un scroll fluide (voir règles).
6. Marquee, compteurs, loops dans les visuels autorisés quand ils servent le contenu, avec pause.

### Niveau 2 — Applications web publiques (Expérience) : motion soignée

- Entrée de page courte (titre + contenu en cascade, 400–600 ms) à chaque navigation ; **transitions de route** (View Transitions / GSAP) avec élément partagé quand c'est logique (carte → détail).
- Listes et grilles qui se posent en cascade courte au premier chargement ; **Flip** pour filtres, tris, ajout / suppression d'éléments.
- Retours d'action vivants : succès (coche dessinée, compteur qui monte, badge qui apparaît), drawers / bottom sheets qui glissent, toasts, onglets avec indicateur qui glisse, skeleton → contenu en fondu.
- Pages d'accueil ou d'onboarding de l'app traitées comme une vitrine (niveau 1).

### Niveau 3 — Back-offices (Opérer) : motion allégée

- Présente mais discrète et rapide (≤ 250 ms), jamais au scroll, jamais en boucle décorative.
- Autorisé : entrée de page légère (fondu + 8 px), cascade courte des KPI cards au chargement, compteurs KPI qui montent une fois, Flip sur tris / filtres / réordonnancement, ouverture de drawers et dialogues, indicateurs d'onglets, toasts, skeleton → contenu, lignes de tableau mises en évidence après une action, graphiques qui se dessinent une fois.
- Interdit : ScrollTrigger, Lenis, SplitText décoratif, 3D, parallaxe, effets liés au pointeur.

### Niveau Lire (doc, pages légales)

Micro-interactions et ancres animées uniquement.

### Mise en place

- GSAP 3.13+ (tous les plugins sont gratuits : ScrollTrigger, SplitText, Flip). Angular / Vite : `npm i gsap`, import dynamique dans la page qui l'utilise. Sans build : CDN jsDelivr en `defer`. `gsap.registerPlugin(...)` une seule fois.
- **Angular** : créer les animations dans `afterNextRender()` (jamais côté serveur), à l'intérieur d'un `gsap.context(() => {...}, hostElement)` ; `ctx.revert()` dans `DestroyRef.onDestroy`. En zoneless, aucun `runOutsideAngular` nécessaire.
- **`gsap.matchMedia()`** pour tout : `(prefers-reduced-motion: no-preference)` pour lancer la motion, `reduce` → état final directement ; breakpoints pour couper les moments lourds sur mobile.
- **Contenu visible sans JS** : l'état caché initial n'est posé que par le script (classe ajoutée sur `<html>` par JS + filet de sécurité par timeout CSS). Aucun texte invisible pour les robots ou si le JS échoue.

### Règles

- Timeline unique pour l'entrée du hero ; `autoAlpha` plutôt que `opacity` pour masquer.
- **ScrollTrigger** : entrées de section en `once: true` ou `toggleActions: 'play none none reverse'` ; pin seulement avec `position` stable et hauteur déterministe ; `scrub: 0.5–1.5` ; 3 sections pinées max par page, jamais deux à la suite ; le moment montre un état fini aux deux bouts et se rejoue à l'envers en remontant ; `ScrollTrigger.refresh()` après chargement des images et polices ; `markers: false` en prod.
- **Smooth-scroll (Lenis)** : scroll natif par défaut ; Lenis autorisé quand le projet le justifie (vitrine ou portfolio avec moments scrubés). Dans ce cas : une seule instance, synchronisée avec ScrollTrigger (`lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker.add((t) => lenis.raf(t * 1000))` + `gsap.ticker.lagSmoothing(0)`), coupée sous `prefers-reduced-motion`, ancres et navigation clavier fonctionnelles, détruite au démontage (`lenis.destroy()`), jamais de blocage du scroll ni de saut forcé de section. Pas de scroll-snap.
- **SplitText** : titres courts uniquement (≤ 8 mots), `split.revert()` au nettoyage, `aria-label` conservé.
- **Stagger** : 30–80 ms par élément, ≤ 8 éléments animés par groupe (au-delà, le reste apparaît avec le dernier) ; `ScrollTrigger.batch` pour les grilles longues.
- **Flip** : transitions de mise en page (filtre, tri, liste ↔ grille), une paire d'éléments partagés par transition.
- **quickTo** pour ce qui suit le pointeur ; un ou deux effets liés au pointeur par page, uniquement sur pointeur fin, jamais de curseur qui remplace celui du système.
- Easing : `power2.out` / `expo.out` pour les entrées, `power2.inOut` pour les déplacements, `none` pour le scrub ; jamais `elastic` / `back` sur de l'UI informative.
- Toute boucle qui dure plus de 5 s a un bouton pause ; boucles en pause quand l'onglet est caché ; tween infinis tués à la destruction.
- Mobile : moments légers seulement (transform, clip-path, couleur), sinon image fixe de l'état final.

## 14. 3D avec Three.js

### Quand

- **Uniquement si la 3D représente un contenu réel** : le produit, un objet du métier, une carte / un territoire, une architecture, l'écran du produit. **(interdit)** 3D décorative (sphères, particules, blobs) sur une vitrine de lieu, de service ou de commerce : photos.
- Modes Convaincre / Exposer (et page d'accueil d'une app web). **Une seule scène vivante par page** (≤ 2 contextes WebGL au total) ; jamais en calque fixe ni derrière du texte courant.
- Si le produit a de vraies photos, la photo d'abord ; la 3D quand le brief la demande (configurateur, « voir en 3D », produit qui n'existe qu'en modèle).

### Mise en place

- `npm i three` (Angular / Vite) ou import map vers `three` sur CDN (sans build). **Import dynamique** : la scène ne charge que lorsque sa section approche (`IntersectionObserver` pour monter, jamais pour démarrer / arrêter une motion visible).
- **Angular** : composant dédié avec `viewChild` sur le `<canvas>`, création dans `afterNextRender()`, `ResizeObserver` pour le redimensionnement, nettoyage complet dans `DestroyRef.onDestroy` (`renderer.dispose()`, `geometry.dispose()`, `material.dispose()`, textures, `renderer.setAnimationLoop(null)`). Jamais côté serveur.
- Renderer : `antialias: true`, `setPixelRatio(Math.min(devicePixelRatio, 1.5))`, `outputColorSpace = SRGBColorSpace`, `ACESFilmicToneMapping`, fond transparent posé sur le fond de la section (blanc).
- Modèles **glTF / GLB** compressés (Draco ou Meshopt), textures KTX2 / WebP, **≈ 2 Mo max** compressé ; éclairage simple (HDRI léger ou 2–3 lumières), pas de post-processing lourd.
- **Poster d'abord** : une image fixe de la scène (WebP) affichée immédiatement, remplacée par le canvas une fois prêt ; même poster si WebGL est absent ou échoue, sur mobile bas de gamme et sous `prefers-reduced-motion`.
- Perf : rendu à la demande quand rien ne bouge ; boucle en pause hors écran et onglet caché ; baisser le pixel ratio si une frame dépasse ~22 ms ; particules / bruit à mi-résolution et ≤ 30 fps.

### Interaction et motion

- **GSAP pilote la 3D** : rotation / caméra liées à ScrollTrigger (scrub) dans la section du moment, ou timeline au chargement.
- `OrbitControls` seulement si l'utilisateur doit manipuler : limites d'angle et de zoom, pas de zoom à la molette qui bloque le scroll de la page, rotation auto arrêtée dès l'interaction, bouton pause.
- Accessibilité : `<canvas role="img" aria-label="…">` ; les infos de la scène existent aussi en texte ; contrôles accessibles au clavier si interactifs.
