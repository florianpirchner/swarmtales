/**
 * Compile-time checks of what the one-object form infers on the two large mechanics: the tool
 * names, the options and the state behind `ctx`. A wrong inference fails `tsc` here.
 */
import type { Static } from "typebox";
import type { channels } from "../channels/index.ts";
import type { ChannelsState } from "../channels/state.ts";
import type { chess as chessHeadApart } from "../chess-head-apart/index.ts";
import type { chess } from "../chess/index.ts";
import type { CtxOf } from "../define.ts";

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Expect<T extends true> = T;

type ChessTools = NonNullable<(typeof chess)["toolNames"]>;
type ChessApartTools = NonNullable<(typeof chessHeadApart)["toolNames"]>;
type ChannelsTools = NonNullable<(typeof channels)["toolNames"]>;

export type Checks = [
	Expect<Equal<ChessTools, "viewBoard" | "playMove" | "resign">>,
	Expect<Equal<ChessApartTools, "viewBoard" | "playMove" | "resign">>,
	// `gamemaker/postBoard` and `postBoard` are two tools of one name.
	Expect<Equal<ChannelsTools, "readBoard" | "postBoard" | "sendDM" | "createGroup" | "addGroupMember" | "removeGroupMember" | "leaveGroup" | "listMyGroups" | "postGroup" | "readGroup" | "depositGroup" | "withdrawGroup" | "setTreasurer" | "defy" | "notify">>,
	// The state behind `ctx`: the custom state of channels (classes, maps), the schema's value for chess.
	Expect<Equal<CtxOf<typeof channels>["state"], ChannelsState>>,
	Expect<Equal<CtxOf<typeof chess>["state"]["scores"], Record<string, number>>>,
	Expect<Equal<CtxOf<typeof chess>["options"]["games"], number>>,
	Expect<Equal<Static<(typeof channels)["options"]>["noteAuthor"], string>>,
];
