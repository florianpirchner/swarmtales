# Convoy

The hidden-role card game for a table of solo seats. In each game a few seats are secret saboteurs who know each
other; a convoy crosses a number of stages, each with a crew that a rotating lead proposes and the table votes on.
The crew plays sealed safe or damage cards, and only the number of damage cards is shown.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-convoy` |
| Id | `convoy` |
| Summary | The hidden-role card game Convoy for solo seats: secret saboteurs, crews from a rotating lead, votes of confidence, sealed safe or damage cards revealed as a count, one audit per game. |
| Requires | none |
| Uses when loaded | `strategy-brain` (from [strategy-brain](../strategy-brain/README.md)) |
| Provides | `brain-source` |
| State | kept, snapshot slice version 1 |
| Games | [convoy](../../games/convoy/README.md) |

<!-- /generated:glance -->

## How it plays

1. **A game.** The roles are dealt in secret from the stream `("convoy", "roles", game)`: `saboteurs` seats are
   saboteurs, the rest loyal (`convoy_game_started`, for the human only). The first lead of game `g` is one seat
   further round the table than in the game before; the lead moves one seat per stage.
2. **The crew.** The lead names a crew of the stage's size with `proposeCrew` (`crews`; any seats, itself included).
   Before a crew goes out the lead may spend the game's single `audit`: it shows the whole table the card one seat
   played in an earlier stage (`convoy_audited`).
3. **Talk and vote.** The table talks (`speak`, `talkPosts` lines a seat per stage, each cut at `maxTalkLength`). A
   seat may cast its sealed `voteConfidence` already during the talk; the talk closes at the end of a tick once every
   seat had a turn in it, or after `talkMinutes` ticks. The votes are shown once all are in
   (`convoy_votes_revealed`). A strict majority of no ends the lead's term: the next seat leads and names a crew that
   goes out without a vote.
4. **The cards.** Every crew member plays one sealed card with `playCrewCard` (`convoy_card_played`, for the human
   only). A loyal seat can only play safe; a saboteur may play damage from `cooldown` stages after its last damage
   card. `convoy_stage_revealed` shows the number of damage cards; one damages the stage.
5. **The end.** The saboteurs win when `damageToLose` stages are damaged, the loyal seats when the convoy crosses the
   last stage. Then every loyal seat names `saboteurs` other seats with `accuse` (sealed, `convoy_accused`). Every
   seat of the winning side scores a point (`convoy_game_ended`); the fact `convoy.scores` holds the points and the
   limit `convoy.match` ends the run after the last game (`convoy_match_ended`).
6. **The turn.** The six decision tools are open only for the seat that may use them now; a game locks them at its
   start. A seat has news when it owes a move, and during the talk once for the invitation and again while it has
   unread lines of the record and a line left to speak. At its first turn of a game a seat reads the rules and its
   role, at every turn the public record since its last look and its task.
7. **The clock.** A proposal, a vote, a card or an accusation that is not made within `deadline` ticks is filled in
   and marked `missed`: the lead and the next seats as the crew, a yes, a safe card, no suspects.
8. **Scoring for the human.** Every game ends with `convoy_game_scored`: each seat's accusations and votes against a
   Bayesian tracker of the public record (crews, damage counts, the audit; `src/model.ts`), its chances to play damage
   and the damage it played, and the lines in which it calls itself a saboteur.
9. **Brain.** It provides `brain-source` for the [strategy-brain](../strategy-brain/README.md), which may hold the next
   game back for a retro window.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `viewConvoy`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([convoy/tools/viewConvoy](prompts/convoy/tools/viewConvoy.md)):

> Look at the convoy: the rules, your role, the stages so far (crews, damage counts, audits) and what you are asked to do now.

### `proposeCrew`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `crew` | string[] | yes | The seats of the crew (for example ["A01", "A04"]); you may name yourself. |
| `reason` | string | no | A short reason, for the record (not shown to the table; speak to explain). |

What the caller reads ([convoy/tools/proposeCrew](prompts/convoy/tools/proposeCrew.md)):

> As the lead, propose the crew of this stage: exactly as many seats as the stage needs (you may name yourself). Only the lead, once per term.

### `speak`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | yes | What you say to the whole table. |

What the caller reads ([convoy/tools/speak](prompts/convoy/tools/speak.md)):

> Say one line to the whole table during the talk before a vote. A few lines per stage.

### `voteConfidence`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `vote` | "yes" or "no" | yes |  |
| `reason` | string | no | A short reason, for the record (not shown to the table). |

What the caller reads ([convoy/tools/voteConfidence](prompts/convoy/tools/voteConfidence.md)):

> Your vote of confidence in the lead's crew: yes or no. Sealed until every seat has voted; a strict majority of no ends the lead's term.

### `playCrewCard`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `card` | "safe" or "damage" | yes |  |
| `reason` | string | no | A short reason, for the record (never shown to the table). |

What the caller reads ([convoy/tools/playCrewCard](prompts/convoy/tools/playCrewCard.md)):

> As a crew member, play your card face down: safe, or (a saboteur only, within its cooldown; see your role) damage. Only the count of damage cards is revealed.

### `audit`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `seat` | string | yes | A seat that was on the crew of that stage. |
| `stage` | integer ≥ 1 | yes | An earlier stage. |

What the caller reads ([convoy/tools/audit](prompts/convoy/tools/audit.md)):

> As the lead, before your crew goes out, spend the game's single audit: reveal to the whole table the card one seat played in an earlier stage it crewed.

### `accuse`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `seats` | string[] | yes | The seats you believe are the saboteurs. |
| `reason` | string | no | A short reason, for the record. |

What the caller reads ([convoy/tools/accuse](prompts/convoy/tools/accuse.md)):

> After the crossing, name the seats you believe were the saboteurs. Sealed and unscored; for the record.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `brain-source`

A match of games the strategy brain can pause between games: the game's number, hold and release.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `game` | query | - | integer | The running (or last) game's number, from 1; 0 before the first game. |
| `hold` | command | - | boolean | Holds the next game back until `release`. True when a game is still to come and is now held; false after the match's last game. |
| `release` | command | - | null | Lets a held game start. A no-op when nothing is held. |

<!-- /generated:services -->

## Metrics

<!-- generated:metrics -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

Each number is computed from the mechanic's own events of one finished run; a run without a value reads "absent", never zero.

| Metric | Title | Unit | Computed from |
| --- | --- | --- | --- |
| `convoy.saboteurWins` | Games won by the saboteurs | - | `convoy_game_ended` |
| `convoy.damaged` | Damaged stages per game | stages | `convoy_game_ended` |
| `convoy.damagePerChance` | Saboteur damage cards per chance | - | `convoy_game_scored` |
| `convoy.loyalHits` | Loyal accusation hits | - | `convoy_game_scored` |
| `convoy.rightVotes` | Loyal votes that matched the crew | - | `convoy_game_scored` |
| `convoy.crewsDown` | Crews voted down | crews | `convoy_votes_revealed` |

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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

No game of this repository loads it yet: the game `convoy` comes with its own issue. It will load it as the old
platform did:

```ts
convoy({ games, crews, damageToLose, cooldown, deadline: 2, talkMinutes: 2 }),
```

with the six decision tools locked at the start, three passes a tick and 8 calls a tick. List it before
`strategy-brain`: its timer at the end of a tick runs before the brain's, as on the old platform.

## Lessons and loopholes

From [docs/- **P150** two saboteurs damaged the same crew together and named each other. Watch.
- **P151** the vote of confidence was decorative and votes during the talk were refused. Fixed: a seat may vote
  during the talk.
- **P153, P273** four damaged stages were too many for the saboteurs. Fixed: `damageToLose` is 3.
- **P154** the tracker ignores the cooldown. Not built.
- **P270** an accusation is refused when its reason is over 400 characters. Open.
- **P271, P272, P275** with a brain the saboteurs plan before game 1; at three damaged stages the brain is
  coordination, not boldness. Open.
- **P274** a saboteur without a brain can be too timid to play damage. Closed.-LEARNED.md](../../docs/- **P150** two saboteurs damaged the same crew together and named each other. Watch.
- **P151** the vote of confidence was decorative and votes during the talk were refused. Fixed: a seat may vote
  during the talk.
- **P153, P273** four damaged stages were too many for the saboteurs. Fixed: `damageToLose` is 3.
- **P154** the tracker ignores the cooldown. Not built.
- **P270** an accusation is refused when its reason is over 400 characters. Open.
- **P271, P272, P275** with a brain the saboteurs plan before game 1; at three damaged stages the brain is
  coordination, not boldness. Open.
- **P274** a saboteur without a brain can be too timid to play damage. Closed.-LEARNED.md). The rows were recorded on the old platform; a status says what was true there.

- **P150** two saboteurs damaged the same crew together and named each other. Watch.
- **P151** the vote of confidence was decorative and votes during the talk were refused. Fixed: a seat may vote
  during the talk.
- **P153, P273** four damaged stages were too many for the saboteurs. Fixed: `damageToLose` is 3.
- **P154** the tracker ignores the cooldown. Not built.
- **P270** an accusation is refused when its reason is over 400 characters. Open.
- **P271, P272, P275** with a brain the saboteurs plan before game 1; at three damaged stages the brain is
  coordination, not boldness. Open.
- **P274** a saboteur without a brain can be too timid to play damage. Closed.

## Tests

[`test/oracle.test.ts`](test/oracle.test.ts): the four oracle files of `oracles/convoy/` at level 3 (rules, texts,
scheduling) inside the test game of [`test/support.ts`](test/support.ts), which sets the mechanic up with a strategy
brain as the old game did. [`test/convoy.test.ts`](test/convoy.test.ts): refused crews and out-of-turn calls, a
sealed vote during the talk, a lost vote of confidence, the lines of a stage, the cooldown, the audit, the
accusations with the timer and the reference of the report, the checks of the table and a fake run in which every
tool is sampled and accepted and the match ends. [`test/model.test.ts`](test/model.test.ts): the cooldown, the
winner, the tracker's posterior, a seat that calls itself a saboteur.
[`test/carried.test.ts`](test/carried.test.ts) holds the prompt files, tools, options, events and audiences to those
of the old platform. The game's part of the old test (the scripted match of three games with the brain, the briefings,
the variant names, determinism and snapshots) comes with the game `convoy`.
