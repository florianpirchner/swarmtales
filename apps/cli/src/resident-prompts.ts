// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The system prompts of the residents of a live run (a Director has its own, and the human none). They are built
 * after the kernel is created and before it starts (decision A86): the passes of the turn scheduler, each resident's
 * briefing, and, where the game names them in `prompt`, its frame and the character that a fact holds per resident
 * (`motives.prose`), which the kernel answers before it starts. A resumed kernel answers from its snapshot, so the
 * prompts of a resumed run are the ones of its start.
 */
import { SwtError, type Kernel, type PromptLookup, type SwtIssue } from "@swarmtales/contracts";
import { systemPrompt } from "@swarmtales/models";
import { RESIDENT_KIND, type ResolvedGame } from "@swarmtales/sdk";
import { Type } from "typebox";
import { Check } from "typebox/value";

const Passes = Type.Object({ passes: Type.Integer({ minimum: 1, description: "Passes per tick" }) }, { description: "The option of the turn scheduler that the system prompt names" });
const Characters = Type.Record(Type.String({ description: "A resident id" }), Type.String({ description: "Its character" }), { description: "The value of the fact that `prompt.character` names" });

/**
 * `SWT-C032`: the fact that the game's `prompt.character` names does not hold a text per resident.
 *
 * @param fact - The key of the fact.
 * @returns The issue.
 *
 * @public
 */
export function characterNoText(fact: string): SwtIssue {
	return {
		code: "SWT-C032",
		summary: `the fact \`${fact}\` that \`prompt.character\` names does not hold a text per resident`,
		where: { path: "prompt.character" },
		why: "The character of a resident is a text of its system prompt, read from the fact by resident id before the run starts.",
		fix: "Name a fact whose value is a record of resident id to text, such as `motives.prose`.",
	};
}

// The characters by resident id; none when the game names no fact.
function charactersOf(game: ResolvedGame, kernel: Pick<Kernel, "fact">): Readonly<Record<string, string>> {
	const key = game.data.prompt?.character;
	if (key === undefined) return {};
	const value = kernel.fact(key);
	if (!Check(Characters, value)) throw new SwtError(characterNoText(key));
	return value;
}

/**
 * The system prompt of every resident of a resolved game, by actor id. A resident without a character gets no frame
 * either, as in the old City.
 *
 * @param game - The resolved game.
 * @param texts - The lookup that renders the prompt files.
 * @param kernel - The kernel of the run, created and not yet started (or resumed).
 * @returns The system prompts.
 * @throws SwtError `SWT-R015` when `prompt.character` names no fact, `SWT-C032` when its value is not a text per resident, and what the lookup throws.
 *
 * @public
 */
export function residentPrompts(game: ResolvedGame, texts: PromptLookup, kernel: Pick<Kernel, "fact">): Readonly<Record<string, string>> {
	const { actors, scheduler } = game.definition;
	const passes = Check(Passes, scheduler.options) ? scheduler.options.passes : 1;
	const frame = game.data.prompt?.frame;
	const characters = charactersOf(game, kernel);
	return Object.fromEntries(
		actors
			.filter((actor) => actor.kind === RESIDENT_KIND)
			.map((actor) => {
				const id = actor.id.slice(actor.kind.length + 1);
				const own = Object.hasOwn(characters, id) ? characters[id] : undefined;
				const told = own === undefined ? {} : { character: own, ...(frame === undefined ? {} : { frame }) };
				return [actor.id, systemPrompt({ id, passes, briefing: game.briefings[actor.id] ?? "", ...told }, texts)];
			}),
	);
}
