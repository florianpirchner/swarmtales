/**
 * The `whispers` mechanic (carve step 6, team T1, docs/design/carve-team-T1.md): the whisperer
 * (chosen from the seed, given a duty notice by the city), the forged receipt and the popularity
 * vote with its tool `nameFavourite`. Copied from packages/engine/src/whisperer.ts, popularity.ts,
 * tools/whispers.ts and the whisper methods of world.ts. The receipts the whisperer may forge are
 * read back from the `receipt_issued` events (carve request R-5), the fragments that make a DM a
 * hand-over from `fragments_dealt` (R-13).
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type { ContextOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, INPUT_KINDS, LedgerApi, MarksApi, NamesApi, ReceiptsApi, STATUS_ORDER } from "@swarmtales/mechanic-shared";
import { dutyDue, forgeableList, isForgeable, previousDuty, quotedLine, shownLine, tallyWhispers, WhispererSpec, type DmReceipt, type Dm, type Forgery } from "./duty.ts";
import { countBallots, dutyTarget, namesList, PopularitySpec, type Counted, type Round } from "./vote.ts";

const CITY = "CITY";
const MAX_DM_LENGTH = 800;

type Phase = "pending" | "open" | "closed";
interface WhispersState {
	/** The whisperer; null in a control run, undefined before the run starts. */
	whisperer: string | null | undefined;
	forgeries: Forgery[];
	round: number;
	phase: Phase;
	ballots: Map<string, string>;
}

const Slice = Type.Object({
	whisperer: Type.Union([Type.String(), Type.Null()]),
	forgeries: Type.Array(Type.Object({ minute: Type.Integer(), to: Type.String() })),
	round: Type.Integer(),
	phase: Type.Union([Type.Literal("pending"), Type.Literal("open"), Type.Literal("closed")]),
	ballots: Type.Array(Type.Object({ agent: Type.String(), choice: Type.String() })),
});
/** The version-0 slice of the old world (`WhispersSnapshot`): the whisperer, the minutes (and victims) of its forgeries, the vote. */
const LegacySlice = Type.Object({
	whispers: Type.Object({
		whisperer: Type.Union([Type.String(), Type.Null()]),
		forgeries: Type.Array(Type.Integer()),
		forgedTo: Type.Optional(Type.Array(Type.String())),
		popularity: Type.Optional(Type.Object({ round: Type.Optional(Type.Integer()), state: Type.Union([Type.Literal("pending"), Type.Literal("open"), Type.Literal("closed")]), ballots: Type.Array(Type.Object({ agent: Type.String(), choice: Type.String() })) })),
	}),
});

export const whispersHead = defineHead({
	id: "whispers",
	summary: "The whisperer, forged receipts and the popularity vote.",
	options: Type.Object({
		whisperer: Type.Optional(WhispererSpec),
		popularity: Type.Optional(PopularitySpec),
		control: Type.Boolean({ default: false, description: "A control run: the story's whisperer does not play." }),
	}),
	state: (): WhispersState => ({ whisperer: undefined, forgeries: [], round: 0, phase: "pending", ballots: new Map<string, string>() }),
	events: {
		whisperer_chosen: Type.Object({ agent: Type.String() }),
		whisper_duty: Type.Object({
			agent: Type.String(),
			since: Type.Integer(),
			dms: Type.Integer(),
			forgeries: Type.Integer(),
			whispers: Type.Optional(Type.Integer()),
			recipients: Type.Optional(Type.Array(Type.String())),
			met: Type.Optional(Type.Boolean()),
			target: Type.Optional(Type.String()),
		}),
		popularity_opened: Type.Object({ round: Type.Integer(), until: Type.Integer(), points: Type.Integer() }),
		popularity_ballot: Type.Object({ round: Type.Integer(), agent: Type.String(), choice: Type.String() }),
		popularity_result: Type.Object({
			round: Type.Integer(),
			counts: Type.Array(Type.Object({ agent: Type.String(), votes: Type.Integer() })),
			winners: Type.Array(Type.String()),
			points: Type.Integer(),
			voters: Type.Array(Type.String()),
		}),
		receipt_forged: Type.Object({ receipt: Type.String(), by: Type.String(), to: Type.String(), from: Type.String(), number: Type.Integer(), text: Type.String(), forged: Type.String() }),
	},
	prompts: {
		"tools/forgeReceipt": [],
		"tools/nameFavourite": [],
		"replies/receipt-shown-private": ["to", "receipt"],
		"replies/ballot-favourite": ["choice", "until"],
		"replies/locked": [],
		"replies/marks-left": ["remaining", "budget"],
		"competitor/status/popularity-nobody": [],
		"competitor/status/popularity-named": ["ballot"],
		"competitor/status/popularity-vote": ["label", "countsAt", "ballot"],
	},
	requires: [ReceiptsApi, ChannelsApi, LedgerApi, MarksApi],
	uses: [ExileApi, NamesApi],
});

type Ctx = ContextOf<typeof whispersHead>;

const inCity = (ctx: Ctx, resident: string): boolean => (ctx.tryCall(ExileApi, "standing", { resident })?.kind ?? "alive") === "alive";
const labelOf = (ctx: Ctx, resident: string): string => ctx.tryCall(NamesApi, "labelOf", { resident }) ?? resident;
const rounds = (ctx: Ctx): readonly Round[] => ctx.options.popularity?.rounds ?? [];

function playedMinutes(ctx: Ctx): number {
	const started = ctx.log.all().find((event) => event.type === "run_started");
	const minutes: unknown = typeof started?.payload === "object" && started.payload !== null ? Reflect.get(started.payload, "minutes") : undefined;
	return typeof minutes === "number" ? minutes : 0;
}

function dmsOf(ctx: Ctx): readonly Dm[] {
	return ctx.log.ofType("channels", "dm_sent").flatMap((event) => {
		const { from, to, text } = Object.fromEntries(Object.entries(typeof event.payload === "object" && event.payload !== null ? event.payload : {}));
		return typeof from === "string" && typeof to === "string" && typeof text === "string" ? [{ from, to, text, minute: event.minute }] : [];
	});
}

/** Every receipt the receipts mechanic announced; the DM ones carry their number, sender, recipient and minute. */
function receiptsOf(ctx: Ctx): readonly { readonly id: string; readonly kind: string; readonly parties: readonly string[]; readonly dm: DmReceipt | undefined }[] {
	return ctx.log.ofType("receipts", "receipt_issued").flatMap((event) => {
		const { receipt, kind, parties, text } = Object.fromEntries(Object.entries(typeof event.payload === "object" && event.payload !== null ? event.payload : {}));
		if (typeof receipt !== "string" || typeof kind !== "string" || !Array.isArray(parties) || typeof text !== "string") return [];
		const names = parties.filter((party): party is string => typeof party === "string");
		const match = kind === "dm" ? /DM #(\d+)/.exec(text) : null;
		const quoted = /, text ("(?:[^"\\]|\\.)*")$/.exec(text)?.[1];
		const [from, to] = names;
		const dm = match?.[1] !== undefined && from !== undefined && to !== undefined ? { id: receipt, number: Number(match[1]), from, to, minute: event.minute, text: quoted === undefined ? undefined : unquote(quoted) } : undefined;
		return [{ id: receipt, kind, parties: names, dm }];
	});
}

function fragmentsOf(ctx: Ctx): readonly string[] {
	return ctx.log.all().flatMap((event) => {
		if (event.type !== "fragments_dealt") return [];
		const holdings: unknown = typeof event.payload === "object" && event.payload !== null ? Reflect.get(event.payload, "holdings") : undefined;
		return Array.isArray(holdings) ? holdings.flatMap((holding: unknown) => { const fragment: unknown = typeof holding === "object" && holding !== null ? Reflect.get(holding, "fragment") : undefined; return typeof fragment === "string" ? [fragment] : []; }) : [];
	});
}

function normalizeId(id: string): string {
	const match = /^(?:R-?)?0*(\d+)$/i.exec(id.trim());
	return match === null ? id.trim() : `R-${(match[1] ?? "").padStart(4, "0")}`;
}

const counted = (n: number, one: string, many: string): string => `${String(n)} ${n === 1 ? one : many}`;

/** The duty notice and its record; `report` is the measured orders after a vote (figure direction 10). */
function sendDuty(ctx: Ctx, text: string, since: number, next: string, ranking: string, result?: Counted & { readonly round: number }): void {
	const agent = ctx.state.whisperer;
	const spec = ctx.options.whisperer;
	if (typeof agent !== "string" || spec === undefined || !inCity(ctx, agent)) return;
	const minute = ctx.minute;
	const dms = dmsOf(ctx);
	const sent = dms.filter((dm) => dm.from === agent && dm.minute >= since && dm.minute < minute).length;
	const forged = ctx.state.forgeries.filter((forgery) => forgery.minute >= since && forgery.minute < minute).length;
	const marks = ctx.call(MarksApi, "left", { resident: agent });
	const forgeable = spec.forgery ? forgeableList(receiptsOf(ctx).flatMap((row) => (row.dm === undefined ? [] : [row.dm])).filter((row) => row.to === agent), agent) : "none";
	const notice = renderTemplate(text, { minute: String(minute), next, marks: marks === null ? "-" : String(marks.remaining), forgeable, ranking });
	const quota = spec.quota;
	const tally = quota !== undefined && result !== undefined && result.round > 1 ? tallyWhispers(agent, dms, ctx.state.forgeries, fragmentsOf(ctx), since, minute) : undefined;
	const target = quota !== undefined && result !== undefined ? dutyTarget(result.counts, agent) : undefined;
	const met = tally === undefined || quota === undefined ? undefined : tally.whispers >= quota.whispers && tally.recipients.length >= quota.recipients;
	const values = {
		since: String(since),
		whispers: counted(tally?.whispers ?? 0, "whisper", "whispers"),
		recipients: counted(tally?.recipients.length ?? 0, "resident", "residents"),
		needWhispers: String(quota?.whispers ?? 0),
		needRecipients: String(quota?.recipients ?? 0),
		target: target === undefined ? "-" : labelOf(ctx, target),
	};
	const lines = quota === undefined ? [] : [...(met === undefined ? [] : [renderTemplate(met ? quota.report.met : quota.report.missed, values)]), ...(target === undefined ? [] : [renderTemplate(quota.report.target, values)])];
	ctx.call(ChannelsApi, "notify", { to: agent, author: CITY, text: lines.length === 0 ? notice : `${notice} ${lines.join(" ")}` });
	ctx.emit("whisper_duty", {
		agent,
		since,
		dms: sent,
		forgeries: forged,
		...(tally === undefined || met === undefined ? {} : { whispers: tally.whispers, recipients: [...tally.recipients], met }),
		...(target === undefined ? {} : { target }),
	});
}

function openRound(ctx: Ctx, round: Round): void {
	const spec = ctx.options.popularity;
	if (spec === undefined) return;
	ctx.state.phase = "open";
	ctx.state.ballots.clear();
	const text = renderTemplate(spec.texts.announcement, { label: round.label, until: String(round.countsAt), points: String(round.points) });
	ctx.call(ChannelsApi, "post", { author: CITY, text });
	for (const agent of ctx.tryCall(ExileApi, "alive", {}) ?? ctx.residents.ids) ctx.call(ChannelsApi, "notify", { to: agent, author: CITY, text });
	ctx.emit("popularity_opened", { round: ctx.state.round + 1, until: round.countsAt, points: round.points });
}

function closeRound(ctx: Ctx, round: Round): void {
	const spec = ctx.options.popularity;
	if (spec === undefined) return;
	const number = ctx.state.round + 1;
	const alive = ctx.tryCall(ExileApi, "alive", {}) ?? ctx.residents.ids;
	const result = countBallots(ctx.state.ballots, alive, (agent) => inCity(ctx, agent));
	const ranking = result.counts.map((entry) => `${labelOf(ctx, entry.agent)} ${String(entry.votes)}`).join(", ");
	ctx.state.ballots.clear();
	ctx.state.round += 1;
	ctx.state.phase = ctx.state.round >= rounds(ctx).length ? "closed" : "pending";
	ctx.emit("popularity_result", { round: number, counts: result.counts.map((entry) => ({ ...entry })), winners: [...result.winners], points: result.winners.length === 0 ? 0 : round.points, voters: [...result.voters] });
	if (result.winners.length === 0) {
		ctx.call(ChannelsApi, "post", { author: CITY, text: renderTemplate(spec.texts.noVotes, { label: round.label, counts: ranking }) });
	} else {
		for (const winner of result.winners) if (round.points > 0) ctx.call(LedgerApi, "mint", { account: winner, amount: round.points, reason: "popularity vote" });
		ctx.call(ChannelsApi, "post", { author: CITY, text: renderTemplate(spec.texts.result, { label: round.label, counts: ranking, winners: namesList(result.winners.map((winner) => labelOf(ctx, winner))), points: String(round.points) }) });
	}
	const duty = ctx.options.whisperer?.duty;
	if (duty?.kind !== "afterVote") return;
	// What he sent since the count before (the run's start before the first), until the next count (the run's end after the last).
	const since = rounds(ctx)[number - 2]?.countsAt ?? 0;
	const next = Math.min(rounds(ctx)[number]?.countsAt ?? playedMinutes(ctx), playedMinutes(ctx));
	sendDuty(ctx, duty.text, since, String(next), ranking, { ...result, round: number });
}

function tickVote(ctx: Ctx): void {
	for (;;) {
		const round = rounds(ctx)[ctx.state.round];
		if (round === undefined) return;
		if (ctx.state.phase === "pending" && ctx.minute >= round.opensAt) openRound(ctx, round);
		else if (ctx.state.phase === "open" && ctx.minute >= round.countsAt) closeRound(ctx, round);
		else return;
	}
}

function marksSuffix(ctx: Ctx, resident: string): string {
	const left = ctx.call(MarksApi, "left", { resident });
	return left === null ? "" : ` · ${ctx.prompt("replies/marks-left", { remaining: left.remaining, budget: left.budget })}`;
}

export const whispers = defineMechanic(whispersHead, (kit) => ({
	tools: [
		kit.tool({
			name: "forgeReceipt",
			description: "tools/forgeReceipt",
			parameters: Type.Object({
				to: Type.String({ description: "The resident who sees it (name or ID), e.g. A03", minLength: 1, maxLength: 16 }),
				receiptId: Type.String({ description: "Receipt ID of a DM someone sent you, e.g. R-0042", minLength: 1, maxLength: 16 }),
				text: Type.String({ description: "The text the receipt quotes", minLength: 1, maxLength: MAX_DM_LENGTH }),
			}),
			suggest: ["resident"],
			execute: ({ to, receiptId, text }, ctx) => {
				const agent = ctx.resident;
				if (agent === undefined) return refuse("UNKNOWN_AGENT");
				const wanted = normalizeId(receiptId);
				const row = receiptsOf(ctx).find((candidate) => candidate.id === wanted);
				if (row === undefined) return refuse("UNKNOWN_RECEIPT", receiptId);
				if (!row.parties.includes(agent)) return refuse("NOT_A_PARTY", receiptId);
				if (row.dm === undefined || !isForgeable(row.dm, agent)) return refuse("NOT_FORGEABLE", "only the receipt of a DM another resident sent to you");
				if (!ctx.residents.has(to)) return refuse("UNKNOWN_AGENT", to);
				if (to === agent) return refuse("SELF_TARGET", "show it to another resident");
				if (ctx.tryCall(ExileApi, "isExiled", { resident: to }) === true) return refuse("EXILED", `${to} was exiled`);
				const forged = text.trim();
				if (forged.length === 0 || forged.length > MAX_DM_LENGTH) return refuse("INVALID_TEXT", `1-${String(MAX_DM_LENGTH)} characters`);
				if (!ctx.call(MarksApi, "canAfford", { resident: agent, channel: "receipt" })) return refuse("NO_MARKS");
				ctx.call(ChannelsApi, "notify", { to, author: CITY, text: shownLine(agent, quotedLine(row.dm, forged)) });
				ctx.state.forgeries.push({ minute: ctx.minute, to });
				ctx.emit("receipt_forged", { receipt: row.id, by: agent, to, from: row.dm.from, number: row.dm.number, text: row.dm.text ?? "", forged });
				ctx.call(MarksApi, "spend", { resident: agent, channel: "receipt" });
				return reply(`${ctx.prompt("replies/receipt-shown-private", { to, receipt: row.id })}${marksSuffix(ctx, agent)}`);
			},
		}),
		kit.tool({
			name: "nameFavourite",
			description: "tools/nameFavourite",
			parameters: Type.Object({ agent: Type.String({ description: "The resident you like most (name or ID), e.g. A03", minLength: 1, maxLength: 16 }) }),
			suggest: ["resident"],
			execute: ({ agent: choice }, ctx) => {
				const voter = ctx.resident;
				if (voter === undefined) return refuse("UNKNOWN_AGENT");
				const round = rounds(ctx)[ctx.state.round];
				if (ctx.options.popularity === undefined) return refuse("NO_VOTE", "this city holds no such vote");
				if (ctx.state.phase !== "open" || round === undefined) return refuse("NO_VOTE", "no vote is open");
				if (!ctx.residents.has(choice)) return refuse("UNKNOWN_AGENT", choice);
				if (choice === voter) return refuse("SELF_VOTE", "you cannot name yourself");
				if (!inCity(ctx, choice)) return refuse("EXILED", `${choice} is no longer in the city`);
				ctx.state.ballots.set(voter, choice);
				ctx.emit("popularity_ballot", { round: ctx.state.round + 1, agent: voter, choice });
				return reply(ctx.prompt("replies/ballot-favourite", { choice, until: round.countsAt }));
			},
		}),
	],
	// The vote's tool is open to the residents in the city while a round is open; the forgery only to the whisperer of a story that allows it.
	pipeline: {
		lock: (call, ctx) => {
			const locked = refuse("TOOL_LOCKED", ctx.prompt("replies/locked", {}));
			if (call.tool === "forgeReceipt") return call.actor === `resident:${String(ctx.state.whisperer)}` && ctx.options.whisperer?.forgery === true ? undefined : locked;
			if (call.tool === "nameFavourite") return ctx.state.phase === "open" && !(call.actor.startsWith("resident:") && !inCity(ctx, call.actor.slice("resident:".length))) ? undefined : locked;
			return undefined;
		},
	},
	hooks: {
		runStarted: (ctx) => {
			const spec = ctx.options.whisperer;
			const ids = ctx.residents.ids;
			if (spec === undefined || ctx.options.control || ids.length === 0) {
				ctx.state.whisperer = null;
				return;
			}
			const chosen = spec.agent !== undefined && ids.includes(spec.agent) ? spec.agent : ctx.rng("whisperer").pick([...ids].sort((a, b) => a.localeCompare(b)));
			ctx.state.whisperer = chosen;
			ctx.emit("whisperer_chosen", { agent: chosen });
		},
		minuteStarted: (ctx) => {
			const spec = ctx.options.whisperer;
			// The duty falls due before the vote is counted, as in the old startMinute.
			if (spec?.duty.kind === "every" && dutyDue(spec, ctx.minute)) sendDuty(ctx, spec.duty.text, previousDuty(spec, ctx.minute), String(ctx.minute + spec.duty.everyMinutes), "-");
			tickVote(ctx);
		},
		turnInputs: (resident, ctx) => {
			const round = rounds(ctx)[ctx.state.round];
			if (ctx.state.phase !== "open" || round === undefined || !inCity(ctx, resident)) return [];
			const ballot = ctx.state.ballots.get(resident);
			const named = ballot === undefined ? ctx.prompt("competitor/status/popularity-nobody", {}) : ctx.prompt("competitor/status/popularity-named", { ballot });
			return [{ kind: INPUT_KINDS[1].kind, order: STATUS_ORDER.popularity, text: ctx.prompt("competitor/status/popularity-vote", { label: round.label, countsAt: round.countsAt, ballot: named }) }];
		},
	},
	facts: {
		whisperer: kit.fact(Type.Union([Type.String(), Type.Null()]), (view) => view.state.whisperer ?? null),
		round: kit.fact(Type.Integer(), (view) => view.state.round),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: Slice,
		save: (state) => ({ whisperer: state.whisperer ?? null, forgeries: state.forgeries.map((forgery) => ({ ...forgery })), round: state.round, phase: state.phase, ballots: [...state.ballots].map(([agent, choice]) => ({ agent, choice })) }),
		load: (data) => ({ whisperer: data.whisperer, forgeries: data.forgeries.map((forgery) => ({ ...forgery })), round: data.round, phase: data.phase, ballots: new Map(data.ballots.map((ballot): [string, string] => [ballot.agent, ballot.choice])) }),
		migrations: {
			0: (old) => {
				const { whispers: legacy } = Parse(LegacySlice, old);
				const popularity = legacy.popularity;
				const forgedTo = legacy.forgedTo;
				// A forgery kept without its victim (before the old snapshot kept it) cannot count toward the recipients: it is dropped from the list but not from the count.
				const forgeries = legacy.forgeries.flatMap((minute, index) => {
					const to = forgedTo?.length === legacy.forgeries.length ? forgedTo[index] : undefined;
					return to === undefined ? [] : [{ minute, to }];
				});
				return { whisperer: legacy.whisperer, forgeries, round: popularity?.round ?? (popularity?.state === "closed" ? 1 : 0), phase: popularity?.state ?? "pending", ballots: popularity?.ballots ?? [] };
			},
		},
	}),
}));

/** The text inside a JSON-quoted string. */
function unquote(quoted: string): string {
	const parsed: unknown = JSON.parse(quoted);
	return typeof parsed === "string" ? parsed : "";
}

/** Fills the `{placeholders}` of a story text (kernel `renderTemplate`, copied: a mechanic takes only the authoring calls from the kernel). */
function renderTemplate(template: string, values: Readonly<Partial<Record<string, string>>>): string {
	return template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (_match: string, name: string) => {
		const value = values[name];
		if (value === undefined) throw new Error(`Unknown placeholder {${name}}`);
		return value;
	});
}
