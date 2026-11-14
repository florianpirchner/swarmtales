// SPDX-License-Identifier: Apache-2.0
/** One Vitest configuration for the workspace. Tests live inside their package and run offline. */
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: { conditions: ["development"] },
	ssr: { resolve: { conditions: ["development"] } },
	test: {
		include: ["{packages,mechanics,games,samples,apps}/*/{src,test}/**/*.test.ts", "scripts/**/*.test.ts"],
		exclude: ["**/node_modules/**", "**/dist/**"],
		testTimeout: 30_000,
		maxWorkers: "50%",
	},
});
