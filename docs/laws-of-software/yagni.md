# YAGNI

You aren't gonna need it. Do not add functionality until it is necessary.

Ron Jeffries: "Always implement things when you actually need them, not when you just foresee that you need them."

- Do the current task. Do not build a feature because it might be wanted later.
- A hook, a flag, or an extra parameter for a future case is over-engineering. That case may never arrive, or it may arrive in a different shape.
- Write the small version. Extend it when a real request shows what the extension should be.
- Deferring work is safe only if the code can be changed later. Tests and a clear design are what make that possible.

A report that only needs a CSV does not need a plugin system. A function that does one job does not need extra parameters so it could do other jobs.

Source: Milan Milanović, Laws of Software Engineering, [YAGNI](https://lawsofsoftwareengineering.com/laws/yagni/).
