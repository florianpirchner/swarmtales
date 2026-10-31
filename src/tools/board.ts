import { Type } from "typebox";
import { MAX_BOARD_POST_LENGTH } from "../engine/board.ts";
import { render, text } from "../prompts/library.ts";
import { defineTool, fromError, marksSuffix, success } from "./tool.ts";

export const readBoard = defineTool({
	name: "readBoard",
	description: text("tools/readBoard"),
	parameters: Type.Object({
		afterSeq: Type.Optional(Type.Integer({ description: "Read posts after this city number", minimum: 0 })),
		limit: Type.Optional(Type.Integer({ description: "At most this many posts (max 50)", minimum: 1, maximum: 50 })),
	}),
	execute({ afterSeq, limit }, { self, world }) {
		const result = world.readBoard(self, afterSeq, limit ?? 50);
		const lines = result.posts.map((post) => `#${post.seq} ${post.author}: ${post.text}`);
		if (result.skipped > 0) lines.push(render("replies/board-hidden", { count: result.skipped }));
		return success(lines.length === 0 ? text("replies/board-none") : lines.join("\n"));
	},
});

export const postBoard = defineTool({
	name: "postBoard",
	description: text("tools/postBoard"),
	parameters: Type.Object({
		message: Type.String({ description: "Text", minLength: 1, maxLength: MAX_BOARD_POST_LENGTH }),
	}),
	execute({ message }, { self, world }) {
		const result = world.postBoard(self, message);
		if (!result.ok) return fromError(result);
		return success(`${render("replies/board-posted", { seq: result.value.post.seq })}${marksSuffix(result.value.marks)}`);
	},
});
