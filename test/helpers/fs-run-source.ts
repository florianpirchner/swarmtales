/** A `RunSource` over the repository's files, for the viewer-core tests (the viewer itself never reads `node:fs`). */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { RunSource } from "@swarmtales/viewer-core";

export function fsRunSource(root: string): RunSource {
	return {
		list(dir) {
			const path = join(root, dir);
			if (!existsSync(path) || !statSync(path).isDirectory()) return Promise.resolve([]);
			return Promise.resolve(readdirSync(path, { withFileTypes: true }).map((entry) => ({ name: entry.name, kind: entry.isDirectory() ? ("dir" as const) : ("file" as const) })));
		},
		readText(path) {
			const file = join(root, path);
			return Promise.resolve(existsSync(file) && statSync(file).isFile() ? readFileSync(file, "utf8") : undefined);
		},
	};
}
