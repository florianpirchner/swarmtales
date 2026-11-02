/**
 * Differential test of the names mechanic against the old World: the same `chooseName` calls (every
 * refusal code, the taken and chosen-once cases, the locked tool after the choice closes), the same
 * `name_chosen` events and the same chosen names; the fallback names are drawn from the same stream.
 */
import { describe, expect, it } from "vitest";
import { defineCoreStory } from "@swarmtales/kernel";
import { legacyTurns } from "@swarmtales/mechanic-shared";
import { names } from "@swarmtales/mechanic-names";
import { createPromptLookup } from "@swarmtales/prompts";
import { tinyStory } from "../../helpers/stories.ts";
import { channelsStandIn, ids } from "../t1/support.ts";
import { newOwned, oldOwned, playNew, playOld } from "../t1/differential.ts";

const SPEC = { untilMinute: 2, announcement: "Choose before minute {untilMinute}.", fallbackWords: ["Stone", "Ash"] };

const choose = (name: string) => ({ tool: "chooseName", params: { name } });
const plan = (agent: string, minute: number) => {
	if (minute === 0 && agent === "A01") return [choose("Mira"), choose("Ilse"), choose(" Ab ")];
	if (minute === 0 && agent === "A02") return [choose("Mo"), choose("A07"), choose("Stone-A12"), choose("city"), choose("R-0042"), choose("GT1"), choose("x".repeat(40)), choose("Mira")];
	if (minute === 1 && agent === "A02") return [choose("mira"), choose("Ilse")];
	if (minute === 2 && agent === "A04") return [choose("Latecomer")];
	return [];
};

describe("chooseName against the old World", () => {
	it("answers every call alike, writes the same name_chosen events and settles the same names", async () => {
		const story = { ...tinyStory({ agents: 4 }), names: SPEC };
		const old = await playOld({ story, agents: 4, minutes: 4, plan, names: true });
		const channels = channelsStandIn();
		const definition = defineCoreStory({ id: "names-differential", seed: 3, minutes: 4, residents: ids(4), mechanics: [names.with({ ...SPEC, reserved: [story.city] }), channels.use], grants: { resident: ["chooseName"] }, turns: legacyTurns({ passesPerMinute: 1, blockSize: 1, activation: "always" }) });
		const fresh = await playNew({ story: definition, prompts: createPromptLookup() }, plan);
		for (const [at, replies] of old.replies) {
			// The old runner prints a locked tool as its own text; the rest is the mechanic's.
			expect(fresh.replies.get(at), at).toEqual(replies);
		}
		expect(newOwned(fresh, ["names"])).toEqual(oldOwned(old, ["names"]));
		expect(fresh.host.facts()["names.names"]).toEqual(Object.fromEntries(ids(4).map((id) => [id, old.world.display(id)])));
	});
});
