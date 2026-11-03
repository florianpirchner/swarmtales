/**
 * Proof mechanic `channels` (wave 2a): a public board and direct messages. It requires the
 * `ledger` API: a DM must be affordable (stage `afford`) and is charged only after it was sent
 * (stage `settle`, a command service call). It listens to the ledger's transfers without requiring
 * the ledger mechanic, unlocks `sendDM` for a resident after the first board post, delivers the
 * inbox as turn inputs and pins the board on a schedule.
 */
import { Type } from "typebox";
import { defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { LedgerApi, ledger } from "./ledger.ts";

interface Post {
	readonly from: string;
	readonly text: string;
	readonly minute: number;
}

interface ChannelsState {
	readonly board: Post[];
	readonly inbox: Map<string, string[]>;
	pinned: number;
}

const Text = Type.String({ minLength: 1 });

export const channels = defineMechanic(
	{
		id: "channels",
		summary: "A public board and direct messages that cost points.",
		requires: [LedgerApi],
		options: Type.Object({
			dmCost: Type.Integer({ minimum: 0, default: 1, description: "Points a direct message costs once it is sent." }),
			pinEvery: Type.Integer({ minimum: 1, default: 2, description: "Every how many minutes the board is pinned." }),
		}),
		state: (): ChannelsState => ({ board: [], inbox: new Map(), pinned: 0 }),
		events: {
			board_posted: Type.Object({ from: Type.String(), text: Type.String() }),
			dm_sent: Type.Object({ from: Type.String(), to: Type.String(), text: Type.String() }),
			inbox_delivered: Type.Object({ to: Type.String(), count: Type.Integer() }),
			board_pinned: Type.Object({ posts: Type.Integer() }),
		},
		prompts: {
			"channels/tools/postBoard": [],
			"channels/tools/readBoard": [],
			"channels/tools/sendDM": [],
			"channels/posted": [],
			"channels/dm-sent": ["to"],
			"channels/dm-notice": ["from", "text"],
			"channels/payment-notice": ["from", "amount"],
			"channels/board-empty": [],
		},
	},
	(kit) => ({
		tools: [
			kit.tool({
				name: "postBoard",
				description: "channels/tools/postBoard",
				parameters: Type.Object({ text: Text }),
				suggest: ["resident", "gamemaker"],
				guardText: (params) => params.text,
				execute: (params, ctx) => {
					const from = ctx.resident ?? ctx.actor;
					ctx.state.board.push({ from, text: params.text, minute: ctx.minute });
					ctx.emit("board_posted", { from, text: params.text });
					if (ctx.resident !== undefined) ctx.access.unlock(ctx.resident, "sendDM");
					return reply(ctx.prompt("channels/posted", {}));
				},
			}),
			kit.tool({
				name: "readBoard",
				description: "channels/tools/readBoard",
				parameters: Type.Object({}),
				suggest: ["resident"],
				execute: (_params, ctx) => {
					if (ctx.state.board.length === 0) return reply(ctx.prompt("channels/board-empty", {}));
					return reply(ctx.state.board.map((post) => `${post.from}: ${post.text}`).join("\n"));
				},
			}),
			kit.tool({
				name: "sendDM",
				description: "channels/tools/sendDM",
				parameters: Type.Object({ to: Type.String(), text: Text }),
				suggest: ["resident"],
				rule: (params, ctx) => (ctx.residents.has(params.to) && params.to !== ctx.resident ? undefined : refuse("UNKNOWN_RECIPIENT")),
				execute: (params, ctx) => {
					const from = ctx.resident ?? ctx.actor;
					const inbox = ctx.state.inbox.get(params.to) ?? [];
					inbox.push(ctx.prompt("channels/dm-notice", { from, text: params.text }));
					ctx.state.inbox.set(params.to, inbox);
					ctx.emit("dm_sent", { from, to: params.to, text: params.text });
					return reply(ctx.prompt("channels/dm-sent", { to: params.to }));
				},
			}),
		],
		pipeline: {
			afford: (call, ctx) => {
				if (call.tool !== "sendDM" || call.resident === undefined) return undefined;
				return ctx.call(LedgerApi, "balance", { resident: call.resident }) < ctx.options.dmCost ? refuse("NO_POINTS") : undefined;
			},
			settle: (call, _outcome, ctx) => {
				if (call.tool !== "sendDM" || call.resident === undefined || ctx.options.dmCost === 0) return;
				ctx.call(LedgerApi, "charge", { resident: call.resident, amount: ctx.options.dmCost, memo: "sendDM" });
			},
		},
		listeners: [
			kit.listen(ledger, "points_transferred", (payload, ctx) => {
				const inbox = ctx.state.inbox.get(payload.to) ?? [];
				inbox.push(ctx.prompt("channels/payment-notice", { from: payload.from, amount: payload.amount }));
				ctx.state.inbox.set(payload.to, inbox);
			}),
		],
		hooks: {
			runStarted: (ctx) => {
				ctx.schedule.every(ctx.options.pinEvery, "pin", { start: ctx.options.pinEvery });
			},
			turnInputs: (resident, ctx) => {
				const lines = ctx.state.inbox.get(resident) ?? [];
				if (lines.length === 0) return [];
				ctx.state.inbox.delete(resident);
				ctx.emit("inbox_delivered", { to: resident, count: lines.length });
				return lines;
			},
		},
		jobs: {
			pin: (ctx) => {
				ctx.state.pinned = ctx.state.board.length;
				ctx.emit("board_pinned", { posts: ctx.state.board.length });
			},
		},
		facts: {
			boardSize: kit.fact(Type.Integer(), (view) => view.state.board.length),
			unread: kit.fact(Type.Record(Type.String(), Type.Integer()), (view) => Object.fromEntries([...view.state.inbox].map(([id, lines]) => [id, lines.length]))),
		},
		snapshot: kit.snapshot({
			version: 1,
			schema: Type.Object({
				board: Type.Array(Type.Object({ from: Type.String(), text: Type.String(), minute: Type.Integer() })),
				inbox: Type.Record(Type.String(), Type.Array(Type.String())),
				pinned: Type.Integer(),
			}),
			save: (state) => ({ board: [...state.board], inbox: Object.fromEntries(state.inbox), pinned: state.pinned }),
			load: (data) => ({ board: [...data.board], inbox: new Map(Object.entries(data.inbox)), pinned: data.pinned }),
		}),
	}),
);
