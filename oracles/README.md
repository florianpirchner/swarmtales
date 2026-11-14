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

The schema is `OracleSchema` in `packages/testkit/src/oracle/format.ts` (Typebox). A file has a head and a `timeline`.

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
that nobody's call triggered). Resident ids are `A01`, `A02`, ... in roster order (`setup.residents`); a mechanic's
"seats" and "table order" are that order.

Details the entries rely on:

- **What an event belongs to.** The events after a `minute`, `turn`, `call` or `resume` entry, up to the next such
  entry, are its consequences. After `minute`: what timers and start-of-minute jobs did (a forfeit, the next game).
  After `turn`: what the platform did when the turn opened (a delivery). After `call`: what the call did; after the
  last call of a turn also what the end of that turn did. The events before the first `minute` entry are the start
  of the run. An event's `actor` is who triggered it: a call's caller for everything that call set off (also the
  next round's deal), `host` for a timer.
- **`turn.inputs` may be empty.** The old platform also woke a resident for a standing reason without a line to read
  (its team is on move; in a replay of a live run, the answers to its last calls). See "Scheduling of the old
  platform".
- **`call.endsTurn`** is `true` where the answer told the caller that its turn is over (a move was made and another
  seat is to act). It is absent otherwise, and in the files of Whispers and City of Keys (their answers are read
  from the residents' own log lines, which do not carry it).
- **`call.reply`** is absent for a caller that is not a resident. `call.detail` may be absent for a refusal at the
  stage `parse`.
- **A refused call changes nothing** but the caller's count of calls in the minute (`STEP_LIMIT`), unless events
  follow it in the timeline (chess writes `move_refused`).
- **The pipeline stages** a call passes, in this order: `lock` (does the tool exist, is it granted, is it open for
  this caller now), `parse` (do the arguments fit the schema), `limit` (calls per minute), `afford` (can the caller
  pay), `rule` (a mechanic's rule, also one of another mechanic that gates the tool), `guard` and `consult` (a
  story's tool guard or a model role that is asked), `execute` (the tool's own code). The first stage that refuses
  ends the call, so a locked tool answers `TOOL_LOCKED` whatever its arguments are. [COVERAGE.md](COVERAGE.md) lists
  the platform's own codes.

### What counts as input and what as outcome

- **Inputs** (replay these, in the order of the file): `setup`; from the timeline the `minute` entries, the `turn`
  entries without their `inputs`, the `call` entries reduced to `actor`, `tool` and `params`, and the `resume`
  entries. In the files of Whispers and City of Keys also the answer of a model role, which a scripted model gave:
  the `answer` in the payload of `role_answered` (source `core`).
- **Outcomes** (compare these): the result fields of every `call`, the `event` entries, `end`.

A port replays a file by making the file's calls in the file's order: at each `turn` entry the named resident
takes a turn and makes the calls that follow it, at each `minute` entry the clock moves on. The file is the
schedule; the port's own scheduler is not asked. Every file here was checked that way against the old platform: fed
with nothing but these inputs, a fresh instance writes the same entries again.

Three levels of comparison, from strict to loose. A port states which level it reaches.

| Entry or field | Level 1, rules | Level 2, texts | Level 3, scheduling |
|---|---|---|---|
| `call.ok`, `call.code`, `call.stage` | compared | | |
| `event` whose `source` is a mechanic: `type`, `actor`, `audience`, `payload`, and its place among these events | compared | | |
| `event` of source `core` with the type `resident_suspended`, `referee_intervened`, `guard_verdict` or `role_asked` (a resident is out, the run is stopped, a guard's verdict, the question put to a model role) | compared | | |
| `end` | compared | | |
| `call.reply`, `call.detail`, `call.endsTurn` | | compared | |
| `turn.inputs` (every line's `source`, `kind`, `text`, and their order) | | compared | |
| texts inside payloads | compared as part of the payload | | |
| `turn` and `skip` entries: who is woken in which pass and block | | | compared |
| `event` of source `core` with the type `tool_locked` or `tool_unlocked` | | | compared |
| `event` of source `core` with the type `overseer_called`, `overseer_answered`, `decision_proposed`, `decision_settled` | | | compared |
| `minute` entries: the minute in which an entry falls | input | input | compared |
| `counts` | derived, not compared | | |

1. **Rules.** The level every ported game must reach; renamed fields need a declared mapping. `tool_locked` and
   `tool_unlocked` are the old platform's way to open and close a tool for one resident; what they mean for the
   rules shows at this level as a call refused with `TOOL_LOCKED`.
2. **Texts.** Byte for byte. Decision D14 keeps the prompts and tool names of a ported game unchanged, so this
   level holds until a game sets a new baseline.
3. **Scheduling.** The rewrite has its own scheduler; this level documents the old one and need not be reached
   where a decision changes it.

The rules level as code is `scripts/oracles/projection.ts` (`--project <file>` prints it). It has two forms:

- **Replayed** (`rulesProjection`): per actor its calls with their verdicts, and the rule events in the order of
  the file. This is what a port must reproduce when it replays the file's calls in the file's order. The test
  shows that it does not change when skip entries, empty turns, pass and block numbers, lock events and all texts
  are taken away or changed.
- **Free-running** (`rulesByActor`, `--project <file> --by-actor`): per actor its calls and the events written in
  its name, each in the actor's own order; the order between two actors is dropped. This is for a port that plays
  the same scripted players under its own scheduler. It holds only for a game in which one resident acts at a
  time: the test plays the tic-tac-toe with one resident per side and heads-up liar's dice again in roster order
  instead of the seeded order and gets another order of events (the two brains before a game are written the
  other way round) but the same per-actor projection and the same `end`. With teams or simultaneous decisions
  another order of turns is another game (another member casts the vote that reaches the majority), and only
  the replayed form is defined. In a cut file the last minute may hold events of the next game that another
  schedule does not reach before the cut.

### What was normalised

- No wall-clock time, no duration, no model usage and no price: the old log's own events carry none, and the lines
  the app adds (model text, thinking, token usage, the tool call as the model wrote it) are left out. Fields named
  `costUsd`, `durationMs`, `elapsedMs`, `timestamp`, `ts` or `at` inside a payload are written as `0`. In these
  files that changed nothing: no payload has such a field with another value (`costUsd` is `0` in the scripted
  runs).
- No sequence numbers, no `causedBy` links, no hash chain, no signature. Order is the position in the timeline.
- Bookkeeping events of the old engine are folded into the entries above or dropped: `run_started` (it is
  `setup`), `run_ended` (`end`), `minute_started` and `minute_ended` (`minute`), `pass_started`, `turn_started`
  (`turn`), `turn_skipped` (`skip`), `tool_called` and `tool_refused` (`call`), `service_called` and `job_ran`
  (internal calls between mechanics and timers; their effects show as events).
- Mechanic options are written without functions.
- Content hashes that a mechanic puts into a payload (`brain_written.hash`) are kept: they are part of the game's
  events, and they are a function of the text next to them (see "Seeded randomness and hashes").
- The lines the old app adds to a resident's turn are left out, with one consequence for level 2: a live resident
  also read, after the lines in `inputs`, a line that lists the tools open to it whenever that list had changed
  (`[tools] Open to you now: ...`). The list itself follows from the `tool_locked` and `tool_unlocked` events.

### What a file does not hold

- **Model text.** No thinking, no free text of a model. The reasons a model gave as tool arguments are in `params`.
- **System prompts.** The turn inputs are in; the briefing a resident starts with is not. The first line a
  resident reads in a game states the game's rules (a `context-reset` line or the game's own first line), and the
  tools' descriptions and parameters are in [mechanics/](mechanics/).
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
  reproduces the recorded run exactly, refusals included. A file that was cut has `turnsLeft` above 0. The counts
  speak of what residents read. An event for the human only may differ from the recording where its code changed
  after the run: the scores of the morris referee in `morris-teams-nobrain-solo-s13.json` and one field of
  `game_scored` in `blind-bid-s31-live.json` do; every other event of every replayed file equals the recorded one.
- **`scripted`**: a hand-written player in `scripts/oracles/players.ts` (most are the players of
  `test/stories/*.test.ts`), which decides from its turn inputs and the answers to its own calls. Used where no
  recorded run replays exactly, see "Gaps". Some scripted players add calls the rules refuse (`-probes` in the file
  name), and one plays nobody at all (`-silent`): no resident ever calls a tool, so the timers of the game make
  every move.

Every file was produced twice from two fresh instances and compared byte for byte before it was written
(`scripts/export-oracles.ts` fails otherwise).

## Seeded randomness and hashes

Every random draw of a run comes from the run seed through a labelled stream. The rewrite keeps the generator bit
for bit, and the files hold the outcome of every draw that an event shows, so a port can be checked for the same
dice, deals and orders. The generator in full (all arithmetic on unsigned 32-bit integers; `imul` is the 32-bit
product):

```
streamSeed(seed, labels...):                    # FNV-1a over UTF-16 code units
    text = join(":", [decimal(seed mod 2^32), label1, label2, ...])     # numbers in decimal, e.g. "7:turns:0"
    h = 0x811c9dc5
    for each code unit c of text:  h = imul(h xor c, 0x01000193)
    return h

next(state):                                    # Mulberry32, a float in [0, 1)
    state = (state + 0x6d2b79f5) mod 2^32
    t = state
    t = imul(t xor (t >>> 15), t or 1)
    t = t xor (t + imul(t xor (t >>> 7), t or 61))
    return ((t xor (t >>> 14)) mod 2^32) / 2^32

int(min, max)  = min + floor(next() * (max - min + 1))
pick(items)    = items[floor(next() * length)]
shuffle(items) = copy; for i from length-1 down to 1: j = floor(next() * (i + 1)); swap copy[i], copy[j]
```

A stream starts at `state = streamSeed(seed, labels...)` each time it is named; nothing carries over between two
streams or two uses of the same labels. Check values: `streamSeed(7, "turns", 0)` is `2204626370`; its first
three `next()` are `0.048713934608`, `0.570031323470`, `0.804333479842`; its shuffle of `A01` to `A06` is
`A05, A06, A02, A04, A03, A01` (the first pass of `tictactoe/tictactoe-teams-s7.json`).

The streams, and where a file shows what was drawn:

| Labels | Draw | Shown in |
|---|---|---|
| `turns`, minute (pass 1); `turns`, minute, pass (later passes) | `shuffle` of the residents who may act, in roster order: the order of the pass when `setup.turns.order` is `seeded` | the `turn` and `skip` entries of the pass |
| `order`, minute + 1, pass | `shuffle` of the whole roster, then those who may not act are left out: the order of the pass when `setup.turns.order` is `custom` (Whispers, City of Keys) | the `turn` and `skip` entries |
| `liars-dice`, `roll`, game, round | per seat in table order, per die of the seat: `int(1, faces)` | `dice_rolled` |
| `draft-rounds`, `deck`, game | `shuffle` of the deck in the order amber `A1`..., basalt `B1`..., cobalt `C1`..., jade `J1`..., lodestones `L1`... | `draft_game_started.deck` |
| `consensus`, `forfeit`, team, minute, forfeits so far | `pick` among the legal cells in ascending order | `consensus_forfeited`, `move_played` with `forfeit: true` |
| `chess`, `forfeit`, game, plies played | `pick` among the legal moves in the order of the move generator | `move_played` with `forfeit: true` |
| `morris`, `engine`, game, turn | `pick` among the engine's best moves | `move_played` of the engine's side |
| `card-table`, `deal`, number of the deal | `shuffle` of the deck (suit by suit, ranks ascending), dealt one card a seat in turn | `cards_dealt` (hands sorted), `card_drawn`, `deal_revealed` |
| `trick-play`, `forfeit`, ...; `trick-play`, `reference`, game, round, seat | the card or bid a silent seat is given; the samples of the reference player | `bid_placed`, `card_played` with `forfeit: true`; `round_scored` |
| `holdem`, `deal`, game (0 with duplicate deals), hand | `shuffle` of the 52 cards in the order `2s 2h 2d 2c 3s` ... `Ac` | `cards_dealt` |
| `holdem`, `equity` / `range-equity` / `aid`, game, hand, decisions so far | the samples of the equity estimate | `decision_scored` |
| `convoy`, `roles`, game | `shuffle` of the seats; the first are the saboteurs | `convoy_game_started` (for the human) |
| `clue-grid`, `grid`, game | the words and the key of a game | `clue_key_dealt`, `clue_game_started` |
| `salt-market`, `deal`, cycle; `salt-market`, `spoil`, game, round | the goods and contracts of a game; the good that spoils | `market_game_started`, `market_spoiled` |
| `sealed-auction`, `deal`, game; `sealed-auction`, `tie`, game, lot | the lots, values and estimates; the winner among equal bids | `lots_dealt`, `lot_resolved` |
| `names` | the names offered to the residents | `name_chosen` |
| `puzzle`, level | the passwords, fragments and factors of a level | `fragments_dealt`, `factors_dealt` |
| `motives`, `goals`, `lottery`, `seal`, `tribunal`, `factions`, `whisperer`, `holdout-lot` (with their own further labels) | the draws of City of Keys and Whispers | the events of those mechanics |

For the four games ported first the table is complete: tic-tac-toe draws only the turn order and a forfeited
cell, liar's dice the turn order and the dice, quarry the turn order and the deck, econ-lab the turn order and
nothing else. For the other games the labels are complete and the base list of a shuffle is given where it is
short to state; where it is not (the word list of a clue grid, the lots of an auction), the outcome in the file is
the reference. The test `test/scripts/oracles.test.ts` re-derives the turn order of every pass of every file and
every roll of liar's dice from the algorithm above, written again without the platform's code.

Two hashes appear in payloads. `brain_written.hash` is cyrb53 of the brain text, as 14 hex digits:

```
h1 = 0xdeadbeef; h2 = 0x41c6ce57
for each UTF-16 code unit c of text:  h1 = imul(h1 xor c, 2654435761); h2 = imul(h2 xor c, 1597334677)
h1 = imul(h1 xor (h1 >>> 16), 2246822507) xor imul(h2 xor (h2 >>> 13), 3266489909)
h2 = imul(h2 xor (h2 >>> 16), 2246822507) xor imul(h1 xor (h1 >>> 13), 3266489909)
hash = hex((h2 and 0x1fffff) * 2^32 + (h1 mod 2^32)), padded with zeros to 14 digits
```

`brain_written.words` counts the parts of the trimmed text between runs of white space. The test checks both for
every brain in the files.

## Scheduling of the old platform

This is level 3; it explains the `turn` and `skip` entries.

- A minute has `setup.turns.passes` passes. In each pass every resident who may act (not suspended) comes up once,
  in the order of the pass (see the streams `turns` and `order` above), in blocks of `blockSize`.
- With `activation: "always"` each of them gets a turn. With `onNews` a resident gets a turn only if a mechanic has
  news for it (lines to read, or a standing reason such as "your team is on move"), or, in a replay of a live run,
  if its last turn made a call whose answers its model has not read yet; otherwise the pass writes `skip`.
- A resident makes any number of calls in a turn, up to `setup.limits.maxStepsPerMinute` in a minute, refused
  calls included; the next call answers `STEP_LIMIT`.
- Timers of the mechanics count minutes and fire when a minute begins. A run ends when a mechanic stops it
  (`end.reason: "referee"`, with the `limit` that fired) or after `setup.minutes` minutes.

## Regenerate and check

```
pnpm tsx --conditions=development scripts/export-oracles.ts            # write all files
pnpm tsx --conditions=development scripts/export-oracles.ts quarry     # one game
pnpm tsx --conditions=development scripts/export-oracles.ts --check    # write nothing, exit 1 on a difference
pnpm tsx --conditions=development scripts/export-oracles.ts --survey stories/quarry   # replay every recorded run, print the fidelity
pnpm tsx --conditions=development scripts/export-oracles.ts --diff <events.jsonl> [variant]   # where a replay differs
pnpm tsx --conditions=development scripts/export-oracles.ts --project <oracle.json> [--by-actor]   # the rules level of a file
pnpm vitest --run test/scripts/oracles.test.ts
cd oracles && sha256sum -c checksums.txt                               # the files are the ones that were exported
```

The catalog of files is `scripts/oracles/catalog.ts`. The test checks every committed file against the schema
(unknown fields are refused), its own counts and its checksum in `checksums.txt`, re-derives two files from the
code, and holds the README's statements on randomness and on the levels to the files; `--check` re-derives all. A
changed file means the old code's behaviour changed: do not regenerate to make a check green.

Next to the oracle files, written by the same script:

- [COVERAGE.md](COVERAGE.md): per game every tool and every refusal code of its mechanics, with the number of
  calls the files hold, and what no file exercises.
- [mechanics/](mechanics/): one page per loaded mechanic with its rules ("How it plays"), its tools with their
  parameters and descriptions, its events with their payload fields, and its options with their defaults. A
  file's `setup.mechanics[].id`, its tool names and its event types are explained there.
- `checksums.txt`: the SHA-256 of every oracle file and story definition.

## Games

| Game | Files | Replays of live runs | Scripted | Cut | Reach a final result | Size per file |
|---|---:|---:|---:|---:|---:|---|
| [tictactoe](tictactoe/) | 9 | 2 (2 exact) | 7 | 0 | 9 | 36-182 KB |
| [quarry](quarry/) | 6 | 4 (4 exact) | 2 | 1 | 5 | 197-271 KB |
| [econ-lab](econ-lab/) | 5 | 3 (3 exact) | 2 | 0 | 5 | 105-178 KB |
| [liars-dice](liars-dice/) | 6 | 0 | 6 | 3 | 3 | 69-282 KB |
| [blind-bid](blind-bid/) | 5 | 1 (answers exact, 12 of 104 turn inputs reworded) | 4 | 0 | 5 | 102-176 KB |
| [chess](chess/) | 5 | 3 (3 exact) | 2 | 3 | 2 | 31-293 KB |
| [convoy](convoy/) | 4 | 3 (3 exact) | 1 | 3 | 1 | 264-357 KB |
| [ember-tricks](ember-tricks/) | 4 | 3 (2 exact; 1 with answers exact, 4 of 336 turn inputs reworded) | 1 | 2 | 2 | 277-426 KB |
| [harbor-lights](harbor-lights/) | 6 | 5 (5 exact) | 1 | 1 | 5 | 115-706 KB |
| [holdem](holdem/) | 5 | 0 | 5 | 4 | 1 | 85-319 KB |
| [lanterns](lanterns/) | 4 | 3 (3 exact) | 1 | 3 | 1 | 140-272 KB |
| [morris-teams](morris-teams/) | 5 | 4 (4 exact) | 1 | 1 | 4 | 51-233 KB |
| [salt-market](salt-market/) | 4 | 3 (3 exact) | 1 | 3 | 1 | 192-316 KB |
| [whispers](whispers/) | 3 | 0 | 3 | 0 | 3 | 231-248 KB |
| [cityofkeys](cityofkeys/) | 5 | 0 | 5 | 0 | 5 | 186-343 KB |

76 files, about 15.8 MB, plus five story definitions (0.5 MB), 38 mechanic pages (0.3 MB), the coverage table and
the checksums. "Exact" means: every replayed turn showed the recorded inputs and every call got the recorded
answer, word for word. "Reach a final result" counts the files with an `end` head, that is a run the referee or
the minute limit closed; a cut file has `truncated` instead. Every game has at least one file that reaches its
final result. Each game folder has a `README.md` with the source of its calls, what its files cover and what they
do not; [COVERAGE.md](COVERAGE.md) has the same per tool and refusal code.

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
- **No file holds a decision with a window** (`decision_proposed`, `decision_settled`, the core tool
  `amendDecision`). The gate opens only with the tribunal option `decisionWindow` and a holder of `amendDecision`,
  and a holder is a human or an overseer, never a resident. The story path the oracle scripts use
  (`createHostFixture`) seats neither with that grant; only `test/mechanics/tribunal/verdict.test.ts` reaches the
  gate, on stand-in mechanics. A port of the gate has that test and `docs/design/overseer-api.md` as its statement,
  not an oracle file.
- **A burned puzzle piece** (`factor_burned` when its last holder is exiled) is in `cityofkeys/cityofkeys-burn-s7.json`.
  Only a `fragment` piece burns; certificates and counter-factors are kept (P43), so the standard City story, whose
  pieces are certificates, never burns one. The file therefore plays a reduced City (`cityofkeys/README.md`).
- **Timers that act for a silent player** (forfeits, missed bids, the minute limit) are in the `-silent` files: one
  per core-story game, in which no resident ever calls a tool and the mechanic plays alone to the final result.
  Mixed cases (one seat silent, the other playing) appear only where a recorded model was late.
- **Codes behind a closed tool.** Where a mechanic locks a tool outside a seat's turn, the call is refused with
  `TOOL_LOCKED` at the stage `lock`, and the mechanic's own code for the same case (`NOT_YOUR_TURN` and the like)
  cannot be reached through the pipeline. [COVERAGE.md](COVERAGE.md) lists them among the codes no file exercises.
- **Refusal paths are probed, not complete.** The `-probes` files of the four games ported first (tic-tac-toe,
  quarry, econ-lab, liar's dice) and `chess/chess-s13.json` call every tool of the game with wrong arguments, out of
  turn and after the end. Between 14 and 20 codes per game stay without a file: the ones behind a closed tool, the
  ones of the strategy brain (a mechanic all these games share; `BRAIN_EMPTY`, `BRAIN_REPLAY` and `BRAIN_TOO_LONG`
  are shown once, in tic-tac-toe), `GUARD_BLOCKED` (no core story has a guard) and codes for a caller who is no seat. The other games have fewer probes.
  [COVERAGE.md](COVERAGE.md) names every code no file shows; `test/mechanics` holds their unit tests until deleted.
- **Events only a human sees** differ from the recording in two replays (`move_scored` in
  `morris-teams/morris-teams-nobrain-solo-s13.json`, `secondPrice.capped` in `blind-bid/blind-bid-s31-live.json`):
  the code changed after the run. The file holds what today's code writes.
- **Ten files are above 300 KB, up to 706 KB** (convoy, hold'em, salt-market, the act-two file, and the silent
  files of ember-tricks and harbor-lights, which play every forfeited game to the end): the next smaller natural
  boundary would have dropped a whole game.
- **Not every registered variant has a file.** Each game has its default or the variant its recorded runs used,
  and at least one other; the game READMEs list what is missing.
- A long game is cut at the end of the minute in which a game (or hand) ended, so a cut file may hold the first
  events of the next game.
