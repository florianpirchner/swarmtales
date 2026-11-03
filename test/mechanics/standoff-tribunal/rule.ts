/**
 * The holdout rule of the tests (team T4b): Whispers v3's own spec (stories/whispers/story.ts
 * `HOLDOUT`: three minutes' stall, two of grace, two per vote, three votes, one minute's fallback)
 * with its texts, read from the story so both engines run the story's numbers and words.
 */
import type { HoldoutSpec } from "@swarmtales/contracts";
import whispers from "../../../stories/whispers/story.ts";

function holdoutOf(spec: HoldoutSpec | undefined): HoldoutSpec {
	if (spec === undefined) throw new Error("the Whispers story has no holdout tribunal");
	return spec;
}

export const HOLDOUT_RULE: HoldoutSpec = holdoutOf(whispers.holdout);
