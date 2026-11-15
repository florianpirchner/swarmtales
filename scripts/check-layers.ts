// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `pnpm check:layers`: the import rules that no compiler enforces. The rules are in `layers/rules.ts`, the table in
 * `layers/table.ts`, the explanation in `docs/LAYERS.md`.
 */
import { checkLayers } from "./layers/rules.ts";
import { readRootTools, readWorkspace } from "./layers/workspace.ts";

const packages = readWorkspace();
const offences = checkLayers(packages, readRootTools());
for (const offence of offences) console.error(`layers: ${offence}`);
if (packages.length === 0) console.error("layers: no workspace package found; nothing was checked");
if (offences.length > 0 || packages.length === 0) process.exitCode = 1;
else console.log(`layers: ${packages.length} package(s), no offence`);
