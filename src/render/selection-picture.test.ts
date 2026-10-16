import { describe, expect, it } from 'vitest'
import {
  selectionPictureFits,
  selectionPicturePadPx,
} from './selection-picture'

describe('selectionPictureFits', () => {
  const tight = { minX: 0, maxX: 10, minY: 0, maxY: 10 }

  it('fits a selection inside the overlay and refuses one past it', () => {
    const pad = selectionPicturePadPx(0.3, 1)

    expect(
      selectionPictureFits(tight, 1, { width: 800, height: 600 }, pad),
    ).toBe(true)
    expect(selectionPictureFits(tight, 1, { width: 4, height: 4 }, pad)).toBe(
      false,
    )
  })
})
