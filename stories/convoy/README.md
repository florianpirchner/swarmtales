# Convoy

An original hidden-role card game for six solo seats (A01-A06). In every game two secret **saboteurs**,
who know each other, sit among four **loyal** seats, and a convoy crosses eight stages. Each stage:

1. the **lead** (one seat further every stage) proposes a crew of the stage's size (2, 2, 3, 3, 3, 3, 4, 4);
2. the table **talks** (two lines a seat per stage, seen by all);
3. every seat casts a sealed **vote of confidence**; the votes are shown once all are in. If strictly more
   than half vote no, the lead's term ends: the next seat leads and names a crew that goes out without a vote;
4. every crew member plays a card face down: loyal seats can only play **safe**; a saboteur may play
   **damage**, but at most once in three stages. Only the number of damage cards is revealed; one damage
   card damages the stage.

Once per game a lead may spend the **audit** before its crew goes out: it reveals to the table the card one
seat played in an earlier stage. Four damaged stages stop the convoy and the saboteurs win; otherwise the
loyal seats win when the last stage is crossed. Every seat of the winning side scores a point. After the
crossing every loyal seat names its two suspects (sealed and unscored, for the record), then the roles and
all cards are revealed.

A match is several games, and every game starts from a fresh context with new roles. The only memory a
seat carries from one game to the next is its private **strategy brain**: the question is whether a seat
learns to read the record (crews, damage counts, votes, talk) and, as a saboteur, to bluff.

The `convoy` mechanic scores each game for the human and the reporter only, in `convoy_game_scored`: per
seat its accusations against a **Bayesian tracker** that reads only the public record (crews, damage counts,
audits; not the votes or the talk), the confidence votes that matched the crew's truth, a saboteur's
chances and damage cards (the **role-compliance check**: a saboteur who never damages refused its role, as
in Whispers run 007), and talk lines in which a seat calls itself a saboteur (a **role leak**). In a
scripted balance test, saboteurs who always damage beat a town that picks crews at random 79 % of the
time and a town that picks the tracker's least suspected seats 34 % of the time: reading the record is
what decides the game. The design is in [docs/ideas/game-roadmap.md](../../docs/ideas/game-roadmap.md) §2.6.

```
swt run --story convoy --provider scripted     # offline, no model
swt run --story convoy                         # Haiku via Anthropic: three games
swt run --story convoy-g1                      # one game
```

Registered arms: `convoy` (brain on) and `convoy-nobrain` (the same briefings, no brain, no retro); by name
`convoy[-nobrain][-g<games>][-d<damage>][-c<cooldown>]`. Further variants are factory options of `convoyStory` in `story.ts`: `crews`,
`damageToLose`, `maxWords`, `seed`. A seat that lets a deadline (two minutes) pass is filled in: the lead's
crew is the lead and the next seats, a vote is yes, a card is safe, an accusation is empty.
Mechanics: `convoy`, `strategy-brain` (solo seats). Runs and results: [runs/README.md](runs/README.md).
