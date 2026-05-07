# Microsoft Social Login (single-tenant)

> Auto-generated OAuth2 login wiring for projects that include `security` in `--deps`. Restricts sign-in to one Entra ID tenant (your organization).

## Contents
- [Overview](#overview)
- [Generated files](#generated-files)
- [Entra ID app registration](#entra-id-app-registration)
- [Local environment variables](#local-environment-variables)
- [Why single-tenant](#why-single-tenant)
- [Opting out](#opting-out)
- [Validation](#validation)

---

## Overview

When `security` is in the resolved `--deps` list passed to `create-basic-project.mjs`, the bootstrap script also writes three files that wire up "Sign in with Microsoft" against the Microsoft Identity Platform using Spring Security `oauth2Login()`. Trade-offs baked into the recipe:

- **Single-tenant only** — only members of *your* Entra ID tenant can sign in. Microsoft enforces this at the authorization server; no Spring-side allow-list is needed.
- **`dev` profile only** — all OAuth2 client config lives in `application-dev.yaml`. The base `application.yaml` stays free of secrets and provider URIs. The app must be launched with `SPRING_PROFILES_ACTIVE=dev` (or `--spring.profiles.active=dev`); without it `oauth2Login()` has no `ClientRegistrationRepository` and startup fails fast.
- **One protected endpoint** — `/me` returns the OIDC user's name, email, and subject. Add your own protected endpoints alongside it.

---

## Generated files

| File | Purpose |
|------|---------|
| `src/main/resources/application-dev.yaml` | Microsoft client registration. Uses `issuer-uri: https://login.microsoftonline.com/${MS_TENANT_ID}/v2.0` so OIDC discovery handles all endpoints. |
| `src/main/java/<package>/config/SecurityConfig.java` | `SecurityFilterChain` bean: `permitAll` on `/error` and `/actuator/health`, everything else requires login, `oauth2Login()` redirects to `/me` on success. |
| `src/main/java/<package>/web/HomeController.java` | `@GetMapping("/me")` — returns `{name, email, subject}` from the `OidcUser` principal. |
| `src/test/resources/application.yaml` | Dummy OAuth2 client registration (no `issuer-uri`, points at `example.invalid`) so `OAuth2ClientAutoConfiguration` wires up during tests without contacting any IdP. |
| `src/test/java/<package>/MvcIntegrationTest.java` | Meta-annotation bundling `@SpringBootTest`, `@AutoConfigureMockMvc`, and `@Import(TestcontainersConfiguration.class)`. Lives in the root test package so it can `@Import` the package-private `TestcontainersConfiguration`. |
| `src/test/java/<package>/web/HomeControllerTests.java` | Three MockMvc tests: public `/actuator/health`, unauth `/me` redirects, authenticated `/me` via `oidcLogin()` — demonstrates the canonical spring-security-test pattern. |

`<package>` follows the project's `PACKAGE_NAME` (e.g. `com.example.app` → `com/example/app/`).

---

## Entra ID app registration

A one-time manual setup in the Azure portal. Do this before the first `bootRun`.

1. Open <https://entra.microsoft.com> → **Applications** → **App registrations** → **New registration**.
2. **Name**: anything recognizable (e.g. the project name).
3. **Supported account types**: choose **"Accounts in this organizational directory only (Single tenant)"**. This is what restricts login to your organization.
4. **Redirect URI**: select **Web**, enter `http://localhost:8080/login/oauth2/code/microsoft`. (`microsoft` matches the `registration.microsoft` key in `application-dev.yaml` — keep them in sync if you rename.)
5. Click **Register**, then on the Overview page copy:
   - **Application (client) ID** → `MS_CLIENT_ID`
   - **Directory (tenant) ID** → `MS_TENANT_ID`
6. Go to **Certificates & secrets** → **New client secret** → copy the secret **Value** (not the ID) → `MS_CLIENT_SECRET`.
7. **API permissions** — `User.Read` on Microsoft Graph is added by default; that is enough for the `openid profile email` scopes the recipe requests. No admin consent required.
8. For production: register a second redirect URI with the real hostname and add a `prod` profile with its own registration.

---

## Local environment variables

Copy the project's `.env.sample` to `.env` and fill in the three values from the registration step:

```bash
cp .env.sample .env
# then edit .env and set MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT_ID
# also set SPRING_PROFILES_ACTIVE=dev (already in .env.sample)
```

Source `.env` before running the app:

```bash
set -a && source .env && set +a
./gradlew bootRun
```

> ⚠️ The `.env` file contains real secrets. Do not `cat`, view, print, or log its contents — only `.env.sample` (placeholders) may be read or displayed.

---

## Testing

Tests do **not** activate the `dev` profile, so they cannot use `application-dev.yaml`. Instead, `src/test/resources/application.yaml` provides a dummy `test-microsoft` registration that satisfies `OAuth2ClientAutoConfiguration` without contacting any IdP — the URIs point at `example.invalid` and are never called because `oidcLogin()` injects a synthetic `OidcUser` directly into the `SecurityContext`.

Mirror the controller's package when adding new tests; reuse the generated `@MvcIntegrationTest` meta-annotation:

```java
@MvcIntegrationTest
class MyControllerTests {

    @Autowired MockMvc mockMvc;

    @Test
    void protectedEndpoint() throws Exception {
        mockMvc.perform(get("/some-path").with(oidcLogin().idToken(t -> t
                .subject("sub-1").claim("name", "Test").claim("email", "t@x"))))
            .andExpect(status().isOk());
    }
}
```

`@MvcIntegrationTest` handles `@SpringBootTest` + `@AutoConfigureMockMvc` + Testcontainers wiring. Use `oidcLogin()` from `org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors` for authenticated requests — it bypasses the OAuth2 flow entirely.

---

## Why single-tenant

Pinning `MS_TENANT_ID` in the `issuer-uri` means Microsoft itself rejects users from other tenants (or personal accounts) before they ever reach the app — the user sees `AADSTS50020` ("user does not exist in tenant"). No allow-list code in Spring is needed; if you ever need to expand to other tenants, switch the issuer to `/common/v2.0` and add explicit tenant validation in an `OidcUserService`.

---

## Opting out

The script generates these files **only** when `security` is in `--deps`. To skip social login entirely, pass a deps list without `security`:

```bash
node scripts/create-basic-project.mjs my-app com.acme --deps web,actuator,validation
```

Resulting project has no `SecurityConfig`, no `HomeController`, and no `application-dev.yaml`. (`.env.sample` still contains the `MS_*` placeholder lines as documentation; they are inert.)

---

## Validation

| # | What | How |
|---|------|-----|
| 1 | Files exist | `ls src/main/java/<package>/config/SecurityConfig.java` |
| 2 | Compiles | `./gradlew compileJava` |
| 3 | Profile activates | Start with `SPRING_PROFILES_ACTIVE=dev`; the banner shows `The following 1 profile is active: "dev"` |
| 4 | Tenant-specific redirect | Hit `http://localhost:8080/me` → browser is redirected to `login.microsoftonline.com/<your-tenant-guid>/...` (note the GUID, **not** `/common/`) |
| 5 | Org-only enforcement | Sign in with a personal Microsoft account → Microsoft rejects with `AADSTS50020` |
| 6 | Authenticated `/me` | Sign in with an org account → `/me` returns `{"name":..., "email":..., "subject":...}` |
| 7 | Public endpoints | `curl http://localhost:8080/actuator/health` returns `200` while signed out |

> If startup fails with `NoSuchBeanDefinitionException: ClientRegistrationRepository`:
> - Running the app: you forgot `SPRING_PROFILES_ACTIVE=dev`.
> - Running tests: `src/test/resources/application.yaml` is missing or malformed.
