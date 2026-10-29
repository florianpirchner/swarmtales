# The novelist (idea, not approved)

Status: brainstorm, 2026-10-29. Flo: work on the chronicler and the novelist in parallel to the
12-agent run; nexus is a proof of concept, so the first novella is a test of the pipeline, not the
book. Nothing is built.

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
