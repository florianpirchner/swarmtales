# The `swt` command line

One binary, `swarmtales`, with the short name `swt`. Noun first, verb second. In the repository,
`pnpm swt <command>` runs it from the sources; `pnpm build` makes `apps/cli/dist/swt.js`. The design
is in [docs/ideas/monorepo.md](ideas/monorepo.md) §3c; this page says what is built.

`swt` alone, or `swt --help`, lists every command. `swt <noun>` or `swt <noun> <verb> --help`
prints the verbs of a noun. Every noun-verb command below takes `--json` for machine-readable
output. Exit codes: 0 fine, 1 the thing asked about is wrong or missing (a story that does not
validate, an unknown module), 2 the command line is wrong (unknown verb, missing argument).

## Built

| Command | What it does |
|---|---|
| `swt story list` | the registered stories (`stories/index.ts`) |
| `swt story show <name\|file> [--yaml]` | run settings, acts, levels, tools and features of a story; `--yaml` writes the story as a YAML file with the schema line on top |
| `swt story validate [name\|file...]` | the story schema, then the cross-field rules of `validateStory`; no argument checks every registered story |
| `swt story schema [--out <file>]` | writes `story.schema.json` (`--out -` prints it); see [STORY-FORMAT.md](STORY-FORMAT.md) |
| `swt run start [options]` | plays a story: the options of `pnpm start`. `swt run --story x` (without `start`) keeps working. `--story` takes a registered name or the path of a YAML or JSON story file |
| `swt run start --tool-choice <auto\|required\|none>` | sets `tool_choice` on every resident request (env `ARENA_TOOL_CHOICE`; the flag wins). Needed for Gemma 3 on OpenRouter, which ignores tools without `required`. OpenAI-compatible providers get the string; Anthropic gets `{type: "any"}` for `required`, `{type: "auto"}` and `{type: "none"}` otherwise. Other roles (gamemaker, classifier, judge) are not affected |
| `swt run start --story econ-lab[-nobrain\|-ultimatum\|-public-goods\|-dilemma]` | the economics games lab: three games in a row with a private brain per seat, the control arm without one, or one game alone for twelve rounds; see `stories/econ-lab/README.md` |
| `swt run start --story quarry[-nobrain\|-open\|-burn]` | the drafting game Quarry: three games of pack passing with a private brain per seat, the control arm without one, every quarry visible during the game, or with burns (the hate-drafting arm; no burns by default since P125); see `stories/quarry/README.md` |
| `swt run start --story salt-market[-nobrain][-nospoil][-g<games>][-r<rounds>]` | the negotiation game Salt Market: four traders with secret values and contracts trade through a bank (offers, escrow or plain promises, a trade tax, spoilage), a private brain per trader; see `stories/salt-market/README.md` |
| `swt run start --story chess[-nobrain][-moves][-threats][-teams][-g<games>][-p<plies>]` | chess between two solo seats (or, with `-teams`, two teams of two with a rotating captain) with chess.js as the legality filter and referee: the brain arm, the control arm, the legal moves listed, the loose pieces listed, games and move cap by name, e.g. `chess-nobrain-g4-p120`; `pnpm lab:chess <run-dir>` scores a finished run with Stockfish 10 (lab only); see `stories/chess/README.md` |
| `swt run start --story holdem[-hu][-nobrain]`, `holdem-mixed`, `holdem-hu-mixed`, `holdem-aid-mixed` | fixed-limit Texas Hold'em with duplicate deals and a private brain per seat: four-handed (four games of eight hands) or heads-up (two games of twelve), each with a control arm without the brain and a mixed table (`holdem-mixed`: two seats with a brain, two without; `holdem-hu-mixed`: A01 with a brain, A02 without; `holdem-aid-mixed`: no brain, A01 and A03 see their range equity and the pot odds at each action); see `stories/holdem/README.md` |
| `swt run start --story blind-bid[-nobrain][-g<N>]` | sealed-bid auctions: four solo seats bid on six lots a game (pay-your-bid, pay-the-runner-up, shared worth with the winner's curse) from a purse, with a private brain per seat or the control arm without it; see `stories/blind-bid/README.md` |
| `swt run start --story liars-dice[-hu][-nobrain][-quiet][-g<N>][-d<N>]` | liar's dice with secret seeded rolls, bids checked by the engine, public table talk and a private brain per seat: four seats, three games of four dice each; control arms without the brain or without talk; see `stories/liars-dice/README.md` |
| `swt run start --story tictactoe-teams[-<N>x<N>][-nobrain\|-brain-o][-r<rounds>][-rules[<N>]]` | tic-tac-toe combinations by name (board 3 to 8, brain variant, rounds per move), e.g. `tictactoe-teams-5x5-nobrain-r6`; see `stories/tictactoe-teams/README.md` |
| `swt run start --story convoy[-nobrain][-g<games>][-d<damage>][-c<cooldown>]` | Convoy, the hidden-role card game: six seats, two secret saboteurs, eight stages of crews, votes of confidence and sealed safe or damage cards, a private brain per seat (three games, or `-g<games>`), and the control arm without the brain; `-d` sets the damaged stages that stop the convoy, `-c` the damage cooldown; see `stories/convoy/README.md` |
| `swt run start --story morris-teams[-nobrain][-g<games>][-r<rounds>][-t<turns>][-solo][-fc]` | nine men's morris with the tic-tac-toe teams setup (two teams of three, or one agent per side), by name: games in the match, rounds per move, turn limit; e.g. `morris-teams-g1-t60-solo`; see `stories/morris-teams/README.md` |
| `swt run start --story lanterns[-nobrain][-g<games>][-c<clues>]` | the word-clue game Lanterns: two teams of three, a keeper (rotating game by game) gives one-word clues and the seekers reveal words on a grid of 20; a brain per team, the control arm without one; by name: games, clues per team and game, e.g. `lanterns-g2`; see `stories/lanterns/README.md` |
| `swt run start --resident-model <A01,A02,...>=<provider>/<model>` | core stories only, repeatable: these residents use that model, the others `--provider`/`--model`. The model is split at the first `/` (`A04,A05,A06=openrouter/google/gemma-4-26b-a4b-it`, `A01=anthropic/haiku`); aliases work. An unknown resident or provider, or a missing API key of any provider used, refuses the run before it starts. `--tool-choice` applies to every provider used. `000-run.json` (`agents`), the genesis `models` (`residents` plus one entry per overridden id) and `usage.json` (`models`) record the models |
| `swt run list [--runs <dir>]` | the runs in a folder (default `runs/`): story, start, last minute, how it stopped, cost |
| `swt run show <run>` | result table, cost, stop reason, dials (`000-run.json` `effective`), and the state of the signed log |
| `swt run cost <run>` | tokens and cost, per competitor (a resumed run: prefix and own part) |
| `swt module list`, `swt module show <id>` | the mechanics: summary, required and provided APIs, options as JSON Schema (`--json`), events, decisions, prompt keys |
| `swt prompt list`, `swt prompt show <key>` | every prompt id with its variables and the layers that hold a file (story, mechanic, library); `show` marks the winner and prints its text |
| `swt prompt check` | the prompt checks of `swt validate`, for the library only |
| `swt archetype list [kind]`, `swt archetype show <name>` | the character library in `archetypes/` |
| `swt doctor` | node version, the prompt library, and for each provider whether its key variable is set. A key is never printed |
| `swt completion bash\|zsh\|fish` | prints a completion script built from the command table |
| `swt validate`, `swt report minutes\|run\|private`, `swt log verify`, `swt digest`, `swt novel`, `swt migrate gamemaker` | unchanged: the commands that were there before |

`<run>` is a run directory, a name under `--runs`, or a recorded run folder such as
`stories/whispers/runs/whispers-06a-008-deepseek` (its files sit in a `run/` subfolder, which is
found). The run commands read `000-run.json`, `usage.json` and the end of `events.jsonl` only, so a
large log is cheap to list; `run show` also verifies the signed chain when there is one.

Install the completion, for example:

```bash
swt completion bash > ~/.local/share/bash-completion/completions/swt
swt completion zsh  > "${fpath[1]}/_swt"
swt completion fish > ~/.config/fish/completions/swt.fish
```

## Not built yet

`story new` (scaffold), `run resume`, `run watch`, `run stop`, `prompt render`, `report`/`digest`/`novel`
as noun-verb (`digest build`, `novel write`), `lab`, a `--tools` list in `module show` (tools exist
only once a module is instantiated for a run), and reachability checks in `doctor` (it makes no
network call). The terminal UI, the expression language, the plugin sandbox and the editor
extension are later slices.

## How it is built

- `apps/cli/src/swt.ts` hands `process.argv` to `execute` in `apps/cli/src/swt/commands.ts`, which
  holds the command table. Each noun (`story-cmd.ts`, `run-cmd.ts`, `module-cmd.ts`,
  `prompt-cmd.ts`, `archetype-cmd.ts`) is a `Noun`: a name and verbs with an argument hint, a
  summary and a function of `(argv, io)` that returns the exit code. `swt --help`, the per-noun
  usage and the shell completion all read the same table, so a new verb shows up everywhere.
- The older commands are modules that read `process.argv` and run on import (`pnpm start` and the
  `report:*` scripts always did); `legacy(...)` in the table wraps them, so their options did not
  change.
- Tests call `execute` with a capturing `Io` (`test/cli/swt.test.ts`), so they need no process.
