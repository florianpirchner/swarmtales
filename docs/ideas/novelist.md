# The novelist

Status: first version built, 2026-10-29 (`pnpm novel`, see "As built" below). Flo: work on the
chronicler and the novelist in parallel to the 12-agent run; nexus is a proof of concept, so the
first novella is a test of the pipeline, not the book.

## What we have

- **The log** (`events.jsonl`): every message, tool call, thought (`thinking`), vote, will, the
  gamemaker's notes and thinking, and soon the weaver's `fate_shift`.
- **The digest** (`pnpm digest`): beats (alliances, double games, broken promises, exiles, wills,
  ultimatums, city pieces, fate shifts), relationships per pair, a timeline.
- **The chronicle** (`pnpm digest --chronicle`): a factual summary per act with `#seq` evidence,
  written by a model (018: about 800 words). It is a record, not prose.
- **Characters:** the cast figures (memory, fear, secret, voice lines), cores, secret goals, and
  with the weaver the changes they went through.

## The pipeline (proposal)

1. **Casting the book.** From the digest, pick three or four point-of-view figures: the ones with
   the most beats, a turn (fate shift, betrayal suffered) and an ending (seat, exile, will). The
   rest stay side figures.
2. **Outline.** A strong model gets the chronicle, the beats and the POV figures' dossiers and
   writes an outline: parts = acts, chapters = scenes, each scene with its POV, the `#seq` it
   rests on and what changes in it. A guard checks that every scene cites real events.
3. **Scene packs.** For each chapter, code gathers the raw material: the messages exchanged, the
   POV figure's thoughts at those minutes (its inner monologue), the board around it, its figure
   text (voice lines, fear, secret), and its fate shifts so far.
4. **Chapters.** The model writes each chapter from its pack, in the figure's voice. "Based on
   true events": it may compress and dramatise, never invent an outcome (who passed, who was
   exiled, who lied must match the log).
5. **Edit pass.** One pass over the whole text for continuity (names, numbers, who knows what
   when) and rhythm; it lists contradictions with the log.
6. **Appendix.** For each chapter, the `#seq` it rests on, so a reader can check the story
   against the run.

## Options

- **Point of view:** rotating close third person (one POV per chapter, like ensemble novels) or
  one first-person narrator. Recommended: rotating third person; it fits a swarm.
- **Length:** a novella per act (15-30k words) or one short story per run (5-8k words).
  Recommended for the first test: a short story from run 019 or the 12-agent run.
- **Language:** English first (the repo is English), a German translation as a second pass.
- **Model:** the residents' thoughts are Haiku; the prose needs a stronger writer (Sonnet or Opus
  via Anthropic, or a cheap long-context model for the outline). A 6k-word short story costs well
  under 1 USD with Sonnet.
- **The gamemaker's thoughts:** use them as a second layer ("the city's game makers", like the
  Hunger Games control room) in interludes between chapters, or leave them out so the figures
  stay the only voices.

## What the chronicler needs for this

- One chronicle per act (it has that) plus a **per-figure thread**: everything one figure did,
  said, thought and suffered, in order, with `#seq`. The digest has the pieces (beats,
  relationships); a `figure` view would gather them.
- Thoughts marked by strength (the classifier's labels plus length) so the novelist can pick the
  telling ones instead of all 300.

## Open questions

- First test on which run: 019 (6 agents, much happens) or the coming 12-agent run?
- Short story or novella per act?
- Rotating third person or one narrator?
- Gamemaker interludes, yes or no?
- Sonnet or Opus for the prose?

## As built

Flo approved: rotating close third person, one short story per run (default 6,000 words), English,
gamemaker interludes yes, Sonnet for the prose. `pnpm novel <run-dir>` (code in `src/novel/`,
SPEC 15 "Novelist") writes `<run>/novel/story.md`, `outline.json`, `appendix.md` and
`packs/NN.md`.

1. **Casting** (`casting.ts`, code): every resident is scored by the turning points it is part of
   (3 each), its beats (1 each), its messages (0.05 each, at most 3), plus 3 for rank 1 and 2 for
   the last rank. The cast takes the winner, a loser (the highest-scoring exiled resident, else the
   last) and someone with a turn, then fills up by score: 4 figures from six residents on, else 3.
2. **Outline** (`outline.ts`, DeepSeek V4.1 Flash via OpenRouter, thinking high, 64k output):
   JSON chapters `{pov, title, minutes, beats, evidence}`. Validation drops unknown `seq`, chapters
   with a POV outside the cast (an ID or a name is accepted) or no known evidence, and every chapter
   beyond twice the planned count (each one is a writer call); `"#123"` strings count as seq
   numbers. Uncovered turning points are warnings in the appendix.
3. **Scene packs** (`packs.ts`, code, 30k characters of material per chapter): the POV's thinking
   and messages, the gamemaker's notes to it, the board, the city's verified facts in the window
   and the cited events; board lines and facts not about the POV are dropped first. A secret fact
   is shown only to those who know it: votes (and, to the exiled, the votes against it), bloc
   results, faction refusals, payments, privately shown receipts and city factors, secret
   signatures, and another resident's fate shifts. The dossier
   holds the figure text from `cast/<ID>-<figure>.md` (from "Who you are" up to the direction), the
   core, the secret goals and the fate shifts so far. IDs become names.
4. **Chapters** (`writer.ts`, Sonnet via Anthropic, thinking low, 24k output per call): outline,
   pack, the previous chapter's last paragraphs. Headings and IDs that slip into the prose are
   removed (IDs replaced by names, with a warning).
5. **Interludes**: before each later chapter, from the `gamemaker_thinking` events in that
   chapter's minutes (each thought used once); set in italics between `* * *`.
6. **Edit pass** (64k output): the full text and the outline; the answer is the corrected text, a
   delimiter line and the contradictions. An edit that changes headings or the `* * *` lines of the
   interludes or shrinks the text below 70% is not taken (warning). A failed edit or interlude keeps
   the rest (warning); a failed chapter leaves the chapters so far in `story.partial.md`.
7. **Appendix** (code): per chapter the outline's and the pack's `seq`, turning points told and
   untold, interlude sources, contradictions, warnings, and tokens and USD per stage.

Not built yet: the per-figure thread view in the digest, thoughts ranked by strength (packs keep
the POV's thoughts in order and cut by budget), a German translation, a novella per act.
