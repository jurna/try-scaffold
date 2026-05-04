# OpenAPI 3.1 Type Reference

## Primitive types

| Concept | OpenAPI type | format | Notes |
|---|---|---|---|
| Text | `string` | — | |
| 32-bit integer | `integer` | `int32` | |
| 64-bit integer | `integer` | `int64` | Use for database IDs |
| Double-precision float | `number` | `double` | Avoid for money |
| Single-precision float | `number` | `float` | Avoid for money |
| High-precision decimal | `string` | — | Preserves precision; document format in `description` |
| Boolean | `boolean` | — | |
| Binary / file upload | `string` | `binary` | |
| Base64 bytes | `string` | `byte` | |
| UUID | `string` | `uuid` | |
| Date | `string` | `date` | ISO 8601 "2024-01-15" |
| Date + time | `string` | `date-time` | ISO 8601 "2024-01-15T10:30:00Z" — always UTC |
| Duration | `string` | `duration` | ISO 8601 e.g. "PT1H30M" |
| URI | `string` | `uri` | |
| Email | `string` | `email` | |

## Collections

| Concept | OpenAPI | Notes |
|---|---|---|
| List | `type: array, items: ...` | |
| Set (unique items) | `type: array, items: ..., uniqueItems: true` | |
| String-keyed map | `type: object, additionalProperties: <V schema>` | |
| Optional field | nullable T | `type: ["T", "null"]` — do not mark fields nullable unless they can genuinely be null in the response |

## Typing pitfalls to avoid

### Never use bare `number` for money or precision-sensitive values
Float types lose precision in JSON parsers. Use `type: string` and document the format:
```yaml
price:
  type: string
  description: Decimal string e.g. "19.99"
```

### Never use `int32` for database IDs
IDs commonly exceed 2^31 in production. Always use `int64`:
```yaml
id:
  type: integer
  format: int64
  readOnly: true
```

### Avoid `additionalProperties: true` on response schemas
It generates `[key: string]: unknown` in TypeScript and `Map<String, Object>` in typed languages — both are hard to consume safely. Model all known fields explicitly.

### Do not expose internal types as-is
Wrap or transform before surfacing in the API contract. Fields like raw DB timestamps, internal flags, or join columns rarely belong in a public schema.

---

## Common schema patterns

### Request vs Response separation
Keep request and response bodies as separate schemas even when similar. They diverge over time:

```yaml
CreateUserRequest:
  type: object
  required: [email, password, firstName, lastName]
  properties:
    email:
      type: string
      format: email
    password:
      type: string
      minLength: 8
      writeOnly: true
    firstName:
      type: string
      maxLength: 100
    lastName:
      type: string
      maxLength: 100

UserResponse:
  type: object
  required: [id, email, firstName, lastName, status, createdAt]
  properties:
    id:
      type: integer
      format: int64
      readOnly: true
    email:
      type: string
      format: email
    firstName:
      type: string
    lastName:
      type: string
    status:
      type: string
      enum: [PENDING, ACTIVE, INACTIVE]
    createdAt:
      type: string
      format: date-time
      readOnly: true
```

### `readOnly` / `writeOnly`
- `readOnly: true` — present in responses, never in requests (e.g. `id`, `createdAt`)
- `writeOnly: true` — present in requests, never in responses (e.g. `password`)

### Schema composition
**`allOf` — use for schema extension** (widely supported)
```yaml
Dog:
  allOf:
    - $ref: '#/components/schemas/Animal'
    - type: object
      properties:
        breed:
          type: string
```

**`oneOf` / `anyOf` / polymorphism — avoid**
Collapses to untyped in most codegen targets and is inconsistently supported across toolchains. Model variants as separate schemas and separate endpoints instead.

---

## HTTP status codes

| Situation | HTTP code |
|---|---|
| GET success | 200 |
| POST creates resource | 201 |
| Action with no response body | 204 |
| Validation failure | 400 |
| Not authenticated | 401 |
| Forbidden / wrong role | 403 |
| Not found | 404 |
| Conflict (e.g. duplicate) | 409 |
| Server error | 500 |

Always include 401 and 500 on secured endpoints. Add 400, 404, 409 where semantically applicable.

---

## Validation constraints

| Rule | OpenAPI constraint |
|---|---|
| Required field | add to `required` array |
| Non-empty string | `minLength: 1` |
| Length range | `minLength: 2, maxLength: 50` |
| Numeric minimum | `minimum: 0` |
| Numeric maximum | `maximum: 100` |
| Positive integer | `minimum: 1` |
| Email format | `format: email` |
| Regex | `pattern: "..."` |
