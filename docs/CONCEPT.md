# Concept

The drawing object is a **polyline**.

A polyline is an ordered list of points joined by straight segments. Open or closed is a property of that object, not a second type. "Line draw" names the act of drawing. "Path" also means curves, files, and SVG path data. "Stroke" is already the color and width. "Polygon" is only the closed case. Line-weaver exports the same unit: a `Polyline` is a `Point[]` in [`src/core/types.ts`](/Users/raoulstraczowski/Develop/line-weaver/src/core/types.ts).

## Sheet

The user always sees the sheet, so the plottable area is visible.

The first sheet is fixed. It is DIN A4, landscape:

- X is the long side, 297 mm
- Y is the short side, 210 mm
- The sheet is the rectangle from (0, 0) to (297, 210)
- (0, 0) is the bottom-left corner. X increases to the right. Y increases up. (297, 210) is the top-right corner
- Scene coordinates are millimeters
- Landscape GCode uses those numbers unchanged. One unit is one millimeter on the paper

The screen paints Y downward, so the renderer flips Y when it draws. The stored points stay Y-up, matching the plotter.

## Polyline tool

This is the first tool. Clicking the canvas adds a point. Each new point is connected to the previous one with a straight segment.

Enter, or a Finish button, commits those points as one polyline. Fewer than two points does not create an object.

When a polyline is selected, the left panel has one toggle: open or closed. Closed draws one more segment from the last point back to the first. Open does not.

## Selection

- Click a polyline to select the whole object. Drag the selection to move it.
- Drag on empty canvas to draw a rectangle. Every polyline that rectangle touches is selected.
- Double-click a polyline to edit its points. In that mode a point can be dragged, and Backspace deletes the selected point.
- Alt+drag duplicates the polyline and leaves the copy where the drag ends.

## Groups

Selected polylines can be grouped and ungrouped. A group selects and moves as one object. Nested groups are not part of this concept.

## Export

Two buttons: Export SVG and Export GCode. Both read the polylines. Neither scales, pads, nor recenters them. Line-weaver scales pixel art onto a sheet (`scalePolylines` in `src/core/gcode/scale-polylines.ts`). This app must not, because the points are already millimeters.

A closed polyline is exported with the first point repeated at the end, so the pen draws the closing segment.

SVG, same idea as line-weaver's `generateSvg`: one document, one path per polyline. The document size is the sheet, 297 by 210.

GCode, same idea as line-weaver's `generateGcode` and `convertToGcodeCommands`:

- Pen up between polylines
- `G0` to the first point, pen down, `G1` through the remaining points, pen up
- Command strings for pen up, pen down, feed, and pause stay machine settings, as in line-weaver's `GcodeCommandSettings`
- Line-weaver also reorders polylines to shorten pen-up travel. That reorder is allowed here. It must not move the points

## Later

Not part of the first tool:

- Rectangles, circles, and other shapes
- Rotate and scale a polyline
- Import SVG, using the format line-weaver writes
- Portrait. Same origin: bottom-left, Y up, on a sheet 210 mm wide and 297 mm tall. The plotter bed stays landscape, so GCode export rotates the points 90° onto that bed. The rotation is not a mirror. Which way the paper turns is chosen when portrait is built
- A control for sheet size
- A background image for tracing
- Typography
