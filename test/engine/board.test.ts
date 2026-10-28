import { describe, expect, it } from "vitest";
import { Board } from "../../src/engine/board.ts";

const texts = (posts: readonly { readonly text: string }[]) => posts.map((post) => post.text);

describe("Board", () => {
	it("returns each post once per reader", () => {
		const board = new Board();
		board.post("A01", "a1", 0);
		expect(texts(board.takeUnread("A02").posts)).toEqual(["a1"]);
		expect(board.takeUnread("A02").posts).toEqual([]);
		board.post("A01", "a2", 1);
		expect(texts(board.takeUnread("A02").posts)).toEqual(["a2"]);
	});

	it("tracks readers independently and never returns own posts", () => {
		const board = new Board();
		board.post("A01", "a1", 0);
		board.post("A02", "b1", 0);
		board.takeUnread("A02");
		expect(texts(board.takeUnread("A03").posts)).toEqual(["a1", "b1"]);
		expect(texts(board.takeUnread("A01").posts)).toEqual(["b1"]);
	});

	it("hides system posts but counts them", () => {
		const board = new Board();
		board.post("CITY", "A01 reached level 2.", 0, "system");
		board.post("COURIER", "The city watches who shares.", 0, "city");
		board.post("A01", "my fragment", 0);
		const result = board.takeUnread("A02");
		expect(texts(result.posts)).toEqual(["The city watches who shares.", "my fragment"]);
		expect(result.skipped).toBe(1);
		expect(board.unreadCount("A02")).toBe(0);
	});

	it("counts only player posts as novelty", () => {
		const board = new Board();
		board.post("CITY", "status", 0, "system");
		board.post("COURIER", "line", 0, "city");
		expect(board.lastPlayerSeq()).toBe(0);
		board.post("A01", "fragment", 0);
		expect(board.lastPlayerSeq()).toBe(3);
	});

	it("does not mark skipped posts as read on a targeted read", () => {
		const board = new Board();
		board.post("A01", "first", 0);
		board.post("A01", "second", 0);
		expect(texts(board.readFrom("A02", 1, 50).posts)).toEqual(["second"]);
		expect(board.unreadCount("A02")).toBe(2);
		expect(texts(board.readFrom("A02", 0, 1).posts)).toEqual(["first"]);
		expect(board.unreadCount("A02")).toBe(1);
	});
});
