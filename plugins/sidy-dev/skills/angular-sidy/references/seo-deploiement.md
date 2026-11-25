# SEO et déploiement

Sections 8 et 14 du skill `angular-sidy`, déplacées ici sans modification pour alléger le `SKILL.md`. À lire à la création d'un projet public, d'une page indexable ou avant un déploiement.

## 8. SEO (adapté au projet)

- `SeoService` dans `core/seo/` basé sur `Title` et `Meta` : title, description, canonical, Open Graph, Twitter Card, `robots`. Données par route via `data: { seo: {…} }` appliquées à chaque navigation.
- JSON-LD selon le type de projet (`Organization`, `LocalBusiness`, `Product`, `Article`, `BreadcrumbList`…).
- `index.html` : `lang="fr"`, meta par défaut, favicon, `theme-color`, preconnect fonts.
- `public/robots.txt` et `public/sitemap.xml` (URL de prod depuis l'environnement).
- Sans SSR, signaler à l'utilisateur que le SEO reste limité (rendu côté client) ; proposer le prerender si des pages publiques doivent être indexées.
- Back-offices / apps privées : SEO minimal + `noindex` global.
- Un seul `h1` par page ; `alt` sur toutes les images.

## 14. Déploiement

- Netlify (SPA sans SSR) : toujours `public/_redirects` avec `/*  /index.html  200`.
- Avec SSR : utiliser l'adaptateur adapté à l'hébergeur, pas de `_redirects` SPA.
- En-têtes de sécurité et de cache configurés côté hébergeur (`_headers` sur Netlify) : cache long pour les fichiers hachés, pas de cache pour `index.html`.
- Variables d'environnement de prod définies sur l'hébergeur, jamais commitées.
