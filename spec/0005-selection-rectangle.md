# 0005 Selection rectangle

## What

When several polylines are selected, they show one rectangle around the whole selection. The blue stroke that 0004 draws along each of those polylines is gone. The stored stroke stays `#1e1e1e`.

One selected polyline already has this rectangle. 0004 defines it: axis-aligned bounds, outset by 2 mm, a 1 px `#6965db` stroke, no fill, and not a hit target. This spec uses that same rectangle for every point in the selection, one box for the union.

While a move of that selection is in progress, the overlay draws those polylines at the translated points in `#1e1e1e`, at their stored width, and draws the rectangle around those translated points. The static canvas keeps the previous points until release. After release, the overlay draws only the rectangle.

## Out of scope

- The single-polyline rectangle. That is 0004.
- Resize handles, rotate handles, scale, and rotate.
- A second rectangle around each polyline.
- Hitting, selecting, or moving by the box interior.
- Point handles, groups, and zoom.

## Pitfalls

0004 paints several selected polylines by retracing each one in `#6965db`. This spec replaces that paint with the one rectangle. The marquee, the click, the move, and the 3 mm slop stay as 0004 wrote them. One selected polyline stays as 0004 wrote it.

CONCEPT.md lists rotate and scale under Later. The rectangle is the frame those features would use. This spec does not build them. No handles, no transform mode, no extra element type. The box is derived from the selected ids when the overlay paints.

ARCHITECTURE.md says not to redraw every finished stroke on each pointer move. Dropping the blue stroke without a move preview would leave the lines in place until release. The overlay carries the translated strokes in the stored color, and the scene changes on release.

A box that is also a hit target would select a sparse polyline when the press lands in empty space inside the bounds. CONCEPT.md selects the polyline, not its bounds. The interior stays empty.

The outset is chrome. It does not move the stored points, and a later export must not write it.

Groups are still not this gesture. One rectangle around a list of ids is not a group.

## Done when

- Selecting several polylines shows one `#6965db` rectangle around all of their points, outset by 2 mm. Those polylines stay `#1e1e1e`, with no blue retrace.
- A click in the empty inside of that rectangle does not select or move a polyline. A click on a stroke still does.
- Dragging that selection still moves it on release. During the drag, the overlay shows the lines and the rectangle at the new position, and the static canvas keeps the previous points.
- One selected polyline still follows 0004.
- Tests cover the union bounds. `npm test` and `npm run build` succeed.
