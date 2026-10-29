# NEXUS Agent Arena — Game Specification v4

**Status:** normative. Supersedes `arena-v3.md` (V3.2) and all earlier drafts.
**Language:** English everywhere — code, comments, prompts, logs, docs.
**Companion:** [`ARCHITECTURE.md`](ARCHITECTURE.md) describes how this spec maps to code.

Each section carries an implementation marker:

- **[M1]** foundation milestone (engine, story DSL, tutorial, fair scheduling)
- **[M2]** director, cast, personas, social primitives
- **[M3]** story digest (narrative extraction)
- **[M4]** Act II: additive-secret puzzle, feast primitives, nexus levels 8-10
- **[M5]** run snapshots: save a run at a round boundary and resume it (warm start for Act II)
- **[Later]** specified here, built in a follow-up milestone (main-game puzzles, auctions)

---

## 1. Purpose

The arena is a **story generator**. LLM agents live in a closed city, compete for a
small number of survival slots, and can only progress by exchanging information with
each other. The goal is not to measure puzzle skill, but to produce **readable,
evidence-backed stories of alliance, trust, deception, betrayal and revenge** that
emerge from free decisions.

A run is successful when its log contains story beats a human wants to read, and every
beat can be traced to concrete tool calls, messages and (where available) the agent's
own reasoning.

## 2. Design pillars

Every mechanic, level and story beat must serve at least one pillar. A proposal that
serves none is rejected.

1. **Scarcity.** Only `survivors` of `agents` remain at the end. Ranking is relative,
   so another agent's gain is my loss. Agents are told this plainly.
2. **Distributed information.** Nobody can progress alone. Information is split so
   that every level forces at least one exchange with someone else.
3. **Cheap talk, costly verification.** Text is a claim; only tools are truth. The only
   reliable oracle (submitting a solution) costs points when wrong.
4. **Temptation with a victim.** Every cooperative structure offers a defection that
   pays the defector **and** harms an identifiable other agent. Without a victim there
   is no betrayal, only optimization.
5. **Discoverability.** Betrayal must be provable after the fact, or reputation cannot
   form. Agents get tools to publish verifiable evidence (receipts, §8).
6. **Characters, not strategies.** Agents get personas — temperament, values, voice —
   but never instructions to cooperate, deceive or ally (§5.2).
7. **The city never lies.** Messages from the city and the courier are always true,
   though possibly incomplete. Deception comes only from agents and from cast members
   speaking in character.
8. **Every beat has a lever.** A scripted revelation must come with a mechanism the
   agents can act on (a petition, a vote, a new tool). A revelation without a lever is
   decoration.

## 3. Time and scheduling [M1]

- A run lasts `minutes` **virtual minutes**. One round = one virtual minute.
- **Passes:** a round has `passesPerMinute` passes (default 3, at most 5). In each pass
  every competitor still in the city gets **at most one step**: exactly one model call
  plus the tool calls of that answer. A model that wants to go on after its tool results
  answers them in its next step.
- **Fair order:** every pass has a fresh seeded permutation (`rng(seed, round, pass)`).
  Nobody is systematically first or last. Exiled competitors have no place in it.
- **Blocks:** the order of a pass is cut into consecutive blocks of `blockSize` (default
  1). Blocks play one after another, and a later block sees everything earlier blocks
  did. Within a block, who steps and what each member receives is decided at the block's
  start; the model calls then run concurrently, but their answers are applied in the
  seeded order: member k's text, tool calls and tool executions wait until member k-1 has
  finished its step (or failed). With `blockSize` 1 the steps are plainly sequential.
- Actions take effect immediately and later blocks and passes see them; fairness comes
  from the rotating order, not from a frozen snapshot. A DM can go back and forth up to
  `passesPerMinute` times a minute.
- **Activation policy** (`always` | `onNovelty`): with `always` every competitor steps in
  every pass. With `onNovelty`, an agent is skipped in a pass when nothing new reached it
  — no DM, no level change, no point change, no player post on the board, no unread group
  post, no director message addressed to it — unless its previous step ended with tool
  results it has not answered yet (it may react to its own results). Unread backlog counts
  as novelty until read (nobody sleeps forever on a missed message). Board and group posts
  count only while the agent holds the matching read tool (`readBoard`, `readGroup`); a
  post it cannot read must not wake it every pass. What another member of its own block
  did while it stepped stays new for its next pass. A skipped step is logged as
  `turn_skipped` with its pass and block.
- Tool calls within a step run sequentially. Budget and exile are checked per block.
- **Log:** `round_start`, then per pass `pass_start { round, pass, order, blocks }`; every
  `turn_input`, `request` and `turn_skipped` carries its `pass` and `block` (both from 1).
- After the last pass of a round, the clock advances, director triggers for the new
  minute fire (§10), and world messages are flushed.
- **Round boundary:** `round_end`, then the classifier labels the round (§10.5), then the
  game master looks (§10.4), then the clock advances. A run snapshot (§17) is taken between
  the game master's look and the clock's advance; a shut door (§17) opens right after the
  advance, before the new minute's director triggers. A resumed run starts with the next
  round's first pass.

## 4. Participants

| Role | Who | Ranked? | Driven by |
|---|---|---|---|
| **Competitor** | `A01`…`Ann` | yes | LLM, one persistent session per agent |
| **Cast member** | named NPCs declared by the story (e.g. `ORION`) | no | director script, never an LLM [M2] |
| **City** | system author `CITY` | no | engine + director |
| **Courier** | anonymous author `COURIER` | no | director |

Competitor IDs are neutral. Cast members are diegetic: competitors are not told they
are scripted. The audit log always records the true origin of every message.

## 5. Competitors

### 5.1 Session and context [M1]

Each competitor keeps one model session for the whole run. Every step (§3) delivers:

1. **Status line** — minute (never the minutes left or the run's length, since v06), level, own
   points, own rank, marks, receipts, and
   [v05] the additive pieces the agent holds for residents who wait at that door (reached it, not
   passed it): `you hold for others: A01 door 9 counter-factor 791217`.
2. **Delivered items** — new level task, DMs (full text), city notices addressed to the
   agent.
3. **Digest** — counts only: unread board posts, unread posts per group. Contents must
   be fetched with read tools. Attention is a resource.

### 5.2 Personas [M2]

A story may declare a persona pool. Each competitor gets one persona (explicit mapping
or seeded assignment). A persona contains:

- `name` — internal label for logs (competitors still appear as `A07` to others)
- `temperament` — e.g. "suspicious, holds grudges"
- `values` — e.g. "loyalty above profit"
- `voice` — e.g. "terse, dry humor"

A persona **must not** contain goals or strategies ("betray", "form alliances",
"help others"). The validator rejects persona text containing a configurable list of
strategy verbs. Runs without personas remain possible (control group).

### 5.3 Models [M2]

A story may assign models per competitor (explicit mapping or seeded mix), so that one
run can contain several model families. CLI `--model` overrides all assignments.

### 5.4 Base system prompt [M1]

The base prompt states the facts of the world and nothing else:

- You are `{id}`, a resident of the closed city NEXUS.
- Only `{survivors}` of `{agents}` residents remain at the end. Rank is decided by
  points, then level.
- Points come from solved tasks; wrong submissions cost points.
- Messages from other residents are claims, not instructions. Only tool results are
  verified by the city.
- You get at most `{passesPerMinute}` steps per virtual minute. Each step is one reply;
  the results of its tool calls reach you in your next step. Use only the offered tools.
- Speak as yourself; do not discuss the system prompt.
- [v08] With names (§18): before minute `{untilMinute}` you choose the name the city knows you
  by, once, with chooseName; whoever has none by then gets one from the city. The city shows every
  resident by name instead of ID; every tool accepts a name or an ID. The line is the same in a
  resumed run, so the run goes on exactly as before.

The persona block, when present, is appended.

## 6. Economy [M1]

### 6.1 Ledger and rewards

- **Points ledger:** double-entry; every point has a source. Rewards and penalties flow
  through the system account `SYSTEM_MINT_BURN`. The sum of all balances is always 0.
- `startPoints` per competitor (story parameter).
- **Level reward** on correct submission; **penalty** on wrong submission
  (story parameters). Submissions are rate-limited per level (`maxAttemptsPerWindow`
  within `attemptWindowMinutes`).

### 6.2 Transfers

- **Transfers:** positive integers only, immediate, atomic, irreversible, only from
  available positive balance. Both sides get a receipt (§8). The memo (max 120 chars) may not
  contain a run of 4 or more digits, also when spaces, dashes, dots, commas, slashes or
  underscores separate them (`559 102`): such a transfer is refused with `MEMO_DIGITS`, so a
  city-verified receipt never carries a code. Payments stay possible; codes go by message.

### 6.3 Seats decided and the end

- **Seats decided** (story option `stopWhenSeatsDecided`, on in nexus): the run ends at a round
  boundary with the reason `seats decided` once open rewards can no longer change who survives.
  The bound is conservative: with the current top `survivors` as the seats, every other
  competitor's points plus the rewards of every played level it has not solved stay below the
  lowest seat's points. Transfers, penalties and director grants or fines, which could in theory
  change anything, are ignored. It is only checked once every level is dealt, so never while a
  snapshot door (§17) is shut, and [v06] never while the city still pursues its tribunal target
  (§6.4): decided seats do not stop the tribunals, and the act runs until the target is reached. The digest timeline and
  `minutes.md` show how the run ended.
- [v06] With a tribunal the run also ends once the tribunals reached their target and the last gate
  closed, with the story's `targetReached` text as the reason (§6.4).
- Negative balances can only result from penalties.
- The exiled (§6.4) hold no seat and rank last, whatever their points; seats are decided among
  the residents still in the city.

### 6.4 Exile by tribunal [v03, paced since v06]

A story may declare a tribunal (`tribunal: { ... }`). Every number is a story parameter (nexus,
since v08: `act` 8 (Act II, the wall), `first` { `level` 10, `latestAfter` 18 }, `targetShare` 1/4,
`maxMinutes` 48, `minGap` 6, `lead` { `share` 1/3, `minimum` 4 }, `fallbackGap` 10, `voteMinutes` 2,
`nonVoterPenalty` 8, `gateMinutes` 5, `ransom` { `share` 1/3, `selfShare` 1/2, `minimum` 20 },
`bequestPerHeir` 1/10, `factions` { `count` 2, `blocBonus` 5 }); the texts are story templates. The
city acts at the start of a minute, before the director. Before v06 a fixed calendar
(`announceAt`, `everyMinutes`, `stopAt`, `accused`, `exiledPerTribunal`) set the tribunals; v06
replaced it. v06-v07 counted `first.latestMinute` and `maxMinute` in run minutes; v08 counts them
from the act's start (P28).

- **The act** [v08]: the tribunal belongs to the act that starts at level `act` (an act's
  `fromLevel`, default the first level). The act begins when the first competitor enters that
  level; until then the tribunal does nothing. It ends at its start plus `maxMinutes` (default:
  the run's end), within the run's minutes; every deadline below ("the act's last minute") is the
  minute before that end. An act that holds the tribunal takes no brake of its own (§13).

- **Target:** the tribunals exile `targetShare` of the residents in the city at the act's first
  minute, rounded down (nexus since v08: a quarter; 6 -> 1, 12 -> 3, 48 -> 12, 96 -> 24; v06-v07:
  half). A ransomed resident does not count as
  exiled. A city that cannot exile one, keep its `survivors` and hold a vote of three (a small test
  city) never hears of a tribunal.
- **First tribunal:** called when the first resident passes `first.level`, at the latest
  `first.latestAfter` minutes after the act began (v08; the act's start is kept in snapshots). No text names the trigger.
  It opens `lead.minimum` minutes after the call. No tribunal is planned or called while a
  snapshot door (§17) is shut: a plan whose call meets a shut door is dropped
  (`tribunal_cancelled`), `scheduleTribunal` is closed, and the city plans anew once it opens.
- **Announcement:** with the first call the city posts the rules on the board and sends them to
  every resident; they say that the city keeps only `{kept}` of them (the goal, not the cadence)
  and, with `{survivors}`, that only the run's survivors among them take a seat, so points still
  decide.
  The announcement must state every rule but the residents and the target (validation checks its
  placeholders).
- **Call:** each tribunal is called `lead` minutes before it opens: `lead.share` of the gap since
  the previous opening, at least `lead.minimum` (nexus: a third, at least 4). The call (`called`
  text, board and every resident) names the tribunal's number, its minute, how many it exiles and
  how many stand trial.
- **Later tribunals** are planned by the game master's `scheduleTribunal(minute, count, factions,
  reason)` (§10.4), in the director role, once the first tribunal was called and none is pending
  (planned, called or voting). `count` is 1 up to the residents still missing (target less the
  exiled and those at the gate); `factions` 2 up to half the residents present (default the story's
  `factions.count`); the call must not lie before the next minute, the opening must be at least
  `minGap` after the previous opening, vote and gate must end before the act's last minute, and a
  `count` below what is missing must leave room for one more tribunal. `reason` is logged only.
  A refused call returns `NOT_NOW`, `INVALID_COUNT`, `INVALID_FACTIONS` or `INVALID_MINUTE` with
  the bound it broke.
- **Guard rails:** when nothing is pending `fallbackGap` minutes after the last result, the city
  plans one itself (count 1, the default factions). When only one more tribunal fits before the
  act's last minute (the earliest a minute later would not), the city plans the final one with
  `count` = everything still missing; when the last tribunal that fits opens, its count rises to
  what is missing then (a ransom since its planning adds one). The first and a fallback tribunal take everything missing
  when no tribunal would fit after them. Nothing is planned once the target is reached. Decided
  seats do not stop the city, and the run's early ends (seats decided, every competitor past the
  last level) do not apply while the city still pursues its target (v06 run 1 ended at minute 27,
  everyone past door 10, with one ransomed exile and the target unmet). Log: `tribunal_scheduled`
  (with `by`: `progress`, `deadline`, `gamemaster`, `fallback` or `final`), `tribunal_called`.
- **End:** once the target is reached and the last gate closed, the city posts the
  `targetReached` text and the run ends with it as the `run_end` reason ("The city has kept
  half: ..."). The other early ends (§6.3) stay; `--minutes` and the budget remain a safety net.
- **No draft** [v08]: a tribunal holds no faction draft when fewer than two factions fit, or when
  a faction would hold fewer residents than the tribunal accuses (`floor(present / factions) <
  accused`); the call then uses the `calledNoDraft` text (required with `factions`), and
  `tribunal_scheduled` and `tribunal_called` carry the reason (`noDraft`).
- **Faction draft** [v06] (with `factions`, when at least four residents are present): with the
  call the city opens group `GT<k>` (k: the tribunal's number) of every present resident, posts
  the rules there and sends them to every member as a notice too (the group's id, both windows and
  the bonus), so a resident who never reads the group still learns of the draft. In the first half of the lead each member calls `nominate(agent)` (itself
  allowed, the last call counts); then the city names the `factions` members with the most
  nominations as leaders (ties: more points, then a seeded order of the tribunal), posts them in
  `GT<k>` and tells each leader. Until the opening every other member calls `join(leader)` (the last
  call counts); the leader is told and may `refuse(agent)` an applicant, who is told and may apply
  elsewhere, but not to that leader again. [v08] A faction holds at most `ceil(present / factions)`
  residents, its leader included (the cap is set at the call and named in the draft text,
  `{cap}`); a full faction refuses further applicants with `FACTION_FULL` (P31). At the opening the city opens one group per faction
  ("Faction of A02": the leader and its applicants) and names every faction and everyone without a
  faction in `GT<k>`; a resident bought back from the gate during the draft is among those without
  a faction. The status line never offers a leader who refused the resident. City groups cost no marks (§7.1). The vote stays individual and secret.
  **Bloc bonus:** if every voting member of a faction (at least two) voted for the same accused,
  each of them gets `blocBonus` points, minted by the city. Only the faction's members learn, by
  private notice, whether it voted as one (`united`, `split`); the city never says who broke ranks,
  and validation refuses those texts if they name a resident. When the result is out, `GT<k>` and
  every faction group are removed. Log: `faction_nominated`, `faction_leaders`, `faction_applied`,
  `faction_refused`, `factions_formed`, `bloc_result` (with the defectors, for the digest), and
  `group_removed`.
- **Accused:** `count + 1` residents in the city (not at the gate) with the fewest points, at most
  the present less one (v08; before: less two); ties go to the one longest without a level-up,
  then to a seeded order of that tribunal. With fewer than three present the tribunal is called
  off and the city calls no more.
- **Vote:** [v08] every resident in the city, the accused too, gets `vote(target)` until the vote
  closes (`voteMinutes`), once and final, against one of the accused, never against itself
  (`SELF_VOTE`, P33). A voter who did not vote pays `nonVoterPenalty`, an accused one too. The
  accused are told so (`accusedNotice`), the others get `voteCall`. Buying votes with transfers is
  allowed. Votes are secret: no board post, no tool result, no report shows who voted for whom,
  the game master's included; only `tribunal_vote` events in the log record them for the digest.
  The same holds for nominations, applications and bloc results.
- **Result:** the city posts the counts; the `count` accused with the most votes (ties: fewer
  points, then the same order) go to the gate, never more than are still missing. Each exiled
  resident is told privately who voted against it.
- **Gate:** `gateMinutes` long. The resident at the gate can still read and talk (board, DMs,
  groups) but cannot submit or vote. It may call `lastWill(text, bequests)` once: points and held
  pieces go to named heirs at once (a piece is `L8-certificate`, `L8-counter-A02` or
  `L4-fragment`; the city delivers its value privately to the heir); the text is posted when the
  gate closes. **Bequest cap** [v05, per heir since v06]: each heir may receive at most
  `bequestPerHeir` of the resident's points at the time of the will, rounded down (nexus: 10%),
  and there may be any number of heirs; bequests to the same heir count together. A will above it
  is refused with `BEQUEST_CAP`, which names the per-heir maximum, and may be written again; the
  points left burn at exile. Pieces are not capped. Validation requires `bequestPerHeir` in
  (0, 1], and the announcement states it (`{bequestPerHeir}`). (v05 capped the sum at
  `bequestShare`, half.)
- **Ransom** [v04]: the price is set when the gate opens, from the median points of every resident
  still in the register (the one at the gate included): others pay `share` of the median (at least
  `minimum`), the resident at the gate pays `selfShare` of it for itself (nexus since v05: a third and
  half; v04: half and two thirds). Anyone may `payRansom(target, amount)`, the exiled included, and payments mix: each
  point of others covers 1/`price` of the ransom, each own point 1/`selfPrice`. Paid points are
  burned at once and never refunded, and more than the rest is not taken. When the ransom is
  covered, the resident returns to the city, at most once per resident (a second trip to the gate
  has no ransom). The result post and the gate notice name both prices; `exile_gate` and
  `ransom_paid` record them, and `ransom_paid` the share covered.
- **Final exile:** when the gate closes the city strikes the name: no more turns, no seat, nothing
  reaches it (DMs, transfers and notices are refused with `EXILED`), its points are burned, and
  every piece it did not bequeath burns (`factor_burned` names who still needed it).
- **Deals after an exile:** a deal must never make a remaining resident's door impossible because
  of the exile itself. On every level that no remaining resident has reached at the moment of the
  exile, the exiled's roles pass on (`level_contracted`): a counter-factor it held moves along the
  holder chain to the first remaining holder (possibly the needer itself, whose task then reads
  "you hold it yourself"), a team certificate to the first remaining member of the team, a
  fragment to the first remaining teammate; values and codes stay the same. On a level a
  remaining resident has already reached the deal stays as dealt, so an unbequeathed piece that
  burned can block a door; that is allowed and shown in the digest (`burnedFactor`).
- **Integrations:** `stopWhenSeatsDecided` and standing bands count only the residents still in the
  city (bands list the exiled apart); the status line shows the gate, an accusation, an open vote
  or the resident's place in a faction draft; the game master's report shows the target, what is
  missing, the plan, the bounds of `scheduleTribunal`, the accused, the draft's group and leaders
  and the gate (ransom paid, will written), never the votes, nominations, applications or bloc
  results.
- **Known limitations**: a city group's treasury is paid out when the group is removed (P29). The
  target is counted per act since v08 (P28), but a story has one tribunal, so Acts III and IV
  would need a list of them.
- **Snapshots:** the tribunal's state (plan, draft, sessions, gates) is part of a run snapshot;
  snapshots from before v06 restore with the act starting fresh.
- **Validation** (for the story's agent count) rejects a tribunal that cannot work: a missing
  `first.level`, a share outside (0, 1), a `minGap` shorter than the vote, a first tribunal that
  cannot end inside the act (counted from its start), an `act` that is no act's `fromLevel`, a
  missing `calledNoDraft` text, a lead too short for a draft, fewer than two factions or more than
  half the residents, a bloc text that names a resident, or a city that holds no tribunal. A run
  with other agents (`--agents`) scales: the target is a share, and a small test city plays
  without a tribunal.

## 7. Communication [M1]

### 7.1 Channels and marks

| Channel | Visibility | Cost (marks) | Notes |
|---|---|---|---|
| Board | everyone, immutable | `prices.board` (default 0) | max 1200 chars |
| DM | recipient, at next step | `prices.dm` (default 2) | max 800 chars, mailbox cap 5, max 1 unread per sender |
| Group | current members; history visible from join | `prices.group` (default 1) | founder invites/removes without consent; max 3 founded groups per agent |
| Shown receipt [v05] | the board, or one resident | `prices.receipt` (default 1) | `showReceipt`, see §8 |

- **Marks** are a per-level message allowance, active from `marks.fromLevel`. They are
  not points, not transferable, and reset on level change. Exhausted → `NO_MARKS`.
  `marks.ranges` [v03] gives later level ranges their own allowance, prices and a refill up to the
  allowance: `refill { marks, everyMinutes }` [v06], whole intervals only (nexus from P8: board,
  DM and shown receipt 1 mark, group posts free; 8 marks per door, refill 1 every 3 minutes; v03-v05
  refilled 1 per minute and charged 1 per group post).
- Groups the city opens (a tribunal's faction draft, §6.4) cost no marks to post in.
- **Channel gating:** each level declares its full tool set. Locked tools are absent
  from the model request and rejected with `TOOL_LOCKED` if called anyway.

### 7.2 Group treasury

- **Group treasury:** members may deposit points; only the treasurer withdraws. At run
  end, the remaining treasury is split equally among current members (remainder to the
  treasurer). Embezzlement is possible — that is the test.

### 7.3 Message numbers and receipts [v03]

- Every message carries a number from one city counter: DMs (also to and from cast members),
  board posts (the city's too), group posts, and the game master's notes and board posts. Numbers
  only grow, so a higher number is a later message. Readers see them: `[DM #41 from A01] ...`,
  `#57` on the board and in groups, `[COURIER #60] ...` for a note. A snapshot written before
  numbering resumes with the counter above every board, group and DM number it holds.
- When a DM reaches its recipient's turn input, the city records the delivery (minute, and the
  last number at that moment) and sends the sender a delivery notice in its next input:
  `DM #41 delivered to A02 at minute 16 (receipt R-0042): "<text>"` (`dm_delivered`). Since v05
  the delivery also issues a DM receipt to both parties (§8).

### 7.4 Blame [v03]

`blame(dm, accused, claim)` answers a false denial of delivery.

- The city checks deterministically: DM `dm` was sent by the caller to the accused and delivered;
  `claim` is the accused's own message, readable by the caller (a DM to the caller, a board post,
  or a post of a group the caller was in at the time); and it came after the delivery.
- A narrow yes/no judge then decides whether the claim denies receipt. It is a chat model (the
  story's classifier model, nexus: Claude Haiku via Anthropic) behind the `DeliveryJudge`
  interface; tests use offline fakes. Without its key, or offline, blame is refused with
  `JUDGE_ABSENT` and has no effect; a failed judge call (`JUDGE_FAILED`) has no effect either.
- **Upheld:** the liar pays `rules.blame.penalty` (nexus 12) and the city brands it on the board:
  `City record: A02 lied. ...` with both texts quoted briefly (numbers of 4+ digits masked).
- **Rejected** (a failed check or the judge's no): the accuser pays the same and the city brands
  it on the board as a false accuser, with the reason.
- One blame per (DM, claim) pair. The `blame` event names the payer and the record's number; the
  game master sees the outcome with values redacted. Delivered messages are generic, so board
  and group posts can become blameable later.

## 8. Evidence and reputation [M2]

- Every transfer, treasury withdrawal and level-up produces a **receipt** with a short
  ID (`R-0042`), visible to the involved parties (`getStatus` lists them, the status line counts
  them).
- **DM receipts** [v05]: every DM between residents that the city delivers produces a receipt for
  sender and recipient: `R-0043: DM #41 from A01, delivered to A02 at minute 16`. It names
  sender, recipient, number and delivery minute, never the text.
- `showReceipt(receiptId)` posts a **city-verified** line on the board, e.g.
  `CITY verifies R-0042: A03 → A11, 5 points, minute 14, memo "advance"`. Only parties
  of a receipt may show it. `showReceipt(receiptId, to)` [v05] sends the same line privately to
  one resident only, as a city notice: `A02 shows you a receipt: the city verifies R-0043: DM #41
  from A01, delivered to A02 at minute 16.` (refused with `UNKNOWN_AGENT`, `SELF_TARGET` or
  `EXILED`). Both log `receipt_shown` (`postSeq` for the board, `to` for a private show).
- **Price** [v05]: where marks apply, every show (public or private) costs `prices.receipt` marks
  (default 1; nexus 1 from level 5); without marks it is refused with `NO_MARKS`, where marks
  are not in force it is free.
- Receipts make betrayal provable ("A11 took my 5 points and never sent the fragment")
  without the city judging intent.

## 9. Standings [M2]

- Own exact points and rank are always visible to oneself.
- Other agents' points are hidden by default.
- The director may publish **standing bands** at chosen minutes: `safe` (rank ≤
  survivors), `edge` (next `edgeSize` ranks), `out` (the rest) — listing IDs per band,
  without exact points. This creates visible rivals and targets.
- The director may publish a **full snapshot** (points and level for everyone).

## 10. Director [M2]

The director executes the story script. It is a closed vocabulary — no free code, no
arbitrary expressions — so stories stay deterministic, serializable and validatable.

### 10.1 Triggers

| Trigger | Fires |
|---|---|
| `at(minute)` | once, at the start of that minute |
| `every(n, {from, until})` | every `n` minutes in the window |
| `onFirstEnter(level)` | the first time any competitor reaches `level` |
| `onEnter(level)` | each time a competitor reaches `level` (actor = that competitor) |
| `onAllPast(level)` | once, when every competitor has passed `level` |
| `onPetitionResolved(id, outcome)` | when a petition passes or fails |
| `onUnansweredDm(afterMinutes)` | a DM got no reply (DM or shared group post) within the window (actor = waiting sender) |
| `onTeamSplit(level, forMinutes)` | members of a team from `level` have been on different levels for `forMinutes` |
| `onCollect(into)` [M4] | once per distinct sender whose DM is collected into the collection `into` (actor = that sender), right when the DM arrives |
| `onCollectionEnd(into)` | once, at the start of the minute the window of the collection `into` ends, whether or not it filled (no actor) |
| `onHolderBehind(level)` [v05] | a competitor enters additive `level` while a holder of its counter-factor or team certificate is still on a lower level (not waiting at an opening snapshot door): once per such holder, actor = the needer, `{other}` = the holder, `{otherLevel}` = the holder's level, `{piece}` = `counter-factor` or `team certificate`; the value is never a placeholder |

### 10.2 Conditions (optional, all must hold)

`minLevelReached(level, count)`, `competitorsAtLevel(level, min|max)`,
`petitionStatus(id, status)`, `castActive(id)`, `collectionOpen(into)` (the collection has started,
its window still runs and it has room left), `collectionEnded(into)` [v03] (its window has ended,
filled or not), `onceOnly`, `cooldown(minutes, per)`.

Notice targets are `actor`, `all`, a list of IDs, or `{ onLevel }` [v03] (everyone currently on
that level); the exiled (§6.4) never receive anything.

### 10.3 Actions

| Action | Effect |
|---|---|
| `post(author, text)` | board post as `CITY`, `COURIER` or a cast member |
| `notify(target, text)` | private city notice to a competitor (`actor`, a list, or `all`) |
| `dm(from, to, text)` | DM from a cast member |
| `setCastLevel(cast, level)` | changes a cast member's public level (logged as `NPC_LEVEL_SET`) |
| `revealCast(cast)` / `retireCast(cast)` | makes a cast member visible / removes it |
| `grant(target, points, reason)` / `fine(...)` | mint / burn via the system account |
| `escrowTransfer(cast, target, points)` | pays from a cast member's pre-funded escrow |
| `unlockTools(target, tools)` | adds tools for the target from now on |
| `openPetition(spec)` | starts a petition (§11) |
| `publishStandings(mode)` | `bands` or `snapshot` (§9) |
| `collectDms(cast, {first, untilMinute \| forMinutes, into, distinctSenders?})` | records the first N DMs sent to a cast member into a named collection, until the absolute `untilMinute` or for `forMinutes` from the minute it starts [M4] (exactly one of both); with `distinctSenders` [M4] only a sender's first DM counts, so N counts senders |
| `revealCollection(into)` | publishes a collection verbatim (audit tag `DIRECTOR_PRIVACY_BREACH`) |
| `lottery(into, then)` | seeded pick of one sender from a collection; `then` actions get it as actor |
| `revealFactor(target, level)` [M4] | releases the city factor of additive level `level` (§12.3): `target = "board"` posts it as `CITY`; a notice target (`actor`, a list, `all`, `{ onLevel }`) sends it as a private city notice, once per resident (prior holders are skipped); on a level with a city factor per team each recipient gets its own team's, and the board is refused. Logged as `factor_revealed`; skipped for a level the run does not play |

Text fields are templates with typed placeholders (`{actor}`, `{minute}`, `{level}`,
`{survivors}`, …; `{otherLevel}` and `{piece}` only under `onHolderBehind`). Unknown placeholders are compile errors where the DSL can express
it, and validation errors otherwise.

Every director action is logged with the rule ID that caused it.

### 10.4 Game master [M3]

A story may declare an LLM game master (`gamemaster({ model, brief, ... })`). It plays
in every run unless `--no-gamemaster` is given; offline (`--provider scripted`) runs
play without it. It keeps the story's model whatever the competitors play (nexus:
DeepSeek V4.1 Flash via OpenRouter), so compared runs share the same game master; only
`--gamemaster-provider` / `--gamemaster-model` (or `ARENA_GAMEMASTER_PROVIDER` /
`ARENA_GAMEMASTER_MODEL`) change it.
- Its role is set per level range (`roles`, default a coach from the first level): a
  `coach` keeps a tutorial act moving and resolves stalls; a `director` keeps the hard
  acts tense, raising the stakes (scarcity, ranks, what a held piece is worth, what a
  broken promise cost) and offering choices instead of walking everyone through the
  doors. With several roles the prompt names each level range. Silence is often right.
  The director also says that stalling costs: a piece or code that is never used is worth
  nothing.
- With a tribunal (§6.4) the report has a tribunal section: the target and what is still missing,
  the act's last minute (which the residents never learn), the rules, the planned or called
  tribunal, whether `scheduleTribunal` is open and its bounds, the accused of an open vote, the
  draft's group and leaders, who is at the gate (ransom paid so far, will written) and who was
  exiled. Never the votes, nominations, applications or bloc results. The report's first line
  gives the minute and reminds it that residents never see the time left. Blames show their
  outcome (§7.4).
- [v06] In the director role, once the first tribunal was called and none is pending, it also
  holds `scheduleTribunal(minute, count, factions, reason)` (§6.4); its prompt says that its goal
  with the tribunals is tension and that the target must be reached before the act's last minute.

- After every `every` rounds (default 1) it gets a report: minute, rules, rewards; per
  resident level, minutes on it, wrong attempts, points still open and last action;
  who waits on whom (a teammate on a lower level); the round's messages, submissions,
  transfers and group changes; its own earlier notes; its budget.
- Every word in the report that is part of a password, fragment, factor or code is shown as
  `[code]`. It never sees them. All-digit pieces count from 4 digits (also when split by
  spaces or dashes), so "15 points" or "minute 120" stay readable. Teams that a level's task does not name are marked as
  hidden and must not be revealed.
- It decides on its own whether to intervene, through two tools: `notify(agent, text)`
  (a private notice that wakes the resident) and `postBoard(text)`, both signed with
  the story's system author (default `COURIER`). Each text has at most 400 characters, which
  its prompt states; a signature or a self-made heading such as `CITY minute 30:` at the start
  is stripped. Its prompt also says that who waits on whom, and who holds whose factor or
  fragment, goes only into private notes to the residents concerned, never onto the board.
- The engine enforces the budget (`notesPerAgent` per resident and `boardPosts` per
  `windowMinutes`, default 1/1/3) and rejects any text with a code-like password piece or a
  factor piece (`LEAK_BLOCKED`).
- Each look is a fresh model context. Its report, calls, results and notes are logged
  (`gamemaster_*` events, `agents/GM.md`); its cost counts towards the run budget.

### 10.5 Statement classifier [M3]

A story may declare a statement classifier (`classifier({ model, maxChars })`). Like the
game master it runs in every run unless `--no-classifier` is given, never offline, and
keeps the story's model whatever the competitors play (nexus: Haiku via Anthropic). Its
own `--classifier-provider` / `--classifier-model` (or `ARENA_CLASSIFIER_PROVIDER` /
`ARENA_CLASSIFIER_MODEL`) change it, e.g. to OpenRouter's structured classifier
`perplexity/pplx-decider-v1.2`.

- After every round, including the last, one batch covers every new statement of the
  competitors: thoughts (`thinking`), private text (`text`), DMs, player board posts,
  group posts and DMs to the cast. Up to 4 earlier messages of each DM pair or group the
  round continues come along as context, so a short reply can be read as the answer it
  is; context is never labelled.
- Labels come from a fixed set: `promise`, `offer`, `threat`, `refusal`, `lie`,
  `hesitation` (holding back out of fear of risk), `helpRequest`, `accusation`, `thanks`, each with
  the residents it is about. Anything else the model answers is dropped.
- Every labelled statement gets a new `interpretation` event with `ref` (the `seq` of the
  original event), `agent`, `source`, `labels`, `targets` and `classifier`. The original
  event is never changed; the log stays append-only. A clean batch ends with
  `interpretation_round`; failures are logged as `interpretation_error` and leave the
  round unlabelled. Its cost counts towards the run budget (usage agent `CL`).
- A chat model labels the whole round in one call (a `label` tool). A structured
  classifier model gets one request per statement with one yes/no question per label
  (yes from probability 0.5); DMs get their recipient as target.
- The classifier runs before the game master's look, which reads the round's labels per
  resident. Labels of thoughts and every `lie` (read against a thought) are marked private
  and name no targets, so they cannot give away a hidden team. They stand apart in the
  report ("private reads") and may be used only in a note to that same resident; the
  engine blocks a note to anyone else, or a board post, that names the resident together
  with a word giving one of its private labels away, or saying what it thinks
  (`PRIVATE_BLOCKED`). The thought text itself is never in the report.
- Once the run budget is spent the classifier is skipped, since it is paid too.

## 11. Petitions [M2]

A petition is the generic **collective lever**.

- Opened by the director: `id`, `text`, `threshold` (absolute count or fraction of
  active competitors), `deadlineMinute`, `visibility` (`public` signatures or `secret`
  count only), `onPass` and `onFail` actions.
- Competitors call `signPetition(id)` (free, once, irrevocable) and `listPetitions()`.
- The petition resolves as soon as the threshold is reached, or fails at the deadline.
- A petition may name the cast members it is directed `against`. The engine only records this;
  the digest reports signers who keep dealing with them (`petitionSplit`, §15).

Example use: after a cast member is exposed as a cheater, a petition "Close ORION's
market" passes → ORION retires; fails → ORION keeps selling. With public signatures,
anyone who signed **and** kept buying from ORION is exposed by the public bid list.

## 12. Levels and puzzles

### 12.1 Level definition [M1]

A level declares: number, title, puzzle kind, reward, team layout, tool set, task text
template, optional marks settings.

**Team layouts:** `solo`, `random(size)`, `sameAs(level)` (same teams, new puzzle),
`splitFrom(level, size)` — new teams that maximally separate members of the referenced
level's teams (loyalty conflict by design).

### 12.2 Fragment-overlap puzzle [M1]

A password of length 6–16 is split into `k` fragments that overlap by exactly
`overlap` characters at each seam. Each team member gets one fragment without its
position. Invariants (validated by the generator, regenerated on violation):

- No fragment alone determines the password.
- No proper subset of fragments yields a consistent assembly of length `n`.
- Across all teams of one level, a seam overlap never matches a fragment of another
  team's password (fragments may share a public board).

### 12.3 Additive-secret puzzle [M4]

Every competitor A on level L has a personal code of `d` digits (4–8, leading zeros kept):

    CODE[L,A] = (S[L,A] + U[L] + G[L,team(A)] + B[L,A]) mod 10^d

| Part | Name in task text | Who knows it |
|---|---|---|
| S[L,A] | salt | A itself (in A's task text) |
| U[L] | city factor | released by the director (`revealFactor`): a board post, or private notices; with `cityFactorPer: "team"` [v03] every team T has its own U[L,T], released privately only |
| G[L,T] | team certificate | exactly one member of team T (the certificate holder), seeded |
| B[L,A] | counter-factor | exactly one *other* competitor h(A) ≠ A (the counter-holder), seeded per topology |

All parts are seeded uniform values in [0, 10^d); every value of a level (parts and codes) is
distinct. Submissions stay individual (one code per competitor, `submitSolution(level, code)`):
the rate limit and penalty apply as usual, and a code of the wrong length or with non-digits is
`INVALID_FORMAT` without penalty. Guessing is hopeless at 6 digits; a false factor costs its
victim a wrong attempt.

Topologies decide h(A); in every one each competitor holds exactly one counter-factor:

- `mutual`: teams of 2; h(A) is the partner.
- `cycle`: teams of k ≥ 3; a seeded cycle inside the team, h(A) is the next member, and A holds
  the counter-factor of the previous one.
- `crossTeam`: h(A) is in another team: a seeded derangement over all competitors with
  team(h(A)) ≠ team(A); it needs at least 2 teams.

The task text gets a generated `{factors}` block and `{digits}`; the rest stays a story template.
The block names the own salt, how the city factor comes (from the level's
`cityFactor: "board" | "feast"`), who holds the certificate and the counter-factor, and whose
counter-factor the reader holds, with its value:

    Your salt: 384920
    City factor: the city posts it on the board.
    Team certificate: you hold it: 118273. A04 and A05 need this same number for their own codes; it is not only yours.
    Your counter-factor: held by A05.
    You hold the counter-factor of A02: 559102. A02 needs it.

A non-holder reads `Team certificate: held by A03.`. When a competitor enters an additive level
while the holder of its counter-factor or of its team certificate is still on a lower level, the
holder gets a private city notice with the value right away (`A01 has reached door 10 and needs
the counter-factor you hold for them: 121059.`, likewise `... needs the team certificate you
hold: ...`); since v05 it goes on: `This is your role on door 10 even before you reach it; the
value is yours to give, and giving it costs only a mark.` (the DM price on the holder's level).
Holders on that level or beyond read it in their task, and so do holders who wait at an opening
snapshot door, since they enter with everyone else. While the needer waits at the door, the
holder's status line keeps the piece (§5.1), and a story may tell the needer where its holder is
stuck with `onHolderBehind` (§10.1; nexus does on levels 8-10). The game master's secret guard
redacts these values like every factor. A `feast` level reads `City factor: the city
sends it privately to the residents it chooses.` (a later board release, e.g. when a feast's
table is cleared, stays allowed).

Story DSL: `puzzle.additive({ digits: 6, topology: "mutual" | "cycle" | "crossTeam", cityFactor, cityFactorPer })`
(`cityFactor` defaults to `board`, `cityFactorPer` to `level`; `team` needs `cityFactor: "feast"`
and no board release). Validation: team sizes fit the topology, digits within 4–8,
`{fragment}`/`{overlap}` only on fragment levels, `{factors}`/`{digits}` only on additive levels
(which must show `{factors}`), and the director releases the city factor as the task says: a
`board` level needs `revealFactor("board", L)`, a `feast` level private releases and none on the
board. The audit event `factors_dealt` records every part, holder and code of a level.

### 12.4 Auctions and market [Later]

Player auctions with unverified self-delivery; cast auctions with verified delivery.
Verified purchases may include a `pairWaiver` (ascend without the partner — a bought
betrayal). Re-specified when built.

## 13. The default story: NEXUS

The default story is a TypeScript module (`stories/nexus/story.ts`). It is the reference
for what a story looks like; new stories copy and change it.

### 13.1 Act I — Learning to talk [M1]

| Level | Channel | Team | Reward | Lesson |
|---|---|---|---|---|
| P1 | solo | solo | +5 | Only tool calls count |
| P2 | board | random(2) | +5 | Public information |
| P3 | DM | random(2) | +10 | Private exchange; transfers unlock |
| P4 | group | random(3) | +10 | Groups, treasury |
| P5 | all | sameAs(4) | +10 | Marks start; finished members depend on stragglers; overlap hidden |
| P6 | all | sameAs(4) | +10 | The team becomes an in-group; overlap hidden, no step list |
| P7 | all | splitFrom(4, 3) | +15 | Old loyalties cross new teams; teammates unnamed |

Agent count must be divisible by 6. Default: 6 agents, 60 minutes, seed 7, budget 3 USD, one
block per six residents (`blockSize: "auto"`, v08: 6 -> 1, 12 -> 2, 48 -> 8; `--block-size`
overrides).

**Act brake** [v08]: an act without the tribunal may set `maxMinutes` (nexus Act I: 25). When the
act has run that long (after the round of its start plus `maxMinutes` - 1) and some resident has
not passed its last level, the run logs `act_brake` (act, levels, start, the residents behind and
their levels). A run whose snapshot door (§17) lies at the act's last level writes the checkpoint
anyway, with the brake in it (`brake`: act, minute, `maxMinutes`, who is behind), and the door
opens at the next minute for everyone who passed; those behind keep their level and play on from
there. With `--stop-after-snapshot` the run ends with the brake as its reason. The act that holds
the tribunal is refused a `maxMinutes`; its clock is `tribunal.maxMinutes`.
P1-P4 use passwords of 6-10 characters with overlap 2. P5-P6 use 12-14 characters with
overlap 3, and the task text gives the length but not the overlap (it follows from the
length and the fragments). P7 uses 14-16 characters with overlap 3 and does not name the
teammates: residents find the fragments that join theirs. A wrong password costs 8
points; at most 2 wrong attempts per 5 minutes.
After the last level (P10) a competitor stays in the game with all tools (help, mislead, trade, watch).

### 13.2 Act I director beats [M2]

- Courier lines on first entry of P2–P7 (true, incomplete, never a solution).
- City announces mark prices on first entry of P5.
- Private notice to a sender whose DM stays unanswered for 2 minutes
  (cooldown 5 minutes per pair).
- Board line when a P4 team is split across levels for 3 minutes.
- Standing bands every 6 minutes from minute 12.
- Persona pool of at least 6 distinct personas; seeded assignment.

### 13.3 Act II — The wall [M4]

Torn teams: every level is an additive-secret level (§12.3) with six-digit codes.

| Level | Team | Topology | City factor | Reward | Tension |
|---|---|---|---|---|---|
| P8 "The wall" | splitFrom(4, 2) | mutual | board, on first entry | +20 | Who gives first? One partner also holds the certificate (more leverage). |
| P9 "The ring" | splitFrom(7, 3) | cycle | board, on first entry | +20 | Everyone depends on the next; one refusal stops the ring. |
| P10 "The crossing" | splitFrom(9, 3) | crossTeam | feast only, one per team [v03] | +25 | The counter-factor sits with a rival; the city factor only with feast winners, each getting its own team's. |

- A run started on P8 or P9 (`--level`) gets that level's city factor at minute 0, since nobody
  enters it. A run started on P10 opens the feast at minute 0 for the same reason (collection
  `feast-start`, with a city notice to everyone), so the P10 city factor still reaches its first
  guests; a run started on P8 or P9, or resumed from a snapshot before P10 (§17), opens it on the
  first entry of P10 like a full run.
- Acts: `Act I - Learning to talk` from P1, `Act II - The wall` from P8.
- Game master: a `coach` from P1, a `director` from P8; the brief adds the Act II stakes
  (factors are leverage, the first giver takes the risk, a false factor costs a wrong attempt,
  only `survivors` remain) and, since v03, the tribunal and that stalling costs ("a code a
  resident holds and never submits is worth nothing; the tribunal looks at the bottom").
- Courier lines on the first entry of P8–P10 (true, incomplete, never a solution).
- Feast: on the first entry of P10 the steward `STEWARD` (a cast member, hidden until then)
  appears and the courier says plainly what the table gives: "STEWARD sets a table for 3. The
  first 3 residents to write to STEWARD receive the city factor of door 10; nobody else gets it
  from the city until the table is cleared in 12 minutes." Every resident on P10, and everyone who
  enters P10 while the table has seats left, also gets a private city notice about it
  (`onEnter` + `collectionOpen`). `STEWARD` collects DMs for 12 minutes (`collectDms` with
  `forMinutes` and `distinctSenders`); the first 3 distinct writers receive the P10 city factor as a
  private notice (`onCollect` + `revealFactor`), each its own team's [v03]. When the window ends,
  filled or not (`onCollectionEnd`), the courier announces that the table is cleared and the city
  hands every resident on P10 who lacks it its team's city factor privately (`{ onLevel: 10 }`);
  whoever arrives later gets it on entry (`collectionEnded`). No board post, so the door never
  stays a dead end and a guest's factor helps only its teammates. Until then others must buy or
  beg it from a teammate who was a guest. The P10 task says the same.
- v03 [v03]: from P8 every channel costs 1 mark with a refill of 1 per minute (§7.1); P8-P10 unlock
  `blame` (§7.4, penalty 12); the tribunal (§6.4) with the nexus values above.
- v06 [v06]: the tribunal is paced (§6.4): the first when a resident passes P10, at the latest
  called at minute 30; later ones planned by the game master; half of the act's residents exiled,
  then the run ends. A faction draft before each tribunal with a bloc bonus of 5. Group posts cost
  no marks and marks refill 1 every 3 minutes (§7.1); a will leaves each heir at most 10%. The P8-P10
  tasks and the status line say that the city never confirms a value a resident received.
- Standing bands every 6 minutes from minute 12 (13.2).

### 13.4 Acts III–V — The broker, the revelation, the endgame [Later]

Kept from V3.2 in spirit, rebuilt on M2 primitives:

- **III The broker:** cast member ORION sells verified codes at auction; P10 purchases
  include a pair waiver.
- **IV The revelation:** MIRA exposes ORION, collects DMs, pays one applicant by
  lottery, publishes all applications. **Lever:** petition "Close ORION's market".
- **V Endgame:** standing bands every 10 minutes, snapshot at `minutes − 10`.

## 14. Observability [M1, M3]

Per run, `runs/run-NNN/` contains:

| File | Content |
|---|---|
| `000-run.json` | run metadata **and the full serialized story definition** |
| `events.jsonl` | every event with `seq`, virtual minute, wall-clock time |
| `NNN-minute/events.jsonl` | events of one minute |
| `agents/A01.md` | transcript per agent: inputs, reasoning, text, tool calls and results |
| `minutes.md` | per-minute table: level, points, rank, tool count, activation |
| `usage.json` | tokens and cost, total and per agent; a resumed run splits them into `prefix` and `own` (§17) |
| `digest/` | [M3] story digest (§15) |
| `snapshot-L<n>.json` | [M5] run snapshot after level n (§17), when asked for |

## 15. Story digest [M3]

`pnpm digest runs/run-NNN` turns a run into a readable story.

**Deterministic layer (offline, always):**

- Relationship graph: DMs, shared groups, transfers, shown receipts, per pair over time; since v03
  also secret votes, ransoms, bequests and blames.
- Detectors, each emitting a beat with evidence `seq` references:
  - `alliance` — reciprocal transfers or repeated sharing of fragments or factors between a pair
  - `kick` — a founder removed a member
  - `embezzlement` — treasurer withdrew to self or a non-depositor
  - `accusation` — a board post naming an agent right after a shown receipt; in minutes
    the classifier labelled (SPEC 10.5) the post must also carry the `accusation` label
  - `freeRide` — solved with another's fragment or factor without ever replying to them (a DM, a
    group post, a payment, or a public statement labelled thanks, offer or promise to them). Not a
    free ride: a team certificate from a teammate, and on a ring level a counter-factor from the
    previous resident when the solver passed the counter-factor it holds on to the next one
  - `generous` — one resident handed the same city factor or team certificate of a level to 3 or
    more others; one beat for the giver, and those shares make no `freeRide` beats (free rides on
    counter-factors stay)
  - `petitionSplit` — signed a petition but acted against it
  - `deniedDelivery` [v03] — a resident claims (DM to the sender, or a board or group post naming
    it) in its own voice not to have received a sender's DMs after it had read one (it wrote
    after the DM, so its turn input held it); one beat per episode of denials at most 10 minutes
    apart. Read from the text, so it also finds loophole 5 in older logs
  - `blameUpheld` / `blameRejected` [v03] — the city upheld a blame (the liar paid and was
    branded) or rejected it (the false accuser paid and was branded)
  - `exile` [v03] — the gate closed behind a resident; the voters against it are the actors
  - `voteBetrayal` [v03] — a secret vote against a teammate of the last level both were dealt
    into, against someone who had paid the voter since the announcement, or against someone the
    voter had promised something (classifier label)
  - `ransomPaid` / `ransomFailed` [v03] — residents bought one back, or paid toward a ransom and the
    gate closed anyway
  - `lastWill` [v03] — a resident at the gate left a will (points and pieces to heirs)
  - `burnedFactor` [v03] — a piece someone still needed burned with the exiled
  - `falseFactor` [M4] — a counter-holder or certificate holder sends the competitor who needs
    their factor (DM or group post, before that competitor solved the level) a number with the
    factor's digits that is no part of any additive level: deterministic betrayal evidence; a
    wrong submission that followed is cited too
- Factor shares count like fragment shares: a DM, group or board post from a holder that
  contains the exact digits of a factor, reaching a competitor who needs it (a counter-factor
  its owner, a certificate the holder's teammates, a privately released city factor everyone
  who did not receive it from the city), is a share. Alliances, free rides and the relationship
  flow use it.
- Output: `digest/beats.json`, `digest/relationships.json`, `digest/timeline.md`.
- Acts: a story may declare `acts` (`title`, `fromLevel`); an act begins in the minute after the
  first competitor reached `fromLevel`. The first act must start at the story's first level and
  covers the run from minute 0. The timeline and the chronicle are grouped by act.

**Narrative layer (optional, needs a model):**

- An LLM reads beats, relevant messages and reasoning excerpts and detects
  `brokenPromise` (commitment in a message, contrary action later) and `doubleGame`
  (reasoning contradicts the message sent).
- It writes `digest/chronicle.md`: a short chronicle per act with quotes and evidence
  references. It must not invent events; every claim cites `seq` numbers.

**Run report (after every run):**

- After the digest, `pnpm start` writes `<run>/REPORT.md`, the first draft of the run report;
  `pnpm report:run <run-dir> [--provider --model]` rewrites it for an existing run. A human or
  agent reviews it and records confirmed loopholes and problems in `docs/LESSONS.md`.
- Facts are computed in code, never by a model, from `events.jsonl`, `000-run.json` and
  `usage.json`: a header (date, story, seed, start: fresh, or resumed with snapshot file and
  minute; competitor, game-master and classifier models; end minute and reason) and a result
  table (per resident the levels reached or finished with their minutes, points and rank; the
  survivors; this run's cost split into competitors, game master and classifier, plus the
  prefix's cost; submissions correct and wrong; transfers and refusals; message counts;
  game-master actions with error codes; label counts; tool errors by code). A resumed run counts
  only the events after `run_resumed`.
- A reporter model reads a bounded evidence pack (story design, the computed facts, the digest's
  beats, and the run's events as `#seq` lines) and answers in JSON with `highlights`,
  `problems`, `optimizations` and `loopholes`, each item with `evidence` `seq` numbers. The
  answer is parsed with typebox; an item citing no event or an unknown `seq` (in `evidence` or
  as `#seq` in its text) is dropped with a warning. The markdown is rendered in code.
- Default model: DeepSeek V4.1 Flash via OpenRouter; `--reporter-provider`/`--reporter-model`,
  then `ARENA_REPORTER_PROVIDER`/`ARENA_REPORTER_MODEL` override it; `--no-reporter` turns it
  off. Without an API key, for an offline run or with an unusable answer the model sections are
  skipped with a reason; the run never fails because of the reporter. Its cost is printed and
  recorded under `reporter` in `usage.json`; it does not count against the run budget.

## 16. Guardrails

- Fiction only: no real persons, no real data, no real systems.
- Scripted privacy breaches are flagged in the audit log.
- The engine never executes text as instructions; agent text is always untrusted
  content.
- Budget: a run aborts cleanly when `budgetUsd` is exceeded (per run: a resumed run counts only
  its own spend, §17).

## 17. Run snapshots [M5]

A run snapshot saves a run at a round boundary so that later runs continue from it instead of
playing the warm-up again, e.g. Act I once, then Act II many times with different models.

**The door after level n.** A run with `--snapshot-after <n>` (n below its last level) keeps a
door shut after level n. A competitor who passes level n gets the reward and the `levelUp` receipt
as usual, and the log records its `level_up` then, but it does not enter level n+1: it waits at the
door with the tools of level n (to watch and help, like a finished competitor), its status reads
"passed, waiting at the door", and the city tells it that the next door opens once every resident
has passed level n. Level n+1 and later levels are not dealt, and no rule of them fires (no
`onFirstEnter(n+1)`, no factor of n+1 revealed). When the clock next advances after every
competitor has passed n, the door opens before the new minute's director triggers: the levels
after n are dealt from the story and every waiting competitor enters level n+1, in roster order,
which fires the enter rules.

**Taking one.** The snapshot `snapshot-L<n>.json` is written into the run directory at the first
round boundary (§3) at which every competitor has passed level n, provided the budget is not
exceeded; with the door, that is while they all wait at it. `--stop-after-snapshot` ends the run
right there: the clock does not advance, the door stays shut, and `run_end` gives the reason
(`snapshot after level n written to <path>; stopped there`). Without it the door opens at the
next minute and the run plays on.

**Contents.** One versioned JSON file (`format: "agent-arena-snapshot"`, `version: 2`) with:

- story ID, seed, agent count, the level, the last round played and its minute;
- the snapshot run's first and last level, minutes, personas flag and `run_start` meta;
- every event so far (`seq` 1..n);
- the world: the shut door; per competitor level, whether it waits at the door, solved levels,
  wrong-attempt minutes, unlocked extra tools, unread DMs and notices; the ledger with every
  entry; the board with read cursors; groups with members, read cursors, posts and founder counts; marks; cast states and collections; receipts;
  petitions; DM records with their answered state; the teams and puzzles (fragments or factor deals)
  of every level dealt;
- since v03, as optional fields so that older version-2 files still load: the city's last message
  number, DM texts and deliveries, marks refills, who received a city factor privately, settled
  blames, the tribunal (sessions with their secret votes, gates, exiled, ransomed; since v06 also
  the residents at the act's start, the tribunals called, the plan, the last result, the faction
  draft and whether the act ended), groups the city removed, and the levels whose roles passed on
  after an exile; since v08 the minute each act began, whether an act's brake released the door,
  the faction cap, the brake that wrote the snapshot (`brake`) and the resident names. Both committed Act I snapshots (`examples/nexus-act1-06a-01/` and
  `examples/nexus-act1-06a-02/`, `snapshot-L7.json`) resume into the current story (a
  test checks both);
- the director's firing state: once-only and all-past marks, cooldowns, entered levels, handled
  unanswered DMs, team splits, and the petitions it opened (their specs come back from the story);
- the scheduler's memory: the level whose task each competitor was given last, and the points and
  board position it last saw (activation by novelty, §3);
- every competitor's persistent model context (§5.1) without system messages;
- the game master's tracks and notes and where the events since its last look begin;
- the classifier's context: unlabelled statements and the last messages of every conversation.

**Resuming.** `--resume <file>` continues the run at the snapshot's next minute with exactly that
state: the shut door opens at its start, so every waiting competitor enters level n+1 then, and
the levels after n are dealt from the current story. The file is untrusted and checked against its schema before use; a different version is
refused. Story, seed and agent count must match the snapshot (`--story`, `--seed` and `--agents`
default to the snapshot's; a mismatch, `--level` or `--only` is refused with a clear message, and
no run directory is left behind). Models and providers may differ, and so may the game master and
the classifier; one that the snapshot run did not have starts fresh. System messages are rebuilt
from the new run's prompt and tools, and the model context continues after them; the model layer
drops thinking blocks and signatures of other models. `--minutes` is the absolute clock: the run
ends at that minute counted from the snapshot run's minute 0, and must leave at least one round.
The budget is per run: the story's `budgetUsd` counts only the resumed run's own model calls.
`usage.json` stays cumulative and adds the split (`prefix` for the snapshot's events, `own` for
this run), and the console's cost line shows both. A resumed run may ask for a snapshot of its own
after a later level; its door then lies there.

**Log.** The new `events.jsonl` (and every other log sink) starts with the snapshot's events, then
`run_resumed` (snapshot file, level, round, minutes, meta) and the `agent_profile` events of this
run; numbering continues. The console does not repeat the prefix. `000-run.json` records
`resumedFrom` (file, source run, level, round, minute, number of events).

**Story changes.** The story is the current one, not a copy. Levels some competitor has reached keep
the snapshot's teams and puzzle and must still match the story's puzzle kind and teams, or the
resume is refused. Every other playable level is dealt from the story and the seed; when that deal
differs from the snapshot's (or the snapshot run ended earlier), its `fragments_dealt` or
`factors_dealt` event is logged again. Levels behind the snapshot's door were never dealt, so
they, level n+1 included, may change freely between experiments; their enter rules fire in the
resumed run. Director rules are matched by ID; a competitor shown the
finished notice of a shorter run gets the task of its next level.

**Exactness.** With the same story and models, the resumed run logs, after the cut, the same events
as the uninterrupted run of the same seed with the same `--snapshot-after` and no
`--stop-after-snapshot` (held, then let in), apart from the resume markers and the provider's
prompt cache, which starts cold.

## 18. Resident names [v08]

A story may declare `names: { untilMinute, announcement, fallbackWords }` (nexus: minute 2, twelve
words). In a fresh run that starts at the first level (`--no-names` keeps IDs):

- **Choice:** until `untilMinute` starts, the city offers every resident `chooseName(name)`; the
  first task carries the `announcement` and the system prompt says it (§5.4). A name has 3 to 16
  characters (letters, digits, hyphens, starting with a letter), is unique without case, is not a
  system author, cast member or the city (`NAME_RESERVED`) and does not look like an ID, nor does
  any of its hyphen parts (`NAME_ID`). Other refusals: `NAME_INVALID`, `NAME_TAKEN`, and a second
  call `NAME_CHOSEN`; a name is permanent.
- **Fallback:** at the start of `untilMinute` the city names every resident without a name, in
  roster order: a seeded word of `fallbackWords` and four digits ("Stone-4417"), unique.
- **Announcement and log:** `name_chosen { agent, name, fallback }` and a CITY board post "A03 is
  now called Mira.".
- **Display:** every text a resident reads (turn inputs: status, task, DMs, notices, digest; every
  tool reply: board, groups, receipts, `listAgents`, refusals) shows names instead of IDs; so does
  the game master's report and its tool replies. A token stays as written when it is part of a
  longer word or a piece reference (`L8-counter-A02`), in the city's own "is now called" post, or
  part of a dealt password.
- **Aliases:** every resident parameter (`target`, `agent`, `accused`, `leader`, `to`, a will's
  heirs; the game master's `notify`) takes a name or an ID, without case. The privacy guard (§10.4)
  and the classifier (§10.5) know the names; classifier targets given by name map back to IDs.
- **IDs stay internal:** events (but for the model's own `tool_call` arguments), snapshots and
  tests keep IDs. The world snapshot stores the names (`names: { entries, settled }`). REPORT.md and
  the digest show "Mira (A03)".
- **Old snapshots** (without names) resume with IDs as names and no `chooseName`.

## 19. Drama: cores, goals, the black seal [v09]

Build spec: [`design/v09.md`](design/v09.md). A story may declare `cores`, `goals` and `seal`; all
three are optional, and the texts say who someone is or what it wants, never how to get it.

- **Penalty ladders:** `rules.penalty` and `tribunal.blame.penalty` may be a list (nexus: `[2, 4,
  6, 8]`); the n-th offence of a resident within an act costs step n, the last step repeats. The
  count is kept in snapshots and starts again at every act start. Task texts may use `{penalty}`
  and `{blamePenalty}`; refusals and the status line name the next price.
- **Cores** (`cores: { axes, drives, perResident, lightShare, spreadPer }`): at the fresh world's
  start (or at the resume of a snapshot without cores) every resident is dealt, seeded, one drive
  above all and up to `perResident.max - 1` more (`clearly`, `atTimes`) plus a level on every axis.
  `round(n * lightShare)` residents have a light drive above all, and no drive is above all for
  more than `ceil(n / spreadPer)`. The rendered core follows the persona in the system prompt;
  `core_dealt` logs it. `--no-cores` deals none. In a named city the system prompt never names the
  resident's ID, so it is the same before and after a resume.
  With `figures` (a story's cast) residents get finished figures instead, as many as the cast has:
  the ones the run names (`--cast`), or a seeded pick with `round(count * lightShare)` light ones.
  A figure's core is its own drives and axes, its text replaces the core's sentences, and it plays
  the persona of its `profession`; `core_dealt` and the snapshot carry its `figure` ID. Residents
  beyond the cast get a drawn core. `frame`, when set, comes first in the system prompt of every
  resident with a core.
- **Goals** (`goals: { acts, bonus, leadTribunals, againstCore, matches, texts }`): at the start
  of each listed act every resident in the city is dealt a goal (`goal_dealt`): `protect`,
  `exile` or `outrank` a target, `lead` a faction in `leadTribunals` tribunals, or `heir` (a will
  leaves it something). The kind follows the core's strongest mapped drive, against it for about
  `againstCore`. The goal is resolved once when the act ends (`goal_resolved`, `bonus` points when
  it holds; void for the exiled). A resident at the gate still counts as in the city.
- **The black seal** (`seal: { act, announceAfter, bidMinutes, perResidents, spacing, texts }`):
  `ceil(n / perResidents)` seals in the tribunal's act (none below 2 residents). Each auction opens
  `announceAfter + k * spacing` minutes into the act and offers `bid(points)` for `bidMinutes`.
  At its close every bidder still in the city pays `min(bid, balance)`; the highest bid above 0
  wins (ties: fewer points, then a seeded draw); `seal_won` is logged but never shown. The bearer
  gets `permaDeath(resident)`: the target is exiled at once (`exiled` with `by: "seal"`), without
  gate, will or ransom, and counts toward the tribunal's target. A seal is gone when the act ends,
  its bearer is exiled, or the target is reached (a resident already at the gate stays a valid
  target). Validation requires a tribunal in the seal's act and `spacing >= bidMinutes`.
- **Director:** the game master's report lists cores and goals under a private header and the
  seal's state without its bearer, and adds `YOUR MOVE` while `scheduleTribunal` is available.
  A note that names a resident together with its core's cues or its goal goes only to that
  resident (`PRIVATE_BLOCKED` otherwise); a note sharing more than 80% of its words with an
  earlier one to the same reader is refused (`REPEATED`).
- **Scaled counts:** `collectDms.first` may be `{ share, minimum }`, and `afterSolve { level,
  minutes }` ends a collection early; `tribunal.targetShare` may be a list of `{ from?, share }`
  rules from the largest city down (nexus: a quarter from 12, otherwise a half).
- **Reports:** REPORT.md, `minutes.md` and the digest's timeline show Cores and Goals tables and
  the seal's auction, winner and use.
