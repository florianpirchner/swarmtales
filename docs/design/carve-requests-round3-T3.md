# Carve round 3, team T3: requests to the integration owner

T3 (puzzles, progression, goals) did not edit `mechanics/shared`, the core, the testkit,
`packages/engine`, `test/golden` or another team's mechanics. Each gap below is worked around locally.

1. **`CastApi.active({})` does not exist yet** (shared, owner T2; R2-D19). Old `residents()` and with it
   `listAgents` list the competitors and the active cast members with their level (world.ts:1407-1413).
   `CastApi` has `isActive({ cast })` only. Until `active: query({}, { id: string; level: number }[])` is
   in shared, `listAgents` lists the competitors only. None of the three goldens contains a `listAgents`
   call, so there is no golden comparison of it (the brief's gate item cannot be met from the goldens); the
   twin differential against the old engine covers the competitors, and the cast members stay unproven
   until `active` exists. Progression will then read it with `ctx.tryCall(CastApi, "active", {})` and
   add `CastApi` to `uses`.

2. **Motives must deal at `runResumed.motives` (owner T2).** Must-fix 7 orders a resume as motives, then
   act starts, then re-deal. T2's motives still deal in `minuteStarted` (order 50), so the real-motives
   resume scenario (`test/mechanics/t3/resume-run.test.ts`) is an `it.fails`: it turns green, and `it.fails`
   fails loudly, the day motives move their deal into `runResumed` (`HOOK_ORDER.runResumed.motives`).
   Until then the ordering of progression and puzzles is proven with a stand-in motives mechanic that
   deals in `runResumed`.
