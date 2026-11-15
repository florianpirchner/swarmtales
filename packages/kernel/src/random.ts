// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Deterministic randomness for reproducible runs.
 *
 * Every random draw that affects the game (puzzles, team layouts, activation order) goes through a
 * `RandomSource` derived from the run seed, so a run can be reproduced exactly from its seed and game.
 * Carried bit for bit from the old platform: the streams of old and new runs are the same.
 */
import type { RandomSource } from "@swarmtales/contracts";

/**
 * Mulberry32: small, fast and good enough for game data.
 *
 * @param seed - The seed; only its low 32 bits count.
 * @returns The stream of that seed.
 * @throws RangeError when `int` gets a range that is not two integers in order, or `pick` an empty list
 *   (thrown by the stream, not by this call).
 * @example
 * ```ts
 * createRng(1).next(); // 0.6270739405881613
 * ```
 *
 * @public
 */
export function createRng(seed: number): RandomSource {
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

/**
 * Stable 32-bit hash of a text (FNV-1a).
 *
 * @param text - The text.
 * @returns The hash, from 0 to 2^32 - 1.
 *
 * @public
 */
export function seedFrom(text: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

/**
 * Derives an independent seed for one purpose of a run, e.g. `deriveSeed(seed, "order", tick)`. Different parts
 * yield unrelated streams.
 *
 * @param seed - The run seed.
 * @param parts - The labels of the purpose.
 * @returns The derived seed.
 *
 * @public
 */
export function deriveSeed(seed: number, ...parts: readonly (string | number)[]): number {
	return seedFrom([String(seed >>> 0), ...parts.map(String)].join(":"));
}

/**
 * Shorthand for `createRng(deriveSeed(seed, ...parts))`.
 *
 * @param seed - The run seed.
 * @param parts - The labels of the purpose.
 * @returns The stream of the derived seed.
 *
 * @public
 */
export function rngFor(seed: number, ...parts: readonly (string | number)[]): RandomSource {
	return createRng(deriveSeed(seed, ...parts));
}
