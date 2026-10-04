# 0002 Sheet

## What

Opening the app shows the sheet.

- The Vite hello screen is gone.
- The window is a white canvas (`#ffffff`). Two HTML canvases are stacked and fill it. The lower canvas is the finished picture. The upper canvas is the overlay.
- The scene is an ordered list of elements, held in React state, and it is empty. Render and the canvases read that list. They do not keep a second copy.
- The sheet is DIN A4 landscape. X runs from 0 to 297 mm, Y from 0 to 210 mm. `(0, 0)` is the bottom-left. Y increases up.
- A hairline (`#c5c5d0`) traces that rectangle so the page is visible on the white canvas.
- The viewport fits the rectangle in the window, centered, with a 32 px inset, and refits when the window resizes. That fit is the whole view.
- Stored coordinates stay Y-up. A pure function next to the sheet size maps a scene Y to a top-left Y with `210 - y`. `src/render/` is the code that uses it to paint. The sheet border goes through that function.
- The page loads Assistant, then `system-ui, sans-serif`, so later islands inherit it.

A point that falls outside the rectangle is still a valid scene point. This spec has no way to add one yet. The sheet is a guide.

## Out of scope

- Tools, a hint, a menu, zoom, and pan.
- Portrait, a sheet-size control, and a tracing image. Those are on the Later list in CONCEPT.md.
- Any polyline, selection, or export.
- Zod. Nothing is read from a file.
- A new npm dependency. Assistant is a stylesheet link.

## Pitfalls

CONCEPT.md says the user always sees the sheet, and the screen paints Y downward while stored points stay Y-up. ARCHITECTURE.md says `src/render/` is the only canvas code that flips Y. The formula still lives in `src/scene/`, beside the sheet size, so the SVG spec can call the same function. This spec's canvas path goes through `src/render/`. The scene does not store flipped points.

DESIGN.md makes the canvas white. A white page on a white canvas needs the hairline. A gray desk is a color DESIGN.md does not list.

ARCHITECTURE.md gives pan and zoom to the viewport, and says they must not change exported points. This viewport only fits the sheet. A zoom level or a pan offset would be a control this spec does not have. YAGNI in CODING.md leaves it out. The zoom buttons in DESIGN.md are a later spec.

The two canvases are the structure ARCHITECTURE.md already chose. A third canvas, WebGL, rough.js, or a live SVG DOM is a different model. Redraw the static canvas when the scene or the viewport changes.

`src/scene/` does not import React and does not touch `document`. Vitest covers the sheet size, the fit, and the Y map from `src/**/*.test.ts` in the `node` environment. React state holds the scene. Zustand is not added.

## Done when

- `npm run dev` shows a white window and the A4 rectangle with a `#c5c5d0` border. The Vite hello screen is gone.
- Resizing the window refits and recenters the sheet inside a 32 px inset.
- `src/scene/` provides the sheet size `(297, 210)`, an empty scene, the fit, and `210 - y`. Tests cover those and do not import React.
- `src/render/` paints the sheet. `src/ui/` hosts the two canvases and does not write pixels itself.
- The page font is Assistant, then `system-ui, sans-serif`.
- There is no tool island, menu, zoom control, or hint, and no new npm dependency.
- `npm test` and `npm run build` succeed.
