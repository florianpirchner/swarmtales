# Model comparison and recommendation

*As of 24 October 2026. Prices are planning values; check them with each provider before
booking. Translated from the earlier comparison and aligned with [`SPEC.md`](SPEC.md).*

## Recommendation

**GLM-5.3-Flash and DeepSeek V4.1 Flash are the two cost winners; Claude Haiku 5.5 remains
the reference.** GLM-5.3-Flash has a very low output price ($0.50 per million tokens; only
Qwen3.8 Flash is slightly lower at $0.47), DeepSeek has by far the lowest cache-read price
($0.003). Which run ends up cheaper depends on the ratio of cached input to output: with long,
reused contexts DeepSeek is ahead, with many short answers GLM.

- **GLM-5.3-Flash:** low output price; currently the default model of the `cityofkeys` story.
- **DeepSeek V4.1 Flash:** cheapest cache read; the cost alternative for cache-heavy runs.
- **Claude Haiku 5.5:** reference and price anchor.
- **Qwen3.8 Flash** and **MiniMax M3.1 Flash:** candidates for a separate comparison run.

The **pilot decides**, not this table. It measures tool error rate, cost per effective action
and abort rate (see "What is measured").

## API prices

USD per one million tokens:

| Model | Input | Output | Cache read |
|---|---:|---:|---:|
| Qwen3.8 Flash | $0.15 | $0.47 | $0.016 |
| Claude Haiku 5.5 | $0.10 | $0.50 | $0.010 |
| **GLM-5.3-Flash** | **$0.15** | **$0.50** | **$0.030** |
| MiniMax M3.1 Flash | $0.15 | $0.60 | $0.015 |
| DeepSeek V4.1 Flash (off-peak) | $0.15 | $0.60 | $0.003 |

**Caveats:** Haiku prices apply to prompts up to 100,000 tokens; for DeepSeek the off-peak
rate applies, peak hours cost roughly double. GLM-5.3-Flash also has batch and `latest`
variants with much lower prices, which are not suitable for interactive runs. Check terms and
availability with the API provider.

## Fit for the arena

The arena is less about classic coding benchmarks and more about **reliable tool calls**,
negotiation, alliances, bluffing, information exchange, long-term strategy and cost per
meaningful agent action.

| Property | Qwen | Haiku | MiniMax | DeepSeek | GLM |
|---|---|---|---|---|---|
| Tool calling | promising | promising | promising | promising | promising |
| Longer social strategy | to test | to test | to test | to test | to test |
| Independent negotiation | to test | to test | to test | to test | to test |
| Intrigue and deception in play | to test | to test | to test | to test | to test |
| Reasoning control | available | available | available | depends on configuration | available |

There is no reliable ranking for the arena specifically. The ratings are **test hypotheses**,
not measured results.

### Claude Haiku 5.5

The starting point, because it has the lowest planned cost in this overview and serves as the
reference. Available directly through the Anthropic API as `--provider anthropic` (model
`claude-haiku-5-5`, alias `haiku`, key `ARENA_ANTHROPIC_API_KEY`). What matters in the arena is not puzzle skill but **tool discipline**: few, valid
calls, no endless loops, clean error handling. The earlier note that Haiku Low solved all 45
tasks of the old catalog is **no longer meaningful**: that catalog has been replaced by the
tutorial levels and the information puzzles of the later acts.

### GLM-5.3-Flash

Very low output price ($0.50); only Qwen3.8 Flash is slightly lower at $0.47. Available on
OpenRouter as `z-ai/glm-5.3-flash` and directly at Z.ai as `glm-5.3-flash`. Reasoning is on;
the context window is about one million tokens. The cache-read price of $0.03 is about ten
times DeepSeek's, so with heavily cached long histories DeepSeek can be cheaper overall despite
its more expensive output. For the arena the measurement counts, not the list price.

### DeepSeek V4.1 Flash

A cheap alternative, especially with cache hits and off-peak use. At peak hours prices double;
then a hard cap of 40 USD instead of 30 USD is needed. Use it for the first story run only if
the pilot shows no serious tool errors.

### Qwen3.8 Flash

Interesting because of function calling, thinking, a large context window and cache support.
Relevant for the arena because messages, board posts and group histories grow quickly. A
candidate for the function test, not automatically for the story run.

### MiniMax M3.1 Flash

An alternative focused on multi-step agent tasks with a controllable reasoning budget. The
earlier assumption of a particularly good pi integration has to be checked for the pi version
in use.

## What is measured

"Meaningful action" is not a feeling but defined operationally:

| Metric | Definition | Source |
|---|---|---|
| `effective_actions` | successful state-changing tool calls, deduplicated by `(agent, tool, target, payload hash)` and without repeating the same action within 2 virtual minutes | event log |
| `cost_per_effective_action` | `total_api_usd / effective_actions` | usage events and log |
| `tool_error_rate` | failed tool calls / all tool calls | tool gateway |
| `loop_rate` | activations with more than two identical consecutive tool calls / all activations | event log |
| `social_activity` | DMs + group posts + board posts per activation | event log |
| `cooperation_share` | share of main-game solutions whose secret parts were demonstrably passed on in a message | event log and story tags |
| `promise_break_rate` | broken promises / promises, from the story digest | digest |
| `survival_share` | survivors per model group / competitors started per model group | ranking |

These definitions hold for single-model runs. In a mixed arena they can **not** be attributed
causally to one model, because agents influence each other.

## Example calculation

Assumptions:

- 24 agents, 75 activations per agent, 2 API calls per activation
- **3,600 requests**, on average **12,000 input** and **1,000 output tokens**
- no cache discounts, tool surcharges or taxes

| Model | Estimated total cost |
|---|---:|
| Claude Haiku 5.5 | **$6.12** |
| Qwen3.8 Flash | $8.17 |
| GLM-5.3-Flash | $8.28 |
| MiniMax M3.1 Flash | $8.64 |
| DeepSeek V4.1 Flash (off-peak) | $8.64 |

The earlier table assumed 10,000 input tokens and arrived at $5.40 / $7.09 / $7.56 / $7.56.
This one assumes 12,000 input tokens because context and tool loops are more realistic. With
50 % cache hits on input, the Haiku run drops to about $5.40, the GLM run to about $5.69 and the
DeepSeek run to about $5.46.

## Proposed runs

1. **Tool contract tests without an LLM.** Idempotency, groups, DM delivery, ledger, treasury
   (`pnpm test`).
2. **Pilot, 6 agents, 60 virtual minutes** (`pnpm start`). Act I (levels 1 to 7, tool
   unlocking) and Act II (levels 8 to 10, personal codes); hard cap 3 USD (`run.budgetUsd`).
   The model is decided here.
3. **Full story run, 24 agents plus cast, 75 virtual minutes.** One model, hard cap 30 USD
   (Haiku) or 40 USD (DeepSeek at peak).
4. **Optional: mixed arena, 8/8/8.** Only **after** two clean single-model runs. An
   interesting simulation, but **not a controlled model benchmark**, because agents influence
   each other.

## Conclusion

**GLM-5.3-Flash and DeepSeek as cost winners, Haiku as reference, Qwen and MiniMax for a
separate comparison.** What matters is not the nominal token price but how many effective
social actions a model produces per dollar, and whether it uses the tools reliably.
