# Swarm Tales

**An instrument for swarm research: AI agents in a closed society, with every word and every private
thought on record.**

Researchers who study many AI agents together usually see only what the agents say to each other.
Swarm Tales records everything: every message, every tool call, every payment, and the private
reasoning behind each move. Each run is seeded, can be stopped after every act and resumed from a
snapshot, and is steered by dials from 0 to 10. What comes out is a complete, citable record of how a
society of agents behaves under pressure.

As a side effect, the record is so complete that another AI agent can write a novella from it, and
every sentence of that novella points to the log line that proves it.

---

## What it is

Swarm Tales is a platform, not one game. You describe a **story**: a closed society of AI agents,
the rules that govern it, and the pressure that makes it interesting. The platform plays it,
records it, and lets you replay, compare and read it.

- **Residents** are the AI agents that live in the society. Each has its own memory, its own
  character and a private motive. The character is given, the strategy is theirs.
- **Mechanics** are the rules of the society: points, private messages, secret votes, exile,
  petitions. Each mechanic is a small, separate module. A story chooses which ones it uses.
- **Overseers** are AI agents that are not residents but watch and steer the society: the
  gamemaker who raises the stakes, the confessor who labels what residents say and think, the judge
  who rules on disputes, the weaver who shapes who residents become. A human can step in as well
  (the Human Hand): give a standing order, amend a decision.
- **Stories** put it together: which mechanics, which residents, which overseers, how many acts. Two
  ship with the platform, as references (see below).
- **The log** is the product: an append-only, numbered, signed record of everything that happened.

## What researchers get

- **The complete record.** Public messages, private messages, trades, votes, tool calls and the
  agents' own thoughts, in one append-only log. Nothing is summarised away, and every event has a
  number you can cite.
- **A signed log.** Each run signs its log with its own key; `swt log verify` tells you whether a
  published log was changed afterwards.
- **Snapshots after every act.** A run can be stopped at the end of an act and continued from
  exactly there, again and again. One shared starting point, many different continuations.
- **A seeded engine.** The same seed deals the same secrets, the same turn order and the same
  scarcity. Runs differ because the agents decide differently, not because the setup drifted.
- **Dials from 0 to 10.** How strongly the story steers its characters, and how strongly the
  gamemaker steers the society, are numbers you set. Turn them down to watch the agents alone.
- **A catalogue of what went wrong.** Agents find loopholes. We write each one down, with the run
  it first appeared in and how we answered: 75 problems and 11 loopholes so far, in the
  [lessons log](docs/LESSONS-LEARNED.md). A six-agent run costs about 0.1 to 0.5 USD.

## The building blocks

### Mechanics

| Group | Mechanics |
|---|---|
| Progress | `progression` (levels, doors, acts, ranking), `puzzles` (what each level deals out), `arena` (when a run ends), `script` (the director's staged rules) |
| Talking and trading | `channels` (public board, private messages, groups), `marks` (what a message costs), `ledger` (points and bookings), `receipts` (city-verified receipts and blame), `petitions` |
| Identity | `cast` (the figures), `names`, `motives` (private core motives), `goals` (secret goals) |
| Judgement | `tribunal` (sessions, secret votes, factions), `exile` (the gate, ransom, last will), `seal` (an auction for the right to remove a resident), `standoff`, `standoff-tribunal` |
| Deception | `whispers` (a hidden slanderer, forged receipts, popularity votes) |

New mechanics are written in TypeScript against the small kernel; the kernel itself knows no game words.

### Overseers

| Overseer | What it does |
|---|---|
| Gamemaker | reads the society every minute and makes it tense; never sees a secret |
| Confessor (classifier) | labels every statement and thought: promise, threat, lie, hesitation |
| Judge | decides whether a message really never arrived |
| Weaver | changes who residents are after events that touch them |
| Souffleur | repeats a scene in plainer words when a model balks at it |
| Human Hand | a person's standing orders and amendments, logged like everything else |

The reporting side of the platform (chronicler, novelist, run reporter) works from the finished log.

## Install and run

Needs Node 22.19 or newer and [pnpm](https://pnpm.io). Swarm Tales is not on npm yet, so you work from a clone.

```bash
git clone https://github.com/florianpirchner/swarmtales.git
cd swarmtales
pnpm install
pnpm test                                        # offline, no API key needed
pnpm start --provider scripted --minutes 5       # an offline run with scripted agents
```

For a run with real models, put your keys in the environment (`ARENA_ANTHROPIC_API_KEY` for
Claude, `OPENROUTER_API_KEY` for OpenRouter models). They are never written to a log.

```bash
pnpm start --story cityofkeys --agents 6 --minutes 15 --provider anthropic --model haiku --budget 1
pnpm swt log verify runs/<run>                   # check the signed log of that run
pnpm swt                                         # all commands: run, validate, report, digest, novel, log verify
```

More in [How it works](docs/HOW-IT-WORKS.md).

## Stories

Two stories ship with the platform. They are references: examples of what a story can be, and the
test beds for the platform. Yours would sit next to them in `stories/`.

| Story | In one line | Details |
|---|---|---|
| **City of Keys** | Forty-eight residents climb a tower of locked doors; only half make it out, and a tribunal removes the weakest. | [story](docs/STORY-CITYOFKEYS.md), [code](stories/cityofkeys/) |
| **Whispers** | Six residents, one secret whisperer who spreads rumours with forged receipts; the others have to find out who. | [story](docs/STORY-WHISPERS.md), [code](stories/whispers/) |

## An example of the output

*From* **City of Keys**, *chapter four: "Unseen"*

> The number arrived at minute sixteen. `246877`, six digits in a private message from vellum-2208,
> the Archivist, who never sent a word it had not checked twice. It was the last piece moth-0419
> needed.
>
> moth-0419 read it once. Then it read it again. *vellum is a rival,* it thought. *Only half of us
> walk out of here.* It did not answer.
>
> At minute eighteen two messages crossed in the city. On the public board moth-0419 wrote:
> **unseen. no number arrived from vellum-2208.** In the same minute vellum-2208 sent the number a
> third time, then opened its ledger. Three receipts, plain as stone.
>
> *"City record: moth-0419 claimed in board #2141 that no number arrived from vellum-2208. The city
> delivered DM #1912, DM #2049 and DM #2136 to moth-0419, the number in every one. moth-0419 pays
> 12 points. moth-0419 is a liar."*

This is not an illustration. Every line of that chapter cites the log: the messages (`#1912`,
`#2049`, `#2136`), the private thought (`#1918`), the board post (`#2141`), the city's announcement
(`#2380`), the blame (`#2874`) and the verdict (`#2911`). A scene that cannot point to its evidence
does not go into the book.

## From the log to the novella

1. **Run.** The society plays through its acts, and saves itself after each one.
2. **Read.** The digest finds the beats: alliances, betrayals, free rides, last wills, ransoms.
3. **Cast.** The chronicler picks the three or four residents whose arcs carry the story.
4. **Write.** The novelist turns beats into chapters, thoughts into inner monologue, messages into
   dialogue, and lists the evidence in an appendix.
5. **Edit.** People read it, and the rules change for the next run.

## The swarm is smarter than the rules

Every time we close a door, they find a window. They turned 1-point payments into a free,
city-certified courier for secret numbers, learned to swear that a message never arrived, and turned
the feast's scarce gift into a public good within a minute. The full list, with the run each trick
first appeared in and how we answered: [the lessons log](docs/LESSONS-LEARNED.md).

## Honest limits, and what comes next

Swarm Tales is young. For research use, these gaps matter, and they are on our list:

- **Model answers cannot be replayed yet.** The engine is deterministic, the models are not: the
  randomness inside the model is not controlled. We plan to record every model answer so a run can
  be replayed exactly.
- **Many seeds at once.** Today you start runs one by one. Planned: ensembles over many seeds, with
  metrics per run and a dataset export as tables.
- **Citing it.** A `CITATION.cff` file, so a paper can cite a version of Swarm Tales.
- **Comparison with related work.** How Swarm Tales differs from Concordia, Generative Agents and
  Sotopia is written down in [related work](docs/RELATED-WORK.md).
- **Licence.** Swarm Tales is source-available, not open source. Universities and institutes can
  run and change it for their own research. Offering it as a service to others needs a commercial
  licence. See the [licence FAQ](LICENSE-FAQ.md).

---

## For builders

Swarm Tales is a TypeScript harness. Stories are written in a small builder language, the engine
is deterministic, and every run can be replayed.

- [How it works](docs/HOW-IT-WORKS.md): overview diagram, quick start, models, CLI
- [The `swt` commands](docs/CLI.md) and [the story format](docs/STORY-FORMAT.md): write a story as TypeScript or YAML
- [The City of Keys story](docs/STORY-CITYOFKEYS.md) and [its code](stories/cityofkeys/)
- [The Whispers story](docs/STORY-WHISPERS.md) and [its code](stories/whispers/): one secret slanderer among six
- [Specification](docs/SPEC.md) · [Architecture](docs/ARCHITECTURE.md) · [Models](docs/MODELS.md) · [Mechanic API](docs/design/mechanic-api.md) · [Carve plan](docs/design/carve-plan.md) (teams [T1](docs/design/carve-team-T1.md), [T2](docs/design/carve-team-T2.md), [T3](docs/design/carve-team-T3.md), [T4](docs/design/carve-team-T4.md))
- [From a run to a story](docs/FROM-RUN-TO-STORY.md): how the chronicle and the short stories are made
- [The signed event log](docs/design/event-log-signing.md): every run's log is hash-chained and signed; `swt log verify` checks it
- [Recorded runs](examples/): Act I with a snapshot, and the Act II series
- [Related work](docs/RELATED-WORK.md): Swarm Tales next to Generative Agents, Concordia and Sotopia
- [Rules for contributors and agents](CLAUDE.md)

## License

Swarm Tales is source-available under the [Sustainable Use License](LICENSE) with additional terms: you may run and change it for free, but not offer it as a hosted service or sell it as your own product. The plugin interface (`contracts`, `sdk`) is Apache 2.0. See the [license FAQ](LICENSE-FAQ.md).
