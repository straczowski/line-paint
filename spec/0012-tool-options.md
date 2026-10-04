# 0012 Tool options

## What

The island under the tool island belongs to the active tool.

While the polyline tool is active, that island is Finish from 0008. It stays visible for that tool. It is enabled while the draft has one or more points, and disabled when the draft is empty. Switching to Select clears the draft, as it already does, and Finish leaves with it.

While Select is active, that island is Open and Closed from 0007. It appears only when exactly one polyline is selected, including point editing. Zero or several selected polylines leave no island under the tools. Switching to the polyline tool clears the selection, as it already does, and Open and Closed leave with it.

The two islands never show at the same time. The tool island is unchanged.

## Out of scope

- A panel component, a registry of tools, or a third tool.
- Changing when Finish is enabled, or when Open and Closed apply.
- Moving Finish onto the tool row.
- Export, zoom, and groups.

## Pitfalls

0008 mounts Finish for every tool and uses `disabled` for an empty draft. On Select the draft is already cleared, so the disabled check in the screenshot is that rule. DESIGN.md says a property island appears only for the active tool, with the few settings that tool needs. Finish is a polyline setting. Open and Closed are a selection setting. Showing each island only for its tool is that rule.

A shared panel type for two tools would be a framework with one use. The existing islands stay. Each one is rendered only while its tool is active.

CONCEPT.md puts open or closed on "the left panel" when a polyline is selected. 0007 already put that on the island under the tools, and only for one polyline. This spec does not move it, and does not show it during the polyline tool.

Enter still commits the draft. On Select the draft is empty, so Enter still creates nothing. No second key rule.

## Done when

- With Select active, Finish is absent. One selected polyline shows Open and Closed. Zero or several selected polylines show neither.
- With the polyline tool active, Finish is present and enabled only while a draft exists. Open and Closed are absent.
- Switching to Select still clears the draft. Switching to the polyline tool still clears the selection.
- Enter, and an enabled Finish, still commit two or more points and still discard fewer than two.
- `npm test` and `npm run build` succeed.
