/**
 * Monte Carlo reference for Ember Tricks bids: how many tricks a hand takes on average at bidding
 * time, when the other seats' cards and the trump are unknown. Offline, seeded, no model. The play
 * policy is deliberately simple (see `chooseCard`), so the number is a calibration reference and
 * not a ceiling of skill. The veto is ignored.
 */
export { expectedTricks } from "../../mechanics/trick-play/src/reference.ts";

/** The small mulberry32 generator: the same seed gives the same sequence. */
export function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
