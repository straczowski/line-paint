# 05 — No Comments

A comment is a warning sign: the code may not say what it means. Comments also go stale. Prefer names, structure, and types that make the intent explicit.

Bad:

```typescript
// checks whether the phone number is valid
function check(t: string) {}
```

Good:

```typescript
function isValidPhoneNumber(phoneNumber: string) {}
```
