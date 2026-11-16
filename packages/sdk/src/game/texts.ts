// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Step 8 of game resolution: every text a model may read is found before the run starts. The step renders each
 * prompt a mechanic declares and the kernel's four reply texts through the prompt lookup, and collects the tool
 * descriptions that are written in the head itself. A text that no folder has is `SWT-P003`.
 */
import { STEP_LIMIT, SwtError, TOOL_LOCKED, TOOL_NOT_GRANTED, TOOL_UNKNOWN, type PromptLookup, type SwtIssue } from "@swarmtales/contracts";
import { promptWithoutText } from "../errors.ts";

/** The owner the kernel's reply texts are looked up under. */
const KERNEL = "kernel";

/** Kernel refusal code to the prompt id of its reply text. */
const REPLIES: Readonly<Record<string, string>> = {
	[TOOL_UNKNOWN]: "replies/core/unknown-tool",
	[TOOL_NOT_GRANTED]: "replies/core/not-granted",
	[TOOL_LOCKED]: "replies/core/locked",
	[STEP_LIMIT]: "replies/core/steps",
};

/**
 * A mechanic of the game as step 8 reads it: the prompts and the tools of its head, and its place in the game.
 *
 * @internal
 */
export interface TextSource {
	/** The mechanic: its id and, from its head, the declared prompts and the tools with their descriptions. */
	readonly mechanic: {
		readonly id: string;
		readonly head: { readonly prompts: Readonly<Record<string, readonly string[]>>; readonly tools: readonly { readonly name: string; readonly description: string }[] };
	};
	/** The data path of its use in the game, for example `mechanics[1]`. */
	readonly path: string;
}

/**
 * What step 8 gives.
 *
 * @internal
 */
export interface CollectedTexts {
	/** Every text by key: `<mechanic id>/<prompt id>`, `<mechanic id>/tools/<tool>` for a description written in the head, `kernel/<prompt id>` for a kernel reply. */
	readonly texts: Readonly<Record<string, string>>;
	/** Kernel refusal code to its reply text, for `KernelDefinition.replies`. */
	readonly replies: Readonly<Record<string, string>>;
	/** One issue per text that could not be rendered. */
	readonly issues: readonly SwtIssue[];
}

// One prompt, rendered; a missing file (the lookup's SWT-P010) becomes SWT-P003 at the mechanic's place in the game.
function rendered(prompts: PromptLookup, owner: string, id: string, variables: readonly string[], path?: string, bare = false): { readonly text?: string; readonly issues: readonly SwtIssue[] } {
	try {
		// A variable keeps its placeholder: the text is the template a model reads with the values of a moment.
		// A tool description is rendered without values, as the kit does at load, so a variable in one is reported here.
		return { text: prompts.render(owner, id, bare ? {} : Object.fromEntries(variables.map((name) => [name, `{{${name}}}`])), variables), issues: [] };
	} catch (error) {
		if (!(error instanceof SwtError)) throw error;
		if (error.code !== "SWT-P010") return { issues: error.issues };
		const missing = promptWithoutText({ owner, prompt: id, lookedIn: [] });
		return { issues: [path === undefined ? missing : { ...missing, where: { ...missing.where, path } }] };
	}
}

/**
 * Collects every text of a game: the declared prompts of each mechanic, the tool descriptions and the kernel's
 * reply texts. A tool description that equals a declared prompt id is that prompt, else it is the text itself. A
 * prompt with variables is rendered once with `{{name}}` for each, so its text is its template.
 *
 * @param mechanics - The mechanics of the game, in load order, each with its data path.
 * @param prompts - The lookup that finds and renders a prompt file.
 * @returns The texts by key, the kernel replies by refusal code, and the issues: `SWT-P003` for a prompt without a
 * file, and whatever else the lookup reports (`SWT-P011` to `SWT-P014`) unchanged.
 * @throws Whatever the lookup throws that is no `SwtError`.
 *
 * @internal
 */
export function collectTexts(mechanics: readonly TextSource[], prompts: PromptLookup): CollectedTexts {
	const texts: Record<string, string> = {};
	const replies: Record<string, string> = {};
	const issues: SwtIssue[] = [];
	for (const { mechanic, path } of mechanics) {
		for (const tool of mechanic.head.tools) {
			if (!Object.hasOwn(mechanic.head.prompts, tool.description)) texts[`${mechanic.id}/tools/${tool.name}`] = tool.description;
		}
		for (const [id, variables] of Object.entries(mechanic.head.prompts)) {
			const result = rendered(prompts, mechanic.id, id, variables, path, mechanic.head.tools.some((tool) => tool.description === id));
			if (result.text !== undefined) texts[`${mechanic.id}/${id}`] = result.text;
			issues.push(...result.issues);
		}
	}
	for (const [code, id] of Object.entries(REPLIES)) {
		const result = rendered(prompts, KERNEL, id, []);
		if (result.text !== undefined) {
			texts[`${KERNEL}/${id}`] = result.text;
			replies[code] = result.text;
		}
		issues.push(...result.issues);
	}
	return { texts, replies, issues };
}
