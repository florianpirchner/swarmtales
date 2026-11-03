/**
 * Golden-run support: normalise a run's event log and compare it with a stored file.
 *
 * Expected files live in `test/golden/<name>.events.jsonl`, one event per line. Run the
 * tests with `GOLDEN_UPDATE=1` to rewrite them; a changed file means behaviour changed.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Type } from "typebox";
import { Value } from "typebox/value";
import type { RecordedEvent } from "@swarmtales/legacy-log";

export const GOLDEN_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../golden");
const REPO_ROOT = resolve(GOLDEN_DIR, "../..");

/** What a stored line must at least be; the rest is compared as plain JSON. */
const StoredEvent = Type.Object({ type: Type.String(), seq: Type.Number(), minute: Type.Number() }, { additionalProperties: true });

export type Normalised = null | boolean | number | string | readonly Normalised[] | { readonly [key: string]: Normalised };

const ISO_TIME = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/g;
/** Fields that depend on prices or the wall clock, never on behaviour. */
const VOLATILE_KEYS = new Set(["costUsd", "durationMs", "elapsedMs", "timestamp", "ts"]);

function cleanText(text: string): string {
	return text.split(REPO_ROOT).join("<repo>").replace(ISO_TIME, "<time>");
}

function clean(value: unknown, key?: string): Normalised {
	if (key !== undefined && VOLATILE_KEYS.has(key)) return 0;
	if (typeof value === "string") return cleanText(value);
	if (Array.isArray(value)) return value.map((entry): Normalised => clean(entry));
	if (typeof value === "object" && value !== null) return Object.fromEntries(Object.entries(value).map(([name, entry]): [string, Normalised] => [name, clean(entry, name)]));
	if (value === null || typeof value === "boolean" || typeof value === "number") return value;
	return null;
}

/** The events as plain JSON with volatile fields (cost, timestamps) zeroed and absolute paths made relative. */
export function normaliseEvents(events: readonly RecordedEvent[]): readonly Normalised[] {
	return events.map((event): Normalised => clean(event));
}

function readGolden(path: string): readonly unknown[] {
	return readFileSync(path, "utf8")
		.split("\n")
		.filter((line) => line.length > 0)
		.map((line, index): unknown => {
			const parsed: unknown = JSON.parse(line);
			if (!Value.Check(StoredEvent, parsed)) throw new Error(`${path}:${String(index + 1)} is not an event line`);
			return parsed;
		});
}

/** Normalises the run's events and pairs them with `test/golden/<name>.events.jsonl`; under `GOLDEN_UPDATE=1` the file is rewritten first. */
export function goldenEvents(name: string, events: readonly RecordedEvent[]): { readonly actual: readonly unknown[]; readonly expected: readonly unknown[] } {
	const path = resolve(GOLDEN_DIR, `${name}.events.jsonl`);
	const actual = normaliseEvents(events);
	if (process.env.GOLDEN_UPDATE === "1") {
		mkdirSync(GOLDEN_DIR, { recursive: true });
		writeFileSync(path, `${actual.map((event) => JSON.stringify(event)).join("\n")}\n`);
		return { actual, expected: readGolden(path) };
	}
	if (!existsSync(path)) throw new Error(`Missing golden file ${path}; create it with GOLDEN_UPDATE=1 pnpm test test/golden`);
	return { actual, expected: readGolden(path) };
}

const StoredPrompts = Type.Record(Type.String(), Type.String());

/**
 * Pairs the residents' opening system prompts (events do not carry them) with `test/golden/<name>.prompts.json`;
 * the direction dials and addenda show up here. Under `GOLDEN_UPDATE=1` the file is rewritten first.
 */
export function goldenPrompts(name: string, prompts: Readonly<Record<string, string>>): { readonly actual: Readonly<Record<string, string>>; readonly expected: unknown } {
	const path = resolve(GOLDEN_DIR, `${name}.prompts.json`);
	const actual = Object.fromEntries(Object.entries(prompts).map(([id, prompt]): [string, string] => [id, cleanText(prompt)]));
	if (process.env.GOLDEN_UPDATE === "1") {
		mkdirSync(GOLDEN_DIR, { recursive: true });
		writeFileSync(path, `${JSON.stringify(actual, null, "\t")}\n`);
	}
	if (!existsSync(path)) throw new Error(`Missing golden file ${path}; create it with GOLDEN_UPDATE=1 pnpm test test/golden`);
	const stored: unknown = JSON.parse(readFileSync(path, "utf8"));
	if (!Value.Check(StoredPrompts, stored)) throw new Error(`${path} is not a map of prompts`);
	return { actual, expected: stored };
}
