# Glossary

The words of Swarm Tales, one meaning each. Use these words and no synonym, in code, docs, prompts for developers
and issues. The name lint (`scripts/lib/names.ts`, run by `pnpm check`) rejects the retired words at the end of this
page in exported identifiers, and the two most telling ones in the prose of the docs.

## The vocabulary

### Game

The definition of what is played: residents, mechanics, Directors, models. A game is plain data in one format, with
one runner. There is no `kind` field. "Story" is only the narrative written from a run, and part of the product
name.

### Resident

A model actor that plays in a game. It has a role, private memory and the tools the game grants. Residents are the
AI agents of a run.

### Mechanic

One rule of a game, packaged as a plugin: state, tools, events. A game lists the mechanics it uses. A base mechanic
is general (accounts, messaging, a roster); a game mechanic belongs to one kind of game.

### Director

A model actor that is not a resident. It observes and acts only through granted tools and decisions. The Gamemaker
and the Confessor are Directors. A scripted sequence of actions is not a Director; it is the mechanic `script`.

### Referee

A silent scorer that judges moves against a reference, such as an engine or an exact solution. It never speaks to
a resident and never changes the game.

### Service

A typed interface that one mechanic provides and another needs. The provider owns the contract, in its `/contract`
sub-path. "Capability" is reserved for what a sandboxed plugin may reach.

### Event

A notification on the log that others may listen to. Events come before service calls: when one mechanic does
something and another must follow, the first emits an event and knows nothing else. One line of the log is one
event; `#212` cites one.

### Tick

One step of logical time in the kernel and the log. A game may label ticks, for example as minutes or rounds; the
kernel has no wall clock.

### Experiment

Many runs of one game over arms, seeds and repetitions, with a report. An arm is one setting, given as an override
of the game's typed `params`. Arms live in the experiment only.

### Human Hand

A person's interventions in a running game (instruct, amend, pause), each one logged. A standing order is an
instruction from it that stays in force for a stated time. Never "the hand" alone.

## Further terms

| Term | Meaning |
|---|---|
| Tool | an action a resident or Director can take. Every call passes the same checks and is logged |
| Grant | the permission for a role or a Director to call a tool |
| Refusal | the rules said no to a call; part of the game, and an event |
| Error | the game, a plugin or the setup is wrong; for the developer, with a code |
| Run | one play of a game with a seed and models |
| Seed | the number that fixes everything random in the world. Model answers are not seeded |
| Log | the append-only, numbered, hash-chained record of a run |
| Snapshot | the saved state of a run at a tick, from which it can be resumed |
| Dial | an integer from 0 to 10 that sets how strongly a Director or mechanic acts; recorded in the run |
| Decision | an outcome a mechanic proposes and holds open for a window, so a Director or a human may amend it |
| Role | the part a resident plays: text, secrets, team |
| Secret | information dealt to some residents and guarded from the others |
| Scheduler | what decides when residents act. `turns` is seeded and turn-based |
| Kernel | the small engine under everything: log, state, actors, tool dispatch, services, clock. It knows no game word |
| Plugin | a package that ships mechanics, Directors or model providers |
| Fake model | a stand-in that makes seeded legal calls; offline and free |
| Oracle | a recorded run of the old platform (seed, calls, events) that a ported game must reproduce |

## Retired words

Do not use the word on the left for the meaning in the middle.

| Retired | It meant | Use |
|---|---|---|
| story | the definition of what is played | Game |
| overseer | a model actor that is not a resident | Director |
| competitor | a model actor that plays | Resident |
| module | a rule packaged as a plugin | Mechanic |
| host | the engine | kernel |
| core | the engine, or its game format | kernel, Game |
| API | what one mechanic offers to another | service |
| capability | what one mechanic offers to another | service |
| minute | logical time | tick |
| arena | the project, in environment names (`ARENA_*`) | `SWT_*` |

An exported identifier that must hold one of these words for a good reason is listed, with an issue, in
`ALLOWED_IDENTIFIERS` in `scripts/lib/names.ts`.
