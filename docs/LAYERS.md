# Layers and import rules

Which package may import which. The table in code is `scripts/layers/table.ts`; `pnpm check:layers` enforces it on
declared dependencies and on actual imports. The decisions behind it are D8 and E6 in
[`refactoring-before-release/DECISIONS.md`](refactoring-before-release/DECISIONS.md) and section 4.4 of paper 01.

## The layers

A package declares its layer in `package.json`: `"swarmtales": { "layer": "L0" }`. A mechanic also declares
`"class": "base"`, `"class": "game"` or `"class": "director"` (a package of Directors, held to the rules of a game
mechanic; a base mechanic may not use one, M5-00). Every package under `packages/` has its own row in the table; a package
there without a row fails the check.

| Layer | Package | May import (workspace) | Node modules in source files |
|---|---|---|---|
| 0 | `contracts`, `chain` | no workspace package | none (they run in a browser) |
| 1 | `kernel` | `contracts` | none |
| 2 | `sdk` | `contracts`, `chain` (for the hash of a game). The sdk does not depend on the kernel | none |
| 2 | `prompts` | `contracts` | `node:fs`, `node:path`, `node:url` |
| 3 | `mechanics/*` | `sdk`, `contracts`, `mechanic-contracts`, and another mechanic through `/contract` and `/rules` only | none |
| 3 | `mechanics/contracts` (`mechanic-contracts`) | `contracts`, `sdk` | none |
| 4 | `engine` | `kernel`, `sdk`, `contracts`, `chain` | none |
| 4 | `runlog` | `contracts`, `chain` | `node:fs`, `node:path`, `node:crypto` |
| 4 | `testkit` | `engine`, `kernel`, `sdk`, `contracts`, `prompts` | `node:fs` |
| 4 | `models` | `contracts`. It gets the kernel as a type of contracts and the environment as a plain record; it does not import `kernel`, `sdk`, `engine`, `prompts` or `runlog` | none |
| 4 | `lab` | `contracts`, `chain` (for the hash of JSON), `runlog` (to verify a run folder). It does not import `kernel`, `sdk`, `engine` or `models`, so every number can be recomputed from a published log | `node:fs`, `node:path` |
| 5 | `viewer-core`, `viewer-ui` | `contracts`, `chain`; `viewer-ui` also `viewer-core` | none |
| 6 | `swarmtales` (the umbrella package), `apps/*`, `games/*`, `samples/*` | anything; the only place plugins are named | any |

Test files may import any Node module.

## The rules

1. **A plugin never imports the kernel.** A mechanic author imports `@swarmtales/sdk` only.
2. **A mechanic imports another mechanic only through `/contract` and `/rules`.** A test file is the exception: it may
   import another mechanic whole, as a declared development dependency, to play a match (DECISIONS A16). The provider owns its service
   contract in `/contract`; pure rule code is shared through `/rules`. A file of a `/contract` sub-path imports only
   `typebox`, `@swarmtales/contracts` and `@swarmtales/sdk`; a file of a `/rules` sub-path imports only `typebox`
   and other `/rules` files.
3. **No hub.** There is no shared mechanics package, no standard contracts package, no capabilities package and
   no schedulers package; the check refuses these names. The one shared package is `mechanics/contracts`: it holds
   only service contracts that have two providers, and all of it obeys the `/contract` rule.
4. **A base mechanic never uses a game mechanic.**
5. **Every imported workspace package is declared** in `package.json`, and the declared dependencies obey the same
   table.
6. **No dependency cycle** between workspace packages.
7. **At most twelve library packages** until three games run. A library package is a package under `packages/`
   that holds code; the umbrella package `swarmtales` (re-exports only) does not count. A folder becomes a package
   when a second consumer needs it alone.
8. **Tests** may import `@swarmtales/testkit` in addition to what their rule allows.
9. **An import names a package or a file of the same package.** A relative import does not leave its package (a
   configuration file at a package's root may import a file at the repository root); there are no path aliases
   (`paths`, `baseUrl`, `#name`); the target of `import()` and `require()` is a string.
10. **Code never imports a test file** (`*.test.ts`, or the `test/` folder of a package), so no code hides from the
    budgets and the limits in a test.

The check reads real imports: `import`, `import type`, `export ... from`, `import()`, `require()` and
`import x = require()`.

`scripts/gates/workspace.test.ts` keeps the workspace in the shape that the gates read: packages only in
`packages/`, `mechanics/`, `games/`, `samples/` and `apps/`, each with a `tsconfig.json` that the root one
references, source only under `src/` and `test/`, and for `packages/` and `mechanics/` a build, an API report
and its configuration.

The linter adds rules for code that runs inside a run (the kernel, the sdk and mechanics): no clock (`Date`),
randomness, timer, network, `process` or `node:` module; and no bare `throw new Error` in any package. In `models`
it forbids `process`, `Date`, `Math.random` and `setTimeout` (the provider library holds its own timers), in `lab`
`process` and `Math.random`.

**The environment is read in one file.** `process.env` is allowed only in `apps/cli/src/env.ts`; the linter refuses
it in every other file under `packages/`, `mechanics/`, `games/`, `samples/` and `apps/`, tests included
(`PROCESS_ENV` in `scripts/eslint/restricted.ts`). The scripts under `scripts/` are not part of a run and keep
their own reads. Third-party packages of `models`: `@earendil-works/pi-ai`, `@earendil-works/pi-agent-core` and
`typebox`; `apps/cli` is the only package that imports `models`, `lab`, `kernel` and `runlog` together.

## Changing the table

A new package gets its row in the same pull request, and a place inside or outside the engine budget
(`scripts/lib/budget.ts`). A change of `scripts/layers/table.ts` needs an issue that says which rule was missing or
wrong.
