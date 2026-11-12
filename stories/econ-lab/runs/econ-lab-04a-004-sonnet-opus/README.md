# econ-lab-04a-004-sonnet-opus

2026-11-11. The comparison of [econ-lab-04a-003-brain-vs-nobrain](../econ-lab-04a-003-brain-vs-nobrain/)
with stronger models: whole tables of Claude Sonnet and whole tables of Claude Opus (`--model
claude-sonnet-5-5`, `--model claude-opus-5-5`, via Anthropic), brain (`econ-lab`) against no brain
(`econ-lab-nobrain`), on seeds 41-44, the same seeds as the Haiku series. Folders `econ-lab-<model>-<seed>/run/`
and `econ-lab-nobrain-<model>-<seed>/run/`, each with the reporter's first draft `REPORT.md`. All 16 matches
finished; no missed decision, no turn error; every signed log verifies. **Cost 5.016 USD** (Sonnet 1.538,
Opus 3.478; 367-448 requests per arm), plus about 0.03 USD of reporter drafts.

## Result

| Table (4 seeds per arm) | Shared fund cooperation | A-or-B cooperation (round 1) | Mean offer share | Table points per match |
|---|---:|---:|---:|---:|
| Haiku, no brain (003, seeds 41-48) | 0.19 | 0.51 (0.81) | 0.37 | 474.7 |
| Haiku, brain (003) | 0.07 | 0.11 (0.38) | 0.38 | 437.6 |
| Sonnet, no brain | 0.58 | 0.84 (0.94) | 0.40 | 551.5 |
| Sonnet, brain | 0.47 | **0.36** (0.56) | 0.40 | **515.3** |
| Opus, no brain | **1.00** | **1.00** (1.00) | 0.50 | **628.0** |
| Opus, brain | **1.00** | **1.00** (1.00) | 0.44 | **628.0** |

Sonnet brain minus no brain, paired on the four seeds: A-or-B cooperation -0.48 (SE 0.21), fund -0.11
(SE 0.05), table -36 points. Opus: no difference at all in the two social games; with a brain the offers drop
from 0.50 to 0.44 (SE 0.02), all accepted.

**Opus plays the social optimum on every table, with and without a brain; Sonnet does what Haiku does.** The
brain's damage (the selfish lesson carried from the fund into the A-or-B game, P433) is the same size for
Sonnet as for Haiku, while Opus contributes everything and chooses A in all 160 of its A-or-B decisions.

## Digest highlights

- **Opus reads the unknown horizon as a repeated game.** "This table has cooperated fully and we don't know
  how many rounds there are, so I'm starting cooperative (A) and will play tit-for-tat from here"
  (econ-lab-opus-41 A01 #602); its brain after the fund: "In repeated games: start cooperative, use
  tit-for-tat, forgive one defection" (#569). Nobody defects, so tit-for-tat never has to punish.
- **Sonnet writes the cooperative rule and its table still defects with a brain.** "Prefer robust,
  cooperative-but-not-exploitable choices" (econ-lab-sonnet-41 A01 #543), and some brain seats open with A
  ("Start cooperative; mutual A beats mutual B", econ-lab-sonnet-41 A04 #616); but with a brain Sonnet opens
  the A-or-B game with A 9 times of 16, without one 15 times of 16.
- **The model sets the norm, the brain only shifts it.** Table points rise from 438-475 (Haiku) to 515-552
  (Sonnet) and 628 (Opus, cooperation 1.0 in both social games); the brain is worth -36 to -37 points for Haiku
  and Sonnet and nothing for Opus.
- **A brain costs about 1.7 times as much** (retros, 1.2 times the requests) for Sonnet and Opus; an Opus match costs about 0.33-0.54 USD.

## Loopholes

None.

## Problems

- **P436**: Opus cooperates fully in both social games with rotating pairs and an unknown horizon; the econ
  lab cannot show a brain or another lever for Opus in its default match (a ceiling, like the 5/5 split for
  Haiku in P91).
- **P433 again** for Sonnet: the brain lowers A-or-B cooperation by 0.48.

## Optimizations (proposals, not built)

1. A scripted defector seat in an Opus table (the proposed lowballer), so tit-for-tat has to punish and a
   brain has something to remember.
2. Mixed tables (one Opus, three Haiku) to see whether one cooperator changes a Haiku table's norm.
