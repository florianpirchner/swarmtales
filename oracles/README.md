# Oracle files

One file is one game configuration with one seed, played on the platform as it was before the rewrite
(`docs/refactoring-before-release/REWRITE.md` section 8, issues 1 and 2; `DECISIONS.md` D7). A file is plain JSON
and names no class, module or API of the old code. It holds what went into the run and what came out of it.
The rewritten platform is correct for a game when it replays the inputs of the game's files and produces the
same outcomes.

The files were written by `scripts/export-oracles.ts` at runtime revision 2. The commit that produced a file is
the last commit that changed it (`git log -1 -- oracles/<game>/<file>`). The first export ran on top of commit
`9765702`.

## Format (version 1)

The schema is `OracleSchema` in `scripts/oracles/format.ts` (Typebox). A file has a head and a `timeline`.

| Field | Meaning |
|---|---|
| `format`, `version` | `swarmtales.oracle`, `1` |
| `game` | the folder under `oracles/` |
| `variant` | the name the old registry played the configuration under (`swt run --story <variant>`) |
| `seed` | the run seed. The random generator is Mulberry32 with labelled streams (`packages/kernel/src/random.ts`); the rewrite keeps it bit for bit |
| `runtimeRevision` | the runtime revision of the old platform (`docs/RUNTIME-REVISIONS.md`) |
| `source` | where the calls come from, see "Sources" |
| `setup` | the game identity and effective options, see below |
| `truncated` | present when the run was cut before its end: `afterMinute` and the `reason` |
| `end` | how the run ended: `reason` (`referee`: a mechanic ended the game, `limit` names it; `minutes`: the minute limit), `minute`. Absent in a truncated file |
| `counts` | entries per kind and events per `source.type`; a quick checksum of the timeline |
| `timeline` | the ordered entries, one per line in the file |

`setup`:

| Field | Meaning |
|---|---|
| `story` | the story id |
| `seed`, `minutes` | the seed and the limit of the virtual clock, in minutes |
| `residents` | the players' ids in roster order |
| `mechanics` | the loaded mechanics in load order, each with its effective options (teams, sizes, counts, timers) |
| `residentTools` | the tools a resident may call, in grant order |
| `locked` | tools every resident starts with locked; the mechanics unlock them |
| `turns` | `passes` per minute, `blockSize`, `activation` (`onNews`: a resident gets a turn only when it has news or an answer to read) and `order` (`seeded`: a seeded shuffle per pass; `custom`: a rule of the story) |
| `limits` | the run's own limits (`maxStepsPerMinute`: tool calls per resident and minute, refused ones included) |
| `definition` | City of Keys and Whispers only: the story is one definition from which the old platform derived the mechanics' options. `file` is that definition as JSON next to the oracles (`setup/<name>.story.json`), `effective` the run dials applied to it; `mechanics[].options` is `null` there |

### Timeline entries

Every entry has a kind `k`. The order of the entries is the order in which things happened.

| `k` | Fields | Meaning |
|---|---|---|
| `minute` | `minute` | a minute of the virtual clock begins. Timers of the mechanics (move timers, retro windows) count minutes |
| `turn` | `resident`, `pass`, `block`, `inputs` | a resident's turn begins. `inputs` is what the resident is shown: lines with the `source` mechanic, an optional `kind` and the `text` |
| `skip` | `resident`, `pass`, `block` | the resident had no news and got no turn in this pass |
| `call` | `actor`, `tool`, `params`, `ok`, then `reply` and `endsTurn`, or `code`, `stage`, `detail` | a tool call and its result. A refused call has `ok: false`, the refusal `code`, the pipeline `stage` that refused it (`lock`, `parse`, `limit`, `afford`, `rule`, `guard`, `consult`, `execute`) and the `detail` text |
| `event` | `source`, `type`, `actor`, `audience`, `payload` | an event a mechanic emitted (`source` is the mechanic id), or one of the platform's own events that carry meaning (`source: "core"`). `audience` lists who may read it; absent means everyone |
| `resume` | `minute` | the run was saved here and a fresh instance of the platform continued it from the saved state |

`actor` is `resident:<id>`, `gamemaker`, `script`, `human`, `overseer:<name>` or `host` (the clock, a timer, a hook
that nobody's call triggered). The events that follow a `call` entry up to the next `turn`, `call` or `minute`
entry are the consequences of that call or of the turn ending.

### What counts as input and what as outcome

- **Inputs** (replay these): `setup`, and from the timeline the `minute` entries, the `turn` entries without their
  `inputs`, and the `call` entries reduced to `actor`, `tool` and `params`.
- **Outcomes** (compare these): the result fields of every `call`, the `event` entries, `end`.

Three levels of comparison, from strict to loose. A port states which level it reaches.

1. **Rules.** Per call: `ok`, `code`, `stage`. All `event` entries whose `source` is a mechanic, in order, with
   their `type`, `actor`, `audience` and `payload`. `end`. This is the level every ported game must reach; renamed
   fields need a declared mapping.
2. **Texts.** In addition `reply`, `detail` and the `inputs` of each turn, byte for byte. Decision D14 keeps the
   prompts and tool names of a ported game unchanged, so this level holds until a game sets a new baseline.
3. **Scheduling.** In addition the `turn` and `skip` entries (who is woken in which pass) and the `core` events
   (`tool_locked`, `tool_unlocked`, `resident_suspended`, `referee_intervened`, the decision and overseer events).
   The rewrite has its own scheduler; this level documents the old one and need not be reached where a decision
   changes it. The `turn` entries still say at which point of the run each call was made.

### What was normalised

- No wall-clock time, no duration, no model usage and no price: the old log's own events carry none, and the lines
  the app adds (model text, thinking, token usage, the tool call as the model wrote it) are left out. Fields named
  `costUsd`, `durationMs`, `elapsedMs`, `timestamp`, `ts` or `at` inside a payload are written as `0`.
- No sequence numbers, no `causedBy` links, no hash chain, no signature. Order is the position in the timeline.
- Bookkeeping events of the old engine are folded into the entries above or dropped: `run_started` (it is
  `setup`), `run_ended` (`end`), `minute_started` and `minute_ended` (`minute`), `pass_started`, `turn_started`
  (`turn`), `turn_skipped` (`skip`), `tool_called` and `tool_refused` (`call`), `service_called` and `job_ran`
  (internal calls between mechanics and timers; their effects show as events).
- Mechanic options are written without functions.
- Content hashes that a mechanic puts into a payload (`brain_written.hash`) are kept: they are part of the game's
  events, and they are a function of the text next to them.

### What a file does not hold

- **Model text.** No thinking, no free text of a model. The reasons a model gave as tool arguments are in `params`.
- **System prompts and tool descriptions.** The turn inputs are in; the briefing a resident starts with is not.
- **Hidden state that no event shows.** Deals from the seeded generator are in a file when the mechanic emits
  them (most do, with `audience: ["human"]`); the game's README says what is visible.
- **Replies to callers that are not residents.** The old log keeps the reply text only where the caller read it;
  a `script` or `gamemaker` call has `ok` and, when refused, `code`, `stage` and `detail`.

## Sources

`source.kind` says where the calls come from.

- **`live-replay`**: the tool calls of a recorded live run (`stories/<game>/runs/.../events.jsonl`), played again
  on a fresh instance with the same story name and seed. The replay gives each resident the calls its model made,
  turn by turn. `source.fidelity` counts how many turns showed the recorded inputs word for word and how many
  calls got the recorded answer word for word. Where all counts are equal and `turnsLeft` is 0, today's code
  reproduces the recorded run exactly, refusals included. A file that was cut has `turnsLeft` above 0.
- **`scripted`**: a hand-written player in `scripts/oracles/players.ts` (most are the players of
  `test/stories/*.test.ts`), which decides from its turn inputs and the answers to its own calls. Used where no
  recorded run replays exactly, see "Gaps". Some scripted players add a few calls the rules refuse.

Every file was produced twice from two fresh instances and compared byte for byte before it was written
(`scripts/export-oracles.ts` fails otherwise).

## Regenerate and check

```
pnpm tsx --conditions=development scripts/export-oracles.ts            # write all files
pnpm tsx --conditions=development scripts/export-oracles.ts quarry     # one game
pnpm tsx --conditions=development scripts/export-oracles.ts --check    # write nothing, exit 1 on a difference
pnpm tsx --conditions=development scripts/export-oracles.ts --survey stories/quarry   # replay every recorded run, print the fidelity
pnpm tsx --conditions=development scripts/export-oracles.ts --diff <events.jsonl> [variant]   # where a replay differs
pnpm vitest --run test/scripts/oracles.test.ts
```

The catalog of files is `scripts/oracles/catalog.ts`. The test checks every committed file against the schema and
its own counts and re-derives two of them; `--check` re-derives all. A changed file means the old code's behaviour
changed: do not regenerate to make a check green.

## Games

| Game | Files | Replays of live runs | Scripted | Cut | Size per file |
|---|---:|---:|---:|---:|---|
| [tictactoe](tictactoe/) | 7 | 2 (2 exact) | 5 | 0 | 58-182 KB |
| [quarry](quarry/) | 4 | 4 (4 exact) | 0 | 1 | 197-271 KB |
| [econ-lab](econ-lab/) | 3 | 3 (3 exact) | 0 | 0 | 119-178 KB |
| [liars-dice](liars-dice/) | 4 | 0 | 4 | 3 | 69-282 KB |
| [blind-bid](blind-bid/) | 4 | 1 (answers exact, 12 of 104 turn inputs reworded) | 3 | 0 | 102-176 KB |
| [chess](chess/) | 3 | 3 (3 exact) | 0 | 3 | 107-293 KB |
| [convoy](convoy/) | 3 | 3 (3 exact) | 0 | 3 | 264-357 KB |
| [ember-tricks](ember-tricks/) | 3 | 3 (2 exact; 1 with answers exact, 4 of 336 turn inputs reworded) | 0 | 2 | 277-294 KB |
| [harbor-lights](harbor-lights/) | 5 | 5 (5 exact) | 0 | 1 | 115-254 KB |
| [holdem](holdem/) | 4 | 0 | 4 | 4 | 221-319 KB |
| [lanterns](lanterns/) | 3 | 3 (3 exact) | 0 | 3 | 250-272 KB |
| [morris-teams](morris-teams/) | 4 | 4 (4 exact) | 0 | 1 | 109-233 KB |
| [salt-market](salt-market/) | 3 | 3 (3 exact) | 0 | 3 | 273-316 KB |
| [whispers](whispers/) | 3 | 0 | 3 | 0 | 231-248 KB |
| [cityofkeys](cityofkeys/) | 4 | 0 | 4 | 0 | 186-343 KB |

57 files, about 12 MB, plus four story definitions (0.4 MB). "Exact" means: every replayed turn showed the
recorded inputs and every call got the recorded answer, word for word. Each game folder has a `README.md` with
the source of its calls, what its files cover and what they do not.

## Gaps

- **Liar's dice and hold'em have no replay of a live run.** All their recorded runs were played at runtime
  revision 1. Since revision 2 a call may end the caller's turn, so a seat is no longer woken to answer its own
  tool result, and the recorded turns do not line up with today's turns. Their files come from scripted players,
  with a few refused calls added. The old runtime can be checked out at the tag `runtime-r1` to replay those
  runs on it; that was not done here, because the oracle must describe the state that is frozen.
- **Tic-tac-toe on the 3x3 board and with teams of three has no replay of a live run** for the same kind of
  reason: the rules and texts changed after those runs (P410). The scripted files cover them; two 5x5 solo runs
  replay exactly.
- **Whispers and City of Keys are scripted only.** A live run of them has gamemaker, classifier, judge and guard
  models whose answers are not tool calls of residents. Replaying one needs those answers scripted too.
- **The act-two file of City of Keys starts from a saved state** that is not part of the file
  (`cityofkeys/README.md`).
- **No file holds a burned puzzle piece or a decision with a window**; see `cityofkeys/README.md` for why.
- **Timers that act for a silent player** (forfeits, missed bids) appear only where a recorded model was late.
  No file is built around them; `test/mechanics` covers them.
- **Eight files are above 300 KB, up to 357 KB** (convoy, hold'em, salt-market, the act-two file): the next smaller
  natural boundary would have dropped a whole game.
- **Not every registered variant has a file.** Each game has its default or the variant its recorded runs used,
  and at least one other; the game READMEs list what is missing.
- A long game is cut at the end of the minute in which a game (or hand) ended, so a cut file may hold the first
  events of the next game.
