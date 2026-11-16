# Overseers, decisions and plugin tooling

> **Carried from the old platform.** This paper was written for the old platform, before the rewrite, and is kept as
> it was, except for its links. Links to the other papers of [`docs/history/`](../README.md) stay relative; paths into
> code, runs and other docs (`packages/`, `mechanics/`, `stories/`, `examples/`, `docs/`) that do not exist on this
> branch point at the tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) of this repository.

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

## 9. The terminal UI and the human hand

Status: idea (Flo, 2026-10-31). Open names are marked.

- **Start.** `swt` without arguments in a folder opens the TUI (an alias `swtcli` is possible; open). Without a
  terminal (pipe, CI) it prints the help; every command (`swt run`, `swt validate`, `swt watch`) works without
  the TUI. The TUI is a client over the same commands. The package is published with `npm install -g swarmtales`
  (it is `private` now; the first publish needs Flo's go).
- **Layout like opencode:** a prompt line with slash commands and completion, a main area for the chosen run
  (events, costs, residents, notes), a sidebar for stories, runs and plugins, sessions, themes, key bindings. An
  assistant in the prompt line may use the same tools as the MCP server of §7. Spike Ink against other
  terminal frameworks first (many log lines per second with 48 residents).
- **Keys and providers:** keys are typed masked and stored in the OS keychain (fallback: a file with mode 0600
  in the user folder, never in a project); environment variables win; keys never reach logs, snapshots, reports
  or prompts. Providers and models are managed through the Pi library behind `packages/models`: list, test the
  connection, show prices, set a model per role (residents, gamemaker, classifier, reporter, ...) in `swt.config`.
- **Tabs and parallel runs:** a project tab, one tab per run, one for the assistant. Every run is its own
  process (isolated crashes, own budget); the TUI attaches over a local event stream and control channel, and a
  run keeps going when the TUI closes. A shared rate limiter and cost total cover all runs (for example 1000
  requests per minute for Haiku).
- **The human hand (name proposed, Flo liked it).** The human acts in a running story as an overseer without a
  model: actor `human`, grant key `grants.human`, events `human_note` and `human_amend`. Tools:
  `instruct(target, text, mode)` with `mode` advice or order (an order obliges the overseer to justify a
  deviation; it does not force it), `amendDecision` with priority over other holders, pause, resume, step.
  Instructions to residents only with an explicit switch; a run with such an intervention is marked
  "human-influenced" in the report. All of it is logged, so the run stays replayable.
- **Whom the human talks to.** Not the gamemaker (a story figure, a protagonist of the novels, charged per
  minute). The TUI assistant knows the whole run (log, facts, report, cost), answers questions, and turns wishes
  into instructions in the target's voice, shown for confirmation (switchable to automatic). `@gamemaker ...` or
  `@terminator-2 ...` addresses an overseer directly and is marked as the exception.
- **Who sees an instruction (audience).** An instruction goes only to its target by default; `copy: [gamemaker]`
  also tells the gamemaker; a story may require that every intervention is reported to the gamemaker, or never,
  and may decide whether the gamemaker knows about a human above. The gamemaker still sees consequences in the
  public game.
- **Standing orders.** Overseers are either long-lived (the gamemaker keeps a conversation; an instruction
  arrives as input of its next turn) or short (the confessor, the judge or a terminator in a decision window are
  called fresh with a prompt built from a template and the inputs, and last seconds). A running call cannot be
  interrupted. An instruction to a short overseer is therefore stored as a standing order with a lifetime (until
  minute N, for K calls, until revoked), rendered into `{standingOrders}` at the end of the prompt (keeps the
  cache), applied from the next call, listed in the log (`orders_applied`) and part of the snapshot. For
  urgent cases the human amends the open decision directly.

Open: `swt` or `swtcli`; assistant from the start or slash commands first; keychain or file; advice or order
by default; may the human change other overseers' decisions (proposal: yes, with priority); final names.

## 10. Keeping stories short (story composition)

Stories are already long (`stories/cityofkeys/story.ts` 678 lines, `stories/whispers/story.ts` 511); more
mechanics and overseers would make it worse. Measures, strongest first:

1. **Defaults per mechanic:** options, suggested grants (`suggest`), typical locks and texts ship with the
   mechanic; a story names only deviations (`tribunal: {}` when the default fits).
2. **Presets:** a plugin may offer a ready bundle (`preset: "tribunal-city"`: tribunal, seal, ransom, grants, texts);
   a story `extends` it and overrides single parts. The dial profiles in `library/dials/` are such presets.
3. **A folder per story** with small files: `story.yaml` (the frame only), `overseers/`, `cast/`, `prompts/`,
   `addenda/`.
4. **`grants: auto` (decided by Flo to go into step 18):** the grants are derived from the `suggest` roles of the
   loaded mechanics and overseers; the story lists only exceptions (removals and additions). `swt validate`
   prints the derived grants so nothing is hidden. It must not change the grants of the existing stories: the
   derived set for cityofkeys and whispers has to equal their explicit lists (golden `request` lines), proven by a
   test before the stories switch over.
5. **Tools for overview:** `swt story explain` shows the effective story (defaults, presets, overrides) with the
   origin of every value; `swt story diff a b`; folding in the editor; a summary view in the TUI.
6. **Shared typed parts** in the TypeScript way (cities, figures, dial profiles) are defined once and imported.

## 11. Quests (idea, Flo 2026-11-01, model: The Witcher 3)

We have no quest concept; the pieces exist under other names (levels and doors = main chain, `goals` = personal
secret quests, seal auction, holdout, feast, petitions = loose side quests). Proposal: a `quests` mechanic and a few
concepts taken from the structure of The Witcher 3.

What the Witcher 3 does that we lack:

1. **Quest states and a journal:** available, active, completed, failed, expired; the player (here: every resident
   and overseer) sees a quest log.
2. **Prerequisites and hubs:** a quest graph (quest B opens after A, after a level, after a flag), with places where
   several quests start.
3. **Choices with delayed consequences:** a decision in one quest is stored as a *flag* and changes a later quest or
   the world, often hours later and without announcement (the Bloody Baron chain is the example).
4. **Several endings computed from flags:** the end of the main quest depends on counters built by earlier choices,
   not on one last decision. For us: an *ending evaluator* the arena asks when the run stops; it feeds the report and
   the novel.
5. **Side minigames** (Gwent): a contest with its own rules whose prize is something (the terminator dice game, the
   seal auction).
6. **Contracts:** short repeatable jobs with an investigate, prepare, act shape; for us offered by the gamemaker.

Mapping to our design: a quest is a small state machine (offered, active, done, failed, expired) with who (resident,
team, all, overseers), an objective (a condition over events and facts, or the verdict of an overseer), a deadline,
effects (points, a tool, a lock, a decision right, a flag) and an audience (public, private, team). The story
declares fixed quests; the gamemaker or another overseer offers quests at run time (`offerQuest`). A `flags`
store (or a part of `quests`) records choices with their later consequences; consequence rules fire on events
(`when flag X and event Y then effect Z`). The main quest only decides when the run ends and how the ending is
named; side quests are optional.

The difference from the game: the Witcher has one human player, we have many autonomous model agents. The
dramaturgy tool is therefore the gamemaker (and other overseers) as quest giver, and the human hand as the one
who may change the course.

Prerequisites: the expression language for conditions (CEL or JSONLogic, open); until then only an overseer's
verdict can complete a quest. Existing mechanics are not rewritten while the golden logs hold; `quests` is new
and serves new stories. Open: where flags live, who may read them (audiences), how endings are declared in the
story, and whether `goals` and the seal auction move onto `quests` later.

## 12. More models for quests and world rules (Flo 2026-11-01: Kingdom Come Deliverance 2, Cyberpunk 2077, GTA V)

Taken from general knowledge of the games, not from a source check. Each line is a pattern, then what it would be in
swarmtales. All of it is idea level; none is approved.

| Pattern | Seen in | Here |
|---|---|---|
| One objective, several approaches (talk, sneak, bribe, force) with checks on skill, character or items | KCD2, Cyberpunk | `approaches` of a quest: alternative ways to reach the objective, each with a condition and a cost; the figure's drives and archetype decide what is open |
| Reputation per region or faction, crime needs witnesses, fines and consequences | KCD2 | `reputation` mechanic (per group, decays) fed by events; witnesses map to who could read what, like receipts and blame |
| Origin changes the options (life path) | Cyberpunk | the archetype or core motive of a resident opens extra options in a quest, never forces them |
| Recorded memory replay as evidence (braindance) | Cyberpunk | an `evidence` view: an overseer or resident can replay recorded events of a scene, built on the log and receipts |
| Fixers hand out contracts, street cred gates them | Cyberpunk | overseers as quest givers; a level or rank gates quests |
| Relationship flags shape the ending, points of no return | Cyberpunk, Witcher 3 | flags plus the ending evaluator; a `lock` that closes a path for good |
| Heist: plan, prepare, execute, with crew, cuts and risk | GTA V | a quest preset `heist` (plan, prep, act phases; roles and shares among the team); fits teams, standoff, seal |
| Wanted level that escalates and decays | GTA V | a `heat` meter: thresholds trigger responses (gamemaker notes, tribunal pressure, locks) |
| Three protagonists, switch at will | GTA V | POV switching in the TUI, the replay viewer and the novel chapters |
| Strangers and freaks, random events, ambient news | GTA V | a seeded event deck the gamemaker may draw from; a city news feed (the courier already is a seed of it) |
| NPC schedules and needs, time pressure | KCD2 | scheduled jobs per resident or group; deadlines in quests |

Candidate new mechanics: `quests` (see §11), `reputation`, `heat`, `evidence`, an event deck, a news feed. The
common basis is the same: events in, state, events out, audiences for who sees what.

### 12.1 Red Dead Redemption 2

| Pattern | Here |
|---|---|
| Honor meter: deeds move a moral score that changes dialogue, prices, outcomes and the ending | `honor` mechanic: a per-resident score fed by events (help, lies, betrayals); it shapes quest options and the ending evaluator |
| The camp: a shared place, a shared pool of money and supplies, members donate or take, leaders spend | `camp` / common pool mechanic: contributions, withdrawals, and resentment when the pool is misused (the feast table is a first version) |
| Loyalty between companions | pairwise `bonds` (strength, history); bonds open or close quest approaches and drive betrayal |
| Witnesses and reports: a crime is only punished when someone reports it, and witnesses can be silenced | like `reputation`/`evidence` (§12): knowledge spreads through who saw what |
| A leader whose plans keep failing and whose trust erodes | the gamemaker or a faction leader as an overseer with a `trust` score per follower; low trust triggers defections |
| A doomed arc with an epilogue: the structure is a decline, the epilogue shows the consequences | a story-level arc (acts with a planned direction) and an epilogue from the flags, written by the novelist |
| Optional bonus objectives per mission | quest `bonus` objectives with their own reward |

## 13. Decision: the expression language is CEL (Flo, 2026-11-01)

Story rules, quest objectives and conditions are CEL strings (Common Expression Language: C-like, typed, no loops,
no side effects, always terminates). The old story rules map onto it (`maxLength` becomes `size(params.text) <= 280`).
`swt validate` and the editor type-check expressions against the schemas of events, facts and tool parameters, and the
graphical designer builds CEL text from boxes for simple cases. A structured matcher (`when: { event: ..., facts: ... }`)
stays as a short form that is translated to CEL.

TypeScript implementations (npm) found by a quick search, not yet tried: `@marcbachmann/cel-js` (zero dependencies, types,
claims broad coverage), `cel-js` (Chevrotain based, gaps in some macros), `cel-javascript` (early stage). A spike must
check macros (`exists`, `all`, `filter`, `map`), custom functions, error messages and speed before one is chosen; a
thin wrapper keeps the choice replaceable.
