# 0030 Rotate selection

## What

While Select is active, one or more polylines are selected, and points are not being edited, the selection rectangle grows a rotate handle. It is a circle, 8 px across, filled `#ffffff`, stroked 1 px in `#6965db`. Its center sits 16 px above the midpoint of the top edge, in screen pixels, so zoom does not pull it into the rectangle. Top is the greater Y. The circle stays that size when the sheet is zoomed. There is no stem.

A drag that starts on the circle rotates every selected polyline about the center of their shared point bounds. The 2 mm outset is not part of that center. The scene points update when the pointer goes up. Until then the overlay draws the strokes rotated in the stored width and `#1e1e1e`, and draws the selection rectangle rotated about that same center, solid or dashed as it already is. The circle rides the top edge of that rotating rectangle. Scale squares stay hidden for the drag. The static canvas omits those polylines for the drag.

Nothing stores an angle. On pointer up the new coordinates are the polylines, the same way a move or a scale replaces coordinates. The rectangle returns to the axis-aligned bounds of those points, and the circle returns to the top of that rectangle. That happens while the selection is still active.

Shift locks the rotation to 45° steps from the angle at pointer down. The handle starts on the vertical, which is already one of the ruler lines, so those steps land on 0°, 45°, 90°, and 135° from the position where the drag began. Releasing Shift during the drag returns to a free rotation before the pointer goes up. Shift during this drag does not use the move lock from 0013 or the aspect lock from 0014.

Alt during this drag does not copy. Stroke, width, `closed`, and group ids stay as they are. A press that moves less than 4 px does nothing. The rotate circle wins over a scale handle when the press is inside both. The interior of the rectangle still does not select or move.

## Out of scope

- A rotation field on the polyline, and a selection box that stays tilted after the pointer goes up.
- Steps other than 45°, such as 15°.
- A stem, an angle label, and a numeric angle.
- Alt-drag as a rotated copy.
- The rotate handle while point editing, and while the polyline tool is active.
- Rotating one member of a group without selecting it. A group still rotates as the selection it already is.

## Pitfalls

CONCEPT.md says rotate is not part of selection. This spec adds it. When it ships, that sentence describes the handle, the baked points, and Shift steps. The undo list gains this commit.

A stored angle is how Excalidraw keeps the handle where the last drag left it. This app's object is the points. SVG and GCode read those points. Move and scale already write new coordinates. An angle next to the points is a second description of the same geometry. Scale stretches in sheet X and Y. That stays honest only while the box is axis-aligned. A stored angle would make a later scale, or a point edit, rotate in a frame the points no longer match.

Keeping the tilt only until deselect is the same stored angle, held in the selection instead of on the polyline. The next scale or point edit would not know which frame to use. Pointer up is when the rectangle becomes axis-aligned again.

During the drag the overlay rotates the original rectangle. Recomputing the axis-aligned bounds on each move would move the handle out from under the gesture. On release the points are final, and the bounds are derived again, as they are after a scale. The outset is chrome and is not exported.

0013 locks a position onto four lines and says 45° is the only step. This drag locks the angle around the selection center onto those same steps. It does not add a 15° control. The snap is measured from pointer down, because there is no stored angle to snap to.

0009 reads Alt at the end of a move and copies. A rotate drag is not a move.

0006 and 0014 hide scale squares while points are edited. The circle stays hidden then too.

0027 rotates with the selection: every selected member, one center, group ids unchanged. The dashed rectangle rotates on the overlay and is dashed again around the new axis-aligned bounds.

0028 records a step only when the committed points differ. A rotate that lands on the start angle takes no step. The change goes through the commit in `src/ui/history.ts`.

ARCHITECTURE.md gives scale its own module and the ruler its own module. The angle, the 45° step, and the rotated points belong in `src/scene/rotate.ts`. The circle hit belongs next to the scale-handle hit. The overlay frame and `src/ui/sheet-pointer.ts` carry the drag. The module table gains the rotate row. No new library.

## Done when

- A selection that is not in point editing shows the circle above the top edge. Point editing shows neither the circle nor the scale squares.
- Dragging the circle rotates the selected polylines about the center of their point bounds. Several polylines, including a group, share that rotation. An unselected polyline is unchanged.
- On pointer up the points are the rotated coordinates. The rectangle is axis-aligned around those points, and the circle is at its top. Selecting that polyline again puts the circle at that top.
- Shift rotates in 45° steps from pointer down. Releasing Shift returns to a free rotation before pointer up.
- A press on the circle that moves less than 4 px does not change the points. Alt does not copy. Stroke, width, `closed`, and group ids stay as they were.
- The rotate is one undo step when the points change, and no step when they do not. Command+Z during the drag does nothing.
- CONCEPT.md's Selection and Undo sections describe this. ARCHITECTURE.md names `src/scene/rotate.ts`.
- Tests cover a free rotation, a 45° step, the handle hit, a group, and a zero rotation. `npm test` and `npm run build` succeed.
