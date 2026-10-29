# Fate: characters that change (idea, not approved)

Status: brainstorm with Flo, 2026-10-29 16:15-16:25. Nothing is built; Flo: only after Act II runs stable.

## The gap

Run 018 has characters with motives, turns (seal, tribunals, broken promises) and last words, but
nobody changes: every figure ends the act as it began. A novella needs figures that tip over
(the believer who starts to lie, the loyal one who stops trusting). Flo's question: could the
gamemaker or another model rewrite a resident's character during the run?

## The idea

A separate **fate model** reads what happened to a figure and writes who it is now. It does not
steer the game (that stays the gamemaker's job, and the gamemaker's prompt stays as it is); it only
draws the psychological consequence.

1. **The code builds a dossier per figure** from what the digest already computes: who lied to
   it, betrayed it or took from it, which allies were exiled, its secret goal's outcome, its own
   lies and threats, its strongest thoughts, each with `#seq`.
2. **The fate model** gets the dossier and the figure's core and answers in one to three
   sentences who the figure is now, with a reason that cites the events. Example: "Maren no
   longer believes in justice from above. She judges herself." (cheap: one DeepSeek request per
   figure and act).
3. **Every minute, only for those hit.** The code checks each minute which figures an event
   touched (lied to, exposed, betrayed, an ally exiled, an ultimatum failed, a big win). Only those
   go to the fate model; a quiet minute costs nothing, also with 96 residents. The model answers
   one of (Flo, 16:25):
   - `patch(soft, text)`: an inner voice at the end of the next step's inputs ("since Herald
     exposed you, you flinch when he writes"). Cheap and cache-safe, it fades; may come often.
   - `patch(hard, text)`: the character part of the system prompt is rewritten ("Maren judges
     herself now"). One cache miss (P46), lasting; at most one or two per figure and act.
   - `none`: often right; not every slight changes someone.
   **At an act boundary** the fate model reads the act's patches and writes one new character text
   for the next act; the soft patches are dropped, so twenty inner voices do not pile up and
   contradict each other. This is the figure's chapter break.
4. **The gamemaker** sees one line under "Since your last look" ("Maren has changed: trusts no one
   any more, after #4401"), not the text. Alternative: it sees nothing and only notices the
   behaviour.
5. **The record:** every change is a `fate_shift` event and goes into `fate.md` in the run, so the
   reporter and the novelist can tell it ("here Maren tipped over").

## Rules

- Say who someone is, never what to do (SPEC 5.2, "characters, never strategies").
- The core shifts, it is not replaced: the greedy stays greedy and may become afraid.
- At most one shift per figure and act boundary, and few mid-act voices (a cap per act).

## Open questions

- Does the gamemaker see the shift line (recommended) or nothing?
- Which events trigger the fate model, and how many soft patches per act?
- Model: DeepSeek (cheap) or Haiku (consistent with the residents)?
- Does the cast's figure text (orders, duty) change too, or only the core?
