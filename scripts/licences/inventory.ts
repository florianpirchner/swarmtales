// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Judges the packages of the lockfile against the allowlist and renders `THIRD-PARTY-LICENSES.md`. */
import { Type, type Static } from "typebox";
import { ALLOWED_ACTIONS, ALLOWED_LICENCES, NEVER_ALLOWED } from "./allowlist.ts";
import { judge, parseExpression } from "./spdx.ts";

/** The output of `pnpm licenses list --json`: packages grouped by their licence text. */
export const PnpmLicences = Type.Record(
	Type.String(),
	Type.Array(
		Type.Object({
			name: Type.String(),
			versions: Type.Array(Type.String()),
			license: Type.String(),
			homepage: Type.Optional(Type.String()),
		}),
	),
);

/** `licences.overrides.json`: a licence pinned for one exact version whose metadata is wrong or missing. */
export const Overrides = Type.Array(
	Type.Object(
		{
			package: Type.String({ description: "name@version, for example left-pad@1.3.0", pattern: "^.+@[^@]+$" }),
			licence: Type.String({ description: "The SPDX id shown by the package's own licence file" }),
			evidence: Type.String({ description: "A link to that licence file", pattern: "^https://" }),
		},
		{ additionalProperties: false },
	),
);

/** `third_party/manifest.json`: one row per vendored folder. */
export const ThirdParty = Type.Array(
	Type.Object(
		{
			name: Type.String({ description: "The folder under third_party/" }),
			source: Type.String({ description: "Where the files come from", pattern: "^https://" }),
			commit: Type.String({ description: "The commit or release they were taken at" }),
			licence: Type.String({ description: "The SPDX id of the source" }),
		},
		{ additionalProperties: false },
	),
);

/** One row of the inventory. */
export interface InventoryRow {
	readonly name: string;
	readonly version: string;
	/** The licence as declared, and after `->` the licence used when the two differ. */
	readonly licence: string;
	readonly source: string;
}

/** The result of judging: the inventory and the offences. */
export interface Judgement {
	readonly rows: readonly InventoryRow[];
	readonly offences: readonly string[];
	/** The names of the refused packages, so the caller can show what pulls them in. */
	readonly refusedPackages: readonly string[];
}

/** What a package declares: its licence text and where it comes from. */
export interface Declared {
	readonly licence: string;
	readonly source: string;
}

/** A GitHub Action that a workflow uses, with the commit it is pinned to. */
export interface UsedAction {
	readonly action: string;
	readonly commit: string;
}

/** Everything the judgement reads. */
export interface JudgementInput {
	/** Every package of the lockfile as `name@version`: all platforms, optional and transitive ones included. */
	readonly locked: readonly string[];
	/** What the packages installed on this machine declare, by `name@version`. */
	readonly installed: ReadonlyMap<string, Declared>;
	/**
	 * What the committed inventory records, by `name@version`. It stands in for a package of the lockfile that this
	 * machine does not install (a binary of another platform), so the inventory is the same on every machine.
	 */
	readonly recorded: ReadonlyMap<string, Declared>;
	readonly overrides: Static<typeof Overrides>;
	readonly vendored: Static<typeof ThirdParty>;
	readonly actions: readonly UsedAction[];
}

/**
 * Flattens the output of `pnpm licenses list --json`.
 *
 * @param installed - The parsed output.
 * @returns What each installed package declares, by `name@version`.
 */
export function declaredByInstalled(installed: Static<typeof PnpmLicences>): ReadonlyMap<string, Declared> {
	const declared = new Map<string, Declared>();
	for (const pack of Object.values(installed).flat()) {
		const source = pack.homepage ?? `https://www.npmjs.com/package/${pack.name}`;
		for (const version of pack.versions) declared.set(`${pack.name}@${version}`, { licence: pack.license, source });
	}
	return declared;
}

const LOCK_KEY = /^(?:@[\w.-]+\/)?[\w.-]+@\d+\.\d+\.\d+(?:-[\w.+-]+)?$/;

/**
 * Reads the package list of `pnpm-lock.yaml`.
 *
 * @param text - The text of the lockfile.
 * @returns The `name@version` keys of its `packages:` section, and one offence per entry that does not come from
 * the registry with an integrity hash (a git repository, a tarball address, a local path).
 */
export function lockedPackages(text: string): { readonly keys: readonly string[]; readonly offences: readonly string[] } {
	const lines = text.split(/\r?\n/);
	const start = lines.indexOf("packages:");
	if (start < 0) return { keys: [], offences: ["pnpm-lock.yaml: no packages section"] };
	const end = lines.findIndex((line, index) => index > start && /^\S/.test(line));
	const section = lines.slice(start + 1, end < 0 ? lines.length : end);
	const entries = section.flatMap((line, index) => {
		const key = /^ {2}(\S.*):$/.exec(line)?.[1]?.replace(/^'|'$/g, "");
		return key === undefined ? [] : [{ key, resolution: (section[index + 1] ?? "").trim() }];
	});
	const foreign = entries.filter(({ key, resolution }) => !LOCK_KEY.test(key) || !resolution.startsWith("resolution: {integrity: "));
	return {
		keys: entries.map((entry) => entry.key),
		offences: [
			...foreign.map(({ key }) => `pnpm-lock.yaml: ${key} does not come from the registry with an integrity hash; only registry versions are allowed`),
			...(entries.length === 0 ? ["pnpm-lock.yaml: the packages section is empty or unreadable"] : []),
		],
	};
}

const unescaped = (cell: string): string => cell.replaceAll("\\|", "|");

/**
 * Reads the rows of a committed `THIRD-PARTY-LICENSES.md` back.
 *
 * @param text - The text of the inventory.
 * @returns What each row records as declared, by `name@version`.
 */
export function recordedRows(text: string): ReadonlyMap<string, Declared> {
	const recorded = new Map<string, Declared>();
	const rows = text.split(/\r?\n/).map((line) => line.split(/(?<!\\)\|/).map((cell) => unescaped(cell.trim())));
	for (const [, name = "", version = "", licence = "", source = ""] of rows.filter((cells) => cells.length === 6)) {
		if (name === "Package" || /^-+$/.test(name)) continue;
		const declared = (licence.split(" -> ")[0] ?? "").replace(/ \(override\)$/, "");
		recorded.set(`${name}@${version}`, { licence: declared === "none" ? "" : declared, source });
	}
	return recorded;
}

/** Says why a licence text is refused, or gives the licence used. */
function assess(licence: string): { readonly usedAs: string } | { readonly why: string } {
	const expression = parseExpression(licence);
	if (licence === "" || /^unknown$/i.test(licence)) return { why: "has no licence" };
	if (expression === undefined) return { why: `has a licence that is not an SPDX expression: "${licence}"` };
	const verdict = judge(expression, ALLOWED_LICENCES);
	if (verdict.ok) return { usedAs: verdict.usedAs };
	const never = verdict.refused.filter((id) => NEVER_ALLOWED.test(id));
	const note = never.length > 0 ? " (never allowed, no exception path)" : " (not on the allowlist)";
	return { why: `is under ${verdict.refused.join(", ")}${note}` };
}

/** Says whether a declared licence names a family that no override may replace (DECISIONS.md 5.4). */
function declaresNeverAllowed(declared: string): boolean {
	return (declared.match(/[A-Za-z0-9.+-]+/g) ?? []).some((id) => NEVER_ALLOWED.test(id));
}

class Judge {
	readonly rows: InventoryRow[] = [];
	readonly offences: string[] = [];
	readonly refused: string[] = [];
	readonly #pinned: ReadonlyMap<string, Static<typeof Overrides>[number]>;
	readonly #used = new Set<string>();

	constructor(overrides: Static<typeof Overrides>) {
		this.#pinned = new Map(overrides.map((row) => [row.package, row]));
	}

	add(name: string, version: string, declared: Declared, id: string): void {
		const override = this.#pinned.get(id);
		if (override !== undefined) this.#used.add(id);
		if (override !== undefined && declaresNeverAllowed(declared.licence)) {
			this.offences.push(`licences.overrides.json: ${id} declares ${declared.licence}; an override never replaces a licence that is never allowed`);
			this.refused.push(name);
			return;
		}
		const result = assess(override?.licence ?? declared.licence);
		if ("why" in result) {
			this.offences.push(`${id} ${result.why}`);
			this.refused.push(name);
			return;
		}
		const shown = override === undefined ? declared.licence : `${declared.licence === "" ? "none" : declared.licence} (override)`;
		this.rows.push({ name, version, licence: shown === result.usedAs ? shown : `${shown} -> ${result.usedAs}`, source: declared.source });
	}

	staleOverrides(): readonly string[] {
		return [...this.#pinned.keys()].filter((id) => !this.#used.has(id)).map((id) => `licences.overrides.json: ${id} is not in the lockfile; remove the row`);
	}
}

/**
 * Judges every package of the lockfile, every vendored folder and every action.
 *
 * @param input - The lockfile's packages, what is installed and recorded, the overrides, the vendored folders and
 * the actions.
 * @returns The inventory rows, sorted, and one offence per refused or unknown package and per stale override.
 */
export function judgePackages(input: JudgementInput): Judgement {
	const judgement = new Judge(input.overrides);
	for (const id of input.locked) {
		const at = id.lastIndexOf("@");
		const installed = input.installed.get(id);
		const recorded = input.recorded.get(id);
		// What is installed states the licence; a recorded source is kept, so the file is the same on every machine.
		const declared = installed === undefined ? recorded : { licence: installed.licence, source: recorded?.source ?? installed.source };
		if (declared === undefined) {
			judgement.offences.push(`${id} is in the lockfile, but it is not installed on this machine and THIRD-PARTY-LICENSES.md has no row for it; run pnpm licences:write with network access`);
		} else judgement.add(id.slice(0, at), id.slice(at + 1), declared, id);
	}
	const unlocked = [...input.installed.keys()].filter((id) => !input.locked.includes(id));
	for (const id of unlocked) judgement.offences.push(`${id} is installed but not in the lockfile; run pnpm install --frozen-lockfile`);
	for (const row of input.vendored) judgement.add(`third_party/${row.name}`, row.commit, { licence: row.licence, source: row.source }, `third_party/${row.name}`);
	for (const { action, commit } of input.actions) {
		const licence = ALLOWED_ACTIONS.get(action);
		if (licence !== undefined) judgement.add(`action ${action}`, commit, { licence, source: `https://github.com/${action}` }, `action ${action}`);
	}
	return { rows: sortRows(judgement.rows), offences: [...judgement.offences, ...judgement.staleOverrides()], refusedPackages: judgement.refused };
}

function sortRows(rows: readonly InventoryRow[]): readonly InventoryRow[] {
	const key = (row: InventoryRow): string => `${row.name}\u0000${row.version}`;
	const unique = new Map(rows.map((row) => [key(row), row]));
	return [...unique.values()].sort((a, b) => (key(a) < key(b) ? -1 : 1));
}

/**
 * Renders the inventory file.
 *
 * @param rows - The rows from {@link judgePackages}.
 * @returns The text of `THIRD-PARTY-LICENSES.md`.
 */
export function renderInventory(rows: readonly InventoryRow[]): string {
	const cell = (text: string): string => text.replaceAll("|", "\\|");
	return [
		"# Third-party licences",
		"",
		"Generated by `pnpm licences:write` from the lockfile (`pnpm-lock.yaml`: every package of every platform, the",
		"optional and transitive ones included), `third_party/manifest.json` and the actions of the workflows. Do not edit;",
		"`pnpm check:licences` fails when this file is stale. The rule and the allowlist are in",
		"[`docs/LICENCE-POLICY.md`](docs/LICENCE-POLICY.md). Every package here is a development tool or a library of this",
		"repository. `A -> B` means: declared as A, used under B.",
		"",
		`${rows.length} entries.`,
		"",
		"| Package | Version | Licence | Source |",
		"|---|---|---|---|",
		...rows.map((row) => `| ${cell(row.name)} | ${cell(row.version)} | ${cell(row.licence)} | ${cell(row.source)} |`),
		"",
	].join("\n");
}
