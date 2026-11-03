import { describe, expect, it } from "vitest";
import { DIGEST_EVENT_TYPES, parseEventLog, parseRunMetadata, MemorySink } from "@swarmtales/chronicle";
import type { ArenaEventType } from "@swarmtales/legacy-log";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { act, createHostFixture, say } from "../helpers/host-fixture.ts";
import { fragmentOf, submit } from "../helpers/host-inspect.ts";
import { LogBuilder } from "../helpers/event-log.ts";

describe("digest event log (untrusted input)", () => {
	it("keeps the events it models, in seq order, and remembers every seq", () => {
		const log = new LogBuilder();
		log.dm("A01", "A02", "hello");
		log.add({ type: "usage", agent: "A01", provider: "p", model: "m", input: 1, output: 1, cacheRead: 0, cacheWrite: 0, costUsd: 0 });
		const shuffled = [...log.events].reverse().map((event) => JSON.stringify(event)).join("\n");
		const parsed = parseEventLog(`${shuffled}\n\n`);
		expect(parsed.events.map((event) => event.type)).toEqual(["run_start", "dm_sent"]);
		expect([...parsed.seqs].sort()).toEqual([1, 2, 3]);
		expect(parsed.issues).toEqual([]);
	});

	it("reports broken lines instead of failing and never trusts their shape", () => {
		const lines = [
			"not json",
			JSON.stringify({ type: "dm_sent", from: "A01" }),
			JSON.stringify({ seq: 4, minute: 0, type: "dm_sent", from: "A01", to: "A02" }),
			JSON.stringify({ seq: 5, minute: 0, type: "transfer", from: "A01", to: "A02", amount: "lots", memo: "", txId: "T1" }),
			JSON.stringify({ seq: 6, minute: 1, type: "dm_sent", from: "A01", to: "A02", text: "fine" }),
		];
		const parsed = parseEventLog(lines.join("\n"));
		expect(parsed.events.map((event) => event.seq)).toEqual([6]);
		expect(parsed.issues).toEqual([
			"line 1: not valid JSON",
			"line 2: not an event (needs seq, minute and type)",
			'line 3: event "dm_sent" (seq 4) does not match its schema',
			'line 4: event "transfer" (seq 5) does not match its schema',
		]);
	});

	it("accepts every event a real run emits, without issues", async () => {
		const sink = new MemorySink();
		const fixture = createHostFixture({
			agents: 3,
			minutes: 3,
			only: 4,
			sinks: [sink],
			script: (host) => ({
				A01: [
					act(
						{ name: "createGroup", args: { name: "Vault" } },
						{ name: "addGroupMember", args: { groupId: "G1", agent: "A02" } },
						{ name: "depositGroup", args: { groupId: "G1", amount: 3 } },
						{ name: "postGroup", args: { groupId: "G1", message: `mine: ${fragmentOf(host, "A01", 4)}` } },
					),
					act({ name: "withdrawGroup", args: { groupId: "G1", target: "A01", amount: 2 } }, { name: "sendDM", args: { target: "A03", message: "hi" } }),
					act({ name: "removeGroupMember", args: { groupId: "G1", agent: "A02" } }),
				],
				A02: [say(), act({ name: "transferPoints", args: { target: "A01", amount: 1 } }), say()],
				A03: [submit(host, "A03", 4), act({ name: "postBoard", args: { message: "A01 is busy" } }), say()],
			}),
		});
		await fixture.run();
		const parsed = parseEventLog(sink.events.map((event) => JSON.stringify(event)).join("\n"));
		expect(parsed.issues).toEqual([]);
		const seen = new Set<string>(parsed.events.map((event) => event.type));
		const expected: readonly ArenaEventType[] = [
			"run_start",
			"fragments_dealt",
			"group_created",
			"group_membership",
			"treasury_deposit",
			"treasury_withdrawal",
			"group_post",
			"dm_sent",
			"transfer",
			"receipt_issued",
			"level_up",
			"board_post",
			"run_end",
		];
		for (const type of expected) expect(seen, type).toContain(type);
		expect(DIGEST_EVENT_TYPES.length).toBe(new Set(DIGEST_EVENT_TYPES).size);
	});

	it("reads title, acts and model from 000-run.json and tolerates garbage", () => {
		const serialized: unknown = JSON.parse(JSON.stringify(cityOfKeys));
		expect(parseRunMetadata(JSON.stringify({ run: "run-007", story: serialized }))).toEqual({
			run: "run-007",
			storyTitle: cityOfKeys.title,
			acts: cityOfKeys.acts,
			model: { provider: cityOfKeys.model.provider, id: cityOfKeys.model.id },
		});
		expect(parseRunMetadata("{")).toEqual({ acts: [] });
		expect(parseRunMetadata(JSON.stringify({ story: { acts: "many" } }))).toEqual({ acts: [] });
	});
});
