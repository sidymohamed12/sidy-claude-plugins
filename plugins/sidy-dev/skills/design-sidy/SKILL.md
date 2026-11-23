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

- **Bibliothèques d'icônes (gratuites)** — en choisir **une seule par projet, jamais mélangées**, d'après le concept :

| Bibliothèque | Style | Licence / remarque |
| --- | --- | --- |
| [Phosphor](https://phosphoricons.com/) | 6 graisses (thin → fill, duotone), très complète | MIT |
| [Lucide](https://lucide.dev/icons/) | trait régulier 2 px, très complète, paquets Angular / JS / SVG | ISC |
| [Iconoir](https://iconoir.com/) | trait fin et régulier, `regular` / `solid` | MIT |
| [Heroicons](https://heroicons.com/) | outline / solid / mini, sobre (univers Tailwind) | MIT |
| [Feather](https://feathericons.com/) | trait minimal, petit jeu (~290 icônes) ; Lucide en est la suite plus complète | MIT |
| [Font Awesome](https://fontawesome.com/) | très large, dont marques | **Free** uniquement, jamais les styles Pro |
| [Iconify](https://icon-sets.iconify.design/) | moteur de recherche sur 200+ jeux | licence **propre à chaque jeu** : vérifier qu'elle est libre (MIT, Apache, ISC, CC BY…) ; ne prendre les icônes que dans le jeu retenu pour le projet |

- Un seul style dans la bibliothèque (ex. Phosphor `regular` + `fill` pour l'état actif ; Heroicons `outline` + `solid` actif), même graisse et même taille de trait partout.
- Vérifier que l'icône existe. **(interdit)** emojis ou glyphes Unicode à la place d'icônes.
- Logos d'outils / partenaires réels : leur vrai logo SVG dans ses couleurs, jamais un dessin approximatif.
- Icône seule → `aria-label` sur le contrôle ; icône décorative → `aria-hidden="true"`.

## 8. Images

- **Des images pour captiver, pas des murs de texte.** En construisant une page (vitrine, site, app web), mettre des images partout où elles aident à comprendre ou à donner envie : hero, sections de présentation, services, étapes, témoignages, équipe, réalisations, chiffres clés illustrés. Une section avec plus de ~3 paragraphes ou une liste longue sans visuel est à revoir : réduire le texte, ajouter une image ou découper. Pas d'image décorative sans rapport avec le contenu, et sur les back-offices seulement là où elle sert (états vides, avatars, aperçus).
- **Photos réelles du contexte** (lieux, équipes, produits, Sénégal) en priorité ; si aucune : photos de banque d'images du même type de chose, signalées comme provisoires à l'utilisateur, jamais présentées comme celles du client.
- **Où chercher les images (gratuites uniquement)** : [Pexels](https://www.pexels.com/fr-fr/), [Unsplash](https://unsplash.com/fr) (hors images « Unsplash+ »), [Pixabay](https://pixabay.com/), [Vecteezy](https://www.vecteezy.com/) (filtre « Gratuit », pas « Pro »), [PikWizard](https://pikwizard.com/) (images gratuites uniquement). [Shutterstock](https://www.shutterstock.com/fr/) est payant : seulement pour trouver une idée de cadrage, jamais pour une image utilisée ; si aucune image gratuite ne convient, le dire à l'utilisateur. Chercher avec des mots-clés précis du sujet (en français et en anglais, ex. « Dakar street », « African pharmacist », « wooden desk organizer »), privilégier des personnes et des lieux qui correspondent au public (Afrique de l'Ouest quand c'est le contexte), et garder un même traitement (lumière, couleurs, cadrage) sur toute la page.
- **Licence vérifiée pour chaque image** : gratuite pour usage commercial, sans filigrane ; respecter l'attribution quand elle est exigée (souvent sur Vecteezy et PikWizard). Jamais d'image premium, à filigrane ou en aperçu. Noter source, auteur et lien de chaque image (fichier `assets/images/CREDITS.md`).
- Télécharger, redimensionner et convertir les images (AVIF/WebP) dans `assets/images/` ; jamais de lien direct (hotlink) vers la banque d'images en production. Si le téléchargement est impossible depuis l'environnement, donner à l'utilisateur la liste des liens choisis avec l'emplacement prévu de chacune.
- Pas de légende qui décrit ou s'excuse sous une image ; crédits regroupés dans une ligne du footer.
- Traitement cohérent, ratios fixes par usage (`aspect-video`, `aspect-[4/3]`, `aspect-square`), `object-cover`. Pas de masque géométrique pour simuler un détourage : un vrai PNG/WebP détouré ou rien.
- Une même photo jamais deux fois sur la page.
- Perf : AVIF/WebP, `srcset` à 2× la largeur affichée max, hero < 400 Ko avec `fetchpriority="high"` (jamais lazy), autres < 250 Ko, `loading="lazy"` + `decoding="async"` sous la ligne de flottaison, `width`/`height` ou `aspect-ratio` sur chaque image. Photo sous la ligne de flottaison = `<img>`, pas un `background-image`.
- `alt` descriptif sur toute image porteuse de sens.

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

| Site | Pour quoi |
| --- | --- |
| [reactbits.dev](https://reactbits.dev/) | Animations de texte, fonds animés, composants interactifs |
| [uiverse.io](https://uiverse.io/) | Petits éléments HTML/CSS : boutons, loaders, toggles, cartes, inputs |
| [ui.shadcn.com](https://ui.shadcn.com/) | Composants sobres et accessibles ; référence ARIA / focus pour dialogues, menus, listes |
| [awwwards.com](https://www.awwwards.com/) | Direction artistique, mises en page, moments GSAP / Three.js primés |
| [21st.dev](https://21st.dev/) | Sections prêtes à l'emploi : hero, pricing, navbar, dashboard |
| [freefrontend.com](https://freefrontend.com/) | Exemples CSS/JS classés par type d'élément |
| [details.so/inspo](https://www.details.so/inspo) | Détails d'interface et micro-interactions de vrais produits, à étudier de près |
| [animata.design](https://animata.design/components) | Composants animés open source (texte, cartes, fonds, survols) |
| [hover.dev](https://www.hover.dev/components) | Composants animés (boutons, cartes, navigations, effets de survol) — **gratuits uniquement**, une partie du site est payante |
| [magicui.design](https://magicui.design/docs/components) | Composants animés open source (texte, marquee, bordures, fonds, effets) — pas les templates Magic UI Pro |
| [awesome-design-md](https://github.com/voltagent/awesome-design-md) | Exemples de `DESIGN.md` de vrais sites pour structurer le sien |

- Côté composants et effets : n'utiliser que les éléments **gratuits et open source** (reactbits, uiverse, shadcn/ui, freefrontend, animata, Magic UI, composants gratuits de 21st.dev et de hover.dev) ; écarter les composants, templates et blocs payants ou « Pro ». awwwards et details.so servent d'inspiration visuelle seulement.
- Source d'idées, **pas de code ni de signature à copier** : réécrire dans la stack du projet avec ses tokens, sans dépendance React, sans couleurs ni textes repris.
- Garder seulement ce qui sert le contenu (§10) ; respect de `prefers-reduced-motion` et du clavier.
- Vérifier la licence avant de reprendre du code quasi tel quel ; citer la source quand un composant s'en inspire directement.
- `skillui --url` sur un site de référence : pour analyser une structure (espacements, échelle typo), jamais pour cloner une marque.
- Si un site n'est pas accessible depuis l'environnement, travailler à partir de la description de l'effet et le dire.

## 18. Vérification visuelle avant livraison

L'utilisateur ne doit pas être celui qui trouve les défauts visuels. Quand l'environnement le permet (Playwright ou navigateur) :

- captures aux largeurs 390, 768, 1024, 1440 et 2560 (clair, et sombre si prévu), puis relecture critique ; corriger tout ce qu'une capture montre avant d'en refaire une ;
- capture au survol d'un bouton, d'une carte, d'une photo : le changement se voit ;
- rendu du front comparé à la maquette validée (§0 bis), écran par écran, mobile et desktop ;
- motion vérifiée contre le tableau validé (§13) : chaque section a bien l'animation, la raison et le déclencheur prévus, rien de lourd sur un back-office ; chaque moment GSAP vérifié au début, au milieu et à la fin du scroll, à 60 fps, et sous reduced-motion ; avec Lenis, ancres, clavier et reduced-motion vérifiés ; scène 3D vérifiée avec WebGL coupé (poster visible) ;
- checklist : fond blanc ✔ · images présentes là où elles captivent, pas de mur de texte ✔ · ressources toutes gratuites, licences images et polices notées ✔ · aucune couleur en dur ✔ · une seule bibliothèque d'icônes ✔ · contrastes AA ✔ · hiérarchie lisible en plissant les yeux ✔ · bords égaux ✔ · espacements réguliers ✔ · rien du §10 ✔ · hover / focus / disabled / loading / error / empty ✔ · textes réels, français sans faute ni débordement ✔ · titres longs, listes vides, noms sans espace testés ✔ · rien ne déborde à 320 px ✔ · cibles 44 px ✔ · budget perf ✔ ;
- si une vérification n'a pas pu être faite, le dire clairement et donner la commande à lancer.
