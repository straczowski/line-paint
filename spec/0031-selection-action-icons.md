# 0031 Selection action icons

## What

The selection island under the tool island shows Duplicate, Group, and Ungroup as icon buttons, and only while that action would change the drawing.

The buttons sit in that order, before Delete: Duplicate, then Group, then Ungroup, then Delete. Open and Closed stay first, and still only when exactly one polyline is selected. Each new button is `2rem`, the icon `1rem` in `currentColor`, and not a primary button. The labels are `aria-label="Duplicate"`, `aria-label="Group"`, and `aria-label="Ungroup"`.

The icons come from `@remixicon/react`, already a dependency.

- Duplicate is `RiFileCopyLine`: two overlapping blank sheets.
- Group is `RiMergeCellsHorizontal`: two cells with arrows pointing inward.
- Ungroup is `RiSplitCellsHorizontal`: the same cells with arrows pointing outward.

A click does what the matching shortcut already does. Duplicate is Command+D from 0019, including the stored offset, the fresh `(10, 10)` mm step, new ids, and selecting the copies. Group is Command+G. Ungroup is Command+Shift+G. Each click that changes the drawing is one undo step through the existing commit. The shortcuts stay.

The island is still absent with nothing selected, and while the polyline tool is active. On that island, a button is omitted when its command would leave the drawing as it is. It is not shown disabled.

- One loose polyline: Open, Closed, Duplicate, Delete.
- One polyline that still has a group id, including a group of one: Open, Closed, Duplicate, Ungroup, Delete.
- Two or more loose polylines: Duplicate, Group, Delete.
- A selection that is already exactly one group: Duplicate, Ungroup, Delete.
- A group together with another polyline, or two groups: Duplicate, Group, Ungroup, Delete.
- Inside an entered group, those same rules use that group. Group is omitted when the selection is already exactly the inner group. Ungroup is omitted when no selected polyline has an id inside that group to remove.

## Out of scope

- Changing when duplicate, group, or ungroup succeed.
- A disabled icon that stays on screen.
- Tooltips, Control+D, and Control+G.
- A second island, a new icon package, or a custom SVG.
- `RiGroupLine`. That picture is people.

## Pitfalls

0019 and 0027 left these buttons out. DESIGN.md says a new control has to change the plotted line. Duplicate does. Group and ungroup do not: they change which polylines select together. Delete already sits on this island beside Backspace, and these buttons sit the same way beside their shortcuts. The commands themselves stay as 0019 and 0027 wrote them.

"Two or more selected" is not enough to show Group. Command+G does nothing when those polylines are already exactly one group. "One polyline" is not enough to hide Ungroup. A group of one is still a group until it is ungrouped. The button is present only when `groupPolylines` or `ungroupPolylines` would return a different scene, including inside an entered group.

Remix has no object-group glyph. `RiShape2Line` is a frame with corner squares, which is the scale handles this canvas already draws. `RiShapesLine` is a triangle, a circle, and a square, and it has no ungroup partner. `RiFileCopy2Line` is a document with text lines. `RiCheckboxMultipleBlankLine` is two squares drawn as checkboxes. `RiStackLine` is a stack of layers. The merge and split pair is the join and the separate; the blank copy is the duplicate.

The island's `aria-label` is "Open or closed" when one polyline is selected. That name would cover Duplicate, Group, Ungroup, and Delete. The island does not keep that label. Open and Closed keep their own labels.

ARCHITECTURE.md puts the buttons in `src/ui/islands.tsx` and the commit in `src/ui/history.ts`. The scene math stays in `src/scene/selection.ts`. No second undo path, and no new library.

## Done when

- One loose polyline shows Open, Closed, Duplicate, and Delete.
- A group of one also shows Ungroup, and does not show Group.
- Two loose polylines show Duplicate, Group, and Delete.
- A selection that is already one group shows Duplicate, Ungroup, and Delete, and does not show Group.
- A group plus another polyline shows Duplicate, Group, Ungroup, and Delete.
- Inside an entered group, Group and Ungroup follow the same no-op rules as Command+G and Command+Shift+G.
- Nothing selected, and the polyline tool, still show no selection island.
- Duplicate copies like Command+D and selects the copies. Group and Ungroup change the same group ids as the shortcuts. Each is one undo step. The shortcuts still work.
- `npm test` and `npm run build` succeed.
