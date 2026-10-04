# 0001 Lint and Prettier

## What

A person working in this repo can check and format the source from the command line. Saving a TypeScript, TSX, CSS, or HTML file in Cursor or VS Code runs the same Prettier.

Lint stays Oxlint. That is the linter already installed by the Vite template (`oxlint` in `package.json`, `npm run lint`, `.oxlintrc.json`). The request for "lint" means that check. ESLint is not installed.

- `npm run lint` still runs Oxlint against the project and exits 0 on the current Vite screen.
- `npm run format` rewrites TypeScript, TSX, CSS, and `index.html` with Prettier.
- `npm run format:check` exits non-zero when one of those files does not match that format.

Prettier uses its defaults, with no semicolons and single quotes, so it matches `src/App.tsx` and `src/main.tsx`. A format of the current screen should not be a style rewrite.

`AGENTS.md` lists `format` and `format:check` next to the existing `lint` command, and notes that Cursor and VS Code format those files on save.

Both editors read `.vscode/settings.json`. Format on save is set there for TypeScript, TSX, CSS, and HTML, with the Prettier extension `esbenp.prettier-vscode` as the formatter. `.vscode/extensions.json` recommends that extension. No other editor settings are added.

## Out of scope

- ESLint. Do not add it, and do not run it beside Oxlint.
- New Oxlint rules. The two React rules in `.oxlintrc.json` stay as they are. The engineering principles are not turned into lint rules here.
- Husky, lint-staged, a pre-commit hook, or a CI workflow.
- Format on save for Markdown or JSON. Saving a file in `docs/` or `spec/` does not run Prettier.
- Any editor setting besides the Prettier formatter and format on save for TypeScript, TSX, CSS, and HTML.

## Pitfalls

ARCHITECTURE lists the stack and says another library is added only when a spec asks for it. Prettier is that library, and it is a devDependency. The Prettier editor extension is required for format on save. Recommend it in `.vscode/extensions.json`. Do not add it as an npm package. A hook runner stays out.

Oxlint is the decided linter. ESLint would be a second tool for the same job. KISS and "every line costs" in CODING.md both leave it out.

Oxlint does not format. Do not turn on Oxlint style rules that Prettier also owns, or the two commands will disagree. Leave the Oxlint config's rule set unchanged.

Prettier on `docs/` or `spec/` would rewrite CONCEPT, DESIGN, ARCHITECTURE, and this file. Ignore those trees. A workspace-wide format-on-save would do the same thing on save, so format on save stays limited to TypeScript, TSX, CSS, and HTML.

`.gitignore` ignores `.vscode/*` and only un-ignores `extensions.json`. `settings.json` stays untracked unless that ignore rule also keeps it.

## Done when

- `prettier` is a devDependency. No ESLint package is added.
- A Prettier config sets `semi: false` and `singleQuote: true`. Markdown, `docs/`, `spec/`, and `package-lock.json` are ignored.
- `npm run lint` is still `oxlint` and exits 0.
- `npm run format` and `npm run format:check` exist. After `format`, `format:check` exits 0.
- `AGENTS.md` documents the two format commands and format on save.
- `.vscode/settings.json` turns on format on save for TypeScript, TSX, CSS, and HTML, using `esbenp.prettier-vscode`. Markdown and JSON are not included.
- `.vscode/extensions.json` recommends `esbenp.prettier-vscode`.
- `.gitignore` does not ignore `settings.json` or `extensions.json`.
- `npm test` and `npm run build` still succeed.
