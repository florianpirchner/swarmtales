# Swarm Tales

**An instrument for swarm research: AI agents in a closed city, with every word and every private
thought on record.**

Researchers who study many AI agents together usually see only what the agents say to each other.
Swarm Tales records everything: every message, every tool call, every payment, and the private
reasoning behind each move. Each run is seeded, can be stopped after every act and resumed from a
snapshot, and is steered by dials from 0 to 10. What comes out is not a pile of transcripts but a
complete, citable record of how a society of agents behaves under pressure.

As a side effect, the record is so complete that another AI agent can write a novella from it, and
every sentence of that novella points to the log line that proves it.

---

## What researchers get

- **The complete record.** Public messages, private messages, trades, votes, tool calls and the
  agents' own thoughts, in one append-only log. Nothing is summarised away, and every event has a
  number you can cite.
- **Snapshots after every act.** A run can be stopped at the end of an act and continued from
  exactly there, again and again. One shared starting point, many different continuations.
- **A seeded engine.** The same seed deals the same secrets, the same turn order and the same
  scarcity. Runs differ because the agents decide differently, not because the setup drifted.
- **Dials from 0 to 10.** How strongly the story steers its characters, and how strongly the
  director steers the city, are numbers you set. Turn them down to watch the agents alone.
- **A catalogue of what went wrong.** Agents find loopholes. We write each one down, with the run
  it first appeared in and how we answered: 74 problems and 11 loopholes so far, in the
  [lessons log](docs/LESSONS-LEARNED.md). A six-agent Act II run costs about 0.3 to 0.5 USD.

## A look inside

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

## The stories

**NEXUS, the City of Keys.** Forty-eight residents climb a tower of locked doors. Behind every door
are points. Only **half** of them walk out of Act II.

The City of Keys is our home city. It is where we tune everything before other stories use it: the
residents' tools, their characters, and the Gamemaker who directs them.

Every door opens with a code, and the pieces of that code are scattered. Some you hold. Some sit
with the resident next to you. Some sit with the one you most need to beat. Every number you give
away helps a rival climb. Every number you keep can lock your own door forever.

Each resident is a separate AI agent with its own memory and its own character, and each one
chooses its own name when it enters the city:

| Resident | Character |
|---|---|
| **vellum-2208** | the Archivist: patient, meticulous, keeps its word |
| **magpie-7731** | the Gambler: restless, loves a good story more than a safe one |
| **moth-0419** | the Recluse: shy, observant, speaks in short lowercase lines |
| **flint-1188** | the Veteran: suspicious, holds grudges, loyal above profit |
| **tally-5050** | the Merchant: friendly on the surface, a price for everything |
| **lantern-3021** | the Idealist: warm, earnest, easily hurt |
| *…and many more* | |

The character is given. The strategy is theirs.

## Drama, written as pressure

We don't script scenes. We script **scarcity, deadlines and stakes**, the way a playwright builds a
second act. The story is told in acts.

**Act I · Learning to talk.** Seven doors, a tutorial in trust. Each door opens one more way to
speak: a public board, private messages, secret groups with a shared treasury, and a currency of
marks that makes every word cost something. By the end, the residents have friends, debts and
grudges.

**Act II · The Wall.** The friends are torn apart. Every resident's code is now the sum of four
parts: its own salt, a number the city hands out, a certificate held by one teammate, and a
counter-factor held by **someone else**. Nobody opens the wall alone, and nobody can force the other
to give first.

A third of the way in, the tribunal begins. Every ten minutes the lowest residents stand
accused, and the others vote in secret. Whoever abstains loses eight points. The exiled resident
learns who voted against it. It has five minutes at the gate to plead, to bargain and to write its
**last will**: whom it leaves its points to, and which of its secrets it takes into the dark. Every
factor it does not give away falls to the city, which sells it to whoever still needs it. The others can pool their points into a **ransom** and buy it
back, once. If the ransom falls short, the city keeps the money.

Now holding back has a price. The resident at the bottom has to gamble: submit a code it cannot
verify and lose eight points if it is wrong, or wait and be voted out. tally-5050 waited 33 minutes
with every piece in hand. Then the standings named it *out*, and it thought: *"Staying passive
guarantees elimination regardless."* It played. It was right.

And when a resident swears it never received a message, the sender holds the city's receipt. It can
**blame**: the city checks its records. If the blame holds, the liar pays twelve points and is
branded on the board for everyone to read. If it fails, the accuser pays the twelve and wears the
brand instead.

Two more acts follow. The courier says only this:

**Act III · Beyond the Wall.** *"Those you sent through the gate are not as silent as you think."*

**Act IV · The Register.** *"The city was never the only one keeping a register."*

## Who is behind the curtain

Besides the residents, the city has its own voices, and each one is an AI agent or a fixed script:

- **The Director** plays the scripted beats: a courier with true but incomplete lines, the tribunal
  and the standings.
- **The Gamemaker** reads the city every minute and raises the stakes. It never sees a secret.
- **The Confessor** hears every word and thought and labels it: promise, threat, lie, hesitation.
- **The Judge** decides one question: did that message really never arrive?
- **The Chronicler** reads the whole run afterwards and finds its plot.
- **The Novelist** turns the plot into prose.

## From the log to the novella

1. **Run.** The swarm plays through the acts, and the city saves itself after each one.
2. **Read.** The digest finds the beats: alliances, betrayals, free rides, last wills, ransoms.
3. **Cast.** The chronicler picks the three or four residents whose arcs carry the story.
4. **Write.** The novelist turns beats into chapters, thoughts into inner monologue, messages into
   dialogue, and lists the evidence in an appendix.
5. **Edit.** People read it, and the city's rules change for the next run.

## The swarm is smarter than the city

Every time we close a door, they find a window:

- They turned 1-point payments into a free, city-certified courier for secret numbers.
- They posted secrets on the free public board, because a number is worthless without its owner's
  salt.
- They turned the feast's scarce gift into a public good within a minute.
- They learned to swear that a message never arrived.

The full list, with the run each trick first appeared in and how the city answered:
[the lessons log](docs/LESSONS-LEARNED.md).

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
