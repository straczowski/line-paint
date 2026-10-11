# 0027 Group polylines

## What

While Select is active, selected polylines can be grouped and ungrouped. A group selects, moves, scales, duplicates, and deletes as one object. Groups can be wrapped in a new group. Ungroup removes only the outer group and leaves the next group in place.

Command+G groups the selection. Command+Shift+G ungroups it one level. Both are ignored on key repeat. With the polyline tool active they are not handled. While Select is active they do not go to the browser, including when the selection is empty and the press does nothing.

A group is a shared id, stored on each polyline as an ordered list. An empty list means ungrouped. The last id is the outermost group. The points, order, `closed` flag, stroke, and width stay as they are.

At the top level, grouping appends one new id to every selected polyline. Ungrouping removes that last id from each selected polyline that has one. Inside an entered group, grouping inserts the new id immediately before the entered group id, so the new group stays inside it. Ungrouping removes only the id immediately inside the entered group. It does not remove the group you are inside.

Command+G does nothing when fewer than two polylines are selected, and when those polylines are already exactly one group. Command+Shift+G does nothing when none of the selected polylines has a group id it is allowed to remove. The selection stays the same polylines after either command.

Which object a click hits depends on the group you have entered. That entered group is editor state beside the selection. It is not a field on the polyline and it is not exported. Switching to the polyline tool clears it.

At the top level, a click on a member selects every polyline in its outermost group and clears the rest. Shift-click adds that whole group. A marquee that touches any member selects that whole group, including members the rectangle does not touch. A click on empty canvas clears the selection.

A double-click goes one level down. On a loose polyline, that is point editing, as in 0006. On a member of a group, it enters that polyline's outermost group and selects the next object under the pointer: the inner group, when the next id is a group, or that one polyline, when the next level is the polyline. Point handles stay off. A further double-click on an inner group enters that group the same way. A further double-click on a polyline that is already the object under the pointer edits its points. Group ids stay.

Inside an entered group, a click selects the child under the pointer: one inner group, or one polyline. Shift-click adds another child of that same group. A marquee selects children of that group that it touches, and takes an inner group whole when it touches any member. Polylines outside the entered group stay out. A click on a polyline outside the entered group leaves it and then follows the top-level click. A click on empty canvas clears the selection and leaves the group.

While point editing inside a group, a click on another child of that group selects that child and leaves point editing. The entered group stays.

The selection rectangle from 0004 and 0005 is dashed when the selected ids are exactly the members of one group. Otherwise it stays a solid `#6965db` stroke. The dash is that same 1 px stroke, 4 px on and 3 px off, in screen pixels. After entering, the dashed rectangle is the inner group you selected. One polyline uses the solid rectangle. The rectangle is not a hit target. Scale handles stay.

A successful import that adds polylines gives those new polylines one shared group id. Polylines already on the sheet keep their own groups. An empty import adds nothing. The selection stays cleared, and no group is entered.

Alt-drag and Command+D copy the grouping as well as the polylines. At the top level the copies get new group ids in the same nesting and do not stay in the original group. Inside an entered group, the copies keep that group id and any id outside it, and inner ids are new, so the copies are further members of the group you are inside. Delete removes the selected polylines and leaves every other group id as it is. If that delete removes the last member of the entered group, the entered group clears. A group of one, after a delete or a one-path import, is still a group until it is ungrouped.

Export still writes one path per polyline. Group ids are not in the file.

## Out of scope

- A group button, and Control+G.
- A dashed rectangle around an inner group while a group outside it is the selection.
- Escape as the way out of an entered group. A click outside it, or on empty canvas, is the way out.
- Parsing SVG `<g>` elements, or writing groups into SVG or GCode.
- Undo, group names, locking, and frames.

## Pitfalls

CONCEPT.md has no backlog of unbuilt features. Grouping, including nested groups and entering one level, is this spec. When it ships, the Selection section describes it.

DESIGN.md says a new control has to change the plotted line, and that a shortcut may exist. Grouping does not change a plotted line. There is no button. 0019 already uses a command shortcut with no button.

The dashed rectangle is the same overlay stroke `strokeSelectionBounds` already draws. `setLineDash` is one call on that stroke. A second color would sit on top of the `#6965db` accent from 0022 and the five drawing strokes. The dash is the indication.

0004 selects the polyline under the pointer, and 0020 adds that one polyline. At the top level a group is the object those gestures select. The marquee still uses touch, then adds the rest of that group so a member outside the rectangle is not left behind. Inside an entered group the same gestures select a child, so a click can move one member while the outer ids stay.

0006 uses double-click to edit points. On a grouped polyline the first double-click enters one level and stops on the next object, so an imported drawing can be edited without ungrouping it. Point editing is the double-click after the polyline itself is the selected object. A drag of that one polyline can move it away from the other members. The group ids still tie them. The next top-level click selects the whole outermost group.

Appending a new id while a group is entered would place that group outside the one you are inside. The new id goes immediately before the entered id. Ungrouping the entered id from inside would remove the group the clicks are aimed at. Leaving it first is how that outer id comes off.

0015 refuses an SVG `<g>`. Import still accepts only the path grammar from that spec. The new group is applied where the polylines are added to the scene, not in the parser.

0009 and 0019 copy polylines and leave groups out. Copying the same group ids at the top level would make the next click select the originals and the copies together. The copy gets a new id for each group id used by the copied polylines, nested in the same order. Inside an entered group, keeping that id is what puts the copy in the group you are inside.

There is no persistence besides export. A later import of that export wraps the whole file in one new group. Inner groups from before the export are gone.

ARCHITECTURE.md keeps the scene as an ordered list of polylines. The group list is a field on the polyline. The entered group is editor state, the same kind of state as the duplicate offset in 0019. Hit testing stays in `src/scene/selection.ts`, the shortcut in `src/ui/commands.ts`, the dash in `src/render/paint-sheet.ts`. No new library.

## Done when

- Command+G on two or more polylines gives them one shared outermost group id. Command+G on a selection that is already that group does nothing. Command+G with fewer than two polylines does nothing.
- Selecting that group and another polyline, then Command+G, appends a new outer id and leaves the inner id. Command+Shift+G removes only the outer id. A second ungroup removes the inner id.
- Inside an entered group, Command+G inserts the new id immediately before the entered id. Command+Shift+G removes the inner id and leaves the entered id.
- At the top level, a click, a Shift-click, and a marquee select the whole outermost group. A click on empty canvas clears the selection.
- A double-click on a grouped polyline enters one level and selects the next object under the pointer, with no point handles. A double-click on that polyline then edits its points and does not clear its group ids. A double-click on a loose polyline still edits its points.
- Inside the entered group, a click selects one child. A click outside leaves the group and selects the outermost group under the pointer. A click on empty canvas clears the selection and leaves the group.
- The selection rectangle is dashed, 4 px on and 3 px off, when the selection is exactly one group, including an inner group after entering. One polyline inside a larger group keeps the solid rectangle. The stored stroke stays unchanged.
- Move, scale, and delete still apply to every selected member. Alt-drag and Command+D at the top level copy the nesting onto new group ids. Inside an entered group, the copies stay in that group.
- An imported file with polylines adds those polylines as one group after the existing ones. Export still has no group ids.
- CONCEPT.md's Selection section describes grouping and double-click entering one level.
- Tests cover grouping, one-level ungroup, grouping inside an entered group, click and marquee expansion, entering one level, the dashed case, a nested duplicate, and an import that shares one group id. `npm test` and `npm run build` succeed.
