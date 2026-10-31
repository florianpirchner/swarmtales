/**
 * Small stand-ins for the mechanics of the other teams, for the tests of puzzles, progression and
 * goals (docs/design/carve-round2-T3.md): each answers only what T3 calls, from state the test sets.
 * They use `provideSome`, so a call outside their little contract throws.
 */
import { Type } from "typebox";
import { defineMechanic, reply } from "@swarmtales/kernel";
import { ChannelsApi, MotivesApi, ExileApi, LedgerApi, ProgressionApi, ProgressionEvents } from "@swarmtales/mechanic-shared";

export interface Notice {
	readonly to: string;
	readonly author: string;
	readonly text: string;
}

export interface Post {
	readonly author: string;
	readonly text: string;
}

/** The notices and board posts the city wrote through `ChannelsApi`. */
export interface Desk {
	readonly notices: Notice[];
	readonly posts: Post[];
}

export function newDesk(): Desk {
	return { notices: [], posts: [] };
}

const none = { id: "", summary: "", options: Type.Object({}), state: () => undefined, events: {} } as const;

/** Channels that only record `notify` and `post`. */
export function recordingChannels(desk: Desk) {
	return defineMechanic({ ...none, id: "channels", summary: "Stand-in: records notices and posts.", provides: [ChannelsApi] }, (kit) => ({
		services: [
			kit.provideSome(ChannelsApi, {
				post: ({ author, text }) => {
					desk.posts.push({ author, text });
					return { postSeq: desk.posts.length };
				},
				notify: ({ to, author, text }) => {
					desk.notices.push({ to, author, text });
					return null;
				},
				dmRecords: () => [],
				dmWindow: () => null,
				pendingDms: () => 0,
			}),
		],
	}));
}

/** A ledger whose balances the test sets; `mint` and `burn` change them. */
export function settableLedger(balances: Map<string, number>) {
	return defineMechanic({ ...none, id: "ledger", summary: "Stand-in: settable balances.", provides: [LedgerApi] }, (kit) => ({
		services: [
			kit.provideSome(LedgerApi, {
				balance: ({ account }) => balances.get(account) ?? 0,
				balances: () => Object.fromEntries(balances),
				mint: ({ account, amount }) => {
					balances.set(account, (balances.get(account) ?? 0) + amount);
					return null;
				},
				burn: ({ account, amount }) => {
					balances.set(account, (balances.get(account) ?? 0) - amount);
					return null;
				},
			}),
		],
	}));
}

/** An exile that knows who the test exiled. */
export function exileStub(exiled: Set<string>, residents: readonly string[]) {
	return defineMechanic({ ...none, id: "exile", summary: "Stand-in: a set of exiled residents.", provides: [ExileApi] }, (kit) => ({
		services: [
			kit.provideSome(ExileApi, {
				isExiled: ({ resident }) => exiled.has(resident),
				standing: ({ resident }) => (exiled.has(resident) ? { kind: "exiled" } : { kind: "alive" }),
				alive: () => residents.filter((id) => !exiled.has(id)),
			}),
		],
	}));
}

/** Core motives that only know their drives. */
export function motivesStub(drives: ReadonlyMap<string, readonly string[]>) {
	return defineMechanic({ ...none, id: "motives", summary: "Stand-in: drives per resident.", provides: [MotivesApi] }, (kit) => ({
		services: [kit.provideSome(MotivesApi, { drivesOf: ({ resident }) => (drives.get(resident) === undefined ? null : [...(drives.get(resident) ?? [])]) })],
	}));
}

/**
 * A progression that only announces acts: the tools `startAct` and `endAct` (script) write the
 * silent events goals and the seal listen to.
 */
export function actAnnouncer() {
	return defineMechanic(
		{ ...none, id: "progression", summary: "Stand-in: announces acts.", events: { ...ProgressionEvents.events }, provides: [ProgressionApi], prompts: { "standin/tool": [] } },
		(kit) => ({
			services: [kit.provideSome(ProgressionApi, {})],
			tools: [
				kit.tool({
					name: "startAct",
					description: "standin/tool",
					parameters: Type.Object({ fromLevel: Type.Integer({ minimum: 1 }), residents: Type.Array(Type.String()) }),
					suggest: ["script"],
					execute: (params, ctx) => {
						ctx.emit("act_started", { fromLevel: params.fromLevel, residents: params.residents });
						return reply("started");
					},
				}),
				kit.tool({
					name: "endAct",
					description: "standin/tool",
					parameters: Type.Object({ fromLevel: Type.Integer({ minimum: 1 }) }),
					suggest: ["script"],
					execute: (params, ctx) => {
						ctx.emit("act_ended", { fromLevel: params.fromLevel });
						return reply("ended");
					},
				}),
			],
		}),
	);
}
