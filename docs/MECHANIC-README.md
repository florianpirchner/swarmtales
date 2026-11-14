# The mechanic README

Every mechanic package under `mechanics/<name>/` has a `README.md` in one fixed shape, so a reader finds the same
answer in the same place in every package: what rule the mechanic sets, what residents can do with it, what it writes
to the log, how a game configures it and what the runs taught us about it.

A README has two kinds of sections. **Hand-written** sections explain what code cannot: the intent, the flow, the
traps. **Generated** sections list what the head of the mechanic already says (tools, events, options, services,
metrics, prompts) and are written by `pnpm docs:mechanics` between markers. They never go stale: `pnpm check` (the
gate test `scripts/gates/mechanic-docs.test.ts`) fails when a block does not match the head, a section or a marker is
missing, a section still says `_To be written._`, a mechanic folder has no README, or no mechanic is found at all.

## The sections

The sections appear in this order, each as a `## ` heading with exactly this name.

| Section | Kind | What goes in it |
| --- | --- | --- |
| `# <Name>` and one paragraph | hand-written | The rule the mechanic sets, in plain words, in two to four sentences. Other docs may quote this paragraph on its own, so it must stand alone. |
| At a glance | generated | Package, id, summary, the services it requires, uses when loaded and provides (with the mechanics that provide them), whether it keeps state (and the version of its snapshot slice), and the games of this repository that depend on its package. |
| How it plays | hand-written | The flow of play in order: what starts it, what a resident does, what happens on each call, how it ends. Edge cases and refusals that matter for play. How it works with the other mechanics it needs (which service it calls for what). What it deliberately does not do. |
| Tools | generated | Every tool the head declares: the grant names that get it when the game lists no grants, whether it is a free look, its parameters with types and descriptions, and the exact text the caller reads (the tool's description prompt). |
| Events | generated | Every event type it writes, its audience and its fields with types and descriptions. |
| Options | generated | Every option of the mechanic (`gridGame({...})`), nested ones as `a.b` or `a[].b`, with type, default and description. |
| Services | generated | The services it provides to other mechanics, with every method (command or query), its input, output and summary. |
| Metrics | generated | The numbers it exports about a finished run (`<mechanic id>.<metric id>`), with title, unit and the event types each is computed from. |
| Prompts | generated | Every prompt id with its variables and the file that holds its text. |
| Example | hand-written | A short excerpt of a real game that loads the mechanic (`games/<name>/game.ts`, with the path), and one sentence on what the options do there. |
| Lessons and loopholes | hand-written | The rows of `docs/LESSONS-LEARNED.md` about this mechanic: id (`P72`, `LH13`), one line on what happened, its status. Link to the log; do not copy the row. "None recorded yet." when there are none. |
| Tests | hand-written | Where the tests live and what they cover (rules, snapshots, the comparison with the old platform). |

## Generated blocks

A generated section holds one block:

```markdown
## Tools

<!-- generated:tools -->
...written by pnpm docs:mechanics...
<!-- /generated:tools -->
```

Text inside a block is overwritten on the next run. To change it, change what it is read from: a parameter's or
option's `description` in its Typebox schema, a tool's description prompt (`prompts/<id>.md`), the `summary` of the
head. Text outside the blocks is never touched.

The generator reads the head only (`definition.head`: tools, events, audiences, options, services, prompts, metrics).
It starts no mechanic and runs no handler, so every tool the head declares is listed, whatever options a game sets.
What lives in the body (facts, jobs, run limits) is not listed; name it in "How it plays" where it matters for play.

## Commands

- `pnpm docs:mechanics` rewrites every generated block and creates a README with all sections (hand-written ones as
  `_To be written._`) for a mechanic that has none. It lists what is still wrong.
- `pnpm docs:mechanics --check` writes nothing and exits 1 on any problem.

A mechanic package needs no registration: the generator finds every folder under `mechanics/` whose `package.json`
has `"kind": "mechanic"` in its `swarmtales` field, and reads the export that `swarmtales.mechanics` names from
`src/index.ts`. One README documents one mechanic, so a package names exactly one. The generator runs on source
(`node --conditions=development`); nothing needs to be built first.

## Writing the hand-written sections

- Write for someone who wants to use the mechanic in a game or understand a run, not for its author. Say what the
  residents experience and what the log shows.
- English, full sentences, the words of [`GLOSSARY.md`](GLOSSARY.md), no internal ticket jargon unless it points
  somewhere useful.
- Name tools, events and options in backticks exactly as the generated sections spell them.
- When a run teaches something new about the mechanic, add the row to `docs/LESSONS-LEARNED.md` first and then the
  one-line pointer here.
