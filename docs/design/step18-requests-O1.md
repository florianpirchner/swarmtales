# Step 18 requests from O1 (overseer core)

Requests to the integrator from team O1 (steps 1-4 of `docs/design/overseer-api.md` §6). Nothing
here was built outside O1's scope.

1. **`HostOptions.human`.** The host counts `human` as a reachable holder only when
   `HostOptions.human === true`. This flag is a stand-in until step 6 (the human channel) says how
   a human attaches to a run. Step 6 should replace or keep it.
2. **Decisions open at the run's end.** A decision whose deadline is after the last minute never
   settles. Its commit never runs, and the snapshot keeps it open. Decide whether the run's end
   settles open decisions (with the standing proposal), or whether resuming the run is the only
   way to settle them.
3. **`script` never holds a decision.** No script channel calls tools during a minute, so the gate
   never counts `script` as reachable. If a later step gives scripts a turn, the `reachable` rule that
   `host.ts` hands the gate has to include it.
4. **The story's decision window overrides the mechanic's.** `story.decisions[kind].window`
   replaces the window the mechanic passes to `ctx.decide`. The tribunal also takes its own
   `decisionWindow` option, default 0. Please confirm this order in the design.
5. **Prompt ids.** The core tool and its success reply live under `core/tools/amendDecision` and
   `core/replies/decision-amended`. The refusals live under `replies/core/decision-*`, next to the
   other core refusals. Move them if the design wants a single place.
6. **The tribunal's immediate path equals the old close only if nothing between ranking and
   commit changes `exiledList`.** On the immediate path, `commitVerdict` recomputes the city after
   the non-voter burns. The burns do not exile anyone today, and the differential tests prove the
   logs are equal. A future penalty that can exile would break this equality.
