# create-basic-project.mjs Reference

> CLI arguments, defaults, and generated project structure for `scripts/create-basic-project.mjs`.

## Contents
- [Usage](#usage)
- [Arguments](#arguments)
- [Flags](#flags)
- [Dependency reference](#dependency-reference)
- [Generated project](#generated-project)
- [Quick start](#quick-start)
- [Validation](#validation)

---

## Usage

```bash
node scripts/create-basic-project.mjs [PROJECT_NAME] [GROUP_ID] [ARTIFACT_ID] [PACKAGE_NAME] [JAVA_VERSION]
```

All arguments are optional — defaults are applied for any omitted value.

---

## Arguments

| Position | Name | Default |
|----------|------|---------|
| 1 | `PROJECT_NAME` | `my-spring-boot-app` |
| 2 | `GROUP_ID` | `com.example` |
| 3 | `ARTIFACT_ID` | `<PROJECT_NAME>` |
| 4 | `PACKAGE_NAME` | `<GROUP_ID>.app` |
| 5 | `JAVA_VERSION` | `versions.json` → `javaVersion` |

---

## Flags

| Flag | Description |
|------|-------------|
| `--boot-version <x.y.z>` | Pin a specific Spring Boot version (default: latest stable 4.x) |
| `--deps <dep1,dep2,...>` | Comma-separated Spring Initializr dependency IDs |
| `--openapi-spec <path>` | Path to an existing OpenAPI spec; adds `io.openapiprocessor.openapi-processor` plugin to `build.gradle` (with `src/api/mapping.yaml`) and generates Spring controller interfaces and Java record DTOs at build time. The spec is referenced in-place — not copied. Auto-detected from `contracts/openapi.yaml`, `contract/openapi.yaml`, or `openapi.yaml` in the current directory if omitted. |
| `-h`, `--help` | Print usage and exit |

---

## Dependency reference

Fetch Web URL `https://start.spring.io/metadata/client` to browse all available dependency IDs and names. Each entry in `dependencies.values[].values[]` has an `id` (use with `--deps`) and a `name`.

---

## Default dependencies

**Always pass `--deps` explicitly when running the script.** If the user has not specified features, use the default list below.


| ID | Name |
|----|------|
| `web` | Spring Web |
| `data-mongodb` | Spring Data MongoDB |
| `lombok` | Lombok |
| `springdoc-openapi` | SpringDoc OpenAPI (Swagger UI) |
| `testcontainers` | Testcontainers |
| `validation` | Validation |
| `actuator` | Spring Boot Actuator |
| `devtools` | Spring Boot DevTools |

---

## Generated project

| Setting | Value |
|---------|-------|
| Build tool | Gradle |
| Language | Java |
| Packaging | JAR |
| Dependencies | Default set above, or `--deps` override |

The project is extracted into `./<PROJECT_NAME>/`.

---

## Quick start

```bash
node scripts/create-basic-project.mjs my-app com.acme
cd my-app
./gradlew bootRun
```

The app starts on `http://localhost:8080`.

Custom dependencies example:

```bash
node scripts/create-basic-project.mjs my-app com.acme --deps web
```

**With OpenAPI contract generation** — if `contracts/openapi.yaml`, `contract/openapi.yaml`, or `openapi.yaml` exists in the current directory, the plugin is configured automatically:

```bash
# Auto-detected from contract/openapi.yaml in the repo root
node scripts/create-basic-project.mjs my-app com.acme

# Explicit spec path
node scripts/create-basic-project.mjs my-app com.acme --openapi-spec path/to/openapi.yaml
```

The generated project's `build.gradle` will include the `io.openapiprocessor.openapi-processor` plugin and `src/api/mapping.yaml` (with `model-type: record`, `bean-validation: jakarta`). Running `./gradlew processSpring` (or `./gradlew build`) produces Spring controller interfaces and Java record DTOs under `build/openapi/java`, which are automatically on the compile classpath.

---

## Validation

| # | What | Command |
|---|------|---------|
| 1 | Build | `./gradlew build` |
| 2 | Unit tests | `./gradlew test` |

> Run these steps first. Fix any failures before making further changes.
