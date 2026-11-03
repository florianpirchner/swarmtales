/**
 * A stand-in provider of `ChannelsApi` that answers from the records of an old run snapshot as they
 * are, a DM without its text included. Real channels reads such a record as empty text until team T2
 * stops coercing it (R2-D14, carve-requests-round3-T1.md, request 1), so the paths of blame that need
 * `text === undefined` are proved here, against the replies of the old engine.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type { MechanicUse } from "@swarmtales/contracts";
import { defineMechanic } from "@swarmtales/kernel";
import { ChannelsApi } from "@swarmtales/mechanic-shared";

const Dm = Type.Object({ id: Type.Integer(), from: Type.String(), to: Type.String(), minute: Type.Integer(), answered: Type.Boolean(), text: Type.Optional(Type.String()), deliveredMinute: Type.Optional(Type.Integer()), deliveredAfter: Type.Optional(Type.Integer()) });
const Post = Type.Object({ seq: Type.Integer(), author: Type.String(), text: Type.String(), kind: Type.Union([Type.Literal("player"), Type.Literal("city"), Type.Literal("system")]), minute: Type.Integer() });
const World = Type.Object({ world: Type.Object({ dms: Type.Array(Dm), board: Type.Object({ posts: Type.Array(Post) }), messages: Type.Optional(Type.Integer()) }) });

/** The records of an old run snapshot (a parsed `snapshot-L7.json`) behind the blame lookups of `ChannelsApi`. */
export function recordsChannels(raw: unknown): MechanicUse {
	const { world } = Parse(World, JSON.parse(JSON.stringify(raw)));
	let counter = world.messages ?? 0;
	return defineMechanic(
		{ id: "channels", summary: "The records of an old snapshot.", options: Type.Object({}), state: (): undefined => undefined, events: { notice: Type.Object({ to: Type.String(), author: Type.String(), text: Type.String() }), board_post: Type.Object({ postSeq: Type.Integer(), author: Type.String(), text: Type.String(), kind: Type.String() }) }, provides: [ChannelsApi] },
		(kit) => ({
			services: [
				kit.provideSome(ChannelsApi, {
					dmRecord: (input) => {
						const found = world.dms.find((record) => record.id === input.number);
						return found === undefined ? null : { ...found };
					},
					boardPost: (input) => {
						const found = world.board.posts.find((post) => post.seq === input.number);
						return found === undefined ? null : { number: found.seq, author: found.author, text: found.text, kind: found.kind, minute: found.minute };
					},
					groupPost: () => null,
					couldRead: () => false,
					post: (input, ctx) => {
						counter += 1;
						ctx.emit("board_post", { postSeq: counter, author: input.author, text: input.text, kind: "city" });
						return { postSeq: counter };
					},
					notify: (input, ctx) => {
						ctx.emit("notice", { to: input.to, author: input.author, text: input.text });
						return null;
					},
				}),
			],
		}),
	).with();
}
