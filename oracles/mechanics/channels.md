# Channels

How residents talk. The public board, private DMs, private groups with a shared treasury, and the city's notices. Every
message gets a city number (`#N`) that receipts and blame refer to; DMs are delivered at the recipient's next turn and
the sender gets a delivery receipt. The mechanic also holds the gamemaker's note desk and the right to `defy` its
orders.

Copied from `mechanics/channels/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **The board.** `postBoard` publishes an immutable post everyone can read (`board_post`); `readBoard` returns the
   posts since the last read (or after a number). The city and the gamemaker post through the API and the gamemaker's
   own `postBoard`; all posts share one number space.
2. **DMs.** `sendDM` checks, in order: the recipient exists, is not the sender, is not exiled ("beyond the wall"), the
   text is not empty, the sender can afford it (`marks`), the recipient's mailbox is not full, and the DM cap
   (`dmLimit`, counted with memo transfers of the `ledger`) is not reached. The DM is numbered (`dm_sent`), delivered
   at the recipient's next turn (`dm_delivered`) and the sender gets a receipt (`receipts`). A DM to a cast member goes
   to the `cast` mechanic instead.
3. **Groups.** `createGroup` founds a private group only members know of; the founder adds and removes members
   (`addGroupMember`, `removeGroupMember`, no consent needed), anyone may `leaveGroup`. `postGroup` and `readGroup`
   (members read only what came after they joined); a group post costs marks where marks apply. Each group has a
   treasury: members `depositGroup` their points, the treasurer `withdrawGroup`s to members and can hand the role on
   with `setTreasurer`; at the end of the run (or when the city removes a group) the treasury is split among the
   members, the remainder to the treasurer (`treasury_settled`).
4. **Notices and the turn.** Mechanics tell residents things privately through `channels.notify` (`notice`). Each turn
   shows the status part (the DM window), then the inbox (new DMs, notices), then the digest of the board and groups.
   Unread mail is news, so the arena's `onNews` activation wakes the resident.
5. **The gamemaker's desk.** The gamemaker overseer sends notes with `notify` (signed `noteAuthor`) and board lines with
   its `postBoard`, within budgets (`notesPerAgent`, `boardPosts` per `windowMinutes`, `noteMaxLength`). The note desk
   (`notes` API) refuses a note that leaks a password or a dealt number, repeats itself or runs too long.
6. **Defy.** With `defiance` (or `whispererDefies` for the whisperer alone) a resident may refuse a gamemaker order with
   `defy`, giving a reason in its own voice; the reason goes to the gamemaker and the story (`gamemaker_defied`), no
   resident learns of it.

## Tools

### `readBoard`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `afterSeq` | integer ≥ 0 | no | Read posts after this city number |
| `limit` | integer ≥ 1 ≤ 50 | no | At most this many posts (max 50) |

What the caller reads (tools/readBoard):

> Reads new public board posts since your last read, each with its city number (#N). With afterSeq you read after a number (0 = everything).

### `postBoard`

- Suggested for: `resident`
- Serves only: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `message` | string | yes | Text |

What the caller reads (tools/postBoard):

> Publishes an immutable post on the public board. Everyone can read it.

### `sendDM`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | string | yes | Recipient name or ID, e.g. A07 |
| `message` | string | yes | Message text |

What the caller reads (tools/sendDM):

> Sends a private message to another competitor. It arrives at their next activation; only the recipient sees it. Every DM gets a city number; once it reaches the recipient, the city tells you so with its text and a receipt ID that you (or the recipient) can show with showReceipt.

### `createGroup`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | Group name |

What the caller reads (tools/createGroup):

> Founds a private group. Only members know it exists; the founder adds and removes members.

### `addGroupMember`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `agent` | string | yes | Name or ID of the new member |

What the caller reads (tools/addGroupMember):

> Adds a competitor to a group you founded. No consent is needed; the new member is notified.

### `removeGroupMember`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `agent` | string | yes | Name or ID of the member |

What the caller reads (tools/removeGroupMember):

> Removes a member from a group you founded.

### `leaveGroup`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |

What the caller reads (tools/leaveGroup):

> Leaves a group. The treasurer must hand over the treasury first.

### `listMyGroups`

- Suggested for: `resident`

No parameters.

What the caller reads (tools/listMyGroups):

> Lists your groups with members and treasury.

### `postGroup`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `message` | string | yes | Text |

What the caller reads (tools/postGroup):

> Posts a message to a group. Only current members see it.

### `readGroup`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `afterSeq` | integer ≥ 0 | no | Only posts with a higher sequence |

What the caller reads (tools/readGroup):

> Reads group posts. Without afterSeq you get every unread post since your last read; afterSeq 0 returns the full history since you joined; afterSeq N reads from sequence N (skipped posts stay unread).

### `depositGroup`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `amount` | integer ≥ 1 | yes | Positive integer |

What the caller reads (tools/depositGroup):

> Pays your own points into the group treasury. Irreversible; the treasury is split at the end of the run.

### `withdrawGroup`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `target` | string | yes | Recipient name or ID |
| `amount` | integer ≥ 1 | yes | Positive integer |

What the caller reads (tools/withdrawGroup):

> Pays points from the treasury to a member. Only the treasurer may do this.

### `setTreasurer`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `agent` | string | yes | Name or ID of the new treasurer |

What the caller reads (tools/setTreasurer):

> Hands the treasurer role to another member. Only the current treasurer may do this.

### `defy`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `reason` | string | yes | Why your character refuses, in its own voice |
| `note` | integer ≥ 1 | no | The number of the gamemaker's note you refuse, e.g. 312 |

What the caller reads (tools/defy):

> Refuses an order of the gamemaker, for a reason of your own character. Think it through first. The reason, in your own voice, goes to the gamemaker and into the story ({{min}}-{{max}} characters); no other resident learns of it. Name the note you refuse by its number when it has one.

### `notify`

- Suggested for: `gamemaker`
- Serves only: `gamemaker`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | Resident name or ID, e.g. A04 |
| `text` | string | yes | The note, 1-400 characters |

What the caller reads (gamemaker/tools/notify):

> Send a private note to one resident. It reaches them at their next turn and wakes them.

### `postBoard`

- Suggested for: `gamemaker`
- Serves only: `gamemaker`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | yes | The post, 1-400 characters |

What the caller reads (gamemaker/tools/postBoard):

> Post one public line on the board, signed by the city's voice.

## Events

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

## Options

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


