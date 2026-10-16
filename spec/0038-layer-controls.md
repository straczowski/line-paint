# 0038 Layer controls

## What

Four corrections to the layer controls from 0036.

**Menu check.** Layers stays the last item in the top-left menu and still toggles the right-hand island. While that island is open, the item shows `RiCheckLine` after the word Layers. The icon is `1rem`, in the text color. While the island is closed, the item is the word alone: no icon and no gap left for one. The check is there the next time the menu opens. Export and Import stay words with no check.

**Rename.** Double-click still edits the name. Backspace deletes characters in that field, including when Select is the tool and a selection or a point handle exists. The selection and the point stay. Enter, Escape, blur, blank, and a duplicate name behave as in 0036.

The cap is 32 characters, counted after trim. A 32-character name is kept. A longer one is refused and the previous name stays. The field still blocks input past the cap. While the field holds 32 characters, its border is `1px solid #e03131`. Under the cap the border is absent again, including after Backspace. On the list, a name that does not fit the row ends in an ellipsis. The island stays `12rem` wide.

**Assign row.** While Select is active, at least one polyline is selected, and the drawing has two or more layers, the select island still shows one button per layer, newest first. The button is the layer's color square, the same chip as the layer row, filled with the color already stored. It does not show the hex and it does not stretch. The button's accessible name is the layer name. Clicking still assigns the selection, including every member of a group, and is one undo step when membership changes. A pressed square keeps that color and is outlined. A picture-only selection and a drawing with one layer still omit the row.

The island is only as wide as its icon row and that assign row need. The squares sit centered in the row and wrap inside it.

## Out of scope

- A check on Export or Import, a layer tool, and reorder, hide, or lock.
- The Delete key, and Backspace while the rename field is not focused.
- Hex text on the assign button, a color name such as Black, and a sixth color.
- A wider layer island, a second line for a long name, and a different GCode filename rule.

## Pitfalls

0036 caps a name at 12 because the sketch said "Default Layer" and that is 13 characters. The test refuses `Default Layer` and keeps `My Red Layer`. This spec is the new cap. `Default Layer` becomes a legal name. A name of 33 characters is what the test refuses.

`useSelectBackspace` calls `preventDefault` on Backspace whenever Select is the tool, before it looks at the event target. The rename field is an input, so the caret never receives the key, and a selection or a selected point would be deleted instead. 0011 still owns Backspace for the selection and for a point handle. This spec only steps aside while that field is focused. The polyline tool never took that shortcut.

The layer island is `12rem`. A 32-character name does not fit. Ellipsis on the row keeps the width. The field can scroll while editing.

0036 allows two layers to share a color, so two squares can look the same. The outline and the accessible name are how they differ. The visible mark stays the color.

The assign row is `flex-basis: 100%` inside a wrapping island. The island's intrinsic width counts the icons and the assign buttons as one line, then the buttons wrap, and the leftover width reads as a broken gap. The row has to wrap inside the island width instead of widening it.

`RiCheckLine` is already imported. No new dependency. The check is editor chrome, like whether the island is open. It is not an undo step. The red border uses the existing stroke red. DESIGN has no separate error color.

Assign, rename, and the pen choice do not change their undo rules. A longer name is still one undo step when it actually changes.

## Done when

- With the layer island open, the menu item reads Layers and shows the check after the word. With it closed, the item is the word alone.
- Backspace in the rename field deletes characters and leaves the selection and any selected point in place.
- A name of 32 characters is stored. A longer name is not. At 32 characters the field border is `#e03131`. Below that, the field has no border. A long name on the row ends in an ellipsis inside the `12rem` island.
- The assign buttons are the layer color squares, centered as a row. They do not stretch and they do not show the hex. Two layers of the same color show the same square. A pressed square stays that color and is outlined. Assign and the one-layer absence stay as in 0036.
- CONCEPT.md states the 32-character cap and that the select island shows each layer's color. DESIGN.md states the menu check, the red border at the cap, and the centered color squares.
- Tests cover a 32-character rename, a refused longer name, and Backspace in the rename field leaving the selection. `npm test` and `npm run build` succeed.
