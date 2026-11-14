// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from "tsdown";
import { libraryConfig } from "../../tsdown.base.ts";

export default defineConfig({ ...libraryConfig, entry: ["src/index.ts", "src/contract.ts", "src/rules.ts"] });
