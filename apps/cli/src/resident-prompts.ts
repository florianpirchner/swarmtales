// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The system prompts of the residents of a live run (a Director has its own, and the human none). They are built
 * after the kernel is created and before it starts (decision A86): the passes of the turn scheduler, each resident's
 * briefing, and, where the game names them in `prompt`, its frame and the character that a fact holds per resident
 * (`motives.prose`), which the kernel answers before it starts. With `prompt.city`, `prompt.persona` and `prompt.brief`
 * the prompt is the City order of the old `baseSystemPrompt` (decisions A89, A94): the persona per resident, given or
 * read from a fact, and the brief for the resident a fact names (`whispers.whisperer`). A resumed kernel answers from
 * its snapshot, so the prompts of a resumed run are the ones of its start.
 */
import { SwtError, type Kernel, type PromptLookup, type SwtIssue } from "@swarmtales/contracts";
import { systemPrompt, type PromptFacts, type PromptPersona } from "@swarmtales/models";
import { RESIDENT_KIND, type ResolvedGame } from "@swarmtales/sdk";
import { Type } from "typebox";
import { Check } from "typebox/value";

const Passes = Type.Object({ passes: Type.Integer({ minimum: 1, description: "Passes per tick" }) }, { description: "The option of the turn scheduler that the system prompt names" });
const Characters = Type.Record(Type.String({ description: "A resident id" }), Type.String({ description: "Its character" }), { description: "The value of the fact that `prompt.character` names" });
const Persona = Type.Object(
	{ temperament: Type.String({ description: "How it feels and reacts" }), values: Type.String({ description: "What it holds dear" }), voice: Type.String({ description: "How it speaks" }) },
	{ description: "A persona; other fields, such as its name, are not read" },
);
const Personas = Type.Record(Type.String({ description: "A resident id" }), Persona, { description: "The value of the fact that `prompt.persona` names" });
const Reader = Type.Union([Type.String({ description: "The id of the resident who reads the brief" }), Type.Null({ description: "Nobody reads it" })], {
	description: "The value of the fact that `prompt.brief.reader` names",
});

type Kernelish = Pick<Kernel, "fact">;
type GamePrompt = NonNullable<ResolvedGame["data"]["prompt"]>;

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

/**
 * `SWT-C033`: the fact that the game's `prompt.persona` or `prompt.brief.reader` names does not hold what the system
 * prompt reads from it.
 *
 * @param path - The field of `prompt` that names the fact.
 * @param fact - The key of the fact.
 * @returns The issue.
 *
 * @public
 */
export function promptFactWrong(path: "prompt.persona" | "prompt.brief.reader", fact: string): SwtIssue {
	return {
		code: "SWT-C033",
		summary: `the fact \`${fact}\` that \`${path}\` names does not hold what the system prompt reads`,
		where: { path },
		why: "The persona of a resident and the reader of the brief are parts of the system prompts, read from the facts before the run starts.",
		fix: "For `prompt.persona` name a fact whose value is a record of resident id to persona (temperament, values, voice); for `prompt.brief.reader` one whose value is a resident id or null, such as `whispers.whisperer`.",
	};
}

// The characters by resident id; none when the game names no fact.
function charactersOf(key: string | undefined, kernel: Kernelish): Readonly<Record<string, string>> {
	if (key === undefined) return {};
	const value = kernel.fact(key);
	if (!Check(Characters, value)) throw new SwtError(characterNoText(key));
	return value;
}

// The personas by resident id: given, or read from the fact the game names; none without `prompt.persona`.
function personasOf(persona: GamePrompt["persona"], kernel: Kernelish): Readonly<Record<string, PromptPersona>> {
	if (typeof persona !== "string") return persona ?? {};
	const value = kernel.fact(persona);
	if (!Check(Personas, value)) throw new SwtError(promptFactWrong("prompt.persona", persona));
	return Object.fromEntries(Object.entries(value).map(([id, { temperament, values, voice }]) => [id, { temperament, values, voice }]));
}

// The resident who reads the brief; none without `prompt.brief`.
function readerOf(brief: GamePrompt["brief"], kernel: Kernelish): string | null {
	if (brief === undefined) return null;
	const value = kernel.fact(brief.reader);
	if (!Check(Reader, value)) throw new SwtError(promptFactWrong("prompt.brief.reader", brief.reader));
	return value;
}

const own = <T>(record: Readonly<Record<string, T>>, id: string): T | undefined => (Object.hasOwn(record, id) ? record[id] : undefined);

// What the prompt of one resident says beyond its id, its passes and its briefing.
function toldOf(prompt: GamePrompt, kernel: Kernelish, residents: number): (id: string) => Partial<PromptFacts> {
	const { frame, city, brief } = prompt;
	const characters = charactersOf(prompt.character, kernel);
	const personas = personasOf(prompt.persona, kernel);
	const reader = readerOf(brief, kernel);
	const world = city === undefined ? {} : { city: { ...city, residents } };
	return (id) => {
		const character = own(characters, id);
		const persona = own(personas, id);
		return {
			...world,
			...(character === undefined ? {} : { character, ...(frame === undefined ? {} : { frame }) }),
			...(persona === undefined ? {} : { persona }),
			...(brief !== undefined && reader === id ? { brief: brief.text } : {}),
		};
	};
}

/**
 * The system prompt of every resident of a resolved game, by actor id. A resident without a character gets no frame
 * either, as in the old City; every resident plays in the City of `prompt.city`, with its persona where it has one.
 *
 * @param game - The resolved game.
 * @param texts - The lookup that renders the prompt files.
 * @param kernel - The kernel of the run, created and not yet started (or resumed).
 * @returns The system prompts.
 * @throws SwtError `SWT-R015` when a field of `prompt` names no fact, `SWT-C032` when the character's fact holds no text per resident, `SWT-C033` when the persona's fact holds no persona per resident or the brief reader's no resident id, and what the lookup throws.
 *
 * @public
 */
export function residentPrompts(game: ResolvedGame, texts: PromptLookup, kernel: Kernelish): Readonly<Record<string, string>> {
	const { actors, scheduler } = game.definition;
	const passes = Check(Passes, scheduler.options) ? scheduler.options.passes : 1;
	const residents = actors.filter((actor) => actor.kind === RESIDENT_KIND);
	const told = toldOf(game.data.prompt ?? {}, kernel, residents.length);
	return Object.fromEntries(
		residents.map((actor) => {
			const id = actor.id.slice(actor.kind.length + 1);
			return [actor.id, systemPrompt({ id, passes, briefing: game.briefings[actor.id] ?? "", ...told(id) }, texts)];
		}),
	);
}
