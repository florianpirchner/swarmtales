/**
 * The names book's off switch (step 18 wiring list: a story without `names`, `--no-names`, a run that
 * starts past the first level): the mechanic is loaded, so every reader of `NamesApi` finds it, but
 * residents keep their IDs, `chooseName` is locked, the city names nobody and no status line says
 * "you are". The off state is in the snapshot (the old file's missing `names`).
 */
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { defineCoreStory } from "@swarmtales/kernel";
import { names, namesOff } from "@swarmtales/mechanic-names";
import { ExileApi, PuzzlesApi } from "@swarmtales/mechanic-shared";
import { createPromptLookup } from "@swarmtales/prompts";
import { playStory, scriptedAgent } from "@swarmtales/testkit";
import { provider } from "../exile/support/provider.ts";
import { channelsStandIn, ids } from "../t1/support.ts";

const fields = (value: unknown): Record<string, unknown> => Parse(Type.Record(Type.String(), Type.Unknown()), value);

async function play(book: ReturnType<typeof namesOff>) {
	const channels = channelsStandIn();
	const exile = provider("exile", ExileApi, { isExiled: () => false });
	const puzzles = provider("puzzles", PuzzlesApi, { passwordPiece: () => false });
	const definition = defineCoreStory({ id: "names-off", seed: 7, minutes: 4, residents: ids(3), mechanics: [book, channels.use, exile.with(), puzzles.with()], grants: { resident: ["chooseName"] } });
	const agent = scriptedAgent((turn) => (turn.minute === 0 && turn.resident === "A02" ? [{ tool: "chooseName", params: { name: "Mira" } }] : []));
	return playStory({ story: definition, prompts: createPromptLookup() }, agent);
}

const refusals = (run: Awaited<ReturnType<typeof play>>) =>
	run.events.filter((event) => event.type === "tool_refused").map((event) => fields(event.payload).code);

describe("the names book switched off", () => {
	it("names nobody, locks chooseName and keeps the IDs", async () => {
		const run = await play(namesOff());
		expect(run.events.filter((event) => event.type === "name_chosen")).toEqual([]);
		expect(refusals(run)).toEqual(["TOOL_LOCKED"]);
		expect(run.host.display("A02 asks A01")).toBe("A02 asks A01");
		expect(run.host.toolSpecs("resident").map((spec) => spec.name)).toEqual(["chooseName"]);
		const inputs = run.events
			.filter((event) => event.type === "turn_started")
			.flatMap((event) => {
				const list: unknown = fields(event.payload).inputs;
				return Array.isArray(list) ? list.map((input: unknown) => String(fields(input).text)) : [];
			});
		expect(inputs.filter((text) => text.startsWith("you are"))).toEqual([]);
		expect(run.host.snapshot().mechanics.names?.data).toEqual({ entries: [], settled: false, off: true });
	});

	it("differs from the book switched on in exactly that (the control)", async () => {
		const run = await play(names.with({ announcement: "", untilMinute: 2 }));
		expect(run.events.filter((event) => event.type === "name_chosen").map((event) => fields(event.payload).fallback)).toEqual([false, true, true]);
		expect(refusals(run)).toEqual([]);
	});
});
