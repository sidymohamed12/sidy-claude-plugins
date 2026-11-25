# Uploads, cookies et stockage navigateur

Sous-sections de la section 3 du skill `angular-sidy`, déplacées ici sans modification (hors encadré ci-dessous) pour alléger le `SKILL.md`. À lire pour un envoi de fichier, un cookie, un thème mémorisé ou une authentification.

> **Upload et `withFetch()`.** Le backend `fetch` n'expose pas la progression d'envoi : avec `withFetch()` (base commune de `app.config.ts`), `reportProgress: true` ne donne pas de vraie barre sur les uploads. Pour un projet qui envoie des fichiers avec progression, ne pas activer `withFetch()` (backend XHR par défaut en Angular 21), ou le signaler à Sidy avant de livrer. En Angular 22, `withFetch()` est déprécié et la progression d'envoi demande `withXhr()`.

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
