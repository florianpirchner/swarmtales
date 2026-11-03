# Step 18, team C1 (judge, classifier, weaver as overseers): requests to the integrator

C1 carved the blame judge, the statement classifier and the weaver out of `packages/roles` into
overseers (`defineOverseer`, `docs/design/overseer-api.md` §1.4, §1.5, §6 step 7). The old roles, the old
engine, `world.ts`, `mechanics/shared`, every golden file and every prompt file that existed are untouched.

**Where things are**

- `packages/roles/src/overseer/{judge,classifier,weaver,fate,statements,order,index}.ts`, exported as the
  namespace `overseers` of `@swarmtales/roles` (the old roles keep their names, so a flat `export *` would
  clash: `FateTriggers`, `FateHit`). They import only contracts, kernel and typebox; nothing of the engine.
- `judgeFor(temper)` gives the judge (one definition per temper, all with the id `judge`);
  `classifierOverseer.as("classifier", { label, maxChars })`; `weaverOverseer.as("weaver", { characters, acts, startLevel })`.
- New prompt files (8) and registry keys: `judge/system-{fair,partial,capricious}` and `classifier/system-plain`
  (the old `judge/system` and `classifier/system` rendered once, pinned byte for byte by the differential tests),
  `{judge,classifier,weaver}/input` (`{{question|batch|dossier}}{{standingOrders}}`), `classifier/tool-label`.
  No existing prompt file changed.
- `JudgeVerdict` (`packages/contracts/src/roles.ts`) is the one schema object that the `blame` tool's
  consult answer and the judge's `output` share (the loader demands the same object). `mechanics/receipts/src/blame-tool.ts`
  uses it (one line); the receipts differential tests pass unchanged.
- Tests: `test/overseers/{judge,classifier,weaver,conformance}.test.ts` (27 tests). Mutants: `docs/design/mutants-step18-C1.json`
  (38, all killed with `pnpm mutants docs/design/mutants-step18-C1.json`).

**What the differential tests prove** (old role against overseer on the same inputs)

- Judge: the real `blame` tool on real channels, ledger, marks, puzzles and progression, old World against the host: same replies,
  same `receipts`/`ledger`/`marks` events, same notices, same system prompt per temper and the same question text (standing,
  quotes cut at 1000 characters, all three channels), `JUDGE_FAILED` for a failing model and for an answer off the schema.
- Classifier: old `Interpreter` against the overseer: same system prompt, same prompt per batch (round, names, context of the
  conversations, 60 statements per batch), same `interpretation`, `interpretation_round`, `interpretation_error` events in the same
  order, unknown labels and residents dropped, a failed batch writes the error and no round, resume from a snapshot.
- Weaver: old `Weaver` against the overseer: same system prompt, same dossier per question (including act ends and names), same
  `fate_shift` events (kinds, texts, reasons, evidence, triggers), the caps (2 hard, 6 soft), the clipping, the same state
  (`shifts`, `voices`, `closed`, `pending`, `patches` without `seq`), resume from a snapshot.

**Requests and decisions**

1. **Slot orders.** `OVERSEER_ORDER = { classifier: 100, weaver: 200, gamemaker: 300 }` lives in `overseer/order.ts` because
   `mechanics/shared/src/order.ts` is frozen. Please move it there (O2 request 1) and give the gamemaker overseer the 300. The weaver
   uses two triggers, `200` (a schedule `every: 1`: the end of acts that are over) and `201` (the `between` hook: the touched
   residents), which keeps the old order (`closeActs`, then the hits) and lets the hits' dossiers see the act-end shifts.
2. **One judge per temper.** `system` must be a plain prompt, so the temper (`--judge-temper`) cannot be an option of one definition;
   `judgeFor("partial").as("judge")` is the CLI's mapping. If you want `.as("judge", { temper })`, the head's `system` has to be
   allowed to name a prompt per option value (then `judgeFor` goes away).
3. **Model slots.** judge and classifier use the slot `classifier` (as the old code), the weaver `weaver`. The old CLI defaulted the
   weaver's model to the classifier's: that is a swt.config default (`weaver` falls back to `classifier`), not the head's `fallback`
   (which would retry a failed call on the classifier model and change behaviour).
4. **Seq numbers (important).** The classifier's `interpretation.ref`, the weaver's dossier lines `- #seq ...` and `fate_shift.evidence`
   carry the seq of the *envelope* in the host log. The legacy adapter renumbers (`seq` counts the written events), so in `events.jsonl`
   these references would point to the wrong line as soon as core events are dropped from the old shape. Needed: a translator in the
   legacy adapter for `classifier.interpretation.ref` and `weaver.fate_shift.evidence` that maps envelope seq to legacy seq (the
   goldens contain neither event, so they stay byte-equal), and a decision whether the models should see legacy or envelope numbers
   in the prompts (they see envelope numbers now; the reporter's `#seq` evidence checks use the log it reads).
5. **`LEGACY_EVENT_OWNERS`.** `interpretation*` and `fate_shift` are still `app` there; they are now written by the sources
   `classifier` and `weaver`. The flat line is identical (checked: `flat()` of the envelopes equals the old events), only
   `envelopeFromLegacy` still makes them `app` events. Please add the two owners to `LegacyOwner` (chronicle is not C1's).
6. **`usage` events.** The old roles wrote one `usage` app event per request (agent `CL`, `WV`, and for the judge in `role_answered`).
   `OverseerReply` has only `costUsd`; the cost is in `overseer_answered`/`role_answered` and in the referee. The runtime adapter
   (packages/roles, shared model-call helper, not part of C1) has to write the `usage` events with `host.record` if the digest and
   the cost tables still need them, and to say which model answered. The `classifier` option `label` (the model name written into
   every `interpretation`) must be filled by the CLI from the resolved model.
7. **Decider backend.** The decider classifier (one yes/no per label) is a second `OverseerRuntime` adapter for the same
   definition; it must answer in the `items` shape (`ref`, `labels`, `targets`). Its per-statement errors cannot be reported
   (an answer is whole or failed): the adapter should fail the call when any request failed, or accept that the failed
   statements stay unlabelled and the round is marked as classified.
8. **Classifier and weaver run after the last minute.** The old arena ran the weaver only `round < durationMinutes` and not when the
   run stops; the classifier also after the last round (unless the budget is spent). The `between` hook gives the overseer neither
   the run's last minute nor a stop. Please add `last: boolean` to `Fired` (hook), or skip the `between` slot for overseers whose
   trigger says `skipLast: true`; until then the weaver asks one more round of questions (and spends it) at the last minute.
9. **Weaver state the app needs.** The CLI used `weaver.takeVoices(agent)`, `returnVoices`, `shiftOf(agent)` and the `rewrite`
   callback to build inputs and prompts. The overseer keeps the same data (`voices`, `shifts`) in its snapshot slice and writes every
   change as a `fate_shift` event, but an app cannot read an overseer's state. Proposals: a read-only `host.overseerSlice(name)`,
   or the app derives the queues from the `fate_shift` events (a `soft` event is a voice; an `act` or `hard` event is the new text;
   the act-end drops the queue), which needs one more event for "voices dropped" if no `act` answer follows. I kept the state
   faithful to the old `WeaverSnapshot` (plus the `cursor`) so a legacy snapshot can be written back.
10. **The weaver's inputs from outside the log.** `characters` (the character part of each prompt: core motive in prose or persona) and
    `acts` (titles) are options the CLI fills when it builds the story; `startLevel` is an option (default 1). If a mechanic should
    provide the character text, add a fact (e.g. `motives.character`) and I read it instead of the option.
11. **Exile is read from the log.** The weaver counts a resident as out of the city once an `exiled` event names it (the exile, seal
    and holdout mechanics write it), the acts from `progression.act_started`/`act_ended` events (type only, as the old roles read
    event types). No fact is needed; if a story drops those mechanics the weaver sees no exile and no act end.
12. **Known difference: two acts ending in one minute.** The old weaver built the second act's questions after the first act's
    answers were applied; the overseer builds all of a firing's questions first. It only matters when one resident changed in both
    acts and the first act-end shift would appear in the second's dossier. Also: an act-end and a hit for the same resident in one
    minute are two firings (as in the old code), so their dossiers do agree.
13. **Snapshot slices have no migration from the legacy snapshot.** The classifier slice is `{ cursor, history }` (the old
    `pending` is re-derived from the log after `cursor`); the weaver slice is the old `WeaverSnapshot` plus `cursor`. Both are
    version 1 with no `0 -> 1` migration, because the legacy `seq` of the cursor is unknown (request 4). Resuming an old run with
    the overseers starts with `cursor: 0` and replays the prefix: the weaver only *observes* it (alliances, readers), the classifier
    would label the whole prefix once; the CLI should write the cursor when it converts the legacy snapshot.
14. **Judge words.** The old verdict tool cut `board` and `gamemaker` at 400 characters by schema (a longer call was a failure).
    `JudgeVerdict` has no `maxLength` (it is the consult's answer schema and the receipts tests accept any string); the record
    already clips the board words (`recordQuote(..., JUDGE_WORDS_CHARS)`), the whisper to the gamemaker is not cut. The model
    runtime may enforce 400 in its answer tool; say if the schema should carry it.
15. **Round numbers.** The classifier writes `round = minute + 1` (the old `round_start`), as `ctx.minute` is the minute being closed in the
    `between` slot. Check against the arena's `round_end` once the CLI runs the overseers.
16. **A consult overseer has no `usage` of its own for the judge's model name.** The old `role_answered` usage carried provider and
    model; the consult stage only has `costUsd`. Same answer as request 6.
17. **Environment.** `pnpm tsc -b` writes `dist-types` in every package; they are ignored by git.
18. **Not C1's, found while running `pnpm check`: the whispers golden fails on the merge base.** `test/golden` `whispers-f10-grudge`
    (system prompt token counts, +27 tokens per resident) fails after merging `claude/project-thread-b71bdz` with `main`, with and
    without any C1 change (checked on the clean merge commit). Cause: `main` reworded `stories/whispers/addenda/grudge.md`
    (PR after 2633a13: forgiveness, "ask once by DM" step) and the golden's prompt pins still hold the old text. Decide whether the
    golden is regenerated on purpose (documented reason) or the addendum is reverted; C1 touched neither. Also: the merge
    conflicts in `CLAUDE.md` and `package.json` were resolved by keeping the branch's structure with `main`'s licence field
    (`"license": "SEE LICENSE IN LICENSE"`) and `docs/LESSONS-LEARNED.md` as the lessons file name (it is the name on disk).
