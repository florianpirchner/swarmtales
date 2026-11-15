// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Fragment-overlap puzzle. Carried from the old platform.
 *
 * A password is split into `k` fragments that overlap by exactly `overlap`
 * characters at each seam. Generated puzzles are validated against the
 * invariants and redrawn on violation.
 */
import type { RandomSource as Rng } from "@swarmtales/contracts";

// The shortest password.
const MIN_PASSWORD_LENGTH = 6;
// The longest password.
const MAX_PASSWORD_LENGTH = 28;
// The shortest fragment.
const MIN_FRAGMENT_LENGTH = 3;
// Without easily confused characters (0/O, 1/I).
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * One team's puzzle.
 *
 * @public
 */
export interface FragmentPuzzle {
	/** The password. */
	readonly password: string;
	/** Fragments in password order; the engine hands them out without position. */
	readonly fragments: readonly string[];
	/** Characters shared at each seam. */
	readonly overlap: number;
}

interface PuzzleOptions {
	readonly passwordLength: number;
	readonly fragmentCount: number;
	readonly overlap: number;
	/**
	 * Characters every fragment holds that no other fragment has [Whispers]:
	 * with it, nobody assembles the password without every fragment. When
	 * omitted, cuts are drawn as before and only the invariants hold.
	 */
	readonly ownChars?: number;
}

// The shortest password `count` fragments fit when each holds `ownChars` characters of its own.
function minimumLength(count: number, overlap: number, ownChars: number): number {
	return count * ownChars + (count - 1) * overlap;
}

// Characters of each fragment no neighbour covers: its length minus one seam per neighbour.
function ownCharsOf(fragments: readonly string[], overlap: number): readonly number[] {
	return fragments.map((fragment, index) => fragment.length - overlap * ((index > 0 ? 1 : 0) + (index < fragments.length - 1 ? 1 : 0)));
}

function createPassword(rng: Rng, length: number): string {
	if (!Number.isInteger(length) || length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH) {
		throw new RangeError(
			`Password length must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH}, got ${length}`,
		);
	}
	let password = "";
	for (let i = 0; i < length; i++) password += PASSWORD_ALPHABET.charAt(rng.int(0, PASSWORD_ALPHABET.length - 1));
	return password;
}

// Splits a password at the given cut positions; neighbours share `overlap` characters.
function splitAtCuts(password: string, cuts: readonly number[], overlap: number): readonly string[] {
	const starts = [0, ...cuts];
	const ends = [...cuts.map((cut) => cut + overlap - 1), password.length - 1];
	return starts.map((start, index) => {
		const end = ends[index];
		if (end === undefined || start >= password.length || end < start || end >= password.length) {
			throw new RangeError(`Invalid fragment bounds at position ${index}`);
		}
		return password.slice(start, end + 1);
	});
}

// Draws one candidate puzzle; it may violate the invariants.
function drawPuzzle(rng: Rng, options: PuzzleOptions): FragmentPuzzle {
	const { passwordLength: length, fragmentCount: count, overlap } = options;
	const password = createPassword(rng, length);
	if (count === 1) return { password, fragments: [password], overlap };
	if (options.ownChars !== undefined) return { password, fragments: splitAtCuts(password, ownedCuts(rng, options), overlap), overlap };
	// The last cut leaves room for a whole seam; for overlaps 2 and 3 this is the old bound (length - 3), so their draws stay the same.
	const last = length - Math.max(3, overlap);
	if (last < count - 1) throw new RangeError(`A password of length ${length} is too short for ${count} fragments with overlap ${overlap}`);

	const positions = Array.from({ length: last }, (_, index) => index + 1);
	const cuts = rng
		.shuffle(positions)
		.slice(0, count - 1)
		.sort((a, b) => a - b);
	return { password, fragments: splitAtCuts(password, cuts, overlap), overlap };
}

// Cuts that give every fragment at least `ownChars` characters of its own:
// the password is own part, seam, own part, ..., seam, own part, and the
// characters beyond the minimum go to seeded own parts.
function ownedCuts(rng: Rng, options: PuzzleOptions): readonly number[] {
	const { passwordLength: length, fragmentCount: count, overlap, ownChars = 1 } = options;
	const slack = length - minimumLength(count, overlap, ownChars);
	if (slack < 0) throw new RangeError(`A password of length ${length} is too short for ${count} fragments with overlap ${overlap} and ${ownChars} own characters each`);
	const own = Array.from({ length: count }, () => ownChars);
	for (let unit = 0; unit < slack; unit++) {
		const index = rng.int(0, count - 1);
		own[index] = (own[index] ?? ownChars) + 1;
	}
	const cuts: number[] = [];
	let position = 0;
	for (let index = 0; index < count - 1; index++) {
		position += own[index] ?? ownChars;
		cuts.push(position);
		position += overlap;
	}
	return cuts;
}

/**
 * Every distinct string the fragments assemble into, in any order.
 *
 * @param fragments - The fragments.
 * @param overlap - Characters shared at each seam.
 * @returns The assembled strings.
 *
 * @public
 */
export function assembleAll(fragments: readonly string[], overlap: number): readonly string[] {
	if (fragments.length === 0) return [];
	const results = new Set<string>();
	for (const order of permutations(fragments)) {
		const assembled = assembleInOrder(order, overlap);
		if (assembled !== undefined) results.add(assembled);
	}
	return [...results];
}

// What is wrong with the fragments one by one: too short, too long, not part of the password, too few own characters.
function fragmentIssues(puzzle: FragmentPuzzle, ownChars?: number): readonly string[] {
	const issues: string[] = [];
	const { password, fragments, overlap } = puzzle;
	for (const fragment of fragments) {
		if (fragment.length < Math.max(MIN_FRAGMENT_LENGTH, overlap + 1)) issues.push(`fragment "${fragment}" is too short`);
		if (fragment.length >= password.length) issues.push(`fragment "${fragment}" alone determines the password`);
		if (!password.includes(fragment)) issues.push(`fragment "${fragment}" is not part of the password`);
	}
	if (ownChars === undefined) return issues;
	ownCharsOf(fragments, overlap).forEach((own, index) => {
		if (own < ownChars) issues.push(`fragment "${fragments[index] ?? ""}" holds ${String(own)} characters of its own, fewer than ${String(ownChars)}`);
	});
	return issues;
}

// What is wrong with the fragments together: they do not assemble into exactly the password, or fewer of them already have its length.
function assemblyIssues(puzzle: FragmentPuzzle): readonly string[] {
	const issues: string[] = [];
	const { password, fragments, overlap } = puzzle;
	const assemblies = assembleAll(fragments, overlap);
	if (assemblies.length !== 1 || assemblies[0] !== password) issues.push(`fragments assemble into ${String(assemblies.length)} strings, expected exactly the password`);
	for (let size = 1; size < fragments.length; size++) {
		for (const subset of combinations(fragments, size)) {
			if (assembleAll(subset, overlap).some((candidate) => candidate.length === password.length)) issues.push(`proper subset [${subset.join("|")}] already has the full length`);
		}
	}
	return issues;
}

/**
 * All invariant violations of a puzzle.
 *
 * @param puzzle - The puzzle.
 * @param ownChars - Characters every fragment must hold that no other has; not checked when left out.
 * @returns One line per violation, in the old order; empty when the puzzle is valid.
 *
 * @public
 */
export function validatePuzzle(puzzle: FragmentPuzzle, ownChars?: number): readonly string[] {
	const issues: string[] = [];
	const { password, fragments, overlap } = puzzle;
	const length = password.length;
	if (!Number.isInteger(overlap) || overlap < 2) issues.push("overlap must be at least 2 characters");
	if (length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH) issues.push(`password length ${String(length)} is outside ${String(MIN_PASSWORD_LENGTH)}-${String(MAX_PASSWORD_LENGTH)}`);
	if (fragments.length === 0) return [...issues, "no fragments"];
	if (fragments.length === 1) return fragments[0] === password ? issues : [...issues, "a single fragment must equal the password"];
	return [...issues, ...fragmentIssues(puzzle, ownChars), ...assemblyIssues(puzzle)];
}

// Substrings of length `size` that both texts contain.
function sharedGrams(a: string, b: string, size: number): readonly string[] {
	const gramsOf = (text: string): ReadonlySet<string> =>
		new Set(Array.from({ length: Math.max(0, text.length - size + 1) }, (_, index) => text.slice(index, index + size)));
	const left = gramsOf(a);
	return [...gramsOf(b)].filter((gram) => left.has(gram));
}

interface LevelPuzzleOptions {
	readonly teams: number;
	readonly passwordLength: number;
	readonly fragmentCount: number;
	readonly overlap: number;
	readonly ownChars?: number;
	readonly maxAttemptsPerPuzzle?: number;
}

/**
 * Valid puzzles for every team of one level. No two passwords share a
 * substring of seam length, so a seam can never match another team's fragment
 * even when all fragments meet on the public board.
 *
 * @param rng - The random stream of the level.
 * @param options - The number of teams and the shape of a puzzle.
 * @returns One puzzle per team.
 * @throws RangeError when the shape allows no puzzle, or none is found in the attempts allowed.
 */
export function generateLevelPuzzles(rng: Rng, options: LevelPuzzleOptions): readonly FragmentPuzzle[] {
	const maxAttempts = options.maxAttemptsPerPuzzle ?? 500;
	const accepted: FragmentPuzzle[] = [];
	for (let index = 0; index < options.teams; index++) {
		let found: FragmentPuzzle | undefined;
		for (let attempt = 0; attempt < maxAttempts && found === undefined; attempt++) {
			const candidate = drawPuzzle(rng, options);
			if (validatePuzzle(candidate, options.ownChars).length > 0) continue;
			const collides = accepted.some(
				(other) => sharedGrams(other.password, candidate.password, options.overlap).length > 0,
			);
			if (!collides) found = candidate;
		}
		if (found === undefined) {
			throw new RangeError(`No valid puzzle for team ${index + 1} after ${maxAttempts} attempts`);
		}
		accepted.push(found);
	}
	return accepted;
}

function assembleInOrder(order: readonly string[], overlap: number): string | undefined {
	const [first, ...rest] = order;
	if (first === undefined) return undefined;
	let assembled = first;
	for (const next of rest) {
		const tail = assembled.slice(-overlap);
		if (tail.length < overlap || !next.startsWith(tail)) return undefined;
		assembled += next.slice(overlap);
	}
	return assembled;
}

function* permutations<T>(items: readonly T[]): Generator<readonly T[]> {
	if (items.length <= 1) {
		yield items;
		return;
	}
	for (let index = 0; index < items.length; index++) {
		const head = items[index];
		if (head === undefined) continue;
		const rest = [...items.slice(0, index), ...items.slice(index + 1)];
		for (const tail of permutations(rest)) yield [head, ...tail];
	}
}

function* combinations<T>(items: readonly T[], size: number): Generator<readonly T[]> {
	if (size === 0) {
		yield [];
		return;
	}
	for (let index = 0; index <= items.length - size; index++) {
		const head = items[index];
		if (head === undefined) continue;
		for (const tail of combinations(items.slice(index + 1), size - 1)) yield [head, ...tail];
	}
}
