# Oracles: econ-lab (`stories/econ-lab`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `econ-lab-s41.json`, `econ-lab-s43.json` | default: four seats, three blocks (public goods, split offer, dilemma), a private brain per seat | replay of run `econ-lab-04a-003-brain-vs-nobrain`, exact | the whole match: 18 rounds, 72 decisions, block scores, retro windows, brains refused as too long |
| `econ-lab-nobrain-s41.json` | no brain | same run, exact | the control arm, whole match |

Source of the calls: recorded live runs of Haiku seats; today's code reproduces each word for word.

The seeded parts (who is paired with whom, who proposes) show in `round_opened`; every decision is in
`decision_made` and every payoff in `round_resolved`.

Not covered: the single-game variants (`econ-lab-ultimatum`, `-public-goods`, `-dilemma`), a seat that misses a
decision (the round timer).
