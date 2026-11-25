# Icônes, images et sources d'inspiration

Sections 7, 8 et 17 du skill `design-sidy`, déplacées ici sans modification pour alléger le `SKILL.md`.

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
