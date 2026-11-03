#!/usr/bin/env node
/**
 * `swt` (alias `swarmtales`): the one binary. It names a command and hands the rest of the command
 * line to it, so `swt run --story whispers` is `pnpm start --story whispers`. The noun-and-verb
 * command set of docs/ideas/monorepo.md §3c lives in `swt/commands.ts`.
 */
import { execute } from "./swt/commands.ts";
import { processIo } from "./swt/io.ts";

process.exitCode = await execute(process.argv.slice(2), processIo);
