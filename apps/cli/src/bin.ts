// SPDX-License-Identifier: Apache-2.0
/** The entry of the `swt` program: one command, its exit code. */
import { main } from "./main.ts";

process.exitCode = await main(process.argv.slice(2));
