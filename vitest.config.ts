// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** One Vitest configuration for the workspace. Tests live inside their package and run offline. */
import { BaseSequencer, type TestSpecification } from "vitest/node";
import { defineConfig } from "vitest/config";

/** The standing checks play a game again and again: the longest test files. */
const STANDING = /\/test\/standing(-[a-z]+)?\.test\.ts$/;

/**
 * The files in an order drawn from the seed (a Fisher-Yates shuffle on a linear congruential generator), as Vitest's
 * own sequencer does under `--sequence.shuffle`, which a custom sequencer replaces.
 */
function shuffled(files: readonly TestSpecification[], seed: number): TestSpecification[] {
	const order = [...files];
	let state = seed >>> 0;
	for (let index = order.length - 1; index > 0; index -= 1) {
		state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
		const other = state % (index + 1);
		const current = order[index];
		const picked = order[other];
		if (current !== undefined && picked !== undefined) {
			order[index] = picked;
			order[other] = current;
		}
	}
	return order;
}

/**
 * Starts the standing checks first, so that no long file starts last. Vitest runs the longest files first only when
 * it has their durations from an earlier run; a fresh clone has none and runs the files in the order of the glob
 * (M4-71). Within each of the two sets the order is Vitest's own. With `--sequence.seed` (and
 * `--sequence.shuffle.files`, or `--sequence.shuffle`, which shuffles the tests inside each file as well) every file
 * comes in an order drawn from the seed: that shows that no file depends on what another file left in its worker
 * (`isolate: false` below). Vitest hands a custom sequencer neither the files flag nor a seed of its own, so a given
 * seed is what asks for the shuffle here.
 */
class StandingFirst extends BaseSequencer {
	override async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
		const { shuffle, seed } = this.ctx.config.sequence;
		if (shuffle || Number.isFinite(seed)) {
			const drawn = Number.isFinite(seed) ? seed : Date.now();
			console.log(`test files shuffled with --sequence.seed=${String(drawn)}`);
			return shuffled(files, drawn);
		}
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
		// A worker keeps its modules from one file to the next (M5-103): most of the collect time was every file
		// loading the workspace's sources again. No test may depend on a fresh module: a test that stubs a global, the
		// environment or the timers restores them after itself, and the one file that mocks a module loads what it
		// mocks afresh and drops it again (`apps/cli/test/resumed-fixture.test.ts`).
		isolate: false,
		// A worker that lives through many files keeps the garbage of all of them until its heap is full: without a
		// limit three workers held 3.4 GB beside lint's 4.4 GB, over the 6 GB of the check. 384 MB leaves room over
		// the 240 MB that a worker holds after a full collection at the end of the suite (M5-103).
		poolOptions: { forks: { execArgv: ["--max-old-space-size=384"] } },
		sequence: { sequencer: StandingFirst },
	},
});
