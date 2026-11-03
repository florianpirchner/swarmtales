# The signed event log

Flo's requirement of 2026-11-01 (`rewrite-status.md`, item 5a): every run's event log can be checked by anyone who has the
run directory, so a published run cannot be edited afterwards without it showing. Built in step 18 by team H1.

## What a run writes

```
runs/run-NNN/
  events.jsonl         unchanged: every line exactly as before
  events.chain.jsonl   the hash chain over events.jsonl, with signed heads
  run.pub              the run's Ed25519 public key (PEM, SPKI)
  snapshot-L7.json     a snapshot also carries the chain's signed head at the cut (`chain`), signed over the file's state
```

The chain is a **sidecar**: `events.jsonl` keeps its bytes, so the golden logs, the reporter, the digest and every reader stay
as they are. `test/golden/golden-chain.test.ts` plays a golden run with the chain on and shows that the golden lines are the
same, that `events.jsonl` holds exactly the recorded lines, and that the chain holds; `test/log/chain.test.ts` shows that the
log with and without the chain is byte-equal.

## The chain

Line 1 of `events.chain.jsonl` is the **genesis**:

```json
{"kind":"genesis","seq":0,"previousHash":"000…0","hash":"<genesis hash>","genesis":{
  "format":"swarmtales-chain","version":1,"algorithm":"ed25519","digest":"sha256","canonical":"RFC 8785",
  "publicKey":"<base64 SPKI DER, the key of run.pub>","commit":"<git commit, +dirty when the tree had changes>",
  "run":"run-003","preregistration":"<sha256 of the --preregistration file>",
  "story":"cityofkeys","storyHash":"<sha256 of the canonical serialised story>","seed":7,
  "models":{"A01":"anthropic/claude-haiku-4-5","gamemaker":"openrouter/…","classifier":"…","judge":"off","souffleur":"off"},
  "commitments":{"runOptions":"<sha256 …>","promptAddenda":"<sha256 …>","treatment":"<sha256 …>"},
  "resumedFrom":{"file":"snapshot-L7.json","run":"run-002","checkpoint":{…, "state":"<sha256 of the snapshot>"}}}}
```

`commit` is `SWARMTALES_COMMIT` when set (a built binary outside a checkout), else `git rev-parse HEAD`; it is left out when
neither is known. `run` is the run's directory name, so a renamed run shows. `storyHash` is the sha256 of the canonical JSON
of the story as `000-run.json` serialises it. `preregistration` (optional, `--preregistration <file>`) is the sha256 of a
document registered outside before the run (see "The limit"). `commitments` are values fixed before the first line that the
run commits to. The CLI sets two (step 18 challenge, chain-security m4): `runOptions`, the hash of the command line's overrides
(`--no-guards`, the dials, `--no-personas`, `--weaver` ...) and the judge's temper, and `promptAddenda`, the hash of every
`--prompt-addendum` text with the resident it is for (only when there are any). Further keys are free (the ISTAnt replica puts
a hash of its treatment assignment there, `docs/ideas/istant.md`); the API (`EventChain`, `runGenesis`) takes them. The
residents' system prompts are not hashed (they are built after the chain starts); they follow from what the genesis does commit
to: the code (`commit`), the story, the seed, the options and the addenda.

Then one entry per line of `events.jsonl`, in order:

```json
{"seq":12,"hash":"<hex>"}
```

with

```
hash(0)  = sha256(previousHash + canonicalJson(genesis))         the genesis hash
hash(n)  = sha256(hash(n-1) + canonicalJson(parse(line n)))
```

as hex digests over UTF-8, where `canonicalJson` is RFC 8785 (JCS: sorted keys by UTF-16 code units, no whitespace, numbers
and strings as ECMAScript serialises them; `packages/chronicle/src/log/canonical.ts`). RFC 8785 assumes I-JSON (RFC 7493), so
`verify` refuses a line with a duplicate key (parsers differ in which value they keep) or a lone surrogate (not UTF-8
encodable, so another JCS implementation cannot hash it); `JsonlEventLog` writes a lone surrogate as U+FFFD, so a run's own
text (a summary sliced through an emoji) never breaks its chain. `seq` is the line number, which equals
the event's own `seq` in every log the CLI writes. Every line is hashed whole, its wall-clock `at` included.

A **head** entry signs the chain so far:

```json
{"kind":"head","seq":<lines covered>,"hash":"<hash(seq)>","signature":"<base64 Ed25519>"}
```

The signature is over the UTF-8 bytes of `canonicalJson({format: "swarmtales-chain-head", genesis, lines, hash})`. A head is
written when the `run_end` line is chained, at every snapshot (the **checkpoint**, which the run file carries as `chain`), and
when the CLI closes the log after the run (only when lines came after the last head). The last entry of a finished chain is a
head over every line, and `run_end` is the log's only `run_end` (a run ends once; `verify` refuses one before the last line).

A checkpoint's head also signs the **state** of the snapshot it was taken for (step 18 challenge, chain-security M1):
`{"kind":"head",...,"state":"<sha256>",...}`, the signature over `{format, genesis, lines, hash, state}`. The state is the sha256
of the canonical JSON of the run file without its `chain` (`snapshotStateHash`): the host's slices (points, levels, holdings),
its envelopes, the residents' model contexts and the weaver desk a resumed run plays on from. A checkpoint written before
this (no `state`) still verifies; only its lines are covered.

## Keys

Each run makes its own Ed25519 key pair with `node:crypto` (no new dependency). The public key goes into `run.pub` and the
genesis; the private key is a `KeyObject` in a private field of the `EventChain` and is never written, logged or put in a
snapshot. It is gone when the process ends. A run cannot be signed again later, by design.

## Resumed runs

A snapshot stores the chain's signed head at the cut (`chain: {genesis, lines, hash, publicKey, signature, state}`, optional
in `swarmtales-run` v1, so older files still load). `--resume` refuses a run file whose checkpoint does not verify under the key
it names, whose state is not the one the checkpoint signed (the host, the envelopes or a resident's context were edited after
the cut), or whose checkpoint key is not the `run.pub` of the run directory it sits in. A run resumed from it states that
checkpoint in its genesis (`resumedFrom.checkpoint`, with the state of the file it read) and its genesis chains from it:
`previousHash` is the checkpoint's hash. The CLI writes a resumed run's prefix into its own `events.jsonl` again (with fresh
`at` stamps and today's event names: an old checkpoint's `core_dealt` is written `motive_dealt`, as the host's envelopes and so
the next run file say), then its `run_resumed` line, so the resumed chain covers those lines too.

`swt log verify <resumed> --previous <run that took the snapshot>` checks the continuation: both chains hold, the checkpoint
belongs to the previous chain and is one of its signed heads (with the same state), the resumed prefix repeats the previous
lines (all but `at`, event types under today's names), and the line right after the prefix is `run_resumed`, so no line was
slipped in between the checkpoint and the resume. `--previous-key <file>` checks the previous run against its published key
instead of its `run.pub`. `--snapshot <file>` checks that a snapshot file is the state the resumed run's checkpoint signed.
Without `--previous`, `verify` prints `continuation not checked`: alone it checks a checkpoint only against the key the
checkpoint names itself, which any key pair passes. A resume from a file without `chain` (an old `agent-arena-snapshot`, a run
file from before the chain) names the file but no checkpoint and starts from the zero hash: it is not anchored.

## Checking

```
swt log verify runs/run-NNN [--key <published.pub>] [--previous runs/run-MMM [--previous-key <published.pub>]] [--snapshot <file>]
pnpm log:verify runs/run-NNN
```

prints `ok` with the line count, the head, the key's fingerprint, run, story, seed and commit, the signed heads, the
pre-registration and, for a resumed run, its checkpoint and what was (not) checked, or the **first broken line**:

| Change | What `verify` says |
|---|---|
| a line edited | `events.jsonl line n: does not match the chain` (n: the edited line) |
| a line deleted, inserted or two lines swapped | the same, at the first line that moved |
| the tail of `events.jsonl` cut | `line n: missing from events.jsonl` |
| both files cut (the heads with them) | `lines a-b are not covered by a signed head` |
| both files cut back to a snapshot's checkpoint (a signed head) | `the log ends before its run_end line` |
| lines appended to `events.jsonl` | `line n: not in the chain` |
| `run.pub` (or `--key`) another key | `the chain was not made with this key` |
| a head's signature changed | `the head's signature does not verify` |
| genesis edited (seed, models, commit ...) | `the genesis entry's hash does not match its content` |
| a line edited into a duplicate key (`{"type":"run_end",...,"type":"text"}`) | `line n: not I-JSON (duplicate key "type")` |
| lines after a `run_end` | `line n: a run_end before the log's last line` |
| a checkpoint head deleted from the chain | not seen by `verify` alone (the `run_end` head still signs every line); `ok` lists the heads, and `--previous` of the resumed run says `the previous run signed no head over line n` |
| a line slipped in between a resumed prefix and `run_resumed` | `--previous`: `line n: the line after the resumed prefix is not the run_resumed marker` |
| a snapshot edited before the resume | `--resume` refuses it; `--snapshot <file>`: `not the state the checkpoint signed` |

Whitespace and key order inside a line are not changes: the chain hashes the canonical form.

The code: `packages/chronicle/src/log/chain.ts` (`EventChain`, `verifyChain`, `verifyChainText`, `verifyContinuity`),
`JsonlEventLog` in `sinks.ts` (hands every line it writes to the chain, after writing it), `apps/cli/src/host/chain.ts` (the
CLI's genesis), `apps/cli/src/log-verify.ts`. The chain sits after the legacy adapter: it signs the lines `events.jsonl` holds,
not the host's envelopes.

## Cost and the off switch

One `JSON.parse`, one canonical serialisation, one sha256 and one short append per line: about 10 µs a line (20,000 lines:
0.12 s plain, 0.31 s chained), against minutes of model calls per run. The CLI always signs; there is no flag to turn it off.
Only library callers leave it off, by building a `JsonlEventLog` without `chain`: the tests do.

## The limit

**Without an external anchor of the public key the chain proves integrity after publication, not authenticity.** The key
is the run's own and sits next to the log. Whoever holds the run directory before it is published can write a different
log, make a fresh key pair and sign the fake chain; `verify` accepts it against the `run.pub` beside it. What the chain does
prove is that nothing changed **after** the key was fixed: once `run.pub` (or the head hash) is published somewhere the
operator does not control (a timestamping service, a commit in a public repository, a pre-registration such as ISTAnt's),
any later edit, deletion, reordering or truncation shows, and `--key <the published copy>` checks against that copy.
Anchoring is not built: it is a step outside the repository (publishing), which needs Flo's go.

Further limits, stated so nobody reads more into it:

- **Selection.** The key is born inside the run, so an anchor can fix it only after its run started. That proves "not edited
  since", never "this was the run": an operator can play N runs of the same story, seed and models (their genesis differs only
  in the key and the run name) and publish the best one. `commitments` fix the treatment, not the number of attempts. Against
  this, a study (the ISTAnt replica) registers outside, before the first run, a document with a fresh nonce and the declared
  number of runs, and passes it to every run with `--preregistration <file>`: each genesis then names the document's hash and
  the run's name, so a reader can count the published runs against the declared ones and see a renamed or a missing one. It
  does not stop an operator who runs more than declared and never says so; only the registration's run count and the run
  names make that visible.
- The chain covers `events.jsonl` and, through the checkpoints, the state of the snapshots it signed. `000-run.json`,
  transcripts, minute logs, `usage.json`, `REPORT.md`, the digest and the agents' `*.prompt.md` are derived files and are not
  signed (the genesis commits to the story hash, the seed, the models, the options and the prompt addenda of the run). A
  snapshot written before checkpoints signed its state (no `state`) is covered only by its lines.
- Provider error texts and what threw are recorded as written, after the credentials of URLs and `sk-`/bearer tokens are
  replaced by `[redacted]` (`redactSecrets`; chain-security m7): a signed line cannot be edited later.
- The commit is what the run read from git; `+dirty` says the tree had changes, not which.
- A run that crashes before `run_end` leaves an unsigned tail or, after the CLI's `close`, a signed log without `run_end`;
  `verify` reports both as broken, because a log cut back to a checkpoint looks the same.
- The canonical form is of the parsed line: numbers beyond IEEE double precision are compared as JavaScript parses them
  (the CLI writes none).
