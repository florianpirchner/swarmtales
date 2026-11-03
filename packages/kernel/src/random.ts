/**
 * Deterministic randomness for reproducible runs.
 *
 * Every random draw that affects the game (puzzles, team layouts, activation
 * order) goes through an {@link Rng} derived from the run seed, so a run can be
 * reproduced exactly from its seed and story.
 */

export interface Rng {
	/** Uniform in [0, 1). */
	next(): number;
	/** Integer in [min, max], both inclusive. */
	int(min: number, max: number): number;
	/** One random element; throws on an empty list. */
	pick<T>(items: readonly T[]): T;
	/** Shuffled copy (Fisher-Yates). */
	shuffle<T>(items: readonly T[]): T[];
}

/** Mulberry32: small, fast and good enough for game data. */
export function createRng(seed: number): Rng {
	let state = seed >>> 0;

	const next = (): number => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};

	return {
		next,
		int(min, max) {
			if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
				throw new RangeError(`Invalid random range: [${min}, ${max}]`);
			}
			return min + Math.floor(next() * (max - min + 1));
		},
		pick(items) {
			const item = items[Math.floor(next() * items.length)];
			if (item === undefined) throw new RangeError("pick() on an empty list");
			return item;
		},
		shuffle(items) {
			const copy = [...items];
			for (let i = copy.length - 1; i > 0; i--) {
				const j = Math.floor(next() * (i + 1));
				const a = copy[i];
				const b = copy[j];
				if (a === undefined || b === undefined) continue;
				copy[i] = b;
				copy[j] = a;
			}
			return copy;
		},
	};
}

/** Stable 32-bit hash of a text (FNV-1a). */
export function seedFrom(text: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

/**
 * Derives an independent seed for one purpose of a run, e.g.
 * `deriveSeed(seed, "order", round)`. Different parts yield unrelated streams.
 */
export function deriveSeed(seed: number, ...parts: readonly (string | number)[]): number {
	return seedFrom([String(seed >>> 0), ...parts.map(String)].join(":"));
}

/** Shorthand for `createRng(deriveSeed(seed, ...parts))`. */
export function rngFor(seed: number, ...parts: readonly (string | number)[]): Rng {
	return createRng(deriveSeed(seed, ...parts));
}
