# Oracles: the residents' system prompts of Whispers and the City

The oracle files hold no system prompt (`whispers/README.md`). The test `apps/cli/test/resident-prompts.test.ts`
(issue M5-70, decision A86) compares the City order that `packages/models/src/driver/prompt.ts` composes with the
sha256 of the old prompt, computed at `v0-final` (commit `a73e6a9`) by the old app's own path: `hostStoryOf` and
`createHost` with the effective dials of the oracle files (`setup.definition.effective`: six residents, one pass,
personas on, core motives on, figure and gamemaker direction 4; Whispers with its whisperer and guards and without
names, the City with names and without a whisperer), `host.start()`, then `hostResidents` without models, which builds
the prompts as a live run did (old `apps/cli/src/host/residents.ts`, `baseSystemPrompt` of
`packages/roles/src/agents/system-prompt.ts`).

How to compute them again: export `v0-final` into an empty folder (`git archive v0-final | tar -x -C <folder>`), run
`pnpm install --frozen-lockfile --offline --ignore-scripts` there, save the script below as `test/m570-prompts.test.ts`
and run `OUT=<file> pnpm exec vitest run test/m570-prompts.test.ts`. Nothing is committed on the old platform.

```ts
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { it } from "vitest";
import { createHost } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { RESIDENT_APP_EVENTS } from "@swarmtales/roles";
import { hostResidents } from "../apps/cli/src/host/residents.ts";
import { hostStoryOf, type HostRun } from "../apps/cli/src/host/story.ts";
import { STORIES } from "../stories/index.ts";

const sets = [
	{ story: "whispers", minutes: 20, names: false, whisperer: true, guards: true, lastLevel: 7 },
	{ story: "whispers-rumours", minutes: 20, names: false, whisperer: true, guards: true, lastLevel: 7 },
	{ story: "cityofkeys", minutes: 12, names: true, whisperer: false, guards: false, lastLevel: 10 },
];
it("prints the prompts", () => {
	const out: Record<string, Record<string, string>> = {};
	for (const set of sets) {
		for (const seed of [7, 11]) {
			const story = STORIES[set.story]!;
			const run: HostRun = {
				residents: ["A01", "A02", "A03", "A04", "A05", "A06"],
				seed,
				minutes: set.minutes,
				lastLevel: set.lastLevel,
				arena: { startLevel: 1, activation: "always", passesPerMinute: 1, blockSize: 1, stopWhenDone: false, stopWhenSeatsDecided: false },
				names: set.names,
				coreMotives: true,
				whisperer: set.whisperer,
				guards: set.guards,
				gamemaker: true,
				figureDirection: 4,
				gmDirection: 4,
			};
			const { definition } = hostStoryOf(story, run);
			const host = createHost({ story: definition, prompts: createPromptLookup(), app: { events: RESIDENT_APP_EVENTS } });
			host.start();
			const residents = hostResidents({ story, run, host });
			out[`${set.story}-s${seed}`] = Object.fromEntries(residents.prompts);
			out[`${set.story}-s${seed}-profiles`] = Object.fromEntries(residents.profiles.map((p) => [p.agent, p.persona?.name ?? "-"]));
			out[`${set.story}-s${seed}-whisperer`] = { w: String(host.fact("whispers.whisperer") ?? "none") };
		}
	}
	writeFileSync(process.env.OUT!, JSON.stringify(out, null, 1));
	for (const [k, v] of Object.entries(out)) if (v.A01 !== undefined) console.log(k, createHash("sha256").update(v.A01).digest("hex"));
});
```

The results (sha256 of the UTF-8 text; the persona is the name in the seat's old `agent_profile`):

| Setup | Seed | Seat | Persona | Whisperer | sha256 |
|---|---|---|---|---|---|
| `whispers` | 7 | A01 | Archivist | A06 | `b097baf8e42338547dfb54d453e86cd3aef4ce5141387d233c759e8d8ebce9c9` |
| `whispers` | 7 | A06 | Merchant | A06 | `55112498e8001f97b77f7a8e8905a1371996334d083474c97e8699575fb31360` |
| `whispers` | 11 | A01 | Skeptic | A06 | `4aa066dbb7ef4c26529eb834f0bc8992e4ab574776c09027530274cbb9775de8` |
| `cityofkeys` | 7 | A01 | Gambler (its figure's profession) | none | `d589b0c57cbbf1b4818c3eac9fcb486b4fb62a61edfd3cca86c1b039ad5cf6f5` |
| `cityofkeys` | 11 | A01 | Recluse | none | `67c4e189244671103b28bab774bc47841c3980590e07c0f974a49ef1908afbcc` |

`whispers-rumours` gives the same prompts as `whispers` at both seeds (the receipts change no system text).

Not carried by the new composition: the seeded assignment of personas (old `assignPersonas`), the figure direction from
6 on (the figure before the city, the voice rule, the direction block), the prompt addenda and the weaver's text.
