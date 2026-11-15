// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** One Vitest configuration for the workspace. Tests live inside their package and run offline. */
import { BaseSequencer, type TestSpecification } from "vitest/node";
import { defineConfig } from "vitest/config";

/** The standing checks play a game again and again: the longest test files. */
const STANDING = /\/test\/standing(-[a-z]+)?\.test\.ts$/;

/**
 * Starts the standing checks first, so that no long file starts last. Vitest runs the longest files first only when
 * it has their durations from an earlier run; a fresh clone has none and runs the files in the order of the glob
 * (M4-71). Within each of the two sets the order is Vitest's own.
 */
class StandingFirst extends BaseSequencer {
	override async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
		const sorted = await super.sort(files);
		return [...sorted.filter((file) => STANDING.test(file.moduleId)), ...sorted.filter((file) => !STANDING.test(file.moduleId))];
	}
}

export default defineConfig({
	resolve: { conditions: ["development"] },
	ssr: { resolve: { conditions: ["development"] } },
	test: {
		include: ["{packages,mechanics,games,samples,apps}/*/{src,test}/**/*.test.ts", "scripts/**/*.test.ts"],
		exclude: ["**/node_modules/**", "**/dist/**"],
		testTimeout: 30_000,
		maxWorkers: "50%",
		sequence: { sequencer: StandingFirst },
	},
});
