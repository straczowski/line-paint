# 0007 Open or closed

## What

A person can close or open the one polyline that is selected.

When the selection from 0004 or 0006 holds exactly one polyline, the property island under the tool island shows one control with two sides: Open and Closed. The active side uses the selected-tool fill from DESIGN.md. The control is not a primary button.

Closed stores `closed: true` and the static canvas draws one more segment from the last point back to the first. Open stores `closed: false` and does not draw that segment. The stored point list does not repeat the first point.

The control is visible in object selection and in point editing, as long as exactly one polyline is selected. A marquee of two or more polylines, or an empty selection, hides it. Changing the flag redraws the static canvas. The overlay selection stroke includes the return segment when the flag is true.

New polylines from the polyline tool are still created open.

## Out of scope

- A toggle that edits several polylines at once.
- Filling the closed shape. DESIGN.md keeps the fill row hidden.
- Exporting the extra point. The export specs append it when they write a file.
- Groups, stroke color, and zoom.

## Pitfalls

CONCEPT.md puts the toggle on "the left panel." DESIGN.md says controls are islands, and a property island appears only for the current selection, with the few settings that apply. The island under the tool island is that panel. A docked sidebar is the Excalidraw ceiling DESIGN.md tells us not to build.

CONCEPT.md says closed draws the return segment, and that export repeats the first point. Those are different steps. Repeating the point in the scene would make the editor show a duplicate vertex and would change what Backspace deletes. The flag is the scene. The repeated point belongs to the file specs.

"When a polyline is selected" is singular. A mixed marquee has no single open/closed value. Showing the toggle only for exactly one selection avoids a control that would have to guess. Applying one click to every selected polyline is a batch edit CONCEPT.md does not describe.

Finish from 0003 remains the only primary button, and it shows only while a stroke is in progress. This control uses the selected-tool fill so a second primary button never appears.

Hit testing from 0004 already counts the return segment when `closed` is true. This spec is what makes that flag true. Do not add a second hit-test path.

## Done when

- With exactly one polyline selected, the island shows Open and Closed, and the active side matches the element.
- Choosing Closed draws the return segment. Choosing Open removes that paint. The stored points stay as they were.
- With zero or several polylines selected, the control is absent.
- A newly committed polyline is open.
- Tests cover the flag and the segment that render adds when it is set. `npm test` and `npm run build` succeed.
