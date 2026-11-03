import type { SystemAuthor } from "@swarmtales/contracts";

/** Authors that are always available to a story, independent of its cast (moved out of the kernel at step 18, F2 M4). */
export const SYSTEM_AUTHORS = ["CITY", "COURIER"] as const satisfies readonly SystemAuthor[];

export function isSystemAuthor(value: string): value is SystemAuthor {
	return SYSTEM_AUTHORS.some((author) => author === value);
}
