/**
 * Tool descriptions with variables (wave 3.5, carve-decisions.md D-9): the mechanic picks the
 * prompt and its variables from its options; a variable may be another plain prompt, rendered
 * first (the old `showReceipt` text quoted `tools/showReceipt-receipt-plain` or `-quoted`). The
 * default lookup knows every mechanic's prompt folder.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { PromptLookup } from "@swarmtales/contracts";
import { createHost, defineCoreStory, defineMechanic, reply } from "@swarmtales/kernel";
import { mechanicPromptFolders } from "@swarmtales/prompts";

const Options = Type.Object({ quote: Type.Boolean({ description: "Whether the text is quoted." }) });

const shower = defineMechanic(
	{
		id: "shower",
		summary: "A tool whose description depends on an option.",
		options: Options,
		state: () => undefined,
		events: {},
		prompts: { "tools/show": ["what"], "tools/show-plain": [], "tools/show-quoted": [], "tools/hide": [] },
	},
	(kit) => ({
		tools: [
			kit.tool({
				name: "show",
				description: { prompt: "tools/show", variables: (options) => ({ what: { prompt: options.quote ? "tools/show-quoted" : "tools/show-plain" } }) },
				parameters: Type.Object({}),
				execute: () => reply("shown"),
			}),
			kit.tool({ name: "hide", description: "tools/hide", parameters: Type.Object({}), execute: () => reply("hidden") }),
		],
	}),
);

/** A lookup that renders `id[variables]` and records the declared variables it was given. */
function recording(seen: string[]): PromptLookup {
	return {
		render: (owner, id, variables, declared) => {
			seen.push(`${owner}:${id}:${declared.join(",")}`);
			const values = Object.entries(variables).map(([name, value]) => `${name}=${String(value)}`);
			return values.length === 0 ? id : `${id}[${values.join(";")}]`;
		},
	};
}

function specs(quote: boolean, prompts?: PromptLookup) {
	const story = defineCoreStory({ id: "described", seed: 1, minutes: 1, residents: 1, mechanics: [shower.with({ quote })], grants: { resident: ["show", "hide"] } });
	return createHost({ story, ...(prompts === undefined ? {} : { prompts }) }).toolSpecs("resident");
}

describe("a tool description with variables", () => {
	it("renders the prompt the options pick, with a nested prompt rendered first", () => {
		const seen: string[] = [];
		expect(specs(false, recording(seen)).map((spec) => spec.description)).toEqual(["tools/show[what=tools/show-plain]", "tools/hide"]);
		expect(seen).toEqual(["shower:tools/show-plain:", "shower:tools/show:what", "shower:tools/hide:"]);
		expect(specs(true, recording([])).map((spec) => spec.description)[0]).toBe("tools/show[what=tools/show-quoted]");
	});

	it("is the prompt id without a lookup", () => {
		expect(specs(true).map((spec) => spec.description)).toEqual(["tools/show", "tools/hide"]);
	});
});

describe("the default prompt lookup", () => {
	it("knows the prompt folder of every mechanic package that has one", () => {
		const folders = mechanicPromptFolders();
		expect(Object.keys(folders)).toEqual(expect.arrayContaining(["receipts", "progression", "channels"]));
		expect(folders.receipts).toMatch(/mechanics[/\\]receipts[/\\]prompts$/);
	});
});
