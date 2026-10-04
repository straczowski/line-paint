# 0006 Edit points

## What

A person can change the points of one polyline from 0004.

While Select is active, a double-click on a polyline selects that polyline and edits its points. The overlay shows a handle on each point. A click on a handle selects that point. A click on another polyline selects it as a whole object and leaves point editing. A click on empty canvas clears the selection and leaves point editing.

Dragging a handle moves that point. The same rule as a move: the new position is overlay state until the pointer goes up, then the scene point updates. A point may land outside the sheet.

Backspace deletes the selected point. If no handle is selected, Backspace does nothing. If fewer than two points would remain, the polyline is removed, the selection clears, and point editing ends. After a delete that leaves two or more points, point editing stays on and no handle is selected.

The polyline tool does not edit points. A double-click while it is active places a point, as a click does.

## Out of scope

- A Delete key that removes the whole polyline.
- Undo, insert-point, and snapping a point to its neighbors.
- The open/closed toggle and Alt+drag duplicate.
- Escape as a way out. A click on empty canvas is the way out.

## Pitfalls

CONCEPT.md says double-click edits points, a point can be dragged, and Backspace deletes the selected point. It does not say what a one-point list becomes. Fewer than two points is not an object when a polyline is created. The same rule removes the object when a delete would leave fewer than two. Keeping a one-point element would invent a second kind of record.

CONCEPT.md does not bind Backspace to the whole object, and it does not mention the Delete key. A key that deletes the polyline is a different command. Backspace with no handle selected does nothing, so a stray key does not remove the drawing.

ARCHITECTURE.md keeps pointer moves off the static canvas. The dragged point is overlay state until release, same as a selection move.

How point editing ends is open in the docs. A click on empty canvas already clears the selection in 0004. That click is also the exit here. A second mode flag that survived a cleared selection would leave handles on nothing.

A handle hit wins over a segment hit. Otherwise a click on a vertex starts an object move instead of selecting the point. Reuse the 3 mm slop from 0004.

## Done when

- Double-click while Select is active shows a handle on each point of that polyline.
- Dragging a handle updates that point in the scene on release. During the drag, the static canvas keeps the previous point.
- Backspace deletes the selected handle's point. With no handle selected, the scene stays as it is.
- Deleting down to fewer than two points removes the polyline and clears the selection.
- A click on empty canvas clears the selection and removes the handles.
- While the polyline tool is active, a double-click adds a point and does not show handles.
- Tests cover point move, point delete, and removal below two points. `npm test` and `npm run build` succeed.
