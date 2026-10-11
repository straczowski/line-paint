# 0033 Zoom point slop

## What

While Select is active and a double-click has opened the handles on one polyline, the grab around each handle stays the size it has at the fitted view. Zooming in shrinks that grab in millimeters, so two close dots can be picked apart.

At zoom 100%, nothing changes. A click still hits the closest handle within 3 mm, and a later double-click still inserts a point when it lands within 3 mm of a segment and outside that handle grab. Those numbers are not settings.

0025 already divides the stroke click by the zoom ratio from 0023. The handle and the insert use that same ratio:

- handle grab, in millimeters, is `3 / zoom`
- insert grab, in millimeters, is `3 / zoom`

`zoom` is 1 at 100%, 2 at 200%, 0.5 at 50%. A ratio that is not greater than 0 uses 1, so both stay 3 mm.

At 200% a click has to land within 1.5 mm of a handle, and an insert has to land within 1.5 mm of a segment. At 50% both reach 6 mm. On screen, both stay the size they have at 100%. The painted handle stays a 4 px circle.

A handle hit still wins over a segment hit. A double-click whose closest vertex is inside the zoomed grab selects that handle and does not insert. If the closest point on the segment is an existing endpoint, the insert still does nothing.

## Out of scope

- A control, a slider, or a preference for the distance.
- The 4 px rule that tells a click from a drag.
- The stroke click and the selection-rectangle outset. 0025 already divides those by zoom.
- The marquee.
- The painted handle. It already stays 4 px when the sheet is zoomed.
- Stroke width, export, and the stored points.

## Pitfalls

0006 and 0018 share one 3 mm constant for a handle and for inserting a point, and they say that constant stays fixed in scene millimeters. Zoom did not exist. 0025 split the stroke click onto `3 / zoom` and left this constant at 3 mm on purpose. A zoomed-in view now turns that 3 mm into a wide grab around each dot. This spec is that follow-on. The number stays fixed on screen. It is still not a setting.

Leaving the insert at 3 mm while the handle shrinks would break the rule that a handle wins. At 200% a click 2 mm from a vertex would miss the 1.5 mm handle and still hit the 3 mm segment, and the insert would add a point on top of a dot the user was aiming at. Both distances follow zoom.

Zooming out grows the millimeter distance. A floor at 3 mm would make a zoomed-out dot harder to grab than it is today. The fitted view is the size the user already called good.

DESIGN.md's "sloppiness" is rough strokes. This is the click distance. There is no new control. ARCHITECTURE.md says pan and zoom do not change the points. The distance is not stored or exported.

`src/scene/` still does not import React or touch `document`. `pointerTarget` already receives the zoom ratio. Hit testing stays in `src/scene/selection.ts`. Passing that same ratio into the insert is not a new module.

Selecting a handle takes no undo step. Inserting a point is already one step through the commit in `src/ui/history.ts`.

## Done when

- At zoom 100%, a point within 3 mm of a handle selects that handle, a point farther away does not, and an insert still hits within 3 mm of a segment.
- At zoom 200%, both distances are 1.5 mm. At zoom 50%, both are 6 mm. A zoom that is not greater than 0 keeps 3 mm.
- A handle still wins over the segment, so a double-click inside the zoomed handle grab does not insert.
- The painted handle stays 4 px at every zoom.
- The stroke click and the rectangle outset stay as 0025 wrote them.
- `npm test` and `npm run build` succeed.
