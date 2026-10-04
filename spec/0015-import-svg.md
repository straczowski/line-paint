# 0015 Import SVG

## What

A person can load a drawing from an SVG file, when that file is one this app exports or one line-weaver exports. Any other file is refused, and the drawing on screen stays as it is.

The top-left menu gains Import SVG as its last action, after Export GCode and Export SVG. It is a quiet text button, the same kind as the two export actions. Choosing it closes the menu and opens a file dialog limited to `.svg`. Canceling the dialog does nothing.

A pure function in `src/scene/` reads the file text. On success the UI replaces the scene with the imported polylines, clears the selection, and discards any draft. Each imported polyline gets a new id. On failure the scene is unchanged and a toast shows:

This SVG format is not suitable for line-paint. Only path elements are allowed.

The toast is a white island at the bottom center, 1rem above the window edge, with the island shadow and radius from DESIGN.md. The sentence uses Assistant at `0.875rem` in `#1b1b1f`. It has `role="alert"`. It leaves after 4 seconds. A later failure replaces it and starts the 4 seconds again. A successful import removes it at once. There is no close button.

The accepted document is the shape both writers share. The root is one `svg` element:

`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H" width="W" height="H" style="background: white">`

`W` and `H` are the same positive numbers in the viewBox and in the width and height attributes. The viewBox origin is `0 0`. This app writes `297` and `210`. Line-weaver writes the pixel size of the scaled image. Both are accepted. The children are only `path` elements, in order, or none. Insignificant whitespace is allowed. Attribute order is the order both writers use. A reordered attribute is refused.

Each path is:

`<path d="M x,y L x,y ..." stroke="COLOR" stroke-width="WIDTH" stroke-linecap="round" stroke-linejoin="round" fill="none" />`

The `d` value is one absolute `M` and then only absolute `L` commands. A command is a letter, a space, an x, a comma, and a y. A coordinate is an optional minus, digits, and an optional decimal fraction, which is how both writers print a number. Commands are separated by a space. `stroke-linecap` and `stroke-linejoin` are `round`. `fill` is `none`. `WIDTH` is a positive finite number. `COLOR` is the string the file contains.

The viewBox rectangle is fitted inside the sheet. One scale is `min(297 / W, 210 / H)`. The fitted rectangle is centered: the spare margin is split on the left and right, and on the top and bottom. There is no padding. File coordinates are Y-down. A stored point is:

- `x' = x * scale + (297 - W * scale) / 2`
- `y' = 210 - (y * scale + (210 - H * scale) / 2)`

Stroke width is multiplied by that same scale. The color is stored as written. A file whose viewBox is already `0 0 297 210` has scale `1` and no offset, so a line-paint export round-trips in place. The fit uses the viewBox, not the bounding box of the strokes. A small drawing in the corner of a 297 by 210 file stays in that corner.

When the last file point equals the first, the polyline is `closed` and that repeated point is not stored. Otherwise it is open. A path needs at least two stored points. One bad path, or any other element, refuses the whole file.

An empty accepted document, the open tag and `</svg>`, replaces the scene with no polylines and shows no toast.

Zod checks the parsed polylines before they enter the scene: finite points, a stroke string, and a positive finite width. A failed check is the same refusal as a bad file. No SVG library is added. The function does not use `DOMParser`, so the tests run in Node.

## Out of scope

- Line-weaver's 40 mm GCode padding, and flipping X.
- Fitting the bounding box of the strokes instead of the viewBox.
- `<line>`, `<polyline>`, `<polygon>`, `<rect>`, `<circle>`, curve commands, arcs, `Z`, relative commands, a second subpath, groups, transforms, and extra attributes.
- A second error sentence, a confirm before replace, undo, drag-and-drop, and paste.
- GCode import.
- Clipping imported points to the sheet. A point that was already outside the viewBox can still land outside after the fit. Export then omits that polyline, as in 0010.

## Pitfalls

CONCEPT.md lists import on Later, as the format line-weaver writes. This spec is that item. Export still does not scale. The fit exists only on the way in, so a line-weaver pixel file becomes millimeters on the sheet.

Both exporters write `<path>` elements. The toast names those. A file made of `<line>` or `<polyline>` tags is refused.

Line-weaver's `generateSvg` uses the scaled image's pixel size as the viewBox. Its GCode path then runs `scalePolylines`, which leaves 40 mm of padding and can flip X. This fit uses the full sheet and does not flip X. A wide image meets the left and right edges and sits centered vertically. A tall image meets the top and bottom and sits centered horizontally.

Line-weaver's stroke is `#000000`, which is not one of the five strokes in DESIGN.md. The color is stored anyway. Its stroke width is a pixel setting. Multiplying by the fit scale keeps that width in proportion to the picture. A 297 by 210 file keeps the width it had.

DESIGN.md has no toast. The island above is only the refusal sentence. It is not a preferences panel and not a second menu.

0010 flips Y only in the SVG writer. Import applies the fit, then the same flip, using the sheet height of 210. GCode is untouched.

There is no undo. Import replaces the drawing. A refused file must not clear it.

ARCHITECTURE.md names Zod for a file crossing the boundary. The XML check stays a direct read of this grammar. Zod checks the values that would become polylines. A general SVG parser would accept the formats this spec refuses.

A closed line-weaver path that does not repeat its first point stays open. Inventing a closing segment would add a line the file does not contain.

## Done when

- Import SVG is the last item in the top-left menu, after Export SVG. A chosen file of this app's export replaces the scene in the same place, with the same widths. Cancel, and a refused file, leave the scene in place.
- A line-weaver document with the same path grammar and a viewBox other than `0 0 297 210` imports fitted inside the sheet. One scale is used for both axes and for the stroke width. The spare margin is centered. X is not flipped.
- A closed export round-trips to `closed` without a duplicate stored point. An open one stays open. Stroke and width survive.
- A circle, a `<line>`, a curve, a group, a transform, an extra attribute, a reordered attribute, or a path with one point is refused. The toast shows the sentence above and then disappears.
- An empty accepted document clears the scene and does not toast.
- Tests cover the round-trip, a wide viewBox, a tall viewBox, the scaled width, a closed path, and each refusal above. `npm test` and `npm run build` succeed.
