# 01 — Human First Code

Write code for human readers: teammates, reviewers, and your future self. Good code reads like a story: it says what happens, delays details until needed, and needs no mental translation.

Guidelines:

- Prefer clear names over abbreviations.
- Name functions with verbs.
- Hide complex boolean checks behind named predicates.
- Avoid regex when a clearer parser or helper is available.

Bad:

```typescript
if (!/^\S+@\S+\.\S+$/.test(e)) {
  throw 0
}
```

Good:

```typescript
if (!isValidEmail(subscriber.email)) {
  throw new Error('Invalid email address')
}
```
