/**
 * Every real old file reads into the new core's shapes and writes back byte for byte (review 2c,
 * "Adapter and converter"): the 14 run logs of `examples/` and `stories/*\/runs/` (live logs carry
 * the sink's wall clock `at` behind `minute`, which stays beside the envelope) and the 5 example
 * snapshots, which also resume a host whose mechanics are all testkit stand-ins.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot, envelopeFromLegacy, eventsOfType, LegacyEventAdapter, legacyLine, legacyStamp, parseEventLog, readCharacters, toLegacySnapshot } from "@swarmtales/chronicle";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { standInsFor } from "@swarmtales/testkit";

const ROOT = resolve(import.meta.dirname, "../..");

function runLogs(): readonly string[] {
	const examples = readdirSync(join(ROOT, "examples")).map((name) => join("examples", name, "run", "events.jsonl"));
	const stories = readdirSync(join(ROOT, "stories"), { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && existsSync(join(ROOT, "stories", entry.name, "runs")))
		.flatMap((entry) => readdirSync(join(ROOT, "stories", entry.name, "runs")).map((run) => join("stories", entry.name, "runs", run, "run", "events.jsonl")));
	return [...examples, ...stories].filter((path) => existsSync(join(ROOT, path))).sort();
}

const SNAPSHOTS = readdirSync(join(ROOT, "examples"))
	.map((name) => join("examples", name, "snapshot-L7.json"))
	.filter((path) => existsSync(join(ROOT, path)))
	.sort();

describe("the real run logs", () => {
	const logs = runLogs();

	it("are all found", () => {
		expect(logs).toHaveLength(14);
	});

	it.each(logs)("%s reads into envelopes and writes back byte for byte", (path) => {
		const text = readFileSync(join(ROOT, path), "utf8");
		const adapter = new LegacyEventAdapter();
		const lines = text.split("\n").filter((line) => line.length > 0);
		const written = lines.map((line) => {
			const raw: unknown = JSON.parse(line);
			const events = adapter.write(envelopeFromLegacy(raw));
			expect(events).toHaveLength(1);
			const [event] = events;
			return event === undefined ? "" : legacyLine(event, legacyStamp(raw));
		});
		expect(`${written.join("\n")}\n`).toBe(text);
		const first: unknown = JSON.parse(lines[0] ?? "{}");
		expect(Object.keys(legacyStamp(first))).toEqual(["at"]);
		expect(envelopeFromLegacy(first).payload).not.toHaveProperty("at");
	});
});

describe("the old event names", () => {
	it("read under the current names: an old log's core_dealt lines are motive_dealt to the readers (core becomes core motive)", () => {
		const text = readFileSync(join(ROOT, "examples", "cityofkeys-act1-06a-04", "run", "events.jsonl"), "utf8");
		expect(text).toContain('"type":"core_dealt"');
		const log = parseEventLog(text);
		expect(eventsOfType(log.events, "motive_dealt")).toHaveLength(6);
		expect([...readCharacters(text).coreMotives.keys()]).toEqual(["A01", "A02", "A03", "A04", "A05", "A06"]);
	});
});

describe("the example snapshots", () => {
	it("are all found", () => {
		expect(SNAPSHOTS).toHaveLength(5);
	});

	it.each(SNAPSHOTS)("%s converts, writes back byte for byte and resumes with stand-ins", (path) => {
		const text = readFileSync(join(ROOT, path), "utf8");
		const converted = convertLegacySnapshot(JSON.parse(text), {}, path);
		expect(`${JSON.stringify(toLegacySnapshot(converted))}\n`).toBe(text);
		const story = defineCoreStory({ id: converted.host.story, seed: converted.host.seed, minutes: 80, residents: converted.host.residents.ids, mechanics: standInsFor(converted.host, []), grants: {} });
		const host = createHost({ story, resume: { snapshot: converted.host, events: converted.events } });
		expect(host.minute).toBe(converted.host.minute);
		expect(host.log.length).toBe(converted.events.length);
		expect(Object.values(host.snapshot().mechanics).every((slice) => slice.version === 1)).toBe(true);
	});
});
