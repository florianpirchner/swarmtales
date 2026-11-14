// SPDX-License-Identifier: Apache-2.0
/**
 * `arrange` and `TurnsOptions`: the cases of the old `arrangeInputs` (carried from the old tests of the turn loop,
 * the hook order and the order within a kind), the `{ source }` entry, and a differential test against vectors
 * that the old function computed.
 */
import type { InputNote, OrderedNote } from "@swarmtales/contracts";
import { Check, Default } from "typebox/value";
import { describe, expect, it } from "vitest";
import { arrange } from "../src/turns/inputs.ts";
import { type InputEntry, TurnsOptions } from "../src/turns/options.ts";

const shown = (notes: readonly InputNote[]): readonly string[] => notes.map((note) => `${note.source}:${note.kind ?? "-"}:${note.text}`);

describe("arrange: the cases of the old arrangeInputs", () => {
	it("orders inputs by kind, joins joined kinds and keeps the rest in hook order", () => {
		const notes: readonly OrderedNote[] = [
			{ source: "talk", kind: "digest", text: "nothing unread" },
			{ source: "talk", kind: "status", text: "minute 0" },
			{ source: "talk", text: "plain" },
			{ source: "rank", kind: "status", text: "rank 1" },
		];
		const arranged = arrange(notes, [{ kind: "status", join: " · " }, { kind: "notice" }, { kind: "digest" }]);
		expect(shown(arranged)).toEqual(["talk+rank:status:minute 0 · rank 1", "talk:digest:nothing unread", "talk:-:plain"]);
	});

	it("sorts the parts of a joined line by order, not by hook order, and drops the sort key", () => {
		const part = (id: string, text: string, order?: number): readonly OrderedNote[] => [
			order === undefined ? { source: id, kind: "status", text } : { source: id, kind: "status", text, order },
			{ source: id, kind: "notice", text: `${id} notice`, order: order === undefined ? 0 : -order },
		];
		const notes = [...part("points", "12 points", 20), ...part("minute", "minute 1", 10), ...part("plain", "plain"), ...part("rank", "rank 2", 30)];
		const arranged = arrange(notes, [{ kind: "status", join: " · " }, { kind: "notice" }]);
		expect(arranged.map((note) => note.text)).toEqual(["plain · minute 1 · 12 points · rank 2", "rank notice", "points notice", "minute notice", "plain notice"]);
		expect(arranged.every((note) => !("order" in note))).toBe(true);
		expect(arranged[0]?.source).toBe("plain+minute+points+rank");
	});

	it("shows a listed kind before a kind listed later, whatever the hook order", () => {
		const notes: readonly OrderedNote[] = [{ source: "mail", kind: "dm", text: "a letter" }, { source: "counter", kind: "status", text: "0 delivered" }];
		expect(arrange(notes, [{ kind: "status", join: " · " }, { kind: "dm" }]).map((note) => note.text)).toEqual(["0 delivered", "a letter"]);
	});

	it("keeps the hook order without entries and gives a note without a kind no kind field", () => {
		const notes: readonly OrderedNote[] = [{ source: "b", text: "one", order: 5 }, { source: "a", kind: "x", text: "two", order: -5 }];
		expect(arrange(notes, [])).toStrictEqual([{ source: "b", text: "one" }, { source: "a", kind: "x", text: "two" }]);
	});
});

describe("arrange: the source entry", () => {
	const notes: readonly OrderedNote[] = [
		{ source: "grid", text: "the board" },
		{ source: "channel", kind: "status", text: "2 unread", order: 20 },
		{ source: "brain", text: "your notes" },
		{ source: "channel", text: "a message", order: 99 },
		{ source: "grid", kind: "status", text: "your move", order: 10 },
		{ source: "channel", kind: "dm", text: "a letter" },
		{ source: "consensus", text: "a vote is open" },
	];

	it("takes the lines of a plugin in hook order, at the entry's place, and leaves the rest behind", () => {
		const arranged = arrange(notes, [{ source: "channel" }, { source: "brain" }]);
		expect(shown(arranged)).toEqual(["channel:status:2 unread", "channel:-:a message", "channel:dm:a letter", "brain:-:your notes", "grid:-:the board", "grid:status:your move", "consensus:-:a vote is open"]);
		expect(arranged.every((note) => !("order" in note))).toBe(true);
	});

	it("leaves a line to the kind entry that takes it, also when that entry comes later in the list", () => {
		const entries: readonly InputEntry[] = [{ source: "channel" }, { kind: "status", join: " · " }, { source: "grid" }];
		expect(shown(arrange(notes, entries))).toEqual(["channel:-:a message", "channel:dm:a letter", "grid+channel:status:your move · 2 unread", "grid:-:the board", "brain:-:your notes", "consensus:-:a vote is open"]);
	});

	it("takes nothing for a plugin that gave no line", () => {
		expect(arrange(notes, [{ source: "absent" }])).toStrictEqual(arrange(notes, []));
	});
});

interface Vector {
	readonly notes: readonly OrderedNote[];
	readonly entries: readonly InputEntry[];
	readonly expected: readonly InputNote[];
}

/**
 * Computed by the old `arrangeInputs` (`packages/kernel/src/host/turns.ts` at `v0-final`) over seeded random
 * notes; the first four of every nine use `[{ kind: "context-reset" }]` alone. Recorded, not hand-written.
 */
const VECTORS: readonly Vector[] = [
	{ notes: [{ source: "grid", kind: "status", text: "t7", order: -10 }, { source: "consensus", kind: "context-reset", text: "t27", order: 10 }, { source: "channel", kind: "context-reset", text: "t40", order: -10 }, { source: "brain", text: "t36", order: 0 }, { source: "channel", text: "t15" }, { source: "channel", kind: "status", text: "t71" }, { source: "channel", kind: "status", text: "t22", order: -10 }], entries: [{ kind: "context-reset" }], expected: [{ source: "channel", kind: "context-reset", text: "t40" }, { source: "consensus", kind: "context-reset", text: "t27" }, { source: "grid", kind: "status", text: "t7" }, { source: "brain", text: "t36" }, { source: "channel", text: "t15" }, { source: "channel", kind: "status", text: "t71" }, { source: "channel", kind: "status", text: "t22" }] },
	{ notes: [{ source: "channel", kind: "status", text: "t35", order: -10 }, { source: "grid", text: "t17" }, { source: "consensus", kind: "dm", text: "t57", order: 20 }, { source: "brain", kind: "status", text: "t61", order: 0 }, { source: "brain", kind: "status", text: "t88", order: 20 }, { source: "grid", kind: "notice", text: "t66" }, { source: "brain", kind: "status", text: "t13", order: 0 }], entries: [{ kind: "context-reset" }], expected: [{ source: "channel", kind: "status", text: "t35" }, { source: "grid", text: "t17" }, { source: "consensus", kind: "dm", text: "t57" }, { source: "brain", kind: "status", text: "t61" }, { source: "brain", kind: "status", text: "t88" }, { source: "grid", kind: "notice", text: "t66" }, { source: "brain", kind: "status", text: "t13" }] },
	{ notes: [{ source: "channel", kind: "status", text: "t70", order: 20 }, { source: "consensus", text: "t56", order: -10 }, { source: "consensus", kind: "status", text: "t26", order: 0 }, { source: "consensus", kind: "context-reset", text: "t81", order: 10 }, { source: "grid", kind: "notice", text: "t38", order: 20 }, { source: "channel", kind: "notice", text: "t54", order: 0 }, { source: "brain", kind: "dm", text: "t62", order: 0 }], entries: [{ kind: "context-reset" }], expected: [{ source: "consensus", kind: "context-reset", text: "t81" }, { source: "channel", kind: "status", text: "t70" }, { source: "consensus", text: "t56" }, { source: "consensus", kind: "status", text: "t26" }, { source: "grid", kind: "notice", text: "t38" }, { source: "channel", kind: "notice", text: "t54" }, { source: "brain", kind: "dm", text: "t62" }] },
	{ notes: [{ source: "channel", kind: "dm", text: "t74", order: -10 }, { source: "grid", kind: "context-reset", text: "t75", order: 20 }, { source: "grid", kind: "notice", text: "t86", order: 10 }, { source: "channel", kind: "notice", text: "t71", order: 10 }], entries: [{ kind: "context-reset" }], expected: [{ source: "grid", kind: "context-reset", text: "t75" }, { source: "channel", kind: "dm", text: "t74" }, { source: "grid", kind: "notice", text: "t86" }, { source: "channel", kind: "notice", text: "t71" }] },
	{ notes: [], entries: [], expected: [] },
	{ notes: [{ source: "grid", kind: "dm", text: "t13" }, { source: "grid", kind: "dm", text: "t42", order: 0 }, { source: "brain", text: "t89", order: 20 }, { source: "channel", text: "t74", order: -10 }, { source: "channel", kind: "dm", text: "t10", order: 0 }, { source: "channel", text: "t35", order: 0 }, { source: "grid", kind: "status", text: "t32" }, { source: "channel", kind: "status", text: "t31", order: 20 }], entries: [{ kind: "status", join: " · " }, { kind: "notice" }], expected: [{ source: "grid+channel", kind: "status", text: "t32 · t31" }, { source: "grid", kind: "dm", text: "t13" }, { source: "grid", kind: "dm", text: "t42" }, { source: "brain", text: "t89" }, { source: "channel", text: "t74" }, { source: "channel", kind: "dm", text: "t10" }, { source: "channel", text: "t35" }] },
	{ notes: [{ source: "channel", text: "t20", order: 10 }, { source: "brain", kind: "status", text: "t67", order: -10 }, { source: "consensus", kind: "dm", text: "t5" }], entries: [{ kind: "notice" }, { kind: "status", join: "\n" }, { kind: "missing", join: ", " }], expected: [{ source: "brain", kind: "status", text: "t67" }, { source: "channel", text: "t20" }, { source: "consensus", kind: "dm", text: "t5" }] },
	{ notes: [{ source: "brain", kind: "status", text: "t37", order: 10 }, { source: "brain", text: "t3" }, { source: "consensus", text: "t12" }, { source: "grid", kind: "notice", text: "t78", order: 20 }, { source: "consensus", kind: "context-reset", text: "t25" }, { source: "brain", kind: "dm", text: "t63", order: 0 }, { source: "channel", kind: "context-reset", text: "t38", order: 10 }, { source: "consensus", kind: "dm", text: "t16" }], entries: [{ kind: "dm" }, { kind: "context-reset" }, { kind: "status", join: "" }], expected: [{ source: "brain", kind: "dm", text: "t63" }, { source: "consensus", kind: "dm", text: "t16" }, { source: "consensus", kind: "context-reset", text: "t25" }, { source: "channel", kind: "context-reset", text: "t38" }, { source: "brain", kind: "status", text: "t37" }, { source: "brain", text: "t3" }, { source: "consensus", text: "t12" }, { source: "grid", kind: "notice", text: "t78" }] },
	{ notes: [{ source: "consensus", kind: "status", text: "t68", order: 0 }, { source: "channel", kind: "dm", text: "t87", order: -10 }, { source: "grid", kind: "status", text: "t60", order: 20 }], entries: [{ kind: "status" }, { kind: "status", join: "+" }], expected: [{ source: "consensus", kind: "status", text: "t68" }, { source: "grid", kind: "status", text: "t60" }, { source: "consensus+grid", kind: "status", text: "t68+t60" }, { source: "channel", kind: "dm", text: "t87" }] },
	{ notes: [{ source: "grid", kind: "status", text: "t67" }, { source: "grid", kind: "context-reset", text: "t30", order: 20 }, { source: "consensus", kind: "dm", text: "t81", order: -10 }, { source: "brain", kind: "notice", text: "t9", order: 10 }, { source: "grid", kind: "context-reset", text: "t30", order: 10 }], entries: [{ kind: "context-reset" }], expected: [{ source: "grid", kind: "context-reset", text: "t30" }, { source: "grid", kind: "context-reset", text: "t30" }, { source: "grid", kind: "status", text: "t67" }, { source: "consensus", kind: "dm", text: "t81" }, { source: "brain", kind: "notice", text: "t9" }] },
	{ notes: [{ source: "channel", kind: "status", text: "t5", order: -10 }, { source: "brain", kind: "status", text: "t10", order: -10 }, { source: "brain", kind: "context-reset", text: "t37", order: 10 }, { source: "channel", text: "t24" }, { source: "grid", kind: "context-reset", text: "t54", order: 0 }, { source: "consensus", kind: "status", text: "t21", order: 0 }, { source: "channel", kind: "notice", text: "t2", order: -10 }, { source: "channel", kind: "context-reset", text: "t9", order: -10 }], entries: [{ kind: "context-reset" }], expected: [{ source: "channel", kind: "context-reset", text: "t9" }, { source: "grid", kind: "context-reset", text: "t54" }, { source: "brain", kind: "context-reset", text: "t37" }, { source: "channel", kind: "status", text: "t5" }, { source: "brain", kind: "status", text: "t10" }, { source: "channel", text: "t24" }, { source: "consensus", kind: "status", text: "t21" }, { source: "channel", kind: "notice", text: "t2" }] },
	{ notes: [{ source: "grid", kind: "dm", text: "t6", order: 10 }, { source: "consensus", kind: "dm", text: "t15", order: 0 }, { source: "grid", text: "t78", order: -10 }, { source: "channel", kind: "context-reset", text: "t34", order: -10 }, { source: "channel", kind: "notice", text: "t44" }, { source: "channel", kind: "dm", text: "t84", order: 10 }], entries: [{ kind: "context-reset" }], expected: [{ source: "channel", kind: "context-reset", text: "t34" }, { source: "grid", kind: "dm", text: "t6" }, { source: "consensus", kind: "dm", text: "t15" }, { source: "grid", text: "t78" }, { source: "channel", kind: "notice", text: "t44" }, { source: "channel", kind: "dm", text: "t84" }] },
	{ notes: [{ source: "consensus", kind: "notice", text: "t45", order: 10 }, { source: "grid", kind: "notice", text: "t3", order: 0 }, { source: "brain", kind: "notice", text: "t46", order: 20 }, { source: "grid", kind: "status", text: "t32", order: 10 }], entries: [{ kind: "context-reset" }], expected: [{ source: "consensus", kind: "notice", text: "t45" }, { source: "grid", kind: "notice", text: "t3" }, { source: "brain", kind: "notice", text: "t46" }, { source: "grid", kind: "status", text: "t32" }] },
	{ notes: [{ source: "brain", kind: "context-reset", text: "t56", order: 10 }, { source: "channel", kind: "notice", text: "t73", order: -10 }, { source: "grid", kind: "dm", text: "t72", order: 10 }, { source: "grid", kind: "notice", text: "t18" }], entries: [], expected: [{ source: "brain", kind: "context-reset", text: "t56" }, { source: "channel", kind: "notice", text: "t73" }, { source: "grid", kind: "dm", text: "t72" }, { source: "grid", kind: "notice", text: "t18" }] },
	{ notes: [{ source: "consensus", kind: "notice", text: "t12", order: 10 }, { source: "channel", kind: "context-reset", text: "t36", order: 10 }, { source: "grid", kind: "notice", text: "t46", order: 20 }, { source: "brain", kind: "status", text: "t24" }, { source: "consensus", text: "t44" }, { source: "consensus", kind: "context-reset", text: "t79", order: 10 }], entries: [{ kind: "status", join: " · " }, { kind: "notice" }], expected: [{ source: "brain", kind: "status", text: "t24" }, { source: "consensus", kind: "notice", text: "t12" }, { source: "grid", kind: "notice", text: "t46" }, { source: "channel", kind: "context-reset", text: "t36" }, { source: "consensus", text: "t44" }, { source: "consensus", kind: "context-reset", text: "t79" }] },
	{ notes: [{ source: "grid", kind: "context-reset", text: "t47" }, { source: "grid", kind: "context-reset", text: "t78", order: -10 }, { source: "grid", kind: "status", text: "t54" }], entries: [{ kind: "notice" }, { kind: "status", join: "\n" }, { kind: "missing", join: ", " }], expected: [{ source: "grid", kind: "status", text: "t54" }, { source: "grid", kind: "context-reset", text: "t47" }, { source: "grid", kind: "context-reset", text: "t78" }] },
	{ notes: [{ source: "brain", kind: "context-reset", text: "t75", order: 10 }, { source: "grid", kind: "status", text: "t58", order: 20 }, { source: "consensus", kind: "status", text: "t70", order: 20 }, { source: "brain", text: "t18", order: 20 }, { source: "consensus", kind: "context-reset", text: "t62", order: 20 }, { source: "grid", kind: "status", text: "t22", order: -10 }, { source: "channel", kind: "dm", text: "t73", order: -10 }], entries: [{ kind: "dm" }, { kind: "context-reset" }, { kind: "status", join: "" }], expected: [{ source: "channel", kind: "dm", text: "t73" }, { source: "brain", kind: "context-reset", text: "t75" }, { source: "consensus", kind: "context-reset", text: "t62" }, { source: "grid+consensus", kind: "status", text: "t22t58t70" }, { source: "brain", text: "t18" }] },
	{ notes: [{ source: "channel", text: "t57" }, { source: "consensus", kind: "dm", text: "t36" }, { source: "consensus", kind: "status", text: "t19", order: 0 }, { source: "consensus", kind: "context-reset", text: "t63" }, { source: "grid", kind: "notice", text: "t15", order: 0 }, { source: "brain", kind: "notice", text: "t84", order: 20 }, { source: "grid", kind: "dm", text: "t44", order: 10 }, { source: "consensus", kind: "notice", text: "t3", order: -10 }], entries: [{ kind: "status" }, { kind: "status", join: "+" }], expected: [{ source: "consensus", kind: "status", text: "t19" }, { source: "consensus", kind: "status", text: "t19" }, { source: "channel", text: "t57" }, { source: "consensus", kind: "dm", text: "t36" }, { source: "consensus", kind: "context-reset", text: "t63" }, { source: "grid", kind: "notice", text: "t15" }, { source: "brain", kind: "notice", text: "t84" }, { source: "grid", kind: "dm", text: "t44" }, { source: "consensus", kind: "notice", text: "t3" }] },
	{ notes: [{ source: "consensus", kind: "status", text: "t15", order: -10 }, { source: "consensus", kind: "dm", text: "t44", order: 10 }, { source: "grid", kind: "status", text: "t22", order: 20 }, { source: "channel", kind: "context-reset", text: "t8", order: 20 }, { source: "consensus", kind: "status", text: "t40", order: 0 }, { source: "consensus", text: "t39", order: 0 }], entries: [{ kind: "context-reset" }], expected: [{ source: "channel", kind: "context-reset", text: "t8" }, { source: "consensus", kind: "status", text: "t15" }, { source: "consensus", kind: "dm", text: "t44" }, { source: "grid", kind: "status", text: "t22" }, { source: "consensus", kind: "status", text: "t40" }, { source: "consensus", text: "t39" }] },
	{ notes: [{ source: "channel", kind: "status", text: "t64" }, { source: "consensus", kind: "dm", text: "t51", order: 20 }, { source: "channel", kind: "dm", text: "t80" }], entries: [{ kind: "context-reset" }], expected: [{ source: "channel", kind: "status", text: "t64" }, { source: "consensus", kind: "dm", text: "t51" }, { source: "channel", kind: "dm", text: "t80" }] },
	{ notes: [{ source: "brain", kind: "notice", text: "t33", order: 10 }, { source: "channel", kind: "dm", text: "t20", order: 10 }, { source: "brain", kind: "status", text: "t69", order: 10 }], entries: [{ kind: "context-reset" }], expected: [{ source: "brain", kind: "notice", text: "t33" }, { source: "channel", kind: "dm", text: "t20" }, { source: "brain", kind: "status", text: "t69" }] },
	{ notes: [{ source: "consensus", kind: "dm", text: "t51", order: 10 }, { source: "channel", text: "t31", order: 0 }, { source: "brain", text: "t62", order: 0 }, { source: "brain", kind: "context-reset", text: "t59" }, { source: "consensus", kind: "notice", text: "t26", order: -10 }], entries: [{ kind: "context-reset" }], expected: [{ source: "brain", kind: "context-reset", text: "t59" }, { source: "consensus", kind: "dm", text: "t51" }, { source: "channel", text: "t31" }, { source: "brain", text: "t62" }, { source: "consensus", kind: "notice", text: "t26" }] },
	{ notes: [{ source: "channel", kind: "context-reset", text: "t77", order: 10 }, { source: "brain", text: "t16" }, { source: "consensus", kind: "status", text: "t33" }, { source: "grid", text: "t73", order: 10 }], entries: [], expected: [{ source: "channel", kind: "context-reset", text: "t77" }, { source: "brain", text: "t16" }, { source: "consensus", kind: "status", text: "t33" }, { source: "grid", text: "t73" }] },
	{ notes: [{ source: "grid", kind: "context-reset", text: "t71", order: -10 }, { source: "channel", kind: "status", text: "t37", order: 10 }, { source: "consensus", kind: "status", text: "t32", order: 10 }, { source: "consensus", text: "t84", order: -10 }, { source: "consensus", text: "t29", order: -10 }, { source: "grid", text: "t78" }], entries: [{ kind: "status", join: " · " }, { kind: "notice" }], expected: [{ source: "channel+consensus", kind: "status", text: "t37 · t32" }, { source: "grid", kind: "context-reset", text: "t71" }, { source: "consensus", text: "t84" }, { source: "consensus", text: "t29" }, { source: "grid", text: "t78" }] },
	{ notes: [{ source: "brain", kind: "notice", text: "t53", order: 10 }, { source: "consensus", kind: "status", text: "t0", order: 20 }, { source: "brain", text: "t18", order: 10 }, { source: "grid", text: "t13", order: -10 }, { source: "brain", text: "t14" }, { source: "consensus", kind: "dm", text: "t37" }, { source: "channel", text: "t48" }], entries: [{ kind: "notice" }, { kind: "status", join: "\n" }, { kind: "missing", join: ", " }], expected: [{ source: "brain", kind: "notice", text: "t53" }, { source: "consensus", kind: "status", text: "t0" }, { source: "brain", text: "t18" }, { source: "grid", text: "t13" }, { source: "brain", text: "t14" }, { source: "consensus", kind: "dm", text: "t37" }, { source: "channel", text: "t48" }] },
	{ notes: [{ source: "channel", text: "t24", order: 20 }, { source: "grid", kind: "notice", text: "t87", order: 0 }, { source: "grid", kind: "context-reset", text: "t39", order: 0 }, { source: "brain", kind: "dm", text: "t29", order: -10 }, { source: "channel", text: "t13", order: 20 }, { source: "grid", kind: "dm", text: "t81", order: -10 }, { source: "channel", kind: "context-reset", text: "t89", order: -10 }, { source: "brain", kind: "notice", text: "t81", order: 0 }], entries: [{ kind: "dm" }, { kind: "context-reset" }, { kind: "status", join: "" }], expected: [{ source: "brain", kind: "dm", text: "t29" }, { source: "grid", kind: "dm", text: "t81" }, { source: "channel", kind: "context-reset", text: "t89" }, { source: "grid", kind: "context-reset", text: "t39" }, { source: "channel", text: "t24" }, { source: "grid", kind: "notice", text: "t87" }, { source: "channel", text: "t13" }, { source: "brain", kind: "notice", text: "t81" }] },
	{ notes: [{ source: "brain", kind: "status", text: "t76", order: 20 }, { source: "brain", kind: "status", text: "t54", order: 0 }, { source: "consensus", kind: "dm", text: "t62" }, { source: "grid", kind: "context-reset", text: "t16", order: 20 }, { source: "consensus", kind: "dm", text: "t68", order: 20 }, { source: "brain", text: "t58" }, { source: "consensus", text: "t56", order: 20 }, { source: "channel", kind: "context-reset", text: "t71", order: 0 }], entries: [{ kind: "status" }, { kind: "status", join: "+" }], expected: [{ source: "brain", kind: "status", text: "t54" }, { source: "brain", kind: "status", text: "t76" }, { source: "brain", kind: "status", text: "t54+t76" }, { source: "consensus", kind: "dm", text: "t62" }, { source: "grid", kind: "context-reset", text: "t16" }, { source: "consensus", kind: "dm", text: "t68" }, { source: "brain", text: "t58" }, { source: "consensus", text: "t56" }, { source: "channel", kind: "context-reset", text: "t71" }] },
];

describe("arrange: differential against the old arrangeInputs", () => {
	it("has the recorded vectors, with the context-reset list among them", () => {
		expect(VECTORS).toHaveLength(27);
		expect(VECTORS.filter((vector) => JSON.stringify(vector.entries) === JSON.stringify([{ kind: "context-reset" }]))).toHaveLength(12);
	});

	it.each(VECTORS.map((vector, index) => [index, vector] as const))("gives the old output for vector %i", (_index, vector) => {
		expect(arrange(vector.notes, vector.entries)).toStrictEqual(vector.expected);
	});
});

describe("TurnsOptions", () => {
	it("fills every default", () => {
		const filled: unknown = Default(TurnsOptions, {});
		expect(filled).toStrictEqual({ passes: 1, blockSize: 1, activation: "always", order: "seeded", kinds: ["resident"], inputs: [] });
		expect(Check(TurnsOptions, filled)).toBe(true);
	});

	it("accepts the three activation values, both orders and both entry forms", () => {
		const base = { passes: 2, blockSize: 3, kinds: ["resident"], inputs: [{ kind: "status", join: " · " }, { kind: "context-reset" }, { source: "@swarmtales/team-channel" }] };
		for (const activation of ["always", "onNews", "toAct"]) for (const order of ["seeded", "roster"]) expect(Check(TurnsOptions, { ...base, activation, order })).toBe(true);
	});

	it("refuses a bad value", () => {
		const good = { passes: 1, blockSize: 1, activation: "always", order: "seeded", kinds: ["resident"], inputs: [] };
		expect(Check(TurnsOptions, good)).toBe(true);
		for (const bad of [{ passes: 0 }, { passes: 1.5 }, { blockSize: 0 }, { activation: "sometimes" }, { order: "reverse" }, { kinds: [1] }, { inputs: [{ join: "," }] }, { inputs: [{ kind: 1 }] }]) {
			expect(Check(TurnsOptions, { ...good, ...bad })).toBe(false);
		}
	});
});
