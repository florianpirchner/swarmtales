# Step 18 requests from team G1 (`grants: "auto"`)

1. **Story mapping (R2-D17 / wave C, CLI wiring):** compose the stories with `grants: "auto"` and add only
   `grantTweaks` for the run's dials: `gamemaker: { add: ["ultimatum"] }` when `grantsUltimatum(direction, hasUltimatums)`
   (`mechanics/standoff/src/grants.ts`), and the gamemaker's tribunal tools. Today the standoff and standoff-tribunal tools suggest
   `gamemaker` unconditionally, so a story that loads them gets `ultimatum` granted without the direction test; the mapping must
   `drop` it below direction 10 (or a later change makes the grant conditional on an option).
2. **Wave C, roles as overseers:** an overseer's `needs` can be met by `grantTweaks` (`"terminator-1": { add: [...] }`) or by
   `suggest: ["acme/terminator"]` on the tool (definition id). Prefer the second for tools written for one overseer.
3. **Core tools:** `amendDecision` and the human's tools are not derived (core tools are skipped). If Flo wants
   `grants: "auto"` to give `human` its four tools, the core tools' `suggest: ["human"]` (`decisions.ts:222`, `human.ts:80`) is
   already there; only the `CORE_OWNER` skip in `auto-grants.ts` has to go (mutant G1-1 then needs a new baseline).
4. **A story without `names`** (rewrite-status step-18 list): the old engine offers `chooseName` regardless; with auto grants the
   tool is simply not granted when the `names` mechanic is not loaded. The equality test encodes this; check it when the off switch lands.
5. **Order:** derived resident tools are in load order, not in the old catalog order. If the prompt needs the catalog order, the
   story mapping uses `set`, or the CLI sorts by `TOOL_NAMES`; the golden gate (wave C) will show whether it matters.
6. **Environment note:** a fresh worktree needs `pnpm install --offline --frozen-lockfile` before `pnpm exec vitest`; otherwise
   `npx vitest` resolves `@swarmtales/*` to the main checkout's packages and silently tests the wrong code.
7. **Docs:** `docs/design/overseer-api.md` §2 now points at `grants-auto.md`; `rewrite-status.md` is left to the integrator.
