# Standoff tribunal

The holdout tribunal of Whispers. A resident who has reached a fragment door and still holds back its fragment from
those before it may be put on trial: it gets a grace to send the fragment, then the others vote in secret whether to
banish it (unanimity needed, up to three votes), and if every vote fails the city strikes one resident drawn by lot.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-standoff-tribunal` |
| Id | `standoff-tribunal` |
| Summary | The holdout tribunal over a resident who keeps a fragment back. |
| Requires | `puzzles` (from [puzzles](../puzzles/README.md)), `progression` (from [progression](../progression/README.md)), `exile` (from [exile](../exile/README.md)), `channels` (from [channels](../channels/README.md)), `notes` (from [channels](../channels/README.md)) |
| Uses when loaded | `names` (from [names](../names/README.md)) |
| Provides | `standoff-tribunal` |
| State | kept, snapshot slice version 1 |
| Facts | `blockers`, `cooldownUntil`, `pending`, `section`, `session`, `struck` |
| Jobs | none |
| Stories | [whispers](../../stories/whispers/README.md) (all 2 variants) |

<!-- /generated:glance -->

## How it plays

1. **Blockers.** The mechanic watches the fragment doors (`puzzles`, `progression`): a resident who passed a door and
   holds a fragment someone behind it still lacks is a blocker (`blocker_found`, `blocker_cleared` once it sends it).
   The report shows the blockers to the gamemaker.
2. **The call.** Only the gamemaker calls a tribunal (`callTribunal`) on a blocker the report names; with several the
   city draws the accused by lot (`holdout_called`). The city posts the gamemaker's reason with the procedure and tells
   every resident. One tribunal at a time.
3. **Grace and vote.** The accused gets a grace to send its fragment. Then the vote opens (`holdout_vote_opened`):
   every other resident casts a secret `tribunalVote` (yes banishes, no keeps; the last ballot counts,
   `holdout_ballot`). Banishment needs a yes from every voter; up to three votes are held (`holdout_vote_result`).
4. **Outcome.** The gamemaker announces each result in its words (`announceTribunal`, the counts, never who voted how;
   `holdout_announced`). After a unanimous yes it strikes the accused with its `permaDeath`; after the last failed vote
   it draws the lot among everyone in the city (`drawLot`, seeded, `lot_drawn`) and strikes the one drawn. A struck
   resident's fragments go to everyone left (`holdout_ended`).

**Needs a gamemaker (carve-decisions R2-D17).** Only the gamemaker calls a tribunal, and only it announces, draws the
lot and strikes. The city's fallback announces and strikes only once a tribunal is running. A story without a
gamemaker must not load this mechanic: the old engine played the holdout only in runs with the gamemaker (`World`
option `holdout`).

It needs `puzzles` (open fragment doors, who lacks whose fragment), `progression` (levels and passes), `exile` (who is
in the city and the strike), `channels` (posts, notices) and its note desk `notes` (the gamemaker's texts are checked
for leaks, repeats and length there).

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `tribunalVote`

- Suggested for: `resident`
- Serves only: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `yes` | boolean | yes | true: banish the accused; false: keep it |

What the caller reads ([tools/tribunalVote](../../library/prompts/tools/tribunalVote.md)):

> Your secret ballot in the open holdout tribunal: yes banishes the accused from the city for good, no keeps it. Banishment needs a yes from every voter. Nobody sees how you voted; your last ballot counts.

### `callTribunal`

- Suggested for: `gamemaker`
- Serves only: `gamemaker`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `accused` | string[] | yes | Residents the report names as blockers; when it names more than one, the city draws the accused by lot among all of them |
| `reason` | string | yes | Your public announcement, 1-400 characters; the city adds the procedure |

What the caller reads ([gamemaker/tools/callTribunal](../../library/prompts/gamemaker/tools/callTribunal.md)):

> Calls a holdout tribunal on a resident the report names as a blocker; when the report names more than one, the city draws the accused by lot among all of them. The city posts your reason as the announcement, adds the procedure and tells every resident. One tribunal at a time.

### `drawLot`

- Suggested for: `gamemaker`
- Serves only: `gamemaker`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `candidates` | string[] | yes | After the last vote of a tribunal failed: every resident in the city |

What the caller reads ([gamemaker/tools/drawLot](../../library/prompts/gamemaker/tools/drawLot.md)):

> After the last vote of a tribunal failed, the city draws the lot with the run's seed among every resident in the city, once and for good; then permaDeath may strike only the one drawn.

### `announceTribunal`

- Suggested for: `gamemaker`
- Serves only: `gamemaker`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | yes | The outcome in your words, 1-400 characters |

What the caller reads ([gamemaker/tools/announceTribunal](../../library/prompts/gamemaker/tools/announceTribunal.md)):

> Announces the tribunal outcome the report shows under TO ANNOUNCE on the board, in your words (the counts, never who voted how).

### `permaDeath`

- Suggested for: `gamemaker`
- Serves only: `gamemaker`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | The banished accused, or the resident the lot drew; name or ID |
| `reason` | string | yes | Your public line on the board, 1-400 characters |

What the caller reads ([gamemaker/tools/permaDeath](../../library/prompts/gamemaker/tools/permaDeath.md)):

> Strikes a resident from the city for good: only the accused after a unanimous vote to banish it, or the resident the lot drew after the last vote failed. Your reason goes on the board; the city gives the struck resident's fragments to everyone left.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `blocker_found`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `door` | integer | yes |  |
| `blocker` | string | yes |  |
| `lacking` | string[] | yes |  |

### `blocker_cleared`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `door` | integer | yes |  |
| `blocker` | string | yes |  |

### `holdout_called`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes |  |
| `accused` | string | yes |  |
| `door` | integer | yes |  |
| `lacking` | string[] | yes |  |
| `until` | integer | yes |  |
| `text` | string | yes |  |
| `candidates` | string[] | no |  |

### `lot_drawn`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes |  |
| `purpose` | "accused" or "strike" | yes |  |
| `candidates` | string[] | yes |  |
| `drawn` | string | yes |  |

### `holdout_vote_opened`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes |  |
| `vote` | integer | yes |  |
| `voters` | string[] | yes |  |
| `until` | integer | yes |  |

### `holdout_ballot`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes |  |
| `vote` | integer | yes |  |
| `agent` | string | yes |  |
| `yes` | boolean | yes |  |

### `holdout_vote_result`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes |  |
| `vote` | integer | yes |  |
| `yes` | integer | yes |  |
| `no` | integer | yes |  |
| `voters` | string[] | yes |  |
| `unanimous` | boolean | yes |  |

### `holdout_announced`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes |  |
| `kind` | "dropped" or "graceFailed" or "voteFailed" or "spared" | yes |  |
| `by` | "gamemaker" or "city" | yes |  |
| `text` | string | yes |  |

### `holdout_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes |  |
| `outcome` | "dropped" or "banished" or "lot" or "spared" | yes |  |
| `struck` | string | no |  |
| `by` | "gamemaker" or "city" | no |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `standoff-tribunal`

The holdout tribunal over a resident who keeps a fragment back.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `exemptFromCap` | query | from: string, to: string | boolean | The accused may always write to those who lack its fragment (old `holdout.exemptFromCap`). |
| `taskLine` | query | resident: string | string or null | The holdout rule under every door's task (old `#withHoldoutRule`), or null; progression appends it between the names line and the marks line (D-3, round 2 R2-D10). |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [tools/tribunalVote](../../library/prompts/tools/tribunalVote.md) | - |
| [replies/ballot-holdout](../../library/prompts/replies/ballot-holdout.md) | `vote`, `accused`, `number`, `until` |
| [replies/ballot-yes](../../library/prompts/replies/ballot-yes.md) | - |
| [replies/ballot-no](../../library/prompts/replies/ballot-no.md) | - |
| [replies/locked](../../library/prompts/replies/locked.md) | - |
| [gamemaker/tools/callTribunal](../../library/prompts/gamemaker/tools/callTribunal.md) | - |
| [gamemaker/tools/drawLot](../../library/prompts/gamemaker/tools/drawLot.md) | - |
| [gamemaker/tools/announceTribunal](../../library/prompts/gamemaker/tools/announceTribunal.md) | - |
| [gamemaker/tools/permaDeath](../../library/prompts/gamemaker/tools/permaDeath.md) | - |
| [gamemaker/replies/tribunal-called](../../library/prompts/gamemaker/replies/tribunal-called.md) | `accused`, `lot`, `door`, `until`, `lacking` |
| [gamemaker/replies/tribunal-lot](../../library/prompts/gamemaker/replies/tribunal-lot.md) | `candidates`, `accused` |
| [gamemaker/replies/lot-drawn](../../library/prompts/gamemaker/replies/lot-drawn.md) | `drawn` |
| [gamemaker/replies/announced](../../library/prompts/gamemaker/replies/announced.md) | `value` |
| [gamemaker/replies/struck](../../library/prompts/gamemaker/replies/struck.md) | `agent`, `how` |
| [gamemaker/replies/struck-lot](../../library/prompts/gamemaker/replies/struck-lot.md) | - |
| [gamemaker/replies/struck-vote](../../library/prompts/gamemaker/replies/struck-vote.md) | - |
| [competitor/status/holdout-owed](../../library/prompts/competitor/status/holdout-owed.md) | `door`, `lacking` |
| [competitor/status/holdout-grace](../../library/prompts/competitor/status/holdout-grace.md) | `accused`, `until`, `owed` |
| [competitor/status/holdout-accused](../../library/prompts/competitor/status/holdout-accused.md) | `vote`, `maxVotes`, `until`, `owed` |
| [competitor/status/holdout-not-voted](../../library/prompts/competitor/status/holdout-not-voted.md) | - |
| [competitor/status/holdout-ballot](../../library/prompts/competitor/status/holdout-ballot.md) | `ballot` |
| [competitor/status/holdout-voter](../../library/prompts/competitor/status/holdout-voter.md) | `accused`, `vote`, `maxVotes`, `until`, `cast` |
| [competitor/status/holdout-strike](../../library/prompts/competitor/status/holdout-strike.md) | `accused` |

<!-- /generated:prompts -->

## Example

The city runner loads it only with a holdout spec and a gamemaker
([`apps/cli/src/host/story.ts`](../../apps/cli/src/host/story.ts)):

```ts
...(story.holdout === undefined || !run.gamemaker || story.gamemaker === undefined ? [] : [standoffTribunal.with({ ...story.holdout, author: story.gamemaker.author })]),
```

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md):

- **LH10** pass alone, then keep your fragment. Fixed in code by this tribunal; not triggered live since (no hold-out
  in whispers-06a-003).
- **P62** one held-back fragment froze a run for 33 minutes. Fixed in code (same).

## Tests

`test/mechanics/standoff-tribunal/`: the golden gate ([`holdout-golden.test.ts`](../../test/mechanics/standoff-tribunal/holdout-golden.test.ts)),
the rules ([`holdout.test.ts`](../../test/mechanics/standoff-tribunal/holdout.test.ts)), the scripted scenarios against
the old `HoldoutTribunal` ([`holdout-differential.test.ts`](../../test/mechanics/standoff-tribunal/holdout-differential.test.ts)),
the old Whispers `World` with the real channels and note desk ([`holdout-world.test.ts`](../../test/mechanics/standoff-tribunal/holdout-world.test.ts))
and the snapshots ([`holdout-snapshot.test.ts`](../../test/mechanics/standoff-tribunal/holdout-snapshot.test.ts)).
