# Actuator, hooks de déploiement et Kubernetes

À lire pour tout déploiement, toute sonde, tout Actuator, tout manifeste. Le YAML Actuator de prod est celui de `infra.md` §1. Les fichiers à copier dans `deploy/k8s/` du projet sont dans `templates/k8s/`. On ne les réécrit pas de mémoire.

## 1. Actuator

Boot 4. Un `HealthIndicator` custom est dans `org.springframework.boot.health.contributor` (module `spring-boot-health`, tiré par le starter Actuator). Ne pas réintroduire `org.springframework.boot.actuate.health`.

| Groupe | Inclut | Rôle |
|---|---|---|
| `liveness` | `livenessState` seul | Le processus est vivant. Un Redis ou une base en panne ne doit **pas** redémarrer le pod |
| `readiness` | `readinessState`, `db`, `redis`, `diskSpace` | Le pod peut recevoir du trafic. Sinon il sort du Service |

- `management.endpoint.health.validate-group-membership` reste à `true` (défaut Boot 4). Un membre cité qui n'existe pas fait échouer le démarrage. `false` masque un groupe qui ne vérifie rien : interdit.
- `show-details: never`, `show-components: never`. Pas de second chemin (`/livez`, port de management séparé) : une seule surface, le port 8080.
- Exposition web : `health,info`. Jamais `*`, jamais `beans`, `env`, `configprops`, `heapdump`, `logfile`, `threaddump`.
- Chaîne de sécurité, **avant** `anyRequest().authenticated()`, premier motif gagnant :

```java
.requestMatchers(HttpMethod.GET, "/actuator/health/liveness", "/actuator/health/readiness").permitAll()
.requestMatchers("/actuator/**").denyAll()
```

`/actuator/health` (l'agrégat) et `/actuator/info` ne sont pas publics. `info` peut rester dans `exposure.include` : la chaîne le refuse quand même.

- `RateLimitFilter.shouldNotFilter` : vrai si le chemin commence par `/actuator/health/`. Une sonde en `429` fait tuer le pod.
- Le filtre `Sec-Fetch-Mode` ne couvre que `/api/**`. On ne déplace pas l'Actuator sous `/api`.
- Indicateur custom (dépendance métier) : composant nommé, ajouté à `readiness` seulement, et seulement s'il existe vraiment (sinon Boot 4 ne démarre pas). Jamais dans `liveness`.
- Pas de `server.servlet.context-path`. S'il y en a un, le chemin des sondes et celui des manifestes sont le même, et un test le prouve.

Arrêt : `server.shutdown=graceful` et `spring.lifecycle.timeout-per-shutdown-phase=30s` (déjà dans `application-prod.yml`). Au `SIGTERM`, Boot passe la readiness à `REFUSING_TRAFFIC` avant de finir les requêtes en cours.

Tests :

- `GET /actuator/health/liveness` et `readiness` sans authentification → `200` quand les dépendances sont là.
- `GET /actuator/health`, `/actuator/info`, `/actuator/beans`, `/actuator/env` → `403`.
- Le YAML de prod ne contient pas `beans`, `env`, `heapdump`, `configprops`, ni `include: "*"`.
- `validate-group-membership` n'est pas `false`.
- Un test de profil `migration` : `spring.main.web-application-type=none`.

## 2. Hooks de déploiement

Deux moments, pas un script dans le conteneur d'application.

**Avant le roll — migration.** L'app tourne avec `FLYWAY_ENABLED=false`. Le schéma est appliqué par un Job, même image, profil `prod,migration`, `FLYWAY_ENABLED=true`. Il doit se terminer avant que les nouveaux pods servent.

- Avec Helm : le Job porte les annotations `helm.sh/hook: pre-install,pre-upgrade`, `helm.sh/hook-weight: "-5"`, `helm.sh/hook-delete-policy: before-hook-creation,hook-succeeded`.
- Sans Helm : le pipeline fait `kubectl apply -f job-flyway.yaml` puis `kubectl wait --for=condition=complete job/app-flyway --timeout=180s`, et seulement ensuite le Deployment. Un Job en échec arrête le déploiement.

Profil `application-migration.yml` :

```yaml
spring:
  main:
    web-application-type: none
  flyway:
    enabled: true
```

`SchedulingConfig` est `@Profile("!migration")` (pas de fil non-démon qui retient la JVM). Classe `bootstrap/MigrationExit`, profil `migration`, `ApplicationRunner` qui appelle `SpringApplication.exit(context)`. Pas de `System.exit` (Sonar). Pas de `postStart` : une migration qui échoue dans un hook de conteneur laisse un pod à moitié démarré, sans dire que le schéma n'est pas passé.

**À l'arrêt — `preStop`.** Le kubelet retire le pod du Service avec un délai. `preStop` dort 10 s pour laisser ce délai, puis `SIGTERM`, puis les 30 s d'arrêt gracieux. `terminationGracePeriodSeconds: 45` (10 + 30 + marge). Descendre l'un sans l'autre coupe les requêtes en vol.

Pas d'autre hook. Pas de `postStart`. Pas de commande qui écrit en base dans le lifecycle du pod.

## 3. Manifestes

Copier `templates/k8s/` vers `deploy/k8s/`. Remplacer le namespace `app`, l'image `app-image:0.0.0`, les hôtes. `kubectl apply -k deploy/k8s`.

| Fichier | Rôle |
|---|---|
| `namespace.yaml` | Namespace `app` |
| `serviceaccount.yaml` | Compte sans jeton API (`automountServiceAccountToken: false`) |
| `configmap.yaml` | Profil `prod`, fuseau, `FLYWAY_ENABLED=false`. Aucun secret |
| `secret.example.yaml` | Noms de clés seulement. **Hors** de `kustomization.yaml`. Vraies valeurs via External Secrets ou Sealed Secrets, jamais commitées |
| `job-flyway.yaml` | Hook de migration |
| `deployment.yaml` | 2 replicas, non-root, filesystem en lecture seule, sondes, `preStop` |
| `service.yaml` | `ClusterIP` 8080. Pas d'autre port |
| `pdb.yaml` | `minAvailable: 1` |
| `networkpolicy.yaml` | Entrée 8080 (les sondes kubelet ne viennent pas d'un pod). Sortie : 5432, 6379, DNS. Un appel HTTPS sortant se décide dans un ADR, on n'ouvre pas tout l'egress |
| `kustomization.yaml` | Tout sauf le secret d'exemple |

UID du conteneur : celui de `USER app` dans l'image (`docker run --rm <image> id`), pas un nombre inventé. L'exemple Alpine est 100. Le verifier avant d'appliquer.

`readOnlyRootFilesystem: true` exige des `emptyDir` sur `/tmp` et `/var/log/app`. Pas de limite CPU (évite le throttling) ; mémoire limitée à 768 Mi, comme le compose prod, avec `MaxRAMPercentage=75` déjà dans l'image.

`maxUnavailable: 0`, `maxSurge: 1`. Un roll ne descend pas sous les replicas prêts.

## 4. Ce qu'on ne fait pas

- Exposer l'Actuator sur un second port « pour simplifier » sans chaîne de sécurité dédiée : sur Boot 4 ce port n'hérite pas de la `SecurityFilterChain` principale.
- Mettre `db` ou `redis` dans `liveness`.
- Lancer Flyway dans chaque pod **et** dans le Job.
- Committer un Secret avec de vraies valeurs, ou un `change-me` que quelqu'un applique tel quel.
- Pointer les sondes sur `/actuator/health`.
