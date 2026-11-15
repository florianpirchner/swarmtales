// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { defineConfig } from "tsdown";
import { libraryConfig } from "../../tsdown.base.ts";

export default defineConfig({ ...libraryConfig, entry: ["src/index.ts", "src/mechanic.ts", "src/testing.ts"] });
