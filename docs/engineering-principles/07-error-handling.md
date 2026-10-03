# 07 — Error Handling

Handle errors so failures are visible, useful, and not duplicated.

Rules:

- No silent failures: handle or log every error.
- One error, one log entry with message, context, and stack/error object.
- Do not use exceptions for normal control flow.
- Handle errors either at the top level or where recovery is possible; avoid scattered middle-layer catches.

Bad:

```typescript
try {
  publish(article)
} catch {
  // ignored
}
```

Good:

```typescript
try {
  publish(article)
} catch (error) {
  logger.error('Failed to publish article', { articleId: article.id, error })
}
```

If a lower-level step can recover safely, handle it there; otherwise let the top-level boundary log once.
