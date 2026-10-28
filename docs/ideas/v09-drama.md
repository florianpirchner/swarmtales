# Idea: v09, drama (character cores, secret goals, the black seal)

Status: **idea, not approved to build.** Brainstorm with Flo on 2026-10-28 after the first runs with
12 residents ([`examples/nexus-act2-12a/v01-twelve/`](../../examples/nexus-act2-12a/v01-twelve/)).

## Why

The 12-resident Act II worked mechanically (target reached, no tied votes) but gives no material
for a novella:

- everyone wants the same thing and plays it safe;
- caution costs nothing, so most of the stuck residents had their value but never used it (P35);
- nobody has a reason to lie, so there are no secrets and no betrayals; the faction groups were a
  ritual ("I will vote my own way, in secret, no buying or selling");
- the game master never planned a tribunal (P36).

The promise stays: **the story defines the city, its rules and who the residents are, never what
they do.** Every text below says who someone is or what they want, never how to get it.

## 1. Graduated penalties (P35)

- A wrong code costs 2, then 4, 6 and 8 points, counted per resident and act (cap 8). Guessing stays
  useless: codes have 6 digits, and every door takes 2 attempts per 5 minutes.
- Blame: the false accuser and the exposed liar both pay the graduated price (2, 4, 6, ... per
  resident and act) and are branded on the board. Flo: lying should not hurt much; we want to see
  it. The brand is the real cost: a reputation others can read.
- Texts name the next price ("your next wrong code costs 4").

## 2. Game master as director (P36, P24)

- A stricter brief: its job is dramaturgy, rising tension, turning points and dilemmas; a quiet act
  is a failed act. A tension arc per act: a calm start, escalation around the seal game, the climax
  at the last tribunal.
- It knows every resident's core and goal and may use them, only privately with that resident (the
  privacy guard stays: nothing private of one resident reaches another).
- No repeated lines: "name a price" at most once per resident (P24).
- A stronger model for the game master (Haiku or Sonnet instead of DeepSeek Flash); it is only
  about 5-10% of a run's cost. Open: which model.
- While the scheduling window is open, the director's turn input names `scheduleTribunal`, the exile
  target still missing, the earliest minute and the guard rails ("if you do not plan, the city will
  at minute N").
- Measure: share of tribunals the game master planned.

## 3. Character cores

Each resident keeps its persona (role and voice) and gets a private **core**, known only to itself,
the reporter and the novella. Other residents never see it.

**Temperament:** five axes of the Big Five (openness, conscientiousness, extraversion,
agreeableness, neuroticism), each low, middle or high, seeded.

**Drives and shadows:** one to three per resident, each with an intensity in words: "above all",
"clearly", "at times". Catalog (about 25, to be refined):

| Group | Drives |
|---|---|
| The seven sins | envy, greed (nothing without something in return), pride, wrath, sloth, hoarding, hunger for attention |
| Dark triad | narcissism, machiavellianism, callousness ("you walk over corpses") |
| Fear and gloom | anxiety, melancholy (you do not believe it ends well for you), distrust, cowardice |
| Power | born leader, need for control, vengefulness |
| Light | loyalty, sense of justice, self-sacrifice, incorruptibility, care for the weak |

Mixing rules (seeded):

- at most one dark drive "above all" per resident;
- about a quarter of the city are light figures (a light drive "above all");
- contradictions inside one resident are allowed and wanted (loyal and greedy; leader and anxious);
- spread the catalog: in a city of 12 no drive appears more than twice "above all".

Example text in the system prompt:

> Above all you want to lead; others follow you, and you need them to. Clearly, envy gnaws at you
> when someone stands ahead of you. At times the fear of losing everything takes hold of you.

Depression and anxiety are character traits written with respect, not clichés.

## 4. Secret goals

At the start of each act the city gives every resident a private goal. Goals are dealt so that they
cross:

- **against each other:** A must keep C in the city, B must get C exiled;
- **economic:** end the act with more points than D; hold three values of others before giving your own;
- **social:** lead a faction twice; be named in a will;
- **matched to the core most of the time** (the envious gets "end ahead of X"), sometimes against it
  (the loyal needs a betrayal).

A fulfilled goal pays a bonus at the end of the act (proposal: +15). When a resident is exiled, the
city reads out its goal; at the end of the act it reads out all of them.

Open: may a resident tell or sell its goal? (Proposal: yes, telling is free text; the city never
confirms it.)

## 5. The black seal (permaDeath)

Decided by Flo: **true permaDeath, once per act.**

- **The game:** an official city game in each act. Proposal: a sealed-bid auction for points (who
  pays most wins; every bid is paid, win or lose), announced a few minutes ahead.
- **The holder stays secret.** The city announces only "someone now bears the black seal".
- **Use:** `permaDeath(resident)`, once. The target is struck from the register at once: no gate, no
  will, no ransom; every piece it held burns. The city names who used the seal (open: anonymous).
- **Counts toward the act's exile target**; the tribunals exile one fewer.
- **Expiry:** unused at the end of the act, the seal is gone (open: or it strikes its holder).
- **Scale:** one seal per 12 residents, in separate games.

## 6. Test plan

1. A/B on 6 residents, from the same Act I checkpoint, cores on and off: Haiku, then GLM
   (`z-ai/glm-5.3-flash` via OpenRouter, about 2.6 times Haiku's cost).
2. With 6 residents the Act II target should be a half (3 exiles), so there are tribunals besides
   the seal.
3. Measure per run: deals (transfers, prices named), threats, broken promises, lies and blames,
   and whether the classifier's labels match each resident's core.
4. Then 12, then 48.
