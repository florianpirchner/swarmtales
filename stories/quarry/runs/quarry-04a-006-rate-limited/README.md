# quarry-04a-006-rate-limited

2026-11-11. The first attempt of [quarry-04a-007-paired-seeds](../quarry-04a-007-paired-seeds/): the arms
`quarry`, `quarry-nobrain` and `quarry-open` on seeds 31, 37, 41, 43, 47, 53, 59 and 61, 4 Haiku seats,
started together with about 70 other runs of this session. 68 requests ended in 429 errors (the
organization's concurrent-request limit, after six client retries); 47 picks were then
counted as missed (12 brain, 24 no brain, 11 open hands). The series was run again with at most ten runs
at once (007: no error). Kept as recorded data; no reporter drafts. **Cost 0.889 USD.** Every signed log
verifies.

The picture was the same as in the clean series: table points per match 938 with a brain, 952 without, 1021
with open hands (open minus no brain +69, SE 33).

## Loopholes

None.

## Problems

- **P431**: 429 errors lose turns; in Quarry a lost turn becomes a missed pick.

## Solutions

At most about ten live runs at once (this session's queue); a process-wide request limit in `packages/models`
is proposed (open).
