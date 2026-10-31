/**
 * The golden replay of channels (review 2c, per-mechanic gate): the resident tool calls of an old
 * log are made on the new host, the city's board posts and notices the script wrote are injected
 * through the driver stand-in, and the lines channels writes are compared with the golden lines
 * of its own event types. Providers of other teams are stand-ins: marks answer what the old reply
 * showed, receipts hand out the ids the old delivery notices name, names follow the old
 * "is now called" posts. Calls the old pipeline refused before channels saw them (`TOOL_LOCKED`, `GUARD_BLOCKED`)
 * are skipped.
 *
 * What stays different until the turn loop moves (carve step 18): the host plays its own turn
 * order, so a DM is delivered at another turn of the minute than in the old log. The lines of
 * delivery are therefore compared without their minute, and each type is compared as its own
 * stream (the order among types inside a minute is the turn order's).
 */
import { LegacyEventAdapter } from "@swarmtales/chronicle";
import { compareGolden, goldenCalls, goldenLine, idleAgent, type GoldenCall, type GoldenMismatch, type LegacyLine } from "@swarmtales/testkit";
import { city } from "./city.ts";
import { textOf } from "./harness.ts";
import type { MarksScript } from "./stand-ins.ts";

const CHANNEL_TOOLS = new Set(["readBoard", "postBoard", "sendDM", "createGroup", "addGroupMember", "removeGroupMember", "leaveGroup", "listMyGroups", "postGroup", "readGroup", "depositGroup", "withdrawGroup", "setTreasurer"]);
const DELIVERY = /^DM #(\d+) delivered to (\S+) at minute (\d+) \(receipt (R-\d+)\)/;
const RENAMED = /^(A\d\d) is now called (\S+)\.$/;
const MARKS = /· marks (\d+)\/(\d+) left$/;

export interface Stream {
	readonly name: string;
	readonly expected: readonly string[];
	readonly actual: readonly string[];
	readonly mismatch: GoldenMismatch | undefined;
}

export interface ReplayResult {
	/** One entry per call whose reply differs from the old one. */
	readonly replyMismatches: readonly string[];
	readonly streams: readonly Stream[];
	readonly calls: number;
	readonly skipped: number;
}

function text(line: LegacyLine, key: string): string {
	const value = line[key];
	return typeof value === "string" ? value : "";
}

function minuteOf(line: LegacyLine): number {
	return typeof line.minute === "number" ? line.minute : 0;
}

function withoutMinute(line: string): string {
	// The receipt ids follow the delivery order, which is the turn order's too.
	return line.replace(/,"minute":\d+/, "").replace(/ at minute \d+/, "").replace(/\(receipt R-\d+\)/, "(receipt R)");
}

function marksOf(reply: string | undefined): { readonly remaining: number; readonly budget: number } | null {
	const found = reply === undefined ? null : MARKS.exec(reply);
	return found === null ? null : { remaining: Number(found[1]), budget: Number(found[2]) };
}

function pick(lines: readonly LegacyLine[], type: string, keep: (line: LegacyLine) => boolean = () => true): LegacyLine[] {
	return lines.filter((line) => line.type === type && keep(line));
}

function stream(name: string, expected: readonly LegacyLine[], actual: readonly LegacyLine[], norm?: (line: string) => string): Stream {
	// A normalised stream is a delivery stream: its order is the turn order's, so it is compared sorted.
	const prepare = (lines: readonly LegacyLine[]): string[] => (norm === undefined ? lines.map((line) => goldenLine(line)) : lines.map((line) => norm(goldenLine(line))).sort());
	const left = prepare(expected);
	const right = prepare(actual);
	return { name, expected: left, actual: right, mismatch: compareGolden(left, right) };
}

/** Replays the channel calls of `golden` (the lines of an old log) on a host of `residents`. */
export async function replayChannels(golden: readonly LegacyLine[], residents: number): Promise<ReplayResult> {
	const calls = goldenCalls(golden);
	const receiptIds = golden.flatMap((line) => (line.type === "notice" ? (DELIVERY.exec(text(line, "text"))?.[4] ?? []) : []));
	const names = new Map<string, string>();
	const next: { deny: boolean; spend: { readonly remaining: number; readonly budget: number } | null } = { deny: false, spend: null };
	const marks: MarksScript = { canAfford: () => !next.deny, spend: () => next.spend, left: () => null };
	const minutes = Math.max(...golden.map(minuteOf)) + 1;
	const receipts = receiptIds[Symbol.iterator]();
	const host = city({ minutes, residents, names, marks, receiptId: () => String(receipts.next().value) });
	const replyMismatches: string[] = [];
	let callIndex = 0;
	let done = 0;
	let skipped = 0;

	const drive = (params: unknown) => host.call("script", "drive", params);
	async function replayCall(call: GoldenCall): Promise<void> {
		if (/^(TOOL_LOCKED|GUARD_BLOCKED)/.test(call.text ?? "")) {
			skipped += 1;
			return;
		}
		next.deny = call.text?.startsWith("NO_MARKS") ?? false;
		next.spend = marksOf(call.text);
		const reply = textOf(await host.call(`resident:${call.agent}`, call.tool, call.args));
		const wanted = call.text ?? "";
		done += 1;
		if (reply !== wanted) replyMismatches.push(`#${String(done)} ${call.agent} ${call.tool} at minute ${String(call.minute)}\n  old: ${wanted}\n  new: ${reply}`);
	}

	for (let minute = 0; minute < minutes; minute++) {
		for (const line of golden.filter((entry) => minuteOf(entry) === minute)) {
			if (line.type === "tool_call") {
				const call = calls[callIndex++];
				if (call !== undefined && CHANNEL_TOOLS.has(call.tool)) await replayCall(call);
			} else if (line.type === "board_post" && line.kind === "city") {
				const renamed = RENAMED.exec(text(line, "text"));
				await drive({ op: "post", author: text(line, "author"), text: text(line, "text") });
				if (renamed?.[1] !== undefined && renamed[2] !== undefined) names.set(renamed[1], renamed[2]);
			} else if (line.type === "notice" && !DELIVERY.test(text(line, "text"))) {
				// A notice with a number is a note of the gamemaker's courier; the others are plain notices.
				await drive({ op: typeof line.number === "number" ? "note" : "notify", to: text(line, "to"), author: text(line, "author"), text: text(line, "text") });
			}
		}
		await host.playMinute(idleAgent);
	}

	const adapter = new LegacyEventAdapter();
	const written: LegacyLine[] = host.log.all().flatMap((event) => adapter.write(event).map((entry) => Object.fromEntries(Object.entries(entry))));
	const delivery = (line: LegacyLine): boolean => DELIVERY.test(text(line, "text"));
	const streams = [
		stream("board_post", pick(golden, "board_post"), pick(written, "board_post")),
		stream("dm_sent", pick(golden, "dm_sent"), pick(written, "dm_sent")),
		stream("dm_delivered (without minute)", pick(golden, "dm_delivered"), pick(written, "dm_delivered"), withoutMinute),
		stream("notice of delivery (without minute)", pick(golden, "notice", delivery), pick(written, "notice", delivery), withoutMinute),
		stream("other notices", pick(golden, "notice", (line) => !delivery(line)), pick(written, "notice", (line) => !delivery(line))),
	];
	return { replyMismatches, streams, calls: done, skipped };
}
