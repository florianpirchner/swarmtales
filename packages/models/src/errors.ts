// SPDX-License-Identifier: Apache-2.0
/**
 * The catalogue of the X codes (models): one function per code, each returning the issue. A code is never reused
 * or renumbered. Every issue is built from names and ids only, never from a key value, and is thrown through
 * {@link thrown}, which redacts its texts.
 */
import { redactValue, SwtError, type Redact, type SwtIssue } from "@swarmtales/contracts";

const quoted = (names: readonly string[]): string => names.map((name) => `\`${name}\``).join(", ");

/**
 * The error of one or several issues, with every text of them redacted first.
 *
 * @param issue - The issue of this catalogue, or a list of them.
 * @param redact - The function its texts go through: `redact` of the key broker.
 * @returns The error to throw.
 *
 * @public
 */
export function thrown(issue: SwtIssue | readonly SwtIssue[], redact: Redact): SwtError {
	return new SwtError(redactValue(issue, redact));
}

/**
 * `SWT-X001`: no key is held for a provider.
 *
 * @param provider - The provider id.
 * @param variables - Every variable that was tried, in the order tried.
 * @returns The issue; it names the variables, never a value.
 *
 * @public
 */
export function noKey(provider: string, variables: readonly string[]): SwtIssue {
	const tried = variables.length === 0 ? "no variable is known for this provider" : `tried: ${quoted(variables)}`;
	return {
		code: "SWT-X001",
		summary: `no key for the provider "${provider}" (${tried})`,
		why: "A live request needs the provider's key, and a key is read from the environment only.",
		fix: variables.length === 0 ? "Use a provider that has key variables." : `Set ${variables[0] ?? ""} in the environment of the command; a key is never typed into a chat or a prompt.`,
		details: { provider, variables },
	};
}

/**
 * `SWT-X002`: a provider that does not exist.
 *
 * @param provider - The provider id as it was written.
 * @param known - The provider ids that exist.
 * @returns The issue.
 *
 * @public
 */
export function unknownProvider(provider: string, known: readonly string[]): SwtIssue {
	return { code: "SWT-X002", summary: `the provider "${provider}" is not known`, why: "A model is asked through one of the provider adapters.", fix: `Use one of: ${known.join(", ")}.`, details: { provider } };
}

/**
 * `SWT-X003`: the model does not exist at the provider.
 *
 * @param provider - The provider id.
 * @param model - The model id as it was written.
 * @param known - The model ids of the provider; at most 12 are listed.
 * @returns The issue.
 *
 * @public
 */
export function unknownModel(provider: string, model: string, known: readonly string[]): SwtIssue {
	const more = known.length > 12 ? `, and ${known.length - 12} more` : "";
	return {
		code: "SWT-X003",
		summary: `the provider "${provider}" has no model "${model}"`,
		why: "A request is sent only to a model of the provider's table, because the price of a token is read from it.",
		fix: `Use one of: ${known.slice(0, 12).join(", ")}${more}.`,
		details: { provider, model },
	};
}

/**
 * `SWT-X004`: an empty model id.
 *
 * @param provider - The provider id.
 * @returns The issue.
 *
 * @public
 */
export function emptyModel(provider: string): SwtIssue {
	return { code: "SWT-X004", summary: `the model id for the provider "${provider}" is empty`, why: "A request names its model.", fix: "Give a model id or an alias of the models package.", details: { provider } };
}

/**
 * `SWT-X005`: a live run without a cost cap.
 *
 * @returns The issue.
 *
 * @public
 */
export function noCostCap(): SwtIssue {
	return { code: "SWT-X005", summary: "the live run has no cost cap", why: "A cap that code holds is the precondition of every live request.", fix: "Give the run a cap above zero, in USD." };
}

/**
 * `SWT-X006`: a key value shorter than 16 characters.
 *
 * @param variable - The variable that holds it.
 * @returns The issue; it names the variable, never the value.
 *
 * @public
 */
export function shortKey(variable: string): SwtIssue {
	return {
		code: "SWT-X006",
		summary: `the value of \`${variable}\` is shorter than 16 characters`,
		why: "A value that short cannot be told from ordinary text when a line is redacted.",
		fix: `Set ${variable} to the whole key, or remove the variable.`,
		details: { variable },
	};
}

/**
 * `SWT-X007`: the price table has no price above zero for the model.
 *
 * @param provider - The provider id.
 * @param model - The model id.
 * @returns The issue.
 *
 * @public
 */
export function noPrice(provider: string, model: string): SwtIssue {
	return {
		code: "SWT-X007",
		summary: `the price table has no price above zero for the input or output tokens of "${model}" (${provider})`,
		why: "The cost cap counts what the price table says; with a price of zero no cap is ever reached.",
		fix: "Use a model that has a price in the table.",
		details: { provider, model },
	};
}

/**
 * `SWT-X030`: a held key value occurs in files of a run folder.
 *
 * @param files - The files, as paths inside the run folder.
 * @returns The issue; it names the files, never the value or its place.
 *
 * @public
 */
export function keyLeaked(files: readonly string[]): SwtIssue {
	return {
		code: "SWT-X030",
		summary: `a held key value occurs in ${quoted(files)}`,
		why: "No artefact of a run may hold a key.",
		fix: "Do not publish the run folder; replace the key at the provider, then report the leak as a defect of the redaction.",
		details: { files },
	};
}

/**
 * `SWT-X040`: a record payload of the driver does not match its schema.
 *
 * @param type - The record type.
 * @param path - The place in the payload, as a JSON pointer; empty for the payload itself.
 * @param message - What the schema says about that place; never the value.
 * @returns The issue.
 *
 * @public
 */
export function recordMismatch(type: string, path: string, message: string): SwtIssue {
	return {
		code: "SWT-X040",
		summary: `the record \`${type}\` of the model driver does not match its schema: ${message}`,
		where: { path: `${type}${path}`, package: "@swarmtales/models" },
		why: "A record is checked by its writer, because the log is read by its schemas.",
		fix: "Correct the driver, or the schema in `records.ts` in the same change.",
		details: { type },
	};
}

/**
 * `SWT-X041`: a tool call of a model reached its session while no activation was open.
 *
 * @param actor - The actor of the session.
 * @returns The issue.
 *
 * @public
 */
export function callOutsideActivation(actor: string): SwtIssue {
	return {
		code: "SWT-X041",
		summary: `a tool call of ${actor} arrived outside an activation`,
		where: { package: "@swarmtales/models" },
		why: "A driver calls only through its open activation; a call after the activation closed would be written with a closed cause.",
		fix: "Await the model request with all its tool calls before the driver returns.",
		details: { actor },
	};
}
