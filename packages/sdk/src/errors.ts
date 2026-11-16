// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The error catalogue of the sdk: every G (game), M (mechanic) and P (texts) code of the milestones M1 and M2, each as a
 * function that returns the issue. A step of game resolution collects issues and resolution throws them as one
 * `SwtError`; a wrapper inside a run throws `new SwtError(issue)`. A code is never reused or renumbered.
 */
import { closest, TOOL_NAME_PATTERN, type SwtIssue } from "@swarmtales/contracts";

/**
 * Every code of this catalogue with the case that raises it; the source of the reference page.
 *
 * @internal
 */
export const SDK_ERRORS = {
	"SWT-G001": "the game does not match schema version 1",
	"SWT-G002": "`schema` is not 1",
	"SWT-G003": "`directors` is not empty before milestone M3 (no longer raised: a game may have Directors)",
	"SWT-G010": "a resident id is doubled or malformed",
	"SWT-G011": "a team or a role names an id that is not a resident",
	"SWT-G012": "a tool is granted or locked but not defined",
	"SWT-G013": "two tools of one grant share a shown name",
	"SWT-G014": "a shown tool name does not match the pattern",
	"SWT-G015": "a mechanic stages a tool that the game does not grant to `script`, or the grant `script` holds a tool with a review",
	"SWT-G020": "an option does not match its schema",
	"SWT-G021": "a mechanic is listed twice",
	"SWT-G022": "a data game names a mechanic that is not installed",
	"SWT-G030": "a required service has no provider",
	"SWT-G031": "a service has two providers",
	"SWT-G032": "`requires` form a cycle",
	"SWT-G041": "an override names no param of the game, or its value has the wrong type",
	"SWT-D001": "a Director's trigger names an event that no mechanic of the game declares",
	"SWT-D002": "the name of a Director is taken by another Director or by a grant, or its `use` names no definition",
	"SWT-D003": "the game has a Director and its scheduler activates no actor of kind `director`",
	"SWT-D004": "a review of a mechanic names an answerer that no Director of the game answers",
	"SWT-M010": "an event type is reserved by the kernel or declared twice",
	"SWT-M011": "the head's `package` is not the package's name",
	"SWT-M012": "the body of a mechanic does not fit its head",
	"SWT-M013": "the `options` schema of a mechanic is no object schema",
	"SWT-M014": "a mechanic keeps state that cannot be started or saved",
	"SWT-M021": "an emitted payload does not match its schema",
	"SWT-M022": "a service input or output does not match its schema",
	"SWT-M023": "the value of a fact does not match its schema",
	"SWT-M024": "a snapshot slice cannot be saved or loaded",
	"SWT-M025": "a fact or a run limit calls a command of a service",
	"SWT-P003": "a declared prompt has no text",
} as const;

/**
 * A code of the sdk's catalogue.
 *
 * @internal
 */
export type SdkErrorCode = keyof typeof SDK_ERRORS;

/**
 * One mismatch between a value and a schema, as a step reports it.
 *
 * @internal
 */
export interface Mismatch {
	/** The data path of the place in the game, for example `mechanics[1].options.size`; left out inside a run. */
	readonly path?: string;
	/** What is wrong there, for example `must be an integer from 2 to 10, got "3x3"`. */
	readonly message: string;
}

const quoted = (names: readonly string[]): string => (names.length === 0 ? "none" : names.map((name) => `"${name}"`).join(", "));
const meant = (name: string, known: readonly string[]): string => {
	const near = closest(name, known);
	return near === undefined ? "" : `did you mean "${near}"? Or `;
};
// The place and the fault of a mismatch as one text; a mismatch of the value itself has no path.
const found = (path: string, message: string): string => (path === "" ? message : `${path} ${message}`);
interface Place {
	readonly file?: string | undefined;
	readonly path?: string | undefined;
	readonly package?: string | undefined;
}
function issue(code: SdkErrorCode, summary: string, why: string, fix: string, place: Place = {}, details?: SwtIssue["details"]): SwtIssue {
	const where = {
		...(place.file === undefined ? {} : { file: place.file }),
		...(place.path === undefined || place.path === "" ? {} : { path: place.path }),
		...(place.package === undefined ? {} : { package: place.package }),
	};
	return { code, summary, ...(Object.keys(where).length === 0 ? {} : { where }), why, fix, ...(details === undefined ? {} : { details }) };
}

/**
 * `SWT-G001`: the game does not match schema version 1.
 *
 * @param input - One mismatch of the game against `GameDefinitionSchema`.
 * @returns The issue.
 *
 * @internal
 */
export function gameSchemaMismatch(input: Mismatch): SwtIssue {
	const at = input.path === undefined || input.path === "" ? "the game" : `\`${input.path}\` of the game`;
	return issue("SWT-G001", `${at} ${input.message}`, "A game must match the game definition format, version 1, and may hold no field the format does not know.", "Correct the field; `GameDefinitionSchema` of `@swarmtales/contracts` describes every field of the format.", { path: input.path });
}

/**
 * `SWT-G002`: `schema` is not 1.
 *
 * @param input - The value found in the field `schema`.
 * @param input.found - That value; undefined when the field is missing.
 * @returns The issue.
 *
 * @internal
 */
export function schemaVersion(input: { readonly found: unknown }): SwtIssue {
	const found = input.found === undefined ? "missing" : JSON.stringify(input.found);
	return issue("SWT-G002", `the game's \`schema\` is ${found}`, "This version of the platform reads games of schema version 1 only.", "Set `schema: 1`, or play the game with the platform version it was written for.", { path: "schema" }, { found: input.found });
}

/**
 * `SWT-G003`: `directors` is not empty before milestone M3. Game resolution no longer raises it; the code stays,
 * because a code is never reused.
 *
 * @param input - The count of entries of `directors`.
 * @param input.count - That count.
 * @returns The issue.
 *
 * @internal
 */
export function directorsReserved(input: { readonly count: number }): SwtIssue {
	return issue("SWT-G003", `the game lists ${input.count} Director(s)`, "The field `directors` is reserved: this version of the platform cannot run a Director.", "Remove the entries of `directors`, or leave the field out.", { path: "directors" });
}

/**
 * `SWT-D001`: a Director's trigger names an event that no mechanic of the game declares.
 *
 * @param input - The Director, the event and the events the game has.
 * @param input.director - The Director's name.
 * @param input.event - The event of the trigger, `<mechanic>.<event>`.
 * @param input.path - The data path of the use, for example `directors[0]`.
 * @param input.declared - Every event the mechanics of the game declare, as `<mechanic>.<event>`.
 * @returns The issue.
 *
 * @internal
 */
export function triggerWithoutEvent(input: { readonly director: string; readonly event: string; readonly path: string; readonly declared: readonly string[] }): SwtIssue {
	return issue("SWT-D001", `the Director "${input.director}" is woken by the event "${input.event}", which no mechanic of the game declares`, `The mechanics of the game declare: ${quoted(input.declared)}.`, `${meant(input.event, input.declared)}add the mechanic that declares the event, or remove the Director.`, { path: input.path }, { event: input.event });
}

/**
 * `SWT-D002`: the name of a Director is taken, or its `use` names no definition.
 *
 * @param input - The name, its place and who holds it.
 * @param input.name - The Director's name: its `as`, else its `use`; for `unknown` the `use`.
 * @param input.path - The data path, for example `directors[1]`.
 * @param input.taken - `director`: an earlier Director has the name; `grant`: it is the grant name of the residents or of the human; `unknown`: no Director definition has the id.
 * @param input.known - For `unknown`: the ids of the definitions that were given.
 * @returns The issue.
 *
 * @public
 */
export function directorName(input: { readonly name: string; readonly path: string; readonly taken: "director" | "grant" | "unknown"; readonly known?: readonly string[] }): SwtIssue {
	const details = { name: input.name, taken: input.taken };
	if (input.taken === "unknown") return issue("SWT-D002", `the game uses the Director "${input.name}", and no Director definition has that id`, `The Director definitions of this run are: ${quoted(input.known ?? [])}.`, `${meant(input.name, input.known ?? [])}put the definition itself into \`use\`, or pass it to game resolution in \`directors\`. A data game (a YAML or JSON file) cannot carry a Director definition yet, and \`swt\` passes none: write a game with a Director in the builder form.`, { path: input.path }, details);
	const holder = input.taken === "director" ? "an earlier Director of the game" : `the grant \`${input.name}\``;
	return issue("SWT-D002", `the Director name "${input.name}" is taken by ${holder}`, "A Director is the actor `director:<name>` and its tools come from the grant `<name>`, so the name must be its own.", "Give the Director another name with `as`.", { path: input.path }, details);
}

/**
 * `SWT-D003`: the game has a Director and its scheduler activates no actor of kind `director`.
 *
 * @param input - The scheduler and the Directors.
 * @param input.scheduler - The scheduler id.
 * @param input.directors - The names of the game's Directors.
 * @returns The issue.
 *
 * @internal
 */
export function directorNeverActivated(input: { readonly scheduler: string; readonly directors: readonly string[] }): SwtIssue {
	return issue("SWT-D003", `the game has the Director(s) ${quoted(input.directors)}, and the scheduler "${input.scheduler}" activates no actor of kind \`director\``, "A Director acts only inside an activation, and a scheduler activates the actor kinds its options name.", 'Name the kind in the scheduler options, for `turns`: `afterBlocks: ["director"]`.', { path: "scheduler.options" });
}

/**
 * `SWT-D004`: a review of a mechanic names an answerer that no Director of the game answers.
 *
 * @param input - The mechanic, its use and the answerer.
 * @param input.mechanic - The id of the mechanic whose tool or pipeline has the review.
 * @param input.path - The data path of the use, for example `mechanics[2]`.
 * @param input.answerer - The answerer the review names.
 * @param input.answered - The answerers the Directors of the game are.
 * @returns The issue.
 *
 * @internal
 */
export function noAnswerer(input: { readonly mechanic: string; readonly path: string; readonly answerer: string; readonly answered: readonly string[] }): SwtIssue {
	return issue("SWT-D004", `the mechanic "${input.mechanic}" has a review answered by "${input.answerer}", and no Director of the game answers it`, `A review asks a Director whose head says \`answers: "${input.answerer}"\`; the Directors of the game answer: ${quoted(input.answered)}.`, `${meant(input.answerer, input.answered)}add the Director that answers "${input.answerer}" to \`directors\`.`, { path: input.path }, { answerer: input.answerer });
}

/**
 * `SWT-G010`: a resident id is doubled or malformed.
 *
 * @param input - The id, its place and what is wrong with it.
 * @param input.id - The resident id.
 * @param input.path - The data path, for example `residents[3]`.
 * @param input.reason - `doubled`: the id is in the list before; `malformed`: it does not match the id pattern.
 * @returns The issue.
 *
 * @internal
 */
export function residentId(input: { readonly id: string; readonly path: string; readonly reason: "doubled" | "malformed" }): SwtIssue {
	const doubled = input.reason === "doubled";
	return issue(
		"SWT-G010",
		`resident id "${input.id}" is ${doubled ? "listed twice" : "malformed"}`,
		doubled ? "A resident id names one resident: the log, the teams and the grants tell residents apart by it." : "A resident id holds only letters, digits, `_`, `.` and `-`, and at least one of them.",
		doubled ? "Remove one of the two entries, or rename it." : "Rename the resident, for example `A01`; or give `residents` as a count to get `A01`, `A02`, ...",
		{ path: input.path },
	);
}

/**
 * `SWT-G011`: a team or a role names an id that is not a resident.
 *
 * @param input - The group, the id and the residents of the game.
 * @param input.kind - Whether the group is a team or a role.
 * @param input.group - The name of the team or role.
 * @param input.id - The id that is no resident.
 * @param input.path - The data path, for example `teams.X[2]`.
 * @param input.residents - The resident ids of the game.
 * @returns The issue.
 *
 * @internal
 */
export function memberNotResident(input: { readonly kind: "team" | "role"; readonly group: string; readonly id: string; readonly path: string; readonly residents: readonly string[] }): SwtIssue {
	return issue("SWT-G011", `${input.kind} "${input.group}" names "${input.id}", which is not a resident of the game`, `A ${input.kind} holds residents of the game only. The game's residents are: ${quoted(input.residents)}.`, `${meant(input.id, input.residents)}add "${input.id}" to \`residents\`, or remove it from the ${input.kind}.`, { path: input.path });
}

/**
 * `SWT-G012`: a tool is granted or locked but not defined.
 *
 * @param input - The tool name, where it is named and what the game's mechanics define.
 * @param input.tool - The name as the game wrote it.
 * @param input.place - Whether a grant or `locked` names it, or `renamed`: a key of a mechanic's `as`.
 * @param input.path - The data path, for example `grants.resident[5]` or `mechanics[0].as.playMov`.
 * @param input.defined - The bare names of the tools the game's mechanics define; for `renamed`, the tools of that mechanic.
 * @returns The issue.
 *
 * @internal
 */
export function toolNotDefined(input: { readonly tool: string; readonly place: "granted" | "locked" | "renamed"; readonly path: string; readonly defined: readonly string[] }): SwtIssue {
	if (input.place === "renamed") return issue("SWT-G012", `tool "${input.tool}" is renamed with \`as\` but its mechanic does not define it`, `A key of \`as\` is the bare name of a tool of that mechanic, which defines: ${quoted(input.defined)}.`, `${meant(input.tool, input.defined)}remove "${input.tool}" from \`as\`.`, { path: input.path });
	return issue("SWT-G012", `tool "${input.tool}" is ${input.place} but no mechanic of the game defines it`, `The game's mechanics define: ${quoted(input.defined)}.`, `${meant(input.tool, input.defined)}add the mechanic that defines "${input.tool}", or remove the name.`, { path: input.path });
}

/**
 * `SWT-G013`: two tools of one grant share a shown name.
 *
 * @param input - The shown name and the tools that carry it.
 * @param input.shown - The name a caller would be shown.
 * @param input.grant - The grant that holds the tools.
 * @param input.tools - The canonical names of the tools, in load order.
 * @param input.path - The data path of the later mechanic, for example `mechanics[2]`.
 * @returns The issue.
 *
 * @internal
 */
export function shownNameClash(input: { readonly shown: string; readonly grant: string; readonly tools: readonly string[]; readonly path: string }): SwtIssue {
	return issue("SWT-G013", `the grant "${input.grant}" holds ${input.tools.length} tools that are shown as "${input.shown}": ${quoted(input.tools)}`, "A caller names a tool by its shown name, so within one grant a shown name stands for one tool.", `Rename one of them in the game with \`as\` on its mechanic, for example \`as: { "${input.shown}": "${input.shown}2" }\`, or drop one from the grant.`, { path: input.path }, { tools: input.tools });
}

/**
 * `SWT-G014`: a shown tool name does not match the pattern.
 *
 * @param input - The shown name and its tool.
 * @param input.shown - The name a caller would be shown.
 * @param input.tool - The canonical name of the tool.
 * @param input.path - The data path, for example `mechanics[0].as.playMove`.
 * @returns The issue.
 *
 * @internal
 */
export function shownNameMalformed(input: { readonly shown: string; readonly tool: string; readonly path: string }): SwtIssue {
	return issue("SWT-G014", `tool "${input.tool}" would be shown as "${input.shown}", which is no valid tool name`, `A shown tool name matches ${TOOL_NAME_PATTERN}: model providers accept nothing else.`, "Give the tool a name of 1 to 64 letters, digits, `_` or `-`, with `as` on its mechanic in the game or in the mechanic itself.", { path: input.path });
}

/**
 * `SWT-G015`: a mechanic stages a tool that the game does not grant to `script`, or the grant `script` holds a tool
 * with a review.
 *
 * @param input - The mechanic, the tool and where.
 * @param input.mechanic - The id of the mechanic whose head lists the tool in `stages`, or that has the reviewed tool.
 * @param input.tool - The bare name of the tool.
 * @param input.path - The data path of the mechanic in the game.
 * @param input.reviewed - True for a tool with a review in the grant `script`.
 * @returns The issue.
 *
 * @internal
 */
export function stagedNotGranted(input: { readonly mechanic: string; readonly tool: string; readonly path: string; readonly reviewed?: boolean }): SwtIssue {
	if (input.reviewed !== true) return issue("SWT-G015", `mechanic "${input.mechanic}" stages the tool "${input.tool}", which the grant \`script\` does not hold`, "A staged call is made as the actor `script` and passes the whole pipeline, so the game must grant `script` every tool its mechanics stage.", `Add "${input.tool}" to \`grants.script\`, or give the tool \`for: ["script"]\` in its head.`, { path: input.path });
	return issue("SWT-G015", `the grant \`script\` holds the tool "${input.tool}" of mechanic "${input.mechanic}", which has a review`, "A staged call runs at once after the step that staged it and is not awaited, so the actor `script` cannot wait for the answer of a review.", `Drop "${input.tool}" from \`grants.script\`, or from the \`for\` of the tool in its head.`, { path: input.path });
}

/**
 * `SWT-G020`: an option does not match its schema.
 *
 * @param input - The owner of the options and one mismatch.
 * @param input.owner - The mechanic id, the scheduler id for `scheduler.options`, or the id of a Director definition.
 * @param input.kind - What the owner is; a mechanic when left out.
 * @param input.package - The package of the owner.
 * @param input.path - The data path with the field, for example `mechanics[0].options.size`.
 * @param input.message - What is wrong, for example `must be an integer from 2 to 10, got "3x3"`.
 * @returns The issue.
 *
 * @public
 */
export function optionMismatch(input: { readonly owner: string; readonly kind?: "mechanic" | "scheduler" | "director"; readonly package?: string; readonly path: string; readonly message: string }): SwtIssue {
	const kind = input.kind === "director" ? "Director" : (input.kind ?? "mechanic");
	return issue("SWT-G020", `\`${input.path}\` of the ${kind} "${input.owner}" ${input.message}`, `The options of a ${kind} must match the schema it declares, and may hold no field the schema does not know.`, `Correct the option; the README of the ${kind}'s package lists every option with its default.`, { path: input.path, package: input.package });
}

/**
 * `SWT-G021`: a mechanic is listed twice.
 *
 * @param input - The mechanic and the place of its second entry.
 * @param input.mechanic - The mechanic id.
 * @param input.path - The data path of the later entry, for example `mechanics[3]`.
 * @returns The issue.
 *
 * @internal
 */
export function mechanicTwice(input: { readonly mechanic: string; readonly path: string }): SwtIssue {
	return issue("SWT-G021", `mechanic "${input.mechanic}" is listed twice`, "A game loads a mechanic once: its id names its state, its events and its tools.", "Remove one of the two entries of `mechanics`.", { path: input.path });
}

/**
 * `SWT-G022`: a data game names a mechanic that is not installed.
 *
 * @param input - The mechanic id and the installed ones.
 * @param input.mechanic - The id the game names in `use`.
 * @param input.path - The data path, for example `mechanics[1].use`.
 * @param input.installed - The ids of the installed mechanics.
 * @returns The issue.
 *
 * @internal
 */
export function mechanicNotInstalled(input: { readonly mechanic: string; readonly path: string; readonly installed: readonly string[] }): SwtIssue {
	return issue("SWT-G022", `the game uses the mechanic "${input.mechanic}", which is not installed`, `A game file names a mechanic by its id, and the id is looked up among the installed mechanic packages: ${quoted(input.installed)}.`, `${meant(input.mechanic, input.installed)}install the package that holds "${input.mechanic}".`, { path: input.path });
}

/**
 * `SWT-G030`: a required service has no provider.
 *
 * @param input - The mechanic and the service it requires.
 * @param input.mechanic - The id of the mechanic that requires the service.
 * @param input.service - The service name.
 * @param input.path - The data path of the mechanic, for example `mechanics[1]`.
 * @returns The issue.
 *
 * @internal
 */
export function noProvider(input: { readonly mechanic: string; readonly service: string; readonly path?: string }): SwtIssue {
	return issue("SWT-G030", `mechanic "${input.mechanic}" needs the service "${input.service}", and no mechanic of the game provides it`, "A mechanic runs only when every service it requires is provided by a mechanic of the same game.", `Add a mechanic that provides "${input.service}" to \`mechanics\`, or remove "${input.mechanic}".`, { path: input.path });
}

/**
 * `SWT-G031`: a service has two providers.
 *
 * @param input - The service and its providers.
 * @param input.service - The service name.
 * @param input.providers - The ids of the mechanics that provide it, in the game's order.
 * @returns The issue.
 *
 * @internal
 */
export function twoProviders(input: { readonly service: string; readonly providers: readonly string[] }): SwtIssue {
	return issue("SWT-G031", `the service "${input.service}" is provided by ${quoted(input.providers)}`, "A service has one provider in a game, so a call of it has one answer.", `Keep one of ${quoted(input.providers)} in \`mechanics\` and remove the rest.`, { path: "mechanics" }, { providers: input.providers });
}

/**
 * `SWT-G032`: `requires` form a cycle.
 *
 * @param input - The mechanics that cannot be placed.
 * @param input.mechanics - Their ids, in the game's order.
 * @returns The issue.
 *
 * @internal
 */
export function requiresCycle(input: { readonly mechanics: readonly string[] }): SwtIssue {
	return issue("SWT-G032", `the requires of ${quoted(input.mechanics)} form a cycle`, "A mechanic loads after the providers of the services it requires, so no chain of `requires` may lead back to its start.", "In one of these mechanics, move the service from `requires` to `uses` and call it with `ctx.tryCall`, or react to an event of the other mechanic.", { path: "mechanics" }, { mechanics: input.mechanics });
}

/**
 * `SWT-G041`: an override (`--set`, an arm of an experiment) names no param of the game, or its value has the wrong type.
 *
 * @param input - The override and what is wrong with it.
 * @param input.name - The name of the param the override sets.
 * @param input.problem - `unknown`: the family declares no such param; `mismatch`: the value does not match the param's schema; `no-family`: the game has no params at all.
 * @param input.known - The names of the params the family declares.
 * @param input.message - For `mismatch`: what is wrong with the value, for example `must be boolean`.
 * @returns The issue.
 *
 * @public
 */
export function paramOverride(input: { readonly name: string; readonly problem: "unknown" | "mismatch" | "no-family"; readonly known?: readonly string[]; readonly message?: string }): SwtIssue {
	const known = input.known ?? [];
	const details = { param: input.name, known };
	const why = "A game family builds its game from typed params, and an override may set only a param the family declares, with a value of its type.";
	if (input.problem === "no-family") return issue("SWT-G041", `the param "${input.name}" is set, and the game has no params`, "Only a game family (`defineGameFamily`) has params; a plain game or a data game is played as it is written.", `Remove the override of "${input.name}", or export the game as a family that declares the param.`, {}, details);
	if (input.problem === "unknown") return issue("SWT-G041", `the game family has no param "${input.name}"`, `${why} This family declares: ${quoted(known)}.`, `${meant(input.name, known)}remove the override of "${input.name}".`, {}, details);
	return issue("SWT-G041", `the value of the param "${input.name}" ${input.message ?? "does not match its schema"}`, why, `Give "${input.name}" a value of the type its schema in the family's \`params\` states.`, {}, details);
}

/**
 * `SWT-M010`: an event type is reserved by the kernel or declared twice.
 *
 * @param input - The mechanic, the event type and who holds the type already.
 * @param input.mechanic - The id of the mechanic that declares the type.
 * @param input.type - The event type.
 * @param input.owner - The id of the mechanic that declares it too; undefined: the kernel reserves it.
 * @param input.package - The package of the mechanic.
 * @returns The issue.
 *
 * @internal
 */
export function eventTypeTaken(input: { readonly mechanic: string; readonly type: string; readonly owner?: string; readonly package?: string }): SwtIssue {
	const holder = input.owner === undefined ? "is reserved by the kernel" : `is declared by the mechanic "${input.owner}" too`;
	return issue("SWT-M010", `mechanic "${input.mechanic}" declares the event "${input.type}", which ${holder}`, "An event type has one owner in a game, so a reader of the log knows who wrote an event.", `Rename the event in the head of "${input.mechanic}"${input.owner === undefined ? "" : `, or remove one of the two mechanics from the game`}.`, { package: input.package });
}

/**
 * `SWT-M011`: the head's `package` is not the package's name.
 *
 * @param input - The mechanic and the two names.
 * @param input.mechanic - The mechanic id.
 * @param input.declared - The `package` of the head.
 * @param input.actual - The `name` of the package's `package.json`.
 * @returns The issue.
 *
 * @public
 */
export function packageMismatch(input: { readonly mechanic: string; readonly declared: string; readonly actual: string }): SwtIssue {
	return issue("SWT-M011", `mechanic "${input.mechanic}" declares the package "${input.declared}", but lives in "${input.actual}"`, "The head's `package` is part of every canonical tool name and event source, so it must be the name in the package's `package.json`.", `Set \`package: "${input.actual}"\` in the head of "${input.mechanic}".`, { file: "package.json", package: input.actual });
}

/**
 * `SWT-M012`: the body of a mechanic does not fit its head. The types refuse it in an object literal; a spread or
 * plain JavaScript gets past them, so `defineMechanic` checks it again.
 *
 * @param input - The mechanic, the part and what is wrong with it.
 * @param input.mechanic - The mechanic id.
 * @param input.package - The package of the mechanic.
 * @param input.part - `tool`: an entry of `tools`; `service`: an entry of `services`.
 * @param input.name - The bare tool name or the service name.
 * @param input.problem - `missing`: the head declares it and the body has no handlers; `undeclared`: the body has handlers and the head does not declare it.
 * @returns The issue.
 *
 * @internal
 */
export function bodyMismatch(input: { readonly mechanic: string; readonly package?: string; readonly part: "tool" | "service"; readonly name: string; readonly problem: "missing" | "undeclared" }): SwtIssue {
	const key = input.part === "tool" ? "tools" : "services";
	const declared = input.part === "tool" ? "`tools`" : "`provides`";
	const summary = input.problem === "missing" ? `the head of "${input.mechanic}" declares the ${input.part} "${input.name}", but the body has no handlers for it` : `the body of "${input.mechanic}" has handlers for the ${input.part} "${input.name}", which the head does not declare`;
	const fix = input.problem === "missing" ? `Add "${input.name}" to the body's \`${key}\`, or remove it from the head's ${declared}.` : `Declare "${input.name}" in the head's ${declared}, or remove it from the body's \`${key}\`.`;
	return issue("SWT-M012", summary, "The head is read without running a handler, so the body must hold exactly the tools and services the head declares.", fix, { package: input.package }, { part: input.part, problem: input.problem });
}

/**
 * `SWT-M013`: the `options` schema of a mechanic is no object schema (erratum E32, item 5).
 *
 * @param input - The mechanic.
 * @param input.mechanic - The mechanic id.
 * @param input.package - The package of the mechanic.
 * @returns The issue.
 *
 * @internal
 */
export function optionsNoObject(input: { readonly mechanic: string; readonly package?: string }): SwtIssue {
	return issue("SWT-M013", `the \`options\` schema of mechanic "${input.mechanic}" is no object schema`, "A game gives a mechanic its options by name, so the schema of the options is an object with one property per option.", `Declare \`options: Type.Object({ ... })\` in the head of "${input.mechanic}", or leave \`options\` out.`, { package: input.package });
}

/**
 * `SWT-M014`: a mechanic keeps state that cannot be started or saved.
 *
 * @param input - The mechanic and what its head lacks.
 * @param input.mechanic - The mechanic id.
 * @param input.package - The package of the mechanic.
 * @param input.problem - `no-start`: the head has `state` and no `start`; `no-schema`: it has `start` or `snapshot` and no `state` schema.
 * @returns The issue.
 *
 * @internal
 */
export function stateUnsaved(input: { readonly mechanic: string; readonly package?: string; readonly problem: "no-start" | "no-schema" }): SwtIssue {
	const summary = input.problem === "no-start" ? `mechanic "${input.mechanic}" declares a state but no \`start\` that builds it` : `mechanic "${input.mechanic}" keeps state that cannot be saved: its head has no \`state\` schema`;
	const fix = input.problem === "no-start" ? `Add \`start(setup)\` to the head of "${input.mechanic}", or remove \`state\`.` : `Declare \`state\` as a schema in the head of "${input.mechanic}"; for a state that is not plain JSON, add \`snapshot: { save, load }\` beside it.`;
	return issue("SWT-M014", summary, "A run must stop and resume at any tick, so every state has a schema it is saved under and a function that builds it for a fresh run.", fix, { package: input.package }, { problem: input.problem });
}

/**
 * `SWT-M021`: an emitted payload does not match its schema.
 *
 * @param input - The mechanic, the event type and one mismatch.
 * @param input.mechanic - The id of the mechanic that emitted.
 * @param input.type - The event type.
 * @param input.package - The package of the mechanic.
 * @param input.path - The path inside the payload, for example `/remaining`.
 * @param input.message - What is wrong there, for example `must be a number, got undefined`.
 * @returns The issue.
 *
 * @internal
 */
export function payloadMismatch(input: { readonly mechanic: string; readonly type: string; readonly package?: string; readonly path: string; readonly message: string }): SwtIssue {
	return issue("SWT-M021", `mechanic "${input.mechanic}" emitted "${input.type}" with a wrong payload: ${found(input.path, input.message)}`, "An event's payload must match the schema the head declares for it, so every reader of the log can rely on it.", `Correct the \`ctx.emit("${input.type}", ...)\` call, or the schema of "${input.type}" in the head's \`events\`.`, { path: input.path, package: input.package });
}

/**
 * `SWT-M022`: a service input or output does not match its schema.
 *
 * @param input - The service, the method, the side and one mismatch.
 * @param input.service - The service name.
 * @param input.method - The method name.
 * @param input.side - `input`: the caller's value is wrong; `output`: the provider's answer is.
 * @param input.provider - The id of the mechanic that provides the service; left out by a caller, which does not know it.
 * @param input.caller - The id of the plugin that called.
 * @param input.path - The path inside the value, for example `/resident`.
 * @param input.message - What is wrong there.
 * @returns The issue.
 *
 * @internal
 */
export function serviceMismatch(input: { readonly service: string; readonly method: string; readonly side: "input" | "output"; readonly provider?: string; readonly caller: string; readonly path: string; readonly message: string }): SwtIssue {
	const implementation = input.provider === undefined ? `the implementation of "${input.service}"` : `the implementation in "${input.provider}"`;
	const guilty = input.side === "input" ? `the call by "${input.caller}"` : implementation;
	const parties = `${input.provider === undefined ? "" : `provider "${input.provider}", `}caller "${input.caller}"`;
	return issue("SWT-M022", `the ${input.side} of "${input.service}.${input.method}" is wrong (${parties}): ${found(input.path, input.message)}`, `A service call must match the ${input.side} schema of its method in the service contract.`, `Correct ${guilty}, or the ${input.side} schema of "${input.method}" in the contract of "${input.service}".`, { path: input.path }, { side: input.side });
}

/**
 * `SWT-M023`: the value of a fact does not match its schema.
 *
 * @param input - The mechanic, the fact and one mismatch.
 * @param input.mechanic - The id of the mechanic that computes the fact.
 * @param input.fact - The bare name of the fact; its key in a game is `<mechanic id>.<name>`. Left out where the name is not known.
 * @param input.package - The package of the mechanic.
 * @param input.path - The path inside the value, for example `/scores/X`; empty for the value itself.
 * @param input.message - What is wrong there, for example `must be an integer, got "3"`.
 * @returns The issue.
 *
 * @internal
 */
export function factMismatch(input: { readonly mechanic: string; readonly fact?: string; readonly package?: string; readonly path: string; readonly message: string }): SwtIssue {
	const named = input.fact === undefined ? `a fact of mechanic "${input.mechanic}"` : `the fact "${input.mechanic}.${input.fact}"`;
	return issue("SWT-M023", `${named} has a wrong value: ${found(input.path, input.message)}`, "A fact's value must match its `output` schema, so the result line and every reader outside the run can rely on it.", `Correct \`compute\` of the fact${input.fact === undefined ? "" : ` "${input.fact}"`} in the body of "${input.mechanic}", or its \`output\` schema.`, { path: input.path, package: input.package });
}

/**
 * `SWT-M024`: a snapshot slice cannot be saved or loaded. The kernel reports a failed load as `SWT-R002` with this
 * issue as its cause.
 *
 * @param input - The mechanic and what is wrong with its slice.
 * @param input.mechanic - The mechanic id.
 * @param input.package - The package of the mechanic.
 * @param input.problem - `saved` or `loaded`: the slice does not match the head's `state` schema at that moment; `newer`: its version is above the head's; `no-migration`: the head has no migration from its version.
 * @param input.version - The version of the slice (for `no-migration`, the step that has no migration); for `newer` and `no-migration`.
 * @param input.known - The version of the head; for `newer`.
 * @param input.path - The path inside the slice, for example `/count`; for `saved` and `loaded`.
 * @param input.message - What is wrong there; for `saved` and `loaded`.
 * @returns The issue.
 *
 * @internal
 */
export function sliceMismatch(input: { readonly mechanic: string; readonly package?: string; readonly problem: "saved" | "loaded" | "newer" | "no-migration"; readonly version?: number; readonly known?: number; readonly path?: string; readonly message?: string }): SwtIssue {
	const version = String(input.version ?? "unknown");
	const what = { saved: "", loaded: "", newer: `has version ${version}, which is newer than ${String(input.known ?? "the head's")}`, "no-migration": `has version ${version}, and the head has no migration from it` }[input.problem];
	const schema = `does not match the state schema when it is ${input.problem}: ${found(input.path ?? "", input.message ?? "does not match its schema")}`;
	return issue("SWT-M024", `the snapshot slice of mechanic "${input.mechanic}" ${what === "" ? schema : what}`, "A slice is saved and loaded in the form of the head's `state` schema, at a version the head knows.", `Correct \`state\`, \`snapshot\`, \`version\` or \`migrations\` in the head of "${input.mechanic}", or resume from a snapshot this version of the mechanic wrote.`, { package: input.package }, { problem: input.problem });
}

/**
 * `SWT-M025`: a fact or a run limit calls a command of a service. The type of the view refuses it; a cast or plain
 * JavaScript gets past the type, so the view checks it again and the command is not called.
 *
 * @param input - The mechanic and the method it called.
 * @param input.mechanic - The id of the mechanic whose fact or run limit called.
 * @param input.package - The package of the mechanic.
 * @param input.service - The service name.
 * @param input.method - The method name, a `command` of the service.
 * @returns The issue.
 *
 * @internal
 */
export function commandInView(input: { readonly mechanic: string; readonly package?: string; readonly service: string; readonly method: string }): SwtIssue {
	return issue("SWT-M025", `a fact or a run limit of mechanic "${input.mechanic}" called "${input.service}.${input.method}", which is a command`, "A fact and a run limit only read: they are computed at any moment and any number of times, so they call the `query` methods of a service and never a command.", `Call a query of "${input.service}" in the fact or the run limit of "${input.mechanic}", or move the call of "${input.method}" into a tool, a hook or a listener.`, { package: input.package });
}

/**
 * `SWT-P003`: a declared prompt has no text.
 *
 * @param input - The owner, the prompt and where a text was looked for.
 * @param input.owner - The id of the mechanic that declares the prompt, or `kernel` for a kernel reply.
 * @param input.prompt - The prompt id.
 * @param input.lookedIn - The paths that were tried, in lookup order.
 * @returns The issue.
 *
 * @internal
 */
export function promptWithoutText(input: { readonly owner: string; readonly prompt: string; readonly lookedIn: readonly string[] }): SwtIssue {
	const first = input.lookedIn[0];
	return issue("SWT-P003", `"${input.owner}" declares the prompt "${input.prompt}" but has no text for it`, `Every text a model may read is known before the run starts. Looked in: ${input.lookedIn.length === 0 ? "no path" : input.lookedIn.join(", ")}.`, `${first === undefined ? "Create the prompt file" : `Create \`${first}\``}, or give the tool's \`description\` as the text itself.`, { file: first }, { lookedIn: input.lookedIn });
}
