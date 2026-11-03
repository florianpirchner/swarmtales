# Golden runs

Scripted, offline runs (no live model) whose normalised event log is compared with a stored file.
They are the safety net for the monorepo rewrite (`docs/ideas/monorepo.md` §6): the rewrite is
done when these runs still match.

| Name | Story | What it covers |
|---|---|---|
| `cityofkeys-f4g4` | cityofkeys, 6 residents, 12 minutes | today's default dials (figure 4, gm 4) |
| `cityofkeys-f10g10` | cityofkeys, 6 residents, 12 minutes | full direction (figure 10, gm 10) |
| `whispers-f10-grudge` | whispers, 6 residents, 20 minutes | directed whisperer (figure 10) and `stories/whispers/addenda/grudge.md` on every resident but the whisperer |

Each run has `<name>.events.jsonl` (one normalised event per line) and `<name>.prompts.json`
(the residents' opening system prompts, which the events do not carry; this is where the dials and
the addendum show). The scripts are in `scripts.ts`, the test in `golden.test.ts`, the comparison
helper in `test/helpers/golden.ts`.

**A changed golden file means behaviour changed and needs a reason.** Do not regenerate to make a
red test green. Read the diff, decide whether the change is intended, and name the reason in the
commit or PR.

To regenerate after an intended change:

```
GOLDEN_UPDATE=1 pnpm test test/golden
git diff --stat test/golden
```

What is normalised: `costUsd` and wall-clock fields are zeroed, ISO timestamps become `<time>`,
and the repository's absolute path becomes `<repo>`. Everything else is compared exactly. Runs use
a fixed seed (7) and scripts that depend only on the virtual minute and the resident's ID.
