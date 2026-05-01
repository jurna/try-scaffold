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
| `-h`, `--help` | Print usage and exit |

---

## Dependency reference

Open `https://start.spring.io/metadata/client` to browse all available dependency IDs and names. Each entry in `dependencies.values[].values[]` has an `id` (use with `--deps`) and a `name`.

---

## Generated project

| Setting | Value |
|---------|-------|
| Build tool | Gradle |
| Language | Java |
| Packaging | JAR |
| Dependencies | Specified via `--deps` |

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

---

## Validation

| # | What | Command |
|---|------|---------|
| 1 | Build | `./gradlew build` |
| 2 | Unit tests | `./gradlew test` |

> Run these steps first. Fix any failures before making further changes.
