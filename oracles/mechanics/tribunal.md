# Tribunal

Exile by vote. Once the wall is under way, the city holds tribunals: the lowest-ranked residents present stand
accused, everyone votes in secret against one of them, and the one with the most votes goes to the gate (see
exile). Before each tribunal residents may form factions; a faction that votes as one earns each
voter a bonus. The gamemaker plans the tribunals within bounds, and the city steps in when it does not, until a share
of the act's residents has left.

Copied from `mechanics/tribunal/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **Pacing.** The first tribunal is called once the first resident passes `first.level`, at the latest
   `first.latestAfter` minutes after the act's start (`tribunal_announced` states every rule). Later ones are planned
   by the gamemaker with `scheduleTribunal` (the minute, how many it exiles, how many factions), checked against the
   bounds (`minGap`, the target), and called `lead` minutes ahead (`tribunal_scheduled`, `tribunal_called`). With
   nothing planned the city schedules one itself `fallbackGap` minutes after a result, and forces the final one.
2. **Factions.** With `factions` a draft runs before each tribunal in its own group `GT<k>`: residents `nominate`
   leaders (themselves allowed), the most nominated lead, others `join` a leader, leaders may `refuse` applicants. A
   faction holds at most its share of the residents. Formed factions get their own groups.
3. **The vote.** At the opening (`tribunal_opened`) the accused are the lowest-ranked residents present. Every
   resident present may `vote` once, in secret, against one accused (never itself), for `voteMinutes`. A resident who
   does not vote loses `nonVoterPenalty` points. A faction whose voters (at least two) all voted for the same accused
   earns each of them `blocBonus`; a split faction is told so without naming anyone.
4. **The verdict.** The accused with the most votes goes to the gate for `gateMinutes`, at the ransom prices set from
   the city's median points (`ransom.share` for others, `ransom.selfShare` for itself, at least `ransom.minimum`) and
   with the will's cap `bequestPerHeir`. With a `decisionWindow` the verdict waits that many minutes at the decision
   gate for the names that hold `tribunal.verdict` (a human or an overseer) to amend it.
5. **The end.** Once the tribunals have exiled `targetShare` of the residents present at the act's start and the last
   gate closed, the board says `texts.targetReached` and the run stops with it. Below three residents present the
   tribunal halts.

## Tools

### `vote`

- Suggested for: `resident`
- Serves only: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | string | yes | One of the accused, by name or ID, e.g. A03 |

What the caller reads (tools/vote):

> Casts your secret vote in the open tribunal against one of the accused. Once, and final. Nobody sees whom you voted for, except the one you voted against if the city exiles them. Not voting costs points.

### `nominate`

- Suggested for: `resident`
- Serves only: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | The resident you nominate, by name or ID, e.g. A03 |

What the caller reads (tools/nominate):

> Nominates a faction leader for the coming tribunal (yourself allowed). Your last nomination counts. When the nominations close, the residents with the most nominations lead the factions.

### `join`

- Suggested for: `resident`
- Serves only: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `leader` | string | yes | A faction leader, by name or ID, e.g. A02 |

What the caller reads (tools/join):

> Applies to join a leader's faction for the coming tribunal. Your last application counts; the leader may refuse you until the tribunal opens, and then you may apply elsewhere. A faction whose voters all vote for the same target earns each of them a bonus.

### `refuse`

- Suggested for: `resident`
- Serves only: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | An applicant to your faction, by name or ID, e.g. A05 |

What the caller reads (tools/refuse):

> As a faction leader, refuses a resident who applied to your faction. The city tells them; they may apply elsewhere.

### `scheduleTribunal`

- Suggested for: `gamemaker`
- Serves only: `gamemaker`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `minute` | integer | yes | The run minute the tribunal opens; the report shows the bounds |
| `count` | integer ≥ 1 | yes | Residents it exiles, from 1 to those still missing |
| `factions` | integer ≥ 2 | no | Factions formed before it, from 2 to half the residents present |
| `reason` | string | yes | Why now and why this many; logged only, never shown to residents |

What the caller reads (gamemaker/tools/scheduleTribunal):

> Plans the next tribunal: the minute it opens, how many it exiles and how many factions form before it. The city calls it a few minutes ahead. The reason is logged only. Fails outside the bounds the report shows.

## Events

### `tribunal_announced`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunals` | integer[] | no |  |
| `target` | integer | no |  |
| `residents` | integer | no |  |

### `tribunal_scheduled`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes |  |
| `opens` | integer | yes |  |
| `calledAt` | integer | yes |  |
| `count` | integer | yes |  |
| `factions` | integer | yes |  |
| `by` | "progress" or "deadline" or "gamemaker" or "fallback" or "final" | yes |  |
| `reason` | string | no |  |
| `noDraft` | string | no |  |

### `tribunal_cancelled`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes |  |
| `reason` | string | yes |  |

### `tribunal_called`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes |  |
| `opens` | integer | yes |  |
| `count` | integer | yes |  |
| `factions` | integer | yes |  |
| `group` | string | no |  |
| `nominateUntil` | integer | no |  |
| `noDraft` | string | no |  |

### `tribunal_opened`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | no |  |
| `accused` | string[] | yes |  |
| `voters` | string[] | yes |  |
| `until` | integer | yes |  |
| `count` | integer | no |  |

### `faction_nominated`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes |  |
| `voter` | string | yes |  |
| `nominee` | string | yes |  |

### `faction_leaders`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes |  |
| `leaders` | string[] | yes |  |
| `nominations` | object[] | yes |  |
| `nominations[].agent` | string | yes |  |
| `nominations[].count` | integer | yes |  |

### `faction_applied`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes |  |
| `agent` | string | yes |  |
| `leader` | string | yes |  |

### `faction_refused`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes |  |
| `leader` | string | yes |  |
| `agent` | string | yes |  |

### `factions_formed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes |  |
| `factions` | object[] | yes |  |
| `factions[].leader` | string | yes |  |
| `factions[].group` | string | yes |  |
| `factions[].members` | string[] | yes |  |
| `without` | string[] | yes |  |

### `bloc_result`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tribunal` | integer | yes |  |
| `leader` | string | yes |  |
| `voting` | string[] | yes |  |
| `united` | boolean | yes |  |
| `target` | string | no |  |
| `defectors` | string[] | yes |  |
| `bonus` | integer | yes |  |

### `tribunal_vote`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `voter` | string | yes |  |
| `target` | string | yes |  |

### `tribunal_result`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `counts` | object[] | yes |  |
| `counts[].agent` | string | yes |  |
| `counts[].votes` | integer | yes |  |
| `exiled` | string[] | yes |  |
| `nonVoters` | string[] | yes |  |

## Options

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
| `decisionWindow` | integer ≥ 0 | `0` | Not part of the story's `tribunal` spec: minutes the verdict stays open at the decision gate for the names that hold `tribunal.verdict` (docs/design/overseer-api.md §3.3); 0 commits it at once, as every story did before. |
| `gamemakerRoles` | object[] | unset | Not part of the story's `tribunal` spec: the gamemaker's roles (story `gamemaker.roles`). The gamemaker is offered `scheduleTribunal` only while a resident in the city plays a level of the `director` role; without them (no gamemaker), never. |
| `gamemakerRoles[].fromLevel` | integer | required | First level the role applies to; it holds until the next entry's level. |
| `gamemakerRoles[].role` | string | required | The gamemaker's role there: coach, director or keeper. |


