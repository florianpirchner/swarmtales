/**
 * The signed event log leaves the goldens alone (docs/design/event-log-signing.md): a golden run
 * with the chain on still logs the golden lines, its `events.jsonl` holds exactly the lines the run
 * recorded, and the sidecar verifies against them.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CHAIN_FILE, EVENTS_FILE, EventChain, JsonlEventLog, PUBLIC_KEY_FILE, verifyChain } from "@swarmtales/chronicle";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { storyHash } from "../../apps/cli/src/host/chain.ts";
import { act, createHostFixture } from "../helpers/host-fixture.ts";
import { goldenEvents } from "../helpers/golden.ts";
import { cityScript, gamemakerSteps } from "./host-scripts.ts";

describe("golden runs with the signed event log", () => {
	it("cityofkeys-f4g4 with the chain on: golden lines, unchanged events.jsonl, a chain that holds", async () => {
		const directory = mkdtempSync(join(tmpdir(), "golden-chain-"));
		try {
			const chain = new EventChain(directory, { story: cityOfKeys.id, storyHash: storyHash(cityOfKeys), seed: 7, models: { gamemaker: "scripted/-" } });
			const fixture = createHostFixture({
				story: cityOfKeys,
				agents: 6,
				minutes: 12,
				seed: 7,
				names: true,
				figureDirection: 4,
				gmDirection: 4,
				script: cityScript,
				gamemakerScript: (host) => gamemakerSteps(host, 12, (minute) => (minute === 6 ? act({ name: "postBoard", args: { text: "The city is watching who shares." } }) : undefined)),
				sinks: [new JsonlEventLog(join(directory, EVENTS_FILE), { chain })],
			});
			await fixture.run();
			chain.close();
			const events = goldenEvents("cityofkeys-f4g4", fixture.log.events);
			expect(events.actual).toEqual(events.expected);

			const written = readFileSync(join(directory, EVENTS_FILE), "utf8").trimEnd().split("\n");
			const recorded = fixture.log.events.map((event): unknown => JSON.parse(JSON.stringify(event)));
			const unstamped = written.map((line): unknown => {
				const value: unknown = JSON.parse(line);
				return typeof value === "object" && value !== null ? Object.fromEntries(Object.entries(value).filter(([key]) => key !== "at")) : value;
			});
			expect(unstamped).toEqual(recorded);
			expect(verifyChain(directory)).toMatchObject({ ok: true, lines: recorded.length });
			expect(readdirSync(directory).sort()).toEqual([CHAIN_FILE, EVENTS_FILE, PUBLIC_KEY_FILE].sort());
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	}, 120_000);
});
