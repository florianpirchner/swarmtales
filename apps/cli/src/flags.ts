// SPDX-License-Identifier: Apache-2.0
/** The flags of `swt`: read once from the arguments, and checked into what a fake run and a live run take. */
import { parseArgs } from "node:util";
import { SwtError, type RunManifest, type SwtIssue } from "@swarmtales/contracts";
import type { ThinkingLevel } from "@swarmtales/models";
import { badUsage } from "./errors.ts";

// A seed is a 32-bit number: the manifest and the log refuse a larger one, and it would play as its remainder.
const MAX_SEED = 4294967295;
const text = { type: "string" } as const;
const OPTIONS = { fake: { type: "boolean" }, json: { type: "boolean" }, seed: text, out: text, set: { type: "string", multiple: true }, provider: text, model: text, thinking: text, budget: text, ledger: text, purpose: text, replicate: text, game: text } as const;
const THINKING: readonly ThinkingLevel[] = ["off", "minimal", "low", "medium", "high"];
const PURPOSES: readonly Purpose[] = ["smoke", "pilot", "exploratory", "confirmatory"];

type Purpose = RunManifest["run"]["purpose"];
type Parsed = ReturnType<typeof parseArgs<{ options: typeof OPTIONS; allowPositionals: true }>>;

/**
 * The flags of a command as they were written, before any check of their values.
 *
 * @public
 */
export type Flags = Parsed["values"];

/**
 * What the flags of a live run say, checked.
 *
 * @public
 */
export interface LiveFlags {
	/** `--provider`: the provider id. */
	readonly provider?: string;
	/** `--model`: a model id or an alias of the provider. */
	readonly modelId?: string;
	/** `--thinking`: how much the model thinks. */
	readonly thinking?: ThinkingLevel;
	/** `--budget`: the cost cap of the run in US dollars; a live run without one is refused (`SWT-X005`). */
	readonly budget?: number;
	/** `--ledger`: the spend ledger file the run's cap must fit under (`SWT-C025`); no ledger when absent. */
	readonly ledger?: string;
	/** `--purpose`: what the run is for; `smoke` when absent. */
	readonly purpose: Purpose;
	/** `--replicate`: the index of the repetition; 0 when absent. */
	readonly replicate: number;
}

/**
 * `SWT-C021`: a `--set` that is not `name=json`.
 *
 * @param input - The flag value.
 * @param input.set - What was written after `--set`.
 * @returns The issue.
 *
 * @public
 */
export function badSet(input: { readonly set: string }): SwtIssue {
	return {
		code: "SWT-C021",
		summary: `\`--set ${input.set}\` is not a param name, \`=\` and a JSON value`,
		why: "`--set` overrides one param of a game family, and the value is read as JSON so that a number, a boolean and a string stay apart.",
		fix: 'Write `--set name=value` with a JSON value: `--set games=2`, `--set brain=false`, `--set label=\'"a"\'`.',
	};
}

/**
 * `SWT-C022`: a `--purpose` or a `--thinking` that is none of the known words.
 *
 * @param input - The flag and its value.
 * @param input.flag - The name of the flag, without the dashes.
 * @param input.value - What was written.
 * @param input.known - The words the flag takes.
 * @returns The issue.
 *
 * @public
 */
export function unknownWord(input: { readonly flag: string; readonly value: string; readonly known: readonly string[] }): SwtIssue {
	return { code: "SWT-C022", summary: `\`--${input.flag} ${input.value}\` is none of the values the flag takes`, why: "The value goes into the run manifest, which holds a fixed set of words.", fix: `Use one of: ${input.known.join(", ")}.` };
}

/**
 * Reads the flags and the words before and between them.
 *
 * @param args - The arguments after the program name.
 * @returns The flags as written, and the words that are no flag.
 * @throws SwtError `SWT-C003` for a flag that no command has, or a flag without its value.
 *
 * @public
 */
export function readFlags(args: readonly string[]): { readonly values: Flags; readonly positionals: readonly string[] } {
	try {
		return parseArgs({ args: [...args], options: OPTIONS, allowPositionals: true });
	} catch (cause) {
		throw new SwtError(badUsage({ problem: cause instanceof Error ? cause.message : "the arguments cannot be read" }), { cause });
	}
}

/**
 * Reads `--seed`.
 *
 * @param seed - The value as written; absent when the flag is.
 * @returns The seed, or undefined without the flag.
 * @throws SwtError `SWT-C003` when the value is no whole number from 0 to 4294967295.
 *
 * @public
 */
export function seedOf(seed: string | undefined): number | undefined {
	if (seed === undefined) return undefined;
	if (!/^\d+$/.test(seed) || Number(seed) > MAX_SEED) throw new SwtError(badUsage({ problem: `the seed "${seed}" is no whole number from 0 to ${String(MAX_SEED)}` }));
	return Number(seed);
}

/**
 * Reads every `--set name=json` into the overrides of a game family's params. Whether a name is a param, and
 * whether its value fits, is checked by game resolution (`SWT-G041`).
 *
 * @param sets - The values of the flag, in order; a later one wins over an earlier one of the same name.
 * @returns The overrides by param name; empty without the flag.
 * @throws SwtError `SWT-C021`, one issue per value that has no name, no `=` or no JSON value.
 *
 * @public
 */
export function paramsOf(sets: readonly string[] = []): Readonly<Record<string, unknown>> {
	const params = new Map<string, unknown>();
	const issues: SwtIssue[] = [];
	for (const set of sets) {
		const cut = set.indexOf("=");
		try {
			if (cut < 1) throw new SyntaxError("no name");
			params.set(set.slice(0, cut), JSON.parse(set.slice(cut + 1)));
		} catch {
			issues.push(badSet({ set }));
		}
	}
	if (issues.length > 0) throw new SwtError(issues);
	return Object.fromEntries(params);
}

function wordOf<W extends string>(flag: string, value: string | undefined, known: readonly W[]): W | undefined {
	const word = known.find((item) => item === value);
	if (value !== undefined && word === undefined) throw new SwtError(unknownWord({ flag, value, known }));
	return word;
}

// A plain decimal number: `Number` alone would also read "", "0x10" and "1e3".
function numberOf(flag: string, value: string | undefined, form: RegExp, what: string): number | undefined {
	if (value === undefined) return undefined;
	if (!form.test(value)) throw new SwtError(badUsage({ problem: `\`--${flag} ${value}\` is no ${what}` }));
	return Number(value);
}

/**
 * Checks the flags of a live run.
 *
 * @param flags - The flags as written.
 * @returns The provider, the model and its thinking level, the cost cap, the spend ledger, the purpose and the replicate.
 * @throws SwtError `SWT-C022` for an unknown `--purpose` or `--thinking`; `SWT-C003` for a `--budget` that is no
 * amount in US dollars or a `--replicate` that is no whole number.
 *
 * @public
 */
export function liveFlags(flags: Flags): LiveFlags {
	const thinking = wordOf("thinking", flags.thinking, THINKING);
	const budget = numberOf("budget", flags.budget, /^\d+(\.\d+)?$/, "amount in US dollars");
	return {
		...(flags.provider === undefined ? {} : { provider: flags.provider }),
		...(flags.model === undefined ? {} : { modelId: flags.model }),
		...(thinking === undefined ? {} : { thinking }),
		...(budget === undefined ? {} : { budget }),
		...(flags.ledger === undefined ? {} : { ledger: flags.ledger }),
		purpose: wordOf("purpose", flags.purpose, PURPOSES) ?? "smoke",
		replicate: numberOf("replicate", flags.replicate, /^\d{1,9}$/, "whole number from 0") ?? 0,
	};
}
