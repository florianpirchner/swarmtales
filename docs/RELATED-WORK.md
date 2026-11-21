# Related work

How Swarm Tales differs from three well-known projects for societies of language-model agents. The comparison rests
on each project's public paper and repository page; read their own documentation before you cite a detail of theirs.
Where we are not sure, we say so. Rewritten for 1.0 (decision A132); the first comparison, written for the old
platform, is in the history of this file.

| | Generative Agents (Park et al., UIST 2023) | Concordia (Google DeepMind) | Sotopia (Zhou et al., ICLR 2024) | Swarm Tales |
|---|---|---|---|---|
| Main aim | Believable human behaviour in a sandbox town of 25 agents | A library for generative agent-based models with a Game Master | A benchmark for the social intelligence of language agents | A laboratory: games and small societies on one engine, with a complete record of every run |
| Agent memory | Memory stream with recency, importance and relevance scoring, plus reflection | Memory, observation and planning components | Role-play scenarios with social goals | Each resident's own context and private texts; a game may add a mechanic for memory, such as the strategy brain a team rewrites after each game |
| Pressure on the agents | Open-ended daily life | Whatever the scenario defines | Social goals in cooperation, negotiation and competition | The rules of the game's mechanics: scarcity, deadlines, votes and exile, hidden information, markets; Directors that observe and act by their tools |
| Evaluation | Believability, with ablations | Up to the scenario | SOTOPIA-Eval, a multi-dimensional score | Not a benchmark: experiments with arms, seeds and repetitions, compared with n and standard error (`swt experiment`); four effects of the old platform reproduced so far |
| Record | Not a design goal | Serialisation and checkpointing (version 2.0) | Interaction data | Every message, tool call, payment and private thought, numbered, signed and hash-chained; a run replays from its log and resumes from a snapshot |
| Language and licence | Research paper | Python, PyPI package `gdm-concordia` | Research code | TypeScript on Node 22.19 or newer, source-available (Sustainable Use License 1.0 with Additional Terms) |

## What we think is different

- **A complete log as the product.** The record holds the residents' private reasoning, and every report written
  from a run cites its log lines by `#seq`. `swt log verify` checks the chain, `swt replay` plays the log again and
  says where it differs.
- **One engine, many games.** Fifteen games of five families, the Hello Game and a slice of the City run on one kernel; a game is data
  that lists the mechanics it uses, and a mechanic or a Director of an outside author plugs in as a package.
- **Seeded worlds and snapshots.** A seed fixes everything random in the world, so two arms of an experiment differ
  only in what they change; a snapshot lets runs branch from one shared state.
- **Dials from 0 to 10** for how strongly a Director or a mechanic acts.
- **A written log of loopholes** that residents found, each with its run, its effect and the status of its fix
  ([`LESSONS-LEARNED.md`](LESSONS-LEARNED.md)).

## What the others do better today

- **Concordia** is a mature, general library with reusable components and a published package; Swarm Tales has
  fifteen ported games and a small set of shared mechanics, and its packages are not published before 1.0.
- **Sotopia** has a published evaluation framework; Swarm Tales measures effects per game and has no common score.
- **Generative Agents** is the reference for believable long-term memory in agents; ours is simpler.
- **All three are published papers.** Swarm Tales has no paper; it can be cited as software by its
  [`CITATION.cff`](../CITATION.cff).
- **Models.** Almost every run of Swarm Tales so far used one small model; what holds for others is not known.

## Sources

- Park et al., [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/abs/2304.03442)
- [google-deepmind/concordia](https://github.com/google-deepmind/concordia) and the tech report
  [arXiv:2312.03664](https://arxiv.org/abs/2312.03664)
- Zhou et al., [SOTOPIA: Interactive Evaluation for Social Intelligence in Language Agents](https://arxiv.org/abs/2310.11667)
