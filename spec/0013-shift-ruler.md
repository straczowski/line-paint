# 0013 Shift ruler

## What

Holding Shift locks a moving position onto a line through its anchor. The line is the nearest of four: horizontal, vertical, and the two diagonals. In scene millimeters those are 0°, 45°, 90°, and 135°. The sheet scale is the same on X and Y, so each of those is the same angle on screen.

The locked point is the closest point on that line to the pointer. The pointer may fall on either side of the anchor. When the pointer is exactly halfway between two lines, the line with the smaller angle from horizontal wins: 0° before 45°, 90° before 135°.

Shift is read while the gesture is in progress. Pressing or releasing it updates the position before the pointer goes up. With Shift up, the position is the pointer, as it is today.

45° is the only step. Finer steps would be another control.

The anchor depends on the gesture:

- Polyline tool, draft already has a point. The anchor is the last created point. The line that follows the pointer runs from that point to the locked position, so that line is the guide. A click stores the locked position. The first point of a draft has no anchor, so Shift does not move it.
- Select, after a double-click, dragging a point. The anchor is that point's position when the drag started. The point and its segments move on the locked line, and that movement is the guide. Release writes the locked position into the scene, as in 0006.
- Select, moving one or more polylines. The anchor is the pointer where the drag started. Every selected polyline gets the same locked delta. The moving strokes are the guide. Release writes the scene, as in 0004.
- Alt held at release, from 0009. The delta is the locked one when Shift is also down. Alt still chooses copy or move. Shift still chooses the line.

A press that moves less than 4 px stays a click. It does not move or copy.

The lock is a pure function in `src/scene/`. The UI tells it whether Shift is held and passes scene points. No new control.

## Out of scope

- An extra ruler stroke or angle label. The guide is the thing already moving: the follower line in the polyline tool, the dragged point, or the dragged polylines.
- A Shift mode that stays on after the key is released.
- Snapping to other points, the sheet edge, or a grid.
- Locking the marquee, including making it a square.
- Steps other than 45°, such as 15° or 30°.
- Dragging a point so the lock is taken from a neighbor. In point editing the anchor is that point's original position. In the polyline tool the anchor is the last created point.
- Rotate, scale, and groups.

## Pitfalls

CONCEPT.md and 0003 store the point under the pointer. With Shift held and a previous draft point, the stored point is the projection onto the locked line. Finish still commits only clicked points. The pointer is still not a point.

0004 and 0006 keep the drag on the overlay and write the scene on release. Shift changes that overlay position. It does not write the scene on each move.

0009 reads Alt at the drop. Shift and Alt stay independent. Sampling Shift only at pointer down would ignore a key pressed mid-drag. Sampling it only at release would hide the lock until the drop.

Y is up in the scene. Horizontal is constant Y. Vertical is constant X. A diagonal has equal `|dx|` and `|dy|` in millimeters. Locking in screen pixels would follow the canvas Y-down axis and would drift if a later zoom scaled the axes differently. The function takes millimeters.

The marquee is a selection rectangle, not a placed point. Shift during that drag does not change it.

DESIGN.md allows a shortcut when the gesture already makes sense without it. There is no ruler button. The four lines are fixed. They are not a setting.

## Done when

- After at least one draft point, holding Shift draws the next segment on one of the four lines, and the click stores that position. Without Shift, the click stores the pointer. The first point ignores Shift.
- Dragging a handle with Shift keeps that point on a line through where the drag started. Release writes that point. Releasing Shift during the drag returns the point to the pointer before release.
- Dragging a selection with Shift translates it on a line through where the drag started. Several polylines share that delta. Release writes the scene.
- A drop with both Shift and Alt copies along the locked delta. Alt alone still copies along the free delta. Shift alone still moves.
- A marquee is unchanged when Shift is held.
- No extra ruler stroke is drawn. The follower line, the dragged point, and the dragged polylines sit on the locked line.
- Tests cover the four lines, the halfway tie, a locked draft point, a locked move delta, and Shift together with Alt. `npm test` and `npm run build` succeed.
