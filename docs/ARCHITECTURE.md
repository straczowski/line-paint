# Architecture

Excalidraw is a React application. The drawing is not React, and it is not WebGL.

React renders the toolbar, menus, and panels. The picture is two stacked HTML canvases painted with `CanvasRenderingContext2D`. One canvas holds the finished elements. The other holds selection, handles, and the stroke currently being drawn. [rough.js](https://roughjs.com/) turns each element into sketchy paths, and those paths are stroked onto the canvas. The source of truth is a list of element records. Export rebuilds SVG from those records. The bitmap is only a view.

## Decision

Use the same split, without the sketch engine and without a GPU.

| Piece | Choice |
| --- | --- |
| Language | TypeScript |
| App shell | Vite |
| Chrome | React |
| Drawing surface | Two HTML canvases, Canvas 2D |
| Scene | Plain TypeScript values. No React, no DOM |
| Tests | Vitest, `node` environment, files named `src/**/*.test.ts` |
| Validation | Zod, for data that crosses a boundary |
| Server | None |

WebGL is the wrong model. A pen plotter needs the points. A GPU buffer would turn them into pixels and the export would have to recover lines from a bitmap.

Do not embed `@excalidraw/excalidraw`. Its elements carry roughness, frames, and bindings that [DESIGN.md](DESIGN.md) leaves out. Do not use rough.js. Strokes are smooth polylines.

SVG and GCode are export formats. They are not the live editor. An SVG DOM gets slow, and hit-testing it is awkward. When export exists, it reads the scene.

## Scene

The scene is an ordered list of elements in document coordinates, as in [CONCEPT.md](CONCEPT.md): millimeters, origin at the bottom-left, Y up. A stroke is a sequence of points plus the stroke color and width from [DESIGN.md](DESIGN.md). Pan and zoom belong to the viewport. They change how the canvas is painted. They do not change the points that will be exported.

The canvas origin is the top-left and its Y grows down. Scene coordinates stay bottom-left, Y up. `sceneYToTop` in `src/scene/sheet.ts` converts scene Y onto that top-down axis. `src/render/paint-sheet.ts` and SVG export call it. Landscape GCode copies the scene numbers. Portrait stays on the Later list in [CONCEPT.md](CONCEPT.md).

React and the canvases both read this scene. They do not keep a second copy of the geometry. Pointer events land on the overlay canvas. React does not receive the drag that creates a point.

Redraw the static canvas when the scene changes. Redraw the overlay when the selection or the in-progress stroke changes. Do not redraw every finished stroke on each pointer move.

## Modules

- `src/scene/` — elements, viewport math, and edits. These modules must not import React or touch `document`.
- `src/render/` — paints a scene onto a `CanvasRenderingContext2D`. This is the only place that knows about canvas pixels.
- `src/ui/` — React state, pointer gestures, and islands. It calls into `src/scene/` and never writes canvas pixels itself. A ui module that only computes values stays free of React and `document`.

Vitest covers `src/scene/` and those pure ui modules. Files are named `src/**/*.test.ts`.

| Change | File |
| --- | --- |
| Hit-test, move, duplicate, point edit | `src/scene/selection.ts` |
| Scale math | `src/scene/scale.ts` |
| SVG parse | `src/scene/import.ts` |
| SVG and GCode text | `src/scene/export.ts` |
| Shift lock | `src/scene/ruler.ts` |
| Commit a polyline, open or closed | `src/scene/polyline.ts` |
| Sheet size, fit, scene Y | `src/scene/sheet.ts` |
| Pixels | `src/render/paint-sheet.ts` |
| Scene state and canvas hooks | `src/ui/App.tsx` |
| Pointer gestures | `src/ui/sheet-pointer.ts` |
| Draft stroke, selection preview, marquee, and handles | `src/ui/overlay-frame.ts` |
| Keyboard commands | `src/ui/commands.ts` |
| Toolbar and menu | `src/ui/islands.tsx` |
| Import, export, and SVG drop | `src/ui/files.ts` |

Zod is allowed. Use it when data crosses a boundary, such as a file being imported. React state is enough to hold the active tool and to pass the scene into the canvases. No state library, router, or CSS framework unless a spec asks for one. Another library is added only when the user asks for it.
