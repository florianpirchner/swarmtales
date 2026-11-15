// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The verification of a run folder, alone or against the folder of the run it resumed from; the codes are in `catalogue.ts`. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CHAIN_FILE, type ChainFault, type ChainHolds, type ChainVerdict, canonicalJson, EVENTS_FILE, jsonHash, PUBLIC_KEY_FILE, type RunTexts, verifyContinuityText, verifyRunTexts } from "@swarmtales/chain";
import { envelopeLogIssues, StoredEnvelopeSchema, type SwtIssue } from "@swarmtales/contracts";
import { Check } from "typebox/value";
import { type Code, issue } from "./catalogue.ts";
import { briefingKey, GAME_FILE, MANIFEST_FILE, manifestMismatch, TEXTS_FILE } from "./folder.ts";

/** What {@link verifyRun} says about a run folder. @public */
export interface RunVerdict {
	/** True when there is no issue. A run that holds and is not `finished` is unfinished, not broken. */
	readonly ok: boolean;
	/** True when the chain holds and the last line is the kernel's `run_ended`. */
	readonly finished: boolean;
	/** The lines of `events.jsonl`. */
	readonly lines: number;
	/** The hash of the last line, when the chain holds. */
	readonly head?: string;
	/**
	 * Set for a resumed run, and whenever a previous folder was given: `holds` when the run continues that folder's
	 * run, `broken` when it does not (an issue `SWT-L007` says why), `unchecked` when no previous folder was given.
	 */
	readonly continuity?: "holds" | "broken" | "unchecked";
	/** Every fault found, the chain's first; each names its file and, where it has one, its line. */
	readonly issues: readonly SwtIssue[];
}

/** The code of each kind of fault of the chain (erratum E17); `continuity` is `SWT-L007` since M3. */
const CODE_OF: Readonly<Record<ChainFault, Code>> = { chain: "SWT-L001", signature: "SWT-L002", unsigned: "SWT-L002", manifest: "SWT-L003", continuity: "SWT-L007" };

function parse(text: string): unknown {
	try {
		const value: unknown = JSON.parse(text);
		return value;
	} catch {
		return undefined;
	}
}

function field(value: unknown, name: string): unknown {
	return typeof value === "object" && value !== null ? Reflect.get(value, name) : undefined;
}

function linesOf(text: string): readonly string[] {
	const lines = text.split("\n");
	if (lines.at(-1) === "") lines.pop();
	return lines;
}

// The four texts of a run folder, or one issue per file that cannot be read.
function readTexts(directory: string): RunTexts | readonly SwtIssue[] {
	const missing: SwtIssue[] = [];
	const read = (name: string, code: Code): string => {
		try {
			return readFileSync(join(directory, name), "utf8");
		} catch {
			missing.push(issue(code, `${name} is missing in ${directory}`, name));
			return "";
		}
	};
	const texts = { events: read(EVENTS_FILE, "SWT-L001"), chain: read(CHAIN_FILE, "SWT-L001"), publicKey: read(PUBLIC_KEY_FILE, "SWT-L002"), manifest: read(MANIFEST_FILE, "SWT-L003") };
	return missing.length > 0 ? missing : texts;
}

function chainIssues(verdict: ChainVerdict): readonly SwtIssue[] {
	if (verdict.ok) return [];
	const file = verdict.kind === "manifest" ? MANIFEST_FILE : verdict.line === undefined ? CHAIN_FILE : EVENTS_FILE;
	const place = verdict.line === undefined || verdict.kind === "manifest" ? "" : `line ${verdict.line}: `;
	return [issue(CODE_OF[verdict.kind], `${place}${verdict.reason}`, file, verdict.kind === "manifest" ? undefined : verdict.line)];
}

// L004 for every line that is no stored envelope; L005 for the first line out of order (one gap moves every later line).
function lineIssues(events: string): readonly SwtIssue[] {
	const values = linesOf(events).map(parse);
	const issues = values.flatMap((value, index) => (Check(StoredEnvelopeSchema, value) ? [] : [issue("SWT-L004", `line ${index + 1} is not a stored envelope`, EVENTS_FILE, index + 1)]));
	const order = envelopeLogIssues(values).find((fault) => fault.kind !== "envelope");
	return order === undefined ? issues : [...issues, issue("SWT-L005", `line ${order.line}: ${order.reason}`, EVENTS_FILE, order.line)];
}

// What the chain's verifier cannot see: the file's text is canonical (erratum O1), it is a run manifest, and it
// agrees with the genesis.
function manifestFault(text: string, verdict: ChainVerdict): string | undefined {
	const manifest = parse(text);
	if (manifest === undefined) return undefined; // The chain's verifier has said it.
	let canonical: string;
	try {
		canonical = canonicalJson(manifest);
	} catch {
		return "the manifest is not a JSON value";
	}
	if (text !== canonical && text !== `${canonical}\n`) return "the manifest is not written as canonical JSON (RFC 8785): JSON parsers may read it differently";
	const mismatch = manifestMismatch(manifest);
	if (mismatch !== undefined) return `the file is not a run manifest: ${mismatch}`;
	return verdict.ok ? disagreement(manifest, verdict.genesis) : undefined;
}

// Where the manifest and the genesis say different things about the log or about a resume (erratum O2).
function disagreement(manifest: unknown, genesis: ChainHolds["genesis"]): string | undefined {
	if (genesis.version !== 2) return undefined;
	if (canonicalJson(field(manifest, "log")) !== canonicalJson(genesis.log)) return "the manifest and the genesis name different log formats";
	if ((field(manifest, "resumedFrom") === undefined) !== (genesis.resumedFrom === undefined)) return "the manifest and the genesis differ on whether the run resumed from a snapshot";
	return undefined;
}

// A file the manifest commits by hash, parsed; undefined when the folder has none. A file that is there and is not
// JSON has the value undefined: it is not what was committed.
function committed(directory: string, name: string): { readonly value: unknown } | undefined {
	let text: string;
	try {
		text = readFileSync(join(directory, name), "utf8");
	} catch {
		return undefined;
	}
	return { value: parse(text) };
}

// The hash the manifest holds for each key of `texts.json`: the texts of the game by their key, and the briefing
// of each actor (`actors[].textHashes.briefing`) under its briefing key.
function textHashes(manifest: unknown): ReadonlyMap<string, unknown> {
	const texts = field(manifest, "texts");
	const actors = field(manifest, "actors");
	const briefings = (Array.isArray(actors) ? actors : []).flatMap((actor: unknown): [string, unknown][] => {
		const id = field(actor, "id");
		const hash = field(field(actor, "textHashes"), "briefing");
		return typeof id === "string" && hash !== undefined ? [[briefingKey(id), hash]] : [];
	});
	return new Map([...(typeof texts === "object" && texts !== null ? Object.entries(texts) : []), ...briefings]);
}

// `texts.json` against the manifest: the first text that is not the one its hash names, and the first key that no hash covers.
function textIssues(texts: object, manifest: unknown): readonly SwtIssue[] {
	const hashes = textHashes(manifest);
	const changed = [...hashes].find(([key, hash]) => {
		const text = field(texts, key);
		return typeof text !== "string" || jsonHash(text) !== hash;
	})?.[0];
	const added = Object.keys(texts).find((key) => !hashes.has(key));
	return [
		...(changed === undefined ? [] : [issue("SWT-L003", `texts.json: the text "${changed}" is not the text the manifest names by hash`, TEXTS_FILE)]),
		...(added === undefined ? [] : [issue("SWT-L003", `texts.json: the text "${added}" is covered by no hash of the manifest`, TEXTS_FILE)]),
	];
}

// `game.json` and `texts.json`, where the folder has them, against the hashes of the manifest. A hash is `jsonHash`
// of the value: of the whole game, and of each text as a string (as the manifest builder hashes them).
function committedIssues(directory: string, manifestText: string): readonly SwtIssue[] {
	const manifest = parse(manifestText);
	const issues: SwtIssue[] = [];
	const game = committed(directory, GAME_FILE);
	if (game !== undefined && (game.value === undefined || jsonHash(game.value) !== field(field(manifest, "game"), "hash"))) issues.push(issue("SWT-L003", "game.json is not the game the manifest names by hash", GAME_FILE));
	const texts = committed(directory, TEXTS_FILE);
	if (texts === undefined) return issues;
	if (typeof texts.value !== "object" || texts.value === null) return [...issues, issue("SWT-L003", "texts.json is not the object of texts the manifest names by hash", TEXTS_FILE)];
	// A manifest without its map of texts has its own issue; there is nothing to compare the texts with.
	const hashes = field(manifest, "texts");
	return typeof hashes === "object" && hashes !== null ? [...issues, ...textIssues(texts.value, manifest)] : issues;
}

/** What {@link verifyRun} takes beside the folder. @public */
export interface VerifyRunOptions {
	/** The folder of the run this run resumed from; with it the continuity of the two runs is checked. */
	readonly previous?: string;
}

// `SWT-L007` when the run does not continue the run of the folder `previous`. A fault of the run's own chain is not
// one: `chainIssues` has said it.
function continuityIssues(previous: string, texts: RunTexts): readonly SwtIssue[] {
	const before = readTexts(previous);
	if (!("events" in before)) return [issue("SWT-L007", `the folder of the previous run, ${previous}, cannot be read: ${before[0]?.summary ?? "a file is missing"}`, EVENTS_FILE)];
	const verdict = verifyContinuityText(before, texts);
	if (verdict.ok || verdict.kind !== "continuity") return [];
	return [issue("SWT-L007", `${verdict.line === undefined ? "" : `line ${String(verdict.line)}: `}${verdict.reason}`, verdict.line === undefined ? CHAIN_FILE : EVENTS_FILE, verdict.line)];
}

// What the verdict says about continuity; undefined for a run that did not resume and was given no previous folder.
function continuityOf(verdict: ChainVerdict, previous: string | undefined, faults: readonly SwtIssue[]): RunVerdict["continuity"] {
	if (previous !== undefined) return faults.length === 0 && verdict.ok ? "holds" : "broken";
	return verdict.ok && verdict.genesis.resumedFrom !== undefined ? "unchecked" : undefined;
}

/**
 * Verifies a run folder: the chain over `events.jsonl` and its signed heads, the manifest against the genesis,
 * every line as a stored envelope in log order, and `game.json` and `texts.json` (where the folder has them) against
 * the hashes of the manifest: each text of the game, each actor's briefing under {@link briefingKey}, and no key
 * that no hash covers. With `previous`, also that the run continues the run of that folder: its genesis chains from
 * a head that run signed, its first lines repeat that run's lines up to the head (all but the stamp `at`), and the
 * next line is the marker `run_resumed`; a fault is `SWT-L007`.
 *
 * @param directory - The run folder, with `events.jsonl`, `events.chain.jsonl`, `run.pub` and `manifest.json`.
 * @param options - The folder of the run this run resumed from.
 * @returns The verdict. `ok` with `finished: false` is a run that stopped at a signed head before its end. A
 * resumed run that is verified without `previous` has `continuity: "unchecked"`.
 * @example
 * ```ts
 * const verdict = verifyRun("runs/hello-game-002", { previous: "runs/hello-game-001" });
 * if (!verdict.ok) for (const issue of verdict.issues) console.error(formatIssue(issue));
 * ```
 *
 * @public
 */
export function verifyRun(directory: string, options: VerifyRunOptions = {}): RunVerdict {
	const texts = readTexts(directory);
	if (!("events" in texts)) return { ok: false, finished: false, lines: 0, issues: texts };
	const verdict = verifyRunTexts(texts);
	const fault = manifestFault(texts.manifest, verdict);
	const broken = options.previous === undefined ? [] : continuityIssues(options.previous, texts);
	const continuity = continuityOf(verdict, options.previous, broken);
	const issues = [...chainIssues(verdict), ...broken, ...lineIssues(texts.events), ...(fault === undefined ? [] : [issue("SWT-L003", fault, MANIFEST_FILE)]), ...committedIssues(directory, texts.manifest)];
	return { ok: issues.length === 0, finished: verdict.ok && verdict.finished, lines: linesOf(texts.events).length, ...(verdict.ok ? { head: verdict.head } : {}), ...(continuity === undefined ? {} : { continuity }), issues };
}
