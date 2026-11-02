# Step 18, team R3 (runtimes for classifier, weaver and judge; small kernel and shared items): requests

R3 built rewrite-status "Step 18: what remains" items 3 and 4 as far as `step18-decisions.md` lists them. Nothing old was
deleted: `world.ts`, `packages/engine`, the old roles and every golden file are untouched (goldens byte-identical).
Mutants: `docs/design/mutants-step18-R3.json` (`pnpm mutants docs/design/mutants-step18-R3.json`).

## What exists now

**Runtimes** (`packages/roles/src/overseer/`, exported in the namespace `overseers` of `@swarmtales/roles`)

- `chat-answer.ts`: the one-request loop the old roles shared (system prompt, the input as the one user message, one answer
  tool, one model call), `USAGE_APP_EVENTS` (`usage`, the same schema as the old event; `GAMEMAKER_APP_EVENTS.usage` now
  uses the same object), `recordUsage`.
- `classifierRuntime({ host, binding, thinking })`: the old `ChatStatementClassifier` (tool `label`, several calls of it in
  one turn are one answer). `deciderRuntime({ host, models, model, maxChars?, timeoutMs? })`: the old
  `DeciderStatementClassifier`, answering in the same `items` shape; it reads the batch back from the host log by the `#seq`
  of the call's lines (needs `host.log` and `host.residents`). `classifierLabel(binding)` gives `<provider>/<model>` for the
  classifier option `label` (C1-6).
- `weaverRuntime(...)` (tool `weave`), `judgeRuntime(...)` (tool `verdict`; its answer tool carries the old `maxLength: 400`
  for `board` and `gamemaker`, C1-14; `JudgeVerdict` stays without it).
- Every runtime writes the old `usage` line (agent `CL`, `WV`, `JD`) with `host.record` per request, before the events the
  answer causes (C1-6); it refuses another definition (`ok: false`), like `gamemakerRuntime`.
- `resume.ts`: `overseerEntriesAtResume(roles, lastSeq, names)` builds the host snapshot's `overseers` entries from the old
  `interpreter`, `weaver` and `gamemaker` fields (C1-13 cursor, C2-9 `seen`).
- Weaver after the last round / once `arena.stopping` is set (C1-8): it asks nobody and writes nothing, but still collects
  the minute's hits into `pending` (the old weaver recorded them without being asked; the differential state test needs it).
  `worthALook` of the gamemaker is exported and shared.
- `host.overseerSlice(name)` (C1-9): a copy of the overseer's snapshot slice, `undefined` for an unknown name or no state.

**Kernel / shared**

- A1-1: a breach or stop noticed at a minute's start, before any pass began (`TurnLoop.play` now returns the number of
  passes), ends the run at that minute and keeps the clock there; `run_end.minute` equals the old one. `host.stop` between
  minutes stamps `run_ended` and the `runEnded` phases with the last played minute (the minute the old arena wrote). The
  differential's `endShift` is gone.
- A1-4: `host.stop(reason)` hands its text to the `runEnded` hooks as a third argument (`(reason, ctx, detail?)`); the arena
  writes it into `run_end` when it has no reason of its own. `RunEnd` and the `run_ended` core event are unchanged.
- A1-6: `ProgressionApi.hasSolved`; the arena's `reachablePoints` uses it (old `solved.includes`). `FINGERPRINT` in
  `test/mechanics/shared-frozen.test.ts` is recomputed (see the merge note below).
- S1-5 / A1-5: `toLegacySnapshot` writes the version-1 slices of arena, progression, channels and script back; the arena field
  merges `delivered` (progression) and `seenBoard` (channels). Proof: `test/snapshot/legacy-writeback.test.ts` writes the
  L7 file back byte for byte from a resumed host's own slices.

## Requests and open points

1. **CLI wiring (item 5)**: build the bindings from `swt.config` (`createModelSource(...).bind("CL" | "WV" | "JD", limits)`),
   create the runtimes, and give `HostOptions.overseers` one runtime. **There is still no router** (C2-11, item 2): a definition
   id to runtime map is needed for the gamemaker, classifier, weaver and judge to share one host; every runtime here answers
   `ok: false` for a foreign definition so a router can be a plain lookup. `app.events` must merge `GAMEMAKER_APP_EVENTS` and
   `USAGE_APP_EVENTS` (the `usage` key is the same object).
2. **Weaver's app state (open)**: the CLI builds the resident's inputs and prompt from `host.overseerSlice("weaver")` (`shifts` =
   the last hard texts, `voices` = inner voices not heard yet). The old app called `takeVoices`/`returnVoices`, which consume
   the voices; `overseerSlice` is read-only, so the CLI needs either its own "delivered up to" mark per resident or a
   `fate_delivered` event. R3 did not decide this; the old `rewrite` callback needs the same answer.
3. **Resume wiring**: `overseerEntriesAtResume(converted.roles, converted.host.seq, names)` goes into `host.overseers` of the
   converted snapshot; the story names must match (`classifier`, `weaver`, `gamemaker`). The classifier entry's `history`
   keeps legacy `seq` numbers in its context lines (they equal host seqs for the replayed prefix).
4. **S1-5 for the other mechanics**: only arena, progression, channels and script have a writer back to the old shape. A host
   snapshot with any other slice at version 1 (ledger, cast, receipts, marks, names, puzzles, petitions, goals, motives,
   whispers, exile, tribunal, seal, standoff, standoff-tribunal) still makes `toLegacySnapshot` throw
   (`no writer for version 1`). Needed before the CLI writes an old-format snapshot from the host (item 5/6); the pattern is
   `worldFields`/`arenaField` in `legacy-snapshot.ts`.
5. **Not done from item 4**: A1-7 (arena skips brakes after another mechanic's breach), S1-1/2/3 (shared queries
   `PuzzlesApi.teams`, `CastApi.collection`, `PetitionsApi.status`), S1-6/S1-7 (cast and treasury order), O2-10 (loader refusal).
   They were not in the brief for R3.
6. **Decider details**: the decider cannot report per-statement errors (C1-7): any failed request fails the whole call with the
   errors joined by `; `, the round is retried. It parses the call's text (`#seq` lines under the statements heading and the
   context heading), so a story that overrides those two prompts breaks it (story prompt overrides are refused until the
   cut-over anyway).
7. **hasSolved and the arena**: no fixture reaches "passed without a solve" in the arena (the real progression only passes by
   solving), so the arena's use of `hasSolved` is gated by the API test (`solved.test.ts`, with an edited L7 snapshot) and the
   goldens, not by a differential; a mutant that swaps it back to `hasPassed` in the arena survives and is not listed.
8. **Merge note**: R3 changed `FINGERPRINT` in `test/mechanics/shared-frozen.test.ts` for `hasSolved`; any other team that
   adds a shared API in the same wave must recompute it after merging (the value is whatever the test prints).
9. **Tests changed on purpose** (reasons in the test comments): `test/mechanics/arena/differential.test.ts` lost its `endShift`
   (the shift is gone, so every line now compares exactly); `test/overseers/weaver.test.ts` plays the old weaver with the
   arena's rule (no round at the last minute), so the capped scenario asks 11 times; `test/overseers/harness.ts` takes
   `appEvents`, any `OverseerRuntime`, and extra mechanics; the script resume test passes the script's version-1 slice
   directly to `toLegacySnapshot`.
10. **The weaver's act-end firing (schedule) at the last minute** is skipped too (old `closeActs` ran inside `afterRound`);
    no fixture ends an act in the last minute, so that branch has no mutant.
11. **Equivalent mutants left out**: removing `locksStale` or `notes` from `CURRENT_ONLY` changes nothing, because
    `worldFields` also keeps only keys named in the old file's layout, which never had them. The entries stay as a second guard.
