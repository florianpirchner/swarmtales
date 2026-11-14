# Oracles: econ-lab (`stories/econ-lab`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `econ-lab-s41.json`, `econ-lab-s43.json` | default: four seats, three blocks (public goods, split offer, dilemma), a private brain per seat | replay of run `econ-lab-04a-003-brain-vs-nobrain`, exact | the whole match: 18 rounds, 72 decisions, block scores, retro windows, brains refused as too long |
| `econ-lab-nobrain-s41.json` | no brain | same run, exact | the control arm, whole match |
| `econ-lab-s13-probes.json` | default | scripted (`econLabProbed`) | the whole match played by fixed rules (two seats cooperate, two do not) and 13 refused calls: `OUT_OF_RANGE` (an amount above the range), `INVALID_ARGUMENTS` (no amount, a negative amount, an option that does not exist), `TOOL_LOCKED` (the wrong decision for the round, a decision that is not the caller's, a second decision, a decision before game 1, a brain outside the retro window) |
| `econ-lab-s13-silent.json` | default | scripted (`silent`): no resident ever calls a tool | the round timer: every decision is the default of the clock (`round_resolved` without any `decision_made`), block scores, the end of the match |

Source of the calls: recorded live runs of Haiku seats; today's code reproduces each word for word.

The seeded parts (who is paired with whom, who proposes) show in `round_opened`; every decision is in
`decision_made` and every payoff in `round_resolved`.

Not covered: the single-game variants (`econ-lab-ultimatum`, `-public-goods`, `-dilemma`), the codes behind a
closed tool (`WRONG_DECISION`, `NOT_YOURS`, `ALREADY_DECIDED`, `NO_ROUND`: only the decision a seat owes is
unlocked for it).
