// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** A small reader for SPDX licence expressions: ids, `WITH`, `AND`, `OR` and parentheses. */

/** A parsed licence expression. */
export type Expression =
	| { readonly kind: "licence"; readonly id: string }
	| { readonly kind: "and" | "or"; readonly left: Expression; readonly right: Expression };

/** The verdict on an expression: the licence the package is used under, or the ids that are not allowed. */
export type Verdict = { readonly ok: true; readonly usedAs: string } | { readonly ok: false; readonly refused: readonly string[] };

const TOKEN = /\(|\)|[A-Za-z0-9.+-]+/g;
const KEYWORDS = new Set(["AND", "OR", "WITH", "(", ")"]);

class Reader {
	readonly #tokens: readonly string[];
	#position = 0;

	constructor(tokens: readonly string[]) {
		this.#tokens = tokens;
	}

	get done(): boolean {
		return this.#position >= this.#tokens.length;
	}

	peek(): string | undefined {
		return this.#tokens[this.#position];
	}

	take(): string | undefined {
		const token = this.#tokens[this.#position];
		this.#position += 1;
		return token;
	}
}

function readAtom(reader: Reader): Expression | undefined {
	const token = reader.take();
	if (token === "(") {
		const inner = readChain(reader, "or");
		return reader.take() === ")" ? inner : undefined;
	}
	if (token === undefined || KEYWORDS.has(token)) return undefined;
	if (reader.peek() !== "WITH") return { kind: "licence", id: token };
	reader.take();
	const exception = reader.take();
	if (exception === undefined || KEYWORDS.has(exception)) return undefined;
	return { kind: "licence", id: `${token} WITH ${exception}` };
}

/** Reads `a OR b OR c` (or, one level down, `a AND b`); `AND` binds tighter than `OR`. */
function readChain(reader: Reader, kind: "and" | "or"): Expression | undefined {
	const next = (): Expression | undefined => (kind === "or" ? readChain(reader, "and") : readAtom(reader));
	let left = next();
	while (left !== undefined && reader.peek() === kind.toUpperCase()) {
		reader.take();
		const right = next();
		left = right === undefined ? undefined : { kind, left, right };
	}
	return left;
}

/**
 * Parses an SPDX licence expression.
 *
 * @param text - The expression, for example `(MIT OR Apache-2.0)`.
 * @returns The parsed expression, or `undefined` when the text is not one.
 */
export function parseExpression(text: string): Expression | undefined {
	const tokens = text.match(TOKEN) ?? [];
	if (tokens.join("") !== text.replace(/\s+/g, "")) return undefined;
	const reader = new Reader(tokens);
	const expression = readChain(reader, "or");
	return reader.done ? expression : undefined;
}

/**
 * Decides whether an expression is satisfied by allowed licences alone.
 *
 * @param expression - The parsed expression.
 * @param allowed - The allowed ids.
 * @returns The licence used (for `A OR B` the first allowed side), or the refused ids.
 */
export function judge(expression: Expression, allowed: ReadonlySet<string>): Verdict {
	if (expression.kind === "licence") {
		return allowed.has(expression.id) ? { ok: true, usedAs: expression.id } : { ok: false, refused: [expression.id] };
	}
	const left = judge(expression.left, allowed);
	const right = judge(expression.right, allowed);
	if (expression.kind === "or") {
		if (left.ok) return left;
		if (right.ok) return right;
		return { ok: false, refused: [...left.refused, ...right.refused] };
	}
	if (left.ok && right.ok) return { ok: true, usedAs: `${left.usedAs} AND ${right.usedAs}` };
	return { ok: false, refused: [...(left.ok ? [] : left.refused), ...(right.ok ? [] : right.refused)] };
}
