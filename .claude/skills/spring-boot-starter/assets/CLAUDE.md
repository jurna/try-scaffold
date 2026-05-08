# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```
./gradlew bootRun                     # Run the app
./gradlew bootTestRun                 # Run with test-time service connections (Testcontainers)
./gradlew test                        # Run all tests
./gradlew test --tests <FQN>          # Run a single test class or method
./gradlew bootJar                     # Build runnable jar
```

## Project structure

- **Feature-based packages.** Organise code by feature, not by layer. Each feature is its own subpackage containing its own `controller`, `service`, `repository`, and domain types — e.g. `roles/controller/RolesController.java`, `roles/service/RolesService.java`, `roles/repository/RoleRepository.java`, `roles/Role.java`. Do **not** create top-level `controllers/`, `services/`, or `repositories/` packages. Cross-cutting concerns (security, error handling, shared config) live under `config/` or a clearly shared package.

## Coding practices

- **Simplest solution wins.** Pick the most boring implementation that satisfies the requirement. No speculative abstractions, no "we might need this later" hooks, no patterns added for their own sake. If a plain method works, don't introduce a strategy/factory/wrapper. YAGNI.
- **SOLID, applied with judgement:**
  - *SRP* — a class/method does one thing. If you need "and" to describe it, split it.
  - *OCP* — extend behaviour by adding a new type, not by adding another `if` branch to a switch over an enum/type.
  - *LSP* — subtypes must be drop-in for their supertype; no surprise exceptions, no narrowed contracts.
  - *ISP* — prefer small, focused interfaces. Don't make callers depend on methods they don't use.
  - *DIP* — services depend on interfaces/abstractions, not concrete implementations; inject via constructor.
- **Constructor injection only** (Lombok `@RequiredArgsConstructor` on services). No field injection, no `@Autowired` on fields.
- **Immutability by default** — `final` fields, records for DTOs, unmodifiable collections returned from getters.
- **Fail fast at boundaries** — validate request DTOs with jakarta validation; trust internal calls.
- **Keep controllers thin** — controllers translate HTTP ↔ service calls. Business logic lives in services. Persistence lives in repositories.
- **No premature optimisation, no premature generalisation.** Duplicate twice before extracting; abstract on the third occurrence with a real reason.
