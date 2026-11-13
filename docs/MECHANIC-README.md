# The mechanic README

Every mechanic package under `mechanics/<name>/` has a `README.md` in one fixed shape, so a reader finds the same
answer in the same place in every package: what rule the mechanic sets, what residents can do with it, what it writes
to the log, how a story configures it and what the runs taught us about it.

A README has two kinds of sections. **Handwritten** sections explain what code cannot: the intent, the flow, the
traps. **Generated** sections list what the code already says (tools, events, options, APIs, prompts) and are written
by `pnpm docs:mechanics` between markers. They never go stale: `pnpm check` (the test
`test/scripts/mechanic-docs.test.ts`) and the `docs` job of the CI workflow fail when a block does not match the code,
a section is missing, a section still says `_To be written._`, or a mechanic folder has no README.

## The sections

The sections appear in this order, each as a `## ` heading with exactly this name.

| Section | Kind | What goes in it |
| --- | --- | --- |
| `# <Name>` and one paragraph | handwritten | The rule the mechanic sets, in plain words, in two to four sentences. The viewer and other docs may quote this paragraph on its own, so it must stand alone. |
| At a glance | generated | Package, id, summary, the APIs it requires, uses when loaded and provides (with the mechanics that provide them), whether it keeps state (and its snapshot version), its facts and jobs, and the registered stories that load it. |
| How it plays | handwritten | The flow of play in order: what starts it, what a resident does, what happens on each call, how it ends. Edge cases and refusals that matter for play. How it works with the other mechanics it needs (which API it calls for what). What it deliberately does not do. |
| Tools | generated | Every tool: who it is suggested for (the grant names `grants: auto` derives), whom it serves, its limit, its parameters with types and descriptions, and the exact text the caller reads (the tool's description prompt). |
| Events | generated | Every event type it writes, its default audience and its fields with types and descriptions. |
| Options | generated | Every option of `mechanic.with({...})`, nested ones as `a.b` or `a[].b`, with type, default and description. |
| Services | generated | The APIs it provides to other mechanics, with every method (command or query), its input, output and summary. |
| Decisions and prompts | generated | Its decision kinds with their proposal fields, and every prompt key with its variables and the file that holds its text. |
| Example | handwritten | A short excerpt of a real story that loads the mechanic (`stories/<name>/story.ts`, with the path), and one sentence on what the options do there. |
| Lessons and loopholes | handwritten | The rows of `docs/LESSONS-LEARNED.md` about this mechanic: ID (`P72`, `LH13`), one line on what happened, its status. Link to the log; do not copy the row. "None recorded yet." when there are none. |
| Tests | handwritten | Where the tests live and what they cover (rules, golden logs, snapshots, differential tests against older code). |

The shared package (`mechanics/shared/`) holds no mechanic, only the APIs and schemas the mechanics share; its README
has three sections: **What is in it** (handwritten), **APIs** (generated: every API with its methods, providers and
users) and **Tests** (handwritten).

## Generated blocks

A generated section holds one block:

```markdown
## Tools

<!-- generated:tools -->
...written by pnpm docs:mechanics...
<!-- /generated:tools -->
```

Text inside a block is overwritten on the next run. To change it, change the code: a parameter's or option's
`description` in its Typebox schema, a tool's description prompt (`prompts/<id>/tools/<tool>.md`), a mechanic's
`summary`. Text outside the blocks is never touched.

The tools are read from an instance of the mechanic (a mechanic's tools exist only once it is instantiated), built
with the options of every registered story that loads it, against a port that answers nothing. A tool that only
exists with options no registered story sets is therefore not listed.

## Commands

- `pnpm docs:mechanics` rewrites every generated block and creates a README with all sections (handwritten ones as
  `_To be written._`) for a mechanic that has none. It lists what is still wrong.
- `pnpm docs:mechanics --check` writes nothing and exits 1 on any problem.

A new mechanic package must be added to `MECHANICS` in `scripts/mechanic-docs.ts`; the check fails until it is.

## Writing the handwritten sections

- Write for someone who wants to use the mechanic in a story or understand a run, not for its author. Say what the
  residents experience and what the log shows.
- English, full sentences, no internal ticket jargon (carve steps, team names) unless it points somewhere useful.
- Name tools, events and options in backticks exactly as the generated sections spell them.
- When a run teaches something new about the mechanic, add the row to `docs/LESSONS-LEARNED.md` first and then the
  one-line pointer here.
