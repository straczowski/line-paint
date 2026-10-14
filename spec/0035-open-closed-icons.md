# 0035 Open and closed icons

## What

Open and Closed stay the two buttons from 0007 and 0008. The pictures change.

Open is an inline stroke in the same 16×16 language as the Polyline tool: round caps, `1.5` stroke, `currentColor`. The stroke runs through five points and stops, so the left side is missing. A filled dot sits on each free end.

```
M4 3.5 11 2.8 14 8 11 13.2 4 12.5
```

Closed is that same stroke with the left side drawn, and no dots.

```
M4 3.5 11 2.8 14 8 11 13.2 4 12.5Z
```

Each button stays `2rem`, the icon `1rem`, with `aria-label="Open"` or `aria-label="Closed"`. The pressed side still uses the selected-tool fill and still matches `closed`. Neither is a primary button.

Ellipse keeps `RiCircleLine`. Rectangle keeps `RiRectangleLine`.

The other icons stay. Menu is `RiMenuLine`. Select is the pointer. Polyline is the open zigzag. Shape is the rectangle outline. Finish is `RiCheckLine`. Duplicate is `RiFileCopyLine`. Group and Ungroup are the merge and split pair from 0031. Lock and Unlock are the lock pair. Delete is `RiDeleteBinLine`. The six align buttons are the `RiAlignItem*` glyphs from 0031. Distribute stays the three bars. Fit stays `RiFullscreenLine`.

## Out of scope

- Any icon except Open and Closed.
- When the two buttons show, and what a click stores.
- A second icon package.
- Tooltips.
- A polygon tool. A later shape gets its own icon.

## Pitfalls

0008 set Open to `RiRouteLine` and Closed to `RiCircleLine`, because Remix has no open-polyline glyph and no closed-polyline glyph. That is still true in `@remixicon/react` 4.9. There is no ellipse, polyline, polygon, or path glyph either. This spec replaces those two pictures. Do not edit 0008.

`RiRouteLine` is a map route: a U-turn, a destination dot, and an arrow. At `1rem` it reads as directions. `RiCircleLine` is now also Ellipse, from 0034. A circle on the selection island says "make this an ellipse." Closed means one more segment from the last point back to the first, which CONCEPT.md already states. The two new pictures are that stroke with and without the segment.

These remix stand-ins were rejected. `RiPentagonLine`, `RiTriangleLine`, `RiSquareLine`, and `RiRectangleLine` are shape primitives, and the rectangle and the circle are already tools. `RiLoopLeftLine`, `RiRefreshLine`, and `RiRepeatLine` are undo, reload, and repeat. `RiShareLine` is a share graph. `RiLink` and `RiLinkUnlink` are chain links. `RiShapeLine` and `RiShape2Line` are transform frames, which 0031 already refused for Group. `RiShapesLine` is a triangle, a circle, and a square, and at `1rem` it is noise, so the Shape tool stays the plain rectangle. `RiGitCommitLine` is a node on a line. Closing the Polyline tool's own zigzag crosses itself and reads as a scribble.

The closed picture is a five-sided loop, flat on the left. It is not a second shape tool. It sits on the selection island, next to the same stroke with the gap.

DESIGN.md already asks for an icon at `1rem` inside a `2rem` button, and for one primary button. Finish stays that button. ARCHITECTURE.md puts the icons in `src/ui/islands.tsx`. Select, Polyline, Shape, and Distribute are already inline SVGs. These two join them. No new library, and no new scene behavior. CONCEPT.md does not name glyphs, so it does not gain a sentence.

## Done when

- With one polyline selected, Open is the gapped stroke with a dot on each end, and Closed is that stroke joined.
- The pressed side still matches `closed`. Labels stay Open and Closed.
- Ellipse is still the circle. Rectangle is still the rectangle. Every other icon is unchanged.
- `npm test` and `npm run build` succeed.
