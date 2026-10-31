/**
 * A small mutable world and stand-in providers of the frozen APIs of the other teams (T1 ledger,
 * T2 channels, T3 puzzles, progression, goals), so the mechanics of team T4 run on the new host
 * without them. Everything the stand-ins do is recorded in the world for the tests to read.
 */
import { Type, type Static } from "typebox";
import { defineMechanic } from "@swarmtales/kernel";
import { ChannelsApi, GoalsApi, LedgerApi, ProgressionApi, PuzzlesApi, SealApi } from "@swarmtales/mechanic-shared";
import { provider } from "./provider.ts";

export interface Notice {
	readonly to: string;
	readonly author: string;
	readonly text: string;
}

export interface CallLog {
	readonly api: string;
	readonly method: string;
	readonly input: unknown;
}

export class TestWorld {
	readonly points = new Map<string, number>();
	readonly levels = new Map<string, number>();
	readonly solved = new Map<string, Set<number>>();
	/** Levels passed first, in the order residents passed them. */
	readonly passedBy = new Map<number, string[]>();
	readonly lastProgress = new Map<string, number>();
	readonly actStarts = new Map<number, number>();
	readonly notices: Notice[] = [];
	readonly posts: Notice[] = [];
	readonly groups: { readonly name: string; readonly members: readonly string[] }[] = [];
	readonly groupPosts: { readonly group: string; readonly text: string }[] = [];
	readonly calls: CallLog[] = [];
	doorShut = false;
	currentAct = 1;
	postSeq = 0;
	message = 0;

	constructor(ids: readonly string[], points = 100) {
		for (const id of ids) {
			this.points.set(id, points);
			this.levels.set(id, 1);
		}
	}

	balance(account: string): number {
		return this.points.get(account) ?? 0;
	}

	add(account: string, delta: number): void {
		this.points.set(account, this.balance(account) + delta);
	}

	levelOf(id: string): number {
		return this.levels.get(id) ?? 1;
	}

	hasPassed(id: string, level: number): boolean {
		return this.levelOf(id) > level || this.solved.get(id)?.has(level) === true;
	}

	/** The resident passes its level and moves up. */
	pass(id: string, minute: number): void {
		const level = this.levelOf(id);
		this.levels.set(id, level + 1);
		this.passedBy.set(level, [...(this.passedBy.get(level) ?? []), id]);
		this.lastProgress.set(id, minute);
	}

	noticesOf(id: string): readonly string[] {
		return this.notices.filter((notice) => notice.to === id).map((notice) => notice.text);
	}

	record(api: string, method: string, input: unknown): void {
		this.calls.push({ api, method, input });
	}
}

/** Stand-in ledger: balances in the world; bookings leave no event. */
export function ledgerStandIn(world: TestWorld) {
	return provider("ledger", LedgerApi, {
		balance: ({ account }) => world.balance(account),
		balances: () => Object.fromEntries(world.points),
		mint: ({ account, amount, reason }) => {
			world.record("ledger", "mint", { account, amount, reason });
			world.add(account, amount);
			return null;
		},
		burn: ({ account, amount, reason }) => {
			world.record("ledger", "burn", { account, amount, reason });
			world.add(account, -amount);
			return null;
		},
		move: ({ from, to, amount, reason }) => {
			world.record("ledger", "move", { from, to, amount, reason });
			if (world.balance(from) < amount) return { ok: false as const, code: "INSUFFICIENT_FUNDS" as const };
			world.add(from, -amount);
			world.add(to, amount);
			return { ok: true as const, txId: `TX${String(world.calls.length)}` };
		},
	});
}

/** Stand-in channels: notices, posts and groups are recorded in the world. */
export function channelsStandIn(world: TestWorld) {
	return provider("channels", ChannelsApi, {
		post: ({ author, text }) => {
			world.postSeq += 1;
			world.posts.push({ to: "board", author, text });
			return { postSeq: world.postSeq };
		},
		notify: ({ to, author, text }) => {
			world.notices.push({ to, author, text });
			return null;
		},
		note: ({ to, author, text }) => {
			world.notices.push({ to, author, text });
			world.message += 1;
			return { number: world.message };
		},
		deliver: () => ({ number: ++world.message }),
		takeNumber: () => ++world.message,
		dmWindow: () => null,
		dmRecords: () => [],
		createCityGroup: ({ name, members }) => {
			world.groups.push({ name, members });
			return { group: name };
		},
		removeCityGroup: ({ group }) => {
			world.record("channels", "removeCityGroup", { group });
			return null;
		},
		postGroupAsCity: ({ group, text }) => {
			world.groupPosts.push({ group, text });
			return null;
		},
	});
}

/** Stand-in progression: levels, passes and acts from the world. */
export function progressionStandIn(world: TestWorld) {
	return provider("progression", ProgressionApi, {
		levelOf: ({ resident }) => world.levelOf(resident),
		isFinished: () => false,
		hasPassed: ({ resident, level }) => world.hasPassed(resident, level),
		passed: ({ level }) => world.passedBy.get(level) ?? [],
		lastProgress: ({ resident }) => world.lastProgress.get(resident) ?? null,
		currentAct: () => world.currentAct,
		actStart: ({ fromLevel }) => world.actStarts.get(fromLevel) ?? null,
		door: () => null,
		doorShut: () => world.doorShut,
		openDoor: () => true,
		releaseDoor: () => null,
		unlock: () => null,
		ranking: () => [],
		holdersBehind: () => [],
		firstSolveMinute: () => null,
	});
}

const Id = Type.String();
const puzzleEvents = {
	fragments_dealt: Type.Object({ level: Type.Integer(), holdings: Type.Array(Type.Object({ agent: Id, team: Type.Integer(), fragment: Type.String() })) }),
	factors_dealt: Type.Object({
		level: Type.Integer(),
		digits: Type.Integer(),
		cityFactor: Type.String(),
		teams: Type.Array(Type.Object({ team: Type.Integer(), certificate: Type.String(), certificateHolder: Id })),
		holdings: Type.Array(Type.Object({ agent: Id, team: Type.Integer(), salt: Type.String(), counterFactor: Type.String(), counterHolder: Id, code: Type.String() })),
	}),
	factor_burned: Type.Object({ agent: Id, level: Type.Integer(), piece: Type.String(), needers: Type.Array(Id) }),
	level_contracted: Type.Object({ level: Type.Integer(), excluded: Type.Array(Id) }),
} as const;

/** The deals a stand-in puzzles mechanic writes when the run starts (as the real one deals them at minute 0). */
export interface Deals {
	readonly fragments?: readonly Static<(typeof puzzleEvents)["fragments_dealt"]>[];
	readonly factors?: readonly Static<(typeof puzzleEvents)["factors_dealt"]>[];
}

/** Stand-in puzzles: writes the deal events; `burn` and `contract` write theirs; `lacking` comes from the test. */
export function puzzlesStandIn(world: TestWorld, deals: Deals = {}, lacking: (level: number, holder: string) => readonly string[] = () => []) {
	return defineMechanic(
		{ id: "puzzles", summary: "Stand-in puzzles.", options: Type.Object({}), state: (): undefined => undefined, events: puzzleEvents, provides: [PuzzlesApi] },
		(kit) => ({
			services: [
				kit.provide(PuzzlesApi, {
					deal: () => null,
					isDealt: () => true,
					solutionOf: () => null,
					teamOf: ({ resident }) => ({ members: [resident], leader: resident }),
					passwordPiece: () => false,
					lacking: ({ level, holder }) => [...lacking(level, holder)],
					carriesSecret: () => false,
					burn: (input, ctx) => {
						world.record("puzzles", "burn", input);
						ctx.emit("factor_burned", { agent: input.agent, level: input.level, piece: input.piece, needers: input.needers });
						return null;
					},
					contract: (input, ctx) => {
						world.record("puzzles", "contract", input);
						ctx.emit("level_contracted", { level: input.level, excluded: input.excluded });
						return null;
					},
				}),
			],
			hooks: {
				runStarted: (ctx) => {
					for (const deal of deals.fragments ?? []) ctx.emit("fragments_dealt", deal);
					for (const deal of deals.factors ?? []) ctx.emit("factors_dealt", deal);
				},
			},
		}),
	);
}

/** Stand-in goals: records that a resident left. */
export function goalsStandIn(world: TestWorld) {
	return provider("goals", GoalsApi, {
		onExiled: ({ resident }) => {
			world.record("goals", "onExiled", { resident });
			return null;
		},
	});
}

/** Stand-in seal: records that a resident left. */
export function sealStandIn(world: TestWorld) {
	return provider("seal", SealApi, {
		onExiled: ({ resident }) => {
			world.record("seal", "onExiled", { resident });
			return null;
		},
	});
}
