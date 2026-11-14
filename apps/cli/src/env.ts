// SPDX-License-Identifier: Apache-2.0
/** The one file that reads the environment of the process. It hands on only the variables it is asked for by name. */
import { KEY_VARIABLES } from "@swarmtales/models";

/**
 * The variables a live run reads: the key variables of every provider (decision A13), `SWT_PROVIDER` and `SWT_MODEL`.
 *
 * @public
 */
export const ENV_NAMES: readonly string[] = Object.freeze([...Object.values(KEY_VARIABLES).flat(), "SWT_PROVIDER", "SWT_MODEL"]);

/**
 * Reads the named variables from the environment of the process, and no other.
 *
 * @param names - The names of the variables; those of a live run when left out.
 * @returns Name to value; a variable that is not set is absent.
 *
 * @public
 */
export function readEnv(names: readonly string[] = ENV_NAMES): Readonly<Record<string, string>> {
	return Object.fromEntries(names.flatMap((name): [string, string][] => {
		const value = process.env[name];
		return value === undefined ? [] : [[name, value]];
	}));
}
