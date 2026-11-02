# Carve round 3, team T1: requests

Core, `mechanics/shared`, the testkit, `test/golden` and the other teams' mechanics are unchanged.
Each request below was met with a local adapter or a test that waits for it.

## Request 1 (T2): channels stops coercing a missing DM text

`mechanics/channels/src/api.ts:24` (`dmRecordOf`) turns a DM record without text into `text: ""`.
R2-D14 made `DmRecord.text` optional in the shared API so that blame can tell an old record (sent
before the city numbered its messages: no text, no delivery) from an empty one. With the coercion:

- `blame.ts` "the city kept no delivery record" can never fire with real channels: a text-less
  DM #18 answers "DM #18 has not reached A02 yet" (no `deliveredMinute`) instead;
- the fall-through at `findClaim` (`dm?.text !== undefined`) misreads an old DM whose number
  clashes with a board post: it is taken as a DM ("message #69 has not reached you yet") where the
  old engine takes the post.

Needed: `dmRecordOf` copies `text` only when the record has one.

Local adapter: `test/mechanics/t1/records.ts` is a channels stand-in that answers from the records of
an old snapshot with the text absent, and `test/mechanics/receipts/blame-records.test.ts` proves both
paths against the old engine with it. `blame-resume.test.ts` holds the same scenario on real channels
as an `it.fails`: when request 1 lands it turns red, and `.fails` goes.
