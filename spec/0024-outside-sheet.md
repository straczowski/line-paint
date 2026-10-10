# 0024 Outside the sheet

## What

The window around the sheet is a very light grey, `#f1f3f5`. The sheet itself stays white, `#ffffff`, so the page reads as paper.

The static canvas fills the window with `#f1f3f5`, then fills the sheet rectangle with `#ffffff`, then draws the existing `#c5c5d0` hairline. Pan and zoom move that white rectangle with the sheet. Grey shows wherever the sheet is not. Zoomed in so the sheet covers the window, the window is white.

The page background is the same grey, so the window matches the canvas. Islands stay white. The hint stays on the sheet, in `#999999`.

A stroke that leaves the sheet still paints on the grey. The grey is the view around the page. It does not clip the drawing, and it does not change export. SVG still says the page background is white.

## Out of scope

- Removing the hairline.
- A drop shadow, a second page, or a desk texture.
- Clipping strokes, selection, or the hint to the sheet.
- Changing export, import, or the points.
- Portrait, a sheet-size control, and the rest of the Later list in CONCEPT.md.
- A new color control, and a new npm dependency.

## Pitfalls

DESIGN.md calls the product a white canvas and gives canvas and island the same token, `#ffffff`. 0002 kept that white and used the hairline because a grey around the page was a color DESIGN.md did not list. This spec is that split. DESIGN.md's canvas sentence and color table gain an outside-the-sheet role, `#f1f3f5`. The sheet and the islands stay `#ffffff`.

`#f1f3f5` is Open Color gray 1. It is light, and it is far enough from white that the page is visible. The violet surfaces (`#f1f0ff`, `#ececf4`) would tint the window. The hairline `#c5c5d0` is the page edge, not the window.

CONCEPT.md says the user always sees the sheet, and that a point outside the rectangle is still a scene point. 0023 may pan the sheet partly off the window. The white rectangle and the hairline are still the page. Fit brings the grey margin back.

ARCHITECTURE.md paints pixels only in `src/render/`. The overlay canvas stays clear, so the grey and the white page show through. A pan or zoom already repaints the static canvas. This fill is part of that paint. `src/scene/` does not gain a color.

## Done when

- Around the fitted sheet, the window is `#f1f3f5` and the sheet interior is `#ffffff`, with the `#c5c5d0` hairline on the edge.
- After a pan or zoom, grey covers only the area outside the sheet rectangle. Islands stay `#ffffff`.
- A polyline that crosses the edge still draws on both sides. Export SVG is unchanged.
- DESIGN.md names `#f1f3f5` as the color outside the sheet, and keeps the sheet and islands white.
- `npm test` and `npm run build` succeed.
