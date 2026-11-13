# Strategy brain

The only memory a team carries from game to game. Every game starts from a fresh context; instead of the conversation
the team keeps one short text (its "brain") that it rewrites in a retro between games. `enabled: false` gives the
identical briefing without the brain, so the brain is the only difference between two arms of an experiment.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-strategy-brain` |
| Id | `strategy-brain` |
| Summary | A bounded, versioned text per team, written in a retro window between games and handed to the next game's briefing. |
| Requires | none |
| Uses when loaded | `grid-game` (from [grid-game](../grid-game/README.md)), `brain-source` (from [chess](../chess/README.md), [clue-grid](../clue-grid/README.md), [convoy](../convoy/README.md), [draft-rounds](../draft-rounds/README.md), [econ-games](../econ-games/README.md), [hint-towers](../hint-towers/README.md), [holdem](../holdem/README.md), [liars-dice](../liars-dice/README.md), [morris](../morris/README.md), [salt-market](../salt-market/README.md), [sealed-auction](../sealed-auction/README.md), [trick-play](../trick-play/README.md)), `team-channel` (from [team-channel](../team-channel/README.md)) |
| Provides | `strategy-brain` |
| State | kept, snapshot slice version 1 |
| Facts | `brains` |
| Jobs | none |
| Stories | [blind-bid](../../stories/blind-bid/README.md) (all 2 variants), [chess](../../stories/chess/README.md), [convoy](../../stories/convoy/README.md) (all 2 variants), [econ-lab](../../stories/econ-lab/README.md) (all 5 variants), [ember-tricks](../../stories/ember-tricks/README.md) (all 2 variants), [harbor-lights](../../stories/harbor-lights/README.md) (all 4 variants), [holdem](../../stories/holdem/README.md) (all 7 variants), [lanterns](../../stories/lanterns/README.md) (all 2 variants), [liars-dice](../../stories/liars-dice/README.md) (all 3 variants), [morris-teams](../../stories/morris-teams/README.md) (all 2 variants), [quarry](../../stories/quarry/README.md) (all 4 variants), [salt-market](../../stories/salt-market/README.md), [tictactoe-teams](../../stories/tictactoe-teams/README.md) (all 5 variants) |

<!-- /generated:glance -->

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

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `readBrain`

- Suggested for: `resident`

No parameters.

What the caller reads ([strategy-brain/tools/readBrain](prompts/strategy-brain/tools/readBrain.md)):

> Read your team's strategy brain: the short text your team keeps from game to game.

### `writeBrain`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | yes |  |

What the caller reads ([strategy-brain/tools/writeBrain](prompts/strategy-brain/tools/writeBrain.md)):

> Write your team's new strategy brain, replacing the old one. Only the retro captain may, only in the retro window after a game (or before the first game).

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `strategy-brain`

Notices from a game to the strategy brain: a game started (context reset with the briefing), a game ended (results, retro window).

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `gameStarted` | command | game: integer ≥ 1, first: string | null | A game started: every resident of a team gets a fresh context with the briefing at the next turn. |
| `briefing` | query | resident: string | string | The briefing a resident gets with a fresh context (the game, the results so far, its team's brain), for a game that drops a context more often than once per game. |
| `gameEnded` | command | game: integer ≥ 1, summary: string, moves?: integer[], line?: string[][], review?: record of string | null | A game ended: its summary goes into the next briefings, and the retro windows open (unless it was the last game). |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [strategy-brain/tools/readBrain](prompts/strategy-brain/tools/readBrain.md) | - |
| [strategy-brain/tools/writeBrain](prompts/strategy-brain/tools/writeBrain.md) | - |
| [strategy-brain/empty](prompts/strategy-brain/empty.md) | - |
| [strategy-brain/brain-text](prompts/strategy-brain/brain-text.md) | `version`, `text` |
| [strategy-brain/written](prompts/strategy-brain/written.md) | `version`, `words` |
| [strategy-brain/briefing-head](prompts/strategy-brain/briefing-head.md) | `game`, `team`, `first` |
| [strategy-brain/briefing-results](prompts/strategy-brain/briefing-results.md) | `results` |
| [strategy-brain/briefing-none](prompts/strategy-brain/briefing-none.md) | - |
| [strategy-brain/briefing-brain](prompts/strategy-brain/briefing-brain.md) | `version`, `text` |
| [strategy-brain/briefing-nobrain](prompts/strategy-brain/briefing-nobrain.md) | - |
| [strategy-brain/retro-open](prompts/strategy-brain/retro-open.md) | `game`, `result`, `captain`, `words`, `aim`, `lines`, `posts` |
| [strategy-brain/retro-start](prompts/strategy-brain/retro-start.md) | `captain`, `words`, `aim`, `lines`, `posts` |
| [strategy-brain/retro-current](prompts/strategy-brain/retro-current.md) | `text` |
| [strategy-brain/retro-review](prompts/strategy-brain/retro-review.md) | `text` |
| [strategy-brain/retro-captain](prompts/strategy-brain/retro-captain.md) | - |
| [strategy-brain/briefing-head-solo](prompts/strategy-brain/briefing-head-solo.md) | `game` |
| [strategy-brain/empty-solo](prompts/strategy-brain/empty-solo.md) | - |
| [strategy-brain/briefing-brain-solo](prompts/strategy-brain/briefing-brain-solo.md) | `version`, `text` |
| [strategy-brain/briefing-nobrain-solo](prompts/strategy-brain/briefing-nobrain-solo.md) | - |
| [strategy-brain/retro-open-solo](prompts/strategy-brain/retro-open-solo.md) | `game`, `result`, `words`, `aim`, `lines` |
| [strategy-brain/retro-start-solo](prompts/strategy-brain/retro-start-solo.md) | `words`, `aim`, `lines` |
| [strategy-brain/retro-rules](prompts/strategy-brain/retro-rules.md) | `rules` |

<!-- /generated:prompts -->

## Example

From [`stories/chess/story.ts`](../../stories/chess/story.ts):

```ts
strategyBrain.with({ enabled: brain, solo: !teams, maxWords, teams: sides, retroMaxPosts: 6, retroMaxMinutes: RETRO_MINUTES, shared: false, brainAtStart: true }),
```

`chess-nobrain` sets `enabled: false`: the same briefings and no retro.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md); the summary across games is in
[docs/CROSS-GAME-FINDINGS.md](../../docs/CROSS-GAME-FINDINGS.md):

- **P333** across the game stories the brain never moved outcomes as a memory; its only firm effects are game-1
  plans. Open.
- **P115, P320** no effect on chess move quality over five seeds. **P146, P211, P260** no effect in tic-tac-toe with
  GLM, also as a rule list. **P195, P290, P435** none in Lanterns, heads-up Hold'em or Salt Market.
- **P139** Hold'em: brain seats +0.8 points per seat and game over eight tables. Answered.
- **P112** the replay check did not cover chess move text. Fixed (`replaysLine`).
- **P120, P193** brains overrun the word cap. P120 fixed, P193 open.
- **P126** the brain does not learn a cost it cannot see. Partly fixed.
- **P138** a mixed table granted brain tools to seats without one. Fixed (`brainTeams`).
- **P197** a cautious brain default made a game unfinishable. Fixed.

## Tests

[`test/mechanics/strategy-brain/strategy-brain.test.ts`](../../test/mechanics/strategy-brain/strategy-brain.test.ts):
word counts and hashes, the replay check, the retro window open only for its captain, separate team brains, the brain
switched off, rule lists, closing after `retroMaxMinutes` and `retroMaxPosts`, briefings and their snapshot, a brain
for nobody, documented options. The asymmetric arm (`brainTeams`) is tested in
[`test/stories/tictactoe-teams-brain-o.test.ts`](../../test/stories/tictactoe-teams-brain-o.test.ts).
