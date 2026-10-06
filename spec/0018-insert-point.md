# 0018 Insert a point

## What

While Select is active and a polyline is already in point editing, a double-click on one of its segments adds a point on that segment.

Point editing is the mode from 0006: handles are showing because that polyline was double-clicked. The double-click that enters that mode does not add a point. A later double-click does, and only on the polyline being edited.

The new point is the closest point on the segment to the pointer, so a click inside the 3 mm slop from 0004 stays on the stroke. It is inserted between that segment's endpoints. The polyline keeps its id, order of the other points, `closed` flag, stroke, and width. Point editing stays on, and the new handle is the selected one.

A closed polyline includes the return segment. A double-click there inserts the point after the last stored point, and the return segment runs from that new point back to the first.

A double-click on an existing handle does not add a point. A double-click on a different polyline enters point editing on that one, as in 0006, and does not insert. A double-click on empty canvas does nothing. The polyline tool still treats a double-click as a click that places a draft point.

## Out of scope

- A toolbar button, a keyboard shortcut, or a menu command for the same insert.
- Splitting one polyline into two, or inserting a point that is not on an existing segment.
- Undo, snapping, and the Shift ruler. The inserted point is the projection, not a locked angle.
- Changing what Backspace and the trash button delete.

## Pitfalls

CONCEPT.md says a double-click edits points, a drag moves one, and Backspace deletes the selected point. It does not say a double-click adds a point. 0006 lists insert-point as out of scope. This spec is that insert, and only after point editing is already on. Using the entry double-click for both jobs would add a point every time someone opened the handles.

A double-click is also two clicks. The second click, if it stays under the 4 px threshold, already selects the polyline and keeps point editing when the hit is that same polyline. The insert runs on the double-click and must not also move the polyline.

0006 gives a handle hit priority over a segment hit, with the same 3 mm slop. That still holds. A double-click whose closest vertex is inside that slop selects the handle's click and does not insert a second point on top of it. If the closest point on the segment is an existing endpoint, the insert does nothing, so the list does not gain a duplicate vertex.

The return segment is not a stored pair of points. 0007 keeps `closed` as a flag and does not repeat the first point in the list. Inserting on that segment appends one point. Repeating the first point in the list would show an extra handle and would change what Backspace deletes.

DESIGN.md adds a control only when it changes the plotted line. This is a gesture on the canvas. No new island control.

## Done when

- With Select active and handles already showing, a double-click on a segment adds one point on that segment and selects the new handle. The stroke passes through it. The other points stay in order.
- The double-click that first shows the handles does not add a point.
- A double-click on a handle, on empty canvas, or on a different polyline does not insert. A different polyline still enters point editing, as in 0006.
- On a closed polyline, a double-click on the return segment appends a point. The flag stays closed, and the first point is not repeated in the list.
- A double-click while the polyline tool is active still only places a draft point.
- Tests cover an insert on an open segment, an insert on the closing segment, and a hit that does not insert. `npm test` and `npm run build` succeed.
