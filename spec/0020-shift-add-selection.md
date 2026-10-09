# 0020 Shift-add a polyline

## What

While Select is active, a click on a polyline with Shift held adds that one polyline to the current selection. The polylines already selected stay selected.

A click is still a press that moves less than 4 px, as in 0004. Shift is read when the pointer goes up. The polyline is the one `polylineAt` already returns: the topmost stroke under the pointer, using the 3 mm slop. A click without Shift still replaces the selection with that one polyline.

If that polyline is already selected, the list stays as it is. The new id is appended. The overlay rectangle is the one 0004 and 0005 already draw around the resulting set.

## Out of scope

- Removing a polyline by Shift-clicking it again.
- Shift held during a drag. A drag that passes 4 px still follows 0004 and 0013: an unselected polyline becomes the only selection and moves, and Shift locks that move onto the ruler.
- A marquee. Shift does not change it. Release still selects every polyline the rectangle touches, replacing the previous selection, as 0013 already says.
- A click on empty canvas. Shift or not, it still clears the selection.
- Double-click, point handles, and point editing. Those stay 0006.
- A button, a new tool, and groups.

## Pitfalls

CONCEPT.md's Selection list says a click selects the whole object. It does not say a later click keeps the earlier ones. This gesture is that missing case. It is not the group on the Later list. The selection stays a list of polyline ids.

0013 already uses Shift to lock a moving point onto a line. That lock starts only after the pointer passes the 4 px click slop. A click never moves, so this spec can use Shift on pointer-up without changing the ruler. Sampling Shift only at pointer-down would ignore a key pressed during the press. Sampling it on a drag would fight the ruler.

0004 replaces the selection on every polyline click. The add has to happen in that same click path. Doing it when the drag starts would select the polyline and then translate the whole set, which is a different gesture.

`polylineAt` returns one id, the last polyline in the scene that the point hits. Strokes that only share the slop stay out. A marquee is the gesture that takes every touched polyline.

0006 edits the points of one polyline. A Shift-click is not a way to edit two. This spec does not run during point editing, on a handle, or on a double-click.

DESIGN.md allows a shortcut when the click already makes sense without it. There is no second select tool and no modifier button.

The open/closed toggle appears for one selected polyline. Adding a second hides it, because that toggle already requires a single selection. No new setting.

## Done when

- With Select active and one or more polylines selected, Shift-click on another polyline leaves the earlier ids selected and appends that one.
- Shift-click on a polyline that is already selected does not drop the others and does not duplicate its id.
- A click without Shift still selects only that polyline. A click on empty canvas still clears. A marquee still replaces the selection with every polyline the rectangle touches.
- A Shift-drag still moves on the ruler and does not add the polyline under the pointer to the previous selection.
- Point editing, handle clicks, and double-click behave as 0006.
- CONCEPT.md's Selection list states this gesture in one sentence.
- Tests cover an added id, a click that is already selected, and a click without Shift. `npm test` and `npm run build` succeed.
