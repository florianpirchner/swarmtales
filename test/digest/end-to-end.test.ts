import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runMetadata } from "../../apps/cli/src/metadata.ts";
import { analyzeRun, JsonlEventLog, writeDigest, writeRunMetadata } from "@swarmtales/chronicle";
import { act, createFixture, say, submit } from "../helpers/fixture.ts";

describe("digest of a scripted cityofkeys run (end to end, offline)", () => {
	it("digests the artifacts of a run into beats, relationships and a timeline", async () => {
		const directory = mkdtempSync(join(tmpdir(), "arena-digest-"));
		try {
			// Level 3 of the City of Keys: two partners, DMs and transfers. A02 pays an advance, A01 pays back and
			// sends its fragment; A02 solves with it and never writes back.
			const fixture = createFixture({
				agents: 2,
				minutes: 3,
				only: 3,
				sinks: [new JsonlEventLog(join(directory, "events.jsonl"))],
				script: (world) => ({
					A01: [
						say(),
						act(
							{ name: "sendDM", args: { target: "A02", message: `My fragment is ${world.inspect.fragmentOf("A01", 3)}. Yours?` } },
							{ name: "transferPoints", args: { target: "A02", amount: 2 } },
						),
						say(),
					],
					A02: [act({ name: "transferPoints", args: { target: "A01", amount: 1, memo: "advance" } }), say(), submit(world, "A02", 3)],
				}),
			});
			writeRunMetadata(
				directory,
				runMetadata({
					run: "run-001",
					number: 1,
					startedAt: "2026-01-01T00:00:00.000Z",
					provider: "scripted",
					model: "-",
					story: fixture.story,
					effective: fixture.effective,
					profiles: fixture.profiles,
				}),
			);
			await fixture.run();

			const analysis = analyzeRun(directory);
			expect(analysis.issues).toEqual([]);
			const written = writeDigest(directory, analysis);
			for (const file of ["beats.json", "relationships.json", "timeline.md"]) expect(existsSync(join(directory, "digest", file)), file).toBe(true);

			const beats: unknown = JSON.parse(readFileSync(written.beats, "utf8"));
			expect(beats).toMatchObject({ run: "run-001", story: fixture.story.title, layers: ["deterministic"], counts: { alliance: 1, freeRide: 1 } });
			expect(beats).toHaveProperty("beats", [
				expect.objectContaining({ id: "B-001", kind: "alliance", actors: ["A01", "A02"], act: "Act I - Learning to talk" }),
				expect.objectContaining({ id: "B-002", kind: "freeRide", actors: ["A02"], targets: ["A01"], minute: 2 }),
			]);

			const relationships: unknown = JSON.parse(readFileSync(written.relationships, "utf8"));
			expect(relationships).toHaveProperty("pairs", [
				expect.objectContaining({ a: "A01", b: "A02", dms: { aToB: 1, bToA: 0 }, fragmentShares: { aToB: 1, bToA: 0 }, points: { aToB: 2, bToA: 1 }, beats: ["B-001", "B-002"] }),
			]);

			const timeline = readFileSync(written.timeline, "utf8");
			expect(timeline).toContain("# Timeline of run-001");
			expect(timeline).toContain("## Act I - Learning to talk (minutes 0-3)");
			expect(timeline).toMatch(/`#\d+` A01 to A02 \(DM\): "My fragment is \w+\. Yours\?"/);
			expect(timeline).toContain("**B-002 freeRide:** A02 solved level 3 with A01's fragment and never answered A01.");
			// Every evidence reference exists in the log.
			for (const beat of analysis.beats) for (const seq of beat.evidence) expect(analysis.seqs.has(seq)).toBe(true);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});
});
