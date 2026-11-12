# econ-lab-04a-002-rate-limited

2026-11-11. The first attempt of [econ-lab-04a-003-brain-vs-nobrain](../econ-lab-04a-003-brain-vs-nobrain/):
the same arms (`econ-lab`, `econ-lab-nobrain`) and seeds (41-48), 4 Haiku seats, started together with about
70 other runs of this session. Anthropic answered 54 requests with 429 ("Number of concurrent requests across
all models has exceeded your organization's limit") after the client's six retries, each one a lost turn, and
the lost turns became 34 missed decisions (scored by the mechanic's default for a seat that does not decide). The
series was run again with at most ten runs at once (003: no error). Kept as recorded data (CLAUDE.md: nothing
from a run is deleted unrecorded); no reporter drafts. **Cost 0.292 USD.** Every signed log verifies.

The picture was already the same as in the clean series: A-or-B cooperation 0.24 with a brain against 0.56
without (paired -0.31, SE 0.14), round 1 0.50 against 0.81, shared fund 0.04 against 0.12.

## Loopholes

None.

## Problems

- **P431**: 429 errors from the concurrency limit of the organization lose turns; in the econ lab a lost turn
  is a missed decision.

## Solutions

Run at most about ten live runs at once (built into this session's queue, not into the code); proposal: a
process-wide limit on concurrent provider requests in `packages/models` (open).
