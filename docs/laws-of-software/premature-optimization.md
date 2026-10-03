# Premature optimization

Premature optimization is the root of all evil.

Donald Knuth, 1974: "We should forget about small efficiencies, say about 97% of the time: premature optimization is the root of all evil. Yet we should not pass up our opportunities in that critical 3%."

- Most code is not a hotspot. Micro-optimizing it wastes time and makes it harder to read.
- Write a clear, correct design first. Speed up only the part a measurement shows is slow.
- Optimized code is usually more complex. Paying that cost before you know it matters is waste.
- A fancy structure for a tiny collection, or a day spent on a function that runs once, is the failure mode. The slow loop somewhere else is the part worth changing.

Make it work, then make it right, then make it fast if a profile says so.

Source: Milan Milanović, Laws of Software Engineering, [Premature optimization](https://lawsofsoftwareengineering.com/laws/premature-optimization/).
