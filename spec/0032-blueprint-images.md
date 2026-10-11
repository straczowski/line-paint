# 0032 Blueprint images

## What

A person can drop a picture on the window and use it as a blueprint under the drawing. The picture is not a polyline. It is never written to SVG or GCode.

The drop uses the window listener from 0016. The first file is the only one read. A PNG, JPEG, GIF, or WebP that the browser can decode is placed on the sheet. An SVG still imports as polylines, as it does now. A drop with no file does nothing. Any other file, or an image the browser cannot decode, shows the existing import toast and leaves the drawing as it is. There is no menu item, no paste, and no second toast.

The image keeps its pixel aspect ratio. Its longer side is 210 mm, the short side of the sheet. Its center is the drop point in scene millimeters, including a drop outside the sheet. It starts unlocked. The new image becomes the selection. The tool, the draft, and the viewport stay as they are.

Images paint on the static canvas before every polyline, in the order they were dropped. A later image is above an earlier image and still under every polyline. A click or a marquee hits a polyline before an image. Empty canvas clears the selection. Double-clicking an image does not edit points and does not enter a group.

While Select is active, an unlocked image moves, scales, and rotates with the selection handles that polylines already use. Move drags the image. Scale uses the corners and the borders. Shift on a corner keeps the aspect ratio. Rotate uses the circle above the frame, and Shift steps that rotation by 45°. The image stores its frame: position, width, height, and angle. The pixels are not resampled. When the selection is that one image, the rectangle stays on the image frame, including after the pointer goes up, so a later scale stays in that frame. A press that moves less than 4 px does nothing. Alt-drag and Command+D do not copy an image.

A selection that is only images, or images together with polylines, can still move. Scale and rotate then use the shared axis-aligned bounds. An image scales in width and height about that center and keeps its angle, so the picture does not shear. Rotate adds the same angle to each image. Polylines in that selection still bake their points, as in 0030.

Each image has a lock. The selection island shows one lock button when the selection includes an image and Select is active. It is a `2rem` icon button, icon `1rem`, not a primary button. Unlocked shows `RiLockUnlockLine` with `aria-label="Lock"`. Locked, or a selection whose images are all locked, shows `RiLockLine` with `aria-label="Unlock"`. One click sets every selected image the same way: lock if any is unlocked, unlock if all are locked. A locked image does not move, scale, or rotate. A selection that is only locked images shows the rectangle and hides the scale squares and the rotate circle. Other selected objects still transform. The lock does not block selection.

Backspace and the Delete button remove every selected image, locked or not, in the same gesture that already removes selected polylines. One mixed selection is one removal. A selected point handle still wins, as in 0011.

Images are not group members. Command+G and Command+Shift+G do nothing when the selection includes an image. Align still counts polyline objects only and does not move an image.

These are one undo step each, through the commit in `src/ui/history.ts`: drop an image, move, scale, rotate, lock or unlock, and delete. A commit that leaves the images and the polylines the same takes no step. The past restores the image list with the polylines, the selection, the entered group, point editing, and the duplicate offset.

## Out of scope

- A layers panel, opacity, a crop, and skew.
- Grouping an image, including an image inside a polyline group.
- Copying an image, by Alt-drag or by Command+D.
- Aligning or distributing an image.
- Import from the menu, paste, a URL, or more than the first file in a drop.
- Writing the picture into SVG or GCode.
- A shortcut for the lock.
- HEIC and other types the browser does not decode as PNG, JPEG, GIF, or WebP.
- A shared pixel store, a worker, or a cache for the bitmap.

## Pitfalls

CONCEPT.md says the drawing object is a polyline. This spec adds a second object. The polyline stays the only plotted object. When this ships, Concept gains a Blueprint section: drop only, always under the strokes, absent from both exports, lock, and Backspace.

DESIGN.md says a new control has to change the plotted line, and it leaves out layers and opacity. The lock changes whether the blueprint can be moved, not the pen path. It is one icon on the selection island, shown only while an image is selected. There is no layers panel and no opacity slider. The fixed paint order is the whole layer model.

0030 bakes a polyline rotation into the points and returns the rectangle to axis-aligned bounds, because the object is the points. An image's object is the bitmap plus a frame. Baking the angle would resample the pixels or leave a second description of the same picture. The frame keeps the angle. That rectangle stays rotated only while the selection is that single image. A mixed selection uses the shared axis-aligned bounds so the polyline handles stay the ones 0014 and 0030 already draw.

0016 sends every dropped file through the SVG parser, so a PNG today toasts as a bad SVG. This spec branches first: a decodable image is a blueprint, an SVG stays 0015, and anything else still toasts. The toast sentence is about SVG paths. A refused image uses the same toast with the sentence "This file cannot be imported." The SVG sentence stays for a refused SVG.

The scene stays `readonly Polyline[]`. Images are a second list on the drawing step. Export, grouping, point edit, align, and SVG import keep reading polylines only. `commitDrawing` compares both lists. An image edit does not grow its own undo path.

A step holds the image records, including the data URL. One hundred steps can retain one hundred copies of a large photo. That cost is accepted. A blob table keyed by id would be a second owner of the pixels and a cache, which this spec does not add.

ARCHITECTURE.md keeps `document` out of `src/scene/`. The UI reads the file and decodes it. `src/scene/blueprint.ts` places and edits the frame from plain values: the data URL, the pixel size, and the drop point. `src/render/paint-sheet.ts` draws the bitmap. Zod stays on SVG text. A bitmap has no schema; a failed decode is the refusal.

`@remixicon/react` is already allowed. The lock icons come from that package. No new library.

0027's group command and 0031's align objects are polylines. An image id in the selection makes group and ungroup do nothing. Align's object count ignores images, so two images do not reveal the align row, and an align of polylines does not slide a selected picture.

## Done when

- Dropping a PNG, JPEG, GIF, or WebP adds one blueprint under the polylines, centered on the drop point, longer side 210 mm, aspect kept, and selects it. The page stays on the app. The draft and the tool stay.
- Dropping an SVG still imports polylines. A drop of several files reads the first only. A refused file toasts and leaves the drawing in place.
- Export SVG and Export GCode match the output they have with no images on the sheet.
- An unlocked image moves, scales, and rotates. One selected image keeps its frame under the handles after pointer up. Shift keeps aspect on a corner and steps rotation by 45°. A locked image stays put. Backspace and Delete remove it, locked or not.
- Command+G, Command+Shift+G, Alt-drag copy, Command+D, and align do not group, copy, or align an image.
- Drop, move, scale, rotate, lock, and delete are each one undo step when the drawing changes, and no step when it does not. Command+Z during the drag does nothing.
- CONCEPT.md describes the blueprint. ARCHITECTURE.md names `src/scene/blueprint.ts` and the image list on the drawing step.
- Tests cover placement, a move, a scale, a rotation, a lock that refuses a move, delete, a polyline hit over an image, and an export that omits the picture. `npm test` and `npm run build` succeed.
