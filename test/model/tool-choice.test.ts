import { describe, expect, it } from "vitest";
import { parseStartArgs, UsageError } from "../../apps/cli/src/args.ts";
import { createModelSource, ProviderRegistry, withRequestDefaults } from "../../packages/models/src/index.ts";

const limits = { maxOutputTokens: 1000, timeoutMs: 1000 };

function defaultsOf(provider: string, toolChoice: "required" | "auto" | "none" | undefined): Readonly<Record<string, unknown>> | undefined {
	const source = createModelSource({ provider }, { registry: new ProviderRegistry(), ...(toolChoice === undefined ? {} : { toolChoice }) });
	return source.bind("a", limits).requestDefaults;
}

describe("tool choice", () => {
	it("is merged into an OpenAI-compatible payload", () => {
		const defaults = defaultsOf("openrouter", "required");
		expect(defaults).toEqual({ tool_choice: "required" });
		expect(withRequestDefaults({ model: "m", tools: [] }, defaults)).toEqual({ model: "m", tools: [], tool_choice: "required" });
	});

	it("maps required to Anthropic's any", () => {
		expect(defaultsOf("anthropic", "required")).toEqual({ tool_choice: { type: "any" } });
		expect(defaultsOf("anthropic", "none")).toEqual({ tool_choice: { type: "none" } });
	});

	it("adds nothing without a choice", () => {
		expect(defaultsOf("openrouter", undefined)).toBeUndefined();
	});

	it("parses --tool-choice and refuses other values", () => {
		expect(parseStartArgs(["--tool-choice", "required"]).toolChoice).toBe("required");
		expect(() => parseStartArgs(["--tool-choice", "always"])).toThrow(UsageError);
	});
});
