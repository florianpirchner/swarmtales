// SPDX-License-Identifier: Apache-2.0
import type { RunSource } from "@swarmtales/viewer-core";

/** A source the user chose, with the name to show in the top bar. */
export interface Opened {
	readonly source: RunSource;
	readonly title: string;
}
