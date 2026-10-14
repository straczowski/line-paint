# 0036 Polyline layers

## What

A layer is a pen. The drawing always has at least one. The first is named Default, color `#1e1e1e`, and every polyline starts on it.

There is no layer tool. Select, Polyline, and Shape stay the pointer modes. Layers is an item in the top-left menu, after Import SVG. It toggles a white island in the middle of the right edge and closes the menu. The island uses the existing island shadow and radius. With it closed, the screen is the one a new user already has. It can stay open while drawing.

The island lists layers from top to bottom, newest first. Default begins at the bottom. A row shows the name and a color swatch. The row for the pen that receives new strokes uses the selected-tool fill. Clicking a row chooses that pen. That choice is not an undo step, and it does not move the selection. The list scrolls inside the island when it does not fit.

Add layer is the top row, the words "+ Add layer". It inserts a layer above the others, named Layer 2, then Layer 3, and so on for the first free number, colored `#1e1e1e`, and chooses it as the pen. One undo step.

Double-click a name to edit it. At most 12 characters. Enter or leaving the field keeps a name that is not blank after trimming and not the same as another layer in any letter case. Escape, a blank, or a duplicate keeps the previous name. A real change is one undo step.

The swatch opens the five stroke colors from DESIGN.md, in that order: Black `#1e1e1e`, Red `#e03131`, Green `#2f9e44`, Blue `#1971c2`, Yellow `#f08c00`. Choosing one sets the layer and writes that color onto every polyline on the layer. One undo step. Two layers may use the same color. The full color grid stays hidden.

A new polyline or shape stores the active layer and that layer's color. A draft and a shape preview paint in that color. Move, scale, rotate, align, point edits, and duplicate keep the layer. A copy is a new polyline on the same layer.

While Select is active, at least one polyline is selected, and the drawing has two or more layers, the select island shows one button per layer, labeled with its name. The button uses the selected-tool fill when every selected polyline is on that layer. A selection that spans layers has none filled. Clicking a button puts every selected polyline on that layer, including every member of a selected group, and writes the layer color into each stroke. Group ids stay. A group may hold more than one layer until that click. One undo step when the membership changes. A picture-only selection does not show the row. With one layer, the row is absent.

Right-click a layer row. The menu is Delete. It is absent when that row is the only layer. Otherwise the layer is removed and its polylines join the next layer down. The bottom row's polylines join the layer above it. Their strokes become that layer's color. If the removed layer was the pen, the receiving layer becomes the pen. One undo step. A click outside closes the menu.

Export SVG stays one `drawing.svg` in scene order. Each path uses the polyline stroke.

Export GCode writes one file per layer that has at least one polyline inside the sheet. A layer with no such polyline is skipped. Each file is the GCode from 0010 and 0026 for that layer alone, including the return to `G0 X0 Y0`. The download name is the layer name with spaces written as hyphens, plus `.gcode`. A character a filename cannot hold is dropped. A name that becomes empty is `layer`. A second file that would share that name adds `-2` before `.gcode`. Files start at the bottom of the list, so Default is first while it remains there and has on-sheet strokes. The scene is unchanged.

## Out of scope

- A layer tool, a right-click menu on the canvas, drag to reorder, hide, lock, opacity, and a stroke color that differs from its layer.
- The full color grid, fill, and a width per layer.
- A zip, a tool-change comment inside one file, and splitting SVG.
- Blueprints on a layer.
- Changing Open, Closed, align, or the three tools.

## Pitfalls

DESIGN.md says not to add layers, and that a control must change the plotted line. This is the exception: a layer is a pen change, and it changes the GCode files. The island stays off the screen until Layers is chosen, so one pen looks like today's app.

DESIGN.md puts navigation at the top right. This island is the middle of the right edge. It does not join the tool row. Tools decide what the pointer does. A layer tool would hide the list whenever the person draws or selects.

The sketch labels the first row "Default Layer". That is 13 characters. The cap is 12, so the first name is Default.

0010 downloads `drawing.gcode`. This spec names each file from the layer. One layer with on-sheet strokes still downloads one file, `Default.gcode` until that layer is renamed.

0026 orders travel inside one file from `(0, 0)`. Each layer file starts that order over and ends at the origin, so the plotter homes before the next pen.

The app has no context menu on the canvas. Delete is the only one, and only on a layer row. Moving existing strokes is the named buttons on the select island, and those buttons appear only after a second layer exists. A right-click on a polyline would be a second, hidden path to that same list. Clicking a row only chooses the pen, so choosing where the next stroke goes does not move the selection.

0015 stores a path's own stroke. An import joins the active layer and takes that layer's color, the same as a stroke just drawn. Leaving an imported red path on a black layer, still painted red, would make the layer color a lie. Creating a layer per imported color would add layers on a file drop.

`polyline.stroke` stays the color paint and SVG already read. The layer list is the other record: id, name, color, and order. Each polyline stores its layer id. Recolor and assign write the color through to `stroke`. A selected stroke still overlays `#6965db`.

0034 paints a shape preview in `#1e1e1e`. The preview follows the active layer instead.

ARCHITECTURE.md's drawing step is the polylines and the blueprints. The layer list joins that step. A rename or a recolor that changes no points is still one undo step. `commitDrawing` has to see the layer list. The active pen and whether the island is open stay editor state, like the tool. After undo, a pen id that no longer exists becomes the bottom layer.

The bottom row has no layer beneath it. Its strokes go to the layer above so delete still has a destination. The last layer cannot be deleted.

A browser may ask before saving the second file. No zip library. ARCHITECTURE.md adds a dependency only when a spec asks, and this one does not.

## Done when

- The tool island is still Select, Polyline, and Shape. Layers in the menu toggles the right-hand island.
- A new drawing has one layer, Default, `#1e1e1e`. Add layer, rename within 12 characters, the five colors, and delete behave as above. The last layer has no Delete.
- New strokes use the chosen layer's color. Assigning from the select island, including a group, writes that color and keeps group ids. That row is absent with one layer.
- Selected strokes still paint `#6965db`. Unselected strokes paint the layer color.
- Export GCode downloads one homing file per layer that has an on-sheet polyline, bottom of the list first, named from the layer. Export SVG is still one file.
- Add, rename, recolor, delete, and assign are each one undo step. Choosing the pen is not.
- An import takes the active layer's color.
- CONCEPT.md, DESIGN.md, and ARCHITECTURE.md describe layers, the menu island, and the layer list on the drawing step.
- Tests cover add, the 12-character rename, delete into the layer below, delete of the bottom row, assign, two GCode files, a skipped empty layer, and SVG still one document. `npm test` and `npm run build` succeed.
