# 0009 Duplicate

## What

A person can copy a selection and drop the copy somewhere else.

While Select is active and the selection is in object mode, a drag on a selected polyline moves that selection. If Alt is held when the pointer is released, that drop copies every polyline in the selection instead. The originals stay where they are. The copies are scene elements at the drop position, and they are the selection. The drag delta is in millimeters.

A press that moves less than 4 px does not copy. Alt is read at the drop. Letting go of Alt before the drop moves the selection. Holding Alt at the drop copies it, even when Alt was pressed during the drag.

Each copy has a new id, the same `closed` flag, and the same stroke and width. Its points are the original points plus the delta.

Dropping with Alt while editing points does not copy. That drag still moves a handle, as in 0006. Dropping with Alt on empty canvas does not copy. With the polyline tool active, Alt+click still places a point.

## Out of scope

- A duplicate button, a clipboard, or a keyboard shortcut besides Alt at the drop.
- Copying an in-progress preview.
- Groups. A copy is a new polyline, not a grouped clone.
- Undo.

## Pitfalls

CONCEPT.md says Alt+drag duplicates the polyline and leaves the copy where the drag ends. It names one polyline. A marquee selection moves as a set in 0004. Duplicating only the polyline under the pointer, and leaving the rest of the selection behind, would split that set. This gesture copies the whole selection, which is one polyline after a click.

ARCHITECTURE.md keeps the drag on the overlay. The copies become scene elements on release. Writing them on pointer down would leave a stack of copies if the drag is cancelled by a tiny move. Under 4 px, nothing is added.

The copy is a new element with a new id. Reusing the id would make the selection list point at two objects. Sharing the original point array would make a later point edit change both.

Point editing and duplicate are both drags. CONCEPT.md does not say Alt copies a vertex. While handles are up, the drag stays a point edit. Alt at the start of the drag is not the gesture. The copy is decided when the pointer goes up.

An in-place copy on a plain click is a second object on top of the first, and the docs describe a drag. The 4 px threshold from 0004 is what separates them.

## Done when

- A drag that ends while Alt is held leaves the original in place and selects the copy where the drag ends. Letting go of Alt before the drop moves the selection.
- A selection of several polylines copies all of them, and the copies are the new selection.
- A press under 4 px does not add an element.
- Alt+drag during point editing moves the point and does not add an element.
- The copy has its own id and the same points, `closed` flag, and stroke as the original at the moment of the drag, plus the delta.
- Tests cover the copy and the untouched original. `npm test` and `npm run build` succeed.
