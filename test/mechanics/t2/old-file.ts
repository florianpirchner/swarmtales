/**
 * An Act I checkpoint as it was before the story added a cast member: the ledger without the
 * member's escrow account, and the cast slice without the member. The result still converts and
 * loads; the snapshot is a copy, the original is untouched.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type { HostSnapshot } from "@swarmtales/contracts";

const Rec = Type.Record(Type.String(), Type.Unknown());
const List = Type.Array(Type.Unknown());

const rec = (value: unknown): Record<string, unknown> => Parse(Rec, value);
const list = (value: unknown): readonly unknown[] => Parse(List, value);

/** The version-0 ledger slice (`{ ledger: { balances, entries, txSeq } }`) without one account's balance. */
function withoutAccount(data: unknown, account: string): unknown {
	const root = rec(data);
	const book = rec(root.ledger);
	const balances = list(book.balances).filter((entry) => rec(entry).account !== account);
	if (balances.length !== list(book.balances).length - 1) throw new Error(`the ledger of the file has no account ${account}`);
	return { ...root, ledger: { ...book, balances } };
}

/** The checkpoint before `member` joined the cast: no cast member, and no escrow account (`ESCROW:<member>`). */
export function beforeTheMember(host: HostSnapshot, member: string): HostSnapshot {
	const ledger = host.mechanics.ledger;
	if (ledger === undefined) throw new Error("the checkpoint has no ledger slice");
	return {
		...host,
		mechanics: {
			...host.mechanics,
			cast: { version: 0, data: { cast: { members: [], collections: [] } } },
			ledger: { ...ledger, data: withoutAccount(ledger.data, `ESCROW:${member}`) },
		},
	};
}
