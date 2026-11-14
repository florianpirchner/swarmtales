# Oracles: blind bid (`stories/blind-bid`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `blind-bid-s7.json`, `blind-bid-s11.json` | default: four seats, three games of six lots, a private brain | scripted (`blindBidProbed`) | the whole match: first-price, second-price and shared-worth lots, purses, scores, retro windows; three refused calls (a bid above the purse: `OVER_PURSE`; a negative bid: `INVALID_ARGUMENTS`; a bid before the first lot: `TOOL_LOCKED`) |
| `blind-bid-nobrain-s7.json` | no brain | scripted (`blindBid`) | the control arm, whole match |
| `blind-bid-s31-live.json` | default | replay of run `blind-bid-04a-001-smoke` (Haiku seats) | the whole match as models bid it, brains refused as too long |
| `blind-bid-s13-silent.json` | default | scripted (`silent`): no resident ever calls a tool | the lot timer: every bid of the match is missed, 18 lots resolved without a bid, scores and the end of the match |

Source of the calls. The scripted player is the one of `test/stories/blind-bid.test.ts` (A01 bids its value or
estimate, A02 half of it, A03 its value plus 5, A04 always passes). The live run is the only recorded one; it was
played under the story's first name, `lantern-auction`. Every one of its 103 calls gets the recorded answer on
today's code; 12 of 104 turns show inputs that are worded differently today (`source.fidelity`), so the file's
texts are today's, not the recording's.

The seeded deal is visible: `lots_dealt` carries every seat's private value or estimate and the hidden worth
(audience `human`); `bid_placed` carries every sealed bid.

Not covered: ties broken by the seeded draw (none occurred), more than three games (`blind-bid-g5`).

One difference from the recording: `game_scored.secondPrice.capped` in `blind-bid-s31-live.json` is what today's
code writes; the recorded run, played on older code, had another value. The event is for the human only.
