// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * A RunSource over runs packed next to the page: `runs/index.json` names the packs (`{ title, packs: { "<pack>.json":
 * [paths] } }`), and each pack is one JSON object of path to text, fetched once on the first read of one of its files.
 * One file per run keeps a private copy of the viewer to a handful of files. The script of the old platform that
 * wrote the packs is not carried yet; a public build of the page never has them.
 */
import { joinPath, memorySource, type RunSource } from "@swarmtales/viewer-core";
import { Type } from "typebox";
import { Check } from "typebox/value";
import type { FetchFn } from "./github-source.ts";

const BundleIndex = Type.Object({ title: Type.String(), packs: Type.Record(Type.String(), Type.Array(Type.String())) });
const Pack = Type.Record(Type.String(), Type.String());

/** The runs packed next to the page. */
export interface Bundle {
	readonly title: string;
	readonly source: RunSource;
}

/** A source over packs of runs that are fetched on the first read. */
export function bundledSource(base: string, packs: Readonly<Record<string, readonly string[]>>, fetchFn: FetchFn): RunSource {
	const packOf = new Map<string, string>();
	for (const [pack, files] of Object.entries(packs)) for (const file of files) packOf.set(joinPath(file), pack);
	const listing = memorySource(Object.fromEntries([...packOf.keys()].map((file) => [file, ""])));
	const loaded = new Map<string, Promise<Readonly<Record<string, string>>>>();
	const load = (pack: string) => {
		let texts = loaded.get(pack);
		if (texts === undefined) {
			texts = (async () => {
				const response = await fetchFn(`${base}/${encodeURIComponent(pack)}`);
				if (!response.ok) throw new Error(`The page answered ${String(response.status)} for ${pack}`);
				const body: unknown = await response.json();
				if (!Check(Pack, body)) throw new Error(`${pack} has an unexpected shape`);
				return body;
			})();
			loaded.set(pack, texts);
		}
		return texts;
	};
	return {
		list: (dir) => listing.list(dir),
		async readText(path) {
			const file = joinPath(path);
			const pack = packOf.get(file);
			if (pack === undefined) return undefined;
			return Object.entries(await load(pack)).find(([key]) => joinPath(key) === file)?.[1];
		},
	};
}

/** The bundle next to the page, or undefined when there is none (the usual case). */
export async function loadBundle(base: string, fetchFn: FetchFn): Promise<Bundle | undefined> {
	try {
		const response = await fetchFn(`${base}/index.json`);
		if (!response.ok) return undefined;
		const body: unknown = await response.json();
		if (!Check(BundleIndex, body)) return undefined;
		return { title: body.title, source: bundledSource(base, body.packs, fetchFn) };
	} catch {
		return undefined;
	}
}
