/**
 * A small mutable city and stand-in providers of the frozen APIs of the other teams (T1 ledger, T2
 * channels, T3 progression, puzzles, goals, T4b standoff and seal), so the exile and the tribunal
 * run on the new host without them. Everything the stand-ins do is recorded, in call order, for
 * the tests to compare with what the old `Tribunal` and `World` did.
 */
import { Type } from "typebox";
import { defineMechanic } from "@swarmtales/kernel";
import { ChannelsApi, GoalsApi, LedgerApi, ProgressionApi, PuzzlesApi, SealApi, StandoffApi, type HeldPiece } from "@swarmtales/mechanic-shared";
import { provider } from "./provider.ts";

export interface Entry {
	readonly kind: string;
	readonly data: unknown;
}

export class TestCity {
	readonly points = new Map<string, number>();
	readonly levels = new Map<string, number>();
	readonly lastProgress = new Map<string, number>();
	readonly held = new Map<string, readonly HeldPiece[]>();
	readonly passedLevels = new Map<string, Set<number>>();
	/** Every effect in order: posts, notices, groups, bookings, the API calls of other teams. */
	readonly effects: Entry[] = [];
	passed: string[] = [];
	doorShut = false;
	actStart: number | null = 0;
	bounds = { startLevel: 8, lastLevel: 10, survivors: 2 };
	groupSeq = 0;
	postSeq = 0;

	constructor(ids: readonly string[], points: readonly number[] | number = 100) {
		ids.forEach((id, index) => {
			this.points.set(id, typeof points === "number" ? points : (points[index] ?? 0));
			this.levels.set(id, 8);
		});
	}

	balance(account: string): number {
		return this.points.get(account) ?? 0;
	}

	add(account: string, delta: number): void {
		this.points.set(account, this.balance(account) + delta);
	}

	record(kind: string, data: unknown): void {
		this.effects.push({ kind, data });
	}

	of(kind: string): readonly unknown[] {
		return this.effects.filter((entry) => entry.kind === kind).map((entry) => entry.data);
	}

	texts(kind: "post" | "notice" | "groupPost"): readonly string[] {
		return this.effects.filter((entry) => entry.kind === kind).map((entry) => JSON.stringify(entry.data));
	}
}

export function ledgerStandIn(city: TestCity, id = "ledger") {
	return provider(id, LedgerApi, {
		balance: ({ account }) => city.balance(account),
		balances: () => Object.fromEntries(city.points),
		mint: ({ account, amount, reason }) => {
			city.record("mint", { agent: account, amount, reason });
			city.add(account, amount);
			return null;
		},
		burn: ({ account, amount, reason }) => {
			city.record("burn", { agent: account, amount, reason });
			city.add(account, -amount);
			return null;
		},
		move: ({ from, to, amount, reason }) => {
			if (city.balance(from) < amount) return { ok: false as const, code: "INSUFFICIENT_FUNDS" as const };
			city.record("move", { from, to, amount, reason });
			city.add(from, -amount);
			city.add(to, amount);
			return { ok: true as const, txId: `TX${String(city.effects.length)}` };
		},
	});
}

export function channelsStandIn(city: TestCity, id = "channels") {
	return provider(id, ChannelsApi, {
		post: ({ text }) => {
			city.record("post", text);
			city.postSeq += 1;
			return { postSeq: city.postSeq };
		},
		notify: ({ to, text }) => {
			city.record("notice", { agent: to, text });
			return null;
		},
		createCityGroup: ({ name, members }) => {
			city.groupSeq += 1;
			const group = `G${String(city.groupSeq)}`;
			city.record("group", { id: group, name, members });
			return { group };
		},
		removeCityGroup: ({ group }) => {
			city.record("groupRemoved", group);
			return null;
		},
		postGroupAsCity: ({ group, text }) => {
			city.record("groupPost", { group, text });
			return null;
		},
	});
}

export function progressionStandIn(city: TestCity, id = "progression") {
	return provider(id, ProgressionApi, {
		levelOf: ({ resident }) => city.levels.get(resident) ?? 8,
		hasPassed: ({ resident, level }) => city.passedLevels.get(resident)?.has(level) === true,
		passed: () => [...city.passed],
		lastProgress: ({ resident }) => city.lastProgress.get(resident) ?? null,
		actStart: () => city.actStart,
		doorShut: () => city.doorShut,
		bounds: () => ({ ...city.bounds }),
		endAct: ({ fromLevel }) => {
			const first = !city.of("endAct").includes(fromLevel);
			if (first) city.record("endAct", fromLevel);
			return first;
		},
	});
}

const Id = Type.String();
const puzzleEvents = {
	factor_burned: Type.Object({ agent: Id, level: Type.Integer(), piece: Type.String(), needers: Type.Array(Id) }),
	level_contracted: Type.Object({ level: Type.Integer(), excluded: Type.Array(Id) }),
} as const;

/** Stand-in puzzles: the held pieces from the city; `burn` and `contract` are recorded and write their events. */
export function puzzlesStandIn(city: TestCity, id = "puzzles") {
	return defineMechanic(
		{ id, summary: "Stand-in puzzles.", options: Type.Object({}), state: (): undefined => undefined, events: puzzleEvents, provides: [PuzzlesApi] },
		(kit) => ({
			services: [
				kit.provideSome(PuzzlesApi, {
					heldPieces: ({ resident }) => (city.held.get(resident) ?? []).map((piece) => ({ ...piece, needers: [...piece.needers] })),
					burn: (input, ctx) => {
						city.record("factorBurned", input);
						ctx.emit("factor_burned", { agent: input.agent, level: input.level, piece: input.piece, needers: input.needers });
						return null;
					},
					contract: (input, ctx) => {
						city.record("contract", input);
						ctx.emit("level_contracted", { level: input.level, excluded: input.excluded });
						return null;
					},
				}),
			],
		}),
	);
}

export function standoffStandIn(city: TestCity, id = "standoff") {
	return provider(id, StandoffApi, {
		keep: (input) => {
			city.record("keep", input);
			return null;
		},
		noteGiven: (input) => {
			city.record("noteGiven", input);
			return null;
		},
	});
}

export function goalsStandIn(city: TestCity, id = "goals") {
	return provider(id, GoalsApi, {
		onExiled: ({ resident }) => {
			city.record("goalsExiled", resident);
			return null;
		},
		noteLeaders: ({ leaders }) => {
			city.record("noteLeaders", leaders);
			return null;
		},
		noteHeir: ({ heir }) => {
			city.record("noteHeir", heir);
			return null;
		},
	});
}

export function sealStandIn(city: TestCity, id = "seal") {
	return provider(id, SealApi, {
		onExiled: ({ resident }) => {
			city.record("sealExiled", resident);
			return null;
		},
	});
}

/**
 * Every stand-in of the other teams, in load order before the exile and the tribunal; `suffix`
 * renames them (the APIs match by name), so a resumed old file's slices go to `standInsFor`.
 */
export function standIns(city: TestCity, suffix = "") {
	return [
		ledgerStandIn(city, `ledger${suffix}`).with(),
		channelsStandIn(city, `channels${suffix}`).with(),
		progressionStandIn(city, `progression${suffix}`).with(),
		puzzlesStandIn(city, `puzzles${suffix}`).with(),
		standoffStandIn(city, `standoff${suffix}`).with(),
		goalsStandIn(city, `goals${suffix}`).with(),
		sealStandIn(city, `seal${suffix}`).with(),
	];
}
