# The NEXUS cast

Finished figures for NEXUS. Each one is built on an archetype from
[`../../../archetypes/figures/`](../../../archetypes/figures/) (`base` in the header) and adds two
sections for this story: **What you want here** (what the figure wants from the city: points, rank,
a seat at the table, the other residents) and **What you will not do** (a limit). Like every text
of the story, a figure says who someone is and what they want, never how to get it.

The cast has 24 figures, one per archetype. The game gives every resident one figure at the start
of the first act (a seeded pick with the story's quarter of light figures, or the ones the run names
with `--cast banner,house,...`), and the resident keeps it for all acts of that game. A figure plays
the persona of its profession; residents beyond the cast get a drawn core. Every resident with a
core also gets the story's frame first in its system prompt: a fictional city, played by AI agents,
where dark sides are played without softening (`stories/nexus/characters.ts`). The resident still chooses its own name in Act I; the title is
not a name.

## Direction sections (the twelve of the first and second cast)

The twelve figures of the first and second cast are written out at length (a memory, a fear, a
secret) and carry five more sections that steer what they do, not only who they are: **In brief**
(two or three sentences), **Tendencies**, **Orders**, **Duty** (one move per act) and **Rivals**
(`- <figure>: text`, about other figures of these twelve). These sections are cut from the
figure's text and reach the prompts only when a run turns the dial up (`--figure-direction 6`, `8`
or `10`, see the SPEC's "Direction"); at the default 4 a figure plays its (now longer) text without
them. They break the promise above on purpose: they exist to find out how much steering strong
drama needs. A rival reaches a prompt only when that figure plays in the run. The other twelve
figures of the cast stay short and carry no direction sections.

## The first cast: six figures for tension (Act I + II, 6 residents)

Chosen so that every figure has a natural opponent in the same city:

| Figure | Base | Drives | Profession | Pulls against |
|---|---|---|---|---|
| [The Banner](banner.md) | c08 | pride above all, leadership | firebrand | the Second Chair wants its place; the Crier wants the same square |
| [The Second Chair](second-chair.md) | c10 | envy above all, self-sacrifice at times | archivist | whoever stands first, likely the Banner |
| [The House](house.md) | c11 | machiavellianism above all, greed | gambler | the Believer, who wants the bent rules seen |
| [The Believer](believer.md) | c05 | justice above all, wrath at times | idealist | the House; anyone who wins by deceit |
| [The Crier](crier.md) | c16 | wrath above all, attention | firebrand | every slight, in public; the Banner's stage |
| [The Old Wound](old-wound.md) | c04 | vengefulness above all, loyalty | veteran | whoever votes against it first; loyal to whoever stands with it |

Five of the six have a dark drive above all, one a light one (the Believer), more than the story's
usual quarter of light figures: this cast is picked for conflict, not dealt.

## The second cast: six more figures (12 residents)

Added to the first six for a 12-resident city. Each one pairs with a figure of the first cast (and
the first six name their new counterpart in their Rivals):

| Figure | Base | Drives | Profession | Pulls against |
|---|---|---|---|---|
| [The Quartermaster](quartermaster.md) | c20 | leadership above all, control | veteran | the Banner, for the front: a list against a voice; any other hand on the reins |
| [The Question](question.md) | c17 | incorruptibility above all, distrust | skeptic | the House and its envelopes; the Ledger's figures |
| [The Last Post](last-post.md) | c12 | loyalty above all, wrath | veteran | the Old Wound's mirror: loyal to the end, terrible to whoever betrays its side |
| [The Ledger](ledger.md) | c01 | greed above all, narcissism | merchant | the House: a second merchant at the same table |
| [The Quiet Hand](quiet-hand.md) | c15 | control above all, envy at times | recluse | the Second Chair: two hands working from the back |
| [The Watcher](watcher.md) | c07 | distrust above all, anxiety | recluse | the Crier: the one who hides against the victim who wants to be seen |

Three of the six are light (the Quartermaster, the Question, the Last Post) and three dark, so the
twelve together have four light figures and eight dark ones. The light three get orders that make
conflict (command, refusal, loyalty past reason) without making them villains.
