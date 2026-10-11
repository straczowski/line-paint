# 0031 Align selection

## What

While Select is active and the selection has enough objects, the align buttons sit on the selection island, in that island's one horizontal row, after Delete. There is no second island and no "Align" label. The buttons are the same `2rem` icon buttons as the rest of that row. They are not toggles and not primary buttons. Each icon is `1rem`, in `currentColor`, with an `aria-label`.

The objects are the units a click already selects at the current level. A loose polyline is one object. Polylines that share the group id at that level are one object: the outermost group when no group is entered, or the child group inside the entered group. A nested group is one object. Its members are not aligned against each other. Enter that group, and select its children, to align the next level.

The box of an object is the tight bounds of its points. The 2 mm selection outset is not an edge. A group's box is the union of its members. Top is the greater Y. Bottom is the lesser Y.

The order in that row is Align left, Center horizontally, Align right, Distribute horizontally, Align top, Center vertically, Align bottom, Distribute vertically. Six buttons appear when two or more objects are selected:

| Button | Icon | Action |
| --- | --- | --- |
| Align left | `RiAlignItemLeftLine` | Each object's left edge moves to the selection's left |
| Center horizontally | `RiAlignItemHorizontalCenterLine` | Each object's center X moves to the selection's center X |
| Align right | `RiAlignItemRightLine` | Each object's right edge moves to the selection's right |
| Align top | `RiAlignItemTopLine` | Each object's top moves to the selection's top |
| Center vertically | `RiAlignItemVerticalCenterLine` | Each object's center Y moves to the selection's center Y |
| Align bottom | `RiAlignItemBottomLine` | Each object's bottom moves to the selection's bottom |

The two distribute buttons appear only when three or more objects are selected. With two objects those buttons are absent, not disabled. With one object, including one group of many polylines, the align buttons are absent. Remix Icon has no distribute glyph. Those two buttons are inline SVGs, as Select and Polyline already are: three vertical bars with equal gaps for Distribute horizontally (`aria-label="Distribute horizontally"`), and three horizontal bars with equal gaps for Distribute vertically (`aria-label="Distribute vertically"`).

Distribute keeps the other axis still. Objects are ordered by their center on the axis. When their sizes fit in the selection span, equal gaps separate the boxes and the selection's start and end on that axis stay. Horizontal packs from the left. Vertical packs from the bottom. When the sizes are larger than the span, equal gaps would overlap, so the object that reaches farthest on each end stays put and the other centers are spaced evenly between those two centers, in the same order. If one object already reaches both ends, the other centers move onto its center on that axis.

A click translates every polyline in an object by the same delta. Points are replaced, as a move replaces them. Stroke, width, `closed`, group ids, and scene order stay. Unselected polylines stay, including siblings in an entered group that were not selected. The selection and the entered group stay. One or zero objects make every action do nothing.

Aligning or distributing is one undo step when the points change, through the commit in `src/ui/history.ts`. Points that are already in place take no step.

## Out of scope

- A shortcut, a separate Align island, an Align button that reveals another island, and a numeric offset.
- Aligning to the sheet, or to one chosen object other than the shared selection box.
- Distributing with a chosen gap.
- Aligning the members inside a group that is selected as one object.
- The align buttons while the polyline tool is active.
- A new icon package.

## Pitfalls

CONCEPT.md does not mention align. This spec adds it. When it ships, the Selection section names the one selection row, the object at one group level, and the eight actions. The Undo section gains this commit.

DESIGN.md says a new control has to change the plotted line, and to show a setting only while it applies. These buttons move points. The six align buttons need two objects. The two distribute buttons need three. A disabled button for a count the selection has not reached would stay on screen while it does not apply. 0012 already hides Open and Closed unless one polyline is selected. A second island, with a label and two rows, covers the sheet under the tools. The align buttons join the selection row that is already there. An Align button that opens another island would be a second control for the same actions.

0027 makes a group the object a click selects. Align uses that same unit. Aligning every selected polyline as its own box would pull a group apart. The next level is available only after entering the group.

0030 measures rotation from tight point bounds and leaves the 2 mm outset as chrome. Align uses those same bounds. A stored alignment would be a second description of points that move, scale, and rotate already replace.

Excalidraw's distribute uses equal gaps, and equal centers when the boxes are larger than the span. Packing with a negative gap would overlap by a fixed amount and is not this control.

0028 records a step only when the committed points differ. The change goes through the commit in `src/ui/history.ts`.

ARCHITECTURE.md gives scale and rotate their own modules. The boxes, the deltas, and both distribute rules belong in `src/scene/align.ts`. The buttons belong on the selection island in `src/ui/islands.tsx`. The module table gains the align row. `@remixicon/react` is already a dependency. The two missing glyphs stay inline. No new library.

## Done when

- Two or more objects show Align left, Center horizontally, Align right, Align top, Center vertically, and Align bottom on the selection island, in one row after Delete. Three or more also show both distribute buttons in that same row. Two objects omit those two. One object, including one group, omits the align buttons. There is no second island and no "Align" label.
- Align left, right, top, and bottom move each object's edge to the shared selection edge on that axis. The other axis stays. Centers meet on the selection center. A group moves as one box. Members of an unentered group do not align to each other. Inside an entered group, the selected children align and unselected siblings stay.
- Distribute with room for gaps keeps equal gaps and keeps the span. Distribute when the boxes are larger than the span keeps the two end objects and spaces the other centers between them.
- Stroke, width, `closed`, group ids, scene order, the selection, and the entered group stay. An unselected polyline stays.
- The edit is one undo step when points change, and no step when they do not.
- CONCEPT.md's Selection and Undo sections describe this. ARCHITECTURE.md names `src/scene/align.ts`.
- Tests cover an edge align, a center align, a group as one object, children inside an entered group, equal-gap distribute, the overlapping distribute, and a click that changes nothing. `npm test` and `npm run build` succeed.
