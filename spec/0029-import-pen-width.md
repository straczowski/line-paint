# 0029 Import pen width

## What

A polyline imported from SVG uses the same stroke width as one made with the drawing tool: 0.3 mm.

The file's `stroke-width` is still required, and it is still a positive number, so the accepted grammar from 0015 does not change. That number is not stored. Every imported polyline gets `widthMm` 0.3, the pen in `src/scene/polyline.ts`. A line-paint file and a line-weaver file both do this. A wide or tall viewBox still fits the points onto the sheet. The fit scale is not applied to the width.

Color, open or closed, and the fitted points stay as 0015 and 0021 describe. A successful import still appends one group. It is still the one undo step from 0028. The polylines in that step have the pen width.

## Out of scope

- A control for stroke width.
- Changing an imported color to the drawing-tool black.
- Restyling polylines already on the sheet. Only a new import uses the pen width.
- Dropping `stroke-width` from the file grammar, or refusing a file because of its width.
- Export. It still writes the width stored on the polyline.

## Pitfalls

0015 multiplies `stroke-width` by the fit scale so a line-weaver pixel stroke stays in proportion to the picture, and so a 297 by 210 file keeps the width it had. That is why an import looks thicker than the pen. This spec keeps the picture fit and drops the width part. A file that says `0.5` comes back as `0.3`. Color still round-trips.

Line-weaver's default stroke is 3 pixels of the image. Ignoring that number is the point. The painter already draws every polyline from its stored `widthMm`, so no second stroke style is added.

CONCEPT.md names import and does not say what width an imported polyline gets. One sentence there is enough. DESIGN.md does not set a millimeter width. Do not add a second constant.

`#000000` from line-weaver can still look a little heavier than `#1e1e1e`. That is color, not width.

## Done when

- Importing a line-paint file and a line-weaver file stores `widthMm` 0.3 on every polyline. A `stroke-width` other than 0.3 is accepted and stored as 0.3.
- Points, closed, and stroke color still follow 0015. The viewBox fit is unchanged.
- CONCEPT.md says an imported polyline uses the drawing tool's stroke width.
- Tests that expected a scaled or round-tripped width expect 0.3. `npm test` and `npm run build` succeed.
