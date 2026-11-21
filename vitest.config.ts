// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** One Vitest configuration for the workspace. Tests live inside their package and run offline. */
import { BaseSequencer, type TestSpecification } from "vitest/node";
import { defineConfig } from "vitest/config";

/** `--sequence.shuffle.tests` on the command line: the tests inside each file are shuffled, the files are not. */
const TESTS_ONLY = process.argv.some((arg) => arg === "--sequence.shuffle.tests" || arg.startsWith("--sequence.shuffle.tests="));

/**
 * The packed-install gate (M6-08) packs what the build wrote, so the tests' lane, which does not wait for the build,
 * leaves it out; `pnpm check:pack` names it on the command line and runs it alone after the build (`13-m6-spec.md` 2.2).
 */
const PACKED_INSTALL = "scripts/gates/packed-install.test.ts";
const PACKED_ALONE = process.argv.some((arg) => arg.endsWith(PACKED_INSTALL));

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
 * `--sequence.shuffle.files`, or `--sequence.shuffle`, which shuffles the tests inside each file as well) the files of
 * each set come in an order drawn from the seed: that shows that no file depends on what another file left in its
 * worker (`isolate: false` below). The standing checks still start first, so that no long file starts last. Vitest
 * hands a custom sequencer neither the files flag nor a seed of its own, so a given seed is what asks for the shuffle
 * here, and the command line is read for the one flag that keeps the files in their order: `--sequence.shuffle.tests`
 * shuffles only the tests inside each file. `pnpm check` runs that with a seed of the head commit (M6-15): the files
 * keep the order whose time and memory the check measured, while a shuffle of the files can give one worker more
 * than its heap of 384 MB (seed 892574724 at `04fed25c`, a live heap of 378 MB after a full collection).
 */
class StandingFirst extends BaseSequencer {
	override async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
		const { shuffle, seed } = this.ctx.config.sequence;
		const given = Number.isFinite(seed) && !TESTS_ONLY ? seed : undefined;
		const drawn = given ?? (shuffle && !TESTS_ONLY ? Date.now() : undefined);
		if (drawn !== undefined) console.log(`test files shuffled with --sequence.seed=${String(drawn)}`);
		const sorted = drawn === undefined ? await super.sort(files) : files;
		const [standing, rest] = [sorted.filter((file) => STANDING.test(file.moduleId)), sorted.filter((file) => !STANDING.test(file.moduleId))];
		return drawn === undefined ? [...standing, ...rest] : [...shuffled(standing, drawn), ...shuffled(rest, drawn)];
	}
}

export default defineConfig({
	resolve: { conditions: ["development"] },
	ssr: { resolve: { conditions: ["development"] } },
	test: {
		include: ["{packages,mechanics,games,samples,apps}/*/{src,test}/**/*.test.ts", "scripts/**/*.test.ts"],
		exclude: ["**/node_modules/**", "**/dist/**", ...(PACKED_ALONE ? [] : [PACKED_INSTALL])],
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
