// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The sessions in the snapshot (M5 spec 4.5, row 1; issue M5-08): a run of scripted model sessions is cut at a tick
 * boundary, its snapshot file is written with the section `sessions` through the key broker's redaction, scanned for
 * the key canaries, read back, and the run goes on from it with new sessions loaded from the file. Each request
 * after the cut must be the one the straight run sent, and the log must be the straight run's.
 *
 * What a scripted run cannot hold fixed is compared by projection after the first request: the provider library's
 * fake provider draws a new api id, new tool call ids and a cold cache for every binding, which a live provider does
 * not (its api id is fixed, its ids come with its answers). The first request after the cut has no new answer in it
 * and is compared whole. Offline: the scripted source, fake key values, the global `fetch` rejects, `Date` is fixed.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { jsonHash } from "@swarmtales/chain";
import { type ActorDriver, type ActorId, type DriverTable, type GameData, type Kernel, type KernelSnapshot, type RunManifest } from "@swarmtales/contracts";
import { act, createCostMeter, createKeyBroker, createModelDrivers, fail, parseSavedSessions, RESIDENT_RECORDS, type SavedSessions, say, scriptedSource, type ScriptStep } from "@swarmtales/models";
import { findLeaks, openRunFolder, readSnapshotFile, writeSnapshotFile } from "@swarmtales/runlog";
import { guessNumber, testKernel } from "@swarmtales/testkit";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Fake key values, built at run time: one shaped like a key, one shaped like no pattern (the broker's value redaction).
const SHAPED = `sk-${"d5".repeat(18)}y`;
const PLAIN = `or/${"Q8+".repeat(12)}=`;
const env = { SWT_ANTHROPIC_API_KEY: SHAPED, OPENROUTER_API_KEY: PLAIN };
const broker = createKeyBroker(env);
const A01: ActorId = "resident:A01";
const A02: ActorId = "resident:A02";
const CUT = 3;
const TICKS = 6;
const game: GameData = { schema: 1, id: "guess", residents: 2, seed: 7, mechanics: [{ use: "guess-number", options: { max: 100 } }], scheduler: { id: "turns", options: { order: "roster", activation: "toAct" } }, end: { ticks: TICKS } };
const texts = { render: (_owner: string, _id: string, variables: Readonly<Record<string, string | number>>): string => `[tools] Open to you now: ${String(variables.tools)}.` };
const SETTINGS = { provider: "faux", modelId: "faux", requestedId: "faux", thinking: "off", maxOutputTokens: 4000 } as const;

// What one request sent: the whole context as the provider library hands it to the provider, and the fixed options.
interface Sent {
	readonly actor: ActorId;
	readonly context: string;
	readonly options: readonly unknown[];
}

// The answers of one resident: A02 puts the canaries into a text and into a failed request; then guesses whose argument keys are not sorted.
function answers(actor: ActorId): readonly ScriptStep[] {
	const guesses = Array.from({ length: 8 }, (_, index) => act({ name: "guess", args: { value: 10 * (index + 1), note: "z first", aside: "a later" } }));
	return actor === A02 ? [say(`My key is ${SHAPED}.`), fail(`the provider is down (${PLAIN})`), ...guesses] : [say("I start low."), say(), ...guesses];
}

// A request as a provider reads it: the roles and texts, the tool calls by name and arguments, and the declared tools.
function projected(request: Sent): unknown {
	const parsed: unknown = JSON.parse(request.context.replaceAll(SHAPED, "[redacted]").replaceAll(PLAIN, "[redacted]"));
	const messages = typeof parsed === "object" && parsed !== null && "messages" in parsed && Array.isArray(parsed.messages) ? parsed.messages : [];
	const keep = (part: unknown): unknown => (typeof part === "object" && part !== null && "type" in part && part.type === "toolCall" && "name" in part && "arguments" in part ? [part.name, JSON.stringify(part.arguments)] : part);
	const of = (message: unknown): unknown => {
		if (typeof message !== "object" || message === null || !("role" in message) || !("content" in message)) return message;
		return [message.role, Array.isArray(message.content) ? message.content.map(keep) : message.content, "toolsAdded" in message ? message.toolsAdded : undefined];
	};
	return [request.actor, request.options, messages.map(of)];
}

// The log without what a fake provider's cold cache changes: the token counts of a `response` record.
const counted = (log: readonly unknown[]): readonly unknown[] => log.map((line) => (typeof line === "object" && line !== null && "type" in line && line.type === "response" && "payload" in line && typeof line.payload === "object" && line.payload !== null && "stopReason" in line.payload ? { ...line, payload: line.payload.stopReason } : line));

// A step that builds its answer from the request.
type Answer = Extract<ScriptStep, (...args: never[]) => unknown>;

// Each step notes its request, then answers.
function noted(sent: Sent[], actor: ActorId, steps: readonly ScriptStep[]): readonly ScriptStep[] {
	return steps.map((step): ScriptStep => (...args: Parameters<Answer>) => {
		const [context, options] = args;
		sent.push({ actor, context: JSON.stringify(context), options: [options?.sessionId, options?.maxTokens, options?.timeoutMs] });
		return typeof step === "function" ? step(...args) : step;
	});
}

// A log as plain JSON values.
function plain(log: readonly unknown[]): readonly unknown[] {
	const value: unknown = JSON.parse(JSON.stringify(log));
	return Array.isArray(value) ? value : [];
}

interface Seat {
	readonly drivers: DriverTable;
	readonly save: () => SavedSessions;
}

// The model drivers of a run whose answers start at `from` requests of each actor; `saved` loads the sessions of a cut.
function seat(kernel: Kernel, sent: Sent[], from: Readonly<Record<string, number>>, saved?: SavedSessions): Seat {
	const script = Object.fromEntries([A01, A02].map((actor) => [actor, noted(sent, actor, answers(actor).slice(from[actor] ?? 0))]));
	const actors = [A01, A02].map((id) => ({ id, kind: "resident", grant: "resident", shared: {} }));
	const made = createModelDrivers({ kernel, actors, source: scriptedSource(script), settings: SETTINGS, systemPrompts: { [A01]: "You are A01.", [A02]: "You are A02." }, meter: createCostMeter(100), redact: broker.redact, texts, hash: jsonHash, ...(saved === undefined ? {} : { saved }) });
	if (saved === undefined) made.fix();
	// guess-number writes no input line; one per tick lets every resident ask at every activation.
	const drivers = Object.fromEntries(Object.entries(made.drivers).map(([actor, driver]): [string, ActorDriver] => [actor, (activation) => driver({ ...activation, inputs: [...activation.inputs, { source: "test", kind: "line", text: `Tick ${String(activation.tick)}.` }] })]));
	return { drivers, save: () => made.save() };
}

const manifest: RunManifest = {
	format: "swarmtales-run", version: 1, run: { id: "guess-001", startedAt: "2026-11-15T10:00:00.000Z", purpose: "smoke" }, game: { id: "guess", hash: jsonHash(game), params: {} },
	kernel: { revision: 6, version: "0.0.0", node: "26.13.0" }, scheduler: { id: "turns", revision: 1, determinism: "seeded", options: {}, optionsHash: "a".repeat(64) },
	plugins: [], actors: [], texts: {}, seed: 7, replicate: 0, limits: { maxTicks: TICKS }, naming: 1, log: { format: "swarmtales.events", version: 1 },
};
const options = { installed: { "guess-number": guessNumber }, records: [RESIDENT_RECORDS] };
let root = "";
beforeAll(() => {
	root = mkdtempSync(join(tmpdir(), "swt-sessions-"));
	vi.stubGlobal("fetch", () => Promise.reject(new TypeError("a test reached the global fetch")));
	vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-15T10:00:00.000Z") });
});
afterAll(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	rmSync(root, { recursive: true, force: true });
});

// The straight run, cut at `CUT`: its requests, its log, the requests sent before the cut, the snapshot and the sessions there.
async function straightRun(): Promise<{ readonly sent: readonly Sent[]; readonly before: number; readonly log: readonly unknown[]; readonly lines: number; readonly snapshot: KernelSnapshot; readonly sessions: SavedSessions }> {
	const sent: Sent[] = [];
	const { kernel } = testKernel(game, options);
	const { drivers, save } = seat(kernel, sent, {});
	await kernel.run(drivers, { ticks: CUT });
	const cut = { before: sent.length, lines: kernel.log.length, snapshot: kernel.snapshot(), sessions: save() };
	await kernel.run(drivers);
	return { sent, log: plain(kernel.log.all()), ...cut };
}

describe("the sessions in the snapshot", () => {
	it("a scripted session saved into a snapshot file and loaded asks the same next requests, and the file holds no key canary", async () => {
		const straight = await straightRun();
		const folder = openRunFolder(join(root, "guess-001"), manifest, { now: () => new Date(), game, redact: broker.redact });
		const { path } = await writeSnapshotFile(folder, straight.snapshot, CUT, { sessions: straight.sessions, redact: broker.redact });
		folder.close();
		expect(findLeaks(folder.directory, (text) => broker.leaks(text))).toEqual([]);
		const file = await readSnapshotFile(path, { runId: "guess-001", gameHash: manifest.game.hash });
		const saved = parseSavedSessions(file.sessions, broker.redact);
		expect([JSON.stringify(saved).includes("[redacted]"), saved[A02]?.notice]).toEqual([true, ["guess"]]);
		// The requests each actor had sent before the cut: its script goes on after them.
		const from = Object.fromEntries([A01, A02].map((actor) => [actor, straight.sent.slice(0, straight.before).filter((request) => request.actor === actor).length]));
		const sent: Sent[] = [];
		const { kernel } = testKernel(game, { ...options, resume: { snapshot: file.snapshot, log: straight.log.slice(0, straight.lines) } });
		await kernel.run(seat(kernel, sent, from, saved).drivers);
		const after = straight.sent.slice(straight.before);
		expect(sent.length).toBe(after.length);
		expect(sent.length).toBeGreaterThan(4);
		// A01's conversation held no secret: its next request is the straight one, byte for byte. A02's is too, with its secrets redacted.
		const first = (list: readonly Sent[], actor: ActorId): Sent | undefined => list.find((request) => request.actor === actor);
		expect(first(sent, A01)).toEqual(first(after, A01));
		expect(first(sent, A02)?.context).toBe(first(after, A02)?.context.replaceAll(SHAPED, "[redacted]").replaceAll(PLAIN, "[redacted]"));
		expect(sent.map(projected)).toEqual(after.map(projected));
		expect(counted(plain(kernel.log.all()))).toEqual(counted(straight.log));
	});
});
