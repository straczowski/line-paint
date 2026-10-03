# 06 — Locality Principle

Define variables, functions, and types close to where they are used. Nearby context reduces scrolling and makes related work visible.

Bad: compute every value up front, then use it later.

Good:

```typescript
const publishArticle = (title: string, body: string): void => {
  const slug = generateSlug(title)
  const readingTime = estimateReadingTime(body)
  storeArticle(slug, readingTime)

  const date = formatDate(new Date())
  logArticle(slug, readingTime, date)

  const picture = getPicture(slug)
  uploadPicture(slug, picture)
}
```
