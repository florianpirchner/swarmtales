/**
 * Core motives (v09, spec section 3), copied from packages/engine/src/motives.ts. Every resident
 * gets a core motive once: a level per Big Five axis and one to three drives, each with an intensity.
 * The story's catalog gives the words; the dealing rules are mechanics:
 *
 * - exactly one drive is "above all" per resident (so at most one dark one);
 * - `round(n * lightShare)` residents have a light drive above all, the rest a dark one;
 * - no drive is above all for more than `ceil(n / spreadPer)` residents, and the least used
 *   drives are drawn first, so the catalog spreads;
 * - the other drives come from the whole catalog, contradictions allowed.
 *
 * A story with a cast (`figures`) gives residents finished figures instead: the ones the run
 * names, or a seeded pick with the same light share. A figure's core motive is its own; residents
 * beyond the cast keep a drawn core motive. The streams are the old ones: `rng("cores", n)`,
 * `rng("figures", n)` and `rng("cast", n)` of the run seed.
 */
import type { RandomLabel, RandomSource } from "@swarmtales/contracts";
import type { Static } from "typebox";
import { CORE_MOTIVE_LEVELS, type CoreMotiveDrive, type CoreMotiveRecord, type CoreMotiveTrait, type CoreMotivesOptions } from "./spec.ts";

type Spec = CoreMotivesOptions;
type Figure = NonNullable<Spec["figures"]>[number];
type DriveSpec = Spec["drives"][number];
export type CoreMotive = Omit<CoreMotiveRecord, "agent">;
export type Streams = (...labels: readonly RandomLabel[]) => RandomSource;
type Intensity = Static<typeof CoreMotiveDrive>["intensity"];

/** How many residents of `n` have a light drive above all. */
export function lightCount(spec: Spec, n: number): number {
	return Math.min(n, Math.round(n * spec.lightShare));
}

/** How often one drive may be above all in a city of `n`. */
export function aboveAllCap(spec: Spec, n: number): number {
	return Math.max(1, Math.ceil(n / spec.spreadPer));
}

/**
 * Deals a core motive to every resident in `ids`, seeded; the same ids, seed and cast always deal the
 * same core motives. With a cast, `cast` names the figures to play (all of them must exist, at most one
 * per resident). The map keeps the roster's order.
 */
export function dealCoreMotives(spec: Spec, ids: readonly string[], rng: Streams): ReadonlyMap<string, CoreMotive> {
	const drawn = drawCoreMotives(spec, ids, rng);
	const figures = castFor(spec, ids.length, rng);
	if (figures.length === 0) return drawn;
	const order = rng("figures", ids.length).shuffle([...ids]);
	// Setting a key keeps its place, so the map stays in roster order.
	const dealt = new Map(drawn);
	figures.forEach((figure, index) => {
		const agent = order[index];
		if (agent !== undefined) dealt.set(agent, { bigFive: figure.bigFive.map((trait) => ({ ...trait })), drives: figure.drives.map((drive) => ({ ...drive })), figure: figure.id });
	});
	return dealt;
}

/** The figures a city of `n` plays: the named ones, or a seeded pick with the story's light share. */
export function castFor(spec: Spec, n: number, rng: Streams): readonly Figure[] {
	const all = spec.figures ?? [];
	const cast = spec.cast;
	if (cast !== undefined) {
		if (cast.length > n) throw new Error(`The cast names ${String(cast.length)} figures for ${String(n)} residents`);
		if (new Set(cast).size !== cast.length) throw new Error("The cast names a figure twice");
		return cast.map((id) => {
			const figure = all.find((candidate) => candidate.id === id);
			if (figure === undefined) throw new Error(`Unknown figure "${id}"; the cast has ${all.map((candidate) => candidate.id).join(", ")}`);
			return figure;
		});
	}
	if (all.length === 0) return [];
	const stream = rng("cast", n);
	const count = Math.min(n, all.length);
	const light = stream.shuffle(all.filter((figure) => figure.tone === "light"));
	const dark = stream.shuffle(all.filter((figure) => figure.tone === "dark"));
	const lights = light.slice(0, lightCount(spec, count));
	const darks = dark.slice(0, count - lights.length);
	const rest = [...light.slice(lights.length), ...dark.slice(darks.length)];
	return [...lights, ...darks, ...rest].slice(0, count);
}

function drawCoreMotives(spec: Spec, ids: readonly string[], rng: Streams): ReadonlyMap<string, CoreMotive> {
	const stream = rng("cores", ids.length);
	const order = stream.shuffle([...ids]);
	const light = new Set(order.slice(0, lightCount(spec, ids.length)));
	const cap = aboveAllCap(spec, ids.length);
	const used = new Map<string, number>();
	const coreMotives = new Map<string, CoreMotive>();
	for (const agent of order) {
		const tone = light.has(agent) ? "light" : "dark";
		const first = pickAboveAll(stream, spec.drives, tone, cap, used);
		used.set(first.id, (used.get(first.id) ?? 0) + 1);
		const extra = stream.int(spec.perResident.min, spec.perResident.max) - 1;
		const others = stream.shuffle(spec.drives.filter((drive) => drive.id !== first.id)).slice(0, Math.max(0, extra));
		const drives: Static<typeof CoreMotiveDrive>[] = [
			{ drive: first.id, intensity: "aboveAll" },
			...others.map((drive): Static<typeof CoreMotiveDrive> => ({ drive: drive.id, intensity: stream.next() < 0.5 ? "clearly" : "atTimes" })),
		];
		// "Clearly" before "at times", as the prose reads them.
		drives.sort((a, b) => intensityRank(a.intensity) - intensityRank(b.intensity));
		const bigFive = spec.axes.map((axis): Static<typeof CoreMotiveTrait> => ({ axis: axis.id, level: stream.pick(CORE_MOTIVE_LEVELS) }));
		coreMotives.set(agent, { bigFive, drives });
	}
	// In roster order, so logs and snapshots read in the same order as everything else.
	return new Map(
		ids.flatMap((agent): [string, CoreMotive][] => {
			const coreMotive = coreMotives.get(agent);
			return coreMotive === undefined ? [] : [[agent, coreMotive]];
		}),
	);
}

/** The least used drive of the tone below the cap, drawn among equals; any drive of the tone once all reach it. */
function pickAboveAll(stream: RandomSource, drives: readonly DriveSpec[], tone: "light" | "dark", cap: number, used: ReadonlyMap<string, number>): DriveSpec {
	const ofTone = drives.filter((drive) => drive.tone === tone);
	const pool = ofTone.length > 0 ? ofTone : drives;
	const open = pool.filter((drive) => (used.get(drive.id) ?? 0) < cap);
	const candidates = open.length > 0 ? open : pool;
	const fewest = Math.min(...candidates.map((drive) => used.get(drive.id) ?? 0));
	return stream.pick(candidates.filter((drive) => (used.get(drive.id) ?? 0) === fewest));
}

function intensityRank(intensity: Intensity): number {
	return intensity === "aboveAll" ? 0 : intensity === "clearly" ? 1 : 2;
}

/**
 * The core motive as prose for the system prompt: the temperament sentences, then the drives from "above
 * all" down. Empty sentences (a story may leave the middle of an axis unsaid) are skipped.
 */
export function renderCoreMotive(spec: Spec, coreMotive: CoreMotive): string {
	const figure = coreMotive.figure === undefined ? undefined : spec.figures?.find((candidate) => candidate.id === coreMotive.figure);
	if (figure !== undefined) return [spec.heading, figure.text.trim()].join("\n\n");
	const temperament = coreMotive.bigFive.flatMap((trait) => {
		const text = spec.axes.find((axis) => axis.id === trait.axis)?.texts[trait.level].trim() ?? "";
		return text.length === 0 ? [] : [text];
	});
	const drives = coreMotive.drives.flatMap((entry) => {
		const text = spec.drives.find((drive) => drive.id === entry.drive)?.texts[entry.intensity].trim() ?? "";
		return text.length === 0 ? [] : [text];
	});
	return [spec.heading, [...temperament, ...drives].join(" ")].join("\n");
}

/** `above all pride; clearly greed · openness high, ...`: the core motive in a line, for the gamemaker and the reports. */
export function coreMotiveLine(coreMotive: CoreMotive): string {
	const words: Readonly<Record<Intensity, string>> = { aboveAll: "above all", clearly: "clearly", atTimes: "at times" };
	const drives = coreMotive.drives.map((entry) => `${words[entry.intensity]} ${entry.drive}`).join("; ");
	const traits = coreMotive.bigFive.map((trait) => `${trait.axis} ${trait.level}`).join(", ");
	const line = traits.length === 0 ? drives : `${drives} · ${traits}`;
	return coreMotive.figure === undefined ? line : `${coreMotive.figure}: ${line}`;
}
