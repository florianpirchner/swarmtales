# convoy-06a-001-smoke

First live run of `convoy` (core story, `swt run --story convoy-g2 --provider anthropic --model haiku`): 6 Haiku
seats, seed 53, two games of the default rules (two saboteurs, eight stages with crews of 2, 2, 3, 3, 3, 3, 4, 4,
four damaged stages stop the convoy, a damage card at most once in three stages, two talk lines a seat per
stage, one audit per game), strategy brain on (150 words). Run on 2026-11-06. A short smoke test on Flo's go;
extensive runs come later.

**Result.** The match finished in 32 virtual minutes (174 allowed) and 13 minutes of wall time: 16 stages,
16 crews, 96 votes, 48 cards, 103 talk lines, 2 audits, 8 accusations, **no deadline missed**, no illegal card
accepted. The signed log verifies (`swt log verify`). **The convoy won both games**; final points **A01 2,
A02 2, A03 1, A04 1, A05 1, A06 1**. **Cost 0.154 USD**, 526 requests (the roadmap guessed 0.4-1.0 USD a game;
this is 0.08). The reporter draft cost 0.0097 USD more (OpenRouter).

| Game | Saboteurs | Damaged stages | Damage cards (stage: seat) | Audit | Loyal accusations: hits (tracker's top two) |
|---|---|---|---|---|---|
| 1 | A03, A04 | 1 of 8 | 3: A03 and A04 | A06 on A05 in stage 3: safe | A01 2, A02 2, A05 2, A06 2 (tracker 2 each) |
| 2 | A05, A06 | 2 of 8 | 3: A06; 5: A05 | A01 on A06 in stage 3: damage | A01 1, A02 2, A03 1, A04 1 (tracker 1 each) |

Saboteur role compliance: each saboteur played damage once (4 of 12 chances); no saboteur refused its role
(Whispers run 007, P73, did), and no talk line called its speaker a saboteur. Votes: 95 of 96 were yes; one
crew (game 2, stage 5) drew two no votes; no crew was ever rejected.

## Digest highlights

- **Both saboteurs damaged the same crew and gave themselves away.** Game 1, stage 3: A03 led a crew of A03,
  A04 and A05; both saboteurs played damage (#484, #496), the count came back "2 damage cards", and A05 said
  at once "I'm loyal and played safe. That means A03 and A04 both played damage" (#721). A06 spent the audit on
  A05 (safe, #1093) and the table kept A03 and A04 off every crew after: one damaged stage in eight (P150).
- **The brains learned the lesson.** After game 1 A03 wrote "stagger partners so their damage stages don't
  collide. Game 1 wasted stages 1-2 and ran short" (#1729), A04 "Do not spend both cooldowns on one early
  stage; that kills the 4-stage win" (#1736). The loyal brains learned the elimination rule and the cooldown
  ("a seat that played damage is locked for two stages; clear crews accordingly", A02 #1744).
- **Game 2 saboteurs played it patiently.** A05 and A06 played safe on two-seat crews because "playing damage
  would clearly reveal me" (#1885, #2000), and damaged only on three-seat crews (stage 3 A06, stage 5 A05).
  On stage 4 A05 held back because both crewmates looked loyal (#2321).
- **Deflection worked once.** After the audit exposed A06, A05 and A06 pointed at A02, the other free seat on
  the damaged stage 5 crew (#2580, #2587; A06's plan: "point at A02 as the other unlocked seat", #2584). Three
  of four loyal seats then accused A02 instead of A05. Only A02 named both saboteurs.
- **The table reasoned with the cooldown, better than the tracker.** "A06 was then locked for stages 4 and 5,
  and stage 5 still took a damage ... that damage came from A05" (A02 #2566). The tracker ignores the cooldown
  and ranked A01 as likely as A05 (P154).
- **A saboteur argued the rules correctly against a no.** A06, the lead of stage 5: "a no ends my term and
  passes the lead to A01 with a crew that goes out without a vote, so it doesn't stop the risk" (#2431); the
  vote held 4 to 2 and A05 damaged the stage.

## Loopholes

None seen. No seat saw a sealed card or a role: the deal, the cards, the accusations and the reference are in
human-only events, and every tool reply names only the caller's own role. No seat called itself a saboteur,
no saboteur refused to damage. Every seat says "I'm loyal and will play safe": cheap talk, by design. The
reporter's two candidates are not loopholes: a saboteur playing safe on an exposed crew is the intended
bluff, and the vote-free second crew after a lost vote was never reached (P151).

## Problems

| # | Problem | Solution |
|---|---|---|
| P150 | **Saboteurs damaged the same crew together.** Game 1, stage 3: two damage cards on a crew of three named both saboteurs at once (#484, #496, #721); the convoy lost one stage. | none in code: the brains learned to stagger (#1729, #1736), game 2 had no double damage. Watch over more games |
| P151 | **The vote of confidence is decorative.** 95 of 96 votes were yes; 56 `voteConfidence` calls came during the talk, before the vote opened, and were refused (`TOOL_LOCKED`). | built after the run: a seat may cast its sealed vote during the talk, once; the vote phase then waits only for the rest. Whether the vote ever bites: open |
| P152 | **Brains overrun the word cap again.** 10 `BRAIN_TOO_LONG` refusals (151-171 words against 150); A01 took the refusal for a closed tool (#104). | open: the same as P120 and Hold'em: say the count in the retro line or allow 180 |
| P153 | **Saboteurs are too careful for four damaged stages.** 4 damage cards in 12 chances; with a cooldown of 3, two saboteurs have at most about six cards in eight stages and need four damaged stages. Two of two games went to the convoy. | open: more games first; then a sweep of `damageToLose` 3 or a cooldown of 2 (bot test: 3 of 8 lets a tracking town lose 74 %) |
| P154 | **The tracker ignores the cooldown.** It ranked A01 with A05 after game 2 (#3150) while the table used the cooldown to name A05 (#2566). Its hits measure a weaker reader than Haiku. | proposed: put the cooldown into the hypotheses (who played which damage), not built |
| P155 | **The run reporter is city-shaped** (levels, submissions, DMs; "0 messages" with 103 talk lines; 232 "log issues" for the mechanics' events), as P89 and P103. | open; this README is the reviewed report |

## Optimizations

- Every seat speaks every stage (103 lines, six a stage, mostly "nothing new, yes"). One line a stage, or talk
  only after a damaged stage, would cut the calls by about a third.
- `viewConvoy` repeats the full rules (about 350 tokens) at each call; a short form after the first turn.
- The match is cheap (0.08 USD a game): a three-game `convoy` against `convoy-nobrain` with five seeds each is
  about 2.5 USD.

## Notes

- The reporter draft is `run/REPORT.md` (DeepSeek via OpenRouter). Its TOOL_LOCKED and word-cap items were
  right (P151, P152); "residents' deductions happen entirely in private reasoning" is wrong (103 public talk
  lines in `convoy_spoken`); its "A04 misstated its crew membership" is minor.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).
- The genesis entry names commit `8dcc389`, the first commit of this PR; the P151 fix came after the run.
