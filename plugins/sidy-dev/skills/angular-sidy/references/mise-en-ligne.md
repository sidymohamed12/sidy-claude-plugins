# Mise en ligne d'un site public

Références ajoutées au skill `angular-sidy`. À lire avant de livrer ou de déployer un site public (vitrine, e-commerce, plateforme avec comptes). Un back-office privé n'a besoin que de HTTPS, des clés et des liens. Le SEO et le déploiement de base sont dans `seo-deploiement.md`, les pages légales et les cookies dans `pages-cookies.md`.

## 1. HTTPS forcé

- Toute requête en `http://` est redirigée en 301 vers `https://`, sur le domaine nu comme sur `www`. Netlify et Vercel le font seuls ; sur un VPS, le serveur web (Nginx, Caddy) porte la redirection.
- En-tête `Strict-Transport-Security: max-age=31536000; includeSubDomains` dans `_headers` ou la config du serveur. Pas de `preload` sans demande de Sidy (difficile à annuler).
- Aucun contenu mixte : toutes les URLs d'API, d'images, de polices et de scripts sont en `https://`, tirées de `@env/environment` ; `canonical` et `og:url` en `https://`. Cookies `Secure` en production.
- Contrôle : `curl -sI http://<domaine>` répond 301 vers `https://`, et la console du navigateur ne signale aucun contenu mixte.

## 2. Clés API hors du front

- **Tout ce qui est dans le bundle est public**, y compris les variables `NG_APP_*` (elles sont écrites dans le code au build). Le front ne contient donc que des identifiants publics : clé publique de paiement, identifiant d'analytics, clé de carte restreinte à ton domaine.
- Jamais dans le front : clé secrète de paiement, identifiants SMTP ou SMS, mot de passe de base de données, clé d'API d'un service payant sans restriction, jeton d'administration. L'appel passe par le back, qui garde la clé.
- Une clé publique est restreinte chez le fournisseur (domaines autorisés, API autorisées).
- Contrôles : `.env` dans `.gitignore` et absent de l'historique ; `grep -rEi "secret|private|api[_-]?key|password" dist/` ne trouve rien de sensible ; `.env.example` ne contient que des valeurs factices. Une clé trouvée dans le dépôt ou dans `dist/` est signalée à Sidy pour révocation, pas seulement retirée.

## 3. Image de partage réseau (Open Graph)

- `public/og-image.jpg` (ou `.png`) en **1200 × 630 px**, légère (idéalement moins de 300 Ko, pour que WhatsApp l'affiche), texte lisible en petit, marges de sécurité.
- Balises : `og:title`, `og:description`, `og:image` en URL absolue `https://`, `og:image:alt`, `og:url`, `og:type`, `twitter:card = summary_large_image`.
- Les robots des réseaux n'exécutent pas le JavaScript : sans SSR ni prerender, les balises posées côté client ne sont pas vues. Mettre des balises par défaut statiques dans `index.html`, et prerender ou SSR les pages à partager (voir `seo-deploiement.md`).
- Contrôle après déploiement : aperçu dans le débogueur de partage de Facebook, l'inspecteur de LinkedIn et un vrai message WhatsApp ; les réseaux mettent l'aperçu en cache, vérifier avant de partager largement.

## 4. Liens

- Liens internes en `routerLink`, jamais d'URL en dur vers son propre domaine ; liens externes avec `target="_blank"` et `rel="noopener noreferrer"`. Un lien a un texte explicite (« Lire les mentions légales », pas « cliquez ici »).
- Le footer relie les pages légales, les cookies et, s'il existe, les CGU.
- Contrôle : un vérificateur de liens sur le site construit ou déployé (par exemple `npx linkinator <url> --recurse`), zéro lien interne cassé, les externes cassés signalés. La page 404 existe et renvoie un vrai 404.

## 5. Page de CGU

À créer quand le site propose des comptes, des achats, des contenus publiés par les utilisateurs ou un service. Route `conditions-generales`, dans `features/legal/pages/cgu`, liée dans le footer et au formulaire d'inscription. Pour une vente en ligne, ajouter des CGV (conditions de vente).

Ne jamais inventer le contenu. Poser ces questions d'abord, en un seul bloc, en sautant celles déjà connues :

- Éditeur et service : qui édite, que propose le site, à qui il s'adresse (âge minimal) ?
- Compte : inscription, vérification, suspension ou suppression d'un compte ?
- Contenus des utilisateurs : qui en détient les droits, modération, contenus interdits ?
- Paiement et livraison, remboursement, rétractation (CGV) ?
- Responsabilité et garanties, disponibilité du service, force majeure ?
- Propriété intellectuelle du site et de ses contenus ?
- Droit applicable et tribunal compétent (Sénégal, autre) ? Médiation éventuelle ?
- Modification des conditions et information des utilisateurs ?
- Contact pour une réclamation ?

Les réponses manquantes restent en `[À COMPLÉTER : …]`, avec date de dernière mise à jour et sommaire ancré, comme les autres pages légales. Rappeler que le texte doit être validé par un juriste. À l'inscription : case **non cochée par défaut** avec lien vers les CGU, et le back enregistre la version acceptée et la date.

## 6. Anti-spam des formulaires

Le front ne protège pas à lui seul : toute vérification est refaite dans le back.

- **Champ piège (honeypot)** : un champ invisible (`aria-hidden="true"`, `tabindex="-1"`, `autocomplete="off"`, positionné hors écran, pas en `display: none` seul). S'il est rempli, le back rejette la demande sans message d'erreur explicite.
- **Délai minimal** : le back refuse un envoi arrivé quelques secondes après l'affichage du formulaire (horodatage fourni au chargement).
- **Limitation de débit** dans le back (déjà une règle du back : Redis). Le front gère la réponse `429` avec un message clair et le délai d'attente indiqué, et désactive le bouton pendant l'envoi.
- **Captcha** seulement si le spam persiste ou sur les formulaires sensibles (inscription, contact public) : Cloudflare Turnstile ou hCaptcha plutôt que reCAPTCHA. Chargé dynamiquement, et seulement après consentement s'il pose des cookies. Le jeton est validé par le back. Accessible au clavier et au lecteur d'écran.
- Pas d'adresse e-mail en clair dans le HTML quand un formulaire de contact suffit.

## 7. Search Console

À faire après le premier déploiement en production, par Sidy (son compte Google) ; l'agent prépare, il ne fait pas.

- Préparer : `sitemap.xml` accessible et à jour, `robots.txt` sans `Disallow` sur le site de production, aucun `noindex` sur les pages publiques. **Les environnements de recette et de préproduction restent en `noindex` et `Disallow: /`** ; contrôler que ce réglage ne passe pas en production.
- À faire par Sidy : ajouter le site comme propriété (de préférence « Domaine », par un enregistrement DNS TXT), envoyer l'URL du sitemap, demander l'indexation de l'accueil, relire les rapports d'indexation et de performances (Core Web Vitals) une semaine plus tard.
- Le rapport de l'agent liste ces étapes dans « À signaler ».

## Contrôle avant la mise en ligne

HTTPS redirigé et HSTS · aucune clé secrète dans le dépôt ni dans `dist/` · image de partage 1200 × 630 et balises complètes · aucun lien interne cassé, 404 correcte · CGU (si comptes, achats ou contenus) · anti-spam sur chaque formulaire public · sitemap et robots corrects, `noindex` seulement hors production · Search Console listée pour Sidy.
