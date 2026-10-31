# Overseers, decisions and plugin tooling

Status: idea, not approved for building (2026-10-31, from the chat with Flo). Nothing here is built. Names
marked "decided" were confirmed by Flo; everything else is a proposal. It builds on
[`monorepo.md`](monorepo.md) §2a and §3e and on [`../design/mechanic-api.md`](../design/mechanic-api.md).

## 1. Terms

| Term | Meaning | Examples |
|---|---|---|
| **Mechanic** (decided) | A rule: state, events, tools, hooks. Defined with `defineMechanic`. Internally it may be built as it likes (table, flags, state machine); the core only sees its outside contract. | ledger, marks, tribunal, seal, a dice contest, physics |
| **Overseer** (decided) | A model-driven actor with a task, triggers and powers that is not a resident. Defined with `defineOverseer`. It changes the world only by calling tools that mechanics provide. | gamemaker, confessor, judge, weaver, terminator |
| **Plugin** | The package that ships mechanics, overseers or both. | `@swarmtales/mechanic-tribunal`, `@acme/terminator` |
| **Resident** | A story figure with character and mission. Not a plugin. | the 6, 12 or 48 agents |

"Role" is not used for the new type: it already means a resident's profession and character, and the grant key.

Today the model roles live in `packages/roles` and the CLI runner wires them; the core knows only the grant roles
`resident | gamemaker | script` (`GrantRole`). The proposal makes overseers plugins like mechanics and the
overseer names open: a story declares them and grants tools to them (`grants.terminator`).

An overseer definition is `defineOverseer({ id, prompt, output, model, fallback, triggers, tools })`:
the prompt is a Markdown file, the output is a Typebox schema, a missing or failing model falls back to the
default (like the guard, it fails open), and the referee limits its cost and its interventions. Triggers are
hooks, events, schedules or facts; the gamemaker's `between` slot becomes one trigger among others.

## 2. The decision gate (generalisation)

Problem: the tribunal's `closeSession` (`mechanics/tribunal/src/court.ts`) counts the votes and exiles in one
synchronous step, so no overseer can intervene. The same holds for the seal, ransoms, ultimatums and any
future rule (for example an injury after a fall).

Proposal, a core service every mechanic can use:

1. A mechanic calls `ctx.decide(kind, proposal, { schema, window }, commit)` instead of acting at once.
2. If no actor holds the right to amend decisions of this kind, `commit` runs immediately. Behaviour and the
   golden logs stay byte-identical.
3. Otherwise the core writes `decision_proposed` (kind, proposal, deadline) and schedules a job. The holder
   gets the proposal as turn input and may call `amendDecision(id, proposal, reason)`; the core checks the new
   proposal against the schema the mechanic declared (for example "only accused residents, at most N").
4. At the deadline `commit` runs with the final proposal and the core writes `decision_settled` (changed or
   not, by whom, why).

Open decisions belong in the snapshot, so a resumed run does the same. Overseer cost and the number of
amendments are referee limits.

## 3. Example: the terminator side quest

Story "Don't touch": a resident touches, the tribunal proposes its verdict, three terminators play a dice game,
and the winner may change the verdict.

- Three overseers from one definition (`terminator-1..3`), each granted `amendDecision` and `rollDice`.
- A `contest` mechanic (seeded `rollDice` via `ctx.rng`, events `dice_rolled` and `contest_won`, rerolls on a
  tie) opens when a decision window opens and locks `amendDecision` for everybody except the winner with a
  `lock` handler. The existing pipeline stage is enough; no dynamic grants are needed in the core.
- The tribunal changes in one place: it asks for a decision instead of exiling directly.

The seal auction (the winner gets a one-time `permaDeath`) is the same pattern, a contest whose prize is a
power. Both could share the `contest` mechanic later.

Variants to decide with Flo: pure luck or a game with choices (re-roll, stake, quit); may the three talk
(bribes, alliances) through `channels`; do residents know about the contest and its winner; which decisions
trigger a contest.

## 4. Other generalisations

- **Advice** between overseers (`advise`, events `advice_given` and `advice_answered` with followed or
  overruled and the reason), as a standard mechanic.
- **Event audiences:** who may read an event (the confessor's labels are for the gamemaker only) as a core
  mechanism instead of special cases.
- **Optional phase fact:** a mechanic may expose its phase (`phase`) for the TUI and `watch`; nothing in the
  core requires a state machine. A `definePhases` helper, if built, belongs to the SDK, not the kernel.

## 5. Stories: TypeScript and YAML

A story is a list of mechanics with options and overseers, plus grants, locks and limits. TypeScript is the main
way (the compiler checks options and grants); YAML is an equal form that loads to the same `CoreStory`. Neither
contains logic beyond options; story rules (`maxLength`, `forbid` and later) need the expression language, which
is chosen later (CEL or JSONLogic).

```yaml
plugins:
  - "@acme/terminator@^1.2"
mechanics:
  - ledger: { start: 10 }
  - tribunal: { decisionWindow: true }
  - "acme/contest": { dice: 6 }
overseers:
  t1: { use: "acme/terminator", model: haiku }
grants:
  t1: [amendDecision, rollDice]
```

## 6. Finding a plugin

- Built-in packages (`@swarmtales/mechanic-*`) are known by id and need no entry.
- Third-party packages must be listed in `plugins` (with a version, pinned in a lock file). `swt validate`
  refuses an unknown id with a hint; nothing is installed automatically.
- Ids are namespaced (`acme/terminator`); two plugins with the same id stop the run from starting.
- Each plugin has a manifest: name, version, the mechanics and overseers it offers (id, summary, options
  schema) and the rights it asks for (events it reads, model calls). Third-party code runs in the sandbox
  (wave 4) with only the rights the story allows.
- Open: npm only, or also a `plugins/` folder in the story folder for local experiments (proposal: both).

## 7. Tooling for authors

Both pieces are thin wrappers around the same checks, so CLI, editor and models never disagree.

1. **JSON Schema** generated from the Typebox heads of the loaded mechanics and overseers (it depends on the
   story's `plugins`).
2. **`swt validate --json`** for what a schema cannot say: grants for tools nobody provides, unknown plugins and
   prompt ids, overseers without a model, locks on missing tools.
3. **VS Code extension.** Stage 1: bind the schema to the Red Hat YAML language server (completion, hover,
   validation). Stage 2: regenerate the schema when `plugins` changes, cross-reference checks from
   `swt validate`, jump to the prompt file, quick fixes ("add plugin"), a run and `watch` panel, story templates.
4. **MCP server `swt mcp`** so models can write and check stories: tools `list_plugins`, `describe_mechanic`,
   `get_schema`, `validate_story`, `scaffold_story`, `read_run`, `run_story` (dry run with scripted agents);
   resources for the docs, the schema, example stories and the event list. Live runs cost money and stay off
   unless a flag allows them.

Order: schema generation and `validate --json` first, then the extension and the MCP server in parallel.

## 8. Open questions

1. Does the decision gate go into step 18 with the overseers, or after the golden swap? (Proposal: design it
   with the overseers in step 18, build the `contest` and terminator example afterwards.)
2. `contest` variants and the questions of §3.
3. Expression language for story rules (CEL or JSONLogic).
4. Plugin sources (npm only or also a local folder).
5. The API sketch of `defineOverseer` and `ctx.decide` has to be written and read before anything is built.
