/**
 * `oracles/checksums.txt`: the SHA-256 of every oracle file and story definition, one per line in the format of
 * `sha256sum`, so that `cd oracles && sha256sum -c checksums.txt` verifies the set with no tool of this repository.
 * The test compares it with the files; a file changed by hand fails there without the code being run.
 */
import { createHash } from "node:crypto";
import { globSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const CHECKSUMS = "oracles/checksums.txt";

/** The oracle files and story definitions under `oracles/`, as paths relative to it, sorted. */
export function oracleFiles(root: string): readonly string[] {
	return globSync("*/{*.json,setup/*.json}", { cwd: resolve(root, "oracles") }).sort();
}

export function checksumsText(root: string): string {
	return oracleFiles(root)
		.map((file) => `${createHash("sha256").update(readFileSync(resolve(root, "oracles", file))).digest("hex")}  ${file}\n`)
		.join("");
}
