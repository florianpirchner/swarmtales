/** Replies of the new core's tool pipeline (packages/kernel/src/host/replies.ts), one per refusal code, and the core's own tools. */
export const CORE_PROMPTS = {
	"replies/core/unknown-tool": [],
	"replies/core/not-granted": [],
	"replies/core/locked": [],
	"replies/core/inactive": [],
	"replies/core/limit": [],
	"replies/core/steps": [],
	"replies/core/too-long": [],
	"replies/core/guard-none": [],
	"replies/core/guard-failed": [],
	"replies/core/decision-closed": [],
	"replies/core/decision-not-held": [],
	"replies/core/decision-human": [],
	/** The core's own tools and their replies (docs/design/overseer-api.md §3). */
	"core/tools/amendDecision": [],
	"core/replies/decision-amended": ["decision", "proposal"],
} as const;
