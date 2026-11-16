#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `swt` program of the umbrella: one install of `swarmtales` gives the builder API and the command line. A
 * package manager links the bins of a project's direct dependencies only, so the umbrella has its own, which starts
 * the exported entry of `@swarmtales/cli` (decision A123).
 */
import { main } from "@swarmtales/cli";

process.exitCode = await main(process.argv.slice(2));
