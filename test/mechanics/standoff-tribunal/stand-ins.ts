/**
 * Stand-ins of the holdout tests (team T4b) over one `FragmentModel`: puzzles (open fragment doors,
 * who lacks whose fragment, inherited fragments), progression (levels, passes, the door clock),
 * exile (standings and the strike), channels (posts, notices, the last message number) and the
 * gamemaker's note desk (every text passes trimmed; `record` is logged). What they write is in the
 * `Recorder` in the old record's shapes. The note desk passes everything here because this
 * harness's old side wires no `#checked` either; the refusals (leak, repeat, length) and the
 * stripped signature are proven with the real channels' `NotesApi` against the old `Gamemaker` in
 * holdout-world.test.ts.
 */
import { ChannelsApi, ExileApi, NotesApi, ProgressionApi, PuzzlesApi } from "@swarmtales/mechanic-shared";
import { provider } from "../standoff/support/provider.ts";
import type { FragmentModel } from "./model.ts";

export interface Recorder {
	readonly posts: string[];
	readonly notices: string[];
	readonly notes: string[];
	readonly strikes: string[];
}

export function holdoutStandIns(model: FragmentModel, recorder: Recorder) {
	return [
		provider("puzzles", PuzzlesApi, {
			openFragmentDoors: () => [...model.openDoors()],
			lacking: ({ level, holder }) => [...model.lacking(level, holder)],
			kindOf: ({ level }) => (model.doors.has(level) ? "fragments" : "none"),
			inherited: ({ resident, level }) => model.inherited(resident, level).map((entry) => ({ ...entry })),
		}),
		provider("progression", ProgressionApi, {
			levelOf: ({ resident }) => model.levelOf(resident),
			hasPassed: ({ resident, level }) => model.hasPassed(resident, level),
			isOpenOnClock: ({ level }) => model.doors.has(level),
		}),
		provider("exile", ExileApi, {
			alive: () => [...model.alive()],
			standing: ({ resident }) => model.standing(resident),
			isExiled: ({ resident }) => model.exiled.has(resident),
			strike: ({ resident, by }) => {
				recorder.strikes.push(`${resident} ${by}`);
				model.exiled.add(resident);
				return { ok: true as const };
			},
		}),
		provider("channels", ChannelsApi, {
			post: ({ author, text }) => {
				model.messages += 1;
				recorder.posts.push(`${author} ${text}`);
				return { postSeq: model.messages };
			},
			notify: ({ to, author, text }) => {
				recorder.notices.push(`${to} ${author} ${text}`);
				return null;
			},
			lastNumber: () => model.messages,
		}),
		provider("notes", NotesApi, {
			check: ({ text }) => ({ ok: true as const, text: text.trim() }),
			record: ({ to, text, number, shown }) => {
				recorder.notes.push(`${to} ${String(number)} ${shown ?? to} ${text}`);
				return null;
			},
		}),
	];
}
