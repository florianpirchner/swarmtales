/** One chapter of the novel's outline (the planner's plan for it). */
export interface OutlineChapter {
	/** 1-based. */
	readonly number: number;
	/** The POV resident's ID, or GAMEMAKER_POV for a chapter from the control room. */
	readonly pov: string;
	readonly title: string;
	readonly from: number;
	readonly to: number;
	readonly beats: readonly string[];
	/** The chapter's dramatic question, when the planner gave one. */
	readonly question?: string;
	/** Known `seq` numbers, ascending. */
	readonly evidence: readonly number[];
}
