# 04 — Fail Early & Happy Path

Reject invalid states immediately, then keep the successful path flat and easy to scan. Avoid nested `if`, `else`, callbacks, and unnecessary `try/catch` blocks.

Bad: nested validation before work.

Good:

```typescript
function registerUser(user: User) {
  if (!user.email) {
    throw new Error('Email missing')
  }
  if (!isValidEmail(user.email)) {
    throw new Error('Invalid email')
  }
  if (userExists(user.email)) {
    throw new Error('User already exists')
  }

  saveUser(user)
  sendWelcomeEmail(user)
  return { success: true, userId: user.id }
}
```
