# États de données et du template

Section 4 du skill `angular-sidy`, déplacée ici sans modification pour alléger le `SKILL.md`.

## 4. États de données et du template (obligatoire)

Toute zone qui affiche des données distantes (page, liste, tableau, carte KPI, détail, graphique, select alimenté par l'API) gère **tous** ces états. Aucun écran blanc, aucun spinner infini, aucune erreur silencieuse.

| État                  | Quand                                                                       | Affichage                                                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chargement`          | Premier chargement                                                          | **Skeleton** à la forme du contenu final (mêmes dimensions, même nombre de lignes/cartes), pas un spinner centré                                                                 |
| `rechargement`        | Refresh, filtre, pagination avec données déjà affichées                     | Données conservées + indicateur discret (barre fine, opacité réduite), pas de retour au skeleton                                                                                 |
| `succes`              | Données reçues                                                              | Le contenu                                                                                                                                                                       |
| `vide`                | Réponse OK mais aucune donnée                                               | Message explicite + icône + action utile (« Créer le premier… »). **Distinguer** « aucune donnée » de « aucun résultat pour ces filtres » (bouton « Réinitialiser les filtres ») |
| `erreur`              | 4xx/5xx, code métier                                                        | Message français clair (via la table des codes) + bouton « Réessayer » ; 403 → accès refusé, 404 → élément introuvable                                                           |
| `hors-ligne`          | Pas de connexion internet                                                   | Message « Vous êtes hors ligne » + nouvelle tentative automatique au retour du réseau                                                                                            |
| `serveur-injoignable` | Back qui ne répond pas (statut `0` avec réseau actif, timeout, 502/503/504) | Message « Le service ne répond pas, réessayez dans un instant » + « Réessayer » ; ne pas confondre avec le hors-ligne                                                            |

### Mise en œuvre

- Type commun dans `shared/models/` :
  ```ts
  export type EtatDonnees =
    | "chargement"
    | "rechargement"
    | "succes"
    | "vide"
    | "erreur"
    | "hors-ligne"
    | "serveur-injoignable";
  ```
  État calculé par un `computed()` (ou dérivé de `resource()` / `httpResource()` : `isLoading()`, `error()`, `value()`), jamais par une cascade de booléens (`isLoading`, `hasError`, `isEmpty`…).
- Classification centralisée de l'erreur dans `core/` (fonction `classerErreur(err): EtatDonnees`) : `navigator.onLine` faux → `hors-ligne` ; statut `0`, `TimeoutError`, 502/503/504 → `serveur-injoignable` ; le reste → `erreur` avec message métier.
- `NetworkService` dans `core/network/` : signal `enLigne` basé sur les événements `online` / `offline` (protégé SSR). Bandeau global discret « Hors ligne » dans le layout, et relance automatique des chargements en échec au retour du réseau.
- Composants réutilisables dans `shared/components/states/` : `skeleton` (variantes ligne, carte, tableau, KPI, détail), `etat-vide`, `etat-erreur` (avec `output()` réessayer), `etat-hors-ligne`, `etat-serveur-injoignable`. Les features les composent, sans réécrire ces états à chaque fois.
- Template : un seul `@switch (etat())` par zone de données, chaque cas traité explicitement.
- Granularité : chaque bloc indépendant a son propre état (une carte KPI en erreur ne bloque pas le reste du dashboard).
- Actions (création, édition, suppression) : bouton désactivé + indicateur pendant l'envoi, message de succès, erreur affichée sans perdre la saisie, aucun double envoi.
- `@defer` : toujours avec `@placeholder` / `@loading` (skeleton) et `@error`.
- Skeleton : animation sobre (`animate-pulse` ou shimmer CSS), respect de `prefers-reduced-motion`, compatible dark, `aria-busy="true"` sur la zone ; les états d'erreur et hors-ligne sont annoncés (`role="alert"` / `aria-live`).
