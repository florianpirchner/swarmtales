/**
 * The gamemaker's note desk keeps every dealt secret out of a note. The secrets are the real
 * puzzles mechanic's (`PuzzlesApi.secrets`, R2-D8): the passwords of the fragment levels and the
 * all-digit values of the additive deals, dealt from the seed of the golden City of Keys run.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { Host } from "@swarmtales/contracts";
import { createHost, defineCoreStory, defineMechanic, reply } from "@swarmtales/kernel";
import { channels } from "@swarmtales/mechanic-channels";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { PuzzlesApi } from "@swarmtales/mechanic-shared";
import { puzzleOptions, RESIDENTS, SEED, storyOf } from "../puzzles/harness.ts";
import { ledgerStandIn, marksStandIn, namesStandIn, receiptsStandIn } from "./stand-ins.ts";
import { exileStandIn, t2Prompts, textOf } from "./harness.ts";
import { progressionStandIn } from "../cast/stand-ins.ts";

const NAME = "cityofkeys-f4g4";

/** Reads the secrets the puzzles name, as JSON. */
const reader = defineMechanic(
	{ id: "script", summary: "Test driver: reads the puzzles' secrets.", options: Type.Object({}), state: () => undefined, events: {}, requires: [PuzzlesApi], prompts: { "tools/readBoard": [] } },
	(kit) => ({
		tools: [
			kit.tool({
				name: "secrets",
				description: "tools/readBoard",
				parameters: Type.Object({}),
				execute: (_params, ctx) => reply(JSON.stringify(ctx.call(PuzzlesApi, "secrets", {}))),
			}),
		],
	}),
);

function city(): Host {
	const story = defineCoreStory({
		id: "t2-note-secrets",
		seed: SEED,
		minutes: 4,
		residents: [...RESIDENTS],
		mechanics: [
			channels.with({ noteAuthor: "STEWARD" }),
			puzzles.with(puzzleOptions(storyOf(NAME))),
			progressionStandIn(new Map<number, number>()).with(),
			ledgerStandIn(10).with(),
			marksStandIn().with(),
			namesStandIn(new Map<string, string>()).with(),
			receiptsStandIn().with(),
			exileStandIn.with(),
			reader.with(),
		],
		grants: { gamemaker: ["notify"], script: ["secrets"] },
	});
	const host = createHost({ story, prompts: t2Prompts() });
	host.start();
	return host;
}

async function secretsOf(host: Host): Promise<{ readonly passwords: readonly string[]; readonly numbers: readonly string[] }> {
	const text = textOf(await host.call("script", "secrets", {}));
	const found: unknown = JSON.parse(text);
	if (typeof found !== "object" || found === null || !("passwords" in found) || !("numbers" in found) || !Array.isArray(found.passwords) || !Array.isArray(found.numbers)) throw new Error(`no secrets in ${text}`);
	return { passwords: found.passwords.map(String), numbers: found.numbers.map(String) };
}

const notify = async (host: Host, text: string): Promise<string> => textOf(await host.call("gamemaker", "notify", { agent: "A02", text }));
const LEAK = "LEAK_BLOCKED: the text contains a password piece; never write codes";

describe("the note desk and the dealt secrets", () => {
	it("blocks a password the puzzles dealt, whole or in a piece, and lets a plain note through", async () => {
		const host = city();
		const { passwords } = await secretsOf(host);
		const password = passwords.find((candidate) => candidate.length >= 6);
		expect(password, "a dealt password").toBeDefined();
		if (password === undefined) return;
		expect(await notify(host, `A02, the first door opens with ${password}.`)).toBe(LEAK);
		expect(await notify(host, `A02, try ${password.slice(0, 4).toLowerCase()} first.`)).toBe(LEAK);
		const clean = await notify(host, "A02, the city keeps count of every point.");
		expect(clean).not.toBe(LEAK);
		expect(clean).toContain("delivered");
	});

	it("blocks a dealt number, and leaves a short number alone", async () => {
		const host = city();
		const { numbers } = await secretsOf(host);
		const number = numbers.find((candidate) => candidate.length >= 6);
		expect(number, "a dealt all-digit value").toBeDefined();
		if (number === undefined) return;
		expect(await notify(host, `A02, the code is ${number}.`)).toBe(LEAK);
		expect(await notify(host, `A02, the code is ${number.slice(0, 5)}.`)).toBe(LEAK);
		expect(await notify(host, "A02, you hold 15 points; the city counts them all.")).not.toBe(LEAK);
	});
});
