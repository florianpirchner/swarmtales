# The cast

A library of characters for Swarm Tales: the parts a resident is made of, and finished residents
built from them. Every file is Markdown with a flat frontmatter header (`key: value`, one per line),
so the library can later be searched and shown on a website.

Nothing in a run reads this folder yet. The game still deals cores from the catalog in
`stories/nexus/characters.ts`; wiring the finished residents into a run is a later, separate step.

## Folders

| Folder | What is in it | Header |
|---|---|---|
| `professions/` | 8 backgrounds from before the city closed (archivist, gambler, veteran, idealist, merchant, recluse, firebrand, skeptic) | `id`, `persona`, `temperament`, `values`, `voice` |
| `drives/` | one file per drive of the nexus catalog (22): what it is and how it can make sense from the inside | `id`, `group`, `tone` (`light` or `dark`) |
| `temperaments/` | the five Big Five axes and what low and high mean | `id`, `axes`, `levels` |
| `residents/` | 24 finished residents, `cNN-<title>.md` | see below |

## A resident

```markdown
---
id: c01
title: The Ledger
profession: merchant
tone: dark
drives: greed=aboveAll, narcissism=clearly
openness: middle
conscientiousness: high
extraversion: middle
agreeableness: low
neuroticism: low
---

## Who you are
## Why you are like this
## How you sound
```

- `drives` are `id=intensity` pairs; the intensities are `aboveAll`, `clearly` and `atTimes`, as in
  the engine. Every resident has exactly one drive `aboveAll`, and its `tone` is that drive's tone.
- The five temperament axes are `low`, `middle` or `high`.
- The body is written in the second person, as the system prompt would read. "Why you are like
  this" gives the drive a reason from the inside, because a reason holds a model to a dark side
  better than an adjective (see [`../lab/FINDINGS.md`](../lab/FINDINGS.md)).
- "How you sound" shows the voice only, never a game move. The promise of the stories holds here
  too: a character says who someone is and what they want, never how to get it.
- The `title` is not a name. Residents still choose their own name in Act I.

The first 24 mix 18 dark and 6 light residents, three per profession. The identity of a resident
lives within one game, across its acts; there is no memory across games.

## Checks

`src/cast/cast.ts` reads and validates the library (Typebox), and `test/cast/cast.test.ts` checks it
in `pnpm check`: every drive and profession exists, exactly one drive is above all, the levels are
valid, and no resident text names a resident id or a tool.
