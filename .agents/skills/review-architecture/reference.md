# File budget

## How to count

Line count is `wc -l`. Tokens are characters divided by 3.5 for TypeScript in this repo. Use the estimate to compare files with the budgets below. It is not a billing figure.

Tests count when the agent reads them with the module. A long test beside a long module is two reads.

## What the research supports

There is no published line limit. Agents usually read a file, not a function, so a file that mixes concerns forces a full load.

Numbers checked 9 October 2026:

- A coding step uses about 6,000–8,500 tokens of the context it was given, across a 16× range of window sizes. A wider window does not raise that active set. LangWatch, "Finding the Optimal Context Window" (162 days of one fleet; an LLM judge scored 201 steps). https://langwatch.ai/research/finding-the-optimal-context-window
- Successful agentic bug-fix trajectories stay under roughly 20,000–30,000 tokens. Placing the relevant files into a 64,000-token single shot collapses the resolve rate. "The Limits of Long-Context Reasoning in Automated Bug Fixing."
- A normal task touches 3–15 files. Extra volume in the window does not improve the answer. https://vexp.dev/blog/claude-code-context-window-200k-vs-1m-which-do-you-actually-need
- Accuracy falls as input grows even when the window is not full. A larger window does not replace structural navigation. Liu et al., lost in the middle; arXiv 2602.20048, "The Navigation Paradox."
- Reading a 500-line file to reach one function spends the whole file. https://agentpatterns.ai/context-engineering/semantic-context-loading/

## Budget for this repo

| Lines | Tokens, approx. | Judgment |
| --- | --- | --- |
| under 300 | under 4,000 | A full read is cheap. Leave the file. |
| 300–500 | 4,000–7,000 | Fine when the file is one concern. Split before adding a second concern. |
| over 500 | over 7,000 | A large share of one step. Split on the concern boundary already in the file. |
| over 1,000 | over 8,500 | One read exceeds the context a step uses. Unrelated edits in this file are blocked. |

A long file that is one parser or one painter is a weaker finding than a shorter file that mixes gestures, chrome, and commands.

## What not to recommend

- A state library, router, or CSS framework. `docs/ARCHITECTURE.md` already chooses against them.
- A shared helper for a function that exists twice. `docs/engineering-principles/06-locality-principle.md` keeps a helper next to its use until a third caller needs it.
- A new directory that renames an existing one.
- Rewriting specs. They are history. Update `docs/CONCEPT.md` when a "Later" item has shipped.
