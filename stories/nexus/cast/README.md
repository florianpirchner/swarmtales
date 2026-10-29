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

## Direction sections (the six of the first cast)

The six figures of the first cast are written out at length (a memory, a fear, a secret) and carry
five more sections that steer what they do, not only who they are: **In brief** (two or three
sentences), **Tendencies**, **Orders**, **Duty** (one move per act) and **Rivals** (`- <figure>:
text`, about other figures of the cast). These sections are cut from the figure's text and reach
the prompts only when a run turns the dial up (`--figure-direction 6`, `8` or `10`, see the SPEC's
"Direction"); at the default 4 a figure plays its (now longer) text without them. They break the promise above on
purpose: they exist to find out how much steering strong drama needs.

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
