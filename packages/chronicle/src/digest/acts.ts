/**
 * Acts structure the digest (SPEC 13, 15). An act begins in the minute after
 * the first competitor reached its `fromLevel` and lasts until the next act
 * begins. Story validation requires the first act to start at the first
 * level, so it covers the run from minute 0. A story without acts has one
 * implicit act.
 */
import type { ActInfo } from "./event-log.ts";
import { eventsOfType, type DigestEvent } from "./event-log.ts";

export const IMPLICIT_ACT = "The run";

export interface ActSpan {
	readonly title: string;
	readonly fromMinute: number;
	/** Inclusive; the last minute of the log for the final act. */
	readonly toMinute: number;
}

export interface ActMap {
	readonly spans: readonly ActSpan[];
	actOf(minute: number): string;
}

export function mapActs(events: readonly DigestEvent[], acts: readonly ActInfo[]): ActMap {
	const lastMinute = events.reduce((highest, event) => Math.max(highest, event.minute), 0);
	const ordered = [...acts].sort((a, b) => a.fromLevel - b.fromLevel);
	if (ordered.length === 0) {
		return { spans: [{ title: IMPLICIT_ACT, fromMinute: 0, toMinute: lastMinute }], actOf: () => IMPLICIT_ACT };
	}

	const dealt = [...eventsOfType(events, "fragments_dealt"), ...eventsOfType(events, "factors_dealt")].map((event) => event.level);
	const startLevel = dealt.length > 0 ? Math.min(...dealt) : 1;
	const levelUps = eventsOfType(events, "level_up");
	/** First minute in which `level` counts as reached. */
	const reachedFrom = (level: number): number | undefined => {
		if (level <= startLevel) return 0;
		const first = levelUps.find((event) => event.to >= level);
		return first === undefined ? undefined : first.minute + 1;
	};

	const starts: { title: string; fromMinute: number }[] = [];
	ordered.forEach((act, index) => {
		const from = index === 0 ? 0 : reachedFrom(act.fromLevel);
		if (from === undefined || from > lastMinute) return;
		const previous = starts.at(-1);
		if (previous !== undefined && previous.fromMinute >= from) {
			// Two acts start in the same minute: the later one wins.
			starts.pop();
			starts.push({ title: act.title, fromMinute: previous.fromMinute });
			return;
		}
		starts.push({ title: act.title, fromMinute: from });
	});

	const spans: ActSpan[] = starts.map((start, index) => ({
		title: start.title,
		fromMinute: start.fromMinute,
		toMinute: (starts[index + 1]?.fromMinute ?? lastMinute + 1) - 1,
	}));
	return {
		spans,
		actOf: (minute) => [...spans].reverse().find((span) => span.fromMinute <= minute)?.title ?? spans[0]?.title ?? IMPLICIT_ACT,
	};
}
