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

## Shape tool

The Shape tool drags a rectangle or an ellipse. The island under the tools has one icon for each. Rectangle is the first choice.

The click is one corner and the pointer is the opposite corner. Command makes the clicked point the center. Shift makes the width and height equal to the longer span. Both together center a square or a circle.

Pointer up commits one closed polyline. A rectangle is the four corners. An ellipse is points on the curve, spaced so each straight side stays within 0.2 mm of it, and at least eight points. A press under 4 px, or a box with a zero side, commits nothing.

## Selection

- Click a polyline to select the whole object. A grouped polyline selects every polyline in its outermost group. Hold Shift while clicking another object to add it to the selection. Drag the selection to move it.
- Drag on empty canvas to draw a rectangle. Every polyline that rectangle touches is selected. Touching a member of a group selects that whole group.
- Double-click a loose polyline to edit its points. Double-click a grouped polyline enters that group one level and selects the next object under the pointer. Double-click that polyline again to edit its points. In that mode a point can be dragged, and Backspace deletes the selected point. A click outside the entered group leaves it.
- Command+G groups the selection. Command+Shift+G ungroups one level. A group can contain a group.
- A drag that ends while Alt is held duplicates the polyline and leaves the copy where the drag ends. Duplicating a group copies the group.
- Drag a corner or a side of the selection rectangle to scale the selected polylines. A circle above the top of that rectangle rotates the selected polylines about the center of their points. Shift steps that rotation by 45°. The pointer writes the rotated points, and the rectangle is axis-aligned around them again. The rectangle is dashed when the selection is one group.
- With two or more objects selected, the selection row shows Align left, Center horizontally, Align right, Align top, Center vertically, and Align bottom. Distribute horizontally and Distribute vertically join that row for three or more objects. A group is one object. Inside an entered group, the selected children are the objects. Align moves each object to the shared selection box. Distribute spaces them across that box.

## Layers

A layer is a pen. The drawing always has at least one. The first is named Default and its color is the default stroke, `#1e1e1e`. A new polyline is stored on the active layer and painted in that color.

Layers is a menu item. It opens an island in the middle of the right edge. The list runs newest first. Add layer inserts one above the others. Double-click a name to rename it, at most 32 characters. The swatch sets one of the five stroke colors, and every polyline on that layer takes that color. Clicking a row chooses the pen for the next stroke. It does not move the selection.

Choosing Layers while that island is open deactivates the layer system. That is a reset. The list becomes the one Default layer colored `#1e1e1e`, every polyline is stored on it and painted that color, and the active pen becomes that layer. Choosing Layers while the island is closed only opens the island.

While Select is active and the drawing has two or more layers, the select island shows one button per layer, marked with that layer's color. Choosing one puts the selected polylines on that layer, including every member of a group. With one layer those buttons are absent.

Right-click a layer row to delete it. The last layer cannot be deleted. Polylines on a deleted layer join the next layer down. The bottom layer's polylines join the one above, and their strokes take that layer's color.

## Export

Two buttons: Export SVG and Export GCode. Both read the polylines. Neither scales, pads, nor recenters them. Line-weaver scales pixel art onto a sheet (`scalePolylines` in `src/core/gcode/scale-polylines.ts`). This app must not, because the points are already millimeters.

A closed polyline is exported with the first point repeated at the end, so the pen draws the closing segment.

SVG, same idea as line-weaver's `generateSvg`: one document, one path per polyline. The document size is the sheet, 297 by 210.

GCode, same idea as line-weaver's `generateGcode` and `convertToGcodeCommands`:

- Pen up between polylines
- `G0` to the first point, pen down, `G1` through the remaining points, pen up
- Command strings for pen up, pen down, feed, and pause stay machine settings, as in line-weaver's `GcodeCommandSettings`
- Line-weaver also reorders polylines to shorten pen-up travel. That reorder is allowed here. It must not move the points

Export GCode writes one file for each layer that has a polyline on the sheet. The file is named from the layer. Each file homes the pen. Layers with nothing on the sheet are skipped. Export SVG stays one document, and each path uses its polyline stroke.

## Import

The menu can import an SVG this app writes, or one line-weaver writes. Any other file is refused and the drawing stays. A successful import adds the file's polylines after the ones already on the sheet, as one group. Each imported polyline uses the drawing tool's stroke width and the active layer's color.

## Blueprint

A picture dropped on the window is a blueprint under the drawing. PNG, JPEG, GIF, and WebP are accepted. An SVG drop still imports polylines. Any other file is refused and the drawing stays. There is no menu item for a picture.

The picture keeps its pixel aspect. Its longer side starts at 210 mm, and its center is the drop point in scene millimeters. It paints before every polyline. A later picture is above an earlier one and still under every stroke. It is not written to SVG or GCode.

While Select is active, an unlocked picture moves, scales, and rotates with the selection handles. The picture stores that frame, including its angle. When the selection is that one picture, the rectangle stays on the frame. A locked picture does not move, scale, or rotate. The selection island shows one lock button while a picture is selected. Backspace and Delete remove a selected picture, locked or not. A picture is not a group member, and it is not copied or aligned.

## Undo

Command+Z undoes the last committed change to the drawing. Key repeat walks back one step at a time. The past keeps the newest 100 steps, and the step older than that is dropped.

A step restores the polylines, the blueprints, and the layers together with the selection, the entered group, point editing, and the duplicate offset. The active tool, the active pen, whether the layer island is open, an unfinished draft, and pan and zoom stay where they are. After undo, a pen that no longer exists becomes the bottom layer.

One step is finishing a polyline, moving, scaling, rotating, aligning, distributing, duplicating, moving a point, inserting a point, deleting a point, deleting the selection, toggling open or closed, importing an SVG, dropping a blueprint, locking or unlocking a blueprint, grouping, ungrouping, adding a layer, renaming a layer, recoloring a layer, deleting a layer, assigning polylines to a layer, or deactivating layers. A commit that leaves the polylines, the blueprints, and the layers the same takes no step. Selecting, entering a group, choosing the pen, panning, zooming, fitting, switching tools, and exporting take no step.

Command+Z during a pointer gesture does nothing. That gesture becomes one step when the pointer goes up and the drawing changed.
