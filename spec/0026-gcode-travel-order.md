# 0026 GCode travel order

## What

Export GCode writes the same pen commands and the same point coordinates, in an order that shortens pen-up travel.

The order is the greedy nearest neighbor from line-weaver's `optimizeLineOrder` in `src/core/gcode/optimize-line-order.ts`. The pen starts at `(0, 0)`. Each next polyline is the remaining one whose nearer endpoint is closest to the pen. Distance is Euclidean, in scene millimeters, before coordinate rounding. If that nearer endpoint is the last stored point, the GCode point list is reversed. The pen then sits on the last point of what was just written. A tie keeps the earlier polyline in scene order, and an equal distance to both ends keeps the original direction.

A closed polyline is ordered from its stored points, before the closing point is appended. The file then repeats whichever point the pen started on, so the closing segment is still drawn.

SVG export and the scene stay in scene order. A polyline with any stored point outside the sheet is still omitted, and it is omitted before this order runs.

## Out of scope

- Merging polylines that share an endpoint. Line-weaver does that in `mergeConnectedPolylines` before ordering. Joining two objects would invent a stroke the person did not draw.
- An exact shortest tour. Nearest neighbor is not a proven minimum. No solver, cache, or worker.
- Starting a closed polyline at a middle vertex. Only the two stored endpoints are candidates, as in line-weaver.
- A control, a preference, or a second file name. GCode always uses this order.
- Grouping by stroke color, or a tool change between colors.
- Scaling, padding, recentering, flipping X, and portrait rotation.
- Reordering the SVG paths.

## Pitfalls

CONCEPT.md allows this reorder and says it must not move the points. Reversal changes sequence in the GCode file only. Stored coordinates, scene order, and the SVG path order stay as they are.

Spec 0010 left travel reorder out of scope and kept both files in scene order. This file changes GCode only. `polylinesForExport` stays the SVG list. `gcodeDocument` filters, orders, appends the closing point, then emits moves. Ordering after the closing point is appended would make a closed polyline's start and end the same point, so it would never reverse.

DESIGN.md says a new control has to change the plotted line. This has no control.

ARCHITECTURE.md puts GCode text in `src/scene/export.ts`. The order function stays in that file. No new module and no new dependency.

The greedy pass is the plotter's travel, not a speed optimization of the app. KISS in `docs/laws-of-software/kiss.md` is why it copies line-weaver's endpoint rule instead of a closed-loop start vertex or a merge step.

## Done when

- Two open polylines, one nearer the origin, produce GCode that draws the nearer one first. The farther one's end, when it is the nearer endpoint, is the `G0` that starts that polyline.
- A closed polyline whose last stored point is nearer the origin is drawn from that point, and the file repeats it at the end.
- The same scene's SVG paths stay in scene order. The scene arrays are unchanged.
- An off-sheet polyline is still absent. An empty drawing is still the pen cycle and `G0 X0 Y0`.
- `npm test` and `npm run build` succeed.
