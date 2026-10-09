# 0019 Command duplicate

## What

A person can repeat a duplication with Command+D, so several presses lay the same selection out in a row at one spacing.

While Select is active and at least one polyline is selected, Command+D copies that selection the way an Alt drop does in 0009. Each copy has a new id, the same `closed` flag, and the same stroke and width. Its points are the original points plus one delta in millimeters. The originals stay. The copies become the selection. Point editing ends if it was on.

The delta is the last duplicate offset for this selection.

- An Alt drop stores the drag delta, including a Shift-constrained one from 0013. The copies are selected, and that delta stays with them.
- The next Command+D applies that same delta to those copies. Another press does it again, so the copies step by the same vector.
- A plain move does not store a delta and does not clear one. The row follows the last duplication, not the last drag.
- With no stored delta, Command+D uses 10 mm right and 10 mm up, `(10, 10)`, and then stores that. A fresh selection is this case. Further presses keep that diagonal step.

The stored delta is editor state beside the selection. It is not a field on the polyline and it is not exported.

It is cleared when the person changes the selection, other than a duplication replacing the selection with its copies. That includes a click on empty canvas, a click or marquee that selects a different set of ids, switching to the polyline tool, and deleting the selection. Clicking the polyline that is already the only selection leaves the delta in place.

Command+D is ignored on key repeat. While Select is active it does not open the browser bookmark dialog. With no selection it changes nothing. With the polyline tool active it is not handled.

## Out of scope

- A duplicate button.
- Control+D.
- Repeating a move, a scale, or any edit that is not a duplication.
- Holding the key to stamp many copies.
- Groups, undo, and a clipboard.

## Pitfalls

0009 left every keyboard duplicate out of scope. This spec adds one shortcut. It does not add a button. DESIGN.md says a shortcut may exist, and it does not require a control that only repeats a delta.

CONCEPT.md describes one Alt+drag copy. It does not describe a remembered offset. The offset has to live somewhere that dies with the selection. Storing it on the polyline would bring it back when that polyline is selected again, which is the case this spec clears. Storing it in the scene would put a non-geometry field next to points that export reads.

The delta is one translation for the whole selection, the same value `duplicatePolylines` already applies. It is not a gap measured between bounding boxes. After the copies are selected, the next press measures from those copies, which is what makes a row.

Illustrator's Command+D repeats the last transform, including a move. This shortcut repeats only the last duplicate offset. A move of the same ids leaves that offset alone.

0009 refuses an Alt copy while point handles are up, because that drag is a point edit. Command+D is not that drag. It copies the selected polylines and leaves point editing, as the Alt drop already does when it copies.

Command+D is the browser bookmark shortcut. The Select tool has to take the key while it is active, including when the selection is empty and the press does nothing. Key repeat is ignored, as Backspace is in 0011. One press is one copy.

The 10 mm step is not in the docs. A zero delta would stack the copy on the original. 10 mm is large enough to see on the A4 sheet and small enough to repeat. Y is up, so the copy moves up the page, and the renderer flips that when it draws.

## Done when

- Command+D on a fresh selection copies it by `(10, 10)` mm and selects the copies. A second press copies those by the same delta.
- After an Alt drop, Command+D repeats that drop's delta from the copies. A later move of those copies does not change the delta.
- Deselecting, or selecting a different set of polylines, forgets the delta. The next Command+D uses `(10, 10)` again.
- A press with no selection adds nothing. Key repeat adds nothing. The polyline tool does not handle the shortcut.
- The copy has its own id and the same points, `closed` flag, and stroke as the original, plus the delta.
- Tests cover the fresh step, the repeated step, the Alt-drop delta, and the cleared delta. `npm test` and `npm run build` succeed.
