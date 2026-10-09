# Coding

Read this file before any code change. Then read the one file in [engineering-principles](engineering-principles/) or [laws-of-software](laws-of-software/) that governs the edit, and name that file. The principle files are the rules for how a line is written. This file is the rule for whether the line should exist.

Do not start editing until this file and that one file are loaded. Do not replace those files with a summary. Do not read the rest of those folders for the edit.

## Engineering principles

| File | Rule |
| --- | --- |
| [01-human-first-code.md](engineering-principles/01-human-first-code.md) | Names a person can read |
| [02-top-down-rule.md](engineering-principles/02-top-down-rule.md) | Entry point, then helpers, types last |
| [03-keep-methods-small-and-single-abstraction.md](engineering-principles/03-keep-methods-small-and-single-abstraction.md) | One function, one level of detail |
| [04-fail-early-and-happy-path.md](engineering-principles/04-fail-early-and-happy-path.md) | Reject bad input, then a flat success path |
| [05-no-comments.md](engineering-principles/05-no-comments.md) | Names instead of comments |
| [06-locality-principle.md](engineering-principles/06-locality-principle.md) | Define a thing next to its use |
| [07-error-handling.md](engineering-principles/07-error-handling.md) | No silent failures |
| [08-pure-functions.md](engineering-principles/08-pure-functions.md) | Same input, same output, no hidden effects |
| [09-as-is-for-the-ass.md](engineering-principles/09-as-is-for-the-ass.md) | No `as` casts |

## Every line costs

Each line of code adds complexity and makes the program harder to maintain. A line that does not change what the user asked for is slop. Delete it, or do not write it.

Slop includes a wrapper around one call, a generic helper with one use, a parameter for a case that does not exist, a dependency [ARCHITECTURE.md](ARCHITECTURE.md) does not list, a feature from the "Later" list in [CONCEPT.md](CONCEPT.md), and code left in place "so we can use it later."

## Three laws

Open one of these when it is the file the edit needs. Do not fetch the website.

- [YAGNI](laws-of-software/yagni.md). Build only what the current request needs. The "Later" section of CONCEPT.md is a list of things not to build.
- [KISS](laws-of-software/kiss.md). Prefer the smallest change that does the job. Do not add a framework, a layer, or an abstraction for a single use.
- [Premature optimization](laws-of-software/premature-optimization.md). Do not add caches, indexes, workers, or other speed machinery until a measured problem exists. The two canvases in ARCHITECTURE.md are a structure decision, not a license to optimize further.

## Question a new request

When the user asks for something new, stop before coding. Something is new when [CONCEPT.md](CONCEPT.md), [DESIGN.md](DESIGN.md), or [ARCHITECTURE.md](ARCHITECTURE.md) does not already require it.

A new feature is a file in `spec/`, named `0001-short-title.md` and counting up. Write it with the `write-spec` skill, then wait. The user reads the spec before product code starts. The spec is where pitfalls get named.

Say what the change would add: a new type, mode, file, dependency, or branch of behavior. Ask whether they still want it. Wait for the answer.

If they confirm, write only that confirmed behavior. Do not add the neighboring feature that would make it "complete."
