# Act II run v01: feast on level 10

| | |
|---|---|
| Date | 2026-10-27 |
| Code | main at PR #10 (`b6e17fd`): feast opens on the first entry of level 10, table cleared after 12 minutes |
| Start | resumed from [`../../nexus-act1-06a-01/snapshot-L7.json`](../../nexus-act1-06a-01/) (Act I, minute 15) |
| Command | `pnpm start --resume examples/nexus-act1-06a-01/snapshot-L7.json --provider anthropic` |
| Competitors | `claude-haiku-5-5` via Anthropic |
| Game master | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter (director role from level 8) |
| Classifier | `claude-haiku-5-5` via Anthropic |
| End | minute 60 (time limit) |

`run/` holds the full run. Its `events.jsonl` includes the Act I prefix, `digest/` the deterministic
digest, and `usage.json` the cost split into the snapshot's spend and this run's.

## Result

| Metric | Value |
|---|---|
| Finished level 10 | 4 of 6 (A03 minute 26, A05 27, A02 and A06 28) |
| Stuck | A01 on level 10 from minute 20, A04 on level 9 from minute 17 |
| Final standings | A02 151, A03 148, A06 145, A05 140, A01 115, A04 93 |
| Survivors (2) | A02 and A03 |
| Cost | 0.247 USD for this run (competitors 0.161, game master 0.068, classifier 0.018); Act I added 0.116 |
| Submissions | 16 correct, 1 wrong (A04 on level 8, −8) |
| Transfers | 20, every one of 1 point with the factor in the memo (used as a verified receipt) |
| Game master | 68 actions; 3 too long, 2 PRIVATE_BLOCKED, 1 over budget |
| Labels | refusal 71, hesitation 39, help request 39, promise 29, offer 10, thanks 8, lie 1 |

## Digest highlights

- **The feast worked.** It opened when A01 first reached level 10 (minute 20), with a clear text and
  notices. A01 (minute 21) and A03 (minute 25) took seats, and the third seat stayed empty. The
  table was cleared at minute 32.
- **The generous one lost.** A01 got the city factor first and gave it away free to A02, A03 and
  A05. The digest shows 3 free rides against A01. A01 then stayed stuck on level 10 and finished
  fifth.
- **Act II alliances:**
  - A01 and A03 on levels 8 and 9.
  - A05 and A06 on levels 8 and 9, paying each other.
  - A02 and A05 on levels 3 and 10.
  - A01 and A02 on levels 9 and 10.
- **The game master's board posts** read like a "cannon": they count down what each resident can
  still reach. Nobody asked a real price.

## Problems

1. **The team certificate was misunderstood.** A06 held the level 9 certificate and sent it to A05,
   but not to A04: "it is my own, not yours". A04 stayed on level 9 for 43 minutes.
2. **A structural dead end on level 10.** A04 held A01's level 10 counter-factor but was still on
   level 9, so it never saw it.
3. **Free giving instead of trade.** Every transfer was a 1-point receipt.
4. **32 dead minutes at the end.** Nothing moved after minute 28.

## Proposed for v02

- The certificate holder's factor block names the teammates who need the same number.
- A holder gets a notice with the factor once the resident who needs it reaches that door.
- End the run early once open points can no longer change the survivors.
- An incentive to trade (open design decision), e.g. a bonus for the first to open a door.
