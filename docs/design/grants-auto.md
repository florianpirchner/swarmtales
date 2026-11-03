# `grants: "auto"` (step 18, team G1)

Flo's go: "Grants gleich mitnehmen". A core story no longer has to list every tool per role: with `grants: "auto"`
the host derives the grants from the loaded mechanics.

## The story form

```ts
defineCoreStory({
	// ...
	mechanics: [ledger.with(), channels.with(), progression.with(), /* ... */],
	grants: "auto",
	// optional: per grant name, change what was derived
	grantTweaks: {
		resident: { drop: ["blame"] },                  // remove tools
		gamemaker: { add: ["ultimatum"] },              // extend
		script: { set: ["directorMinute"] },            // replace the derived list
		"terminator-1": { add: ["rollDice", "amendDecision"] },
	},
});
```

- `grants` is `Grants | "auto"`. An explicit story loads exactly as before.
- `grantTweaks` (`GrantTweaks`, `packages/contracts/src/core/story.ts`) is allowed only with `"auto"`; the loader refuses it
  next to an explicit list. Per name the order is: `set` (or the derived list), then `drop`, then `add` (without doubles).
- Names are checked as before: a tweak for a name that is neither built in nor an overseer, or for a tool no loaded
  mechanic defines, fails the load (`name-checks.ts`, `loader.ts`). The overseers' `needs`, "only the human uses
  `pause`..." and "residents never hold `amendDecision`" are checked against the resolved grants.

## Where the defaults live

On the tool, in its definition: `suggest: ["resident"]` (the field existed as "the grant names the mechanic suggests;
only the story's `grants` decide" and was already filled for 42 of the 47 tools; the five progression tools now have it).

Derivation (`packages/kernel/src/host/auto-grants.ts`, called from `loadMechanics`):

1. Walk the tool catalog in load order (the mechanics in the order of their `requires`, each in the order it defines
   its tools). Core tools (`amendDecision`, the human's tools) are skipped: they stay explicit, through `grantTweaks`.
2. For every entry of a tool's `suggest`: a grant name the story knows (a built-in or a declared overseer) gets the tool;
   an entry that is the id of an overseer definition (`acme/roller`) gets it for every overseer of that definition
   (the same matching as `serves`); an unknown name is dropped, because a mechanic cannot know a story's names.
3. A tool nobody suggests is granted to nobody (`secret` in the unit test); a story grants it by `grantTweaks`.

The resolved grants are given to `AccessControl.setGrants` right after the mechanics are loaded, so the catalog, the
referee limits, `toolSpecs`, the human check and the overseers' `needs` see the same lists as for an explicit story.
Open grant names work unchanged (a tweak or a definition-id suggestion reaches `overseer:<name>`).

## What "equal to today's lists" means

`test/mechanics/auto-grants-equality.test.ts` builds the host of the real city (the arena golden host,
`arenaStoryOf(name, mode)`) for the three golden stories (City of Keys f4g4 and f10g10, Whispers f10 with the grudge):

- Residents: the derived set equals the old engine's `storyToolNames(story)` restricted to the tools whose mechanic the
  city loads (not the exile, tribunal and standoff tools; `bid` and `permaDeath` only with a seal; `chooseName` only when
  the run names its residents), and contains every tool the golden run offered.
- Gamemaker (`notify`, `postBoard`), script (`directorMinute`, `resolvePetition`) and human (nothing) equal the explicit
  lists of the golden replay.

Lists are compared as sets. The derived order is the load order; a story that needs the old catalog order for the
prompt uses `set`. Golden logs are unchanged: the golden replays still use their explicit lists.

## Not derived (stays explicit, see the requests)

- The gamemaker's `ultimatum` (only at direction 10 in a story with ultimatums, `standoff/src/grants.ts`) and the
  tribunal's gamemaker tools depend on the run's dial; the story mapping adds or drops them with `grantTweaks`.
- Tools whose availability depends on options (`defy` for residents is open per resident by the channels' lock, not by the grant).

Mutants: `docs/design/mutants-step18-G1.json` (`pnpm mutants docs/design/mutants-step18-G1.json`), 18 mutants over the
derivation, the tweaks, the loader and host wiring, and five of the mechanics' `suggest` declarations.
