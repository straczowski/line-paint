# 0008 Remix icons

## What

Open, Closed, and Finish are icon buttons from [Remix Icon](https://remixicon.com/).

The app depends on `@remixicon/react`. Each control imports one component and paints it at `1rem` in `currentColor`. The button color is the icon color. Select and Polyline stay the inline SVGs they already are.

The property island under the tool island always shows Finish. The icon is `RiCheckLine`. The button is `2rem`, with `aria-label="Finish"`. While a stroke is in progress, one or more draft points, Finish is enabled and is the primary button: fill `#6965db`, white icon, hover `#5753d0`, press `#5b57d1`. Otherwise the button is `disabled`, the fill is gone, and the icon is `#999999`. A disabled click does nothing. Enter still commits, and one draft point still discards the preview, as in 0003.

When exactly one polyline is selected, the open/closed island from 0007 shows two icon buttons instead of the words. Open is `RiRouteLine`. Closed is `RiCircleLine`. Each button is `2rem`, with `aria-label="Open"` or `aria-label="Closed"`. The pressed side uses the selected-tool fill `#e3e2fe`. Neither is a primary button. Zero or several selected polylines still hide that island.

## Out of scope

- Replacing the Select and Polyline icons.
- The export menu, the hint sentence, and a duplicate button.
- A disabled state for Open or Closed. That island still appears only for one polyline.
- Enabling Finish only at two or more points. One draft point still enables it, and the click still discards.
- The `remixicon` font package, a CDN tag, and any icon this screen does not show.

## Pitfalls

ARCHITECTURE.md allows another library only when a spec asks for it. This is that ask. `@remixicon/react` renders the three SVGs and tree-shakes the rest. `remixicon/fonts/remixicon.css` is the whole icon font for the same three pictures. Do not import it.

DESIGN.md says a button shows an icon, at `1rem`, inside a `2rem` button. It also says a primary button is filled `#6965db` with white text, and at most one primary button is on screen. Finish keeps that fill and swaps the word for the check. Open and Closed stay on the selected-tool fill so a second primary button never appears. 0007 said the same thing about the words.

0003 and 0007 show Finish only while a stroke is in progress. DESIGN.md says to show a setting only while it applies. This spec keeps the button mounted and uses `disabled` for the idle state. The enabled test is the old visibility test: `draftPoints.length > 0`.

Remix Icon has no open-polyline glyph and no closed-polyline glyph. `RiRouteLine` is an open path. `RiCircleLine` is a closed loop. The `aria-label` keeps the words Open, Closed, and Finish.

## Done when

- Finish is always on screen. It is the violet check while a draft exists, and a muted disabled check when the draft is empty.
- Enter, and an enabled Finish, still commit two or more points and still discard fewer than two.
- With one polyline selected, Open and Closed are the route and circle icons, and the pressed side matches `closed`.
- With zero or several polylines selected, that island is absent.
- Select and Polyline are unchanged.
- `npm test` and `npm run build` succeed.
