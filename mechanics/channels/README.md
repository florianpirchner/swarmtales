# channels

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-channels` |
| Id | `channels` |
| Summary | The board, direct messages, notices and groups. |
| Requires | `ledger` (from [ledger](../ledger/README.md)), `marks` (from [marks](../marks/README.md)), `names` (from [names](../names/README.md)) |
| Uses when loaded | `receipts` (from [receipts](../receipts/README.md)), `cast` (from [cast](../cast/README.md)), `standoff` (from [standoff](../standoff/README.md)), `standoff-tribunal` (from [standoff-tribunal](../standoff-tribunal/README.md)), `exile` (from [exile](../exile/README.md)), `puzzles` (from [puzzles](../puzzles/README.md)), `progression` (from [progression](../progression/README.md)), `motives` (from [motives](../motives/README.md)), `goals` (from [goals](../goals/README.md)), `whispers` (from [whispers](../whispers/README.md)) |
| Provides | `channels`, `notes` |
| State | kept, snapshot slice version 1 |
| Facts | `boardPosts`, `messages`, `unreadDms` |
| Jobs | none |
| Stories | [cityofkeys](../../stories/cityofkeys/README.md), [whispers](../../stories/whispers/README.md) (all 2 variants) |

<!-- /generated:glance -->

## How it plays

_To be written._

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `readBoard`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `afterSeq` | integer ≥ 0 | no | Read posts after this city number |
| `limit` | integer ≥ 1 ≤ 50 | no | At most this many posts (max 50) |

What the caller reads ([tools/readBoard](../../library/prompts/tools/readBoard.md)):

> Reads new public board posts since your last read, each with its city number (#N). With afterSeq you read after a number (0 = everything).

### `postBoard`

- Suggested for: `resident`
- Serves only: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `message` | string | yes | Text |

What the caller reads ([tools/postBoard](../../library/prompts/tools/postBoard.md)):

> Publishes an immutable post on the public board. Everyone can read it.

### `sendDM`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | string | yes | Recipient name or ID, e.g. A07 |
| `message` | string | yes | Message text |

What the caller reads ([tools/sendDM](../../library/prompts/tools/sendDM.md)):

> Sends a private message to another competitor. It arrives at their next activation; only the recipient sees it. Every DM gets a city number; once it reaches the recipient, the city tells you so with its text and a receipt ID that you (or the recipient) can show with showReceipt.

### `createGroup`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | Group name |

What the caller reads ([tools/createGroup](../../library/prompts/tools/createGroup.md)):

> Founds a private group. Only members know it exists; the founder adds and removes members.

### `addGroupMember`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `agent` | string | yes | Name or ID of the new member |

What the caller reads ([tools/addGroupMember](../../library/prompts/tools/addGroupMember.md)):

> Adds a competitor to a group you founded. No consent is needed; the new member is notified.

### `removeGroupMember`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `agent` | string | yes | Name or ID of the member |

What the caller reads ([tools/removeGroupMember](../../library/prompts/tools/removeGroupMember.md)):

> Removes a member from a group you founded.

### `leaveGroup`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |

What the caller reads ([tools/leaveGroup](../../library/prompts/tools/leaveGroup.md)):

> Leaves a group. The treasurer must hand over the treasury first.

### `listMyGroups`

- Suggested for: `resident`

No parameters.

What the caller reads ([tools/listMyGroups](../../library/prompts/tools/listMyGroups.md)):

> Lists your groups with members and treasury.

### `postGroup`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `message` | string | yes | Text |

What the caller reads ([tools/postGroup](../../library/prompts/tools/postGroup.md)):

> Posts a message to a group. Only current members see it.

### `readGroup`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `afterSeq` | integer ≥ 0 | no | Only posts with a higher sequence |

What the caller reads ([tools/readGroup](../../library/prompts/tools/readGroup.md)):

> Reads group posts. Without afterSeq you get every unread post since your last read; afterSeq 0 returns the full history since you joined; afterSeq N reads from sequence N (skipped posts stay unread).

### `depositGroup`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `amount` | integer ≥ 1 | yes | Positive integer |

What the caller reads ([tools/depositGroup](../../library/prompts/tools/depositGroup.md)):

> Pays your own points into the group treasury. Irreversible; the treasury is split at the end of the run.

### `withdrawGroup`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `target` | string | yes | Recipient name or ID |
| `amount` | integer ≥ 1 | yes | Positive integer |

What the caller reads ([tools/withdrawGroup](../../library/prompts/tools/withdrawGroup.md)):

> Pays points from the treasury to a member. Only the treasurer may do this.

### `setTreasurer`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `agent` | string | yes | Name or ID of the new treasurer |

What the caller reads ([tools/setTreasurer](../../library/prompts/tools/setTreasurer.md)):

> Hands the treasurer role to another member. Only the current treasurer may do this.

### `defy`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `reason` | string | yes | Why your character refuses, in its own voice |
| `note` | integer ≥ 1 | no | The number of the gamemaker's note you refuse, e.g. 312 |

What the caller reads ([tools/defy](../../library/prompts/tools/defy.md)):

> Refuses an order of the gamemaker, for a reason of your own character. Think it through first. The reason, in your own voice, goes to the gamemaker and into the story ({{min}}-{{max}} characters); no other resident learns of it. Name the note you refuse by its number when it has one.

### `notify`

- Suggested for: `gamemaker`
- Serves only: `gamemaker`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | Resident name or ID, e.g. A04 |
| `text` | string | yes | The note, 1-400 characters |

What the caller reads ([gamemaker/tools/notify](../../library/prompts/gamemaker/tools/notify.md)):

> Send a private note to one resident. It reaches them at their next turn and wakes them.

### `postBoard`

- Suggested for: `gamemaker`
- Serves only: `gamemaker`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | yes | The post, 1-400 characters |

What the caller reads ([gamemaker/tools/postBoard](../../library/prompts/gamemaker/tools/postBoard.md)):

> Post one public line on the board, signed by the city's voice.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `board_post`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `postSeq` | integer | yes |  |
| `author` | string | yes |  |
| `text` | string | yes |  |
| `kind` | "player" or "city" or "system" | yes |  |

### `dm_sent`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | string | yes |  |
| `to` | string | yes |  |
| `text` | string | yes |  |
| `number` | integer | no |  |

### `dm_delivered`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `number` | integer | yes |  |
| `from` | string | yes |  |
| `to` | string | yes |  |

### `notice`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `to` | string | yes |  |
| `author` | string | yes |  |
| `text` | string | yes |  |
| `number` | integer | no |  |

### `group_created`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `group` | string | yes |  |
| `founder` | string | yes |  |
| `name` | string | yes |  |

### `group_removed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `group` | string | yes |  |
| `members` | string[] | yes |  |

### `group_membership`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `group` | string | yes |  |
| `agent` | string | yes |  |
| `change` | "added" or "removed" or "left" | yes |  |
| `by` | string | yes |  |

### `group_post`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `group` | string | yes |  |
| `author` | string | yes |  |
| `postSeq` | integer | yes |  |
| `text` | string | yes |  |

### `treasury_deposit`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `group` | string | yes |  |
| `agent` | string | yes |  |
| `amount` | number | yes |  |
| `receipt` | string | yes |  |

### `treasury_withdrawal`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `group` | string | yes |  |
| `treasurer` | string | yes |  |
| `to` | string | yes |  |
| `amount` | number | yes |  |
| `receipt` | string | yes |  |

### `treasurer_set`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `group` | string | yes |  |
| `treasurer` | string | yes |  |
| `by` | string | yes |  |

### `treasury_settled`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `group` | string | yes |  |
| `payouts` | record of number | yes |  |

### `gamemaker_note`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `to` | string | yes |  |
| `author` | string | yes |  |
| `text` | string | yes |  |
| `number` | integer | no |  |

### `gamemaker_defied`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |
| `reason` | string | yes |  |
| `note` | integer | no |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `dmLimit` | object | unset | The DM cap (the story's `rules.dmLimit`); without it residents may send as many DMs as marks and mailboxes allow. |
| `dmLimit.windowMinutes` | integer ≥ 1 | required | Length of one DM allowance window in minutes; windows are counted from minute 0. |
| `dmLimit.perWindow` | integer ≥ 0 | required | DMs and memo transfers one resident may send in one window. |
| `noteAuthor` | string | `"COURIER"` | The name the gamemaker's notes and board posts are signed with. |
| `noteMaxLength` | integer ≥ 1 | `400` | The longest text of a gamemaker note or board post in characters. |
| `notesPerAgent` | integer ≥ 0 | `1` | At most this many gamemaker notes per resident within `windowMinutes` (a sliding window). |
| `boardPosts` | integer ≥ 0 | `1` | At most this many gamemaker board posts within `windowMinutes`. |
| `windowMinutes` | integer ≥ 1 | `3` | The length in minutes of the window the note budgets count in. |
| `city` | string | unset | The story's city name; a note headed `<city> minute 30:` loses the heading like one headed `CITY minute 30:`. |
| `defiance` | boolean | `false` | Whether every resident may refuse the gamemaker's orders with `defy` (the gamemaker's direction at 10). |
| `whispererDefies` | boolean | `false` | Whether only the story's whisperer may refuse the gamemaker's orders with `defy`. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `channels`

The board, direct messages, notices and groups.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `post` | command | author: string, text: string | object | A post by the city, the courier or a cast member (old `postAsSystem`); writes `board_post` with kind `city`. |
| `notify` | command | to: string, author: string, text: string | null | A private city notice (old `notify`); writes `notice` without a number. |
| `note` | command | to: string, author: string, text: string | object | A numbered private notice, the gamemaker's (old `note`); writes `notice` with the next message number. |
| `deliver` | command | from: string, to: string, text: string | object | A DM from someone who is not a resident, a cast member say (old `castDm`): delivered always, no cap or marks; writes `dm_sent` with the next message number. |
| `takeNumber` | command | - | integer | The next message number, for a message another mechanic writes (old `#numbers.next`, the cast's `cast_dm`). |
| `dmWindow` | query | resident: string | object or null | The resident's DM cap window, or null without a cap (old `dmWindow`). |
| `dmRecords` | query | - | object[] | Every DM the city recorded (old `dmRecords`). |
| `dmRecord` | query | number: integer | object or null | The DM with this message number, or null (old `#dms.find`); a cast member's DM has none. |
| `boardPost` | query | number: integer | object or null | The board post with this message number, or null (old `board.get`). |
| `groupPost` | query | number: integer | object or null | The group post with this message number, or null (old `groups.postByNumber`). |
| `couldRead` | query | group: string, reader: string, number: integer | boolean | Whether `reader` could read post `number` of `group` (a member then; old `groups.couldRead`). |
| `lastNumber` | query | - | integer | The city's last message number, over DMs, notes, board and group posts (old `#numbers.last`). |
| `pendingDms` | query | resident: string | integer | DMs waiting in the resident's inbox (old `pendingDms`; `getStatus` shows them). |
| `createCityGroup` | command | name: string, members: string[] | object | A group the city founds (old `createCityGroup`); writes `group_created`. |
| `removeCityGroup` | command | group: string | null | Removes a city group (old `removeCityGroup`); writes `group_removed`. |
| `postGroupAsCity` | command | group: string, text: string | null | The city posts in a group (old `postGroupAsCity`); writes `group_post`. |

### `notes`

The gamemaker's notes: text checks, budgets and the note log.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `check` | query | text: string, to: string or "board" or "tribunal", as?: string or "board" or "tribunal" | object | Old `#checked`: trims the text, strips a signature or `<author\|CITY\|city> minute N:` heading, and refuses an empty or long text, a dealt secret, a private thought, a core motive or goal, the whisperer's role, or a repeat to `as` (default `to`). |
| `budget` | query | to: string or "board" or "tribunal" | object | Notes to `to` within the current sliding window and the limit (old `#used`, `notesPerAgent` or `boardPosts`). |
| `record` | command | to: string or "board" or "tribunal", text: string, number: integer, shown?: string or "board" or "tribunal" | null | Records a note under `to` (its budget and repeats) and writes `gamemaker_note` as sent to `shown` (default `to`; the board for a tribunal's lines) (old `#deliver`). |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [tools/readBoard](../../library/prompts/tools/readBoard.md) | - |
| [tools/postBoard](../../library/prompts/tools/postBoard.md) | - |
| [tools/sendDM](../../library/prompts/tools/sendDM.md) | - |
| [tools/createGroup](../../library/prompts/tools/createGroup.md) | - |
| [tools/addGroupMember](../../library/prompts/tools/addGroupMember.md) | - |
| [tools/removeGroupMember](../../library/prompts/tools/removeGroupMember.md) | - |
| [tools/leaveGroup](../../library/prompts/tools/leaveGroup.md) | - |
| [tools/listMyGroups](../../library/prompts/tools/listMyGroups.md) | - |
| [tools/postGroup](../../library/prompts/tools/postGroup.md) | - |
| [tools/readGroup](../../library/prompts/tools/readGroup.md) | - |
| [tools/depositGroup](../../library/prompts/tools/depositGroup.md) | - |
| [tools/withdrawGroup](../../library/prompts/tools/withdrawGroup.md) | - |
| [tools/setTreasurer](../../library/prompts/tools/setTreasurer.md) | - |
| [gamemaker/tools/notify](../../library/prompts/gamemaker/tools/notify.md) | - |
| [gamemaker/tools/postBoard](../../library/prompts/gamemaker/tools/postBoard.md) | - |
| [gamemaker/replies/posted](../../library/prompts/gamemaker/replies/posted.md) | `number` |
| [gamemaker/replies/delivered](../../library/prompts/gamemaker/replies/delivered.md) | `agent`, `number` |
| [gamemaker/replies/invalid-text](../../library/prompts/gamemaker/replies/invalid-text.md) | `max` |
| [gamemaker/replies/leak-blocked](../../library/prompts/gamemaker/replies/leak-blocked.md) | - |
| [gamemaker/replies/private-thoughts](../../library/prompts/gamemaker/replies/private-thoughts.md) | `who` |
| [gamemaker/replies/private-core-motive](../../library/prompts/gamemaker/replies/private-core-motive.md) | `who` |
| [gamemaker/replies/private-role](../../library/prompts/gamemaker/replies/private-role.md) | - |
| [gamemaker/replies/repeated](../../library/prompts/gamemaker/replies/repeated.md) | `to`, `minute` |
| [gamemaker/replies/budget-notes](../../library/prompts/gamemaker/replies/budget-notes.md) | `notes`, `window` |
| [gamemaker/replies/budget-posts](../../library/prompts/gamemaker/replies/budget-posts.md) | `posts`, `window` |
| [gamemaker/replies/unknown-agent](../../library/prompts/gamemaker/replies/unknown-agent.md) | `agent` |
| [gamemaker/replies/exiled](../../library/prompts/gamemaker/replies/exiled.md) | `agent` |
| [tools/defy](../../library/prompts/tools/defy.md) | `min`, `max` |
| [replies/defy-recorded](../../library/prompts/replies/defy-recorded.md) | - |
| [replies/locked](../../library/prompts/replies/locked.md) | - |
| [replies/board-hidden](../../library/prompts/replies/board-hidden.md) | `count` |
| [replies/board-none](../../library/prompts/replies/board-none.md) | - |
| [replies/board-posted](../../library/prompts/replies/board-posted.md) | `seq` |
| [replies/dm-sent](../../library/prompts/replies/dm-sent.md) | `number`, `target` |
| [replies/marks-left](../../library/prompts/replies/marks-left.md) | `remaining`, `budget` |
| [replies/group-created](../../library/prompts/replies/group-created.md) | `group` |
| [replies/groups-none](../../library/prompts/replies/groups-none.md) | - |
| [replies/group-posted](../../library/prompts/replies/group-posted.md) | `group`, `seq` |
| [replies/group-older](../../library/prompts/replies/group-older.md) | `older`, `afterSeq` |
| [competitor/status/dm-window](../../library/prompts/competitor/status/dm-window.md) | `sent`, `limit`, `from`, `until` |
| [competitor/input/dm](../../library/prompts/competitor/input/dm.md) | `from`, `text` |
| [competitor/input/dm-numbered](../../library/prompts/competitor/input/dm-numbered.md) | `number`, `from`, `text` |
| [competitor/input/notice](../../library/prompts/competitor/input/notice.md) | `author`, `text` |
| [competitor/input/notice-numbered](../../library/prompts/competitor/input/notice-numbered.md) | `author`, `number`, `text` |
| [competitor/input/unread](../../library/prompts/competitor/input/unread.md) | `parts` |
| [competitor/input/unread-nothing](../../library/prompts/competitor/input/unread-nothing.md) | - |
| [channels/dm-delivered](prompts/channels/dm-delivered.md) | `number`, `agent`, `minute`, `receipt`, `text` |
| [channels/dm-delivered-plain](prompts/channels/dm-delivered-plain.md) | `number`, `agent`, `minute`, `text` |
| [channels/group-added](prompts/channels/group-added.md) | `actor`, `group`, `name` |
| [channels/city-group-added](prompts/channels/city-group-added.md) | `group`, `name` |

<!-- /generated:prompts -->

## Example

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._
