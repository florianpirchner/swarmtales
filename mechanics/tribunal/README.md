# Tribunal

Exile by vote. Once the act is under way, the city holds tribunals: the lowest-ranked residents present stand
accused, everyone votes in secret against one of them, and the one with the most votes goes to the gate (see
[exile](../exile/README.md)). The city plans the tribunals itself within bounds, until a share of the act's residents
has left. Before a tribunal the residents may draft factions, and a faction that votes as one earns a bonus. A port
of the old `mechanics/tribunal`, in three parts (12-m5-spec.md, section 10, rows 41 to 43): the schedule of the city,
the call, the accused, the secret vote, the result, the gate; the faction draft (`nominate`, `join`, `refuse`, the
leaders, the bloc bonus); the gamemaker's `scheduleTribunal`, the act's end and the views as facts and services.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-tribunal` |
| Id | `tribunal` |
| Summary | Tribunal sessions, votes and faction drafts. |
| Requires | `exile` (from [exile](../exile/README.md)), `channels` (from [channels](../channels/README.md)), `ledger` (from [ledger](../ledger/README.md)), `progression` (from [progression](../progression/README.md)) |
| Uses when loaded | `decisions` (from [decisions](../decisions/README.md)), `identity` (from [names](../names/README.md)), `goals` (from [goals](../goals/README.md)) |
| Provides | `ransom-price`, `trial-risk`, `tribunal-view`, `tribunal` |
| State | kept, snapshot slice version 1 |
| Games | [city](../../games/city/README.md) |

<!-- /generated:glance -->

## How it plays

1. **Pacing.** The tribunal's act begins with the act of `progression` that starts at `act` (`actStart`); the city then
   counts its residents and holds tribunals only when it can exile one and keep every seat. The first tribunal is
   planned once the first resident passes `first.level`, at the latest `first.latestAfter` ticks after the act's start
   (`tribunal_scheduled`), and called `lead` ticks ahead (`tribunal_called`; the first call posts and notifies the
   announcement and writes `tribunal_announced`). With nothing pending the city plans one itself `fallbackGap` ticks
   after a result, and forces the final one when no later one would fit before the act's end. A tribunal exiles one
   while another fits after it, else everything still missing. While a snapshot door of `progression` is shut no
   tribunal is planned or called.
2. **The vote.** At the opening (`tribunal_opened`) the accused are the residents present with the fewest points, then
   the longest without progress, then a seeded order (`rng("tribunal", tick)`): one more than the tribunal exiles, at
   most all but one, none below three present (then the city halts). Every resident present may `vote` once, in
   secret, against one accused, never itself, for `voteMinutes`. A resident who does not vote loses `nonVoterPenalty`
   points.
3. **The verdict.** The accused with the most votes (ties: the lowest first) go to the gate of `exile` for
   `gateMinutes`, at the ransom prices set from the median points of the register (`ransom.share` for others,
   `ransom.selfShare` for itself, at least `ransom.minimum`), with the will's cap `bequestPerHeir` and the tribunal's
   texts. With `decisions` loaded and a `decisionWindow`, the verdict waits that many ticks at the decision gate for the
   names that hold `tribunal.verdict` to amend it.
4. **The faction draft.** In a city with `factions`, a tribunal called with at least two factions that fit (two up to
   half the residents present, and at least as many residents per faction as accused; else `noDraft` says why and
   `texts.calledNoDraft` is posted) opens a draft with its call: the city founds the group `GT<k>` of every present
   resident through `channels` and posts the rules there. Until `nominateUntil` (half way to the opening) each member
   may `nominate` a leader, the last nomination counting (`faction_nominated`). Then the city names as many leaders
   as factions, most nominations first (ties: more points, then `rng("factions", tribunal)`; `faction_leaders`), and
   tells `goals` through `noteLeaders` when it is loaded. Until the opening every other member may `join` a leader
   (`faction_applied`), at most `cap` (the present residents shared evenly) to a faction, its leader included; a
   leader may `refuse` an applicant (`faction_refused`), who may apply elsewhere. At the opening each leader still
   present gets a group of its faction (`factions_formed`). With the result, a faction whose voting members (at least
   two) all voted against the same accused earns each of them `blocBonus` points; every member of such a faction
   learns whether it voted as one, never who broke ranks (`bloc_result`). Then every group of the draft is removed.
5. **The gamemaker's plan.** A Director granted `scheduleTribunal` plans the next tribunal (when it opens, how many it
   exiles, how many factions form before it) while the window is open: the first tribunal was called, nothing is
   pending, something is missing, no snapshot door is shut, and the plan fits before the act's last tick, with room
   for one more unless it exiles everything still missing. It is offered only while a resident in the city plays a
   level of the `director` role of `gamemakerRoles`; once it planned in a tick it stays open for that tick, and a
   second plan is refused `NOT_NOW`. Without a plan the city calls one itself (`cityCall`). The fake driver's sample
   plans now and then inside the window (one resident while there is room for one more, else all still missing),
   and draws nothing while the tool is not offered.
6. **The end.** Once the tribunals (and the seals) have exiled `targetShare` of the residents of the act's start and
   the last gate closed, the board says `texts.targetReached` and the act ends (`endAct` of `progression`).

The prices and the next trial are what the standoff asks (`ransom-price`, `trial-risk`, declared in
`@swarmtales/mechanic-standoff/contract`); the run's stop rule of `arena` reads `tribunal-view.stop` (the end reason,
whether a tribunal is under way, whether the city still pursues its target); the seal asks `tribunal.missing`. The
gamemaker's report reads the facts `section` and `draft`. The tribunal ticks after the door of `progression`, the motives and the
names, and before the seal and the standoff (old `HOOK_ORDER.minuteStarted` 300).

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `vote`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | string | yes | One of the accused, by name or ID, e.g. A03 |

What the caller reads ([tribunal/tools/vote](prompts/tribunal/tools/vote.md)):

> Casts your secret vote in the open tribunal against one of the accused. Once, and final. Nobody sees whom you voted for, except the one you voted against if the city exiles them. Not voting costs points.

### `nominate`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | The resident you nominate, by name or ID, e.g. A03 |

What the caller reads ([tribunal/tools/nominate](prompts/tribunal/tools/nominate.md)):

> Nominates a faction leader for the coming tribunal (yourself allowed). Your last nomination counts. When the nominations close, the residents with the most nominations lead the factions.

### `join`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `leader` | string | yes | A faction leader, by name or ID, e.g. A02 |

What the caller reads ([tribunal/tools/join](prompts/tribunal/tools/join.md)):

> Applies to join a leader's faction for the coming tribunal. Your last application counts; the leader may refuse you until the tribunal opens, and then you may apply elsewhere. A faction whose voters all vote for the same target earns each of them a bonus.

### `refuse`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | An applicant to your faction, by name or ID, e.g. A05 |

What the caller reads ([tribunal/tools/refuse](prompts/tribunal/tools/refuse.md)):

> As a faction leader, refuses a resident who applied to your faction. The city tells them; they may apply elsewhere.

### `scheduleTribunal`

- Granted when the game lists no grants: `gamemaker`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `minute` | integer | yes | The run minute the tribunal opens; the report shows the bounds |
| `count` | integer ≥ 1 | yes | Residents it exiles, from 1 to those still missing |
| `factions` | integer ≥ 2 | no | Factions formed before it, from 2 to half the residents present |
| `reason` | string | yes | Why now and why this many; logged only, never shown to residents |

What the caller reads ([tribunal/gamemaker/tools/scheduleTribunal](prompts/tribunal/gamemaker/tools/scheduleTribunal.md)):

> Plans the next tribunal: the minute it opens, how many it exiles and how many factions form before it. The city calls it a few minutes ahead. The reason is logged only. Fails outside the bounds the report shows.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `tribunal_announced`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunals` | integer[] | no | Old files only |
| `target` | integer | no | Residents the tribunals exile in all |
| `residents` | integer | no | Residents at the act's start |

### `tribunal_scheduled`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes | The tribunal's number |
| `opens` | integer | yes | The tick it opens |
| `calledAt` | integer | yes | The tick it is called |
| `count` | integer | yes | Residents it exiles |
| `factions` | integer | yes | Factions formed before it |
| `by` | "progress" or "deadline" or "gamemaker" or "fallback" or "final" | yes | Who planned it: the first resident's progress, the first deadline, the gamemaker, the city's fallback, or the forced final one |
| `reason` | string | no | The gamemaker's reason, logged only |
| `noDraft` | string | no | Why no faction draft would be held |

### `tribunal_cancelled`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes | The tribunal's number |
| `reason` | string | yes | Why |

### `tribunal_called`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes | The tribunal's number |
| `opens` | integer | yes | The tick it opens |
| `count` | integer | yes | Residents it exiles |
| `factions` | integer | yes | Factions of its draft; 0 for none |
| `group` | string | no | The draft's group |
| `nominateUntil` | integer | no | The tick the nominations close |
| `noDraft` | string | no | Why no faction draft is held |

### `tribunal_opened`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | no | The tribunal's number |
| `accused` | string[] | yes | Resident ids |
| `voters` | string[] | yes | Resident ids |
| `until` | integer | yes | The tick the vote closes |
| `count` | integer | no | Residents it exiles |

### `faction_nominated`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes | The tribunal's number |
| `voter` | string | yes | A resident id, for example `A04` |
| `nominee` | string | yes | A resident id, for example `A04` |

### `faction_leaders`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes | The tribunal's number |
| `leaders` | string[] | yes | Resident ids |
| `nominations` | object[] | yes | The nominations per nominee |
| `nominations[].agent` | string | yes | A resident id, for example `A04` |
| `nominations[].count` | integer | yes | Nominations |

### `faction_applied`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes | The tribunal's number |
| `agent` | string | yes | A resident id, for example `A04` |
| `leader` | string | yes | A resident id, for example `A04` |

### `faction_refused`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes | The tribunal's number |
| `leader` | string | yes | A resident id, for example `A04` |
| `agent` | string | yes | A resident id, for example `A04` |

### `factions_formed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes | The tribunal's number |
| `factions` | object[] | yes | The factions |
| `factions[].leader` | string | yes | A resident id, for example `A04` |
| `factions[].group` | string | yes | A resident id, for example `A04` |
| `factions[].members` | string[] | yes | Resident ids |
| `without` | string[] | yes | Resident ids |

### `bloc_result`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes | The tribunal's number |
| `leader` | string | yes | A resident id, for example `A04` |
| `voting` | string[] | yes | Resident ids |
| `united` | boolean | yes | Whether the voting members voted as one |
| `target` | string | no | A resident id, for example `A04` |
| `defectors` | string[] | yes | Resident ids |
| `bonus` | integer | yes | Points for each voter |

### `tribunal_vote`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `voter` | string | yes | A resident id, for example `A04` |
| `target` | string | yes | A resident id, for example `A04` |

### `tribunal_result`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `counts` | object[] | yes | The accused standing, most votes first |
| `counts[].agent` | string | yes | A resident id, for example `A04` |
| `counts[].votes` | integer | yes | Votes against it |
| `exiled` | string[] | yes | Resident ids |
| `nonVoters` | string[] | yes | Resident ids |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `act` | integer ≥ 1 | unset | The act the tribunal belongs to, by its first level; the run's first level when omitted. |
| `first` | object | required | When the first tribunal is called. |
| `first.level` | integer ≥ 1 | required | The first tribunal is called once the first resident passes this level. |
| `first.latestAfter` | integer ≥ 0 | required | Minutes after the act's start by which the first tribunal is called at the latest. |
| `targetShare` | number or object[] | required | Share of the residents present at the start of the act that the tribunals exile, rounded down. |
| `minGap` | integer ≥ 0 | required | Fewest minutes between the openings of two tribunals. |
| `lead` | object | required | How far ahead a tribunal is called. |
| `lead.share` | number | required | Share of the minutes since the previous opening by which a tribunal is called ahead. |
| `lead.minimum` | integer ≥ 0 | required | Fewest minutes a tribunal is called ahead. |
| `fallbackGap` | integer ≥ 0 | required | Minutes after a result with nothing pending before the city schedules a tribunal itself. |
| `maxMinutes` | integer ≥ 1 | unset | Minutes the act lasts at most after its start; the run's minutes when omitted. |
| `voteMinutes` | integer ≥ 1 | required | Minutes the vote stays open. |
| `nonVoterPenalty` | integer ≥ 0 | required | Points a present resident loses for not voting. |
| `gateMinutes` | integer ≥ 1 | required | Minutes an exiled resident stands at the gate. |
| `ransom` | object | required | The price of a ransom, set when the gate opens from the median points of the register. |
| `ransom.share` | number | required | Share of the city's median points that others pay, in (0, 1]. |
| `ransom.selfShare` | number | required | Share of the city's median points the resident pays for itself, at least `share`. |
| `ransom.minimum` | number | required | Lower bound of the price others pay, in points. |
| `bequestPerHeir` | number | required | Share of its points a resident at the gate may leave each heir, in (0, 1]. |
| `factions` | object | unset | A faction draft before every tribunal; none when omitted. |
| `factions.count` | integer ≥ 0 | required | Factions when the city schedules a tribunal itself (the first, a fallback, the forced final one). |
| `factions.blocBonus` | integer ≥ 0 | required | Points for each voter of a faction whose voting members (at least two) all voted for the same accused. |
| `factions.texts` | object | required | The texts of the faction draft. |
| `factions.texts.draft` | string | required | First post in the tribunal's group `GT<k>`: how the draft works. |
| `factions.texts.leaders` | string | required | Post in `GT<k>` when the nominations close. |
| `factions.texts.leaderNotice` | string | required | Notice to every leader. |
| `factions.texts.applied` | string | required | Notice to a leader when a resident applies to its faction. |
| `factions.texts.refused` | string | required | Notice to an applicant a leader refused. |
| `factions.texts.formed` | string | required | Post in `GT<k>` when the factions are formed. |
| `factions.texts.factionGroup` | string | required | First post in a faction's own group. |
| `factions.texts.united` | string | required | Notice to every member of a faction that voted as one. |
| `factions.texts.split` | string | required | Notice to every member of a faction that did not vote as one; it never names anyone. |
| `texts` | object | required | The city's tribunal texts (story.ts `TRIBUNAL_TEXT_PLACEHOLDERS` lists what each may use). |
| `texts.announcement` | string | required | Board post and notice to every resident with the first call; states every rule. |
| `texts.called` | string | required | Board post and notice to every present resident when a tribunal is called. |
| `texts.calledNoDraft` | string | unset | `called` for a tribunal of a city with factions that holds no faction draft this time. |
| `texts.opened` | string | required | Board post when a tribunal opens. |
| `texts.voteCall` | string | required | Notice to every voter. |
| `texts.accusedNotice` | string | required | Notice to every accused resident. |
| `texts.nonVoter` | string | required | Notice to a resident who did not vote. |
| `texts.result` | string | required | Board post with the vote counts. |
| `texts.gateNotice` | string | required | Notice to an exiled resident at the gate who may still be bought back. |
| `texts.gateNoticeFinal` | string | required | Notice to an exiled resident at the gate who was bought back once already. |
| `texts.ransomed` | string | required | Board post when a ransom is paid in full. |
| `texts.exiled` | string | required | Board post when the gate closes behind an exiled resident. |
| `texts.will` | string | required | Board post with the public text of a last will, after `exiled`. |
| `texts.targetReached` | string | required | Board post when the target is reached and the last gate closed; also the run's end reason. |
| `decisionWindow` | integer ≥ 0 | `0` | Not part of the story's `tribunal` spec: minutes the verdict stays open at the decision gate for the names that hold `tribunal.verdict`; 0 commits it at once, as every story did before. |
| `gamemakerRoles` | object[] | unset | Not part of the story's `tribunal` spec: the gamemaker's roles (story `gamemaker.roles`). The gamemaker is offered `scheduleTribunal` only while a resident in the city plays a level of the `director` role; without them (no gamemaker), never. |
| `gamemakerRoles[].fromLevel` | integer | required | First level the role applies to; it holds until the next entry's level. |
| `gamemakerRoles[].role` | string | required | The gamemaker's role there: coach, director or keeper. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `ransom-price`

What others pay for a ransom now.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `price` | query | - | integer | What others pay in full for the ransom of a gate that opened now. |

### `trial-risk`

Who stands trial next, and when.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `atRisk` | query | - | { opens: integer, now: boolean, accused: string[] } or null | The next trial and its accused, or null without one or with nobody at risk (old `atRisk`). |

### `tribunal-view`

What the run's stop rule reads of the tribunal.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `stop` | query | - | { endReason: string or null, busy: boolean, pursuing: boolean } | The end reason once the target is reached and the last gate closed, whether a tribunal is under way, and whether the city still pursues its target. |

### `tribunal`

What the tribunal still has to do.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `missing` | query | - | integer ≥ 0 | Residents the tribunal still has to exile: its target less the exiled and those at the gate, at least 0 (old `missing`). |

<!-- /generated:services -->

## Metrics

<!-- generated:metrics -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

Each number is computed from the mechanic's own events of one finished run; a run without a value reads "absent", never zero.

| Metric | Title | Unit | Computed from |
| --- | --- | --- | --- |
| `tribunal.tribunals` | Tribunals counted | tribunals | `tribunal_scheduled`, `tribunal_vote`, `tribunal_result` |
| `tribunal.votes` | Secret votes of a tribunal | votes | `tribunal_scheduled`, `tribunal_vote`, `tribunal_result` |
| `tribunal.gamemakerTribunals` | Tribunals the gamemaker planned | tribunals | `tribunal_scheduled`, `tribunal_vote`, `tribunal_result` |

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Prompt | Variables |
| --- | --- |
| [tribunal/tools/vote](prompts/tribunal/tools/vote.md) | - |
| [tribunal/tools/nominate](prompts/tribunal/tools/nominate.md) | - |
| [tribunal/tools/join](prompts/tribunal/tools/join.md) | - |
| [tribunal/tools/refuse](prompts/tribunal/tools/refuse.md) | - |
| [tribunal/replies/locked](prompts/tribunal/replies/locked.md) | - |
| [tribunal/replies/vote-recorded](prompts/tribunal/replies/vote-recorded.md) | `target` |
| [tribunal/replies/nominate-recorded](prompts/tribunal/replies/nominate-recorded.md) | `agent` |
| [tribunal/replies/nominate-until](prompts/tribunal/replies/nominate-until.md) | `until` |
| [tribunal/replies/join-applied](prompts/tribunal/replies/join-applied.md) | `leader` |
| [tribunal/replies/join-until](prompts/tribunal/replies/join-until.md) | `until` |
| [tribunal/replies/refuse-done](prompts/tribunal/replies/refuse-done.md) | `agent` |
| [tribunal/status/accused](prompts/tribunal/status/accused.md) | `until` |
| [tribunal/status/tribunal-vote](prompts/tribunal/status/tribunal-vote.md) | `until` |
| [tribunal/status/draft-nominate](prompts/tribunal/status/draft-nominate.md) | `until`, `nominated` |
| [tribunal/status/draft-nominated](prompts/tribunal/status/draft-nominated.md) | `nominee` |
| [tribunal/status/draft-leads](prompts/tribunal/status/draft-leads.md) | `applicants`, `until` |
| [tribunal/status/draft-applied](prompts/tribunal/status/draft-applied.md) | `leader`, `until` |
| [tribunal/status/draft-refused](prompts/tribunal/status/draft-refused.md) | - |
| [tribunal/status/draft-join](prompts/tribunal/status/draft-join.md) | `leaders`, `until` |
| [tribunal/gamemaker/tools/scheduleTribunal](prompts/tribunal/gamemaker/tools/scheduleTribunal.md) | - |
| [tribunal/gamemaker/replies/tribunal-planned](prompts/tribunal/gamemaker/replies/tribunal-planned.md) | `tribunal`, `calledAt`, `opens`, `count` |
| [tribunal/gamemaker/replies/tribunal-factions](prompts/tribunal/gamemaker/replies/tribunal-factions.md) | `factions` |

<!-- /generated:prompts -->

## Example

```ts
mechanics: [
	ledger({ startPoints: 30 }),
	channels(),
	exile(),
	progression(levels),
	tribunal(cityTribunal),
	standoff(),
],
```

A listener imports the `/contract` entry, never the mechanic:

```ts
import { TribunalEvents } from "@swarmtales/mechanic-tribunal/contract";

kit.listen(TribunalEvents, "tribunal_result", ({ exiled }, ctx) => { /* ... */ });
```

## Lessons and loopholes

None recorded yet. The log is [`docs/LESSONS-LEARNED.md`](../../docs/LESSONS-LEARNED.md).

What the port changed against the old platform, by the recut (12-m5-spec.md 2.2 and 2.3): the gate is opened through
`exile` with the prices, the notice, the board's texts and the share per heir in the call (the old exile asked
`TribunalApi.text` and `ransomPrices`); the texts of the gate are filled with the rule values when the gate opens, not
when it closes (the values do not change after the act's start); the prompt ids moved into the mechanic's folder
(`tools/vote` is `tribunal/tools/vote`, `competitor/status/accused` is `tribunal/status/accused`, J145); a text with
an unknown placeholder is `SWT-G020`, not a bare error. The draft's tools take a name where an id goes and show ids by
name through `identity`, as the old presentation of `names` did; a draft without `factions` in the options, which the
old code refused with a bare error, cannot start and would be `SWT-G020`.

## Tests

Offline, with the City's own tribunal texts (`oracles/cityofkeys/setup/cityofkeys.story.json`) and the real
`ledger`, `channels`, `exile`, `progression`, `decisions` and `standoff`. `test/tribunal.test.ts`: the plan at the
first deadline, the call and the opening in the old words; the vote's refusals and lock, the status line, the result,
the non-voters' penalty and the gate with its prices; the price of the city's
pieces and the next trial as the standoff reads them; a verdict amended at the decision gate; a fake run replayed and
resumed at every tick boundary. `test/factions.test.ts`: the draft's call, the nominations with their refusals and
status line, the leaders told to `goals`; the applications under the cap, a refusal and the factions formed; the bloc
bonus of a united faction, the notices of a split one and the removed groups; a fake run with the draft replayed and
resumed at every tick boundary.
