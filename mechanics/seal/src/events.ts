/** The events of the seal mechanic: the old events field for field (packages/chronicle event-schema.ts) without `type`, `seq`, `minute`. */
import { Type } from "typebox";

const Id = Type.String();
const Int = Type.Integer();

export const sealEvents = {
	seal_auction_opened: Type.Object({ seal: Int, until: Int }),
	seal_bid: Type.Object({ seal: Int, agent: Id, points: Int }),
	seal_won: Type.Object({ seal: Int, agent: Id, bid: Int, bids: Type.Array(Type.Object({ agent: Id, points: Int })) }),
	seal_used: Type.Object({ seal: Int, holder: Id, target: Id }),
	seal_expired: Type.Object({ seal: Int, holder: Type.Optional(Id), reason: Type.String() }),
} as const;
