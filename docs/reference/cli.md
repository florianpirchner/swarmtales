# The command line `swt`

`swt` plays a game into a run folder, resumes it, checks it, replays it, reports on it, analyses a chess run with the
reference engine, runs an experiment, and checks its own setup (`swt doctor`).
`swt`, `swt --help` and `swt <command> --help` print what this page says about the commands, from the same table
(`apps/cli/src/flags.ts`); a test holds the page and the table together.

A command is its words, one argument, and flags in any place: `swt run games/hello/game.ts --fake --seed 7`;
`swt doctor` takes no argument, and one after it is refused. A
relative path starts at the current directory. A command that cannot be read is `SWT-C003`; so is a flag that is
not in the command's table below, a flag of another command included (`swt run --plan`, decision A111): it is
refused before the work, never dropped. An error before the
work is printed as its issues (code, summary, why, fix) on the error output, or with `--json` as
`{ "issues": [...] }` on the standard output, and the command exits with 1.

## Commands

### `swt run <game file>`

Plays a game into a new run folder `<out>/<game id>-<NNN>`. With `--fake` the fake driver plays seeded legal calls
(no model, no cost); without it live models play under a cost cap.

A game file is a module (`.ts`, `.js`, `.mjs`) that default-exports a game, or a game in its data form (`.json`,
`.yaml`), which names its mechanics (`mechanics[].use`) and its Directors (`directors[].use`) by id. The ids come
from the installed table (decision A121): the packages that the project's `package.json` (the nearest one above the
game file) and then the command line's own list in `dependencies`, a package once. A package of the kind `mechanic`
names in its `package.json` the exports that are definitions:

```json
{ "swarmtales": { "kind": "mechanic", "mechanics": ["guessNumber"], "directors": ["crier"] } }
```

An id that two packages register, a listed export that is no definition, or a dependency that is not installed is
`SWT-C030`; a Director id that no package registers is `SWT-D002`. `swt replay`, `swt resume` and `swt report
--game` read the table so too; `swt report` without `--game` reads it from the nearest `package.json` above the run
folder.

| Flag | What |
|---|---|
| `--fake` | play with the fake driver |
| `--seed <n>` | the seed, a whole number from 0 to 4294967295; it wins over the game's own |
| `--set <name=json>` | override one param of a game family; may be repeated |
| `--out <dir>` | the folder that holds the run folders; `runs` when left out |
| `--json` | print the result as one JSON line |
| `--hand <file>` | the Human Hand: a JSON-lines file, or `-` for standard input (see "The hand file") |
| `--snapshot-at <ticks>` | write a snapshot after these numbers of finished ticks, a comma list: `--snapshot-at 2,6` |
| `--pause-on <mechanic>.<event>` | pause at the boundary after the first tick in which that event of that mechanic is written: write a snapshot and stop with exit code 3 (decision A55). The Act I base of the City is `--pause-on progression.act_ended`. A mechanic the game does not load, or an event it does not declare, is `SWT-C003` |
| `--provider <id>`, `--model <id>`, `--thinking <level>` | the model of a live run; `--thinking` is one of off, minimal, low, medium, high |
| `--director-model <name>=<provider>/<model>[:<thinking>[:<output cap>]]` | the model of one Director of a live run, which replaces the model of its use in the game for this run and is named in the manifest; may be repeated. Without it a Director plays the model of its use, else the model of the run. A name of no Director of the game is `SWT-C026` |
| `--budget <usd>` | the cost cap of a live run in US dollars; a live run needs one. The cap stops new requests and is not a ceiling. From runtime revision 5 no request is sent once the cost so far plus the dearest answer so far reaches the cap, and the run ends at `models.budget`; so a run can still pass its cap by three amounts: the first answer, which is sent before any cost is known; the answers of requests in flight together, each checked against the same total (the members of one block of `turns` with `blockSize` above 1, the activations of `parallel`); and an answer dearer than every one before it. An answer of a model with a price that comes without a cost closes the meter, and the run ends at `models.budget` too (from revision 6 the log holds that line as `cost_unknown`) |
| `--ledger <file>` | the spend ledger the cap must fit under |
| `--purpose <word>` | smoke (the default), pilot, exploratory or confirmatory |
| `--replicate <n>` | the index of the repetition; 0 when left out |

The manifest names the source of a run. Each plugin is recorded under the version of its package, read from the
`package.json` of the project (the nearest one above the game file) and of the command line, and from the installed
packages they list; a package found in neither is recorded at `0.0.0`. In a clone of the repository (a
`package.json` named `swarmtales-workspace` above the command line's folder, with no `node_modules` between) a live
run records the clone's `kernel.commit` and `kernel.dirty` from git, and `--purpose confirmatory` is refused
(`SWT-C023`) unless the tree is clean. An installed `swt` asks git nothing, also inside a project that is a git
repository: its manifest has neither field, the versions name the release that played, and a confirmatory run
plays (lesson P502).

| Exit code | Meaning |
|---|---|
| 0 | the run finished |
| 1 | an error before the run, or the log does not verify |
| 2 | the run ended with the reason `error` |
| 3 | the run is paused: the Human Hand has ended (`SWT-X009`), or `--pause-on`; a snapshot is written |
| 4 | a live run wrote a key value into its folder (`SWT-X030`) |
| 5 | a live run ended at its cost cap |

A snapshot is the file `<run>/snapshots/t<ticks>.json`; it writes no event. The snapshot of a live run also holds
the section `sessions`: each resident's conversation as its session saved it, through the key broker's
redaction, never a key. A tick boundary is the moment before
the first tick and after each tick while the run has not ended, so a run that ends after 4 ticks has the boundaries
0 to 3. A `--snapshot-at` value without a boundary writes nothing and gets a warning line on the error output:

```text
warning: `--snapshot-at 9` wrote no snapshot: the run ended after 4 ticks and had no tick boundary after 9
```

The exit code stays what it was.

### `swt resume <run dir>`

Plays a run on from a snapshot, into a new run folder beside the old one. The new log starts with the lines of the
old one up to the snapshot, then the marker `run_resumed`. A fake run plays on with the fake driver. A run of live
models plays on live and needs `--budget` (`SWT-X010` without it, and for a fake run with it): its residents go on
from the conversations in the snapshot's section `sessions` (`SWT-X008` for a snapshot without them), the game, the
seed, the params and the replicate are the old run's, and `--provider`, `--model`, `--thinking`,
`--director-model`, `--ledger` and `--purpose` are read as for `swt run`. The cap counts from the resume; the
reservation line of the ledger names the old run as `base`; the marker names each actor whose model differs from the
old run's under `replaced` (`<provider>/<model id>:<thinking>` before and now). A resumed run raises no runtime
revision (A55).

| Flag | What |
|---|---|
| `--game <game file>` | the game file of the run; required |
| `--snapshot <file>` | the snapshot to resume from; the latest of the run folder when left out |
| `--ticks <n>` | stop after this many finished ticks of the whole run, the snapshot's included: `--ticks 14` from a snapshot after 8 ticks plays 6 more. A value not above the snapshot's ticks would play none and is `SWT-C034` |
| `--out <dir>` | the folder that holds the new run folder; the one that holds the resumed run when left out |
| `--json` | print the result as one JSON line |
| `--hand <file>`, `--snapshot-at <ticks>`, `--pause-on <mechanic>.<event>` | as for `swt run`; the hand file is the one of the resumed run (see "The hand file"); an event in the old run's lines is no reason to pause |
| `--budget <usd>` and the other flags of a live run | as for `swt run`; a run of live models needs `--budget` |

| Exit code | Meaning |
|---|---|
| 0 | the run finished |
| 1 | an error before the run, or the log does not verify |
| 2 | the run ended with the reason `error` |
| 3 | the run stopped open: paused (the Human Hand ended, `SWT-X009`, or `--pause-on`), or at `--ticks` |
| 4 | a live run wrote a key value into its folder (`SWT-X030`) |
| 5 | a live run ended at its cost cap |

### `swt log verify <run dir>`

Checks the hash chain of a run folder. With `--previous <run dir>`, the folder the run was resumed from, it also
checks that the new log continues the old one. `--json` prints the verdict as one JSON line.

| Exit code | Meaning |
|---|---|
| 0 | the log holds and the run ended |
| 1 | the log is broken |
| 3 | the log holds and the run has no end |

### `swt report <run dir>`

Writes the report of a run into its folder. `--game <game file>` gives the game whose mechanics name the metrics;
without it the mechanics are the installed ones that the plugin ids of the run's manifest name. A mechanic of the
run whose metrics cannot be computed so is named in a line `metrics absent: <id>` at the head of the facts table.
A paused run (its log ends at a signed head without `run_ended`: paused by the Human Hand or `--pause-on`, or
stopped after `--ticks`) gets a report too: its header says "Paused", and its facts are headed "up to the pause". A
resumed run is counted from its last `run_resumed`: its header names the base (run, tick, snapshot), and the base's
part (the lines before the marker) stands apart in the section "The base's part (before the resume)". A run whose
manifest has `kernel.dirty: true` has a header line "Dirty tree" that names it (decision A127).

| Exit code | Meaning |
|---|---|
| 0 | the report is written |
| 1 | the run folder cannot be read |
| 4 | a file of the folder holds a key value (`SWT-X030`) |

### `swt replay <run dir>`

Replays a run from its log with `--game <game file>` and prints `equal, <n> lines`, or the first line that
differs. `--json` prints one JSON line. With `--previous <run dir>`, the folder a resumed run went on from, the
replay starts at the snapshot of that folder whose hash the manifest names and plays only the resumed run's own
lines; the continuity of the two folders must hold (a run that did not resume, or a folder without that snapshot,
is `SWT-C003`). The cost cap is then metered from the resume, as the resumed live run metered it.

| Exit code | Meaning |
|---|---|
| 0 | the replayed log is equal |
| 1 | it differs (`SWT-C031`), the run is not replayable (`SWT-T005` for a log that stops inside a tick, `SWT-T004`), or the folder does not verify |

### `swt scan <folder>`

Looks through every file of a folder, and of the folders below it, for the key values that the environment holds.
It prints file names and counts, never a value. `--json` prints one JSON line.

| Exit code | Meaning |
|---|---|
| 0 | no file holds a held key value |
| 1 | a file does (`SWT-X030`), or the folder is none |
| 3 | nothing was scanned: no key variable is set |

Exit code 3 is not "clean". The scan can only look for values it holds, so set the key variable of every provider
whose runs are in the folder (`SWT_ANTHROPIC_API_KEY` or `ARENA_ANTHROPIC_API_KEY`, `SWT_OPENROUTER_API_KEY` or
`OPENROUTER_API_KEY`) before you scan.

### `swt analyse chess <run dir>`

Scores every half-move of a chess run with the chess reference engine (Garbochess-JS, vendored under
`third_party/garbochess/`, offline, no model) as centipawn loss against the engine's best move. It writes
`analysis.json` (the engine, its commit and file hash, the depth, every half-move) and `ANALYSIS.md` (per game and
side: average centipawn loss, inaccuracies 50+, mistakes 100+, blunders 300+, missed mates) into the run folder,
prints the Markdown and scans the folder for a held key value. The log must verify (`SWT-E006`); an engine that
cannot measure is `SWT-E008`. Numbers of this engine are never compared with numbers of another engine.

| Flag | What |
|---|---|
| `--depth <plies>` | the search depth, a whole number from 1 to 64; 10 when left out (the calibrated baseline) |

| Exit code | Meaning |
|---|---|
| 0 | `analysis.json` and `ANALYSIS.md` are written |
| 1 | an error before the work: the folder does not verify or holds no chess game, a bad `--depth`, or the engine cannot measure |
| 4 | a file of the folder holds a key value (`SWT-X030`) |

### `swt experiment run <spec file>`

Plays the runs of an experiment that are still missing, into `--out <dir>` (`runs/<experiment id>` when left out),
under the spend ledger of `--ledger <file>`. With `--plan` it plays nothing: it prints the plan in the order it is
played, the estimate beside the caps, the model and, with `--ledger`, what the ledger holds of its cap, after checking
the arms and the metrics against the game as before a series.

| Exit code | Meaning |
|---|---|
| 0 | the plan is complete; with `--plan`, the plan is printed |
| 1 | an error before the work |
| 4 | a run wrote a key value into its folder |
| 6 | stopped at the experiment's cap, or after three failed runs |

### `swt experiment analyse <experiment dir>`

Analyses the runs of an experiment against its pass rule. It has no flag of its own.

| Exit code | Meaning |
|---|---|
| 0 | the pass rule is kept, or the spec has none |
| 1 | an error before the work |
| 3 | the pass rule is not kept |
| 4 | a file holds a key value |
| 7 | no verdict: too few runs |

### `swt doctor`

Checks the setup offline (and with `--online` one request per provider, below) and prints one line per check: `ok`, `warn` or `fail`, what was checked, what was found.
It reads files and the environment, writes nothing but the lines of `--ledger`, and names a key only by its variable, never by its value.
`--json` prints one JSON line `{ "checks": [{ "check", "status", "detail" }] }`.

| Check | `ok` | `warn` | `fail` |
|---|---|---|---|
| `node` in a clone (the folder whose `package.json` is `swarmtales-workspace`, upwards from the current directory) | the major of the Node that runs is that of the clone's `.node-version` | it is newer | it is older |
| `node` in a project | the Node that runs meets the `engines.node` (`>=x.y.z`) of the installed `swarmtales` | the range cannot be read | it does not meet it |
| `node`, neither found | | Node is not checked | |
| `swt` | the name and version of the command line that runs | | |
| `versions`, one per version line (platform, plugins; decision A123) | every installed `swarmtales` and `@swarmtales/*` package of the line, in the nearest `node_modules` and beside the real folder of `swarmtales`, has one version | the line is not in step, or no package is found | |
| `key <provider>`, for `anthropic` and `openrouter` | a key is set, in the first of `SWT_ANTHROPIC_API_KEY`, `ARENA_ANTHROPIC_API_KEY` (or `SWT_OPENROUTER_API_KEY`, `OPENROUTER_API_KEY`) that is not empty; a second one that is set is named as not read | no key is set (a fake run needs none) | the value is too short to be a key (`SWT-X006`) |
| `env` | which of `SWT_PROVIDER` and `SWT_MODEL` are set | an `SWT_` name that `swt` does not read, one line each | |

`swt doctor --online` goes on after these checks, with every provider that has a key that can be used, or only the
one of `--provider`. Per provider it binds the alias of the provider that the price table makes cheapest, with an
output cap of one token, and prints the estimated cost of one minimal request (64 input tokens and 1 output token at
the table's prices) **before** it sends that request: the one input line `Answer with the one word: ready`, no system
prompt, no tool. Then it prints the answer time and the cost of the usage. The cost meter holds the cap of
`--budget` (0.01 USD when left out) over all requests: a provider whose estimate does not fit under what is left is
skipped. With `--ledger <file>` the cap is reserved in the spend ledger under the name `doctor/online` before the
first request, and the cost line follows the last, as for a run (`SWT-C025` when it has no room). The key's value is
never printed: every line passes the key broker's redaction.

| Check | `ok` | `warn` | `fail` |
|---|---|---|---|
| `online <provider>`, the estimate | the model and the estimated cost; the request is sent | the estimate is above what is left of the budget: no request | |
| `online <provider>`, the answer | the model answered: the answer time, the tokens, the cost | | a refused key or an unreachable provider: the answer time, the provider's error text (redacted) |
| `online <provider>`, no request | | | `--provider` names a provider without a key that can be used, or no alias of the provider has a price |
| `online` | | no provider has a key: nothing was asked | |

Most online checks print two lines, the estimate and the answer; `--json` holds both in order.

| Flag | What |
|---|---|
| `--json` | print the checks as one JSON line |
| `--online` | also send one minimal request per provider, its estimated cost printed first |
| `--provider <id>` | with `--online`: ask only this provider (`anthropic`, `openrouter`); `SWT-X002` for an unknown one |
| `--budget <usd>` | with `--online`: the cap of all requests, held by the cost meter; 0.01 when left out |
| `--ledger <file>` | with `--online`: the spend ledger the cap is reserved in |

`--provider`, `--budget` and `--ledger` without `--online` are refused (`SWT-C003`).

| Exit code | Meaning |
|---|---|
| 0 | no check failed (a `warn` is worth a look) |
| 1 | a check failed (with `--online` also a refused key or an unreachable provider); or an error before the work: the issues are printed |

Every command takes `--help`.

## The hand file

The Human Hand is a person's interventions in a running game. `--hand <file>` reads them from a file with one JSON
object per line; empty lines are skipped. `--hand -` reads the same lines from standard input while the run plays.
The game must have the actor `human`: it has one when its grant `human` holds a tool (the mechanic `humanHand`
brings `pause` and `resume`).

A line has one of two forms:

```json
{"at": 7, "tool": "pause", "params": {"reason": "look at the board"}}
{"at": 7, "command": "snapshot"}
```

| Field | Meaning |
|---|---|
| `at` | the tick boundary of the line: the number of finished ticks, from 0 |
| `tool` | the shown name of a tool of the grant `human`; the call is made as the actor `human` and is in the log |
| `params` | the params of the call; `{}` when left out |
| `command` | only `"snapshot"`: write `<run>/snapshots/t<ticks>.json` at this boundary |

How the lines are applied:

- A line is due at the boundary after `at` finished ticks, or at any later one. A line of standard input is
  applied at the first boundary after it arrived.
- At a boundary the order is: the due lines in the order of the file, then the pause check, then `--snapshot-at`,
  then one tick.
- While the run is paused (the fact `humanHand.paused`), the next line of the file is taken whatever its `at`. So
  a `resume` line after a `pause` line ends the pause at the same boundary.
- When the run is paused and no line is left, the run writes a snapshot and stops with exit code 3 (`SWT-X009`).

Two kinds of line fail, in two ways:

- **A line that is no line of the Human Hand** (no JSON, neither form, a tool the grant `human` does not hold) is
  `SWT-X008`. A file is checked whole before the run, so no run folder is written; a line of standard input is
  checked when it arrives and ends the command.
- **A call that the game refuses** (for example `amendDecision` when no decision is open) does not stop the run.
  The refusal is in the log, it is printed on the error output as it happens, with the refusal code of the game,
  and the result lines count it (in the `--json` line: `"hand": { "calls": 3, "refused": 1 }`):

  ```text
  warning: the Human Hand's call of "amendDecision" after 8 ticks was refused with DECISION_CLOSED: ...
  Human Hand: 1 of 4 calls refused
  ```

  The exit code stays what it was. A file is written before the run and cannot know what the run will do; for a
  hand that depends on the run, give `--hand -` and type the lines while the run is paused.

### Resuming with a hand file

`swt resume` takes **the hand file of the run it resumes**, not a new one. It drops the lines that the run applied
before the snapshot: the first N tool lines, N being the calls of the actor `human` in the log up to the snapshot,
and every `snapshot` line with `at` at or below the snapshot's tick. Everything else is applied by the rules
above.

So to go on after a paused stop (`SWT-X009`): add a `resume` line to the end of the hand file of the stopped run,
and give that whole file to `swt resume --hand`. A file that holds only the `resume` line is dropped whole (it is
one of the first N tool lines), and the run stops again where it stopped. Standard input (`--hand -`) is taken as
it comes; nothing of it is dropped.
