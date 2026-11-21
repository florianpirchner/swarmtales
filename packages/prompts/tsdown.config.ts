// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { defineConfig } from "tsdown";
import { LICENSE_FILE, libraryConfig } from "../../tsdown.base.ts";

// The prompt library ships in `dist/library/prompts/`, where `libraryRoot()` finds it from the built module of an
// installed package, which has no repository above it (errata K36, M6-08).
export default defineConfig({ ...libraryConfig, copy: [LICENSE_FILE, { from: "../../library/prompts", to: "dist/library" }] });
