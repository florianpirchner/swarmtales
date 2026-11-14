// SPDX-License-Identifier: Apache-2.0
/**
 * The verification of a run folder, and the catalogue of the codes `SWT-L001` to `SWT-L005`: the chain breaks at
 * a line (L001), a head is not signed or no head covers the tail (L002), the manifest is not the one the genesis
 * names, or `game.json` or `texts.json` is not what the manifest names by hash (L003), a line is no stored envelope (L004), `seq`, `tick`, `causedBy` or `basis` are out of order (L005).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CHAIN_FILE, type ChainFault, type ChainHolds, type ChainVerdict, canonicalJson, EVENTS_FILE, jsonHash, PUBLIC_KEY_FILE, type RunTexts, verifyRunTexts } from "@swarmtales/chain";
import { envelopeLogIssues, StoredEnvelopeSchema, type SwtIssue } from "@swarmtales/contracts";
import { Check } from "typebox/value";
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
	/** Every fault found, the chain's first; each names its file and, where it has one, its line. */
	readonly issues: readonly SwtIssue[];
}

type Code = "SWT-L001" | "SWT-L002" | "SWT-L003" | "SWT-L004" | "SWT-L005";

const RESTORE = "Restore the run folder from a copy that was not changed; a log that does not verify is no evidence.";
const CATALOGUE: Readonly<Record<Code, { readonly why: string; readonly fix: string }>> = {
	"SWT-L001": { why: "Every line of the log is chained to the line before it by its hash, so a changed, deleted, inserted or moved line shows.", fix: RESTORE },
	"SWT-L002": { why: "A head signed with the run's key covers every line of the log.", fix: "Check that run.pub is the key of this run. A run that crashed has no signed end: play it again." },
	"SWT-L003": { why: "The genesis of the chain names the hash of manifest.json, which is written as canonical JSON and says what the genesis says.", fix: RESTORE },
	"SWT-L004": { why: "Every line of events.jsonl is one stored envelope: an event of the log with the time it was written at.", fix: RESTORE },
	"SWT-L005": { why: "In a log, seq is the line number, tick never falls, and causedBy and basis are smaller than seq.", fix: "The writer of the log broke the order: report it with the run folder." },
};

/** The code of each kind of fault of the chain (erratum E17); `continuity` has no code of its own at M1. */
const CODE_OF: Readonly<Record<ChainFault, Code>> = { chain: "SWT-L001", signature: "SWT-L002", unsigned: "SWT-L002", manifest: "SWT-L003", continuity: "SWT-L001" };

function issue(code: Code, summary: string, file: string, line?: number): SwtIssue {
	return { code, summary, where: line === undefined ? { file } : { file, line }, ...CATALOGUE[code] };
}

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

/**
 * Verifies a run folder: the chain over `events.jsonl` and its signed heads, the manifest against the genesis,
 * every line as a stored envelope in log order, and `game.json` and `texts.json` (where the folder has them) against
 * the hashes of the manifest: each text of the game, each actor's briefing under {@link briefingKey}, and no key
 * that no hash covers.
 *
 * @param directory - The run folder, with `events.jsonl`, `events.chain.jsonl`, `run.pub` and `manifest.json`.
 * @returns The verdict. `ok` with `finished: false` is a run that stopped at a signed head before its end.
 * @example
 * ```ts
 * const verdict = verifyRun("runs/hello-game-001");
 * if (!verdict.ok) for (const issue of verdict.issues) console.error(formatIssue(issue));
 * ```
 *
 * @public
 */
export function verifyRun(directory: string): RunVerdict {
	const texts = readTexts(directory);
	if (!("events" in texts)) return { ok: false, finished: false, lines: 0, issues: texts };
	const verdict = verifyRunTexts(texts);
	const fault = manifestFault(texts.manifest, verdict);
	const issues = [...chainIssues(verdict), ...lineIssues(texts.events), ...(fault === undefined ? [] : [issue("SWT-L003", fault, MANIFEST_FILE)]), ...committedIssues(directory, texts.manifest)];
	return { ok: issues.length === 0, finished: verdict.ok && verdict.finished, lines: linesOf(texts.events).length, ...(verdict.ok ? { head: verdict.head } : {}), issues };
}
