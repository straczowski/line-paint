# 0010 Export GCode

## What

A person can download the drawing as GCode for the landscape sheet.

The menu from 0009 gains a second action, Export GCode. It downloads `drawing.gcode`. A pure function in `src/scene/` builds the string. The scene is unchanged. The action is a quiet text button, like Export SVG.

The written points are the list from 0009: stored points, plus the first point again when `closed` is true. Coordinates are the scene numbers. Y is not flipped. Nothing scales, pads, or recenters them.

The file starts with one feed line, `G1 F3000`. Then each polyline with two or more points is:

- `G0` to the first point, pen up travel
- pen down, `M3 S1000`
- pause, `G4 P0.5`
- `G1` through the remaining points
- pen up, `M5`
- pause, `G4 P0.5`

Polylines stay in scene order. A coordinate is rounded to hundredths of a millimeter, and a whole number is written without a fraction. An empty scene is the feed line and no moves.

Those four command strings are the machine settings. They are constants. There is no screen control for them.

## Out of scope

- A preferences panel for the command strings.
- Reordering polylines to shorten pen-up travel. CONCEPT.md allows that reorder later. It must not move points. This file does not do it.
- Scaling, padding, recentering, flipping X, merging polylines, and a return to origin.
- Portrait. The 90° bed rotation is on the Later list.
- A unit preamble such as `G21`, and a header comment.

## Pitfalls

CONCEPT.md says landscape GCode uses the millimeter numbers unchanged, with the pen up between polylines, `G0` to the first point, pen down, `G1` through the rest, and pen up. Line-weaver's `generateGcode` also scales, flips X, merges, and reorders. Those steps exist because line-weaver fits pixel art onto a sheet. This scene is already millimeters. Porting that pipeline would move the points CONCEPT.md says to copy.

Line-weaver's command defaults are the strings this file hardcodes: `M5`, `M3 S1000`, `G1 F3000`, `G4 P0.5`. Its header comment, its opening pen cycle, and its final `G0 X0 Y0` are not in CONCEPT.md. Leaving them out keeps the file to the motion CONCEPT.md describes. The pause string is written after pen down and after pen up, which is the move it belongs to. A preferences form for those strings is the menu item DESIGN.md names and does not specify. Constants are the whole setting for this prototype.

The written point list is the one from 0009, still Y-up. Running the SVG Y flip here would send the pen to the wrong side of the bed.

Reorder is allowed by CONCEPT.md and is not required. Building it now is the travel optimizer YAGNI says to skip. Scene order is the plot order.

Rounding to hundredths is formatting, the same stability line-weaver uses when it prints a coordinate. It is not a scale.

## Done when

- The menu downloads `drawing.gcode` beside Export SVG.
- The file begins with `G1 F3000`. Each polyline is `G0`, pen down, pause, `G1` moves, pen up, pause, in scene order.
- A closed polyline includes the return to its first point. An open one does not. Scene points are unchanged.
- A scene point `(10, 20)` is written `X10 Y20`. Y-up is preserved.
- The file has no scale, pad, X flip, merge, reorder, header comment, or `G0 X0 Y0`.
- Tests cover that motion and a closed polyline. `npm test` and `npm run build` succeed.
