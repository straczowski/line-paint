# Line Paint

Agent context for this repository. Humans should read `README.md`.

## Purpose

Line Paint is a browser drawing app in the spirit of [Excalidraw](https://excalidraw.com/), aimed at pen-plotter output.

It is a drawing tool. It is not a port of the image-to-lines pipeline in line-weaver.

Related software: [line-weaver](https://github.com/straczowski/line-weaver/). Local checkout: `/Users/raoulstraczowski/Develop/line-weaver`. That app converts an image to vector lines and exports SVG or GCode, entirely in the browser. Open it when plotter output, stroke ordering, or GCode comes up. Do not copy its UI, Zustand store, or Tailwind setup unless asked.

## Stack

- TypeScript, React, Vite, Vitest, Zod
- Frontend only. No backend, no API server, no deploy base path yet.
- The current `src/` tree is the Vite React TypeScript hello screen so the project builds. It is not product code.
- Zod is allowed. Do not add Tailwind, Zustand, a router, or any other library unless the user asks.
- Git remote is `git@github.com:straczowski/line-paint.git`, branch `main`. Do not run `git init` again.

## Before any code change

Read [docs/CODING.md](docs/CODING.md). Then read every file in [docs/engineering-principles](docs/engineering-principles/) and every file in [docs/laws-of-software](docs/laws-of-software/). Do not edit code until all three are loaded. CODING.md decides whether a line should exist. The engineering principles decide how to write it. The laws decide what not to add.

A new feature starts as a numbered spec. Follow [.agents/skills/write-spec/SKILL.md](.agents/skills/write-spec/SKILL.md). Write `spec/NNNN-title.md`, then stop. Do not write product code until the user has read that spec and said to proceed.

If the user asks for something the docs do not already require, question it before writing code. Name the complexity it adds, and wait.

## Doc contract

| File | Role |
| --- | --- |
| `README.md` | For humans. Do not put agent instructions there. |
| `AGENTS.md` | For agents. Read this first. |
| `docs/ARCHITECTURE.md` | Source of truth for structure. |
| `docs/DESIGN.md` | Source of truth for look and interaction. |
| `docs/CONCEPT.md` | Source of truth for product scope. |
| `docs/CODING.md` | Source of truth for whether and how to write code. |
| `docs/engineering-principles/` | Binding rules for the shape of a line. Read all of them before coding. |
| `docs/laws-of-software/` | Local copies of YAGNI, KISS, and premature optimization. Read all of them before coding. |
| `spec/` | Numbered feature history. One markdown file per feature, written before code. |
| `.agents/skills/write-spec/` | Procedure for writing the next spec and stopping until it is read. |

`docs/DESIGN.md` is the source of truth for look and interaction. `docs/ARCHITECTURE.md` is the source of truth for structure. `docs/CONCEPT.md` is the source of truth for what the app does. `docs/CODING.md` is the source of truth for coding.

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
npm run preview
```

`npm run dev` serves the app at `http://localhost:5173`. `npm run lint` runs Oxlint, which ships with the Vite template. `npm test` runs Vitest once.
