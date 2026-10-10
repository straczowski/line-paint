# Design

Line Paint looks like [Excalidraw](https://excalidraw.com/): a white canvas, floating controls, and a violet accent. The drawing itself is cleaner than Excalidraw. Strokes stay plain, because a pen plotter draws lines.

Colors below are Excalidraw’s light theme, from `packages/excalidraw/css/theme.scss` and `packages/common/src/colors.ts` on `master`.

## Philosophy

The canvas is the product. Controls sit on top of it and stay quiet.

- One control, one job. A button shows an icon, and the selected tool is obvious.
- Show a setting only while it applies to the current tool or selection.
- A new control has to change the plotted line. If it does not, leave it out.
- Shortcuts may exist. The button still has to make sense without them.
- Empty canvas: one short hint. No feature list, no account, no collaboration.

Excalidraw’s property sidebar is the ceiling, not the target. Do not add sloppiness, edge styles, fill patterns, layers, or opacity. Those are option overload. Rough, sketchy strokes are also out: plotter marks are smooth lines.

## Chrome

Light theme only.

The canvas fills the window. Controls are white islands with a soft shadow, not a docked sidebar.

- Top center: the tool island. One tool is active.
- Top left: one menu button. Export and preferences live in that menu, not on the canvas.
- A property island appears only for the active tool or selection, and only with the few settings that tool needs.
- Top right: navigation. The zoom percentage, then a fit icon.
- No Upgrade, Share, library, live collaboration, or sign-in.

Island shadow, from Excalidraw:

```css
box-shadow:
  0 0 1px rgba(0, 0, 0, 0.17),
  0 0 3px rgba(0, 0, 0, 0.08),
  0 7px 14px rgba(0, 0, 0, 0.05);
```

Island radius is `0.5rem`. Tool buttons are `2rem`, icons `1rem`, radius `0.5rem`.

## Color

UI:

| Role | Hex | Excalidraw token |
| --- | --- | --- |
| Canvas, island | `#ffffff` | `--island-bg-color` |
| Text | `#1b1b1f` | `--color-on-surface` |
| Muted text, hints | `#999999` | `--color-gray-50` |
| Primary, selected accent | `#6965db` | `--color-primary` |
| Primary hover | `#5753d0` | `--color-primary-hover` |
| Primary press | `#5b57d1` | `--color-primary-darker` |
| Selected tool fill | `#e3e2fe` | `--color-primary-light` |
| Hover surface | `#f1f0ff` | `--color-surface-high` |
| Secondary button | `#ececf4` | `--color-surface-low` |
| Hairline | `#c5c5d0` | `--color-border-outline-variant` |

A primary button is filled `#6965db` with white text. Use at most one on screen. Everything else is an icon button or a quiet secondary button.

Drawing colors are Excalidraw’s five top picks, Open Color shades. Default stroke is `#1e1e1e`. Default fill is none.

| | Black | Red | Green | Blue | Yellow |
| --- | --- | --- | --- | --- | --- |
| Stroke | `#1e1e1e` | `#e03131` | `#2f9e44` | `#1971c2` | `#f08c00` |
| Fill, if a fill exists | transparent | `#ffc9c9` | `#b2f2bb` | `#a5d8ff` | `#ffec99` |

Show the stroke row. Keep the fill row hidden until a fill tool exists. Do not show the full Open Color grid.

## Type

UI text is [Assistant](https://fonts.google.com/specimen/Assistant), then `system-ui, sans-serif`. That is Excalidraw’s interface font.

Hints use the same face at a smaller size, in `#999999`. Do not add Excalifont or Virgil. Those are Excalidraw’s hand-drawn canvas fonts, and this app does not letter the canvas yet.
