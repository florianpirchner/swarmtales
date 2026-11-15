// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { SwtError, type PromptLookup } from "@swarmtales/contracts";
import { describe, expect, it } from "vitest";
import { collectTexts, type TextSource } from "../src/game/texts.ts";

const REPLIES = { "kernel/replies/core/unknown-tool": "no such tool", "kernel/replies/core/not-granted": "not yours", "kernel/replies/core/locked": "locked now", "kernel/replies/core/steps": "too many steps" };

/** A stand-in lookup over `<owner>/<id>` to template; a missing file is the lookup's `SWT-P010`, a missing value its `SWT-P014`. */
function lookup(files: Readonly<Record<string, string>>): PromptLookup {
	return {
		render: (owner, id, variables, declared) => {
			const body = files[`${owner}/${id}`];
			if (body === undefined) throw new SwtError({ code: "SWT-P010", summary: `prompt "${id}" of ${owner}: no file`, why: "w", fix: "f" });
			if (body === "bug") throw new TypeError("a bug");
			const absent = declared.find((name) => !Object.hasOwn(variables, name));
			if (absent !== undefined) throw new SwtError({ code: "SWT-P014", summary: `missing variable "${absent}"`, where: { file: `${id}.md` }, why: "w", fix: "f" });
			return body.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(variables[name]));
		},
	};
}

const board: TextSource = {
	mechanic: {
		id: "board",
		head: {
			prompts: { "tools/move": [], rules: ["size", "line"] },
			tools: [{ name: "move", description: "tools/move" }, { name: "look", description: "Look at the board." }],
		},
	},
	path: "mechanics[1]",
};

describe("collectTexts", () => {
	it("collects every prompt, the inline descriptions and the kernel replies, a variable as its placeholder", () => {
		const { texts, replies, issues } = collectTexts([board], lookup({ ...REPLIES, "board/tools/move": "Play a move.", "board/rules": "A {{size}} board, {{line}} in a line." }));
		expect(issues).toEqual([]);
		expect(texts).toEqual({ ...REPLIES, "board/tools/look": "Look at the board.", "board/tools/move": "Play a move.", "board/rules": "A {{size}} board, {{line}} in a line." });
		expect(replies).toEqual({ TOOL_UNKNOWN: "no such tool", TOOL_NOT_GRANTED: "not yours", TOOL_LOCKED: "locked now", STEP_LIMIT: "too many steps" });
	});

	it("reports a prompt without a file as SWT-P003 at the mechanic's place, and a kernel reply without one", () => {
		const { texts, replies, issues } = collectTexts([board], lookup({ ...Object.fromEntries(Object.entries(REPLIES).filter(([key]) => !key.endsWith("steps"))), "board/rules": "Rules" }));
		expect(issues.map((issue) => [issue.code, issue.where?.path, issue.summary])).toEqual([
			["SWT-P003", "mechanics[1]", '"board" declares the prompt "tools/move" but has no text for it'],
			["SWT-P003", undefined, '"kernel" declares the prompt "replies/core/steps" but has no text for it'],
		]);
		expect(Object.keys(texts)).not.toContain("board/tools/move");
		expect(replies).not.toHaveProperty("STEP_LIMIT");
	});

	it("renders a tool description without values, so a variable in one is the lookup's own issue, unchanged", () => {
		const described: TextSource = { mechanic: { id: "board", head: { prompts: { rules: ["size"] }, tools: [{ name: "look", description: "rules" }] } }, path: "mechanics[0]" };
		const { issues } = collectTexts([described], lookup({ ...REPLIES, "board/rules": "A {{size}} board" }));
		expect(issues).toEqual([{ code: "SWT-P014", summary: 'missing variable "size"', where: { file: "rules.md" }, why: "w", fix: "f" }]);
	});

	it("passes on what is no SwtError", () => {
		expect(() => collectTexts([board], lookup({ ...REPLIES, "board/tools/move": "bug" }))).toThrow(TypeError);
	});
});
