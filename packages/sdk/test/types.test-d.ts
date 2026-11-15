// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The type test of the sdk's author types (M1 specification 6.1, 6.2, 6.5, in the head-declares-tools shape of the
 * mechanic spike, paper 07 section 6.1). `tsc -b` compiles this file and nothing here runs. The definers are declared
 * here with the signatures their issues must build (definers, `define-mechanic.ts`, `define-game.ts`). The heads and
 * body skeletons of `consensus`, `grid-game` and a small mechanic with a derived state must compile without a cast;
 * every `@ts-expect-error` line fails the build when the types loosen.
 */
import { Type, type Static, type TSchema, type TUndefined } from "typebox";
import type { EventSchemas, EventsDefinition, PluginInstance, Refusal, ServiceDefinition, ServiceMethods, ToolSuccess } from "@swarmtales/contracts";
import type { Game, MechanicUse, ToolOf } from "../src/game/types.ts";
import type { MechanicShape, PromptKeys } from "../src/mechanic/context-types.ts";
import type { ErasedBody, InstanceParts, MechanicKit } from "../src/mechanic/parts.ts";
import type { AnyHead, CtxOf, DefinitionOf, MechanicBody, MechanicHead, None, NoOptions, PluginHead, ShapeOf, ToolCtxOf, ToolHandlers, ToolParams, ToolsOf, ViewOf } from "../src/mechanic/types.ts";

declare function defineService<const N extends string, const M extends ServiceMethods>(service: ServiceDefinition<N, M>): ServiceDefinition<N, M>;
declare function defineEvents<const Id extends string, const E extends EventSchemas>(id: Id, events: E): EventsDefinition<Id, E>;
declare function reply(text: string, options?: { readonly endsTurn?: boolean }): ToolSuccess;
declare function refuse(code: string, detail?: string): Refusal;
declare function defineHead<
	const Id extends string,
	O extends TSchema = NoOptions,
	Snap extends TSchema = TUndefined,
	C = never,
	E extends EventSchemas = None,
	const P extends PromptKeys = None,
	const R extends readonly ServiceDefinition[] = [],
	const Pv extends readonly ServiceDefinition[] = [],
	const U extends readonly ServiceDefinition[] = [],
	TP extends ToolParams = None,
>(head: MechanicHead<Id, O, Snap, C, E, P, R, Pv, U, TP>): MechanicHead<Id, O, Snap, C, E, P, R, Pv, U, TP>;
declare function defineMechanic<H extends AnyHead, F extends Readonly<Record<string, TSchema>> = None>(head: H, body: MechanicBody<ShapeOf<H>, ToolsOf<H>, F>): DefinitionOf<H>;
declare function defineHandlers<H extends AnyHead, K extends keyof ToolsOf<H> & string>(
	head: H,
	handlers: { readonly [N in K]: ToolHandlers<ShapeOf<H>, ToolsOf<H>[N]> },
): { readonly [N in K]: ToolHandlers<ShapeOf<H>, ToolsOf<H>[N]> };
declare function defineGame<const Ms extends readonly MechanicUse[]>(game: Game<Ms>): Game<Ms>;

const None0 = Type.Object({});
const Side = Type.Union([Type.Literal("X"), Type.Literal("O")]);

const ConsensusSourceService = defineService({
	name: "consensus-source",
	summary: "The team on move, its captain, its legal cells and a forfeit move.",
	methods: {
		team: { kind: "query", summary: "The team on move.", input: None0, output: Type.String() },
		captain: { kind: "query", summary: "Its captain.", input: None0, output: Type.String() },
		legalCells: { kind: "query", summary: "The legal values.", input: None0, output: Type.Array(Type.Integer()) },
		playForfeit: { kind: "command", summary: "Plays a forfeit.", input: Type.Object({ cell: Type.Integer() }), output: Type.Boolean() },
	},
});
const ConsensusService = defineService({ name: "consensus", summary: "Resets the gate.", methods: { reset: { kind: "command", summary: "Forgets every vote.", input: None0, output: Type.Null() } } });
const TeamChannelService = defineService({
	name: "team-channel",
	summary: "Private team channels.",
	methods: { resetCap: { kind: "command", summary: "Opens a new round.", input: Type.Object({ team: Type.String() }), output: Type.Boolean() } },
});
const GridGameService = defineService({
	name: "grid-game",
	summary: "The board of the grid game.",
	methods: {
		side: { kind: "query", summary: "The side to move.", input: None0, output: Type.Union([Side, Type.Null()]) },
		hold: { kind: "command", summary: "Holds the next game back.", input: None0, output: Type.Boolean() },
	},
});
const GridGameEvents = defineEvents("grid-game", {
	game_started: Type.Object({ game: Type.Integer(), startingSide: Side }),
	move_played: Type.Object({ game: Type.Integer(), side: Side, by: Type.String(), cell: Type.Integer(), forfeit: Type.Boolean() }),
	match_ended: Type.Object({ invalid: Type.Optional(Type.Boolean()) }),
});

// ---- consensus: a state of maps with a custom snapshot, a required service, prompts with variables, a pipeline ----

interface TeamState {
	proposal: { readonly cell: number; readonly reason: string } | undefined;
	votes: Map<string, boolean>;
	won: number | undefined;
	rounds: number;
}
interface GateState {
	readonly teams: Map<string, TeamState>;
	moved: number;
}
const freshTeam = (): TeamState => ({ proposal: undefined, votes: new Map(), won: undefined, rounds: 0 });
const Saved = Type.Object({ moved: Type.Integer(), teams: Type.Record(Type.String(), Type.Object({ won: Type.Union([Type.Null(), Type.Integer()]), rounds: Type.Integer() })) });

const consensusHead = defineHead({
	id: "consensus",
	package: "@swarmtales/mechanic-consensus",
	summary: "A team must agree before a gated tool call is released.",
	requires: [ConsensusSourceService],
	provides: [ConsensusService],
	options: Type.Object({
		tool: Type.String({ default: "playMove", description: "The gated tool." }),
		param: Type.String({ default: "cell", description: "The gated parameter." }),
		maxRounds: Type.Integer({ minimum: 1, default: 3, description: "Rounds before the deadlock rule." }),
		teams: Type.Record(Type.String(), Type.Array(Type.String()), { default: {}, description: "The teams that must agree." }),
	}),
	state: Saved,
	snapshot: {
		save: (state: GateState) => ({ moved: state.moved, teams: Object.fromEntries([...state.teams].map(([team, st]) => [team, { won: st.won ?? null, rounds: st.rounds }])) }),
		load: (data): GateState => ({ moved: data.moved, teams: new Map(Object.entries(data.teams).map(([team, st]) => [team, { ...freshTeam(), won: st.won ?? undefined, rounds: st.rounds }])) }),
	},
	start: ({ options, rng }) => ({ teams: new Map(Object.keys(options.teams).map((team) => [team, freshTeam()])), moved: rng("consensus", "start").int(-1, -1) }),
	events: {
		move_proposed: Type.Object({ team: Type.String(), captain: Type.String(), cell: Type.Integer() }),
		consensus_forfeited: Type.Object({ team: Type.String(), cell: Type.Integer(), rounds: Type.Integer() }),
	},
	prompts: { "consensus/tools/proposeMove": [], "consensus/tools/castVote": [], "consensus/proposed": ["cell"], "consensus/vote-request": ["captain", "cell", "reason"] },
	tools: {
		proposeMove: { description: "consensus/tools/proposeMove", params: Type.Object({ cell: Type.Integer(), reason: Type.String() }), for: ["resident"] },
		castVote: { description: "consensus/tools/castVote", params: Type.Object({ agree: Type.Boolean(), reason: Type.String() }), for: ["resident"] },
	},
});

type ConsensusCtx = CtxOf<typeof consensusHead>;

function teamOf(ctx: ConsensusCtx, resident: string | undefined): string | undefined {
	if (resident === undefined) return undefined;
	return Object.entries(ctx.options.teams).find(([, members]) => members.includes(resident))?.[0];
}

function onMove(ctx: ConsensusCtx, resident: string | undefined): { team: string; captain: string } | Refusal {
	const team = teamOf(ctx, resident);
	if (team === undefined) return refuse("NOT_TEAM_MEMBER", "you are in no team");
	if (ctx.call(ConsensusSourceService, "team", {}) !== team) return refuse("NOT_ON_MOVE", "your team is not on move");
	return { team, captain: ctx.call(ConsensusSourceService, "captain", {}) };
}

/** A helper function given as a hook, and one typed by the head that a handler returns from: no circle, no annotation. */
function countRound(ctx: ConsensusCtx): void {
	const team = ctx.call(ConsensusSourceService, "team", {});
	const state = ctx.state.teams.get(team);
	if (state === undefined || ctx.state.moved === ctx.tick || ++state.rounds < ctx.options.maxRounds) return;
	const cell = ctx.rng("consensus", "forfeit", team, ctx.tick).pick(ctx.call(ConsensusSourceService, "legalCells", {}));
	if (ctx.call(ConsensusSourceService, "playForfeit", { cell })) ctx.emit("consensus_forfeited", { team, cell, rounds: state.rounds });
}

/** Handlers of one tool as a unit of their own, typed by the head. */
const voting = defineHandlers(consensusHead, {
	castVote: {
		check: (_params, ctx) => {
			const who = onMove(ctx, ctx.resident);
			return "ok" in who ? who : undefined;
		},
		run: (params, ctx) => {
			ctx.state.teams.get(teamOf(ctx, ctx.resident) ?? "")?.votes.set(ctx.resident ?? "", params.agree);
			return reply(params.reason);
		},
	},
});

export const consensus = defineMechanic(consensusHead, {
	tools: {
		...voting,
		proposeMove: {
			check: (params, ctx) => {
				const who = onMove(ctx, ctx.resident);
				if ("ok" in who) return who;
				return ctx.call(ConsensusSourceService, "legalCells", {}).includes(params.cell) ? undefined : refuse("ILLEGAL_CELL", "that move is not legal");
			},
			run: (params, ctx) => {
				const team = teamOf(ctx, ctx.resident);
				if (team === undefined || ctx.resident === undefined) return refuse("NOT_TEAM_MEMBER", "you are in no team");
				ctx.emit("move_proposed", { team, captain: ctx.resident, cell: params.cell });
				return reply(ctx.prompt("consensus/proposed", { cell: params.cell }));
			},
		},
	},
	services: {
		consensus: {
			reset: (_input, ctx) => {
				for (const team of ctx.state.teams.keys()) ctx.state.teams.set(team, freshTeam());
				return null;
			},
		},
	},
	pipeline: {
		rule: (call, ctx) => {
			if (call.tool !== ctx.options.tool || call.resident === undefined) return undefined;
			const team = teamOf(ctx, call.resident);
			const won = team === undefined ? undefined : ctx.state.teams.get(team)?.won;
			return won === undefined ? refuse("NO_CONSENSUS", "the team has not agreed on a move") : undefined;
		},
		after: (call, outcome, ctx) => {
			if (call.tool === ctx.options.tool && call.owner !== ctx.mechanic && outcome.ok) ctx.state.moved = ctx.tick;
		},
	},
	hooks: {
		turnInputs: (resident, ctx) => {
			const proposal = ctx.state.teams.get(teamOf(ctx, resident) ?? "")?.proposal;
			if (proposal === undefined) return [];
			return [ctx.prompt("consensus/vote-request", { captain: ctx.call(ConsensusSourceService, "captain", {}), cell: proposal.cell, reason: proposal.reason })];
		},
		tickStarted: {
			after: ["grid-game"],
			run: (ctx) => {
				ctx.state.teams.forEach((state) => (state.rounds += 0));
			},
		},
		tickEnded: countRound,
	},
	facts: {
		agreed: { output: Type.Record(Type.String(), Type.Union([Type.Null(), Type.Integer()])), compute: (view) => Object.fromEntries([...view.state.teams].map(([team, state]) => [team, state.won ?? null])) },
	},
});

// ---- grid-game: two provided services, used services, locks, a job, a run limit, an option check in `start` ----

const GridSlice = Type.Object({
	teams: Type.Object({ X: Type.Array(Type.String()), O: Type.Array(Type.String()) }),
	board: Type.Array(Type.String()),
	side: Side,
	game: Type.Integer(),
	running: Type.Boolean(),
	finished: Type.Boolean(),
	told: Type.Optional(Type.String()),
});

const gridHead = defineHead({
	id: "grid-game",
	package: "@swarmtales/mechanic-grid-game",
	summary: "A board game between two teams.",
	options: Type.Object({
		size: Type.Integer({ minimum: 2, maximum: 10, default: 3, description: "The board is size x size cells." }),
		games: Type.Integer({ minimum: 1, default: 3, description: "How many games the match has." }),
		wakeTeam: Type.Boolean({ default: false, description: "Every member of the team on move has news." }),
		teams: Type.Optional(Type.Object({ X: Type.Array(Type.String()), O: Type.Array(Type.String()) }, { description: "The two teams." })),
	}),
	state: GridSlice,
	// The return type is written out: a literal (`side: "X"`) in a block body is widened otherwise.
	start: (setup): Static<typeof GridSlice> => {
		if (setup.options.size > 10) throw new Error(`grid-game: a board of ${setup.options.size} is too large`);
		const half = Math.ceil(setup.residents.length / 2);
		const teams = setup.options.teams ?? { X: setup.residents.slice(0, half), O: setup.residents.slice(half) };
		return { teams, board: Array.from({ length: setup.options.size ** 2 }, () => "."), side: "X", game: 0, running: false, finished: false };
	},
	events: GridGameEvents.events,
	provides: [GridGameService, ConsensusSourceService],
	uses: [ConsensusService, TeamChannelService],
	prompts: { "grid-game/tools/viewBoard": [], "grid-game/tools/playMove": [] },
	tools: {
		viewBoard: { description: "grid-game/tools/viewBoard", params: Type.Object({}), for: ["resident"], free: true },
		playMove: { description: "grid-game/tools/playMove", params: Type.Object({ cell: Type.Integer({ minimum: 0, description: "The cell to mark." }) }), for: ["resident"] },
	},
});

type GridCtx = CtxOf<typeof gridHead>;
type GridToolCtx = ToolCtxOf<typeof gridHead>;
type GridView = ViewOf<typeof gridHead>;

const captainOf = (state: GridView["state"]): string | null => (state.running ? (state.teams[state.side][0] ?? null) : null);

function refreshLocks(ctx: GridCtx): void {
	const captain = captainOf(ctx.state);
	for (const resident of ctx.residents.ids) {
		if (resident === captain) ctx.access.unlock(resident, "playMove");
		else ctx.access.lock(resident, "playMove");
	}
}

function startNext(ctx: GridCtx): void {
	ctx.state.game += 1;
	ctx.state.running = true;
	ctx.emit("game_started", { game: ctx.state.game, startingSide: ctx.state.side });
	refreshLocks(ctx);
	ctx.tryCall(ConsensusService, "reset", {});
	if (ctx.has(TeamChannelService) && ctx.tryCall(TeamChannelService, "resetCap", { team: ctx.state.side }) === false) ctx.schedule.at(ctx.tick + 1, "nextGame");
}

function problemWith(ctx: GridToolCtx, cell: number): Refusal | undefined {
	if (ctx.state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (ctx.resident === undefined || ctx.resident !== captainOf(ctx.state)) return refuse("NOT_CAPTAIN");
	return ctx.state.board[cell] === "." ? undefined : refuse("CELL_TAKEN", `Cell ${cell} is already taken.`);
}

function applyMove(ctx: GridCtx, cell: number, forfeit: boolean): ToolSuccess {
	ctx.state.board[cell] = ctx.state.side;
	ctx.emit("move_played", { game: ctx.state.game, side: ctx.state.side, by: captainOf(ctx.state) ?? "", cell, forfeit });
	if (ctx.state.game >= ctx.options.games && ctx.tick >= ctx.ticks - 1) ctx.emit("match_ended", {});
	return reply("Move played.", { endsTurn: true });
}

export const gridGame = defineMechanic(gridHead, {
	tools: {
		viewBoard: { run: (_params, ctx) => reply(ctx.state.board.join("")) },
		playMove: {
			check: (params, ctx) => problemWith(ctx, params.cell),
			sample: (ctx, random) => (ctx.resident === captainOf(ctx.state) ? { cell: random.int(0, ctx.state.board.length - 1) } : undefined),
			run: (params, ctx) => problemWith(ctx, params.cell) ?? applyMove(ctx, params.cell, false),
		},
	},
	services: {
		"grid-game": {
			side: (_input, ctx) => (ctx.state.running ? ctx.state.side : null),
			hold: (_input, ctx, caller) => caller !== ctx.mechanic && !ctx.state.finished,
		},
		"consensus-source": {
			team: (_input, ctx) => (ctx.state.running ? ctx.state.side : ""),
			captain: (_input, ctx) => captainOf(ctx.state) ?? "",
			legalCells: (_input, ctx) => ctx.state.board.flatMap((cell, index) => (cell === "." ? [index] : [])),
			playForfeit: ({ cell }, ctx) => applyMove(ctx, cell, true).ok,
		},
	},
	hooks: {
		runStarted: { after: ["strategy-brain"], run: startNext },
		turnInputs: [
			(resident, ctx) => (captainOf(ctx.state) === resident ? [`Side ${ctx.state.side} is on move; you are its captain.`] : []),
			{ run: () => [{ kind: "board", text: "viewBoard shows the board.", order: 1 }], after: ["team-channel"] },
		],
		news: (resident, ctx) => (ctx.options.wakeTeam ? ctx.state.teams[ctx.state.side].includes(resident) : captainOf(ctx.state) === resident),
		toAct: (ctx) => ctx.residents.ids.filter((resident) => ctx.residents.mayAct(resident) && captainOf(ctx.state) === resident),
	},
	jobs: { nextGame: startNext },
	limits: { match: { summary: "Breaches once the last game of the match is over.", breached: (view: GridView) => (view.state.finished ? "the match is over" : undefined) } },
	facts: {
		captain: { output: Type.Union([Type.String(), Type.Null()]), compute: (view) => captainOf(view.state) },
		game: { output: Type.Integer(), compute: (view) => view.state.game + view.tick * 0 },
	},
});

// ---- a referee: no options, no state, no tools, a listener on another mechanic's events, an audience ----

const refereeHead = defineHead({
	id: "optimal-referee",
	package: "@swarmtales/mechanic-optimal-referee",
	summary: "Scores every move.",
	requires: [GridGameService],
	events: { move_scored: Type.Object({ game: Type.Integer(), side: Side }) },
	audiences: { move_scored: ["human"] },
});
export const optimalReferee = defineMechanic(refereeHead, {
	listeners: (kit) => [
		kit.listen(
			GridGameEvents,
			"move_played",
			(payload, ctx, event) => {
				if (ctx.call(GridGameService, "side", {}) !== payload.side && event.seq > 0) ctx.emit("move_scored", { game: payload.game, side: payload.side });
			},
			{ after: ["consensus"] },
		),
		kit.listen(gridGame, "match_ended", (payload, ctx) => {
			ctx.schedule.at(ctx.tick + (payload.invalid === true ? 1 : 2), "none");
		}),
	],
});

// ---- the game: tool names come from the heads of the listed mechanics ----

export const game = defineGame({
	id: "tictactoe-teams",
	residents: 4,
	mechanics: [gridGame({ size: 3, games: 1 }), consensus({ tool: "playMove" }), optimalReferee()],
	grants: { resident: ["viewBoard", "proposeMove", "castVote", "playMove"], watcher: { drop: ["castVote"], add: ["viewBoard"] } },
	locked: ["playMove"],
	end: { ticks: 20 },
	win: { fact: "grid-game.captain" },
});
export const tool: ToolOf<typeof game.mechanics> = "castVote";

// ---- the seam: `define-mechanic.ts` binds an erased head and body through the kit, without a cast ----

/**
 * The typed body of `defineMechanic` reaches its implementation as the erased body.
 *
 * @param parts - The parts of the instance.
 * @param kit - The binders of the instance.
 * @param head - The erased head.
 * @param body - The erased body.
 * @returns What the instance takes from the kit.
 */
export function bind(parts: InstanceParts<MechanicShape>, kit: MechanicKit<MechanicShape>, head: PluginHead, body: ErasedBody): Pick<PluginInstance, "tools" | "services" | "listeners" | "facts" | "limits" | "slice"> {
	return {
		tools: head.tools.flatMap((declared) => {
			const handlers = body.tools?.[declared.name];
			return handlers === undefined ? [] : [kit.tool(declared, handlers)];
		}),
		services: head.provides.flatMap((service) => {
			const implementation = body.services?.[service.name];
			return implementation === undefined ? [] : [kit.provide(service, implementation)];
		}),
		listeners: body.listeners?.(kit) ?? [],
		facts: Object.fromEntries(Object.entries(body.facts ?? {}).map(([name, fact]) => [name, kit.fact(fact)])),
		limits: Object.entries(body.limits ?? {}).map(([id, limit]) => kit.limit(id, limit)),
		slice: head.state === undefined ? undefined : kit.slice({ version: head.version, schema: head.state }),
	};
}

/**
 * The typed body of the generic signature reaches the erased body without a cast, and the erased head its slice.
 *
 * @param head - The typed head.
 * @param body - The typed body.
 * @returns The erased body.
 */
export function erase<H extends AnyHead, F extends Readonly<Record<string, TSchema>>>(head: H, body: MechanicBody<ShapeOf<H>, ToolsOf<H>, F>): ErasedBody {
	const any: AnyHead = head;
	return any.id === "" ? {} : body;
}

// ---- what must not compile ----

/**
 * Wrong uses of a context; each line names the offending value.
 *
 * @param ctx - The context of `grid-game`.
 * @param consensusCtx - The context of `consensus`.
 */
export function wrongContextUse(ctx: GridCtx, consensusCtx: ConsensusCtx): void {
	// @ts-expect-error -- `game_paused` is not an event the head declares
	ctx.emit("game_paused", { game: 1 });
	// @ts-expect-error -- `startingSide` is missing in the payload of `game_started`
	ctx.emit("game_started", { game: 1 });
	// @ts-expect-error -- `vote` is not a method of the consensus-source service
	consensusCtx.call(ConsensusSourceService, "vote", {});
	// @ts-expect-error -- `cell` must be a number
	consensusCtx.call(ConsensusSourceService, "playForfeit", { cell: "4" });
	// @ts-expect-error -- consensus does not require the team-channel service
	consensusCtx.call(TeamChannelService, "resetCap", { team: "X" });
	// @ts-expect-error -- the prompt `consensus/proposed` takes the variable `cell`
	consensusCtx.prompt("consensus/proposed", {});
	// @ts-expect-error -- grid-game has no state property `winner`
	ctx.state.winner = "X";
}

// @ts-expect-error -- `sise` is not an option of grid-game
export const wrongOption = gridGame({ sise: 4 });

// @ts-expect-error -- `size` is a number
export const wrongOptionValue = gridGame({ size: "4" });

export const wrongGrant = defineGame({
	id: "wrong-grant",
	residents: 2,
	mechanics: [gridGame()],
	// @ts-expect-error -- `castVote` is a tool of consensus, which is not listed
	grants: { resident: ["viewBoard", "castVote"] },
	end: { ticks: 1 },
});

export const wrongLock = defineGame({
	id: "wrong-lock",
	residents: 2,
	mechanics: [gridGame()],
	// @ts-expect-error -- `proposeMove` is a tool of consensus, which is not listed
	locked: ["proposeMove"],
	end: { ticks: 1 },
});

const soloHead = defineHead({
	id: "solo",
	package: "@example/solo",
	summary: "One tool with an inline description, no service.",
	state: Type.Object({ secret: Type.Integer(), winner: Type.Optional(Type.String()) }),
	start: ({ rng }) => ({ secret: rng("solo", "secret").int(1, 100) }),
	tools: { guess: { description: "Guess the number.", params: Type.Object({ value: Type.Integer() }), for: ["resident"] } },
});
export const solo = defineMechanic(soloHead, {
	tools: { guess: { run: (params, ctx) => reply(params.value === ctx.state.secret ? "yes" : "no", { endsTurn: true }) } },
	limits: { solved: { summary: "Somebody guessed it.", breached: (view) => view.state.winner } },
});

/** Every head fits the bound that `defineMechanic` and `defineHandlers` put on `typeof head`. */
export const erased: readonly AnyHead[] = [consensusHead, gridHead, refereeHead, soloHead];

// @ts-expect-error -- the head declares a tool, and the body has no `tools`
export const missingTools = defineMechanic(soloHead, {});

// @ts-expect-error -- the head declares `guess`, and the body has no handlers for it
export const missingHandler = defineMechanic(soloHead, { tools: {} });

export const strayHandler = defineMechanic(refereeHead, {
	// @ts-expect-error -- the head of the referee declares no tool
	tools: { score: { run: () => reply("") } },
});

// @ts-expect-error -- the head provides the service `consensus`, and the body has no `services`
export const missingService = defineMechanic(consensusHead, { tools: { ...voting, proposeMove: { run: () => reply("") } } });

export const strayService = defineMechanic(soloHead, {
	tools: { guess: { run: () => reply("") } },
	// @ts-expect-error -- the head of `solo` provides no service
	services: { solo: { peek: () => 1 } },
});

// @ts-expect-error -- the implementation of the service `consensus` lacks the method `reset`
export const missingMethod = defineMechanic(consensusHead, { tools: { ...voting, proposeMove: { run: () => reply("") } }, services: { consensus: {} } });

/**
 * A fact or a run limit reads: it may call a query, not a command, and it cannot change the state.
 *
 * @param view - The view of `consensus`.
 * @param grid - The view of `grid-game`.
 */
export function wrongViewUse(view: ViewOf<typeof consensusHead>, grid: GridView): void {
	view.call(ConsensusSourceService, "team", {});
	// @ts-expect-error -- `playForfeit` is a command
	view.call(ConsensusSourceService, "playForfeit", { cell: 1 });
	// @ts-expect-error -- the state of a view is read-only
	grid.state.game = 2;
}

/**
 * What 1.4 reserves has no type: each of these names is refused.
 *
 * @returns Nothing that runs.
 */
export function reserved(): readonly unknown[] {
	return [
		// @ts-expect-error -- `decisions` waits for M3
		defineHead({ id: "r1", package: "@example/r", summary: "Reserved.", decisions: {} }),
		// @ts-expect-error -- a tool limit waits for its first user
		defineHead({ id: "r2", package: "@example/r", summary: "Reserved.", tools: { t: { description: "A tool.", params: Type.Object({}), limit: 1 } } }),
		// @ts-expect-error -- the hook `turnOpened` waits for M3
		defineMechanic(refereeHead, { hooks: { turnOpened: () => undefined } }),
		// @ts-expect-error -- the stage handler `afford` waits for the ledger
		defineMechanic(refereeHead, { pipeline: { afford: () => undefined } }),
		// @ts-expect-error -- `commits` is not carried
		defineMechanic(refereeHead, { commits: {} }),
		// @ts-expect-error -- the game's `texts` overrides wait for M2
		defineGame({ id: "reserved", residents: 2, mechanics: [gridGame()], end: { ticks: 1 }, texts: {} }),
	];
}

export const wrongAudience = defineHead({
	id: "wrong-audience",
	package: "@example/wrong",
	summary: "An audience for an event that is not declared.",
	events: { seen: Type.Object({}) },
	// @ts-expect-error -- `hidden` is not an event of this head
	audiences: { hidden: ["human"] },
});
