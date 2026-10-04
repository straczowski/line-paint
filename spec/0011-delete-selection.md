# 0011 Delete selection

## What

A person can remove every selected polyline while Select is active.

Two controls do that. Backspace, and a trash button on the island under the tool island. Both remove the same polylines from the scene. The removal is immediate. The selection clears. Point editing ends if it was on. The remaining polylines stay in their order, with their ids, points, and `closed` flags unchanged.

The trash is `RiDeleteBinLine` from `@remixicon/react`, already a dependency. The button is `2rem`, the icon `1rem`, `aria-label="Delete"`. It is not a primary button and not a toggle. It uses the text color.

The button is shown only while Select is active and at least one polyline is selected.

- One polyline selected: the island shows Open, Closed, and Delete.
- Several polylines selected: the island shows only Delete.
- Nothing selected: that island is absent, as it is today.

The polyline tool never shows Delete. Backspace there still does not change the scene.

While Select is active and a point handle is selected, Backspace still deletes that point, as in 0006. The trash still deletes the whole polyline. If no handle is selected, Backspace deletes every selected polyline, including when point editing is on and no handle is chosen.

An empty selection makes both controls do nothing. Backspace while Select is active does not navigate the browser away. Holding the key does not repeat the delete.

## Out of scope

- Undo, a confirmation, or a bin the drawing can be restored from.
- The Delete key.
- Deleting one point from the trash button.
- Deleting an in-progress polyline draft.
- Groups.

## Pitfalls

CONCEPT.md binds Backspace to the selected point during point editing. 0006 follows that, and with no handle selected it does nothing, so a stray key cannot remove the drawing. This spec is the object delete that 0006 left out. The handle still wins: a selected point is what Backspace removes. With no handle selected, the selected things are the polylines, and Backspace removes those. That is the one change to the 0006 key rule.

0006 also names the Delete key as a different command and leaves it unbound. This spec does not bind it. The object command is Backspace plus the button.

DESIGN.md says the tool island is the tools, one of them active, and a property island appears only for the current tool or selection. Delete is not a third tool. It sits on the island under the tools, and only while a selection exists to remove. 0012 leaves no island when several polylines are selected, because Open and Closed need exactly one. Delete applies to that set, so the island appears for it with only the trash.

DESIGN.md allows one primary button. Finish already owns that fill, and it is absent on Select. Delete stays a quiet icon button.

ARCHITECTURE.md keeps the scene as the list of elements. Delete filters that list. It does not hide elements, and it does not add a deleted-id set. The static canvas redraws because the scene changed.

A move or a marquee can be in progress when the key or the button fires. The overlay would otherwise keep painting polylines the scene no longer has. The gesture ends, and the overlay drops those polylines with the scene.

`@remixicon/react` is already allowed by 0008. No new package.

## Done when

- With Select active and one or more polylines selected, and no point handle selected, Backspace removes those polylines, clears the selection, and leaves every other polyline as it was.
- The same removal happens from the Delete button. One selected polyline shows Open, Closed, and Delete. Several show only Delete. None shows no island.
- With a point handle selected, Backspace still deletes that point. The Delete button still removes the polyline.
- With the polyline tool active, Backspace and the absent button leave the scene unchanged.
- An in-progress move or marquee does not leave a deleted polyline on the overlay.
- Tests cover removing the selected ids and keeping the rest in order. `npm test` and `npm run build` succeed.
