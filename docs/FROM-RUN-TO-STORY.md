# From a run to a story

How a recorded run becomes a chronicle and a short story, explained without writer's jargon.
The technical details are in [SPEC section 15](SPEC.md) and [HOW-IT-WORKS](HOW-IT-WORKS.md#novelist).

## The picture: a film cut from surveillance footage

A run of the city leaves a log (`events.jsonl`): every message, every thought of every resident,
every vote, payment and exile, and the gamemaker's own thoughts. That log is the raw footage.
Nothing in the story may happen that is not in the footage; the work is choosing, ordering and
telling.

## Two products

| | Chronicle | Short story |
|---|---|---|
| Command | `pnpm digest <run> --chronicle` | `pnpm novel <run>` |
| What it is | a factual record of the run, a few paragraphs per act | a story "based on true events", 5-8k words |
| Voice | a neutral chronicler | close to one figure per chapter |
| Evidence | every sentence cites `#seq` lines of the log | an appendix lists the lines each chapter rests on |
| File | `run/digest/chronicle.md` | `run/novel/story.md` |

## Building blocks

- **Beats** are small moments between residents that code finds in the log, each with its
  evidence: an alliance, a free ride (used someone's piece and never answered), a vote against a
  teammate, an accusation, an ultimatum, a piece bought from the city, a last will. A model adds two
  kinds code cannot see: a broken promise, and a double game (thinks one thing, writes another).
- **Turning points** are the bigger moments that change who stays in the city and who wins: the
  black seal won and broken, an ultimatum someone paid rather than hand over, an exile, a ransom, a
  last will, a secret goal that held, the final ranking. Code reads them from the log
  ([`src/digest/turning-points.ts`](../src/digest/turning-points.ts)), so the list is always
  complete, costs nothing and is the same every time. Both the chronicle and the story must tell
  every one of them, and code checks that they did.

## The story in five roles

1. **Casting (code).** Who gets a point of view? Code scores every resident (3 points per turning
   point they are part of, 1 per beat, a little for messages, a bonus for first and last place) and
   picks a mix: the winner, a loser, someone with a turn, then the next by score. Three or four
   figures.
2. **Outline, the script (DeepSeek Flash, thinking high).** The model gets the chronicle, the turning
   points and the cast, and decides the chapters: for each one whose eyes it is told through, which
   minutes it covers and what changes in it. Code then checks the script: every cited event must
   exist, every chapter must belong to a cast figure, and every turning point should be covered.
3. **Scene packs (code).** For each chapter, code gathers from the log exactly what that figure
   lived through in those minutes: its own thoughts (its inner monologue), the messages it sent and
   received, the board, the gamemaker's notes to it, the city's facts it could know (its own vote,
   not the others'), and its figure text from the cast (memory, fear, secret, voice). A pack never
   holds another resident's private thoughts or secret votes. The packs are saved as
   `run/novel/packs/NN.md`, so every chapter can be read against what its writer saw.
4. **Chapters, shooting the scenes (DeepSeek Flash).** One request per chapter, with its pack, the
   script and the end of the previous chapter. The writer may compress, dramatise and add gesture
   and weather, but may not invent an outcome: who passed a door, paid, lied or was exiled must
   match the pack.
5. **Edit, the final cut (Claude Sonnet).** A cheap model writes the draft, a strong one line-edits it:
   one pass over the whole text that rewrites weak sentences, replaces raw key codes, and keeps continuity and rhythm,
   checked against the turning points; it replaces leftover game words and lists contradictions it
   found, which go into the appendix.

Before the chapters stands a **prologue**: the city, its law and its stakes, written from what every
resident was told at the start, so a reader knows the world before the first scene. The script also
carries a **glossary** that turns game words into words of the story's world (a counter-factor
becomes "the other half of a key", points become "marks on the city's ledger"); every writer gets it.
With `--translate de` the writer also translates the finished story, part by part; when Anthropic
refuses a part, DeepSeek translates it (LESSONS P56).

Two or three chapters are told from the **Gamemaker's control room**, like the head gamemaker and
his staff in The Hunger Games: he wants a show, and the residents do not always play. His arc is
planned like any figure's (a goal, an obstacle, a turn), and his chapters may show the same hours
as a resident's chapter, from above. His small team are real parts of the city, each with traces in
the log: the **Courier** delivers his notes (signed COURIER) and brings back the residents'
refusals, the **Guard** stops a note that would pass on someone's private thoughts
(PRIVATE_BLOCKED), and the **Scribe** reads every resident's words and files how they sound
(hesitation, threat, lie). The team speaks only what the material carries; where his thinking
weighs two courses, two of them may argue them. DeepSeek writes these chapters even when Claude
writes the rest: the Gamemaker thinks with DeepSeek, and Anthropic refuses to retell another
model's reasoning (LESSONS P55).

Between the chapters stand the **city's records**: short official documents computed in code from
the log, never written by a model, so every number is exact. A deadline writ says who held what,
the deadline and the penalty, and how it ended; the sale of the black seal lists the sealed bids;
a tribunal gives the ballots and the ransom; a last will is quoted as it was read at the gate; the
closing ledger lists the private aims that held and the final standing. At most three stand
between two chapters (the weightiest), and they go in after the edit pass so no model can change
them.

At the end, an **appendix** lists for every chapter the events it rests on, the turning points it
told, the editor's contradictions and the cost of each stage.

## An example

The first story, [*The Quiet Hand and the Last Ledger*](../stories/nexus/runs/act2-12a-003-f10g10-director/run/novel/story.md),
comes from run [act2-12a-003](../stories/nexus/runs/act2-12a-003-f10g10-director/) (5335 words,
0.44 USD). Casting picked Hedda (winner), Lucien (loser), Stentor (turn: the seal) and Archivist
(two ultimatums paid). The script:

| Chapter | Point of view | Title | Minutes |
|---:|---|---|---|
| 1 | Archivist | The Envelope in the Door | 6-13 |
| 2 | Lucien | The House Never Gives First | 11-25 |
| 3 | Hedda | The Quiet Hand | 14-31 |
| 4 | Archivist | The Price of a Word | 16-31 |
| 5 | Stentor | The Man on the Fountain | 18-49 |
| 6 | Hedda | The Last Ledger | 42-49 |

Where a line comes from, in chapter 1: Archivist's old bribe in the archive room is his figure
text; "I hold your counter-factor: 383529 ... Your figures were always reliable" is Ledger's real
message; his paying 10 points instead of handing over is ultimatum 1 in the log.

Writing rules every prose step shares: scenes instead of summaries, dialogue from the real messages,
show rather than tell, no game words, numbers only where they hurt, no moral at the end.

## Models and cost

| Step | Model | Cost in the example |
|---|---|---:|
| Chronicle | DeepSeek V4.1 Flash via OpenRouter, thinking high | under 0.01 USD |
| Outline | DeepSeek V4.1 Flash via OpenRouter, thinking high | 0.01 USD |
| Chapters, edit (first version) | Claude Sonnet via Anthropic, thinking low | 0.43 USD |
| Draft (now) | DeepSeek V4.1 Flash via OpenRouter, thinking low | 0.03 USD |
| Line edit, translation (now) | Claude Sonnet via Anthropic, thinking low | 0.19 USD, translation 0.26 USD |

The second version of the example with the sharpened prompts: DeepSeek as writer, 8032 words for
0.12 USD including the German translation, and Sonnet, 5656 words for 0.43 USD plus 0.18 for the
translation (see the [run's README](../stories/nexus/runs/act2-12a-003-f10g10-director/)). The
fourth version, [*The Quiet Hand at the Gate*](../stories/nexus/runs/act2-12a-003-f10g10-director/run/novel-gamemaker/story.md),
is the first with the Gamemaker's chapters and the city's records (7373 words, 0.23 USD plus 0.26
for German).

`--provider/--model` and `--outline-provider/--outline-model` choose other models; `--out` writes to
another folder so two writers can be compared; `--translate <lang>` adds a translation; `--words` sets
the length; `--dry-run` shows the cast and the size of the script prompt without calling a model.
