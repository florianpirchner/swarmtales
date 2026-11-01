# Related work

How Swarm Tales differs from three well-known projects for LLM agent societies. This is a first
comparison based on each project's public paper and repository page; read their own documentation
before you cite any detail. Where we are not sure, we say so.

| | Generative Agents (Park et al., UIST 2023) | Concordia (Google DeepMind) | Sotopia (Zhou et al., ICLR 2024) | Swarm Tales |
|---|---|---|---|---|
| Main aim | Believable human behaviour in a sandbox town of 25 agents | A library for generative agent-based models with a Game Master | A benchmark for the social intelligence of language agents | A research instrument with a complete record, plus stories written from it |
| Agent memory | Memory stream with recency, importance and relevance scoring, plus reflection | Memory, observation and planning components | Role-play scenarios with social goals | Per-resident memory and a private character; strategy is the agent's own |
| Pressure on the agents | Open-ended daily life | Whatever the scenario defines | Social goals in cooperation, negotiation and competition | Scarcity, deadlines and elimination (tribunals) written into the story |
| Evaluation | Believability, with ablations | Up to the scenario | SOTOPIA-Eval, a multi-dimensional score | Not a benchmark: the full log is the output; metrics are still to be built |
| Record | Not a design goal | Serialisation and checkpointing (version 2.0) | Interaction data | Every message, tool call, payment and private thought, numbered and append-only |
| Language and licence | Research paper | Python, PyPI package `gdm-concordia` | Research code | TypeScript, source-available (Sustainable Use License plus Additional Terms) |

## What we think is different

- **A complete log as the product.** The record includes the agents' private reasoning, and every
  later artefact (digest, report, novella) must cite log lines.
- **Snapshots per act and a seeded engine.** Experiments can branch from one shared state.
- **Dials from 0 to 10** for how strongly the story and the director steer.
- **A written catalogue of loopholes** that agents found, with the fix status of each.

## What the others do better today

- **Concordia** is a mature, general library with reusable components; Swarm Tales ships two stories.
- **Sotopia** has a published evaluation framework; we have none yet.
- **Generative Agents** is the reference for believable long-term memory in agents; our memory is
  simpler.
- All three are published and citable; Swarm Tales has no paper and no `CITATION.cff` yet.

## Sources

- Park et al., [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/abs/2304.03442)
- [google-deepmind/concordia](https://github.com/google-deepmind/concordia) and the tech report
  [arXiv:2312.03664](https://arxiv.org/abs/2312.03664)
- Zhou et al., [SOTOPIA: Interactive Evaluation for Social Intelligence in Language Agents](https://arxiv.org/abs/2310.11667)
