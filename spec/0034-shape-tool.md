# 0034 Shape tool

## What

A third tool, Shape, sits on the tool island after Polyline. Its button is an inline SVG with the label Shape, and it uses the selected-tool treatment from DESIGN.md.

While Shape is active, the property island under the tools shows one icon per shape: Rectangle, then Ellipse. Each icon is a button with that accessible name, from the same remix set as Open and Closed. The active icon uses the selected-tool fill. Neither icon is a primary button. Rectangle is the icon in use when the tool is first chosen. The choice stays until the other icon is pressed. It is interface state. Switching to Select or Polyline hides the island and clears the selection, as choosing Polyline already does. Switching back to Shape shows the icon that was last pressed. Finish stays on the polyline tool. Open and Closed stay on Select.

A drag on the overlay draws the shape. The click is one corner and the pointer is the opposite corner. The box follows the pointer into any quadrant. The overlay paints the shape in the default stroke, `#1e1e1e` at `0.3` mm. The static canvas stays as it was. Pointer up commits one polyline and clears the preview. The commit goes through `src/ui/history.ts` as one undo step.

The committed polyline uses the same fields as any other stroke: an id, the points in Y-up millimeters, `closed: true`, stroke `#1e1e1e`, width `0.3` mm, and no group. The stored list does not repeat the first point. Closed draws the return segment, and export still appends the first point when it writes a file.

Command and Shift are read throughout the drag. Pressing or releasing either one updates the preview before the pointer goes up.

- Command (the meta key) makes the clicked point the center. The pointer is a corner of the box, and the opposite corner is the same distance past the center.
- Shift makes the width and height equal. Each side equals the longer of the two spans, and the short side grows in the pointer's direction. A straight horizontal or vertical drag uses the positive direction for the side whose span is zero: right, or up.
- Both together make a square or a circle centered on the click.

Control does not do this. Shift during this drag does not use the four-line lock from 0013.

A press that moves less than 4 px commits nothing. A box whose width or height is 0 commits nothing. A point outside the sheet is stored as dragged.

Rectangle points are the four corners, in scene order: bottom-left, bottom-right, top-right, top-left. Bottom is the smaller Y.

Ellipse points lie on the ellipse inscribed in that box. They start at the rightmost point and run counterclockwise in scene coordinates, Y up. The straight sides stay within `0.2` mm of the true curve, which is inside the `0.3` mm pen. The count comes from the larger radius of curvature, `max(rx² / ry, ry² / rx)`, using the circle whose chord gap is `0.2` mm:

`θ = 2 * acos(1 - 0.2 / ρ)`, and the count is `max(8, ceil(2π / θ))`.

`rx` and `ry` are half the box. When the shorter radius is `0.2` mm or less, the count is 8, because the whole thickness is already inside that gap. A circle uses its own radius, since both curvature radii match it. A larger circle gets more points: radius 10 mm is 16 points, radius 50 mm is 36, radius 100 mm is 50.

The math is a pure function in `src/scene/shape.ts`. The overlay and the commit both call it. `src/scene/` does not import React.

When the sheet has no polylines and no drag is in progress, Shape shows one hint: "Drag to draw a shape." The polyline hint stays on the polyline tool.

After commit, the result is an ordinary closed polyline. Point edit, move, scale, rotate, open or closed, group, and export treat it as they treat any other polyline.

## Out of scope

- A shape record that stays a rectangle or an ellipse after commit.
- Fill, rounded corners, polygons, stars, and arrows. Another shape is another icon on this island, in a later spec.
- An angle while drawing. The rotate handle from 0030 turns the finished points.
- A tool shortcut.
- Stroke color and width controls.
- Shift making the selection marquee a square.
- A second undo path.

## Pitfalls

CONCEPT.md says the drawing object is a polyline, and open or closed is a property of that object. Rectangle and ellipse are ways to place those points. A rectangle type or an ellipse type would be a second description of the same geometry. SVG and GCode read points. After commit, moving a corner is a point edit from 0006, and the figure stops being regular. That is the polyline.

0007 creates polyline-tool strokes open, and stores `closed` without repeating the first point. A shape is created closed. The toggle still changes that flag later. Repeating the first point in the scene would add a vertex Backspace could delete.

DESIGN.md says one tool is active, a property island shows only the settings that tool needs, and at most one primary button. Shape is one tool. Rectangle and Ellipse are that tool's settings, icon buttons in a row, the same kind of control as Open and Closed. A third icon waits until a later spec names that shape. A registry of shapes, built now so an arrow could be dropped in, would be a framework with two icons. Finish remains the only primary button, and only for the polyline tool. The fill row stays hidden. The hint is the one line DESIGN.md allows, and it changes with the tool so the polyline sentence is not on screen during a shape drag.

ARCHITECTURE.md paints the in-progress stroke on the overlay and redraws the static canvas when the scene changes. Writing the shape into the scene on each move would redraw every finished stroke. Pointer up is the scene change. The module table gains `src/scene/shape.ts` when this is built. The function returns the points. It does not grow a tool registry.

0013 locks Shift to horizontal, vertical, and the two diagonals. Those lines include a flat drag. Using that lock here would commit a line and call it a square. This drag's Shift is equal sides only.

CONCEPT.md says Command+Z during a pointer gesture does nothing, and that the gesture becomes one step when the pointer goes up and the drawing changed. A shape drag follows that. Dropping a zero-area drag takes no step. Selecting, panning, zooming, and switching tools take no step. Switching tools mid-drag drops the preview.

The polyline tool's new strokes stay open. This spec does not change that.

## Done when

- The tool island has Shape. While it is active, the property island shows a Rectangle icon and an Ellipse icon, and the pressed icon is the one that gets drawn. Finish is absent. Open and Closed are absent.
- A drag from corner to corner commits a closed rectangle of those four corners, or a closed ellipse inscribed in that box. Command uses the click as the center. Shift keeps the sides equal to the longer span. Both together center a square or a circle.
- Releasing Command or Shift during the drag updates the preview before pointer up.
- A press under 4 px, or a box with a zero side, leaves the scene unchanged.
- Ellipse points start at the rightmost point, run counterclockwise, and a circle of radius 10 mm, 50 mm, and 100 mm has 16, 36, and 50 points. A shorter radius of 0.2 mm or less has 8 points. The chord gap on a circle stays within 0.2 mm.
- The empty sheet shows "Drag to draw a shape." while Shape is active, and the polyline hint while the polyline tool is active.
- The new polyline is one undo step. Command+Z restores the drawing from before the drag. Point edit, scale, and export then treat it as a closed polyline.
- Tests cover the box, both keys, a zero box, the rectangle order, and the ellipse counts. `npm test` and `npm run build` succeed.
