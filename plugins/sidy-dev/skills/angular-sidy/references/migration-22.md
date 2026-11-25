# Migration Angular 21 → 22

À lire seulement quand Sidy demande de migrer un projet. Ne jamais lancer une migration de sa propre initiative.

## Méthode

1. Branche dédiée (`core/migration-angular-22`), build et parcours principaux verts avant de commencer.
2. `ng update @angular/core@22 @angular/cli@22`, puis relire le diff : la migration ajoute `ChangeDetectionStrategy.Eager` sur les composants qui n'avaient pas de stratégie explicite, pour garder leur comportement.
3. Prérequis : TypeScript 6 (5.9 n'est plus pris en charge) et Node 26.
4. Passer les composants de `Eager` à `OnPush` un par un, en vérifiant l'affichage ; chaque `Eager` restant est une dette à signaler.

## Points à revoir

- **HTTP** : le backend Fetch devient le défaut et `withFetch()` est déprécié ; `ng update` ajoute `withXhr()` là où une progression d'envoi est utilisée. Vérifier chaque upload.
- **Templates** : `?.` suit la sémantique JavaScript et renvoie `undefined` quand la chaîne s'interrompt (`$null(...)` pour l'ancien comportement) : relire les `@if` et les bindings qui comparaient à `null`.
- **Routeur** : les routes enfants héritent par défaut des paramètres de leurs parents ; relire les routes imbriquées qui lisent des paramètres.
- **SSR** : l'hydratation incrémentale est activée par défaut ; retirer `withEventReplay()` ; tester les pages avec `@defer`.
- **Services** : `@Service()` remplace `@Injectable({ providedIn: 'root' })` ; migration progressive, les deux coexistent.
- **Ressources et formulaires** : `resource`, `httpResource` et Signal Forms sont stables ; ne pas réécrire un formulaire Reactive Forms qui marche sans accord de Sidy.

Contrôles finaux : `ng build`, chunks lazy, parcours Playwright, tous les états de données, uploads, pages avec `@defer`. Rapporter ce qui n'a pas été exécuté.
