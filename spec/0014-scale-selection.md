# 0014 Scale selection

## What

While Select is active and one or more polylines are selected, and points are not being edited, the blue selection rectangle grows a white square on each corner. Each square is 8 px across, filled `#ffffff`, stroked 1 px in `#6965db`, and stays that size on screen when the sheet is zoomed. The four borders of the rectangle are stretch targets. There is no extra mark in the middle of a side.

A drag that starts on a corner scales every selected polyline inside the shared rectangle. A drag that starts on a border stretches them on that axis only: left and right change width, top and bottom change height. Top is the greater Y. The scene points update when the pointer goes up. Until then the overlay draws the scaled strokes in the stored width and `#1e1e1e`, the rectangle, and the squares. The static canvas omits those polylines for the drag, so the old and new lines are not both visible.

Without Alt, the opposite corner or the opposite edge stays put. With Alt, the center of the selection stays put, for a corner and for a border. Alt during this drag does not copy.

Shift while dragging a corner scales width and height by the same factor. Shift while dragging a border does not. Shift during this drag does not use the 45° ruler.

The drag cannot mirror. A side stops 1 mm before it would cross the fixed side. An axis that already has no extent, such as the height of a horizontal polyline, stays as it is.

A press that moves less than 4 px does nothing. The interior of the rectangle still does not select or move. A corner wins over a border, and either wins over a stroke underneath it. The pointer shows a resize cursor on a corner or a border.

## Out of scope

- Rotate, a rotate handle, and groups.
- A handle in the middle of a side, a numeric scale, and scaling the stroke width.
- Mirroring by dragging past the opposite side.
- Scale handles while point editing.
- The 45° ruler, and Alt as duplicate, during this drag.

## Pitfalls

CONCEPT.md lists scale under Later, next to rotate. This spec builds scale. Rotate stays later.

0004 and 0005 say the rectangle is not a hit target. The interior still is not. The corners and the borders are.

0009 reads Alt at the end of a move and copies. A scale drag is not a move. Alt fixes the center.

0013 reads Shift as the ruler on a draft segment, a point drag, and a move. A scale drag reads Shift as the aspect lock, and only on a corner.

0006 draws a handle on each point. Scale squares stay hidden then, so the two grabs do not overlap.

ARCHITECTURE.md keeps a drag off the static canvas until release. Hiding the selected polylines is one redraw when the scale drag starts, not a redraw on each move.

The 2 mm outset is chrome. The scale is applied to the points, and the outset is derived again. It is not exported. A flat axis has no points to pull apart.

The square size, the 1 mm stop, and the resize cursor are not in the docs. The squares match the point handles: fixed screen pixels, white fill, violet stroke. The stop is what keeps a drag from becoming a mirror. The cursor is the same grab, not a new control.

## Done when

- A selection that is not in point editing shows four white squares on the blue rectangle. Point editing shows the point handles and no squares.
- Dragging a corner scales the selected polylines about the opposite corner. Shift uses one factor for both axes. Alt keeps the selection center fixed. Several polylines share that transform. An unselected polyline is unchanged.
- Dragging a border changes only that axis. Shift does not bring the other axis along. Alt keeps the center fixed.
- Dragging past the opposite side does not mirror. The stored stroke, width, and `closed` flag stay as they were.
- A click in the empty inside of the rectangle still does not select or move. A press on a square or a border that moves less than 4 px does not change the points.
- Releasing Alt on a scale drag does not copy. Releasing Shift on a corner drag returns to a free scale before the pointer goes up.
- Tests cover corner scale, uniform scale, border stretch, center lock, the 1 mm stop, a flat axis, and handle hits. `npm test` and `npm run build` succeed.
