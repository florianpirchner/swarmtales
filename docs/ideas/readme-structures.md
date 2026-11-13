# Three structures for a README with many games

Status: **idea, for Flo to choose** (2026-11-12). Nothing in the README is changed yet. Earlier README
discussions and drafts are left aside on purpose; this paper starts from the repository as it is on
`main` today and from [CROSS-GAME-FINDINGS.md](../CROSS-GAME-FINDINGS.md).
Each option is written out as a full README draft: [A](readme-drafts/A-lab-report.md), [B](readme-drafts/B-arcade.md), [C](readme-drafts/C-construction-kit.md).

## 1. Why the README has to change

The README still says "Two stories ship with the platform" and shows only City of Keys and Whispers.
The repository now has **15 stories** on about 40 mechanics, about 120 recorded runs, and a cross-game paper:

| Family | Stories | What they test |
|---|---|---|
| Societies (open-ended, with overseers) | City of Keys, Whispers | trust, deception, exile, the gamemaker |
| Board games, all information public | chess, nine men's morris, tic-tac-toe teams | calculation, teams of the same model, engine references |
| Hidden information and bluff | Hold'em, Liar's Dice, Convoy | reading others, lying, hidden roles |
| Cooperation under hidden information | Harbor Lights, Lanterns | conventions, clues, plans |
| Markets, bids and economics | Econ Lab, Salt Market, Blind Bid, Quarry, Ember Tricks | fairness, free riding, negotiation, valuation |

And the platform now has a result that no single story could give: across the games, **information at
the moment of the decision** is the one lever that moved results everywhere, while the strategy brain
as a memory almost never did (CROSS-GAME-FINDINGS, digest highlights).

The README has to answer three readers at once: the **researcher** (what can I learn here?), the
**curious reader** (what did the agents do?) and the **builder** (how do I write my own story?). The
three structures below differ in which reader they put first.

All three keep the same tail, so that part is not repeated below: *Install and run*, *Honest limits*,
*For builders* (links into `docs/`), *License*.

---

## 2. Option A: "The lab report" (findings first)

**Idea:** the README opens with what we found across the games, and the games appear as the test bed
of those findings. Swarm Tales reads as a research instrument with results, not a promise.

### Outline

1. **Title and one-line claim.** "A laboratory for AI agents: 15 games and societies, one engine,
   every word and thought on record."
2. **What we found across 15 games** (5-6 bullets, each with a number and a link). Information at the
   decision beats memory (chess ACPL 138 to 78, Hold'em EV loss 0.26 to 0.03); the brain writes the
   right lesson and does not play it; a plan written before game 1 helps (Harbor +3.2); a team of the
   same model is a second look at 3.4 times the calls; the brain carries social norms (econ lab free
   riding, Lanterns clue code); a stronger model is game-specific (Opus wins dice honestly, Sonnet worse
   than Haiku). Link: the full paper.
3. **The test bed: the games** — one table, grouped by family (see §1), one line per game: what it is,
   what question it answered, best number, link to the story README and its runs.
4. **What the agents did** — three or four moments only (City of Keys, Whispers, one from a game such
   as the Haiku whisperer who refused the role, the Hold'em Opus seat).
5. **How it works in one picture** — residents, mechanics, overseers, the signed log, seeds, snapshots,
   dials (today's "What it is" and "What researchers get", merged and cut by half).
6. Tail (install, limits, for builders, license).

### How a game appears

```markdown
| Game | What it is | What it showed | Runs |
|---|---|---|---|
| [Chess](stories/chess/) | two seats, moves as text, Stockfish as the judge | a legal-move list plus loose pieces lifts Haiku to Sonnet level at 4-8 % of the cost | [44 runs](stories/chess/runs/) |
```

### Pros and cons

- \+ The strongest new content (the cross-game result) is on top; a researcher sees in 30 seconds why
  the platform is worth a look.
- \+ Every game earns its place by a question it answered, which also shows what is *not* known yet.
- \+ Short: the game table replaces 15 sections.
- − The findings go stale with every series; the top of the README needs an update after each paper
  revision (mitigation: a date in the heading and only results marked firm).
- − The drama (moments, loopholes) moves down; a casual reader may stop at a table of numbers.
- − Puts claims on the front page; with 8-12 seeds per comparison they are honest but small.

---

## 3. Option B: "The arcade" (games first)

**Idea:** the README is a gallery of the games. Each game is a short card with a picture-like line, one
memorable moment and one finding. The platform is explained after the reader is hooked.

### Outline

1. **Title and pitch.** "Fifteen games and societies played by AI agents, every move and every
   private thought on record."
2. **Pick a game** — a compact index: the five families as headings, game names as links to the cards
   below.
3. **The games** — one card per game (15 cards, 5-7 lines each), in family order. The two societies
   first and slightly longer.
4. **How the agents beat the rules** — the loophole highlights, now across games (City of Keys,
   Whispers, chess LH13, the Hold'em and tic-tac-toe tricks), with a link to the lessons log.
5. **What the games taught us together** — 3 bullets from CROSS-GAME-FINDINGS and the link.
6. **What it is** — residents, mechanics, overseers, the log (today's section, shorter).
7. Tail.

### How a game appears

```markdown
### Liar's Dice
*Bluffing with hidden dice, four seats.* · [story](stories/liars-dice/) · [runs](stories/liars-dice/runs/)

Every seat rolls in secret and bids on the dice of the whole table. Opus won 8 of 12 games at a Haiku
table by playing honestly; Sonnet played worse than Haiku.
> "…one quoted line from the run…" ([#seq](…))
```

### Pros and cons

- \+ The most inviting for a first-time reader; each game is a small story, close to the current
  "What the agents did" tone that works.
- \+ A natural place for one moment and one loophole per game, so the drama of the small games becomes
  visible (today only the two societies have it).
- − Long: 15 cards are 100-120 lines before the platform is even explained. On GitHub most readers will
  not reach "What it is".
- − Every card needs a good quoted moment with a `#seq`; several games (morris, Quarry, Salt Market)
  have numbers but no memorable scene yet, so cards will be uneven.
- − The README turns into a catalogue that grows with every new game; it fights the CLAUDE.md rule
  that shipped stories are "references only".

---

## 4. Option C: "The construction kit" (platform first)

**Idea:** the README explains the platform through its building blocks, and the games are worked
examples of how blocks combine. The catalogue of games moves into its own page, `docs/GAMES.md`.

### Outline

1. **Title and claim.** "A platform for games and societies of AI agents: pick mechanics, add
   overseers, record everything."
2. **What it is** — story, residents, mechanics, overseers, log (today's section, kept).
3. **One engine, fifteen stories** — a matrix: rows are the games, columns are the shared mechanics
   that matter (`strategy-brain`, `team-channel`/`consensus`, `card-table`, a referee or engine,
   `whispers`/`tribunal`), each cell a dot. It shows at a glance that a chess story and a negotiation
   story are the same 3-5 blocks in a different order.
4. **Three levers you can switch on** — strategy brain, teams, referee information, each with the one
   cross-game result that belongs to it and the flag or story name to try it.
5. **What researchers get** — signed log, seeds, snapshots, dials, viewer (today's section, plus the
   run viewer).
6. **What the agents did** — four moments across the stories.
7. Tail; "For builders" gets a first line *All games, with their rules and runs: docs/GAMES.md*.

`docs/GAMES.md` then holds the full catalogue: one section per game with rules in brief, story names
and arms (`-nobrain`, `-aid`, `-solo`), cost per run, results and the runs index link.

### How a game appears (in the README)

```markdown
| Story | Mechanics | Brain | Teams | Referee |
|---|---|:-:|:-:|:-:|
| [Harbor Lights](stories/harbor-lights/) | `hint-towers`, `card-table` | ● | crew | chance per slot |
```

### Pros and cons

- \+ Matches the project's own direction: a slim kernel, all mechanics as plugins, stories as
  references. It sells the platform, not this month's experiments.
- \+ Scales: the 16th game is one matrix row in the README and a section in `docs/GAMES.md`.
- \+ The "three levers" section turns the cross-game findings into something a builder can use.
- − The coolest material (moments, findings) sits in the middle; the top is abstract.
- − A mechanics matrix means little to a reader who does not know the mechanics yet.
- − Needs a new page (`docs/GAMES.md`) that has to be kept in sync with `stories/index.ts`.

---

## 5. Side by side

| | A: lab report | B: arcade | C: construction kit |
|---|---|---|---|
| First reader | researcher | curious reader | builder |
| On top | cross-game findings | the games as cards | the building blocks |
| Games shown as | one table with a finding per game | 15 cards with a moment each | a mechanics matrix + `docs/GAMES.md` |
| Length (README) | about 150 lines | about 250 lines | about 170 lines + new page |
| Upkeep per new game | one table row | one card (needs a good moment) | one matrix row + one GAMES.md section |
| Upkeep per new finding | top section | small | the levers section |
| Risk | reads dry | too long, uneven cards | reads abstract |

## 6. Recommendation

**Option A, with one piece of C:** findings on top, the games as one grouped table, and the full
per-game catalogue moved to `docs/GAMES.md` so the README stays short. It matches the positioning the
README already has ("a laboratory for AI societies"), uses the strongest new result we have, and keeps
upkeep to one table row per game. The moments stay, cut to four, right after the table, so the drama is
still above the fold for a reader who scrolls once.

Open questions for Flo:

1. Which reader comes first: researcher (A), curious reader (B) or builder (C)?
2. Should the two societies (City of Keys, Whispers) stay in a class of their own, or be two rows among
   fifteen?
3. Is `docs/GAMES.md` as a separate catalogue page welcome (needed for A+C and C)?
4. Findings on the front page: only results marked firm (paired, SE), or also the "not firm" ones with
   a label?
