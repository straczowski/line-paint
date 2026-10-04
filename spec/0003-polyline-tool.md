# 0003 Polyline tool

## What

A person can draw one open polyline on the sheet from 0002.

The tool island sits at the top center. It has one button, the polyline tool, and that tool is active. The button shows an inline SVG icon and uses the selected-tool treatment from DESIGN.md. Islands use the shadow, radius, and button sizes from DESIGN.md.

Clicking the overlay appends a point in millimeters. The overlay paints the in-progress stroke. Those points are React state, not a scene element, until they are committed. Pointer events land on the overlay. React does not take the pointer that places a point.

While the polyline tool is active and at least one point is down, the overlay also draws a segment from the latest point to the pointer. With one point, that segment starts at the first point. With more, it starts at the last. The pointer is not a point. A click appends the point under the pointer, and the segment starts again from there. Moving the pointer redraws the overlay and leaves the static canvas alone. Enter or Finish commits only the clicked points and clears the segment. Select does not show it.

Enter, or a Finish button, commits the points as one polyline when there are two or more. The preview clears. Finish sits on a property island under the tool island, and only while a stroke is in progress. It is the primary button: `#6965db` with white text. It is the only primary button.

Fewer than two points commits nothing. Enter or Finish on an empty or single-point preview discards it.

A committed polyline is one element:

- an id
- the points, Y-up millimeters
- `closed: false`
- stroke `#1e1e1e`
- width `0.3` mm

The static canvas paints committed polylines and redraws when the scene changes. The width is `0.3` mm on the sheet, and at least 1 px so the fitted page still shows the line. The overlay redraws when the in-progress points change, and when the pointer moves during that stroke.

When the scene is empty and no point is in progress, the canvas shows one hint: "Click to add a point. Enter to finish." The hint uses Assistant at a smaller size, in `#999999`, centered on the canvas.

## Out of scope

- A second tool, selection, point editing, the open/closed toggle, duplicate, and export.
- The stroke color row and a width control. The color and width above are fixed.
- Rectangles, circles, other shapes, and canvas lettering. Those are on the Later list.
- Undo, snapping, and clipping a point to the sheet.
- An icon package. The tool icon is inline SVG.

## Pitfalls

CONCEPT.md says a click adds a point, and also says a click selects. This spec is only the first of those. The polyline tool is the only tool, so a click places a point. Selection is the next spec. Do not handle both gestures here.

CONCEPT.md says Enter or Finish commits, and fewer than two points do not create an object. Discarding the preview is that rule. Committing a one-point element so a later spec can delete it is the opposite.

"Stroke" in CONCEPT.md is the color and width. DESIGN.md shows a stroke row and hides the fill row until a fill tool exists. This prototype keeps the row hidden and stores the default stroke, `#1e1e1e`. The `0.3` mm width is the pen preview. A width slider would not change the plotted line, so DESIGN.md's rule for a new control leaves it out. Fill stays unset.

ARCHITECTURE.md says the static canvas redraws when the scene changes, and the overlay redraws for the in-progress stroke. Writing each click into the scene would redraw every finished stroke on the way to the next point. The in-progress points stay outside the scene until commit. The segment to the pointer is the same kind of preview. Writing the pointer into the scene on each move would redraw every finished stroke, and Finish would store a point the person did not click.

DESIGN.md says one control, one job, and at most one primary button. Finish is that button. The tool button is an icon button with the selected-tool fill, not a second primary button.

The empty-canvas hint is the one line DESIGN.md allows. A feature list, an account, or a second sentence is past that.

`src/scene/` owns the commit rule: two or more points become an element, otherwise the preview is dropped. Tests cover that rule. Zod is for a file boundary, and this spec has none.

## Done when

- With the polyline tool active, each click adds a point and the overlay shows the growing stroke.
- After the first click, the overlay draws a segment from that point to the pointer. After later clicks, the segment starts at the last clicked point. Finish does not store the pointer.
- Enter or Finish with two or more points adds one open polyline to the scene and clears the preview. The static canvas shows it in `#1e1e1e` at `0.3` mm, and at least 1 px.
- Enter or Finish with fewer than two points leaves the scene unchanged and clears the preview.
- Finish is visible only while points are in progress, and it is the only primary button.
- The hint is visible only while the scene is empty and no point is in progress, and it reads "Click to add a point. Enter to finish."
- A point outside the sheet is stored as clicked.
- Tests cover the commit rule and the stored stroke. `npm test` and `npm run build` succeed.
