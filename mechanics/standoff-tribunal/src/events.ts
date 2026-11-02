/** The events of the holdout tribunal: the old events field for field (packages/chronicle event-schema.ts) without `type`, `seq`, `minute`. */
import { Type } from "typebox";

const Id = Type.String();
const Ids = Type.Array(Id);
const Int = Type.Integer();
const By = Type.Union([Type.Literal("gamemaker"), Type.Literal("city")]);

export const holdoutEvents = {
	blocker_found: Type.Object({ door: Int, blocker: Id, lacking: Ids }),
	blocker_cleared: Type.Object({ door: Int, blocker: Id }),
	holdout_called: Type.Object({ tribunal: Int, accused: Id, door: Int, lacking: Ids, until: Int, text: Type.String(), candidates: Type.Optional(Ids) }),
	lot_drawn: Type.Object({ tribunal: Int, purpose: Type.Union([Type.Literal("accused"), Type.Literal("strike")]), candidates: Ids, drawn: Id }),
	holdout_vote_opened: Type.Object({ tribunal: Int, vote: Int, voters: Ids, until: Int }),
	holdout_ballot: Type.Object({ tribunal: Int, vote: Int, agent: Id, yes: Type.Boolean() }),
	holdout_vote_result: Type.Object({ tribunal: Int, vote: Int, yes: Int, no: Int, voters: Ids, unanimous: Type.Boolean() }),
	holdout_announced: Type.Object({
		tribunal: Int,
		kind: Type.Union([Type.Literal("dropped"), Type.Literal("graceFailed"), Type.Literal("voteFailed"), Type.Literal("spared")]),
		by: By,
		text: Type.String(),
	}),
	holdout_ended: Type.Object({
		tribunal: Int,
		outcome: Type.Union([Type.Literal("dropped"), Type.Literal("banished"), Type.Literal("lot"), Type.Literal("spared")]),
		struck: Type.Optional(Id),
		by: Type.Optional(By),
	}),
} as const;
