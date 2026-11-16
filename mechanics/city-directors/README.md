# @swarmtales/city-directors

Directors: the gamemaker, the Confessor, the judge and the guard of the City and Whispers (decision A58), with the
one mechanic they need, `interpretations`, which holds the Confessor's labels and what it remembers between two
looks. Its place in the layer table is in [`docs/LAYERS.md`](../../docs/LAYERS.md).

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/city-directors` |
| Id | `interpretations` |
| Summary | The Confessor's labels of what residents say, and the conversations it remembers. |
| Requires | none |
| Uses when loaded | `identity` (from [names](../names/README.md)) |
| Provides | none |
| State | kept, snapshot slice version 1 |
| Games | [city](../../games/city/README.md), [whispers](../../games/whispers/README.md) |

<!-- /generated:glance -->

## How it plays

### The gamemaker

A Director that acts by tool use (`acts: "tools"`): after a round it looks at the city and may send a resident a
private note or post on the board through the tools of its grant, until it calls no more tools.

- **When it looks.** After every round (`defineGamemaker({ every })` for every few), on the run frame's
  `arena.round_end`. No look follows the last round or a round after which the run stops.
- **What it reads.** The old report of the city, written from the facts its head lists (`GAMEMAKER_FACTS`); a game
  lists those of the mechanics it loads (`defineGamemaker({ facts })`). `progression.section` is always read.
- **Its system text.** Composed by `gamemakerOptions(input, prompts)` from the game's brief, rules and act roles and
  the direction dial, out of the prompt files under `prompts/gamemaker/`, carried byte for byte with their old ids.
  A Director reads no file, so the game composes the options; the template of the budget line goes with them.
- **Not yet.** The tracks per resident, the events since the last look and the notes are issue M5-35; standing
  orders of the Human Hand are not ported (decision A61).

### The Confessor

The old classifier: a Director that answers (`acts: "answer"`) and labels what the residents said in a round
(promise, offer, threat, refusal, lie, hesitation, helpRequest, accusation, thanks), for the gamemaker.

- **When it asks.** After every round, on `arena.round_end`, like the gamemaker; a game names it before the
  gamemaker, so the gamemaker's look in the same slot follows its labels. The round's direct messages, board, group
  and cast posts are quiet firings (`STATEMENT_EVENTS`, `defineConfessor({ statements })` for a game that loads
  fewer), taken along with the round's end. A round without a statement is asked too: a Director cannot decline.
- **What it asks.** The old question, from the carried prompt files under `prompts/classifier/` composed by
  `confessorOptions(prompts)`: the round, the residents with their names, the earlier messages of the round's
  conversations (the last four of each, the fact `interpretations.history`) and the statements, each with the number
  of its firing as its reference. One question per round, where the old one asked once per batch of 60.
- **What it does with the answer.** It calls `interpret`, the tool of the mechanic `interpretations`, which drops
  unknown labels, unknown residents, the speaker itself and references the round did not hold, maps a name to its
  id, writes one `interpretation` per labelled statement and then `interpretation_round`, and remembers the round's
  messages. **Fail open:** without an answer it writes `interpretation_error` and no label; the messages are
  remembered all the same.
- **The check of a private thought in a Director's note** (decision A62). `interpretations` keeps every `lie` it
  wrote since the gamemaker's last look (option `every`, the gamemaker's cadence). Its `rule` handler on the note
  tools (option `noteTools`, by bare name; the text is `text`, or `reason` for a tribunal's tool) refuses a note
  whose sentence names such a resident beside a cue of its label or a word of what it thinks, with the old
  `PRIVATE_BLOCKED` of `gamemaker/replies/private-thoughts` (the option `privateThoughts`). A note to that resident
  itself passes; `notify` is read by its `agent`, every other note tool by the board.
- **Not ported.** A resident's thoughts and asides (no mechanic writes them as events), the decider backend of the
  old classifier, and standing orders (A61).

The game loads `interpretations` and grants it `interpret` (the default grant `confessor`).

### The judge and the guard

Two Directors that answer the stage `review` and are woken by nothing else. Their system texts and questions are
the carried prompt files under `prompts/judge/` and `prompts/guard/`, composed by the game with
`judgeOptions(prompts, temper)` and `guardOptions(prompts)`.

- **The judge** (`answers: "judge"`) rules on a `blame` of `receipts`: does the accused's later message deny that it
  received the DM? Its temper (`fair`, `partial`, `capricious`) picks its system text. Its answer is the old verdict
  (the ruling, words for the board, a word for the gamemaker, each at most 400 characters); without an answer that
  fits, `blame` refuses with `JUDGE_FAILED` and nothing is charged.
- **The guard** (`answers: "guard"`) is asked by the `review` handler of `puzzles` once the city's own check (with
  the rule's `minRun`) let a guarded text through: does the text keep the city's rule, given the secrets the author
  holds? `allowed: false` refuses the call with `GUARD_BLOCKED` and the guard's reason; without an answer that fits,
  the call goes through (fail open).

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `interpret`

- Granted when the game lists no grants: `confessor`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `round` | integer | yes | The old round |
| `classifier` | string | yes | The Confessor's model as written into every interpretation |
| `statements` | object[] | yes | The statements of the round |
| `statements[].ref` | integer ≥ 1 | yes | The number of the firing that brought it: the reference the model labels |
| `statements[].agent` | string | yes | The resident who made it |
| `statements[].source` | "dm" or "board" or "group" or "cast" | yes | Where it was made |
| `statements[].to` | string[] | yes | The receiver of a direct message; empty for the board and a group |
| `statements[].group` | string | no | The group of a group post |
| `statements[].text` | string | yes | The text |
| `items` | object[] | yes | The model's answer |
| `items[].ref` | integer | yes | The reference |
| `items[].labels` | string[] | yes | The labels |
| `items[].targets` | string[] | no | The targets |
| `error` | string | no | Set when the model gave no answer |

What the caller reads:

> Records the labels of a round's statements.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `interpretation`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `ref` | integer | yes | The reference of the statement |
| `agent` | string | yes | The resident who made it |
| `source` | "thought" or "aside" or "dm" or "board" or "group" or "cast" | yes | Where it was made |
| `labels` | ("promise" or "offer" or "threat" or "refusal" or "lie" or "hesitation" or "helpRequest" or "accusation" or "thanks")[] | yes | Its labels, in the order of the label set |
| `targets` | string[] | yes | Residents |
| `classifier` | string | yes | The Confessor's model as written into every interpretation |

### `interpretation_round`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `round` | integer | yes | The old round |
| `classifier` | string | yes | The Confessor's model as written into every interpretation |
| `statements` | integer | yes | The statements of the round |
| `labeled` | integer | yes | Those with a label |

### `interpretation_error`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `round` | integer | yes | The old round |
| `message` | string | yes | Why there is no answer |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `noteTools` | string[] | `["notify","boardNote"]` | The tools of a Director's note whose `text` (or `reason`) is checked for a private read of another resident (`PRIVATE_BLOCKED`); `notify` is read by its `agent`, the others by the board. |
| `every` | integer ≥ 1 | `1` | Rounds between two looks of the gamemaker (its `every`): the private labels of these rounds are checked. |
| `privateThoughts` | string | `"PRIVATE_BLOCKED: the text passes on what {{who}} privately thinks; use a private read only in a note to that resident"` | The refusal, with `{{who}}`: the old `gamemaker/replies/private-thoughts`. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic provides no service to other mechanics.

<!-- /generated:services -->

## Metrics

<!-- generated:metrics -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic exports no metrics.

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic has no prompt files.

<!-- /generated:prompts -->

## Example

No game loads the package yet (Whispers and the City do from issues M5-38 and M5-45). The shape:

```ts
const options = gamemakerOptions({ city: "ECHO", agents: 6, survivors: 2, rules, spec, holdout, whisperer: true }, createPromptLookup());
defineGame({
	...,
	mechanics: [..., arena(), interpretations()],
	directors: [{ use: confessor, options: confessorOptions(createPromptLookup()) }, { use: defineGamemaker({ facts: ["progression.section", "whispers.section"] }), options }],
});
```

## Lessons and loopholes

[`docs/LESSONS-LEARNED.md`](../../docs/LESSONS-LEARNED.md): P6 (the gamemaker paraphrased a private label to another
resident; fixed on `legacy` by the note check `PRIVATE_BLOCKED`, whose port is decision A62).

## Tests

`test/director.test.ts`, `situation.test.ts`, `sections.test.ts` and `system.test.ts` cover the gamemaker against
the old report and system texts. `test/confessor.test.ts` plays the statements of the old classifier's recording
(`test/fixtures/old-classifier.json`, from `legacy` `test/overseers/classifier.test.ts`) through stand-ins of
`channels`, `cast`, `names` and the run frame: the questions and the events are the old ones without thoughts and
asides, a round without an answer fails open, and the run replays and resumes equal at every boundary.
