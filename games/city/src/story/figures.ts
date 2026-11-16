// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Carried from `legacy` `stories/cityofkeys/cast/*.md`: the 24 finished figures of the NEXUS cast, as the old
 * `readFigures(...).map(figureSpec)` of `stories/cityofkeys/characters.ts` read them (the header as fields, the body
 * without its direction sections as `text`, the direction sections as `direction`), in file order, split into data
 * modules by size. `carried.test.ts` pins them with the rest of the story to `oracles/cityofkeys/setup/cityofkeys.story.json`.
 */
import { PART as PART_1 } from "./figures/part-1.ts";
import { PART as PART_2 } from "./figures/part-2.ts";
import { PART as PART_3 } from "./figures/part-3.ts";
import { PART as PART_4 } from "./figures/part-4.ts";
import { PART as PART_5 } from "./figures/part-5.ts";
import { PART as PART_6 } from "./figures/part-6.ts";

/** The figures of the cast (old `FigureSpec`), in file order. */
export const FIGURES = [...PART_1, ...PART_2, ...PART_3, ...PART_4, ...PART_5, ...PART_6] as const;
