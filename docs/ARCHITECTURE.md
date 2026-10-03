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

The canvas origin is the top-left and its Y grows down. `src/render/` is the only place that flips Y. Landscape GCode copies the scene numbers. Portrait GCode rotates them 90° onto the landscape bed. That rotation lives with export, not in the scene.

React and the canvases both read this scene. They do not keep a second copy of the geometry. Pointer events land on the overlay canvas. React does not receive the drag that creates a point.

Redraw the static canvas when the scene changes. Redraw the overlay when the selection or the in-progress stroke changes. Do not redraw every finished stroke on each pointer move.

## Modules

Product code replaces the Vite hello screen. Until then, `src/` is still that template.

- `src/scene/` — elements, viewport math, and edits. Vitest covers this folder. These modules must not import React or touch `document`.
- `src/render/` — paints a scene onto a `CanvasRenderingContext2D`. This is the only place that knows about canvas pixels.
- `src/ui/` — React islands: tools, menu, zoom. It calls into `src/scene/` and never writes canvas pixels itself.

Zod is allowed. Use it when data crosses a boundary, such as a file being imported. React state is enough to hold the active tool and to pass the scene into the canvases. No state library, router, or CSS framework unless a spec asks for one. Another library is added only when the user asks for it.
