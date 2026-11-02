/**
 * The guard's secrets of the puzzles (docs/design/carve-round3-T3.md, M8; old `secretsOf`,
 * world.ts): what a resident legitimately knows of a door's password through DMs is the runs of
 * the DMs it sent and the ones delivered to it. A DM that still waits in the mailbox is not known
 * to its recipient, so the guard does not hold the recipient to it. The secrets are read through
 * the gateway, in the question the guard model gets for a guarded tool.
 */
import { describe, expect, it } from "vitest";
import { Type, type Static } from "typebox";
import type { GuardModel, GuardModelQuestion } from "@swarmtales/contracts";
import { defineMechanic, reply } from "@swarmtales/kernel";
import { ChannelsApi, type DmRecord as DmRecordSchema } from "@swarmtales/mechanic-shared";
import { provider } from "../exile/support/provider.ts";

type DmRecord = Static<typeof DmRecordSchema>;
import { city, codeOf, play } from "./support.ts";

const MIN_RUN = 2;

/** A resident tool the story guards. */
const say = defineMechanic(
	{ id: "say", summary: "Probe: a guarded tool.", options: Type.Object({}), state: (): undefined => undefined, events: {}, prompts: { "gamemaker/tools/notify": [] } },
	(kit) => ({
		tools: [
			kit.tool({
				name: "say",
				description: "gamemaker/tools/notify",
				parameters: Type.Object({ text: Type.String() }),
				guardText: (params) => params.text,
				execute: () => reply("said"),
			}),
		],
	}),
);

function dm(id: number, from: string, to: string, text: string, delivered: boolean): DmRecord {
	return { id, from, to, minute: 1, answered: false, text, ...(delivered ? { deliveredMinute: 2 } : {}) };
}

describe("puzzles: the guard's secrets of a resident", () => {
	it("count the DMs it sent and the ones delivered to it, not the ones still waiting (M8)", async () => {
		const questions: GuardModelQuestion[] = [];
		const guard: GuardModel = {
			label: "test",
			judge: (question) => {
				questions.push(question);
				return Promise.resolve({ ok: true, allowed: true, reason: "fine", usage: [] });
			},
		};
		const records: DmRecord[] = [];
		const channels = provider("channels", ChannelsApi, { post: () => ({ postSeq: 0 }), notify: () => null, dmRecords: () => records });
		const { host } = city({ channels: channels.with(), extra: [say.with()], residentTools: ["say", "submitSolution", "getStatus"], guarded: { tool: "say", minRun: MIN_RUN }, guard });
		const password = await codeOf(host, "A01", 1);
		expect(password.length).toBeGreaterThanOrEqual(3 * MIN_RUN);
		const first = password.slice(0, MIN_RUN);
		const last = password.slice(-MIN_RUN);
		// A02 sent A01 the first run (delivered), the last run waits in A01's mailbox, and A01 itself sent A03 a middle run.
		const middle = password.slice(MIN_RUN, 2 * MIN_RUN);
		records.push(dm(1, "A02", "A01", `the start is ${first}`, true), dm(2, "A03", "A01", `the end is ${last}`, false), dm(3, "A01", "A04", `I think ${middle} is next`, true));
		await play(host, 2);

		expect(await host.call("resident:A01", "say", { text: "hello" })).toMatchObject({ ok: true });
		const secrets = (questions[0]?.secrets ?? []).map((secret) => secret.value);
		expect(secrets).toContain(first);
		expect(secrets).toContain(middle);
		expect(secrets).not.toContain(last);
	});
});
