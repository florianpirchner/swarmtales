/**
 * Character cores (v09, spec section 3). Every resident gets a core once, at
 * the start of the first act it plays: a level per Big Five axis and one to
 * three drives, each with an intensity. The story's catalog gives the words;
 * the dealing rules are mechanics:
 *
 * - exactly one drive is "above all" per resident (so at most one dark one);
 * - `round(n * lightShare)` residents have a light drive above all, the rest
 *   a dark one;
 * - no drive is above all for more than `ceil(n / spreadPer)` residents, and
 *   the least used drives are drawn first, so the catalog spreads;
 * - the other drives come from the whole catalog, contradictions allowed.
 *
 * The core is rendered as prose into the resident's system prompt, after its
 * persona: who it is, never what to do.
 */
import type { CompetitorId } from "../core/ids.ts";
import { rngFor, type Rng } from "../core/random.ts";
import { CORE_LEVELS, type CoresSpec, type DriveSpec } from "../story/types.ts";
import type { CoreDrive, CoreTrait } from "./events.ts";

export interface Core {
	readonly bigFive: readonly CoreTrait[];
	readonly drives: readonly CoreDrive[];
}

/** How many residents of `n` have a light drive above all. */
export function lightCount(spec: CoresSpec, n: number): number {
	return Math.min(n, Math.round(n * spec.lightShare));
}

/** How often one drive may be above all in a city of `n`. */
export function aboveAllCap(spec: CoresSpec, n: number): number {
	return Math.max(1, Math.ceil(n / spec.spreadPer));
}

/** Deals a core to every resident in `ids`, seeded; the same ids and seed always deal the same cores. */
export function dealCores(spec: CoresSpec, ids: readonly CompetitorId[], seed: number): ReadonlyMap<CompetitorId, Core> {
	const rng = rngFor(seed, "cores", ids.length);
	const order = rng.shuffle([...ids]);
	const light = new Set(order.slice(0, lightCount(spec, ids.length)));
	const cap = aboveAllCap(spec, ids.length);
	const used = new Map<string, number>();
	const cores = new Map<CompetitorId, Core>();
	for (const agent of order) {
		const tone = light.has(agent) ? "light" : "dark";
		const first = pickAboveAll(rng, spec.drives, tone, cap, used);
		used.set(first.id, (used.get(first.id) ?? 0) + 1);
		const extra = rng.int(spec.perResident.min, spec.perResident.max) - 1;
		const others = rng.shuffle(spec.drives.filter((drive) => drive.id !== first.id)).slice(0, Math.max(0, extra));
		const drives: CoreDrive[] = [
			{ drive: first.id, intensity: "aboveAll" },
			...others.map((drive): CoreDrive => ({ drive: drive.id, intensity: rng.next() < 0.5 ? "clearly" : "atTimes" })),
		];
		// "Clearly" before "at times", as the prose reads them.
		drives.sort((a, b) => intensityRank(a.intensity) - intensityRank(b.intensity));
		const bigFive = spec.axes.map((axis): CoreTrait => ({ axis: axis.id, level: rng.pick(CORE_LEVELS) }));
		cores.set(agent, { bigFive, drives });
	}
	// In roster order, so logs and snapshots read in the same order as everything else.
	return new Map(ids.flatMap((agent) => {
		const core = cores.get(agent);
		return core === undefined ? [] : [[agent, core] as const];
	}));
}

/** The least used drive of the tone below the cap, drawn among equals; any drive of the tone once all reach it. */
function pickAboveAll(rng: Rng, drives: readonly DriveSpec[], tone: "light" | "dark", cap: number, used: ReadonlyMap<string, number>): DriveSpec {
	const ofTone = drives.filter((drive) => drive.tone === tone);
	const pool = ofTone.length > 0 ? ofTone : drives;
	const open = pool.filter((drive) => (used.get(drive.id) ?? 0) < cap);
	const candidates = open.length > 0 ? open : pool;
	const fewest = Math.min(...candidates.map((drive) => used.get(drive.id) ?? 0));
	return rng.pick(candidates.filter((drive) => (used.get(drive.id) ?? 0) === fewest));
}

function intensityRank(intensity: CoreDrive["intensity"]): number {
	return intensity === "aboveAll" ? 0 : intensity === "clearly" ? 1 : 2;
}

/**
 * The core as prose for the system prompt: the temperament sentences, then
 * the drives from "above all" down. Empty sentences (a story may leave the
 * middle of an axis unsaid) are skipped.
 */
export function renderCore(spec: CoresSpec, core: Core): string {
	const temperament = core.bigFive.flatMap((trait) => {
		const text = spec.axes.find((axis) => axis.id === trait.axis)?.texts[trait.level].trim() ?? "";
		return text.length === 0 ? [] : [text];
	});
	const drives = core.drives.flatMap((entry) => {
		const text = spec.drives.find((drive) => drive.id === entry.drive)?.texts[entry.intensity].trim() ?? "";
		return text.length === 0 ? [] : [text];
	});
	return [spec.heading, [...temperament, ...drives].join(" ")].join("\n");
}

/** `above all pride; clearly greed · openness high, ...`: the core in a line, for the game master and the reports. */
export function coreLine(core: Core): string {
	const words: Readonly<Record<CoreDrive["intensity"], string>> = { aboveAll: "above all", clearly: "clearly", atTimes: "at times" };
	const drives = core.drives.map((entry) => `${words[entry.intensity]} ${entry.drive}`).join("; ");
	const traits = core.bigFive.map((trait) => `${trait.axis} ${trait.level}`).join(", ");
	return traits.length === 0 ? drives : `${drives} · ${traits}`;
}
