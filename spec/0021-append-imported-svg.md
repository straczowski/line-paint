# 0021 Append imported SVG

## What

A successful SVG import adds the file's polylines after the ones already on the sheet. The drawings that were there stay, in the same order, with the same ids, points, open or closed, stroke, and width.

The menu action and a drop both do this. They still use the parser, the fit, and the refusal toast from 0015. A refused file still leaves the sheet as it is. Canceling the file dialog still does nothing.

Each imported polyline still gets a new id. It is stored with the fitted points from 0015, so a file this app wrote lands on the same millimeters and can sit on top of what was already drawn. The parser still returns only the file. The scene is updated where the import is applied: the existing list, then the new polylines.

An empty accepted document adds nothing. The sheet stays, and there is no toast.

Selection is still cleared. A draft is still discarded. The duplicate offset and point edit still end, as they do today.

## Out of scope

- Undo, and a confirm before the import.
- Moving the new polylines so they miss the old ones, or selecting them.
- A new parser, a new file type, or a second error sentence.
- Changing the fit, the accepted grammar, or what a refused file does.

## Pitfalls

CONCEPT.md says a successful import replaces the polylines on the sheet. That sentence is why the drawings disappear. This spec changes it: a successful import adds the file's polylines after the ones already there. A refused file still leaves the drawing.

0015 and 0016 say the import replaces the scene, and that an empty document clears it. Both entry points follow this spec instead. The parser tests stay about the file alone. An empty file is still a success with no polylines. Applying that success must not wipe the sheet.

There is still no undo. Adding does not bring back a drawing that was deleted before the import.

ARCHITECTURE.md keeps the scene as an ordered list. New polylines go at the end, so they paint after the ones already there. The parser stays in `src/scene/import.ts` and does not read the current scene.

## Done when

- With polylines on the sheet, Import SVG of a file this app writes keeps those polylines and adds the file's after them. A drop of that file does the same.
- A refused file, and canceling the dialog, leave the sheet in place. An empty accepted document leaves it in place and does not toast.
- A line-weaver file still fits inside the sheet, on top of whatever was already there.
- CONCEPT.md says a successful import adds the file's polylines after the ones already on the sheet.
- A test shows a scene with polylines, plus an import result, keeps the old ones and appends the new ones. `npm test` and `npm run build` succeed.
