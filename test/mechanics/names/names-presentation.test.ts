/**
 * What names shows and when it refuses to load (round 3, T1: mutants T1-10 and T1-11, must-fix 4):
 * the status line "you are A01" is not written for an exiled resident (old `statusFor`), a piece of a
 * password that looks like a resident ID is not turned into a name (old `#isPasswordPiece`, kept by
 * `display`), and a story that loads names without the announcement text fails at load (R2-D17).
 */
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { names } from "@swarmtales/mechanic-names";
import { ExileApi, PuzzlesApi } from "@swarmtales/mechanic-shared";
import { createPromptLookup } from "@swarmtales/prompts";
import { playStory, scriptedAgent, type PlannedCall } from "@swarmtales/testkit";
import { provider } from "../exile/support/provider.ts";
import { channelsStandIn, ids } from "../t1/support.ts";

const fields = (value: unknown): Record<string, unknown> => Parse(Type.Record(Type.String(), Type.Unknown()), value);

const SPEC = { untilMinute: 2, announcement: "Choose before minute {untilMinute}.", fallbackWords: ["Stone", "Ash"], reserved: [] };

/** A city of four residents, A02 and A03 named at minute 0, `gone` exiled, and `pieces` are parts of a dealt password. */
function city(gone: readonly string[], pieces: readonly string[]) {
	const channels = channelsStandIn();
	const exile = provider("exile", ExileApi, { isExiled: (input) => gone.includes(input.resident) });
	const puzzles = provider("puzzles", PuzzlesApi, { passwordPiece: (input) => pieces.includes(input.token) });
	const definition = defineCoreStory({ id: "names-presentation", seed: 7, minutes: 2, residents: ids(4), mechanics: [names.with(SPEC), channels.use, exile.with(), puzzles.with()], grants: { resident: ["chooseName"] } });
	const choose = (name: string): readonly PlannedCall[] => [{ tool: "chooseName", params: { name } }];
	const agent = scriptedAgent((turn) => (turn.minute !== 0 ? [] : turn.resident === "A02" ? choose("Mira") : turn.resident === "A03" ? choose("Ilse") : []));
	return playStory({ story: definition, prompts: createPromptLookup() }, agent);
}

describe("the status line", () => {
	it("tells a resident in the city who it is, and an exiled resident nothing", async () => {
		const run = await city(["A04"], []);
		const status = (resident: string, minute: number): readonly string[] =>
			run.events
				.filter((event) => event.type === "turn_started" && event.minute === minute && fields(event.payload).resident === resident)
				.flatMap((event) => {
					const inputs: unknown = fields(event.payload).inputs;
					return Array.isArray(inputs) ? inputs.map((input: unknown) => String(fields(input).text)) : [];
				})
				.filter((text) => text.startsWith("you are"));
		expect(status("A01", 1)).toEqual(["you are A01"]);
		expect(status("A04", 1)).toEqual([]);
	});
});

describe("display", () => {
	it("names a resident in a text, and leaves a password piece that looks like a resident ID as it is", async () => {
		const run = await city([], ["A02"]);
		expect(run.host.display("A02 and A03 hold A02 and A03")).toBe("A02 and Ilse hold A02 and Ilse");
		expect(run.host.display("A03 asks A01")).toBe("Ilse asks A01");
	});
});

describe("the options", () => {
	it("fail at load without the announcement text: a story says what it announces, or says nothing with an empty text", () => {
		const channels = channelsStandIn();
		const without = names.with({ untilMinute: 2, fallbackWords: ["Stone"], reserved: [] });
		const definition = defineCoreStory({ id: "names-no-announcement", seed: 7, minutes: 2, residents: ids(2), mechanics: [without, channels.use], grants: {} });
		expect(() => createHost({ story: definition, prompts: createPromptLookup() })).toThrow("names: the options do not match the schema");
	});

	it("accept an empty announcement: the choose-name line is then left out", () => {
		const channels = channelsStandIn();
		const definition = defineCoreStory({ id: "names-silent", seed: 7, minutes: 1, residents: ids(2), mechanics: [names.with({ ...SPEC, announcement: "" }), channels.use], grants: {} });
		const host = createHost({ story: definition, prompts: createPromptLookup() });
		host.start();
		expect(host.snapshot().mechanics.names?.data).toMatchObject({ settled: false });
	});
});
