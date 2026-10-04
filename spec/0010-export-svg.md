# 0010 Export SVG

## What

A person can download the drawing as one SVG file.

A menu button sits at the top left. It is an icon button on a white island, with the island shadow and radius from DESIGN.md. The menu opens on that button and holds one action, Export SVG. The action is a quiet text button, not a primary button. Export is not painted on the canvas.

The download is `drawing.svg`. A pure function in `src/scene/` builds the string from the scene. The menu writes that string to a file. The scene is unchanged.

The document is one SVG, 297 by 210, `viewBox="0 0 297 210"`. It holds one path per polyline and no other geometry. Each path uses the element's stroke color and `0.3` width, `fill="none"`, round line cap, and round line join. An empty scene is a valid document with no paths.

Path coordinates use the Y map from 0002, `210 - y`, so the file matches the sheet on screen. Stored points stay Y-up.

The points written for a polyline are its stored points. When `closed` is true, that written list appends the first point again. The scene list does not change. The same written list is what the GCode spec will use. This function does not flip Y. The SVG writer flips when it formats a coordinate.

Nothing scales, pads, or recenters the points.

## Out of scope

- Export GCode, a preferences panel, and Import SVG. Import is on the Later list.
- A stroke-color control, a width control, and fill.
- Travel reorder, grouping, and a second file name.
- Zod. The app writes a string. It does not parse one.

## Pitfalls

CONCEPT.md says two export buttons. DESIGN.md puts export in the top-left menu, not on the canvas. The menu is that placement. A button floating on the sheet would ignore DESIGN.md.

DESIGN.md also puts preferences in that menu. It does not define a preference. A settings form here would be a feature with no spec of its own. The menu's only action is Export SVG.

CONCEPT.md says the document size is the sheet, one path per polyline, and a closed polyline repeats its first point. Line-weaver's `generateSvg` is the same idea. Copying its pixel `strokeWidth` of 3, or its image-sized viewBox, would scale a drawing that is already in millimeters.

ARCHITECTURE.md says `src/render/` is the canvas code that flips Y, and landscape GCode copies the scene numbers. SVG's Y grows down, so a file of raw scene numbers would open upside down compared with the sheet. The flip formula from 0002 is shared. The SVG writer may call it. The scene module that builds the written point list must not, because GCode will reuse that list.

Round caps and joins are fixed. They are not controls. DESIGN.md says plotter marks are smooth lines, and a control that does not change the plotted line stays out.

The written list appends the closing point at export time. Doing it by mutating the element would show a duplicate handle in point editing.

## Done when

- The top-left menu contains Export SVG and downloads `drawing.svg`.
- The file is 297 by 210, with one path per polyline, `fill="none"`, and the element's stroke and width.
- A point at scene `(0, 0)` is at the bottom-left of the file. A point at `(297, 210)` is at the top-right.
- A closed polyline's path repeats its first point. The scene points do not.
- An open polyline's path does not repeat the first point. An empty scene downloads a document with no paths.
- Tests cover the document size, the Y map, the closing point, and the absence of any scale or padding. `npm test` and `npm run build` succeed.
