---
name: "design-sidy"
description: "Direction artistique et design front de Sidy (toutes stacks) : brief, concepts, maquette d'abord (Claude Design ou HTML/CSS) puis intégration, DESIGN.md, palette fond blanc, typo, icônes (Phosphor, Lucide, Iconoir, Heroicons, Feather, Font Awesome Free, Iconify), images captivantes, ressources gratuites, motion design (riche sur vitrines / sites / apps web, allégé sur back-offices), GSAP, Lenis, Three.js, anti look IA, responsive, a11y, perf."
---

# Design front — façon Sidy

S'applique à tout front : Angular 21 (avec `angular-sidy` pour le code), HTML/CSS/JS + Tailwind sans build, landing pages, back-offices, apps web. Ce skill décide **à quoi ça ressemble et comment ça bouge** ; le skill de la stack décide **comment c'est codé**.

Sources dont ce skill est tiré (à relire au besoin) : taste-skill (Leonxlnx), impeccable (pbakaus), frontend-design (anthropics/skills), ui-ux-pro-max, awesome-design-md (format DESIGN.md), skillui (extraction de design system) ; inspiration visuelle : reactbits, uiverse, shadcn/ui, awwwards, 21st.dev, freefrontend, details.so, animata, hover.dev, Magic UI ; icônes : Phosphor, Lucide, Iconoir, Heroicons, Feather, Font Awesome Free, Iconify ; images : Pexels, Unsplash, Pixabay, Vecteezy, PikWizard, Shutterstock ; polices : Abstract Fonts, Font Squirrel, UrbanFonts, FontSpace, FontM, DaFont, Befonts, Fontspring, 1001 Fonts.

**Ressources gratuites uniquement.** En naviguant vers les références (images, polices, icônes, composants, effets), ne retenir que des ressources **gratuites et utilisables légalement dans le projet** : pas d'image, de police, de composant ou de template payant, premium, « Pro », en essai ou à filigrane, et pas de ressource réservée à un usage personnel pour un projet client. Si la seule bonne option est payante, la signaler à l'utilisateur sans l'utiliser.

**Le brief gagne.** Une consigne explicite de l'utilisateur (couleur, police, style, matière) passe avant toute règle par défaut de ce skill, sauf les interdits marqués **(interdit)**.

## 0. Processus (toujours dans cet ordre)

1. **Brief** — si ce n'est pas précisé, demander en un seul bloc :
   - type de produit et **mode** de la surface (§1) ;
   - ce qui est vendu / fait, pour qui, l'**action principale** (« Réserver », « Signaler un canal », « Créer une ordonnance ») ;
   - pays / public (Sénégal par défaut ?) ;
   - logo, charte, couleurs imposées ; photos réelles disponibles ;
   - icônes : une bibliothèque parmi celles du §7 (Phosphor, Lucide, Iconoir, Heroicons, Feather, Font Awesome Free…) ;
   - stack (Angular ou HTML/CSS/JS + Tailwind) ; 3D ou animation au scroll souhaitées ?
   - outil de maquette : **Claude Design** ou **HTML/CSS** (§0 bis) ?
2. **Projet existant** — lire d'abord son design system (tokens, `DESIGN.md`, composants, pages faites) et s'y conformer. *Raffiner* garde l'identité ; *refondre* la remplace entièrement (jamais un entre-deux). Pour extraire le système d'un projet existant : `npx skillui --dir ./app` (tokens, typo, espacements) puis relecture humaine.
3. **Concepts** — page d'accueil, refonte ou choix structurant : **2 ou 3 concepts réellement différents**. Chaque concept : nom (ex. « Eau & Latérite »), idée tirée du métier, ambiance, palette (4–6 hex nommés), paire typographique, concept de mise en page (wireframe ASCII + alignement), traitement photo, **l'élément mémorable unique**, motion prévue. Relire chaque concept contre le brief : s'il ressemble à ce qu'on produirait pour n'importe quel site similaire, le revoir et dire ce qui a changé. Laisser l'utilisateur choisir.
4. **Design system, à faire valider** — avant la première page : `DESIGN.md` (§6), fichier de tokens et page de design system (§6, « Page de design system ») montrant couleurs, typo, espacements, formes, icônes, composants dans tous leurs états et motion. La maquette n'utilise que ce qui y figure.
5. **Copy** — écrire les vrais textes avant de construire (§11).
6. **Proposition de motion, à faire valider** — avant de coder la moindre animation, chercher les effets dans les références (§13, « Recherche dans les références ») puis **proposer à l'utilisateur le tableau des animations par section** (§13, « Proposition à faire valider ») : animation, raison, déclencheur, référence. Attendre sa validation ou ses retouches.
7. **Maquette d'abord** (§0 bis) — le design est réalisé et validé en maquette **avant** toute intégration dans le front du projet.
8. **Intégration dans le front** — transposer fidèlement la maquette validée dans la stack (Angular avec `angular-sidy`, ou HTML/CSS/JS), uniquement avec les tokens, composants et animations validés.
9. **Vérification visuelle** (§18) avant livraison, en comparant le front à la maquette validée.

## 0 bis. Maquette avant intégration

On commence toujours par le design, puis on le met dans le front.

- **Deux outils possibles** ; si l'utilisateur ne l'a pas précisé, lui demander lequel :
  - **Claude Design** (type d'artefact Design, quand il est disponible) : canevas à garder, éditer, comparer et partager ; idéal pour explorer les concepts, les écrans et les variantes.
  - **HTML/CSS** : page(s) autonome(s) en HTML + Tailwind v4 (`@tailwindcss/browser`) + GSAP / Lenis / Three.js en CDN, publiée(s) comme artefact ; idéal pour tester la motion réelle (scroll, pin, transitions) et les interactions.
- La maquette importe `design/design-system/tokens.css` et n'utilise que les composants de la page de design system validée (§6).
- La maquette utilise déjà les **vrais textes, les vraies photos (ou images choisies dans les banques d'images du §8, signalées comme provisoires), les polices choisies (§4), les tokens du `DESIGN.md`** et les animations du tableau validé (§13), pour que l'intégration ne soit qu'une transposition.
- Contenu attendu : page d'accueil (ou écran principal), 1–2 pages / écrans clés, composants signature, états importants (vide, erreur, chargement) et versions mobile + desktop.
- Itérer sur la maquette avec l'utilisateur (variantes, retouches) jusqu'à validation explicite. **Rien n'est intégré dans le front avant cette validation.**
- À l'intégration : reprendre les mêmes valeurs (couleurs, espacements, durées, easings), découper en composants selon le skill de la stack, et signaler tout écart imposé par la technique.

## 1. Mode de la surface

Le mode se choisit d'après la surface, pas le produit (la landing d'un outil reste « Convaincre », la doc d'une marque de mode reste « Lire »).

| Mode | Surface | Ambition |
| --- | --- | --- |
| **Convaincre** | landing, vitrine, site, campagne, tarifs | engagement total : concept fort, **motion design captivant**, photos réelles |
| **Expérience** | application web publique (côté utilisateur), plateforme communautaire, portail client | interface claire **et** motion design soigné : transitions de pages, entrées, retours d'action vivants |
| **Opérer** | back-office, dashboard d'administration, outils internes | précision et retenue : lisibilité, densité maîtrisée, patterns connus ; **motion allégée** |
| **Lire** | doc, article, pages légales, aide | structure de compréhension, confort de lecture |
| **Exposer** | portfolio, galerie, showcase | l'œuvre mène dès le premier écran, motion design captivant au service de l'œuvre |

**Le motion design est mis en avant** sur les vitrines, sites et applications web (Convaincre, Expérience, Exposer), en s'inspirant des références (awwwards, reactbits, 21st.dev, freefrontend, taste-skill, impeccable). Sur les back-offices (Opérer), motion présente mais allégée. Niveaux détaillés au §13.

## 2. Concept visuel

- Le concept vient du **métier, des matières, des lieux, des gestes, du vocabulaire du sujet**, pas d'une tendance.
- **Un seul thème pour tout le site** : même palette, typo, formes, motion sur toutes les pages.
- **Un élément signature** porte le concept (une forme, un traitement photo, un moment animé) ; la mise en page autour reste disciplinée pour que la motion respire. Avant de livrer, retirer tout effet qui ne sert ni le récit ni le contenu.
- Le hero ouvre sur la chose la plus caractéristique du sujet (photo, titre, démo, moment interactif), pas sur un gabarit.

## 3. Couleurs

- **Fond blanc** (`#FFFFFF`) pour les pages. **(interdit)** fond beige, sable, crème, brun clair, même pour un concept « terre » ou « bois » : la matière passe par les accents, les photos, les motifs.
- Sections alternées éventuelles : gris neutre très clair (`#F8FAFC`, `#F5F5F5`), jamais une teinte chaude.
- Aucune palette par défaut : chaque projet a la sienne, teinte choisie d'après le sens du produit, jamais d'après le réflexe « catégorie » (tech = bleu, santé = vert).
- **Rôles, pas un sac de couleurs** : `canvas`, `surface`, `text`, `text-muted`, `primary` (action, focus, sélection), `accent` (une seule), `border`, `success`, `warning`, `danger`, `info`. Primitives (`primary-50…950`) + tokens sémantiques.
- Nouvelle palette web : **OKLCH** de préférence (rampes prévisibles ; baisser la chroma près du blanc et du noir).
- La couleur la plus forte possède un rôle ou une zone précise, pas des petites touches éparpillées. L'action principale reste la plus visible ; ne pas dépenser sa couleur en décor.
- Sur un fond coloré, le texte secondaire est teinté depuis cette couleur, jamais un gris délavé.
- Contrastes **WCAG AA** vérifiés : texte 4.5:1, grands titres 3:1, icônes / contrôles / focus 3:1, dans tous les états et les deux thèmes. Jamais d'information portée par la couleur seule.
- **Dark mode** (si prévu) composé à part : élévation des surfaces explicite, couleurs désaturées, gris très foncé plutôt que noir pur, pas une inversion mécanique. Clair ou sombre se choisit d'après la scène d'usage (qui, où, quelle lumière), pas la catégorie.
- Jamais de couleur en dur dans les composants : toujours un token.
- **Violet / lavande à éviter par défaut** (signature des sites générés) sauf si la marque l'impose.

## 4. Typographie

- Une ou deux familles maximum ; si deux, clairement distinctes et chacune avec un rôle qu'elle seule tient. Choisies pour ce projet, jamais la police réflexe.
- Une police de titre système (Arial Black, Impact…) n'est pas une police de marque : sourcer et auto-héberger une vraie police.
- **Où chercher les polices** : [Abstract Fonts](https://www.abstractfonts.com/), [Font Squirrel](https://www.fontsquirrel.com/), [UrbanFonts – top 100](https://urbanfonts.com/fonts/top-100-fonts.htm), [FontSpace](https://www.fontspace.com/), [FontM](https://fontm.com/), [DaFont](https://www.dafont.com/), [Befonts](https://befonts.com/), [Fontspring](https://www.fontspring.com/), [1001 Fonts](https://www.1001fonts.com/), et Google Fonts. Chercher d'après le concept (caractère, époque, matière), en proposer 2–3 paires avec le lien de chaque police.
- **Polices gratuites uniquement**, avec licence vérifiée avant de proposer : gratuites pour usage commercial et web (`@font-face`), de préférence OFL / « 100 % free » (filtres « Free for commercial use » sur Font Squirrel, FontSpace, DaFont, 1001 Fonts). Écarter les polices « usage personnel uniquement », « démo » ou payantes (la plupart du catalogue Fontspring) ; si une police payante est vraiment la meilleure, la signaler sans l'utiliser.
- Vérifier que la police couvre les accents français et les chiffres nécessaires, puis la convertir en WOFF2 et l'auto-héberger dans `assets/fonts/`.
- Chargement : `font-display: swap`, **2 familles / 4 fichiers maximum**, uniquement les graisses utilisées, preload du regular et du display, fallback aux métriques proches.
- Échelle en tokens avec des sauts nets de taille et de graisse (ex. 600–700 titres, 400 corps, 500 labels) ; titres qui montent sur grands écrans ; display ≤ 6rem ; tracking ≥ −0.04em.
- Corps ≥ 16 px, interligne 1.5–1.7, mesure 45–75 caractères (`max-w-prose`) ; mobile 35–60.
- `text-wrap: balance` sur les titres, `text-wrap: pretty` sur le corps. Coupure manuelle d'un titre seulement entre groupes de mots, vérifiée à chaque largeur.
- Chiffres tabulaires (`font-variant-numeric: tabular-nums`) dans les tableaux, prix, compteurs.
- Texte clair sur fond sombre : un peu plus d'interligne, de tracking, éventuellement un cran de graisse.
- Plus d'espace au-dessus d'un titre qu'en dessous. Un seul `h1` par page, niveaux sans saut.
- Accents français vérifiés dans la police (é è à ç œ « »), espaces insécables avant `: ; ? !` et dans les guillemets.

## 5. Espacement, grille, formes, profondeur

- Échelle d'espacement en multiples de 4 px ; groupes serrés, séparations généreuses.
- Conteneur à largeur max cohérente (`max-w-6xl` / `7xl` ou token), **bords gauche et droit égaux** : tout bloc s'aligne sur le conteneur ou les colonnes de la grille.
- Vitrine : sections d'environ un à deux écrans chacune, le hero seul sur le premier écran avec son action principale visible.
- Rayons : une seule logique (`--radius-card`, `--radius-button`, `--radius-input`) cohérente avec le concept ; « sharp » pour fintech / outils dev, « soft » par défaut.
- Ombres : 2 ou 3 niveaux, toujours avec un décalage et un flou doux ; préférer bordure fine + fond blanc. Un halo coloré sans décalage = décoration (interdit, §10).
- **Deux boîtes de profondeur maximum** : pas de cartes dans des cartes.
- Échelle de `z-index` définie (0 / 10 / 20 / 40 / 100 / 1000). `min-h-dvh` plutôt que `100vh` sur mobile. Les barres fixes réservent leur espace.

## 6. DESIGN.md et tokens

Chaque projet a un `DESIGN.md` à la racine (format Google Stitch / awesome-design-md), lu avant toute modification visuelle :

```
# DESIGN.md — <Projet>
## Overview        concept, mode, ambiance, l'élément mémorable, liens vers design/design-system/ (tokens.css, index.html)
## Colors          brand & accent · surface · text · semantic (hex/OKLCH + rôle)
## Typography      familles, hiérarchie (rôle → taille / graisse / interligne), principes
## Layout          échelle d'espacement, grille & conteneur, philosophie du blanc
## Elevation       niveaux d'ombre et usage
## Shapes          rayons, géométrie des photos (ratios)
## Motion          niveau de motion (§13), tokens de durée / easing, tableau validé des animations par section (raison, déclencheur, référence), budget GSAP / Lenis / Three.js
## Components      boutons, cartes, champs, navigation, composants signature
## Do's and Don'ts
## Responsive      breakpoints et comportement
```

Implémentation des tokens :

- **Tailwind v4** (Angular, Vite) : `@theme` dans `styles.css` (`--color-primary-500`, `--font-display`, `--radius-card`, `--shadow-card`, `--ease-out`, `--duration-in`…), utilitaires générés uniquement.
- **HTML/CSS/JS sans build** : Tailwind v4 via `@tailwindcss/browser` + `<style type="text/tailwindcss">` contenant le même `@theme`, partagé par toutes les pages. Structure : `index.html`, `css/`, `js/`, `assets/`.
- CSS pur : variables sur `:root` et `.dark`.

### Page de design system

Avant toute maquette, le design system existe en vrai, pas seulement dans `DESIGN.md` :

- **`design/design-system/tokens.css`** : le `@theme` complet (couleurs primitives et sémantiques, clair et sombre si prévu, polices, échelle typo, espacements, rayons, ombres, `z-index`, durées et easings). C'est **la seule source** des valeurs : la maquette puis le front l'importent tels quels.
- **`design/design-system/index.html`** : une page qui montre et documente chaque élément, avec son nom de token :
  - **couleurs** : chaque teinte avec son hex / OKLCH, son rôle et le **contraste mesuré** sur fond blanc et sur sa surface (AA vérifié) ;
  - **typographie** : chaque niveau de l'échelle (taille, graisse, interligne) avec un vrai texte du projet ;
  - **espacements, rayons, ombres, grille et conteneur** ;
  - **icônes** : la bibliothèque retenue, son style et une sélection des icônes du projet ;
  - **composants** dans tous leurs états (repos, survol, focus, actif, désactivé, chargement, erreur) : boutons, liens, champs et formulaires, cartes, badges, navigation (header, menu mobile, barre du bas si app web), onglets, toasts, dialogues, tableaux / listes, skeletons, états vide et erreur ;
  - **motion** : démonstration de chaque token de durée / easing et des micro-interactions (§12), avec reduced-motion.
- Polices auto-hébergées dans `design/design-system/assets/fonts/`, crédits et licences notés.
- Le design system est **validé par l'utilisateur avant la maquette**. Un besoin nouveau pendant la maquette (composant, couleur) s'ajoute d'abord au design system, jamais directement dans une page.

## 7. Icônes

> Détail dans `references/ressources.md` : bibliothèques d'icônes autorisées. **À lire avant de choisir des icônes.**

## 8. Images

> Détail dans `references/ressources.md` : sources d'images gratuites, pages riches en images plutôt qu'en texte. **À lire avant de choisir des images.**

## 9. Fonds

- Fond blanc ou neutre plat par défaut. Un fond graphique (motif, texture, dégradé) seulement s'il vient du concept, avec parcimonie, jamais derrière du texte courant.
- Sites tech / logiciel : un seul fond « effet » (shader, grille animée) maximum par page.

## 10. Pas de look « généré par IA »

Refusé systématiquement **(interdit sauf demande explicite)** :

- halos, lueurs colorées, blobs flous, dégradés lumineux décoratifs, glassmorphism et `backdrop-filter` décoratifs ;
- **texte en dégradé** ; un seul mot du titre mis en couleur / italique / gras ;
- fonds beige / crème + serif + accent terracotta ; fond quasi noir + un seul accent vert acide ou vermillon ; fonds sombres saturés plein écran par défaut ;
- **eyebrow / kicker** en petites capitales au-dessus des titres ; labels en ALL CAPS espacées ;
- numéros de section `01 / 02 / 03` quand le contenu n'est pas une vraie séquence ;
- pages découpées en cartes identiques « icône + titre + texte », même rayon et même ombre grise partout ;
- gabarit « gros chiffre + petit label + stats + accent » ; hero centré + 3 cartes + CTA sans lien avec le métier ;
- barre colorée sur un seul côté d'une boîte arrondie ; ombres décalées dures (`4px 4px 0`) hors univers néobrutaliste ;
- métadonnées jointes par des points médians « A · B · C », libellés « MOT — fragment », `→` ajouté à chaque bouton ou lien ;
- police monospace comme déguisement « tech » (réservée au code et aux données) ;
- sparklines, anneaux de progression, rectangles arrondis vides à la place du vrai contenu ;
- illustrations génériques là où une photo réelle existe ; emojis, badges « ✨ Nouveau » ;
- le **même** fade-up générique copié sur chaque section (la motion doit être variée et écrite pour chaque section, §13) ; parallaxe sur du texte courant ; scroll-jacking ; effets tilt gratuits ; carrousels automatiques sans contrôle ;
- modale pour une tâche qui ne demande ni interruption ni focus protégé ;
- faux avis, faux clients, faux chiffres, logo réel redessiné.

Attendu : concept tiré du métier appliqué partout, photos réelles, hiérarchie claire, motion design captivant et varié sur les vitrines / sites / apps web, allégé sur les back-offices.

## 11. Copy (textes d'interface)

- Les textes sont du design : écrits avant la construction, en français, du point de vue de l'utilisateur.
- Le `h1` dit ce qui est proposé et pour qui (ou où), avec un fait concret sur le premier écran.
- Les titres nomment des choses ; les boutons = **verbe + objet** (« Enregistrer les modifications », pas « Valider ») ; deux actions maximum dans le hero ; une seule action principale par écran.
- Une action garde le même nom tout le parcours (« Publier » → toast « Publié »).
- Erreurs : nommer le problème et la solution, sans s'excuser, jamais vague. État vide = invitation à agir.
- Phrase simple, voix active, casse de phrase (pas De Majuscules Partout), pas de remplissage ni de formules marketing creuses.
- Rien d'inventé : pas de faux chiffres ni témoignages ; une info supposée est signalée à l'utilisateur.

## 12. Micro-interactions (toutes les pages)

Tokens (à mettre dans `@theme`) :

| Token | Valeur |
| --- | --- |
| `--duration-in` (hover entrée) | 150 ms |
| `--duration-out` (hover sortie) | 120 ms |
| `--duration-press` | 90 ms |
| `--duration-panel` (menu, drawer) | 200 ms ouverture / 120 ms fermeture |
| `--duration-image` | 600 ms entrée / 400 ms sortie |
| `--ease-out` (UI) | `cubic-bezier(.2, .8, .2, 1)` |
| `--ease-enter` (entrées) | `cubic-bezier(.22, 1, .36, 1)` |
| `--ease-in-out` (déplacements) | `cubic-bezier(.65, 0, .35, 1)` |

- **Bouton** : survol → fond un cran plus foncé + monte de 1 px ; clic → 1 px sous le repos et `scale(.985)`.
- **Carte cliquable** : monte de 2 px, bordure un cran plus foncée, ombre douce optionnelle au survol seulement. Carte non cliquable : immobile.
- **Photo cliquable** : zoom 1.02–1.03 dans son cadre (`overflow: hidden`), jamais d'assombrissement.
- **Lien** : soulignement qui se dessine de gauche à droite ; flèche éventuelle qui avance de 3 px.
- **Nav** : soulignement dessiné, page active marquée (`aria-current="page"`) ; panneau qui s'ouvre avec 6 px de descente.
- **Champ** : bordure couleur d'action + anneau doux de 3 px. **Focus** : anneau de 2 px visible, décalé de 2 px, jamais masqué par un header fixe.
- Survol uniquement pour `(hover: hover) and (pointer: fine)` ; tout fonctionne aussi au tap et au clavier.
- Sortie plus rapide que l'entrée (≈ 60–70 %) ; pas de rebond ni de dépassement sur l'UI ; animations interruptibles.
- Jamais d'animation de `width`, `height`, `top`, `left`, `margin`, `padding` : `transform`, `opacity` (et couleurs). `clip-path`, `filter` pour les révélations et les moments (§13).
- Retour visuel < 100 ms après un tap ; bouton désactivé + indicateur pendant un envoi.
- **Surfaces du navigateur thémées** : `::selection`, `caret-color`, scrollbars, `accent-color`, `text-underline-offset`.

## 13. Motion design avec GSAP

> Détail dans `references/motion.md` : recherche des effets dans les références, proposition des animations section par section à faire valider **avant de coder**, niveaux de motion (vitrines et sites : riche ; applications web : soignée ; back-offices : allégée), GSAP, Lenis. **À lire avant de proposer ou d'écrire la moindre animation.**

## 14. 3D avec Three.js

> Détail dans `references/motion.md` : Three.js pour la 3D. **À lire avant d'ajouter une scène 3D.**

## 15. Composants, navigation, états

### Composants récurrents (même soin que le contenu)

Boutons (primaire, secondaire, ghost, danger ; tailles ; état chargement) — une seule paire de styles de bouton par site. Champs avec label visible, aide et erreur sous le champ (jamais le placeholder comme label). Badges de statut, KPI cards, tableaux filtrables paginés (→ cartes sur mobile), drawers (création / édition / détail), dialogues de confirmation, filtres de période, onglets, toasts, pagination, fil d'Ariane, cookie banner (« Tout accepter » et « Tout refuser » au même poids). Un seul style de carte, de lien et de rayon par site.

### États de données

Chaque zone a un design pour : chargement (skeleton à la forme du contenu), rechargement discret, vide (icône + message + action), aucun résultat filtré, erreur (+ Réessayer), hors ligne, serveur injoignable. Implémentation : skill de la stack (`angular-sidy` §4).

### Navigation

- Vitrine : header clair, menu plein écran sur mobile (le bouton annonce son état), footer avec liens légaux et « Gérer les cookies ».
- Application web multi-pages : **barre de navigation en bas sur téléphone** (≤ 5 entrées, icône + libellé, safe area respectée), sidebar ou header sur desktop.
- Back-office : sidebar repliable + header avec recherche et profil.
- Retour arrière prévisible, liens profonds, lien d'évitement (« Aller au contenu ») en premier au clavier.

### Pages obligatoires

404 soignée (dans le concept, liens de retour), pages légales lisibles (sommaire ancré, largeur de lecture).

## 16. Responsive, accessibilité, performance

- Mobile-first, vérifié à **320, 375, 425, 768, 1024, 1440, 2560 px**. Aucun défilement horizontal, zoom jamais désactivé.
- Grands écrans : la mise en page s'étend proprement (grilles qui gagnent des colonnes, typo qui monte), pas un petit bloc perdu au centre ni des cartes étirées.
- Mobile : une colonne, textes avant images dans les blocs scindés, boutons pleine largeur, rien sous une barre fixe.
- Cibles tactiles ≥ 44 × 44 px avec ≥ 8 px entre elles ; `touch-action: manipulation`.
- Navigation clavier complète, ordre logique, focus visible, `tabindex` jamais > 0 ; titres sans saut ; labels associés.
- `prefers-reduced-motion` : tout se pose à l'état final, rien ne reste caché.
- Budget perf : poids transféré < 1.5 Mo, images totales < 1.2 Mo, JS < 450 Ko, CSS < 120 Ko, ≤ 2 familles de polices, **CLS < 0.1**, LCP < 2.5 s, ≤ 2 contextes WebGL, aucun module chargé sans être utilisé.

## 17. Sources d'inspiration

> Détail dans `references/ressources.md` : sites et dépôts de référence pour chercher des effets et des composants (ressources gratuites uniquement). **À lire avant de chercher de l'inspiration.**

## 18. Vérification visuelle avant livraison

L'utilisateur ne doit pas être celui qui trouve les défauts visuels. Quand l'environnement le permet (Playwright ou navigateur) :

- captures aux largeurs 390, 768, 1024, 1440 et 2560 (clair, et sombre si prévu), puis relecture critique ; corriger tout ce qu'une capture montre avant d'en refaire une ;
- capture au survol d'un bouton, d'une carte, d'une photo : le changement se voit ;
- rendu du front comparé à la maquette validée (§0 bis), écran par écran, mobile et desktop ;
- motion vérifiée contre le tableau validé (§13) : chaque section a bien l'animation, la raison et le déclencheur prévus, rien de lourd sur un back-office ; chaque moment GSAP vérifié au début, au milieu et à la fin du scroll, à 60 fps, et sous reduced-motion ; avec Lenis, ancres, clavier et reduced-motion vérifiés ; scène 3D vérifiée avec WebGL coupé (poster visible) ;
- checklist : fond blanc ✔ · images présentes là où elles captivent, pas de mur de texte ✔ · ressources toutes gratuites, licences images et polices notées ✔ · aucune couleur en dur ✔ · une seule bibliothèque d'icônes ✔ · contrastes AA ✔ · hiérarchie lisible en plissant les yeux ✔ · bords égaux ✔ · espacements réguliers ✔ · rien du §10 ✔ · hover / focus / disabled / loading / error / empty ✔ · textes réels, français sans faute ni débordement ✔ · titres longs, listes vides, noms sans espace testés ✔ · rien ne déborde à 320 px ✔ · cibles 44 px ✔ · budget perf ✔ ;
- si une vérification n'a pas pu être faite, le dire clairement et donner la commande à lancer.
