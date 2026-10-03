# 03 — Keep Methods Small and at One Abstraction Level

Keep functions short and focused. Each function should speak at one level: either the big idea or the details, not both.

Bad:

```typescript
function publishArticle(article: Article) {
  if (!article.isValid()) {
    throw new Error('Invalid article')
  }
  db.save(article)
  sendEmailToSubscribers(article)
}
```

Good:

```typescript
function publishArticle(article: Article) {
  validateArticle(article)
  saveArticle(article)
  sendEmailToSubscribers(article)
}
```
