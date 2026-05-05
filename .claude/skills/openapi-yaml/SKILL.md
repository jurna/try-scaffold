---
name: openapi-yaml
description: Creates, updates, reviews, and validates OpenAPI 3.1 YAML files. Use this skill whenever the user wants to write or edit an OpenAPI spec, swagger file, API contract, or REST API YAML definition — even if they just say "write me an API spec", "add an endpoint to the spec", "create openapi yaml", "update the api contract".
---

# OpenAPI 3.1 — conventions and best practices

> No code generation — YAML only.
> For type mappings, validation constraints, HTTP status codes, and schema composition, read `references/types.md`.

## Output file

Always write the OpenAPI spec to `contract/openapi.yaml` (relative to the project root). Create the `contract/` directory if it does not exist.

## Mandatory: always validate after writing or editing

After every file write or edit, immediately run:

```
npx @redocly/cli lint <path-to-file>
```

Fix all **errors and warnings** before reporting the task as done. Never skip this step.

## Non-obvious rules

**Nullable — 3.1 dropped `nullable: true`**
```yaml
# correct
middleName:
  type: ["string", "null"]

# wrong — 3.0 only
middleName:
  type: string
  nullable: true
```

**IDs — always `string`**
```yaml
id:
  type: string
  readOnly: true
```

**Dates — use standard formats**
```yaml
birthDate:
  type: string
  format: date        # "2024-01-15"
createdAt:
  type: string
  format: date-time   # "2024-01-15T10:30:00Z" — always UTC
```

**Property names — `camelCase`** (predictable across serializers and codegen tools)

**Monetary / high-precision decimals — use `string`, not `number`**
```yaml
price:
  type: string
  description: Decimal string e.g. "19.99". Use string to avoid float precision loss.
```

## Error responses — RFC 7807 Problem Detail

Use RFC 7807 `application/problem+json` for all error responses. Define once in `components`, reference everywhere:

```yaml
components:
  schemas:
    ProblemDetail:
      type: object
      required: [type, title, status]
      properties:
        type:
          type: string
          format: uri
          default: "about:blank"
        title:
          type: string
        status:
          type: integer
        detail:
          type: string
        instance:
          type: string
          format: uri
        errors:
          type: object
          additionalProperties:
            type: array
            items:
              type: string

  responses:
    BadRequest:
      description: Validation failed
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetail'
    Unauthorized:
      description: Missing or invalid credentials
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetail'
    NotFound:
      description: Resource not found
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetail'
    InternalError:
      description: Unexpected server error
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetail'
```

## Pagination — consistent shape

Define `PageMetadata` once and reuse:

```yaml
PageMetadata:
  type: object
  required: [page, size, totalElements, totalPages]
  properties:
    page:
      type: integer
      minimum: 0
    size:
      type: integer
      minimum: 1
    totalElements:
      type: integer
      format: int64
    totalPages:
      type: integer
      minimum: 0

UserPage:
  type: object
  required: [content, page]
  properties:
    content:
      type: array
      items:
        $ref: '#/components/schemas/UserResponse'
    page:
      $ref: '#/components/schemas/PageMetadata'
```

## Review checklist

When reviewing, group findings as **Blocking** vs **Advisory**.

Blocking:
- `openapi:` must be `3.1.0`
- No `nullable: true` anywhere
- All `$ref` targets exist
- No bare `number` type for monetary/precision values

Advisory:
- Every operation has `operationId`, `summary`, `tags`
- Error responses use `ProblemDetail` + `application/problem+json`
- Date fields have `format: date` or `format: date-time`
- ID fields have `format: int64` or `format: uuid`
- Paginated endpoints return `PageMetadata`-compatible shape
- `readOnly`/`writeOnly` set where appropriate
- Security scheme defined; public endpoints set `security: []`
- Request and response schemas are separate types
