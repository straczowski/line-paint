# 0016 Drop SVG

## What

A person can drop an SVG file from the desktop onto the window. The file is imported the same way as Import SVG in 0015: the same parser, the same fit inside the sheet, the same replacement of the drawing, and the same toast when the file is refused.

The listener sits on the window, in `src/ui/`. A drag over the window and a drop both cancel the browser's default, so the page does not navigate to the file. The two canvases stay as they are. There is no new control and no drop overlay.

A drop that contains no file does nothing. A drop of one file, or of several, reads only the first file. The others are ignored. Success and refusal behave as in 0015, including clearing the selection and discarding a draft.

## Out of scope

- A highlight, veil, or cursor while the file is over the window.
- Reading every file in a drop, and a second toast.
- Paste, a URL drop, and a text drop.
- A new parser or a new library.

## Pitfalls

0015 lists drag-and-drop under Out of scope. This file is that behavior. The menu order stays the one in 0015: Import SVG is last.

The browser's default drop opens the file and leaves the app. `dragover` has to cancel that default as well as `drop`, or the drop never arrives.

ARCHITECTURE.md keeps `document` out of `src/scene/`. The listener reads the file in the UI and calls the existing import. The scene function does not grow a drag path.

DESIGN.md has no drop chrome. A veil would be a new island with no plotted effect. The window itself is the target.

A drop can carry text or a URL and no file. Treating that as a bad SVG would toast for an ordinary text drag. No file means nothing happened.

## Done when

- Dropping an export from this app onto the window replaces the scene, as the menu does. The page stays on the app.
- Dropping a refused file shows the 0015 toast and leaves the drawing in place. The toast still leaves after 4 seconds.
- A drop of several files reads the first one only.
- A drop with no file does nothing.
- No overlay is added. `npm test` and `npm run build` succeed.
