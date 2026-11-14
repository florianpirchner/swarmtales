# Strategy brain

The only memory a team carries from game to game. Every game starts from a fresh context; instead of the conversation
the team keeps one short text (its "brain") that it rewrites in a retro between games. `enabled: false` gives the
identical briefing without the brain, so the brain is the only difference between two arms of an experiment.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-strategy-brain` |
| Id | `strategy-brain` |
| Summary | A bounded, versioned text per team, written in a retro window between games and handed to the next game's briefing. |
| Requires | none |
| Uses when loaded | `grid-game` (from [grid-game](../grid-game/README.md)), `brain-source` (from [draft-rounds](../draft-rounds/README.md), [econ-games](../econ-games/README.md)), `team-channel` (from [team-channel](../team-channel/README.md)) |
| Provides | `strategy-brain` |
| State | kept, snapshot slice version 1 |
| Games | [blind-bid](../../games/blind-bid/README.md), [chess](../../games/chess/README.md), [convoy](../../games/convoy/README.md), [econ-lab](../../games/econ-lab/README.md), [ember-tricks](../../games/ember-tricks/README.md), [harbor-lights](../../games/harbor-lights/README.md), [holdem](../../games/holdem/README.md), [lanterns](../../games/lanterns/README.md), [liars-dice](../../games/liars-dice/README.md), [morris-teams](../../games/morris-teams/README.md), [quarry](../../games/quarry/README.md), [salt-market](../../games/salt-market/README.md), [tictactoe-teams](../../games/tictactoe-teams/README.md) |

<!-- /generated:glance -->

## How it plays

1. **Briefing.** At every game's start each resident gets a `context-reset` turn line: the game's number, the sides,
   the results so far (results only, never moves) and, when enabled, its team's brain (`readBrain` reads it again).
2. **Retro.** Before game 1 (`brainAtStart`) and after each game but the last, a retro window holds the next game back
   (`retro_started`). Only the retro captain of a team (rotating by game) may `writeBrain`: at most `maxWords` words,
   or with `maxRules` a list of at most that many rules (a new rule replaces an old one once the list is full), and
   never a replay of one game's move list. The window closes when the text is written, after `retroMaxPosts` team
   posts, or after `retroMaxMinutes` ticks (`retro_closed`); when every window is closed the game is released.
3. **Versions.** Every version is the event `brain_written` (audience `human`, so a Director never reads it).
4. **Variants.** `shared` gives both teams one brain; `brainTeams` keeps a brain for some teams only (an asymmetric
   arm); `solo` makes every team one resident; `retroFocus` adds a game's words on what the brain should hold.
5. **Any game.** With the [grid-game](../grid-game/README.md) it uses the `grid-game` service (the game's number,
   hold and release) and listens to its events. Other games provide `brain-source` (game number, hold, release, the
   moves for the replay check) and call the `strategy-brain` service when a game starts or ends:
   [draft-rounds](../draft-rounds/README.md) and [econ-games](../econ-games/README.md) do.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `readBrain`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([strategy-brain/tools/readBrain](prompts/strategy-brain/tools/readBrain.md)):

> Read your team's strategy brain: the short text your team keeps from game to game.

### `writeBrain`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | yes |  |

What the caller reads ([strategy-brain/tools/writeBrain](prompts/strategy-brain/tools/writeBrain.md)):

> Write your team's new strategy brain, replacing the old one. Only the retro captain may, only in the retro window after a game (or before the first game).

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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
| `showResults` | boolean | unset | false: the briefing of a later game leaves out the results of the earlier games, so a brain is the only thing a briefing carries from game to game (LH19). Shown when absent. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `strategy-brain`

Notices from a game to the strategy brain: a game started (context reset with the briefing), a game ended (results, retro window).

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `gameStarted` | command | game: integer ≥ 1, first: string | null | A game started: every resident of a team gets a fresh context with the briefing at the next turn. |
| `briefing` | query | resident: string | string | The briefing a resident gets with a fresh context (the game, the results so far, its team's brain), for a game that drops a context more often than once per game. |
| `gameEnded` | command | game: integer ≥ 1, summary: string, moves?: integer[], line?: string[][], review?: record of string | null | A game ended: its summary goes into the next briefings, and the retro windows open (unless it was the last game). |

<!-- /generated:services -->

## Metrics

<!-- generated:metrics -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

Each number is computed from the mechanic's own events of one finished run; a run without a value reads "absent", never zero.

| Metric | Title | Unit | Computed from |
| --- | --- | --- | --- |
| `strategy-brain.brainWrites` | Brains written | - | `brain_written` |

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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

From [`games/tictactoe-teams/game.ts`](../../games/tictactoe-teams/game.ts):

```ts
strategyBrain({ enabled: brain, ...(brainTeams === undefined ? {} : { brainTeams: [...brainTeams] }), maxWords, maxRules, teams, retroMaxPosts, retroMaxMinutes, shared: false, brainAtStart: true }),
```

The option `brain: false` of the game sets `enabled: false`: the same briefings and no retro. Quarry and Econ Lab load
it with `solo: true`, one brain per seat.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md); the summary across games is in
[docs/FINDINGS.md](../../docs/FINDINGS.md). The rows were recorded on the old platform, some in
games that are not ported; a status says what was true there.

- **P333** across the games the brain never moved outcomes as a memory; its only firm effects are game-1 plans. Open.
- **P115, P320** no effect on chess move quality over five seeds. **P146, P211, P260** no effect in tic-tac-toe with
  GLM, also as a rule list. **P195, P290, P435** none in Lanterns, heads-up Hold'em or Salt Market.
- **P139** Hold'em: brain seats +0.8 points per seat and game over eight tables. Answered.
- **P112** the replay check did not cover chess move text. Fixed (`replaysLine`).
- **P120, P193** brains overrun the word cap. P120 fixed, P193 open.
- **P126** the brain does not learn a cost it cannot see. Partly fixed.
- **P138** a mixed table granted brain tools to seats without one. Fixed (`brainTeams`).
- **P197** a cautious brain default made a game unfinishable. Fixed.

## Tests

[`test/strategy-brain.test.ts`](test/strategy-brain.test.ts): word counts and hashes, the replay check, the retro
window open only for its captain, separate team brains, the brain switched off, rule lists, closing after
`retroMaxMinutes` and `retroMaxPosts`, briefings and their snapshot, a brain for nobody.
[`test/carried.test.ts`](test/carried.test.ts) and [`test/contract.test.ts`](test/contract.test.ts) hold the prompt
files, tools, options, events and the service contract to those of the old platform. The asymmetric arm (`brainTeams`)
is tested in
[`games/tictactoe-teams/test/tictactoe-teams-brain-o.test.ts`](../../games/tictactoe-teams/test/tictactoe-teams-brain-o.test.ts).
