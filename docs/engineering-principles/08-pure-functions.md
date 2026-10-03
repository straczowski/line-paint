# 08 — Pure Functions

Prefer pure functions: same input, same output, no hidden side effects. They are easier to test and understand because dependencies are visible.

Guidelines:

- Pass time, randomness, and external data in as inputs.
- Separate calculation from I/O, database writes, and tracking.
- Do not mutate inputs; return new values.
- Use an options object when a function needs more than two parameters.

Bad:

```typescript
function greet(name: string) {
  return new Date().getHours() < 9 ? `Good Morning ${name}` : `Hello ${name}`
}
```

Good:

```typescript
function greet(name: string, date: Date) {
  return date.getHours() < 9 ? `Good Morning ${name}` : `Hello ${name}`
}
```
