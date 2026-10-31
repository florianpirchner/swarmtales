/** Replies of the new core's tool pipeline (packages/kernel/src/host/replies.ts), one per refusal code. */
export const CORE_PROMPTS = {
	"replies/core/unknown-tool": [],
	"replies/core/not-granted": [],
	"replies/core/locked": [],
	"replies/core/inactive": [],
	"replies/core/invalid-arguments": [],
	"replies/core/limit": [],
	"replies/core/steps": [],
	"replies/core/too-long": [],
	"replies/core/guard-none": [],
	"replies/core/guard-failed": [],
} as const;
