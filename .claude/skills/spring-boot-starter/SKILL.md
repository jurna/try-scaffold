---
name: spring-boot-starter
description: "Creates a basic Java + Spring Boot project with Gradle, project setup (dotfiles, devcontainer), and REST API. Use when bootstrapping a Spring Boot application."
---

# Spring Boot skill

## Overview
This agent skill helps you create basic Spring Boot projects using Spring Boot best practices. It provides a script to bootstrap Spring Boot applications using [https://start.spring.io](https://start.spring.io).

## Version Management

Centralized versions live in `versions.json`. Scripts read from it via `scripts/lib/versions.mjs`. Update this file to bump Java, Spring Boot fallback, etc.

## Prerequisites

1. Java 25 installed
2. Node.js 24.x (to run the bootstrap script)

## Basic Spring Boot Project

Read [CREATE-BASIC-PROJECT.md](references/CREATE-BASIC-PROJECT.md) for full CLI usage, arguments, flags, default dependencies, and generated project structure.

## OpenAPI Contract Generation

If an `openapi.yaml` is found at `contracts/openapi.yaml`, `contract/openapi.yaml`, or `openapi.yaml` in the current directory, the bootstrap script automatically adds the `io.openapiprocessor.openapi-processor` Gradle plugin to `build.gradle` and writes `src/api/mapping.yaml`. The `processSpring` task generates Spring controller interfaces and Java record DTOs into `build/openapi/java`. The spec is referenced in-place — it is not copied into the generated project. Pass `--openapi-spec <path>` to provide an explicit path.

## Best Practices

When creating Spring Boot projects:

1. **Review Spring Boot 4 critical considerations**: See [Spring Boot 4 Migration Guide](references/SPRING-BOOT-4.md) for Jackson 3 annotations and TestContainers configuration
2. Include Spring Boot Actuator for production-ready features
3. Foundational dotfiles are applied automatically by the bootstrap script (`.gitignore`, `.env.sample`, `.editorconfig`, `.gitattributes`, `.vscode/`, `.devcontainer/`) - see [Project Setup & Dotfiles](references/PROJECT-SETUP.md)
   - The `.env` file is the canonical location for local secrets; instruct users to copy `.env.sample` → `.env` and fill in real values
   - **NEVER read or expose `.env`**: it contains real secrets — do not `cat`, view, or print its contents; only `.env.sample` (placeholder values) may be read or displayed
5. Include Spring Boot DevTools for development productivity
7. The user must review changes before they are committed to git. Ask the user before initializing a Git repository, or running git commands.

## Validation

| # | What | Command |
|---|------|---------|
| 1 | Build | `./gradlew build` |
| 2 | Unit tests | `./gradlew test` |

> Run validation steps first. If anything fails, fix before proceeding.

## Additional Resources

- [Project Setup & Dotfiles](references/PROJECT-SETUP.md) - `.gitignore`, `.env.sample`, `.editorconfig`, `.gitattributes`, `.devcontainer/`
- [Spring Boot 4 Migration Guide](references/SPRING-BOOT-4.md) - Key changes from Spring Boot 3, Jackson 3 annotations
- [create-basic-project.mjs Reference](references/CREATE-BASIC-PROJECT.md) - CLI args, defaults, generated structure, dotfiles applied
