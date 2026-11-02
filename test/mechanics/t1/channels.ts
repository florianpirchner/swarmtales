/**
 * A stand-in provider of `ChannelsApi` for the tests of team T1 (channels is team T2's): fixed
 * answers, the lookups blame needs (`dmRecord`, `boardPost`, `groupPost`, `couldRead`,
 * `lastNumber`, `pendingDms`) over what the stand-in recorded, and a `sendDM` tool that numbers and
 * records a DM and writes `dm_sent`. One counter numbers every message, as the old `#numbers`.
 * It keeps its version-0 slice like `standIn`, so a legacy snapshot resumes with it.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type { MechanicUse } from "@swarmtales/contracts";
import { defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { ChannelsApi, ChannelsEvents, ReceiptsApi } from "@swarmtales/mechanic-shared";

export interface DmRow {
	id: number;
	from: string;
	to: string;
	minute: number;
	answered: boolean;
	text: string;
	deliveredMinute?: number;
	deliveredAfter?: number;
}

export interface BoardRow {
	readonly number: number;
	readonly author: string;
	readonly text: string;
	readonly kind: "player" | "city" | "system";
	readonly minute: number;
}

export interface GroupRow {
	readonly number: number;
	readonly group: string;
	readonly author: string;
	readonly text: string;
	readonly minute: number;
}

/** What the stand-in channels was asked to do, in order, and what a test may set. */
export interface ChannelsLog {
	readonly posts: { readonly author: string; readonly text: string }[];
	readonly notices: { readonly to: string; readonly author: string; readonly text: string }[];
	readonly dms: DmRow[];
	readonly board: BoardRow[];
	readonly groupPosts: GroupRow[];
	/** Who could read each group's posts. */
	readonly readers: Map<string, readonly string[]>;
	window: { sent: number; limit: number; from: number; until: number } | null;
	/** The city's last message number. */
	counter: number;
	/** The recipient read DM `number` at `minute`: the record keeps the minute and the last message number then. */
	deliver(number: number, minute: number): void;
	/** A resident posts on the board (a numbered message). */
	postAs(author: string, text: string, minute: number): number;
}

/** The DM cap of a story (`rules.dmLimit`): the window is computed as the old `dmWindow` did. */
export interface DmLimit {
	readonly perWindow: number;
	readonly windowMinutes: number;
}

export function channelsStandIn(dmLimit?: DmLimit): { readonly use: MechanicUse; readonly log: ChannelsLog } {
	const log: ChannelsLog = {
		posts: [],
		notices: [],
		dms: [],
		board: [],
		groupPosts: [],
		readers: new Map(),
		window: null,
		counter: 0,
		deliver: (number, minute) => {
			const row = log.dms.find((candidate) => candidate.id === number);
			if (row === undefined) throw new Error(`no DM #${String(number)}`);
			row.deliveredMinute = minute;
			row.deliveredAfter = log.counter;
		},
		postAs: (author, text, minute) => {
			log.counter += 1;
			log.board.push({ number: log.counter, author, text, kind: "player", minute });
			return log.counter;
		},
	};
	const Dm = Type.Object({ id: Type.Integer(), from: Type.String(), to: Type.String(), minute: Type.Integer(), answered: Type.Boolean(), text: Type.String(), deliveredMinute: Type.Optional(Type.Integer()), deliveredAfter: Type.Optional(Type.Integer()) });
	const Board = Type.Object({ number: Type.Integer(), author: Type.String(), text: Type.String(), kind: Type.Union([Type.Literal("player"), Type.Literal("city"), Type.Literal("system")]), minute: Type.Integer() });
	const Slice = Type.Object({ old: Type.Unknown(), counter: Type.Integer(), dms: Type.Array(Dm), board: Type.Array(Board) });
	/** A host starts from nothing: the log of an earlier run does not leak into it (a determinism check builds two hosts). */
	const reset = (): void => {
		log.posts.length = 0;
		log.notices.length = 0;
		log.dms.length = 0;
		log.board.length = 0;
		log.groupPosts.length = 0;
		log.counter = 0;
	};
	const mechanic = defineMechanic(
		{
			id: "channels",
			summary: "Stand-in for the channels mechanic of team T2.",
			options: Type.Object({}),
			state: (): { data: unknown; counter: number } => {
					reset();
					return { data: null, counter: 0 };
				},
			events: { ...ChannelsEvents.events, notice: Type.Object({ to: Type.String(), author: Type.String(), text: Type.String() }) },
			provides: [ChannelsApi],
			uses: [ReceiptsApi],
			prompts: { "tools/sendDM": [] },
		},
		(kit) => ({
			services: [
				kit.provideSome(ChannelsApi, {
					post: (input, ctx) => {
						ctx.state.counter += 1;
						log.counter = ctx.state.counter;
						log.posts.push({ author: input.author, text: input.text });
						log.board.push({ number: ctx.state.counter, author: input.author, text: input.text, kind: "city", minute: ctx.minute });
						ctx.emit("board_post", { postSeq: ctx.state.counter, author: input.author, text: input.text, kind: "city" });
						return { postSeq: ctx.state.counter };
					},
					notify: (input, ctx) => {
						ctx.emit("notice", { to: input.to, author: input.author, text: input.text });
						log.notices.push({ to: input.to, author: input.author, text: input.text });
						return null;
					},
					note: (_input, ctx) => {
						ctx.state.counter += 1;
						log.counter = ctx.state.counter;
						return { number: ctx.state.counter };
					},
					deliver: (_input, ctx) => {
						ctx.state.counter += 1;
						log.counter = ctx.state.counter;
						return { number: ctx.state.counter };
					},
					takeNumber: (_input, ctx) => {
						ctx.state.counter += 1;
						log.counter = ctx.state.counter;
						return ctx.state.counter;
					},
					dmWindow: (input, ctx) => {
						if (dmLimit === undefined) return log.window;
						const from = Math.floor(ctx.minute / dmLimit.windowMinutes) * dmLimit.windowMinutes;
						const dms = log.dms.filter((record) => record.from === input.resident && record.minute >= from).length;
						const memos = ctx.tryCall(ReceiptsApi, "memoTransfers", { resident: input.resident, since: from }) ?? 0;
						return { sent: dms + memos, limit: dmLimit.perWindow, from, until: from + dmLimit.windowMinutes };
					},
					dmRecords: () => log.dms.map((record) => ({ ...record })),
					dmRecord: (input) => {
						const found = log.dms.find((record) => record.id === input.number);
						return found === undefined ? null : { ...found };
					},
					boardPost: (input) => log.board.find((post) => post.number === input.number) ?? null,
					groupPost: (input) => log.groupPosts.find((post) => post.number === input.number) ?? null,
					couldRead: (input) => log.readers.get(input.group)?.includes(input.reader) === true,
					lastNumber: () => log.counter,
					pendingDms: (input) => log.dms.filter((record) => record.to === input.resident && record.deliveredMinute === undefined).length,
					createCityGroup: () => ({ group: "GT1" }),
					removeCityGroup: () => null,
					postGroupAsCity: () => null,
				}),
			],
			tools: [
				kit.tool({
					name: "sendDM",
					description: "tools/sendDM",
					parameters: Type.Object({ target: Type.String(), message: Type.String() }),
					execute: (params, ctx) => {
						if (ctx.resident === undefined) return refuse("NO_RESIDENT");
						ctx.state.counter += 1;
						log.counter = ctx.state.counter;
						const counter = ctx.state.counter;
						log.dms.push({ id: counter, from: ctx.resident, to: params.target, minute: ctx.minute, answered: false, text: params.message });
						ctx.emit("dm_sent", { from: ctx.resident, to: params.target, text: params.message, number: counter });
						return reply("sent");
					},
				}),
			],
			snapshot: kit.snapshot({
				version: 1,
				schema: Slice,
				save: (state) => ({ old: state.data, counter: state.counter, dms: log.dms.map((row) => ({ ...row })), board: log.board.map((row) => ({ ...row })) }),
				load: (data) => {
					reset();
					log.counter = data.counter;
					log.dms.push(...data.dms.map((row) => ({ ...row })));
					log.board.push(...data.board.map((row) => ({ ...row })));
					return { data: data.old, counter: data.counter };
				},
				migrations: { 0: (old) => ({ old: Parse(Type.Unknown(), old), counter: 1000, dms: [], board: [] }) },
			}),
		}),
	);
	return { use: mechanic.with(), log };
}
