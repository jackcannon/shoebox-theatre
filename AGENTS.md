# AGENTS.md

Rules for AI agents working in this repo. This file covers **how to behave**. How the project **works** (stack, architecture, subsystems, content) is in [`docs/`](docs/README.md). Read both before changing anything.

## 1. The documentation rule (strict)

**Every commit must leave `docs/` and the root `README.md` fully accurate for the code in that commit.** This applies to every AI contribution: features, fixes, refactors, renames, config changes, new or removed tests, and content changes.

- **The rule applies per commit, not per prompt.** Docs may lag while you work through a task over several prompts. They must be correct before any commit is created, and the doc changes go **in the same commit** as the code they describe.
- **If you won't be the one committing,** for example when you hand work back uncommitted, still update the docs before you report done. Then the user's commit is accurate. If you leave docs out of date on purpose mid-task, say so in your report.
- **How to do it, before every commit:**
  1. List what changed: `git status --short` and `git diff --name-only HEAD`, or `--cached` for staged changes.
  2. Match each changed path against the **"Which doc to update"** table in [`docs/README.md`](docs/README.md#which-doc-to-update).
  3. Open each doc it lists and fix anything the change made wrong: names, signatures, defaults, numbers (test counts, lint-warning counts, sizes), tables, file lists, examples and links.
  4. Grep `docs/` and `README.md` for every identifier, file, prop or value you renamed, removed or changed, and fix each hit.
  5. For a new subsystem or a new area of the game, add a doc, or a section in an existing doc, and list it in the index and the mapping table in `docs/README.md`.
  6. For a bug you fixed or found, or a limitation you added or removed, update [`docs/known-issues.md`](docs/known-issues.md).
- **Docs describe the current state only.** No changelogs, "previously…", "now…", TODO plans or history. Write specific, checkable facts (file paths, exported names, defaults, units) and check each one against the code. Never guess.
- **The code is right when it disagrees with a doc.** If you find a stale or wrong doc, even one unrelated to your task, fix it in your commit. If it's large, flag it to the user.
- **A commit that changes behaviour or structure without matching doc updates is incomplete.** If a change really doesn't affect the docs (a comment typo, say), state that in your report instead of skipping the check silently.

## 2. Before you start

- Read [`docs/README.md`](docs/README.md), then [stack](docs/stack.md), [architecture](docs/architecture.md) and [coordinates](docs/coordinates-and-units.md), then the subsystem docs for the area you're touching.
- Read the code you will change and its callers. Don't rely on the docs alone.
- Run `git status` first. The user may have uncommitted work; never overwrite, revert or reformat it.
- If the request is ambiguous, or a decision belongs to the user, ask before building. That covers new dependencies, public API changes, behaviour beyond the request, and deleting content. State the assumptions you are making.

## 3. How to work

- **Think first.** Surface assumptions, trade-offs and simpler alternatives before writing code. If you're confused, say so.
- **Keep it simple.** Write the minimum code that solves the task: no speculative features, options, abstractions or error handling for cases that can't happen.
- **Make surgical changes.** Touch only what the task needs. Match the surrounding style. Don't refactor, rename or reformat code next to your change. Remove only the dead code your own change creates, and mention other dead code instead of deleting it.
- **Set a goal you can verify.** Before starting, decide how you'll prove the change works: a unit test, a type check, a screenshot or a value read from `window.__shoebox`. Iterate until it passes.
- **Content or engine?** Game-specific data belongs in `src/game`. `src/engine` must stay game-agnostic: no Mossvale names, maps or story in engine code. See [docs/extending.md](docs/extending.md).

## 4. Architecture rules (don't break these)

The full reasoning is in [docs/architecture.md](docs/architecture.md).

- `src/game` imports the engine only through `src/engine/index.ts`. The one exception is `src/game/maps/maps.test.ts`. `src/engine` never imports `src/game`.
- `world/`, `scripting/`, `math.ts`, `core/Input.ts` and `render/camera.ts` stay free of three.js and React so they keep running in node tests.
- **Nothing per-frame goes through React.** Per-frame state lives on `GameRuntime`, `World` and `Character`, and in refs, and is read and written in `useFrame`. The zustand UI store is for UI only and changes on events, never every frame.
- Frame order comes from `useFrame` priorities: `GameLoop` −2, `FollowCamera` −1, everything else 0, `EffectComposer` 1. Code that depends on ordering needs an explicit priority.
- Units are 1 tile = 1 world unit and 16 texture pixels per unit. A map's `y` is world `z`, and north is −z. Keep new art at whole-pixel sizes.
- Anything game code needs is exported from `src/engine/index.ts` deliberately. Adding to or changing the public API means updating the API table in `docs/architecture.md`, and `README.md` if users see it.
- Dispose every three.js geometry, material and texture you create outside the shared caches. `useGenerated()` keys must include every input that affects the output.
- Generated art must be deterministic (`createRng`, `hashTile`). `Math.random()` is only acceptable for runtime-only effects such as particles and NPC AI timing.
- The `GameConfig` passed to `<Shoebox>` must be a stable, module-level constant.
- Glowing parts need `emissiveIntensity` above about 1 to reach the bloom threshold. Upright sprites use `DoubleSide` materials so they cast shadows.

## 5. Code style

- **TypeScript** runs strict (TypeScript 6's default). Because of `verbatimModuleSyntax`, use `import type { X }` or `import { type X }`. Because of `erasableSyntaxOnly`, use no `enum`, `namespace` or constructor parameter properties; use unions and `as const` objects instead. Unused locals and parameters fail the build.
- **Formatting:** no semicolons, single quotes, 2-space indent, trailing commas in multi-line literals, lines up to about 120 characters. There is no formatter; match the file you're in.
- **Naming:** `PascalCase` for components, classes and types; `camelCase` for functions and variables; `UPPER_SNAKE_CASE` for module constants (`PIXELS_PER_UNIT`, `NPC_HALF_SIZE`).
- **Comments** only state a constraint the code can't show. Never narrate what the next line does, where code came from, or why your change is correct.
- **JSDoc** goes on exported functions and non-obvious methods, matching the existing style: a one-line summary, then `@param name - description`.
  - Never add a description to `@returns {void}`.
  - `@param` and `@returns` descriptions never start with the word "The".
- **Imports** come in four groups, in this order, separated by one blank line:
  1. External packages and node built-ins (`react`, `three`, `@react-three/fiber`, `zustand`).
  2. Files from other folders. This includes parents (`../types`, `../../engine`) **and subfolders** (`./core/GameRuntime`, `./maps/lab`), which is the convention throughout this repo.
  3. Files in the same folder (`./camera`, `./characters`).
  4. Style files (`./ui/ui.css`).

  Rules for the groups:
  - Type-only imports sit in the same group as their value counterparts.
  - Leave the order of existing imports alone, and keep named imports in their existing order. Never alphabetise. Only move an import if it is in the wrong group.
  - If no group has more than one import, put no blank lines between them.
  - Always leave a blank line after the last import.

## 6. Verification before you say "done"

- **Always run** `npm test && npm run build && npm run lint`. `build` includes `tsc -b`, so it is the type check.
  - All tests must pass, and the build must exit 0.
  - Lint must show 0 errors and no new warnings. The current count is in [docs/known-issues.md](docs/known-issues.md); update it if it changes.
- **Tests:** add or update unit tests for any change to pure logic (world, collision, scripting, map data), then update the counts in [docs/testing.md](docs/testing.md).
- **Anything visual or interactive**, such as rendering, look, input, UI, scripts or map layout, needs a browser check. Follow [docs/testing.md](docs/testing.md):
  - Run `npm run dev`.
  - Drive the game with `KeyboardEvent`s and read state through `window.__shoebox`.
  - Take screenshots, and compare before and after from a fixed player position when changing the look.
- **Clean up.** The game renders every frame and pins the CPU and GPU:
  - Stop any dev server you started.
  - Close or blank (`about:blank`) any browser tab you opened on the game.
  - Leave no background processes behind.
- **Report honestly.** Say what you verified and how, and anything you couldn't verify.

## 7. Commands and environment

- On this machine, prefix the first node-based command in a session with `source ~/.nvm/nvm.sh &&`, so nvm is loaded. Node must be `^20.19.0 || >=22.12.0`.
- Use the npm scripts for project tasks: `npm run dev`, `npm test`, `npm run build`, `npm run lint`. Use `bun` to run one-off `.ts` or `.js` scripts.
- The package manager is npm (`package-lock.json`). Don't add, remove or upgrade dependencies without asking. If you do change them, update [docs/stack.md](docs/stack.md).
- The dev server uses port 5173. Check it isn't already running (`lsof -nP -iTCP:5173 -sTCP:LISTEN`) before you start one. Reuse the one that's running, and don't kill a server you didn't start without a reason.
- Put scratch files in `.agent-tmp/` and durable notes, plans and summaries in `.agent-files/`. Both are git-ignored on this machine through `.git/info/exclude`. Never commit them, and never reference them from code or docs.

## 8. Git

- **Don't commit, push, branch, stash, reset or rewrite history unless the user asks.**
- When asked to commit:
  - Apply the documentation rule (section 1).
  - Run the full check (section 6).
  - Stage specific paths rather than `git add -A`.
  - Keep one logical change per commit, with a short imperative subject line.
- Never commit `node_modules/`, `dist/`, `.agent-files/`, `.agent-tmp/`, secrets or large binaries.

## 9. Content and assets

- **Only original content.** No Pokémon names, characters, places, sprites, music or text, and no assets or names from any other commercial game. The demo setting (Mossvale) and its characters are original; keep new content original too.
- Art is generated in code ([docs/assets.md](docs/assets.md)). External assets (PNGs, audio) need a clear licence. Put them in `public/`, and record their source and licence in `docs/assets.md`.

## 10. Working alongside other agents

- Use one agent per working tree, dev server and browser tab. Don't run two agents on the same task at once.
- If another agent's files, server or tab are active, leave them alone and coordinate through the user.
