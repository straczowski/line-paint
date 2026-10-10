# 0025 Zoom selection slop

## What

A click still does not have to land on the stroke. The grab around a polyline, and the gap between the points and the blue selection rectangle, stay the size they have at the fitted view. Zooming in shrinks both in millimeters, so a dense cluster can be picked apart and the rectangle sits closer to the line.

At the fitted view, zoom 100%, nothing changes. The click still hits within 3 mm of a segment, and the one rectangle around the selection is still the axis-aligned bounds of the selected points, outset by 2 mm. Those two numbers are not settings.

The viewport already stores a scale in pixels per millimeter, and 0023 defines zoom as that scale divided by the fitted scale. Both distances use that ratio:

- click slop, in millimeters, is `3 / zoom`
- rectangle outset, in millimeters, is `2 / zoom`

`zoom` is 1 at 100%, 2 at 200%, 0.5 at 50%. A ratio that is not greater than 0 uses 1, so the distances stay 3 mm and 2 mm.

At 200% a click has to land within 1.5 mm, and the rectangle is 1 mm outside the points. At 50% the click reaches 6 mm and the rectangle is 4 mm outside. On screen, both stay the size they have at 100%. The rectangle stroke stays 1 px.

The same outset is what scale subtracts to recover the points. A corner or border drag still scales the points, and the painted gap is not part of the transform.

## Out of scope

- A control, a slider, or a preference for either distance.
- The 4 px rule that tells a click from a drag.
- Point handles, inserting a point, and the 3 mm those still use.
- The marquee. It still selects every polyline the rectangle touches, with no extra slop.
- Stroke width, export, and the stored points.
- Groups, rotate, and the rest of the Later list in CONCEPT.md.

## Pitfalls

0004 fixed the 3 mm slop and the 2 mm outset in scene millimeters, and said both stay fixed. Zoom did not exist. 0023 added zoom and left the distances alone, so a zoomed-in view turns 3 mm into a wide grab and 2 mm into a loose box. This spec is that follow-on. The numbers stay fixed on screen. They are still not settings.

Zooming out grows the millimeter distances. A floor at 3 mm and 2 mm would make a zoomed-out stroke harder to click than it is today, and would leave the box tight on a tiny page. The fitted view is the size the user already called good.

0014 treats the painted box as the point bounds plus 2 mm, and subtracts that 2 mm while scaling. `selectionBounds` is that painted box. If the outset follows zoom and scale still subtracts 2 mm, a drag jumps by the difference. Scale uses the same outset as the paint.

0006 and 0018 share the 3 mm constant for a point handle and for inserting a point. Those stay 3 mm in the scene. The click that selects a polyline is the one that follows zoom. Splitting that constant is this spec. Changing the handle and the insert is not.

DESIGN.md's "sloppiness" is rough strokes. This is the click distance. There is no new control. DESIGN.md says a control must change the plotted line, and ARCHITECTURE.md says pan and zoom do not change the points. Neither distance is stored or exported.

0004 outset a flat polyline by 2 mm so the box has height. The outset stays a few screen pixels, the same as 2 mm at 100%, so a horizontal polyline still shows a rectangle when zoomed in.

`src/scene/` still does not import React or touch `document`. The zoom ratio is a number the pointer and the overlay already have. Hit testing stays in `src/scene/selection.ts`.

## Done when

- At zoom 100%, a point within 3 mm of a segment selects that polyline, a point farther away does not, and the selection rectangle is outset by 2 mm.
- At zoom 200%, those distances are 1.5 mm and 1 mm. At zoom 50%, they are 6 mm and 4 mm.
- A scale drag still changes the points. The outset is not scaled into them.
- A point handle and an inserted point still use 3 mm, at every zoom.
- A marquee is unchanged.
- `npm test` and `npm run build` succeed.
