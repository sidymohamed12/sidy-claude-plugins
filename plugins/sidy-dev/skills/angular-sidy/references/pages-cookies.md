# Pages obligatoires et cookies

Section 9 du skill `angular-sidy`, déplacée ici sans modification pour alléger le `SKILL.md`.

## 9. Pages obligatoires & cookies

- **404** (`features/not-found`) : route `**`, design soigné, liens de retour ; avec SSR, renvoyer un vrai statut 404.
- **Politique de confidentialité**, **Mentions légales**, **Politique cookies** dans `features/legal/`, liées dans le footer.

### Rédaction des pages légales : poser les questions d'abord

Ne jamais inventer d'informations légales. Avant de rédiger, poser ces questions (en un seul bloc, en sautant celles déjà connues) :

**Mentions légales**

- Éditeur : personne physique ou société ? Raison sociale, forme juridique, capital, NINEA / RCCM (ou SIRET/RCS hors Sénégal).
- Adresse du siège, téléphone, email de contact.
- Directeur de la publication.
- Hébergeur (nom, adresse, contact) : Netlify, Vercel, OVH, VPS…
- Concepteur / développeur du site à créditer ?
- Propriété des contenus, logos, photos (droits, crédits).

**Politique de confidentialité**

- Public visé : Sénégal uniquement (loi n° 2008-12, CDP) ou aussi l'Europe (RGPD) ?
- Données collectées : formulaires (contact, inscription, commande), comptes, paiement, géolocalisation, données de santé ou sensibles ?
- Finalités et bases légales (contrat, consentement, intérêt légitime, obligation légale).
- Durées de conservation.
- Destinataires et sous-traitants (hébergeur, emailing, paiement, analytics, SMS…) ; transferts hors du pays ?
- Responsable du traitement et contact pour exercer les droits (accès, rectification, suppression, opposition).
- Déclaration ou autorisation CDP effectuée ? Numéro de récépissé ?

**Cookies**

- Outils utilisés : analytics (Google Analytics, Matomo…), pixels publicitaires, chat, cartes, vidéos intégrées ?
- Cookies strictement nécessaires (session, auth, panier, langue, thème).
- Durée de validité du consentement souhaitée.

Ensuite, rédiger les pages à partir des réponses ; les infos manquantes restent en `[À COMPLÉTER : …]` bien visibles. Rappeler que le texte doit être validé par un juriste pour un projet sensible. Le contenu est structuré en données TS (sections, titres, paragraphes), avec date de dernière mise à jour et sommaire ancré. La politique cookies liste tous les cookies réellement posés par l'application (nom, finalité, durée).

### Consentement cookies

- `CookieConsentService` dans `core/cookie-consent/` : catégories (`necessaires` toujours actifs, `mesure`, `marketing`, `preferences`), état en signal, persistance dans un cookie (via `CookieService`) avec version et date, expiration (≈ 6 à 13 mois) puis re-demande.
- `CookieBannerComponent` dans `shared/` : « Tout accepter », « Tout refuser » (même poids visuel) et « Personnaliser » (modale avec toggles par catégorie), accessible clavier, responsive.
- Aucun script non nécessaire (analytics, pixels) chargé avant consentement : chargement dynamique conditionné par le service. Un cookie de préférence n'est posé que si la catégorie `preferences` est acceptée.
- Lien « Gérer les cookies » dans le footer pour rouvrir les préférences et retirer son consentement (suppression des cookies concernés).
- Les catégories affichées dépendent des réponses aux questions cookies ci-dessus.
