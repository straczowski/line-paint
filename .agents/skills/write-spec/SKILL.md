---
name: write-spec
description: >-
  Writes a numbered spec in spec/ before implementing a feature, then stops
  so the user can read it. Use when the user asks to implement, build, add,
  or change product behavior, or before writing product code that no accepted
  spec already covers.
---

# Write a spec

A new feature starts as one markdown file in `spec/`. Every spec lives there. Do not put a spec in `docs/` or the repo root. The user reads it before any product code is written.

## Steps

1. Read `docs/CONCEPT.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, and `docs/CODING.md`.
2. List `spec/`. The next number is one higher than the highest `NNNN` prefix, padded to four digits. The first file is `0001`.
3. Write `spec/NNNN-short-title.md`. The slug is lowercase words separated by hyphens. Example: `spec/0001-setup-lint.md`.
4. Stop. Tell the user the path. Do not edit `src/`, configs, or dependencies in this turn.

Code only after the user has read the spec and said to proceed. If they correct the spec, update that file and stop again.

## Spec shape

Keep it short enough to read in one pass. Name pitfalls against the docs, including scope that belongs in the "Later" list, extra dependencies, and behavior the docs leave open.

```markdown
# NNNN Title

## What
What the user can do when this is done.

## Out of scope
What this spec will not build.

## Pitfalls
Where this collides with CONCEPT, DESIGN, ARCHITECTURE, or CODING.

## Done when
Checks that prove the spec is finished.
```

One feature per file. Do not rewrite an older spec to smuggle in a second feature. That history is the sequence of files.
