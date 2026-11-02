# Step 18 requests from R2 (the host-backed gamemaker report)

Team R2 built item 2 of "Step 18: what remains" (`rewrite-status.md`), decision C2-4: the gamemaker's report from host
data for every mechanic, so the gamemaker overseer (`defineGamemaker`) can replace the app's gamemaker. Nothing old was
deleted (`world.ts`, the old `Gamemaker` and `describeSituation` run as before); the golden logs are untouched.

## What exists now

- **Facts and renderers per owner**, each next to its mechanic, as the tribunal's (S18-8):

  | owner | fact | renderer | old code |
  |---|---|---|---|
  | progression | `progression.section` | `renderProgressionHeader`, `renderResidents`, `ladderText` | header, `residentLine` |
  | puzzles | `puzzles.needs`, `puzzles.secrets` | (the app's wait lines; the guard) | `dependenciesOf`, `secretGuardOf` |
  | goals | `goals.texts` | (the app's "Who they are") | `goalOf` |
  | whispers | `whispers.section` | `renderWhispererSection` | `whispererLines`, `whisperDutyLines` |
  | standoff-tribunal | `standoff-tribunal.section` (the old five facts share its code) | `renderHoldoutSection` | `holdoutLines` |
  | seal | `seal.section` | `renderSealSection` | `sealLines` |
  | standoff | `standoff.section` | `renderStandoffSection`, `renderRiskSection` | `standoffLines`, `riskLines` |
  | tribunal | `tribunal.section` (S18-8) | `renderTribunalSection` | `tribunalLines` |

  Every fact is computed live from the owner's state and queries (R2-D4); the app parses each with the owner's schema.
- **The report**: `apps/cli/src/host/report.ts`, `hostGamemakerReport(story)`: the old section order, the "Who they
  are" block (core motive line, secret goal, the figure's material from direction 8 through `directFigure` and the
  story's figures), the wait lines (progression's standing residents with puzzles' dependencies), and the roles' shared
  `recentLines`/`labelLines` (now exported) with a `SecretGuard` from `puzzles.secrets`.
- **Roles**: `GamemakerLook.facts` (`ctx.facts()` at the look); `worldReport` ignores it.
- **Standoff** `uses` `TribunalViewApi` for the at-risk lines (`atRisk`, a query; the tribunal's own rng stays there).
- **Proof**
  - `test/cli/host-gamemaker-golden.test.ts`: the three goldens on `hostStoryOf` with the gamemaker overseer and its real
    runtime, no old `World`: every `gamemaker_turn.input` byte for byte, and every line outside the app plus every
    gamemaker app line (with the `usage` token counts) equal to the golden in order.
  - `test/cli/host-gamemaker-differential.test.ts` (harness `test/cli/support/report-replay.ts`): old runs recorded in
    memory and replayed on the host, every look byte for byte: City of Keys 30 minutes at direction 10 (sessions, the
    draft, gates, ransoms, exiles, at risk now and as things stand, the city's pieces, the seal's auction, secret goals,
    hidden teams, duty), a standoff (held-back pieces, a wrong code, hand-overs not used, an ultimatum, a borne seal),
    and the holdout tribunal on the whisperer (grace, vote, verdict, strike, the whisperer's lines gone).
  - `test/cli/host-gamemaker-sections.test.ts`: the branches no run reaches, pinned to the old wording.
  - Mutants: `docs/design/mutants-step18-R2.json`, all 22 killed.

## Requests

1. **R2-1 (arena): exiled residents' tool count in the standings.** Beyond the goldens (A1-9 was "built as far as
   the goldens go"), the host's `round_end`/`run_end` standings give an exiled resident its last tool count (22, 23);
   the old arena wrote 0. Seen in the 30-minute City of Keys differential; the test masks this one field and names it.
2. **R2-2 (kernel): `run_end` minute after the tribunal's stop.** In the same run the host writes `run_end` at minute 30,
   the old engine at 29 ("The tribunals are over"). This looks like A1-1/A1-7; the differential masks the minute of
   `run_end` only.
3. **R2-3 (item 1, the host runner): the report needs the runner's `text` and `tool_call` lines on the host log** before
   the minute's `between`: "Since your last look" quotes a resident's text, and the tracks' "last acted" follow
   `tool_call`. The replays write them with `turn.record` as the runner of item 1 must (same payloads as the goldens).
4. **R2-4: secrets in facts.** `puzzles.secrets` (passwords and deal values) and the existing `standoff.outstanding`
   (piece values) are readable by every fact reader (the app, an overseer's code). No model sees them (the report shows
   labels only and redacts with the guard). If facts ever reach a model or a plugin, they need an audience.
5. **R2-5: CLI wiring (item 2's second half and item 5).** Use `defineGamemaker(hostGamemakerReport(story))` with
   `gamemakerOptions(...)`; the system prompt input (`GamemakerPromptInput`) is still composed from the old `World` in
   `compose.ts` (the gate takes the old composer's prompt, pinned by the usage token counts). The definition-id router
   (C2-11) is still to build: the replays pass the gamemaker runtime as the host's only overseer runtime.
6. **R2-6: not reached by any old run** (and so only unit-pinned or shared code):
   - "waits at the door until every resident has" (`progression.section.ranking[].waiting`): no story has `holdAfter`;
     pinned in the sections test, no mutant can be killed by a run.
   - "rivals:" in "Who they are": no golden or differential look shows a rivals part; the code is the old `directFigure`.
   - the classifier's labels, the weaver's `fate_shift` lines, `blame` lines: the same roles code (`recentLines`,
     `labelLines`) over the same `recentOf` events (C2's tests); on the host they need the classifier, weaver and judge
     overseers (item 3).
   - "the city has seized" (a seized piece's price): pinned in the sections test.
7. **R2-7: an undealt level in the wait lines.** The old `dependenciesOf` read `inspect.factorsOf(level)`, which deals a
   level lazily; `puzzles.needs` treats a level that is not dealt as a team level. A resident never stands on an undealt
   level in the stories (a door deals up to the next door), so no run differs.
8. **R2-8: fact cost.** `host.facts()` computes every fact; the new sections query per resident (ranking, standing,
   dependencies, held pieces). Fine at 6; at 48 or 96 residents with fact triggers reading `facts()` often, a lazy
   `facts(names)` or a per-minute cache may be needed (facts are pure between two events).
