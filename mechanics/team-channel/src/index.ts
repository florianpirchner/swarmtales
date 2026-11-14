// SPDX-License-Identifier: Apache-2.0
/**
 * The `team-channel` mechanic: private channels of pre-seeded teams. A resident posts to and reads
 * its own team's channel only. Every resident may post `maxPostsPerMove` messages per round; the
 * game (or another mechanic) opens the next round with `TeamChannelService.resetCap`. It knows no
 * game word: a "round" is whatever the caller says it is.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineHead, defineMechanic, refuse, reply, type CtxOf } from "@swarmtales/sdk";
import { TeamChannelService } from "./contract.ts";

export { TeamChannelService };

interface Post {
	readonly from: string;
	readonly text: string;
	readonly minute: number;
}

interface ChannelState {
	readonly posts: Map<string, Post[]>;
	/** Posts per resident in the current round. */
	readonly used: Map<string, number>;
	/** How many posts of the own team a resident has been shown. */
	readonly seen: Map<string, number>;
	/** Per team: the index of its first post of the current epoch. */
	readonly epoch: Map<string, number>;
}

const options = Type.Object({
	teams: Type.Record(Type.String(), Type.Array(Type.String(), { description: "Resident ids of one team." }), {
		default: {},
		description: "The teams and their members; a resident belongs to at most one team.",
	}),
	maxPostsPerMove: Type.Integer({ minimum: 1, default: 2, description: "Posts a resident may make per round, until resetCap(team) opens the next round." }),
	notify: Type.Boolean({ default: true, description: "Whether new team posts are shown to the other members at the start of their turn." }),
});

const Saved = Type.Object({
	posts: Type.Record(Type.String(), Type.Array(Type.Object({ from: Type.String(), text: Type.String(), minute: Type.Integer() }))),
	used: Type.Record(Type.String(), Type.Integer()),
	seen: Type.Record(Type.String(), Type.Integer()),
	epoch: Type.Optional(Type.Record(Type.String(), Type.Integer())),
});

const head = defineHead({
	id: "team-channel",
	package: "@swarmtales/mechanic-team-channel",
	summary: "Private team channels, pre-seeded, with a post cap per round.",
	provides: [TeamChannelService],
	options,
	state: Saved,
	snapshot: {
		save: (state: ChannelState) => ({ posts: Object.fromEntries([...state.posts].map(([team, posts]) => [team, [...posts]])), used: Object.fromEntries(state.used), seen: Object.fromEntries(state.seen), epoch: Object.fromEntries(state.epoch) }),
		load: (data): ChannelState => ({ posts: new Map(Object.entries(data.posts).map(([team, posts]) => [team, [...posts]])), used: new Map(Object.entries(data.used)), seen: new Map(Object.entries(data.seen)), epoch: new Map(Object.entries(data.epoch ?? {})) }),
	},
	start: ({ options: chosen }): ChannelState => {
		const owner = new Map<string, string>();
		for (const [team, members] of Object.entries(chosen.teams)) {
			for (const member of members) {
				const other = owner.get(member);
				if (other !== undefined) throw new RangeError(`team-channel: ${member} is in teams "${other}" and "${team}"`);
				owner.set(member, team);
			}
		}
		return { posts: new Map(Object.keys(chosen.teams).map((team) => [team, []])), used: new Map(), seen: new Map(), epoch: new Map() };
	},
	events: { team_post: Type.Object({ team: Type.String(), from: Type.String(), text: Type.String() }) },
	prompts: {
		"team-channel/tools/postTeam": [],
		"team-channel/tools/readTeam": [],
		"team-channel/posted": ["left"],
		"team-channel/empty": [],
		"team-channel/notice": ["from", "text"],
	},
	tools: {
		postTeam: { description: "team-channel/tools/postTeam", params: Type.Object({ text: Type.String({ minLength: 1 }) }), for: ["resident"] },
		readTeam: { description: "team-channel/tools/readTeam", params: Type.Object({}), for: ["resident"] },
	},
});

type Ctx = CtxOf<typeof head>;

function teamOf(ctx: Ctx, resident: string | undefined): string | undefined {
	if (resident === undefined) return undefined;
	return Object.entries(ctx.options.teams).find(([, members]) => members.includes(resident))?.[0];
}

/**
 * The `team-channel` mechanic: a private channel per team with a post cap per round. Calling it gives the use for
 * a game's `mechanics` list.
 *
 * @example
 * ```ts
 * teamChannel({ teams: { red: ["A01", "A02"], blue: ["A03"] }, maxPostsPerMove: 2 })
 * ```
 *
 * @public
 */
export const teamChannel = defineMechanic(head, {
	services: {
		"team-channel": {
			newEpoch: ({ team }, ctx) => {
				const posts = ctx.state.posts.get(team);
				if (posts === undefined) return false;
				ctx.state.epoch.set(team, posts.length);
				return true;
			},
			resetCap: ({ team }, ctx) => {
				const members = ctx.options.teams[team];
				if (members === undefined) return false;
				for (const member of members) ctx.state.used.delete(member);
				return true;
			},
		},
	},
	tools: {
		postTeam: {
			check: (_params, ctx) => {
				if (teamOf(ctx, ctx.resident) === undefined) return refuse("NOT_TEAM_MEMBER", "you are in no team");
				if ((ctx.state.used.get(ctx.resident ?? "") ?? 0) >= ctx.options.maxPostsPerMove) return refuse("POST_CAP", "no more posts this round");
				return undefined;
			},
			run: (params, ctx) => {
				const team = teamOf(ctx, ctx.resident);
				const from = ctx.resident;
				if (team === undefined || from === undefined) return refuse("NOT_TEAM_MEMBER", "you are in no team");
				const posts = ctx.state.posts.get(team) ?? [];
				posts.push({ from, text: params.text, minute: ctx.tick });
				ctx.state.posts.set(team, posts);
				// The author has seen its own post.
				ctx.state.seen.set(from, posts.length);
				const used = (ctx.state.used.get(from) ?? 0) + 1;
				ctx.state.used.set(from, used);
				ctx.emit("team_post", { team, from, text: params.text });
				return reply(ctx.prompt("team-channel/posted", { left: ctx.options.maxPostsPerMove - used }));
			},
		},
		readTeam: {
			check: (_params, ctx) => (teamOf(ctx, ctx.resident) === undefined ? refuse("NOT_TEAM_MEMBER", "you are in no team") : undefined),
			run: (_params, ctx) => {
				const team = teamOf(ctx, ctx.resident);
				const all = team === undefined ? [] : (ctx.state.posts.get(team) ?? []);
				const posts = all.slice(team === undefined ? 0 : (ctx.state.epoch.get(team) ?? 0));
				if (ctx.resident !== undefined) ctx.state.seen.set(ctx.resident, all.length);
				if (posts.length === 0) return reply(ctx.prompt("team-channel/empty", {}));
				return reply(posts.map((post) => `${post.from}: ${post.text}`).join("\n"));
			},
		},
	},
	hooks: {
		turnInputs: (resident, ctx) => {
			if (!ctx.options.notify) return [];
			const team = teamOf(ctx, resident);
			const posts = team === undefined ? [] : (ctx.state.posts.get(team) ?? []);
			const fresh = posts.slice(Math.max(ctx.state.seen.get(resident) ?? 0, team === undefined ? 0 : (ctx.state.epoch.get(team) ?? 0)));
			if (fresh.length === 0) return [];
			ctx.state.seen.set(resident, posts.length);
			return fresh.map((post) => ctx.prompt("team-channel/notice", { from: post.from, text: post.text }));
		},
	},
	facts: {
		posts: { output: Type.Record(Type.String(), Type.Integer()), compute: (view) => Object.fromEntries([...view.state.posts].map(([team, posts]) => [team, posts.length])) },
	},
});
