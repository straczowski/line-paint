# 0017 Hide original on move

## What

While Select is active and a move drag is in progress, the polylines being moved are not painted where they started. The overlay still draws them at the dragged position, and the selection rectangle follows those points, as in 0004.

Alt during that drag is the duplicate gesture from 0009. While Alt is held, those same polylines stay painted where they started, and the overlay still draws the moving copies. Pressing Alt shows the originals. Releasing Alt hides them again, before the pointer goes up. Alt at release still chooses copy or move.

A selection of several polylines hides or shows together. An unselected polyline stays where it is. Shift still locks the delta, as in 0013, and does not bring the originals back unless Alt is also held.

The scene still changes only when the pointer goes up.

## Out of scope

- A faded, dashed, or second-color copy of the original. With Alt up it is absent. With Alt down it is the stored stroke.
- Hiding during a marquee, a click, or a press that moves less than 4 px.
- Point editing and scale. Those drags already omit the polyline from the static canvas. Alt during a scale drag still does not copy.
- A duplicate button, a clipboard, or groups.

## Pitfalls

0004 keeps the previous points on the static canvas until release, so the start position and the overlay are both visible. That is the stroke this spec removes. The moving ids are omitted from the static canvas for the drag, the same way 0014 omits them during scale, unless Alt is held.

ARCHITECTURE.md says not to redraw every finished stroke on each pointer move. Hiding or showing is one static redraw when the move starts, and one more when Alt goes down or up during that move. Pointer moves still redraw only the overlay.

0009 reads Alt at release. The picture has to follow the key while the drag is going. If the original stayed up after Alt was released, the drop would move a stroke the person still sees in two places. If it appeared only after release, the drag would not show the copy.

0014 uses Alt to keep the selection center fixed. This spec does not paint the scale original back when Alt is held.

Point editing already hides the polyline whose point is moving. Alt during that drag does not copy, so that polyline stays hidden.

## Done when

- Dragging a selected polyline shows it only at the new position. The stroke at the start position is gone until release, when the scene holds the new points.
- Holding Alt during that drag shows the original stroke where it started and the moving stroke under the pointer. Releasing Alt hides the original again. Releasing the pointer with Alt held leaves the original and selects the copy. Releasing without Alt moves the original.
- Several selected polylines hide and show together.
- Shift during the move still locks the delta. The originals stay hidden unless Alt is also held.
- A scale drag and a point drag still omit the original, with or without Alt.
- Tests cover which ids a move hides, and that Alt keeps those ids on the static canvas. `npm test` and `npm run build` succeed.
