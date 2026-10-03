# 02 — Top-Down Rule

Make TypeScript files readable in one downward pass: entry point first, helpers next, types last. Use this as an LLM checklist before and after editing.

Order:

1. Keep imports first.
2. Put the main entry point as the first executable declaration after imports:
   - the exported function, component, or handler callers use,
   - the exported ready-to-use constant when that is the public entry point,
   - the collection hook/function that config uses before its helpers.
3. List helpers in reading order, grouped by abstraction level:
   - orchestration before concrete step helpers,
   - builders, parsers, and formatters below the code that uses them,
   - low-level utilities last.
4. Put local `type` and `interface` definitions at the bottom, ordered by first use from the code above.
5. Keep implementation constants next to the helper that uses them. Keep constants near the top only when they are part of the public/high-level story.

Exception: keep a declaration earlier only when TypeScript syntax, framework loading, or an external API contract requires it. Mention that exception in the final summary.

```typescript
import { formatCurrency } from './format'

export function renderProductCard(product: Product): ProductCard {
  const offer = selectPrimaryOffer(product.offers)

  return { title: product.title, price: offer ? formatOfferPrice(offer) : '—' }
}

function selectPrimaryOffer(offers: Offer[]): Offer | undefined {
  return offers[0]
}

const CENTS_PER_EURO = 100

function formatOfferPrice(offer: Offer): string {
  return formatCurrency(offer.cents / CENTS_PER_EURO)
}

interface Product {
  title: string
  offers: Offer[]
}

interface ProductCard {
  title: string
  price: string
}

interface Offer {
  cents: number
}
```

Self-check: after refactoring, scan the file once for imports → entry point → helpers → nearby implementation constants → bottom types ordered by first use.
