# Errata of the M2 specification (kept by the integrator)

Corrections to `09-m2-spec.md` found while building. The code on `rewrite/develop` follows this file where the two
differ. Decisions of principle are in `DECISIONS.md` section 9 (A11 to A18).

| No | Where | The specification says | What holds | Found in |
|---|---|---|---|---|
| F1 | 8.4, 6.3 | per-run cap 0.40 USD inside an experiment; noise-floor totals 0.40 and 0.20 | 0.10 (quarry) and 0.05 (econ-lab) per run; totals 0.50 and 0.25 (decision A17). The runner reserves the per-run cap for each run in flight and the new one, so the old numbers could not finish any plan | M2-03 |
| F2 | 6.6 | the manifest is built in step 3, the kernel is created in step 4 | The kernel is created before the manifest is built (the tool specifications hashed into `textHashes.toolSpecs` come from `kernel.toolSpecs(grant)`), and started after the run folder is open. "The manifest is written before the first event" holds | M2-06 |
| F3 | 6.1 | `MechanicDefinition.metrics` | The metrics are at `definition.head.metrics` (`PluginHead.metrics`, an empty list when none) | M2-06 |
| F4 | 4.1 | `createModelDrivers` computes the hash of a system prompt | It takes `hash: (text) => string` from the caller (the command line passes `jsonHash` of the chain package); the models package may not import a hash | M2-10 |
| F5 | 3.3, 3.4 | `RequestLimits` in `source.ts`; X003 raised in `createModelSource` | `RequestLimits`, `limitsFor` are in `request.ts`; `modelOf` in `providers.ts` raises X003 | M2-07 |
| F6 | 2.6 | the X codes end at X040 | `SWT-X041`: a tool was called outside an open activation (the resident session) | M2-09 |
| F7 | 7.1 | `model.ts` holds the rules, `rules.ts` re-exports them | The reverse, in both ported mechanics: the layer rule lets a `/rules` file import only typebox and other `/rules` files | M2-11, M2-12 |
| F8 | 7.2 | a cut file is refused | A file with `truncated` is played for `truncated.afterMinute + 1` ticks, the run's timeline is cut to the file's length and the end is not compared | M2-13 |
| F9 | 7.3 | a decision count includes "also one the timer made" | True for `draft-rounds` (a missed pick writes the pick event). In `econ-games` the timer writes no `decision_made`: in a silent run `decisions` is absent and `missedDecisions` is the count. A count is "absent" at zero events, never 0 | M2-15 |
| F10 | 8.1 | the `nobrain` arm of econ-lab does not load `strategy-brain` | It loads it with `enabled: false`, as the old game did and the oracle setup requires. `strategy-brain.brainWrites` is exported in both arms and reads "absent" without a write | M2-15 |
| F11 | 2.5 | `textHashes.toolSpecs` is equal across all runs of an experiment | Equal inside one arm only: an arm may change the grant (econ-lab without the brain has two tools fewer). `COMPARE_FIELDS` is `{ always, sameArm }` | M2-18 |
| F12 | 6.3 | a leak is a field of the run's outcome | The injected player rejects with an `SwtError` of code `SWT-X030`; the series stops at once with `SWT-E007` | M2-18 |
| F13 | 6.3 | a stopped experiment "continues with the same plan under a cap the owner approves" | Not possible while `budget` is part of the spec hash: a new total changes the hash, the plan order and the state file's binding. Decision A18: the hash that binds the plan and the state file leaves `budget` and `concurrency` out; they are how the series is paid and paced, not what is measured. To be built with the experiment command (M2-22) | M2-18 |
| F14 | 6.3 | `pass.estimate` is a number | For "no verdict" without a computable estimate the code writes 0 and says so in the rule text. To be changed to allow "absent" with the experiment command (M2-22) | M2-18 |
