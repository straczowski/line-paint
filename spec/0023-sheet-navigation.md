# 0023 Sheet navigation

## What

The user can move around the sheet and change how large it is drawn. The points stay in millimeters. Export does not change.

Opening the app still fits the sheet the way 0002 does: centered, 32 px inset. After that, the fit is remembered as the viewport (`scale`, `left`, `top`). Resizing the window resizes the canvases and does not replace that viewport. The Fit button is what puts the sheet back.

A white island sits at the top right, `1rem` from the corner, same shadow and radius as the other islands. It holds two controls, left to right:

- The zoom level, as a percentage, for example `100%`. The button is `2rem` tall, transparent, text `#1b1b1f`, hover `#f1f0ff`. `aria-label` is `Reset zoom to 100%`. It is not a primary button. There is no minus and no plus.
- Fit, an icon button. `2rem`, icon `1rem`, `RiFullscreenLine`, `aria-label="Fit sheet"`. A click runs the existing fit: the sheet centered in the window with a 32 px inset. This does not enter browser fullscreen.

100% is the fitted sheet, the scale `fitSheet` computes for the current window. The label is that fit scale divided into the current scale, rounded. Opening the app shows `100%`. A click on the percentage sets the scale back to that fit scale and keeps the scene point under the window center under that center. The label is then `100%`. Fit does the same scale and also recenters the sheet, so a pan is undone and the label is `100%` again. Zooming in past the fit shows more than `100%`. Zooming out shows less.

Scrolling and zooming, on a trackpad:

- Two fingers sliding together pan. The sheet moves the way a page moves: the view shifts by the gesture's horizontal and vertical distance. The scale stays.
- Two fingers pinching, moving apart or together, zoom toward the pointer. The scene point under the pointer stays under the pointer. The user does not hold Ctrl or Cmd. The next scale is the current scale times `1 - deltaY / 500`, then clamped to 10% through 1000% of the current fit scale. If that factor is not greater than 0, the scale stays. The listener is not passive and calls `preventDefault`, so the browser does not zoom the whole page.
- Fit is 100% by definition. A pinch cannot pass the clamp. After a resize the fit scale changes and the label is recomputed against that new fit. The viewport scale itself stays.
- When the fit scale is 0, the label is `0%`, a pan does nothing, and Reset zoom centers the sheet at scale 1. Mapping a pointer still refuses a scale that is not greater than 0.

The empty-canvas hint stays at the center of the sheet. Pan and zoom move it with the sheet. It does not stay pinned to the center of the window.

Both canvases repaint when the viewport changes. Pointer tools, selection, and the draft keep using the current viewport, so a click still lands on the same millimeter. A wheel event does not start or cancel a pointer gesture.

## Out of scope

- Minus and plus buttons, and keyboard zoom.
- A hand tool, Space-drag, and middle-button pan.
- Scrollbars. The page stays `overflow: hidden`.
- Browser fullscreen.
- A minimap, rulers, or a zoom slider.
- Portrait, a sheet-size control, and anything on the Later list in CONCEPT.md.
- A new npm dependency. `RiFullscreenLine` comes from `@remixicon/react`, which is already installed.

## Pitfalls

DESIGN.md puts zoom at the bottom left as one percentage, minus, and plus. This spec replaces that line with a top-right island: the percentage, then the fit icon. The philosophy line that a control must change the plotted line is about drawing properties. DESIGN.md already lists zoom, and ARCHITECTURE.md already gives pan and zoom to the viewport. These controls do not change a point.

CONCEPT.md says the user always sees the sheet. Pan and zoom may move it partly or fully outside the window. The hairline is still the page. Fit brings back the 0002 view.

0002 refits on every resize and says the fit is the whole view. This spec keeps that fit for the first paint, for the Fit button, and as the meaning of 100%. A resize after the user has moved no longer throws the view away. The label can change on resize because 100% is the fit for the window as it is now.

0003 centers the hint on the canvas, which is the window. This spec moves that sentence to the sheet center. A pan no longer leaves the words behind in the window.

ARCHITECTURE.md says not to redraw every finished stroke on each pointer move. A pan or zoom is not that case. The finished picture has moved, so the static canvas repaints through the existing paint path. A second draw path, a cache, or a camera transform is not part of this.

Safari and Chrome on macOS report a two-finger pinch as a `wheel` event with `ctrlKey` set. That flag is how the code tells a pinch from a two-finger scroll. It is not a key press. A mouse wheel without that flag pans, because it is the same event as the scroll. A mouse wheel with Ctrl held is the same event as the pinch, so it zooms too. This spec does not ask the user to learn that.

`src/scene/sheet.ts` keeps the viewport math. `canvasPointToScene` already throws when the scale is not greater than 0. Reset zoom and pan have to avoid that call in the zero-scale case. `src/scene/` still does not import React or touch `document`. Vitest covers pan, zoom-toward-a-point, the clamp against the fit scale, the percentage where the fit is 100%, and the zero-scale reset.

Remix Icon has no fit-sheet glyph. `RiFullscreenLine` is the corners-out frame. The `aria-label` says Fit sheet.

## Done when

- The top-right island shows the zoom percentage and the fit icon. Minus and plus are absent.
- Two-finger scroll pans the sheet. A two-finger pinch zooms toward the pointer and stays inside 10%–1000% of the fitted scale. The user does not hold a modifier key.
- Opening the app shows `100%`. The percentage click returns to that fitted scale around the window center, and the label is `100%`. Fit also recenters the sheet inside the 32 px inset, and the label is `100%`.
- The hint "Click to add a point. Enter to finish." stays at the center of the sheet while the view pans and zooms.
- Resizing the window does not reset the viewport. Opening the app still starts from the fitted sheet.
- Drawing, selecting, moving, and export still use millimeters. A pan or zoom does not change the scene.
- DESIGN.md's zoom line matches this island.
- `npm test` and `npm run build` succeed.
