import { Type } from "typebox";
import { MAX_BOARD_POST_LENGTH } from "../engine/board.ts";
import { defineTool, fromError, marksSuffix, success } from "./tool.ts";

export const readBoard = defineTool({
	name: "readBoard",
	description:
		"Reads new public board posts since your last read, each with its city number (#N). With afterSeq you read after a number (0 = everything).",
	parameters: Type.Object({
		afterSeq: Type.Optional(Type.Integer({ description: "Read posts after this city number", minimum: 0 })),
		limit: Type.Optional(Type.Integer({ description: "At most this many posts (max 50)", minimum: 1, maximum: 50 })),
	}),
	execute({ afterSeq, limit }, { self, world }) {
		const result = world.readBoard(self, afterSeq, limit ?? 50);
		const lines = result.posts.map((post) => `#${post.seq} ${post.author}: ${post.text}`);
		if (result.skipped > 0) lines.push(`(${result.skipped} status posts hidden)`);
		return success(lines.length === 0 ? "no new posts" : lines.join("\n"));
	},
});

export const postBoard = defineTool({
	name: "postBoard",
	description: "Publishes an immutable post on the public board. Everyone can read it.",
	parameters: Type.Object({
		message: Type.String({ description: "Text", minLength: 1, maxLength: MAX_BOARD_POST_LENGTH }),
	}),
	execute({ message }, { self, world }) {
		const result = world.postBoard(self, message);
		if (!result.ok) return fromError(result);
		return success(`posted · #${result.value.post.seq}${marksSuffix(result.value.marks)}`);
	},
});
