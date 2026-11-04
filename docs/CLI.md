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
