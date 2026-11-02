/**
 * The `whispers` mechanic (carve step 6, team T1, docs/design/carve-team-T1.md): the whisperer
 * (chosen from the seed, given a duty notice by the city), the forged receipt, the popularity vote
 * with its tool `nameFavourite` (`defy` is channels', round 2 R2-D5). Copied from
 * packages/engine/src/whisperer.ts, popularity.ts, tools/whispers.ts and the
 * whisper methods of world.ts. The DMs, the receipts, the exile and the hand-over test are read
 * through the APIs of channels, receipts, exile and puzzles.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { defineMechanic, refuse } from "@swarmtales/kernel";
import { HOOK_ORDER, INPUT_KINDS, STATUS_ORDER } from "@swarmtales/mechanic-shared";
import { dutyNow, tickDuty, tickVote } from "./duty-notice.ts";
import { DutyNow, LegacySlice, Slice, whispersHead, type Ctx, type WhispersState } from "./head.ts";
import { favouriteTool, forgeTool } from "./tools.ts";
import { isAlive, roundsOf } from "./view.ts";
import { restoreVote } from "./vote.ts";

export { whispersHead };

/** Loads the vote an old snapshot saved, once: it needs the minute the saved run last played, which the resumed run knows from its first hook on. */
function restoreOnce(ctx: Ctx): void {
	const saved = ctx.state.pending;
	if (saved === undefined) return;
	ctx.state.pending = undefined;
	if (ctx.options.popularity === undefined) return;
	const standing = restoreVote(saved, roundsOf(ctx), ctx.minute - 1, (id) => ctx.residents.has(id));
	ctx.state.round = standing.round;
	ctx.state.phase = standing.phase;
	ctx.state.ballots = new Map(standing.ballots);
}

/** The whisperer of a fresh run: the story's pick, or a seeded one among the residents (old `pickWhisperer`). */
function pick(agent: string | undefined, ids: readonly string[], draw: (from: readonly string[]) => string): string | null {
	if (ids.length === 0) return null;
	if (agent !== undefined && ids.includes(agent)) return agent;
	return draw([...ids].sort((a, b) => a.localeCompare(b)));
}

const fresh = (): WhispersState => ({ whisperer: undefined, forgeries: [], round: 0, phase: "pending", ballots: new Map<string, string>(), pending: undefined });

export const whispers = defineMechanic(whispersHead, (kit) => ({
	tools: [forgeTool(kit), favouriteTool(kit)],
	pipeline: {
		lock: (call, ctx) => {
			const locked = refuse("TOOL_LOCKED", ctx.prompt("replies/locked", {}));
			const resident = call.actor.startsWith("resident:") ? call.actor.slice("resident:".length) : undefined;
			restoreOnce(ctx);
			// The whisperer forges wherever a receipt could be shown (old world.ts:1466).
			if (call.tool === "forgeReceipt") return resident !== undefined && resident === ctx.state.whisperer && ctx.options.whisperer?.forgery === true && ctx.access.isOpen(resident, "showReceipt") ? undefined : locked;
			// The vote's tool is open to the residents in the city while a round is open.
			if (call.tool === "nameFavourite") return ctx.state.phase === "open" && !(resident !== undefined && !isAlive(ctx, resident)) ? undefined : locked;
			return undefined;
		},
	},
	hooks: {
		// Before the start points (the old constructor chooses the whisperer first).
		runStarted: {
			order: HOOK_ORDER.runStarted.whispers,
			run: (ctx) => {
				const spec = ctx.options.whisperer;
				const ids = ctx.residents.ids;
				if (spec === undefined || ctx.options.control || ids.length === 0) {
					ctx.state.whisperer = null;
					return;
				}
				const chosen = pick(spec.agent, ids, (from) => ctx.rng("whisperer").pick(from));
				ctx.state.whisperer = chosen;
				if (chosen !== null) ctx.emit("whisperer_chosen", { agent: chosen });
			},
		},
		// The duty falls due before the vote is counted (old startMinute), after the standoff's ultimatums and before the door clock.
		minuteStarted: {
			order: HOOK_ORDER.minuteStarted.whispers,
			run: (ctx) => {
				restoreOnce(ctx);
				tickDuty(ctx);
				tickVote(ctx);
			},
		},
		turnInputs: {
			order: HOOK_ORDER.turnInputs.status,
			run: (resident, ctx) => {
				restoreOnce(ctx);
				const round = roundsOf(ctx)[ctx.state.round];
				if (ctx.state.phase !== "open" || round === undefined || !isAlive(ctx, resident)) return [];
				const ballot = ctx.state.ballots.get(resident);
				const named = ballot === undefined ? ctx.prompt("competitor/status/popularity-nobody", {}) : ctx.prompt("competitor/status/popularity-named", { ballot });
				return [{ kind: INPUT_KINDS[1].kind, order: STATUS_ORDER.popularity, text: ctx.prompt("competitor/status/popularity-vote", { label: round.label, countsAt: round.countsAt, ballot: named }) }];
			},
		},
	},
	facts: {
		whisperer: kit.fact(Type.Union([Type.String(), Type.Null()]), (view) => view.state.whisperer ?? null),
		round: kit.fact(Type.Integer(), (view) => view.state.round),
		// Computed live from the DMs, the exile and the hand-over test (R2-D4): a strike or a DM of this turn shows at once.
		dutyNow: kit.fact(Type.Union([DutyNow, Type.Null()]), (view) => {
			const now = dutyNow(view);
			return now === null ? null : { ...now, recipients: [...now.recipients] };
		}),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: Slice,
		save: (state) => ({
			whisperer: state.whisperer ?? null,
			forgeries: state.forgeries.map((forgery) => ({ ...forgery })),
			round: state.round,
			phase: state.phase,
			ballots: [...state.ballots].map(([agent, choice]) => ({ agent, choice })),
			...(state.pending === undefined ? {} : { pending: { ...(state.pending.round === undefined ? {} : { round: state.pending.round }), state: state.pending.state, ballots: state.pending.ballots.map((ballot) => ({ ...ballot })) } }),
		}),
		load: (data, setup) => {
			const { options, residents } = setup;
			let whisperer = data.whisperer;
			if (data.fresh === true) {
				// No whispers slice in the old file: the run plays without a whisperer in a control run, else the seeded pick (nothing is announced on a resume).
				whisperer = options.whisperer === undefined || options.control ? null : pick(options.whisperer.agent, residents, (from) => setup.rng("whisperer").pick(from));
			} else if (whisperer !== null) {
				if (!residents.includes(whisperer)) throw new Error(`The snapshot's whisperer ${whisperer} is not one of this run's competitors`);
				if (options.control) throw new Error("The snapshot was played with a whisperer; resume it without control (a control run must start fresh)");
			}
			return {
				...fresh(),
				whisperer,
				forgeries: data.forgeries.map((forgery) => ({ ...forgery })),
				round: data.round,
				phase: data.phase,
				ballots: new Map(data.ballots.map((ballot): [string, string] => [ballot.agent, ballot.choice])),
				pending: data.pending === undefined ? undefined : { ...(data.pending.round === undefined ? {} : { round: data.pending.round }), state: data.pending.state, ballots: data.pending.ballots.map((ballot) => ({ ...ballot })) },
			};
		},
		migrations: {
			0: (old) => {
				const legacy = Parse(LegacySlice, old).whispers;
				// Absent or null: the old world played without whispers; a resume picks a fresh whisperer (old `#chooseWhisperer`).
				if (legacy === undefined || legacy === null) return { whisperer: null, forgeries: [], round: 0, phase: "pending", ballots: [], fresh: true };
				const forgedTo = legacy.forgedTo;
				// A forgery kept without its victim (before the old snapshot kept it) still counts, but reaches nobody.
				const forgeries = legacy.forgeries.map((minute, index) => {
					const to = forgedTo?.length === legacy.forgeries.length ? forgedTo[index] : undefined;
					return to === undefined ? { minute } : { minute, to };
				});
				return { whisperer: legacy.whisperer, forgeries, round: 0, phase: "pending", ballots: [], ...(legacy.popularity === undefined ? {} : { pending: legacy.popularity }) };
			},
		},
	}),
}));
