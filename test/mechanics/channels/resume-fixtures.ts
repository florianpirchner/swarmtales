/**
 * Version-0 fixtures: the real Act I checkpoint changed to hold what the real files do not. The
 * result still passes the old snapshot schema, so the old engine resumes from it too.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";

const Rec = Type.Record(Type.String(), Type.Unknown());
const List = Type.Array(Type.Unknown());

const rec = (value: unknown): Record<string, unknown> => Parse(Rec, JSON.parse(JSON.stringify(value)));
const list = (value: unknown): readonly unknown[] => Parse(List, JSON.parse(JSON.stringify(value)));

/**
 * An open petition with one signer; a cast member that is no longer hidden with a collection that
 * already holds an entry; a removed city group; the sixth resident exiled; a DM record without
 * its text; and an unnumbered DM waiting in a mailbox (a city's or an old run's own message).
 * `seenBoard` is in the checkpoint already (`arena.seenBoard`).
 */
export function withVersionZeroShapes(raw: unknown): unknown {
	const file = rec(raw);
	const world = rec(file.world);
	const groups = rec(world.groups);
	const tribunal = rec(world.tribunal);
	const cast = rec(world.cast);
	// The director unlocked the petition tools for everyone (`extraTools`); A03 also has an unnumbered DM waiting.
	const competitors = list(world.competitors).map((entry, index) => ({ ...rec(entry), extraTools: ["signPetition", "listPetitions"], ...(index === 2 ? { mailbox: [{ from: "A02", text: "An unnumbered hello.", minute: 8 }] } : {}) }));
	return {
		...file,
		world: {
			...world,
			petitions: [{ id: "plea", text: "Open the gate.", threshold: 2, deadlineMinute: 11, visibility: "public", openedAt: 8, status: "open", signatures: 1, signers: ["A02"] }],
			cast: {
				members: list(cast.members).map((member) => ({ ...rec(member), hidden: false })),
				collections: [{ into: "table", cast: "STEWARD", first: 3, untilMinute: 12, distinctSenders: true, entries: [{ from: "A03", text: "A03 asks for a seat.", minute: 8 }] }],
			},
			groups: { ...groups, groups: [...list(groups.groups), { id: "G3", name: "The old plot", founder: "CITY", treasurer: "CITY", members: [], reads: [], posts: [], removed: true }] },
			dms: list(world.dms).map((record, index) => (index === 0 ? Object.fromEntries(Object.entries(rec(record)).filter(([key]) => key !== "text")) : record)),
			tribunal: { ...tribunal, exiled: ["A06"] },
			competitors,
		},
	};
}
