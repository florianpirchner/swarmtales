# Standoff tribunal

The holdout tribunal of Whispers: a resident who has passed a door and keeps its fragment back from those still
before it can be put on trial. The city reports the blockers, the gamemaker calls a tribunal, the accused has a grace
to send its fragment, and otherwise the others vote in secret on its banishment. Ported from the old platform in two
issues: part 1 (M5-29) holds the blockers, the call and the grace; part 2 (M5-30) the votes, the lot and the strike.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-standoff-tribunal` |
| Id | `standoff-tribunal` |
| Summary | The holdout tribunal over a resident who keeps a fragment back. |
| Requires | `holdout-pieces` (from [puzzles](../puzzles/README.md)), `progression` (from [progression](../progression/README.md)), `exile` (from [exile](../exile/README.md)), `channels` (from [channels](../channels/README.md)), `notes` (from [channels](../channels/README.md)) |
| Uses when loaded | `identity` (from [names](../names/README.md)) |
| Provides | `cap-exemption` |
| State | kept, snapshot slice version 1 |
| Games | none of the games in this repository |

<!-- /generated:glance -->

## How it plays

1. **The blockers.** At the start of every tick the city notes who stands at an open door of fragments
   (`holdout-pieces.openFragmentDoors`, a level reached by `progression.levelOf`). A resident who has stood at a door
   for `stallMinutes` and has not sent its fragment of it to another who has stood before it as long
   (`holdout-pieces.lacking`) is a blocker: `blocker_found`, and `blocker_cleared` once it is one no more. The fact
   `blockers` lists them.
2. **The call.** The gamemaker's `callTribunal` names blockers; with more than one blocker the city draws the accused
   among all of them (`lot_drawn`, stream `holdout-lot`). Its reason goes through the note desk of `channels`
   (`notes.check` in the tool's rule and again in its run, `notes.record` under the number of the post), the city
   posts the reason with the procedure, notifies every resident in the city and writes `holdout_called`. One
   tribunal at a time, and none for `stallMinutes` after one ended.
3. **The grace.** The accused has `graceMinutes` whole ticks of turns. Once nobody lacks its fragment, the tribunal
   is dropped (`holdout_ended`, outcome `dropped`). When the grace ends, the first secret vote opens
   (`holdout_vote_opened`, a notice to every voter and to the accused).
4. **The votes.** Every other resident in the city casts a secret `tribunalVote` (yes banishes, no keeps; the last
   ballot counts, `holdout_ballot`); the tool is locked for the accused and outside a vote. At the vote's end the
   city counts the voters still in the city (`holdout_vote_result`): every voter's yes banishes; otherwise the next
   vote opens, `maxVotes` in all; after the last one fails the lot strikes, once per door (a door the lot struck
   before spares the accused, outcome `spared`).
5. **The strike.** After a unanimous vote the gamemaker strikes the accused with `permaDeath`; after the last failed
   vote it draws the lot among every resident in the city with `drawLot` (`lot_drawn`, purpose `strike`) and strikes
   the one drawn. The city does either itself after `fallbackMinutes`. The struck resident gets its notice, the board
   its post, `exile` banishes it with `by: "holdout"` (it keeps its points), and everyone left before an open door of
   fragments it has not passed gets the struck resident's fragment of it (`holdout-pieces.inherited`).
6. **The announcements.** Each outcome waits for the gamemaker's words (`announceTribunal`); the city posts its own
   line after `fallbackMinutes` (`holdout_announced` with `by: "city"`).
7. **What residents see.** Their status line carries the running tribunal (the accused whom it still owes its
   fragment, a voter its own ballot, never another's), and the rule (`texts.rule`) comes as a line of kind `task`
   under every new task, after the progression's task and before the terms of `marks`.
8. **The gamemaker's report.** The fact `section` (with `session`, `pending`, `cooldownUntil` and `struck`) is what
   the report of `mechanics/city-directors` reads; it writes the old lines from it.

9. **The cap on direct messages.** The mechanic provides `cap-exemption` of `mechanics/contracts` (decision A75):
   during the grace and the votes the accused's direct messages to those who still lack its fragment pass the cap
   of `channels` (`exempt`, the old `exemptFromCap`).

**Not done here:** the checks of game facts
on the tribunal's texts (errata J62, the owners' rules); the provider of `holdout-pieces` (`puzzles`, M5-64).

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `tribunalVote`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `yes` | boolean | yes | true: banish the accused; false: keep it |

What the caller reads ([standoff-tribunal/tools/tribunalVote](prompts/standoff-tribunal/tools/tribunalVote.md)):

> Your secret ballot in the open holdout tribunal: yes banishes the accused from the city for good, no keeps it. Banishment needs a yes from every voter. Nobody sees how you voted; your last ballot counts.

### `callTribunal`

- Granted when the game lists no grants: `gamemaker`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `accused` | string[] | yes | Residents the report names as blockers; when it names more than one, the city draws the accused by lot among all of them |
| `reason` | string | yes | Your public announcement, 1-400 characters; the city adds the procedure |

What the caller reads ([standoff-tribunal/gamemaker/tools/callTribunal](prompts/standoff-tribunal/gamemaker/tools/callTribunal.md)):

> Calls a holdout tribunal on a resident the report names as a blocker; when the report names more than one, the city draws the accused by lot among all of them. The city posts your reason as the announcement, adds the procedure and tells every resident. One tribunal at a time.

### `drawLot`

- Granted when the game lists no grants: `gamemaker`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `candidates` | string[] | yes | After the last vote of a tribunal failed: every resident in the city |

What the caller reads ([standoff-tribunal/gamemaker/tools/drawLot](prompts/standoff-tribunal/gamemaker/tools/drawLot.md)):

> After the last vote of a tribunal failed, the city draws the lot with the run's seed among every resident in the city, once and for good; then permaDeath may strike only the one drawn.

### `announceTribunal`

- Granted when the game lists no grants: `gamemaker`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | yes | The outcome in your words, 1-400 characters |

What the caller reads ([standoff-tribunal/gamemaker/tools/announceTribunal](prompts/standoff-tribunal/gamemaker/tools/announceTribunal.md)):

> Announces the tribunal outcome the report shows under TO ANNOUNCE on the board, in your words (the counts, never who voted how).

### `permaDeath`

- Granted when the game lists no grants: `gamemaker`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | The banished accused, or the resident the lot drew; name or ID |
| `reason` | string | yes | Your public line on the board, 1-400 characters |

What the caller reads ([standoff-tribunal/gamemaker/tools/permaDeath](prompts/standoff-tribunal/gamemaker/tools/permaDeath.md)):

> Strikes a resident from the city for good: only the accused after a unanimous vote to banish it, or the resident the lot drew after the last vote failed. Your reason goes on the board; the city gives the struck resident's fragments to everyone left.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `blocker_found`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `door` | integer | yes | The door |
| `blocker` | string | yes | A resident id, for example `A01` |
| `lacking` | string[] | yes | Who stands before the door without its fragment |

### `blocker_cleared`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `door` | integer | yes | The door |
| `blocker` | string | yes | A resident id, for example `A01` |

### `holdout_called`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes | The tribunal's number in the run, from 1 |
| `accused` | string | yes | A resident id, for example `A01` |
| `door` | integer | yes | The door |
| `lacking` | string[] | yes | Who lacks the accused's fragment |
| `until` | integer | yes | The tick the grace ends |
| `text` | string | yes | The announcement with the procedure |
| `candidates` | string[] | no | The blockers the city drew the accused among |

### `lot_drawn`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes | The tribunal's number in the run, from 1 |
| `purpose` | "accused" or "strike" | yes | What the lot decides |
| `candidates` | string[] | yes | Who the lot is drawn among, sorted |
| `drawn` | string | yes | A resident id, for example `A01` |

### `holdout_vote_opened`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes | The tribunal's number in the run, from 1 |
| `vote` | integer | yes | The vote's number, from 1 |
| `voters` | string[] | yes | Who votes |
| `until` | integer | yes | The tick the vote closes |

### `holdout_ballot`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes | The tribunal's number in the run, from 1 |
| `vote` | integer | yes | The vote's number |
| `agent` | string | yes | A resident id, for example `A01` |
| `yes` | boolean | yes | True to banish |

### `holdout_vote_result`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes | The tribunal's number in the run, from 1 |
| `vote` | integer | yes | The vote's number |
| `yes` | integer | yes | Yes ballots |
| `no` | integer | yes | Other voters |
| `voters` | string[] | yes | The voters still in the city |
| `unanimous` | boolean | yes | True when every voter said yes |

### `holdout_announced`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes | The tribunal's number in the run, from 1 |
| `kind` | "dropped" or "graceFailed" or "voteFailed" or "spared" | yes | The outcome announced |
| `by` | "gamemaker" or "city" | yes | Who acted: the Director, or the city at its fallback |
| `text` | string | yes | The text on the board |

### `holdout_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes | The tribunal's number in the run, from 1 |
| `outcome` | "dropped" or "banished" or "lot" or "spared" | yes | How it ended |
| `struck` | string | no | A resident id, for example `A01` |
| `by` | "gamemaker" or "city" | no | Who acted: the Director, or the city at its fallback |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `stallMinutes` | integer ≥ 1 | required | Minutes a resident stands at a door, and another before it without its fragment, before the city reports a blocker; also the pause after a tribunal. |
| `graceMinutes` | integer ≥ 0 | required | Whole minutes of turns the accused has after the call to send its fragment to everyone who lacks it. |
| `voteMinutes` | integer ≥ 1 | required | How long one secret vote on banishment runs, in minutes. |
| `maxVotes` | integer ≥ 1 | required | Votes in all; after the last one fails the lot strikes, once per door. |
| `fallbackMinutes` | integer ≥ 0 | required | Minutes the city waits for the gamemaker to announce or strike before it does so itself. |
| `author` | string | `"COURIER"` | The gamemaker's name on the tribunal's posts and notices, e.g. COURIER. |
| `texts` | object | required | The story's texts of the holdout tribunal (old `HoldoutTexts`). |
| `texts.rule` | string | required | The rule as every door's task states it. |
| `texts.called` | string | required | The procedure under the gamemaker's announcement ({accused}, {door}, {lacking}, {grace}, {graceUntil}, {vote}, {maxVotes}). |
| `texts.drawnAccused` | string | required | Added when the city drew the accused among several blockers ({candidates}, {drawn}). |
| `texts.voteOpened` | string | required | Notice to every voter when a vote opens ({accused}, {number}, {maxVotes}, {until}). |
| `texts.accusedVote` | string | required | Notice to the accused when a vote on it opens ({accused}, {number}, {maxVotes}, {until}). |
| `texts.struck` | string | required | Board post when a resident is struck ({struck}). |
| `texts.struckNotice` | string | required | The struck resident's final notice ({struck}). |
| `texts.released` | string | required | Notice to everyone left with the struck resident's fragment of the door open to them ({struck}, {fragments}). |
| `texts.dropped` | string | required | The city's line when the accused fixed it ({accused}). |
| `texts.graceFailed` | string | required | The city's line when the grace ran out ({accused}, {until}). |
| `texts.voteFailed` | string | required | The city's line when a vote was not unanimous ({accused}, {number}, {yes}, {no}, {left}, {until}). |
| `texts.banished` | string | required | The city's line when it strikes the banished itself ({accused}, {yes}). |
| `texts.lot` | string | required | The city's line when it draws and strikes itself ({accused}, {drawn}). |
| `texts.spared` | string | required | The city's line when every vote failed at a door the lot struck before ({accused}, {door}). |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `cap-exemption`

Whether a resident's direct message passes the cap of the window although the window is full.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `exempt` | query | from: string, to: string | boolean | True when the message from `from` to `to` is exempt from the cap (old `exemptFromCap`: the accused of a holdout tribunal to those who lack its fragment). |

<!-- /generated:services -->

The tribunal declares `holdout-pieces` in its `/contract` (the old `PuzzlesApi.openFragmentDoors`, `lacking` and
`inherited`), for `puzzles` to provide; it asks `progression`, `exile`, `channels` and `notes`, and `identity` when
`names` is loaded.

## Metrics

<!-- generated:metrics -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic exports no metrics.

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Prompt | Variables |
| --- | --- |
| [standoff-tribunal/tools/tribunalVote](prompts/standoff-tribunal/tools/tribunalVote.md) | - |
| [standoff-tribunal/replies/ballot-holdout](prompts/standoff-tribunal/replies/ballot-holdout.md) | `vote`, `accused`, `number`, `until` |
| [standoff-tribunal/replies/ballot-yes](prompts/standoff-tribunal/replies/ballot-yes.md) | - |
| [standoff-tribunal/replies/ballot-no](prompts/standoff-tribunal/replies/ballot-no.md) | - |
| [standoff-tribunal/replies/locked](prompts/standoff-tribunal/replies/locked.md) | - |
| [standoff-tribunal/gamemaker/tools/callTribunal](prompts/standoff-tribunal/gamemaker/tools/callTribunal.md) | - |
| [standoff-tribunal/gamemaker/tools/drawLot](prompts/standoff-tribunal/gamemaker/tools/drawLot.md) | - |
| [standoff-tribunal/gamemaker/tools/announceTribunal](prompts/standoff-tribunal/gamemaker/tools/announceTribunal.md) | - |
| [standoff-tribunal/gamemaker/tools/permaDeath](prompts/standoff-tribunal/gamemaker/tools/permaDeath.md) | - |
| [standoff-tribunal/gamemaker/replies/tribunal-called](prompts/standoff-tribunal/gamemaker/replies/tribunal-called.md) | `accused`, `lot`, `door`, `until`, `lacking` |
| [standoff-tribunal/gamemaker/replies/tribunal-lot](prompts/standoff-tribunal/gamemaker/replies/tribunal-lot.md) | `candidates`, `accused` |
| [standoff-tribunal/gamemaker/replies/lot-drawn](prompts/standoff-tribunal/gamemaker/replies/lot-drawn.md) | `drawn` |
| [standoff-tribunal/gamemaker/replies/announced](prompts/standoff-tribunal/gamemaker/replies/announced.md) | `value` |
| [standoff-tribunal/gamemaker/replies/struck](prompts/standoff-tribunal/gamemaker/replies/struck.md) | `agent`, `how` |
| [standoff-tribunal/gamemaker/replies/struck-lot](prompts/standoff-tribunal/gamemaker/replies/struck-lot.md) | - |
| [standoff-tribunal/gamemaker/replies/struck-vote](prompts/standoff-tribunal/gamemaker/replies/struck-vote.md) | - |
| [standoff-tribunal/status/holdout-owed](prompts/standoff-tribunal/status/holdout-owed.md) | `door`, `lacking` |
| [standoff-tribunal/status/holdout-grace](prompts/standoff-tribunal/status/holdout-grace.md) | `accused`, `until`, `owed` |
| [standoff-tribunal/status/holdout-accused](prompts/standoff-tribunal/status/holdout-accused.md) | `vote`, `maxVotes`, `until`, `owed` |
| [standoff-tribunal/status/holdout-not-voted](prompts/standoff-tribunal/status/holdout-not-voted.md) | - |
| [standoff-tribunal/status/holdout-ballot](prompts/standoff-tribunal/status/holdout-ballot.md) | `ballot` |
| [standoff-tribunal/status/holdout-voter](prompts/standoff-tribunal/status/holdout-voter.md) | `accused`, `vote`, `maxVotes`, `until`, `cast` |
| [standoff-tribunal/status/holdout-strike](prompts/standoff-tribunal/status/holdout-strike.md) | `accused` |

<!-- /generated:prompts -->

## Example

```ts
mechanics: [ledger(), channels(), puzzles(), progression(), exile(), standoffTribunal({ stallMinutes: 3, graceMinutes: 2, voteMinutes: 2, maxVotes: 3, fallbackMinutes: 1, texts })],
```

Whispers reports a blocker after three ticks at a door and gives the accused two ticks of grace.

## Lessons and loopholes

LH10 and P62 of the old platform (a resident who kept its fragment back held the city) are what the tribunal
answers. None recorded against this mechanic on this platform yet.

## Tests

- `test/oracle.test.ts`: `whispers-holdout-s7.json` from its start to the first ballot, with the world of the file
  in stand-ins: every event of the tribunal, its posts, notices and note, the holdout part of every status line
  and the rule under every task.
- `test/tribunal.test.ts`: the blockers and their clearing, the lot among two, the refusals of `callTribunal`, the
  grace that ends in a vote and a drop, the fact `section`, the carried prompt texts, conformance, the sample, and
  the resume at every tick boundary.
- `test/differential.test.ts`: the six scenarios of the old holdout differential test against the old engine's
  record, field for field, the DM cap exemptions of every tick included (asked through `cap-exemption`).
- `test/cap-exemption.test.ts`: through the real `channels` with a cap of one message, the accused writes past its
  full window to the one who lacks its fragment during the grace and is refused to one who has it; another resident is
  refused; and the resume at every tick boundary.
