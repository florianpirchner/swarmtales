/**
 * Act II from the Act I checkpoints (examples/cityofkeys-act1-06a-04 and -06a-01, snapshot-L7):
 * the old run continues on the old engine (`resumeOld`, the composed arena with idle residents and
 * no gamemaker), and the same file, converted by `convertLegacySnapshot`, continues on the new host
 * with the real exile, tribunal and ledger, which load their own version-0 slices. Nothing of the
 * exile's or the tribunal's state is built by hand. Progression, channels, puzzles, the standoff,
 * goals and the seal are the T4a stand-ins (their mechanics need the doors and the whole story);
 * progression answers what the old world answered: the levels, the act's start and the last
 * level-ups, read from the old continuation. Every other slice gets a stand-in that keeps it.
 *
 * Compared, in log order, up to and with the first gate's close: the tribunal's and the exile's
 * events, the city's posts and notices, and the bookings.
 */
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import { createHost } from "@swarmtales/kernel";
import { dropJustified, standInsFor } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type { EventEnvelope } from "@swarmtales/contracts";
import { exile } from "@swarmtales/mechanic-exile";
import { ledger } from "@swarmtales/mechanic-ledger";
import { standoff } from "@swarmtales/mechanic-standoff";
import { tribunal } from "@swarmtales/mechanic-tribunal";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { resumeOld, snapshotFile } from "../channels/resume.ts";
import { standIns, TestCity } from "../exile/support/city.ts";
import { storyOptions } from "../exile/support/host.ts";
import { T4A_EVENTS } from "./support/twin.ts";

const MINUTES = 45;
/** Minutes of the old continuation after which the held pieces are read: Act II's door is dealt, no gate is open yet. */
const HELD_AFTER = 10;
const CITY = "CITY";
/** What the stand-ins and the real mechanics load here; the converter's other slices get a stand-in each. */
const LOADED = ["ledger", "channels", "progression", "puzzles", "standoff", "goals", "seal", "exile", "tribunal"];
const TRIBUNAL_EVENTS = new Set([...T4A_EVENTS, "level_contracted", "factor_burned", "piece_kept"]);

type Line = Readonly<Record<string, unknown>>;

const Groups = Type.Object({ world: Type.Object({ groups: Type.Object({ groups: Type.Array(Type.Object({ id: Type.String() })) }) }) });

/** The city's posts and notices of the other mechanics in the old run, by owner (they are stand-ins here). */
const OTHERS: readonly { readonly owner: string; readonly text: RegExp }[] = [
	{ owner: "goals (T3)", text: /secret goal/ },
	{ owner: "marks (T2)", text: /cost 1 mark each/ },
	{ owner: "progression (T3)", text: /^"(City factor of level|Standings at minute)/ },
	{ owner: "seal (T4b)", text: /black seal/ },
	{ owner: "channels (T2): its notice when the city adds a resident to a group", text: /^\{"to":"A\d+","text":"The city added you to group/ },
];

function othersOf(line: string): string | undefined {
	const text = line.split(" ").slice(2).join(" ");
	return OTHERS.find((other) => other.text.test(text))?.owner;
}

function fields(event: Line): Line {
	return Object.fromEntries(Object.entries(event).filter(([key]) => !["seq", "minute", "type"].includes(key)));
}

function oldLines(lines: readonly Line[]): readonly string[] {
	return lines.flatMap((line): string[] => {
		const type = String(line.type);
		const minute = String(line.minute);
		if (type === "board_post" && line.author === CITY) return [`${minute} post ${JSON.stringify(line.text)}`];
		if (type === "notice" && line.author === CITY) return [`${minute} notice ${JSON.stringify({ to: line.to, text: line.text })}`];
		if (type === "ledger_entry") return [`${minute} ledger ${JSON.stringify({ debit: line.debit, credit: line.credit, amount: line.amount, reason: line.reason })}`];
		return TRIBUNAL_EVENTS.has(type) ? [`${minute} event ${JSON.stringify({ type, ...fields(line) })}`] : [];
	});
}

function record(value: unknown): Line {
	return typeof value === "object" && value !== null ? Object.fromEntries(Object.entries(value)) : {};
}

function newLines(events: readonly EventEnvelope[]): readonly string[] {
	return events.flatMap((event): string[] => {
		const payload = record(event.payload);
		const minute = String(event.minute);
		if (event.type === "service_called") {
			const input = record(payload.input);
			const call = `${String(payload.api)}.${String(payload.method)}`;
			if (call === "channels.post") return [`${minute} post ${JSON.stringify(input.text)}`];
			if (call === "channels.notify") return [`${minute} notice ${JSON.stringify({ to: input.to, text: input.text })}`];
			return [];
		}
		if (event.type === "ledger_entry") return [`${minute} ledger ${JSON.stringify({ debit: payload.debit, credit: payload.credit, amount: payload.amount, reason: payload.reason })}`];
		return TRIBUNAL_EVENTS.has(event.type) && event.source !== "core" ? [`${minute} event ${JSON.stringify({ type: event.type, ...payload })}`] : [];
	});
}

/** The lines up to and with the minute the first gate closes. */
function untilFirstExile(lines: readonly string[]): readonly string[] {
	const closed = lines.find((line) => line.includes(' event {"type":"exiled"'));
	const minute = Number(closed?.split(" ")[0]);
	return lines.filter((line) => Number(line.split(" ")[0]) <= minute);
}

async function both(name: string) {
	const raw = snapshotFile(name);
	const old = await resumeOld(raw, cityOfKeys, MINUTES, () => []);
	const converted = convertLegacySnapshot(JSON.parse(JSON.stringify(raw)));
	const ids = converted.host.residents.ids;
	const spec = cityOfKeys.tribunal;
	if (spec === undefined) throw new Error("cityofkeys has a tribunal");
	// Progression's answers, as the old world gave them (world.ts:568-579).
	const city = new TestCity(ids, 0);
	for (const id of ids) {
		city.levels.set(id, old.world.levelOf(id));
		city.lastProgress.set(
			id,
			old.world.receipts
				.of(id)
				.filter((receipt) => receipt.kind === "levelUp")
				.reduce((latest, receipt) => Math.max(latest, receipt.minute), -1),
		);
	}
	// The pieces each resident holds in Act II (puzzles deals them at its first door), from the old run before the first gate.
	const dealt = await resumeOld(raw, cityOfKeys, HELD_AFTER, () => []);
	for (const id of ids) {
		city.held.set(
			id,
			dealt.world.heldPieces(id).map((piece) => ({ ...piece, needers: [...piece.needers] })),
		);
		const levels = Array.from({ length: dealt.world.lastLevel }, (_unused, index) => index + 1);
		city.passedLevels.set(id, new Set(levels.filter((level) => dealt.world.hasPassed(id, level))));
	}
	city.actStart = old.world.actStartOf(spec.act ?? old.world.startLevel) ?? null;
	// The channels stand-in numbers the city's groups after the groups of the file (the real channels counts them in its slice).
	city.groupSeq = Parse(Groups, raw).world.groups.groups.length;
	city.bounds = { startLevel: old.world.startLevel, lastLevel: old.world.lastLevel, survivors: cityOfKeys.run.survivors };
	const options = storyOptions({
		id: converted.host.story,
		seed: converted.host.seed,
		minutes: converted.host.minute + 1 + MINUTES,
		residents: ids,
		mechanics: [
			ledger.with({ startPoints: cityOfKeys.run.startPoints }),
			...standIns(city).filter((use) => use.mechanic.id !== "ledger" && use.mechanic.id !== "standoff"),
			// The real standoff (T4b) on its own version-0 slice: it keeps the exiled's pieces (P43) and tells their needers.
			standoff.with({ author: cityOfKeys.gamemaker?.author ?? "COURIER" }),
			exile.with(),
			tribunal.with({ ...spec }),
			...standInsFor(converted.host, LOADED),
		],
	});
	const host = createHost({ ...options, resume: { snapshot: converted.host, events: converted.events } });
	const cut = host.log.length;
	while (host.ended === undefined && host.minute < converted.host.minute + MINUTES) await host.playMinute(() => Promise.resolve());
	const theirs = dropJustified(untilFirstExile(oldLines(old.lines)), (line) => othersOf(line) !== undefined, `the other mechanics' posts and notices (${OTHERS.map((other) => other.owner).join("; ")})`);
	return { old: theirs.kept, now: untilFirstExile(newLines(host.log.all().slice(cut))), converted };
}

describe("tribunal and exile resumed from the Act I checkpoints (differential with the old continuation)", () => {
	it.each(["cityofkeys-act1-06a-04", "cityofkeys-act1-06a-01"])("continues %s into Act II like the old run, up to the first gate's close", async (name) => {
		const { old, now } = await both(name);
		expect(now).toEqual(old);
		// It reached the first call, the vote, the gate and its close.
		for (const type of ["tribunal_called", "tribunal_opened", "tribunal_result", "exile_gate", "exiled"]) expect(old.some((line) => line.includes(`{"type":"${type}"`)), type).toBe(true);
	}, 60_000);
});
