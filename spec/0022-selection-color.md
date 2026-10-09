# 0022 Selection color

## What

A selected polyline is painted in the selected accent from DESIGN.md, `#6965db`, so it can be told apart from the lines around it.

This applies to one polyline and to several. The selection rectangle from 0004 and 0005 stays: one box around the selection, outset by 2 mm, a 1 px `#6965db` stroke, no fill, not a hit target. The accent stroke is drawn at the polyline's stored width, including the closing segment when `closed` is true.

The stored stroke does not change. Export and a later deselect paint that color again. Import can already bring a stroke other than `#1e1e1e`. Those stay stored too.

The accent is overlay paint. For as long as a polyline is selected, the static canvas omits it, and the overlay draws it in `#6965db`. Deselecting puts it back on the static canvas in its stored stroke.

While a move, scale, or point drag is in progress, the overlay draws that selection in `#6965db` at the dragged points. 0017 still applies: with Alt up, a move hides the strokes where they started; with Alt down, those originals stay on the static canvas in their stored stroke, and the moving copies stay `#6965db`.

A draft under the polyline tool is not a selection. It stays the default stroke. A marquee does not recolor a polyline until the pointer goes up and that polyline is selected.

## Out of scope

- Writing `#6965db` into the scene, or any control that changes the stored stroke.
- A thicker, dashed, or halo stroke. The width stays the stored width.
- A rectangle around each selected polyline. One box for the selection stays.
- Recoloring the marquee, handles, or scale handles. Those are already `#6965db`.
- Groups, rotate, and a stroke-color picker.

## Pitfalls

0005 removed the retrace 0004 used for several selected polylines, and left every selected stroke in its stored color under one rectangle. That is the picture this spec replaces. The rectangle, the 3 mm hit slop, and the empty box interior stay as those specs wrote them.

DESIGN.md names `#6965db` as the selected accent. The drawing blue `#1971c2` is a stroke color in the same table. Painting the selection in that blue would make a blue stroke look the same selected and unselected. The accent is violet, and it is not one of the five drawing strokes.

ARCHITECTURE.md paints selection on the overlay and says not to redraw every finished stroke on each pointer move. Putting the accent into `polyline.stroke` would export it. Omitting the selected ids from the static canvas is one redraw when the selection changes, the same kind of redraw 0017 uses when a move starts. Pointer moves during a drag still redraw only the overlay.

0017 paints a moving selection in the stored stroke. This spec paints that preview in `#6965db`. With Alt held, the original that stays behind is the stored stroke, so the copy under the pointer is the one in the accent.

## Done when

- One selected polyline, and several, are painted `#6965db` at their stored width. A closed polyline includes the return segment. The `#6965db` rectangle is still there.
- An unselected polyline stays its stored stroke. Deselecting restores that stroke on the static canvas.
- The scene stroke is unchanged. SVG and GCode export still write it.
- During a move, the overlay shows the selection in `#6965db` at the new position. Alt shows the originals in their stored stroke and the moving copies in `#6965db`.
- During a scale drag and a point drag, the moving stroke is `#6965db`.
- A draft and an in-progress marquee do not recolor polylines that are not selected yet.
- Tests cover the accent on a selected stroke, the stored color on an unselected one, and that a move with Alt keeps the original stroke. `npm test` and `npm run build` succeed.
