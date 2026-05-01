# Spring Boot 4 Migration Guide

## Contents
- [Overview](#overview)
- [System Requirements](#system-requirements)
- [Critical Considerations When Creating Spring Boot 4 Projects](#critical-considerations-when-creating-spring-boot-4-projects)
- [Major Changes from Spring Boot 3](#major-changes-from-spring-boot-3)
- [Migration Strategy](#migration-strategy)
- [Best Practices for Spring Boot 4 Projects](#best-practices-for-spring-boot-4-projects)
- [Configuration (YAML)](#configuration-yaml)
- [Performance](#performance)
- [Resources](#resources)

## Overview  

This guide covers the key changes in Spring Boot 4.0 and what to consider when creating new Spring Boot 4 projects.

**Release Date:** November 20, 2025 (4.0.0 GA)
**Major Version:** 4.0.x
**Based on:** Spring Framework 7.0, Jakarta EE 11

## System Requirements

> Scripts in this skill **prefer Spring Boot 4.x**. If start.spring.io still defaults to 3.x, they **fallback** to `springBootFallback` from `versions.json` with a warning. Override with `--boot-version`.

### Minimum Requirements

1. Java: 17+ (Java 25 recommended for production)
2. Kotlin: 2.2+ (if using Kotlin)
3. GraalVM: 25+ (for native images)
4. Jakarta EE: 11 baseline (Servlet 6.1+)
5. Gradle: 8.14+ or 9.x

### Key Version Upgrades

1. Spring Framework 7.0
2. Spring Data 2025.1
3. Spring Security 7.0
4. Hibernate 7.1
5. TestContainers 2.0
6. Jackson 3.0
7. Tomcat 11.0
8. Jetty 12.1

## Critical Considerations When Creating Spring Boot 4 Projects

⚠️ **Most Common Mistakes** - Always verify these when generating code:

### 1. Jackson 3 Annotations Stay in `com.fasterxml.jackson.annotation`

**✅ CORRECT - Annotations do NOT change package:**
```java
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonFormat;
```

**❌ WRONG - Do NOT use `tools.jackson.annotation`:**
```java
import tools.jackson.annotation.JsonProperty;  // This package doesn't exist!
```

**Only Jackson API classes change to `tools.jackson`:**
```java
import tools.jackson.databind.ObjectMapper;  // ✅ Correct for API classes
```

See "Jackson 2 to Jackson 3 Migration" section below for complete details.

### 2. TestcontainersConfiguration Must Be Package-Private

**✅ CORRECT - Package-private (no `public` modifier):**
```java
@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {  // No public!
    // ...
}
```

**❌ WRONG - Public modifier:**
```java
public class TestcontainersConfiguration {  // Wrong!
    // ...
}
```

This is a Spring Boot 4 requirement for test configurations.

### 3. TestContainers 2.x Artifact & Package Rename

**Gradle artifact renamed:**
```groovy
// ❌ WRONG (TC 1.x):
testImplementation 'org.testcontainers:postgresql'

// ✅ CORRECT (TC 2.x):
testImplementation 'org.testcontainers:testcontainers-postgresql'
```

**Class package renamed:**
```java
// ❌ WRONG (TC 1.x):
import org.testcontainers.containers.PostgreSQLContainer;

// ✅ CORRECT (TC 2.x):
import org.testcontainers.postgresql.PostgreSQLContainer;
```

The `junit-jupiter` artifact is no longer needed — TC 2.x integrates with JUnit 5 directly.

### 4. Always Set `mainClass` in `build.gradle`

Spring Boot 4's AOT processing may fail to auto-detect the main class.

**✅ CORRECT - Always set `mainClass` in `build.gradle`:**
```groovy
// Groovy DSL
springBoot {
    mainClass = 'com.example.app.MyAppApplication'
}
```
```kotlin
// Kotlin DSL (build.gradle.kts)
springBoot {
    mainClass.set("com.example.app.MyAppApplication")
}
```

Without it, Docker builds and native compilations will fail with:
```
Unable to find a suitable main class, please add a 'mainClass' property
```

---

## Major Changes from Spring Boot 3

### 1. Modular Architecture

Spring Boot 4 introduces a **new modular design** with technology-specific modules and starters.

**New Naming Convention:**
- Modules: `spring-boot-<technology>` (e.g., `spring-boot-graphql`)
- Root packages: `org.springframework.boot.<technology>`
- Starters: `spring-boot-starter-<technology>` (e.g., `spring-boot-starter-graphql`)
- Test starters: `spring-boot-starter-<technology>-test`

**Important:** Most technologies now have dedicated starters where they didn't before.

**For quick upgrades:** Use `spring-boot-starter-classic` to get all modules at once (but migrate away eventually).

### 2. Testing Changes

#### @WebMvcTest and @AutoConfigureMockMvc Package Change

**Critical:** Due to the modular architecture, `@WebMvcTest` and `@AutoConfigureMockMvc` moved to a new package and require a new test starter dependency.

**New dependency required:**
```groovy
testImplementation 'org.springframework.boot:spring-boot-starter-webmvc-test'
```

**Import change:**
```java
// OLD (Spring Boot 3):
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;

// NEW (Spring Boot 4):
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
```

> ⚠️ `spring-boot-starter-test` alone no longer provides `@WebMvcTest`. You **must** add `spring-boot-starter-webmvc-test`.

#### @MockBean and @SpyBean Deprecation

**Critical:** `@MockBean` and `@SpyBean` are **deprecated** and will be removed in future releases.

```java
// OLD (Deprecated):
import org.springframework.boot.test.mock.mockito.MockBean;

@SpringBootTest
class MyTest {
    @MockBean
    private UserService userService;
}

// NEW (Spring Boot 4):
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
class MyTest {
    @MockitoBean
    private UserService userService;
}
```

**For shared mocks across tests:**
```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@MockitoBean(types = {UserService.class, OrderService.class})
public @interface SharedMocks {
}

@SpringBootTest
@SharedMocks
class ApplicationTests {
}
```

#### Test Starter Changes

1. `@SpringBootTest` no longer provides MockMVC automatically — add `@AutoConfigureMockMvc`
2. `@SpringBootTest` no longer provides `TestRestTemplate` — add `@AutoConfigureTestRestTemplate`
3. `@WebMvcTest` and `@AutoConfigureMockMvc` moved to `org.springframework.boot.webmvc.test.autoconfigure` — requires `spring-boot-starter-webmvc-test`
4. Consider using new `RestTestClient` instead of `TestRestTemplate`

#### TestContainers 2.0

1. Required version: TestContainers 2.0+
2. Works seamlessly with `@ServiceConnection` annotation
3. **Artifact rename:** `org.testcontainers:postgresql` → `org.testcontainers:testcontainers-postgresql`
4. **Package rename:** `org.testcontainers.containers.PostgreSQLContainer` → `org.testcontainers.postgresql.PostgreSQLContainer`
5. `junit-jupiter` artifact removed — TC 2.x integrates with JUnit 5 directly
6. **`PostgreSQLContainer` is no longer generic** — use `PostgreSQLContainer` (not `PostgreSQLContainer<?>`)

### 3. Removed Features

#### Undertow Server
**Removed:** Spring Boot 4 requires Servlet 6.1, which Undertow doesn't support yet.
- Use **Tomcat 11** (default) or **Jetty 12** instead

#### Other Removals

1. Embedded executable jar launch scripts
2. Pulsar Reactive support
3. Spring Session Hazelcast (now maintained by Hazelcast team)
4. Spring Session MongoDB (now maintained by MongoDB team)
5. Spock integration (waiting for Groovy 5 support)

### 4. Jackson 2 to Jackson 3 Migration

**Major change:** Jackson 3 uses new group IDs and package names.

**Group ID changes:**
- Jackson 2: group `com.fasterxml.jackson.core`
- Jackson 3: group `tools.jackson.core`
- **Exception:** `jackson-annotations` still uses group `com.fasterxml.jackson.core`

**Package changes:**
- `com.fasterxml.jackson` → `tools.jackson`
- **IMPORTANT Exception:** `com.fasterxml.jackson.annotation` remains unchanged

**Critical: Common Jackson annotations DO NOT change:**
```java
import com.fasterxml.jackson.annotation.JsonProperty;      // ✅ Correct
import com.fasterxml.jackson.annotation.JsonIgnore;        // ✅ Correct
import com.fasterxml.jackson.annotation.JsonFormat;        // ✅ Correct
import com.fasterxml.jackson.annotation.JsonCreator;       // ✅ Correct
import com.fasterxml.jackson.annotation.JsonInclude;       // ✅ Correct
import com.fasterxml.jackson.annotation.JsonIgnoreProperties; // ✅ Correct

import tools.jackson.annotation.JsonProperty;  // ❌ WRONG — this package doesn't exist!
```

**What DOES change — Jackson API/core packages:**
```java
// OLD (Jackson 2):
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;

// NEW (Jackson 3):
import tools.jackson.databind.ObjectMapper;
import tools.jackson.core.JsonProcessingException;
import tools.jackson.databind.JsonNode;
```

**Rule of thumb:**
- **Annotations** (`@JsonProperty`, `@JsonIgnore`, etc.) → Keep `com.fasterxml.jackson.annotation`
- **API classes** (`ObjectMapper`, `JsonNode`, etc.) → Change to `tools.jackson`

**Spring Boot API changes:**
- `JsonObjectSerializer` → `ObjectValueSerializer`
- `JsonValueDeserializer` → `ObjectValueDeserializer`
- `Jackson2ObjectMapperBuilderCustomizer` → `JsonMapperBuilderCustomizer`
- `@JsonComponent` → `@JacksonComponent`
- `@JsonMixin` → `@JacksonMixin`

**Property changes:**
```yaml
# OLD:
spring.jackson.read.*
spring.jackson.write.*

# NEW:
spring.jackson.json.read.*
spring.jackson.json.write.*
```

**⚠️ Hibernate Bytecode Enhancer + Jackson 3 Gotcha:**

When using JPA entities with primitive fields (e.g., `boolean completed`), Jackson 3 will fail with:

```
JSON parse error: Cannot map `null` into type `boolean`
(set DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES to 'false' to allow)
```

This happens because Hibernate's bytecode enhancer generates a constructor that Jackson uses for "property-based" deserialization. When a JSON request omits a primitive field, Jackson maps it as `null` → `boolean`, which fails.

**Fix** — add to `application.yml`:

```yaml
spring:
  jackson:
    deserialization:
      fail-on-null-for-primitives: false
```

> **Note:** Field-level `@JsonSetter(nulls = Nulls.SKIP)` does NOT work here. The global property is required.

**Jackson 2 Compatibility:**
- Spring Boot 4 provides deprecated `spring-boot-jackson2` module for gradual migration
- Use `spring.jackson.use-jackson2-defaults=true` to align Jackson 3 behavior with Jackson 2

### 5. Web and REST Changes

#### HTTP Service Clients
New auto-configuration for HTTP Service Clients:
```java
@HttpExchange(url = "https://api.example.com")
public interface ApiService {
    @PostExchange
    Map<?, ?> call(@RequestBody Map<String, String> data);
}
```

#### API Versioning
Built-in API versioning support via `spring.mvc.apiversion.*` (MVC) or `spring.webflux.apiversion.*` (WebFlux).

#### HttpMessageConverters Deprecation
`HttpMessageConverters` is deprecated. Use instead:
- `ClientHttpMessageConvertersCustomizer` for client converters
- `ServerHttpMessageConvertersCustomizer` for server converters

### 6. Data Access Changes

#### Elasticsearch Client
- Low-level `RestClient` replaced with `Rest5Client`
- `RestClientBuilderCustomizer` → `Rest5ClientBuilderCustomizer`

#### MongoDB
Properties moved from `spring.data.mongodb` to `spring.mongodb` (host, port, database, uri, username, password, authentication-database, representation.uuid).

**New requirement:**
```yaml
spring:
  mongodb:
    representation:
      uuid: STANDARD
  data:
    mongodb:
      representation:
        big-decimal: DECIMAL128
```

#### Hibernate
- Hibernate 7.1 required
- `hibernate-jpamodelgen` renamed to `hibernate-processor`

#### Persistence Properties
`spring.dao.exceptiontranslation.enabled` → `spring.persistence.exceptiontranslation.enabled`

### 7. Messaging Changes

#### Kafka Streams
- `StreamBuilderFactoryBeanCustomizer` removed → use `StreamsBuilderFactoryBeanConfigurer`

#### Spring Retry Migration
`spring.kafka.retry.topic.backoff.random` → `spring.kafka.retry.topic.backoff.jitter`

`RabbitRetryTemplateCustomizer` split into `RabbitTemplateRetrySettingsCustomizer` and `RabbitListenerRetrySettingsCustomizer`.

### 8. Spring Batch

Spring Batch can now operate **without a database** (in-memory mode).

- `spring-boot-starter-batch` → simplified in-memory mode
- **To use database:** switch to `spring-boot-starter-batch-jdbc`

### 9. New Features

#### OpenTelemetry Starter
```groovy
implementation 'org.springframework.boot:spring-boot-starter-opentelemetry'
```
Auto-configures OpenTelemetry SDK for metrics and traces over OTLP.

#### Kotlin Serialization
```groovy
implementation 'org.springframework.boot:spring-boot-starter-kotlinx-serialization'
```

#### RestTestClient
New testing support — works with `MockMvc` in `@SpringBootTest` and with a running server for integration tests. Consider replacing `TestRestTemplate`.

### 10. Configuration Changes

#### Nullability Annotations
- Spring Boot 4 adds **JSpecify nullability annotations** — may cause compilation failures with null checkers or Kotlin
- Migrate from `org.springframework.lang` to JSpecify annotations

#### DevTools
- Live reload **disabled by default** — enable with `spring.devtools.livereload.enabled=true`

#### Logging
- Console logging can be disabled: `logging.console.enabled=false`
- Default charset harmonized with Log4j2: UTF-8 for files, console charset for console

#### Property Renaming
- `management.tracing.enabled` → `management.tracing.export.enabled`
- `spring.session.redis.*` → `spring.session.data.redis.*`
- `spring.session.mongodb.*` → `spring.session.data.mongodb.*`
- `management.metrics.mongo.*` → `management.metrics.mongodb.*`

### 11. Build and Deployment Changes

#### Gradle
- Gradle 9 now supported (8.14+ also works)
- Minimum CycloneDX plugin version: 3.0.0

#### AOP Starter
- `spring-boot-starter-aop` renamed to `spring-boot-starter-aspectj`
- Only add if you actually use AspectJ (`@Aspect` annotations)

#### OAuth2 / Security Starters
- `spring-boot-starter-oauth2-resource-server` → `spring-boot-starter-security-oauth2-resource-server`
- `spring-boot-starter-oauth2-client` → `spring-boot-starter-security-oauth2-client`
- `spring-boot-starter-oauth2-authorization-server` → `spring-boot-starter-security-oauth2-authorization-server`

#### Tomcat WAR Deployment
```groovy
// Change from:
providedRuntime 'org.springframework.boot:spring-boot-starter-tomcat'

// To:
providedRuntime 'org.springframework.boot:spring-boot-starter-tomcat-runtime'
```

### 12. Actuator Changes

- Liveness and readiness probes **enabled by default** — disable with `management.endpoint.health.probes.enabled=false`
- SSL health: `WILL_EXPIRE_SOON` status removed; expiring certificates listed in new `expiringChains` entry

## Migration Strategy

### For New Projects
1. ✅ Start with Spring Boot 4.0.x directly
2. ✅ Use Java 25+ for modern features
3. ✅ Use `@MockitoBean` from the start (not `@MockBean`)
4. ✅ Use technology-specific starters (not classic)
5. ✅ Plan for Jackson 3 API usage
6. ✅ Use TestContainers 2.0+

### For Existing Projects (Spring Boot 3 → 4)
1. Upgrade to latest Spring Boot 3.5.x first
2. Fix all deprecation warnings
3. Review dependency versions (especially Spring Cloud)
4. Use classic starters temporarily: `spring-boot-starter-classic` and `spring-boot-starter-test-classic`
5. Migrate `@MockBean` to `@MockitoBean`
6. Test thoroughly, then migrate away from classic starters

### Quick Migration Checklist

- [ ] Java 17+ (25 recommended)
- [ ] `mainClass` set in `build.gradle` / `build.gradle.kts` (required for AOT/native)
- [ ] Jakarta EE 11 / Servlet 6.1 dependencies updated
- [ ] Replace `@MockBean` with `@MockitoBean` in tests
- [ ] Update `@WebMvcTest`/`@AutoConfigureMockMvc` imports and add `spring-boot-starter-webmvc-test`
- [ ] TestContainers 2.0+ in use (`testcontainers-postgresql` artifact, `org.testcontainers.postgresql` package)
- [ ] No Undertow references
- [ ] Jackson 3 package names (or using compatibility mode)
- [ ] Technology-specific starters added where needed
- [ ] OAuth2 starters renamed
- [ ] Property names updated (tracing, session, persistence)

## Best Practices for Spring Boot 4 Projects

1. **Use Java 25+** for modern features and native image support
2. **Modular starters** — use technology-specific starters, not classic
3. **@MockitoBean** — adopt from the start, avoid deprecated `@MockBean`
4. **TestContainers 2.0** — use `@ServiceConnection` for simplified testing
5. **Jackson 3** — plan API usage with new package names
6. **Virtual threads** — consider enabling for IO-bound workloads (see [Performance](#performance))
7. **OpenTelemetry** — use new starter for observability
8. **Health probes** — leverage default liveness/readiness endpoints

## Configuration (YAML)

Prefer `application.yml` over `application.properties` — YAML supports nested keys and multi-document profiles without repetition.

### File location

```
src/main/resources/
  application.yml          ← base config (committed)
  application-dev.yml      ← dev overrides (committed)
  application-prod.yml     ← prod overrides (committed, no secrets)
```

Secrets go in `.env` (never committed). Spring Boot reads them via OS environment variables or a `.env`-loading mechanism. See [Project Setup & Dotfiles](PROJECT-SETUP.md).

### Activating a profile

```yaml
# application.yml
spring:
  profiles:
    active: dev   # override at runtime: --spring.profiles.active=prod
```

Or at runtime:

```bash
./gradlew bootRun --args='--spring.profiles.active=prod'
```

### Baseline application.yml

```yaml
spring:
  application:
    name: my-app
  profiles:
    active: dev

server:
  port: 8080

logging:
  level:
    root: INFO
    com.example: DEBUG
```

### Profile-specific overrides

```yaml
# application-dev.yml
spring:
  devtools:
    livereload:
      enabled: true

logging:
  level:
    com.example: DEBUG
```

```yaml
# application-prod.yml
server:
  compression:
    enabled: true
  http2:
    enabled: true

spring:
  threads:
    virtual:
      enabled: true

logging:
  level:
    root: WARN
```

### Multi-document YAML (single file alternative)

Use `---` to separate profiles in one file. Useful for small projects:

```yaml
spring:
  application:
    name: my-app
---
spring:
  config:
    activate:
      on-profile: dev
logging:
  level:
    com.example: DEBUG
---
spring:
  config:
    activate:
      on-profile: prod
logging:
  level:
    root: WARN
```

### Reading custom properties

Define typed config with `@ConfigurationProperties` (preferred over `@Value`):

```java
@ConfigurationProperties(prefix = "app")
public record AppProperties(String apiKey, int timeoutSeconds) {}
```

```yaml
# application.yml
app:
  api-key: ${APP_API_KEY}        # read from environment / .env
  timeout-seconds: 30
```

Register in the main class or a `@Configuration` class:

```java
@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class MyApplication { ... }
```

---

## Performance

Apply these *after* profiling. Measure with `spring-boot-starter-actuator` + Micrometer (`/actuator/metrics`, `/actuator/prometheus`).

### Virtual threads (JDK 21+, on by default on JDK 25)

IO-bound controllers, `@Async`, and `@Scheduled` tasks benefit the most.

```yaml
spring:
  threads:
    virtual:
      enabled: true
```

When enabled, do **not** also raise `server.tomcat.threads.max`. Avoid `synchronized` on hot paths that call blocking IO; prefer `java.util.concurrent.locks` so carrier threads aren't pinned.

### HTTP response compression

```yaml
server:
  compression:
    enabled: true
    mime-types: application/json,application/xml,text/html,text/css,text/plain,application/javascript
    min-response-size: 1KB
```

If a reverse proxy already compresses, leave this off to avoid double work.

### HTTP/2

```yaml
server:
  http2:
    enabled: true
```

Requires TLS in production.

### Tomcat tuning (platform threads only)

Only relevant when virtual threads are disabled:

```yaml
server:
  tomcat:
    threads:
      max: 200
      min-spare: 20
    accept-count: 100
    max-connections: 10000
```

### Observability for performance work

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    distribution:
      percentiles-histogram:
        http.server.requests: true
```

## Resources

- [Spring Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes)
- [Spring Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- [Spring Framework 7.0 Release Notes](https://github.com/spring-projects/spring-framework/wiki/Spring-Framework-7.0-Release-Notes)
- [Spring Security 7.0 Migration Guide](https://docs.spring.io/spring-security/reference/7.0/migration/)
- [Spring Data 2025.1 Release Notes](https://github.com/spring-projects/spring-data-commons/wiki/Spring-Data-2025.1-Release-Notes)
