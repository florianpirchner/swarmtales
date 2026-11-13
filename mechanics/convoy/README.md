# convoy

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-convoy` |
| Id | `convoy` |
| Summary | The hidden-role card game Convoy for solo seats: secret saboteurs, crews from a rotating lead, votes of confidence, sealed safe or damage cards revealed as a count, one audit per game. |
| Requires | none |
| Uses when loaded | `strategy-brain` (from [strategy-brain](../strategy-brain/README.md)) |
| Provides | `brain-source` |
| State | kept, snapshot slice version 1 |
| Facts | `scores` |
| Jobs | `nextGame` |
| Stories | [convoy](../../stories/convoy/README.md) (all 2 variants) |

<!-- /generated:glance -->

## How it plays

_To be written._

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `viewConvoy`

- Suggested for: `resident`

No parameters.

What the caller reads ([convoy/tools/viewConvoy](prompts/convoy/tools/viewConvoy.md)):

> Look at the convoy: the rules, your role, the stages so far (crews, damage counts, audits) and what you are asked to do now.

### `proposeCrew`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `crew` | string[] | yes | The seats of the crew (for example ["A01", "A04"]); you may name yourself. |
| `reason` | string | no | A short reason, for the record (not shown to the table; speak to explain). |

What the caller reads ([convoy/tools/proposeCrew](prompts/convoy/tools/proposeCrew.md)):

> As the lead, propose the crew of this stage: exactly as many seats as the stage needs (you may name yourself). Only the lead, once per term.

### `speak`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | yes | What you say to the whole table. |

What the caller reads ([convoy/tools/speak](prompts/convoy/tools/speak.md)):

> Say one line to the whole table during the talk before a vote. A few lines per stage.

### `voteConfidence`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `vote` | "yes" or "no" | yes |  |
| `reason` | string | no | A short reason, for the record (not shown to the table). |

What the caller reads ([convoy/tools/voteConfidence](prompts/convoy/tools/voteConfidence.md)):

> Your vote of confidence in the lead's crew: yes or no. Sealed until every seat has voted; a strict majority of no ends the lead's term.

### `playCrewCard`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `card` | "safe" or "damage" | yes |  |
| `reason` | string | no | A short reason, for the record (never shown to the table). |

What the caller reads ([convoy/tools/playCrewCard](prompts/convoy/tools/playCrewCard.md)):

> As a crew member, play your card face down: safe, or (a saboteur only, within its cooldown; see your role) damage. Only the count of damage cards is revealed.

### `audit`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `seat` | string | yes | A seat that was on the crew of that stage. |
| `stage` | integer ≥ 1 | yes | An earlier stage. |

What the caller reads ([convoy/tools/audit](prompts/convoy/tools/audit.md)):

> As the lead, before your crew goes out, spend the game's single audit: reveal to the whole table the card one seat played in an earlier stage it crewed.

### `accuse`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `seats` | string[] | yes | The seats you believe are the saboteurs. |
| `reason` | string | no | A short reason, for the record. |

What the caller reads ([convoy/tools/accuse](prompts/convoy/tools/accuse.md)):

> After the crossing, name the seats you believe were the saboteurs. Sealed and unscored; for the record.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `convoy_game_started`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `seats` | string[] | yes |  |
| `roles` | record of "loyal" or "saboteur" | yes | The secret deal (audience human). |

### `convoy_crew_proposed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `stage` | integer | yes |  |
| `lead` | string | yes |  |
| `crew` | string[] | yes |  |
| `proposal` | integer | yes |  |
| `missed` | boolean | yes |  |

### `convoy_spoken`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `stage` | integer | yes |  |
| `from` | string | yes |  |
| `text` | string | yes |  |

### `convoy_votes_revealed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `stage` | integer | yes |  |
| `lead` | string | yes |  |
| `crew` | string[] | yes |  |
| `votes` | record of "yes" or "no" | yes |  |
| `missed` | string[] | yes |  |
| `confidence` | boolean | yes |  |

### `convoy_card_played`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `stage` | integer | yes |  |
| `seat` | string | yes |  |
| `card` | "safe" or "damage" | yes |  |
| `role` | "loyal" or "saboteur" | yes |  |
| `missed` | boolean | yes |  |
| `mayDamage` | boolean | yes |  |

### `convoy_stage_revealed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `stage` | integer | yes |  |
| `lead` | string | yes |  |
| `crew` | string[] | yes |  |
| `rejected` | object | no |  |
| `rejected.lead` | string | yes |  |
| `rejected.crew` | string[] | yes |  |
| `votes` | record of "yes" or "no" | yes |  |
| `noVote` | string[] | no |  |
| `damage` | integer | yes |  |
| `damaged` | boolean | yes |  |
| `audit` | object | no |  |
| `audit.seat` | string | yes |  |
| `audit.card` | "safe" or "damage" | yes |  |
| `audit.by` | string | yes |  |

### `convoy_audited`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `stage` | integer | yes |  |
| `seat` | string | yes |  |
| `card` | "safe" or "damage" | yes |  |
| `by` | string | yes |  |

### `convoy_accused`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `seat` | string | yes |  |
| `accused` | string[] | yes |  |
| `missed` | boolean | yes |  |

### `convoy_game_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `winner` | "convoy" or "saboteurs" | yes |  |
| `roles` | record of "loyal" or "saboteur" | yes |  |
| `damaged` | integer | yes |  |
| `stages` | integer | yes |  |
| `cards` | object[] | yes |  |
| `cards[].game` | integer | yes |  |
| `cards[].stage` | integer | yes |  |
| `cards[].seat` | string | yes |  |
| `cards[].card` | "safe" or "damage" | yes |  |
| `cards[].role` | "loyal" or "saboteur" | yes |  |
| `cards[].missed` | boolean | yes |  |
| `cards[].mayDamage` | boolean | yes |  |
| `totals` | record of number | yes |  |

### `convoy_game_scored`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `seats` | record of object | yes |  |
| `tracker` | string[] | yes |  |
| `posterior` | record of number | yes |  |

### `convoy_match_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `scores` | record of number | yes |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `games` | integer ≥ 1 ≤ 20 | `3` | Games in the match; the roles are dealt anew for each; the run ends after the last. |
| `saboteurs` | integer ≥ 1 | `2` | Saboteurs dealt per game; they know each other. |
| `crews` | (integer ≥ 1)[] | `[2,2,3,3,3,3,4,4]` | The crew size of each stage; its length is the number of stages. |
| `damageToLose` | integer ≥ 1 | `3` | Damaged stages that stop the convoy: the saboteurs win. |
| `cooldown` | integer ≥ 1 | `3` | A saboteur who played damage in stage s may play damage again from stage s + cooldown (3: at most one damage card per three stages). |
| `talkPosts` | integer ≥ 0 | `2` | Lines a seat may speak per stage. |
| `maxTalkLength` | integer ≥ 20 | `400` | The longest line a seat may speak, in characters. |
| `deadline` | integer ≥ 1 | `2` | Minutes a proposal, vote, card or accusation stays open before the missing ones are filled in (crew in seat order, yes, safe, none) and marked missed. |
| `talkMinutes` | integer ≥ 1 | `2` | Minutes the talk before a vote stays open at most; it closes at the end of a minute once every seat had a turn in it. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `brain-source`

A match of games the strategy brain can pause between games: the game's number, hold and release.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `game` | query | - | integer | The running (or last) game's number, from 1; 0 before the first game. |
| `hold` | command | - | boolean | Holds the next game back until `release`. True when a game is still to come and is now held; false after the match's last game. |
| `release` | command | - | null | Lets a held game start. A no-op when nothing is held. |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [convoy/tools/viewConvoy](prompts/convoy/tools/viewConvoy.md) | - |
| [convoy/tools/proposeCrew](prompts/convoy/tools/proposeCrew.md) | - |
| [convoy/tools/speak](prompts/convoy/tools/speak.md) | - |
| [convoy/tools/voteConfidence](prompts/convoy/tools/voteConfidence.md) | - |
| [convoy/tools/playCrewCard](prompts/convoy/tools/playCrewCard.md) | - |
| [convoy/tools/audit](prompts/convoy/tools/audit.md) | - |
| [convoy/tools/accuse](prompts/convoy/tools/accuse.md) | - |
| [convoy/rules](prompts/convoy/rules.md) | `seats`, `saboteurs`, `stages`, `crews`, `damageToLose`, `cooldown`, `talkPosts` |
| [convoy/game-head](prompts/convoy/game-head.md) | `game`, `games` |
| [convoy/role-loyal](prompts/convoy/role-loyal.md) | `seat`, `saboteurs` |
| [convoy/role-saboteur](prompts/convoy/role-saboteur.md) | `seat`, `partners`, `cooldown`, `damageToLose` |
| [convoy/task-propose](prompts/convoy/task-propose.md) | `seat`, `stage`, `stages`, `size`, `damaged`, `damageToLose`, `vote` |
| [convoy/task-talk](prompts/convoy/task-talk.md) | `seat`, `stage`, `lead`, `crew`, `posts`, `audit` |
| [convoy/task-vote](prompts/convoy/task-vote.md) | `seat`, `stage`, `lead`, `crew` |
| [convoy/task-play](prompts/convoy/task-play.md) | `seat`, `stage`, `crew`, `choice` |
| [convoy/task-accuse](prompts/convoy/task-accuse.md) | `seat`, `count` |

<!-- /generated:prompts -->

## Example

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._
