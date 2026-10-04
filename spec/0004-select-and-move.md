# 0004 Select and move

## What

A person can select polylines from 0003 and move them on the sheet.

The tool island has two tools: Select and Polyline. One is active. The app still opens with Polyline active, so the first click draws. Selection gestures work only while Select is active.

While Select is active:

- A press that moves less than 4 px is a click. A click on a polyline selects that polyline and clears the rest. A click on empty canvas clears the selection.
- A drag that starts on empty canvas draws a marquee on the overlay. On release, every polyline the rectangle touches is selected. A touch includes any segment the rectangle intersects, and any polyline that lies inside it. When `closed` is true, the return segment counts. This spec never sets that flag.
- A drag that starts on a selected polyline translates the whole selection. The originals move. The delta is in millimeters.
- A drag that starts on an unselected polyline selects that one and translates it.

During the drag, the translation is overlay state. On pointer release, the scene points update and the static canvas redraws. The stored stroke stays `#1e1e1e`.

When one polyline is selected, the overlay draws one rectangle around it and does not retrace the stroke. The rectangle is the axis-aligned bounds of that polyline's points, outset by 2 mm on each side. The 2 mm outset is fixed. It is not a setting. A horizontal or vertical polyline still shows a rectangle, because a tight box on those points has no height or no width. The rectangle is a 1 px stroke in `#6965db` with no fill, the same stroke as the marquee. It is not a hit target. A press in the empty inside of the box does not select or move the polyline. While that one polyline is being moved, the overlay draws it at the translated points in `#1e1e1e`, at its stored width, and the rectangle follows those points. The static canvas keeps the previous points until release.

When several polylines are selected, the overlay draws each in `#6965db`, using the same width rule as the stroke. One rectangle around that set is 0005.

Hit testing uses a 3 mm slop around the stroke, so a `0.3` mm line can be clicked. The slop is in scene millimeters.

Switching from Polyline to Select drops an in-progress preview and does not commit it. The hint from 0003 shows only while Polyline is active, the scene is empty, and no point is in progress.

## Out of scope

- Point handles, double-click editing, and Backspace. Those are 0006.
- The open/closed toggle, Alt+drag duplicate, groups, rotate, and scale.
- One rectangle around several selected polylines. That is 0005.
- Changing the stored stroke color to show selection.
- Deleting a polyline, undo, and zoom.

## Pitfalls

CONCEPT.md's polyline tool consumes the click that CONCEPT.md's selection section also uses. DESIGN.md says one tool is active and the selected tool is obvious. A Select tool is how both sentences hold. It is not a new shape from the Later list.

CONCEPT.md says drag on empty canvas selects every polyline the rectangle touches, and drag on a selection moves it. "Touches" includes a polyline that is fully inside the rectangle. Requiring the whole polyline to be inside would miss the ones the rectangle only crosses.

ARCHITECTURE.md says not to redraw every finished stroke on each pointer move. A drag that writes the scene on every move does that. The overlay carries the drag. The scene changes on release.

The selection paint is overlay chrome. Rewriting the element's stroke to `#6965db` would export the accent color. Export is a later spec, and the stored color stays `#1e1e1e`. The rectangle is chrome too. The 2 mm outset is not stored and must not be exported.

The 2 mm outset is not in the docs. Without it, a two-point horizontal line paints a rectangle of zero height, which is a line on top of the stroke.

A box that is also a hit target would select a sparse polyline when the press lands in empty space inside the bounds. The interior stays empty. The 3 mm stroke slop is unchanged.

The 3 mm slop and the 4 px click threshold are not in the docs. A hairline hit test makes the stroke hard to grab, and a drag that starts on the first pixel cannot be a click. Both numbers stay fixed. They are not settings.

Switching tools mid-preview is open in the docs. Committing a half-drawn stroke on the way to Select would create an object the person did not finish. The preview is dropped.

Groups are in CONCEPT.md and are not this gesture. A group type, or a selection object that is not a list of polyline ids, is that feature. This selection is a list of ids.

## Done when

- The island shows Select and Polyline. Polyline is active on load. The active tool uses the selected-tool treatment.
- With Select active, a click selects one polyline, a click on empty canvas clears it, and a marquee selects every polyline the rectangle touches.
- Dragging a selection moves those polylines in the scene on release. During the drag, the static canvas keeps the previous points and the overlay shows the move.
- The stored stroke stays `#1e1e1e`. One selected polyline shows one `#6965db` rectangle around its points, outset by 2 mm, and no blue retrace. A horizontal polyline still shows a rectangle with height. Several selected polylines are still drawn in `#6965db`.
- A click in the empty inside of that rectangle does not select or move the polyline. A click on the stroke still does.
- Dragging one selected polyline moves it on release. During the drag, the overlay shows that line and the rectangle at the new position, and the static canvas keeps the previous points.
- With Polyline active, a click still adds a point, and switching to Select drops an unfinished preview.
- Tests cover hit testing with the 3 mm slop, marquee touch, translation, the 2 mm outset on a flat polyline, and that the empty inside of the rectangle is not a hit. `npm test` and `npm run build` succeed.
