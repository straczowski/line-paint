---
name: review-architecture
description: >-
  Reviews this repository's structure for long-term agent work: whether the
  module map is still true, where a task belongs, separation of concerns,
  entry documents, and files long enough to crowd a context window. Use when
  the user asks to revisit architecture, review project structure, check
  separation of concerns, or find files that are too long for agents.
---

# Review architecture

Review only. Do not edit `src/`, specs, or dependencies in this turn. A structural change waits until the user accepts the report.

Read [reference.md](reference.md) before judging file length. Re-check those sources on the web when a cited number is what would justify a split.

## Questions

Answer each one from the current tree:

1. Do we understand the project structure?
2. Do you know which kind of task has to be implemented where?
3. Separation of concerns.
4. Clear entry points for understanding the code.
5. Is there something blocking efficient work?
6. Are there files long enough to crowd an agent's context window?

## Steps

1. Read `AGENTS.md`, `docs/ARCHITECTURE.md`, and the "Later" section of `docs/CONCEPT.md`.
2. List `src/`. For every `.ts` and `.tsx` file, record line count and character count. Estimate tokens as characters divided by 3.5.
3. Check the written rules against imports:
   - `src/scene/` does not import React and does not touch `document`.
   - `src/render/` is the only folder that paints canvas pixels.
   - `src/ui/` does not write canvas pixels.
4. Diff the docs against the tree. A sentence that names a tree which no longer exists is a finding. A "Later" item that a spec already shipped is a finding.
5. Apply the file budget in [reference.md](reference.md). Name the concern inside an oversized file. Length starts the look. Mixed concerns decide the split.
6. Count the docs an agent must read before a small edit. If that set is large next to the active-context budget, name it. Do not delete those docs.
7. Recommend the smallest change that removes the worst finding. Do not recommend a new library, a state store, a barrel file, or a layer with one use. Those violate `docs/CODING.md`.

## Report

Lead with the single worst blocker. Then:

- Structure: which modules still match `docs/ARCHITECTURE.md`.
- Task map: kind of change, the file it belongs in, and whether that file is one concern.
- Entry points: which doc to open first, and which sentences are false.
- File budget: every file over the watch line, with lines and estimated tokens.
- Change: the next structural edit, and what to leave alone.

Point at a doc only when a recommendation would break it.
