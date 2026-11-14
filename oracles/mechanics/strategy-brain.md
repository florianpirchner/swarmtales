# Strategy brain

The only memory a team carries from game to game. Every game starts from a fresh context; instead of the conversation
the team keeps one short text (its "brain") that it rewrites in a retro between games. `enabled: false` gives the
identical briefing without the brain, so the brain is the only difference between two arms of an experiment.

Copied from `mechanics/strategy-brain/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **Briefing.** At every game's start each resident gets a `context-reset` turn line: the game's number, the sides,
   the results so far (results only, never moves) and, when enabled, its team's brain (`readBrain` reads it again).
2. **Retro.** Before game 1 (`brainAtStart`) and after each game but the last, a retro window holds the next game back
   (`retro_started`). Only the retro captain of a team (rotating by game) may `writeBrain`: at most `maxWords` words,
   or with `maxRules` a list of at most that many rules (a new rule replaces an old one once the list is full), and
   never a replay of one game's move list. The window closes when the text is written, after `retroMaxPosts` team
   posts, or after `retroMaxMinutes` minutes (`retro_closed`); when every window is closed the game is released.
3. **Versions.** Every version is the event `brain_written` (audience `human`, so a gamemaker never reads it).
4. **Variants.** `shared` gives both teams one brain; `brainTeams` keeps a brain for some teams only (an asymmetric
   arm); `solo` makes every team one resident; `retroFocus` adds a story's words on what the brain should hold.
5. **Any game.** With the grid game it reads the board's words through its API. Other games provide `brain-source`
   (game number, hold, release, the moves for the replay check) and call `strategy-brain` when a game starts or ends:
   chess, morris, the card games, econ games, Convoy and the others listed above.

## Tools

### `readBrain`

- Suggested for: `resident`

No parameters.

What the caller reads (strategy-brain/tools/readBrain):

> Read your team's strategy brain: the short text your team keeps from game to game.

### `writeBrain`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | yes |  |

What the caller reads (strategy-brain/tools/writeBrain):

> Write your team's new strategy brain, replacing the old one. Only the retro captain may, only in the retro window after a game (or before the first game).

## Events

### `brain_written`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `team` | string | yes |  |
| `game` | integer | yes | The game the retro followed; 0 for the brain before game 1. |
| `version` | integer | yes | From 1, per brain (per team, or the one shared brain). |
| `author` | string | yes |  |
| `words` | integer | yes |  |
| `hash` | string | yes |  |
| `text` | string | yes |  |

### `retro_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `team` | string | yes |  |
| `game` | integer | yes |  |
| `captain` | string | yes |  |

### `retro_closed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `team` | string | yes |  |
| `game` | integer | yes |  |
| `reason` | "written" or "max_posts" or "timeout" | yes |  |

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | boolean | `true` | false: no brain and no retro, only the result-only briefing at each game's start (the control arm). |
| `brainTeams` | string[] | unset | The teams that keep a brain (default: all teams). The others get the result-only briefing, no retro, and readBrain/writeBrain stay closed to them (BRAIN_DISABLED); an empty list equals enabled: false. |
| `maxWords` | integer ≥ 1 | `300` | The most words a brain may have. |
| `maxRules` | integer ≥ 0 | `0` | More than 0: the brain is a list of at most this many rules, one per line; a new rule has to replace an old one once the list is full (P210). 0: free text up to maxWords. |
| `teams` | record of string[] | `{}` | The teams, by the side names the grid game uses (X, O). |
| `retroMaxPosts` | integer ≥ 1 | `8` | Team posts in a retro window after which it closes, unwritten, at the end of the minute. |
| `retroMaxMinutes` | integer ≥ 1 | `3` | Minutes a retro window stays open at most. |
| `shared` | boolean | `false` | One brain both teams read and write, instead of one per team. |
| `brainAtStart` | boolean | `true` | Every team writes a first brain in a window before game 1. |
| `postTool` | string | `"postTeam"` | The team-chat tool whose successful calls count as retro posts. |
| `retroFocus` | string | `""` | A story's own words added to every retro line: what the brain should hold (Lanterns: the team's conventions, not caution, P195). Empty: none. |
| `solo` | boolean | `false` | Every team is one resident: the briefings name no team and no side, and a retro window has no team talk. |


