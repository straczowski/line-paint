# 0037 Large selection

## What

A person can select a large imported drawing and move it, and the drag stays responsive.

The drawing stays a list of polylines on two Canvas 2D surfaces. Export reads those points. The stored pen width does not change.

Import still adds the file as one group, so one click still selects every polyline in it. The selection stores its rectangle and a set of its ids. Hovering a scale handle or the rotate handle reads that rectangle. A hover does not walk the points.

A move or a rotate keeps one picture of the selected strokes, painted in `#6965db` at the current zoom. The picture is pixels. Each frame of the gesture draws that picture. The scene point arrays stay as they are until the pointer goes up, and the rectangle follows the gesture. With Alt held during a move, the originals stay on the static canvas in their stored stroke.

The picture is the selection's bounds on screen. When those bounds fit in the overlay, which they do for a whole drawing on the fitted sheet, the gesture draws the picture. When they do not fit, that frame strokes the selection once instead of allocating a bitmap of the whole page.

A scale paints the preview at the stored width, at most once per frame, because scaling the picture would thicken the pen. Pointer up writes the points once, for a move, a scale, and a rotate, and the picture is painted again from those points.

Pan and zoom use the same stroke path, at most once per animation frame, at the latest viewport.

## Out of scope

- WebGL and an SVG DOM. The pen is a millimeter width with round caps. The widest line the measured GPU allows is 1px.
- A worker, and a Path2D kept to replay. Replaying one path of the 8,000 polylines took about 150ms, against about 23ms to stroke each polyline.
- A canvas per polyline.
- A spatial index. A miss of about 90,000 segments took a few milliseconds.
- Dropping or simplifying points. Undo still stores the previous drawing.
- A retina backing store, a progress indicator, splitting the import into smaller groups, and a new library.

## Pitfalls

This is the limit the prototype has hit. A document in this app's SVG shape, about 2.3MB, is on the order of 8,000 polylines and 96,000 points. One pass that asks `includes` of that id list for every polyline takes about a third of a second. The move preview does that pass twice, and the handle test does it again on hover. Around 15,000 polylines, one pass takes about two seconds, and the next pointer event is already waiting.

Stroking those 8,000 polylines, then forcing the pixels out, takes about 23ms. 20,000 take about 34ms. 40,000 take about 62ms. Drawing the finished picture takes under 10ms. Copying the points takes about 6ms. Rotating 96,000 points takes about 13ms. The scan is the freeze. The picture is the optimization of the stroke on that same gesture. Both are in this spec. `docs/laws-of-software/premature-optimization.md` says to speed up the part a measurement shows is slow. That is this part. The file is not a reason to leave the drag as a full restroke.

WebGL stays out because it cannot draw this pen, and because a GPU buffer would leave the id scan in place. The scene stays the geometry either way. ARCHITECTURE.md's refusal of an SVG DOM stays too.

0022 keeps the selection on the overlay in `#6965db` for as long as it is selected. That paint becomes the picture. The static canvas still omits those strokes. 0017 still writes the scene on pointer up.

0014 and 0030 draw a scale at the stored width. The scale preview still does. Move and rotate draw the picture, so their ink does not thicken.

0023 keeps one paint path for pan and zoom and refuses a second camera cache. Pan and zoom still use that path. The selection picture belongs to the gesture, not to the camera.

"React and the canvases do not keep a second copy of the geometry" stays true. The picture is not a point list.

The stored rectangle keeps the 2mm outset and is still not a hit target. It is rebuilt when the selection, the scene, or the zoom changes. It is not rebuilt on a hover.

## Done when

- Selecting the imported group and hovering its handles leave the page responsive. A move or a rotate of a selection that fits the overlay draws the picture and does not stroke those polylines again on each sample. The scene point arrays change on pointer up, and undo restores the previous drawing.
- A selection that does not fit the overlay is stroked at most once per frame.
- A scale previews at the stored width, at most once per frame. Pan and zoom paint at most once per frame.
- The accent, Alt during a move, the group, and export behave as they do now.
- ARCHITECTURE.md gains this rule, next to the existing redraw sentence: a pointer sample is a delta; it does not search the scene and it does not copy points; a move or a rotate draws a picture of the selected strokes; that picture is pixels, not a second list of points; the scene stays the geometry and the surface stays Canvas 2D.
- Tests cover a large selection whose move keeps the original point arrays, whose moving rectangle is the stored box plus the delta, and whose fitting selection is drawn from the picture. `npm test` and `npm run build` succeed.
