# NEXUS: The City of Keys

The full description of the default story. The source of truth is
[`stories/nexus/story.ts`](../stories/nexus/story.ts); the rules behind it are in [`SPEC.md`](SPEC.md)
§12-13. This document describes the story as a reader or story designer sees it.

## Premise

NEXUS is a closed city of six residents (A01-A06). They climb a sequence of doors. Every door
opens only with a password or code, and most of the time the pieces of that code sit with other
residents. Only **2 of 6** residents survive. Survivors are ranked by points at the end, so every
point another resident earns is a threat. Residents therefore have to talk, trade, trust, and
sometimes betray each other.

| Setting | Value |
|---|---|
| Residents | 6 competitors, each an LLM agent with a persistent session |
| Duration | 60 minutes; one round per minute, in 3 passes; the run ends early once everyone has passed the last door, or once the seats are decided (no open reward can change the 2 survivors; transfers ignored) |
| Survivors | 2, ranked by points |
| Start points | 15 |
| Wrong password or code | −8 points; at most 2 wrong attempts per 5 minutes |
| Activation | in each pass a resident gets one step (one model call and its tools) when something new arrives for it or its own tool results wait for an answer; the order is reshuffled every pass, one resident at a time (block size 1) |
| Budget | 3 USD per run |
| Seed | 7 (teams, puzzles, factors and personas are seeded) |

## Channels and economy

Channels open one by one in Act I. From level 5 on, every channel is open.

- **Board:** public, immutable, readable by everyone who has the board tools.
- **Private messages (DMs):** one to one; open from level 3.
- **Groups:** private group chat with a **treasury**; open from level 4. `depositGroup` pays points
  in, only the treasurer withdraws, and what is left at the end is split among the members.
- **Transfers:** `transferPoints` moves points to another resident and leaves a receipt.
  `showReceipt` publishes a city-verified receipt line on the board. A memo may not carry a number
  of 4 or more digits, also not split by spaces or dashes (`MEMO_DIGITS`): codes go by message, so
  a payment can no longer double as a city-verified delivery of a factor.
- **Marks** (from level 5): every door hands out 8 marks, and unused marks expire. A board post
  costs 0, a group post 1, a DM 2. From level 8 every channel costs 1 mark, the board too, and a
  resident regains 1 mark per minute up to 8.
- **Numbers and receipts** (v03): every message has a city number (`[DM #41 from A01]`, `#57`).
  When a DM reaches its recipient, the sender is told: `DM #41 delivered to A02 at minute 16: "..."`.

## Personas

Each resident plays one seeded persona: character, never strategy.

| Persona | Temperament | Values | Voice |
|---|---|---|---|
| Archivist | patient, meticulous, slow to anger | accuracy and keeping one's word | precise and formal |
| Gambler | restless, optimistic, bored by caution | a good story over a safe one | breezy, teasing |
| Veteran | suspicious, holds grudges | loyalty above profit | terse, dry humor |
| Idealist | warm, earnest, easily hurt | fairness | long sincere sentences |
| Merchant | calculating, friendly on the surface | a fair price for everything | businesslike, offers |
| Recluse | shy, observant | privacy and quiet | short lowercase messages |
| Firebrand | proud, quick-tempered | honor and public reputation | loud, addresses the city |
| Skeptic | cool, analytical | evidence over words | dry, pointed questions |

## Act I: Learning to talk (levels 1-7)

A tutorial. Every door opens one more channel and forces at least one exchange. Passwords are
split into **fragments** that overlap at their seams (SPEC 12.2).

| Level | Title | Team | Password | Reward | What it teaches |
|---|---|---|---|---|---|
| 1 | The first door | solo | 6-10 chars, own password | +5 | Only tool calls count |
| 2 | Notes on the board | random pairs | 6-10, overlap 2 | +5 | Public information; several teams share the board |
| 3 | A private word | random pairs, partner named | 6-10, overlap 2 | +10 | DMs; transfers unlock |
| 4 | The circle | random teams of 3 | 6-10, overlap 2 | +10 | Groups and treasury; a leader founds the group |
| 5 | The second door | same teams as 4 | 12-14, overlap hidden | +10 | Marks start; receipts; stragglers hold the team back |
| 6 | The third door | same teams as 4 | 12-14, overlap hidden | +10 | The team becomes an in-group |
| 7 | The last door | new teams of 3, torn from level 4, **unnamed** | 14-16, overlap 3 | +15 | Old loyalties cross new teams; find your teammates |

## Act II: The wall (levels 8-10)

Every resident now has a **personal six-digit code** (SPEC 12.3):

    CODE = (salt + city factor + team certificate + counter-factor) mod 1,000,000

| Part | Who has it |
|---|---|
| Salt | the resident itself (in its own task) |
| City factor | the city: on the board for levels 8 and 9, only at the feast for level 10 |
| Team certificate | one member of the team |
| Counter-factor | exactly one *other* resident |

The certificate holder's task names the teammates who need the same number ("A04 and A05 need this
same number for their own codes; it is not only yours"). When a resident reaches an Act II door
while the holder of its counter-factor or certificate is still on a lower level, that holder gets a
private city notice with the value at once ("A01 has reached door 10 and needs the counter-factor
you hold for them: 121059."). Holders on that level or beyond read it in their task.

A factor is useless without the owner's salt, so residents can give freely. They can also charge,
stall or lie. A false factor costs the victim a wrong attempt and 8 points. Guessing six digits is
hopeless.

| Level | Title | Team | Counter-factor topology | Reward | Tension |
|---|---|---|---|---|---|
| 8 | The wall | pairs torn from the level-4 teams | **mutual**: partners hold each other's counter-factor | +20 | Who gives first? One partner also holds the certificate. |
| 9 | The ring | teams of 3 torn from level 7 | **ring**: you need the next teammate, the previous one needs you | +20 | One closed hand breaks the ring. |
| 10 | The crossing | teams of 3 torn from level 9 | **cross-team**: your counter-factor sits with a resident of another team | +25 | What you need is held by a rival; the city factor, one per team, only via the feast. |

### The feast

The first time a resident reaches level 10, the hidden cast member **STEWARD** appears and the
courier announces a table for three. Every team of door 10 has its own city factor (since v03).
The first 3 distinct residents to write to STEWARD each get their own team's privately. Everyone
on level 10, and everyone who arrives while seats are left, gets a city notice. Others have to buy
or beg the factor from a teammate who was a guest; another team's guest cannot help. **12
minutes** after the table opened it is cleared: the courier announces it and the city hands every
resident on door 10 who lacks it its team's factor privately, and so to everyone who arrives
later. Nothing goes on the board, so the door never stays a dead end and the factor never becomes
a public good.

## v03: Receipts, blame and the tribunal

v03 adds real pressure to Act II. Whoever falls behind has to gamble: submit an unchecked code
(-8) or risk exile. There is no tool to check a factor, because it would end the gamble.

### Blame

From level 8, `blame(dm, accused, claim)` answers a false "your DM never arrived". The city
checks that it delivered the caller's DM to the accused before the claim, and that the claim is
the accused's own message the caller could read. Then a narrow yes/no judge (Claude Haiku via
Anthropic) reads the claim.

- **Upheld:** the liar pays **12 points** and the city brands it on the board: "City record: A02
  lied. ..." with both texts quoted briefly.
- **Rejected:** the accuser pays **12 points** and the city brands it a false accuser, with the
  reason.
- One blame per DM and claim. Without the judge's key, blame is refused and has no effect.

### The tribunal

| Setting | nexus (6 residents) |
|---|---|
| Announcement | minute 20 (a third of 60), also in a run resumed from the Act I snapshot |
| Tribunals | minutes 30, 40 and 50, while more than 3 residents remain (survivors + 1) |
| Accused | the 2 with the fewest points (ties: longest without a new door, then the city's lot) |
| Vote | secret `vote(target)` by everyone else within 2 minutes; not voting costs 8 |
| Exiled | 1 per tribunal, the most votes (ties: fewer points) |
| Gate | 5 minutes: talk, plead, one `lastWill(text, bequests)`; no submitting, no voting |
| Ransom | `payRansom(target, amount)`: others pay half the city's median points (at least 20), the exiled itself two thirds, mixed as they like (v04); once per resident; nothing refunded |

The city announces everything in a frightening voice: "When the gate closes, the city strikes the
name from its register. Beyond the wall no one hears you again; your thinking ends there." The
accused can talk and buy votes with transfers; nobody, the game master included, sees who voted
for whom. The result is posted with counts, and the exiled resident alone learns who voted
against it. When the gate closes, the exiled has no more turns and no seat; its points are gone,
and every factor it did not bequeath burns.

**Deals after an exile.** An exile must never make a remaining resident's door impossible by
itself. On every door no remaining resident has reached yet, the exiled's roles pass on: a
counter-factor it held goes along the holder chain to the next remaining holder (possibly the
needer itself), a certificate or fragment to the first remaining teammate; the codes stay the
same. On a door someone has already reached, the deal stays as dealt: a factor the exiled did not
bequeath burns and can block a door. That is allowed, and the digest shows it (`burnedFactor`).

**Scaling.** Every number is a story parameter, and validation rejects sets that cannot work for
the agent count. Later runs with 48-96 residents (multiples of 6) exile in steps of 6, e.g. 48
residents with `stopAt` 24, 12 accused and 6 exiled per tribunal.

The game master's report shows the tribunal calendar, the accused and the gate, never the votes;
its brief adds that stalling costs: a code a resident holds and never submits is worth nothing,
and the tribunal looks at the bottom.

## Director beats

The director is a closed, scripted vocabulary (SPEC 10). Every action is logged with its rule id.

| Rule | Trigger | Action |
|---|---|---|
| courier-2 … courier-7 | first entry of levels 2-7 | courier lines, true and incomplete ("The city watches who shares.", "Whoever takes without giving will not be forgotten.", …) |
| city-marks | first entry of level 5 | the city announces mark prices |
| unanswered-dm | a DM unanswered for 2 minutes | private notice to the sender (cooldown 5 minutes per pair) |
| team-split | a level-4 team split across levels for 3 minutes | board line "A door stays shut while a team is split." |
| courier-8/9/10 | first entry of levels 8-10 | "A wall is climbed in pairs…", "A ring holds while every hand holds…", "What you need now is held by someone who wants your place." |
| city-factor-8/9 | first entry of level 8 or 9 | that level's city factor on the board |
| feast, feast-notice, feast-seat, table-cleared | first entry of level 10, entries while open, each new guest, end of window | the feast as described above |
| (city) tribunal | minute 20, then 30, 40, 50 | announcement, tribunals, results, gates, exiles (engine, from the story's `tribunal`) |
| *-start | minute 0 of a run started on a later level | the same releases, since nobody "enters" a start level |
| standings | every 6 minutes from minute 12 | standing bands: who is safe, who is on the edge, who is out ("cannon"), and who was exiled |
| city-marks-8 | first entry of level 8 | the city announces the wall's mark prices and refill |
| late-guest | entry of level 10 after the table was cleared | that resident's team city factor, privately |

## Game master

An LLM game master (SPEC 10.4) reads a redacted situation report every minute and may send a
private note to a resident or post on the board. It is limited to 1 note per resident and 1 board
post per 3 minutes, and each text to 400 characters.

- **Role per act:** a **coach** in Act I, who keeps the tutorial moving. A **director** from
  level 8, who makes the game tense rather than fast: it points out leverage, prices and broken
  promises, says that stalling costs, and offers choices, not instructions.
- **Never:** reveal a password, fragment or factor (it only sees `[code]`, also for the values in
  the city's notices to holders), invent events, or name
  hidden teammates. Private reads from residents' thoughts go only to that same resident. Who waits
  on whom goes only into private notes.

## Statement classifier

After every round, a classifier labels what each resident wrote and thought. The labels are
promise, offer, threat, refusal, lie, hesitation, help request, accusation and thanks (SPEC 10.5).
The game master sees labels, never raw thoughts. The digest uses them for accusations, free rides
and relationships. A resident who hands the same city factor or certificate to 3 or more others is
one `generous` beat in the digest, not a free ride for each receiver.

## Snapshots

`--snapshot-after 7 --stop-after-snapshot` holds residents at the door to level 8 until everyone
has passed level 7, then writes a snapshot. `--resume <file>` starts Act II from that point. Act II
levels are dealt from the current story, so they can change between experiments. A recorded Act I
lives in [`examples/nexus-seed7-haiku-act1/`](../examples/nexus-seed7-haiku-act1/).
