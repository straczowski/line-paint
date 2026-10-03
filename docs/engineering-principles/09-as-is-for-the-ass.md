# 09 — “as” Is for the Ass

Type assertions (`as`) bypass TypeScript's safety. Treat every assertion as a design smell and replace it with a real type, guard, parser, or schema.

Bad:

```typescript
const payload = data as { to: string; subject: string; body: string }
```

Good:

```typescript
type EmailPayload = {
  to: string
  subject: string
  body: string
}

function sendEmail(payload: EmailPayload) {}
```

For external data, validate before use. Prefer Zod schemas for JSON files, API responses, and other untrusted inputs.
