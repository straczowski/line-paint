# 0039 Deactivate layers

## What

Layers in the top-left menu still opens the right-hand island, and the check still means that island is open.

Choosing Layers while the check is showing deactivates the layer system. That choice is a reset. The island closes and the check is gone. The drawing is back to its starting pens:

- The layer list is the one layer from a new drawing: id `default`, name Default, color `#1e1e1e`.
- Every polyline is stored on that layer. Its stroke is `#1e1e1e`, the Black stroke.
- The active pen is that layer, so a draft or a shape preview paints black and commits there.

Groups, the selection, the entered group, point editing, and blueprints stay. Opening Layers again only shows the island. It does not rebuild the pens that the reset removed.

If the drawing is already that one layer and every stroke is already `#1e1e1e`, deactivating still closes the island and takes no undo step. Otherwise the reset is one undo step. Undo puts the polylines and the layer list back. The island stays closed, and the pen stays Default.

## Out of scope

- A way to hide the island and keep the other pens.
- Zero layers, a second menu item, and a confirm dialog.
- Changing which colors exist, or how Export SVG and Export GCode behave once only Default remains.
- Blueprints, groups, and the three tools.

## Pitfalls

0036 and 0038 treat the menu item as show and hide. Closing it is editor chrome and is not an undo step. This spec makes the uncheck destroy every pen except Default and recolor every stroke. The only control that closes the island is that item, so there is no non-destructive close.

CONCEPT says the drawing always has at least one layer. "No layer system" is that starting layer, not an empty list. A renamed or recolored Default is replaced by name Default and `#1e1e1e`. Black is that default stroke, not `#000000`.

The reset changes polylines and the layer list, so it goes through the commit in `src/ui/history.ts`. A commit that leaves both the same takes no step, which is the already-default case.

CONCEPT keeps the active pen and whether the island is open out of the undo step. After undo, the restored pens exist again while the check is off. Choosing Layers then opens the island on those restored pens. It does not reset a second time. The pen is Default even if the undone drawing had been using another pen. A pen id that the undo brought back is not selected again.

Export follows the reset drawing: one GCode file, `Default.gcode`, when any polyline is on the sheet, and one SVG whose paths are `#1e1e1e`. No new dependency.

## Done when

- With the island open, choosing Layers closes it, leaves one Default layer colored `#1e1e1e`, and paints every polyline that color on that layer. The pen is Default.
- Choosing Layers while the island is closed opens it and leaves the drawing alone.
- A reset that changes strokes or the layer list is one undo step. Undo restores both. The island stays closed and the pen stays Default.
- Deactivating a drawing that is already that single black Default layer adds no undo step.
- CONCEPT.md states that deactivating Layers is this reset. DESIGN.md states that the check still means the island is open, and that turning it off resets the pens.
- Tests cover the reset onto Default and `#1e1e1e`, the already-default case taking no step, and undo restoring the previous layers and strokes. `npm test` and `npm run build` succeed.
