# Versions stables (référence nov. 2026)

Nouveau projet : s'aligner sur ce catalogue. Ne pas mélanger les majeures.

| Famille | Version | Règle |
|---|---|---|
| Spring Boot | **4.2.0** | parent ; Security 7.2, Jackson 3, Flyway, Lettuce, Testcontainers via BOM |
| Java | **25** (LTS) | image Temurin 25 |
| springdoc-openapi | **3.2.1** | ligne Boot 4.2 + Jackson 3 ; pas de 2.x |
| Bucket4j | **8.23.0** | `com.bucket4j:bucket4j_jdk17-core` + `bucket4j_jdk17-lettuce`, même numéro |
| ShedLock | **7.11.0** | `shedlock-spring` + `shedlock-provider-jdbc-template` |
| MapStruct | **1.6.3** | artefact + processor |
| Lombok | **1.18.48** | `provided`, processor avant MapStruct |

Jackson : **ne pas épingler**. Boot 4.2 apporte `tools.jackson`. Interdit hors migration écrite : `jackson-databind` 2.x, `jackson-datatype-jsr310`, `spring-boot-jackson2`.

Flyway :

```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    validate-on-migrate: true
    validate-migration-naming: true
    clean-disabled: true
    lock-retry-count: 50
    baseline-on-migrate: false
    out-of-order: false
    postgresql:
      transactional-lock: false
    placeholders:
      app_role: ${spring.datasource.username:app}
```

Prod : compte DDL `FLYWAY_*` ; idéalement one-shot `migrate` puis app avec `FLYWAY_ENABLED=false`.
