# act1-06a-001-f4g4-host-smoke-haiku-gm: the same smoke run with a Haiku gamemaker

First live run on the new host (PR #90, commit 64fd5fd), 6 residents, 15 minutes, seed 7, everything
on `claude-haiku-5-5` via Anthropic, including the gamemaker (`--gamemaker-provider anthropic
--gamemaker-model haiku`), `--no-reporter --budget 1`. Cost 0.125 USD, 275 requests. The residents
reached level 11 (A05, 144 points). `swt log verify`: chain intact over 2536 lines.

## Loopholes

None looked for.

## Problems

- **P75: all 14 gamemaker looks failed.** The provider answered 400 `max_tokens: 393216 > 128000`. A
  gamemaker overridden to another model keeps the story's token setting (393216, made for DeepSeek;
  `choiceOf` in `apps/cli/src/main.ts` keeps `maxOutputTokens`). The overseer failed open as
  designed: 14 `gamemaker_error` events, the run went on without a gamemaker. The old engine did
  the same (same `choiceOf`); this is not a regression of the rewrite.

## Solutions

Proposed, not built: clamp the output tokens to the model's limit, or drop the story's token
setting when the model is overridden. Open. Run 002 uses the story's own gamemaker and is clean.
