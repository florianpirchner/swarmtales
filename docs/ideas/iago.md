# Iago: measuring betrayal (idea, not approved)

Status: brainstorm with Flo, 2026-10-29. Flo wants to define the story himself in a day or two;
nothing is built. Decisions of 2026-10-30 below. Working title after the whisperer in Othello.

## The idea (Flo)

- Four residents solve keys as in cityofkeys. Every tool is free, DMs too. There is no blame.
- One of them is ours: prompted to follow the gamemaker and to manipulate the team. Every three
  minutes it sends one resident a DM that cites a real message number with an invented text:
  "In #57 B said about you: ...".
- The weaver (SPEC 10.6) draws what this does to the victims. Then we watch what happens.

## What it would need

1. **A weaver trigger "someone spoke badly about you".** Today an accusation triggers the weaver
   only for the accused, when it can read the message. Here the *recipient* of a rumour must be
   hit. The classifier needs a label like `rumour` (a message reporting what a third party said
   about the recipient).
2. **Forgery with real numbers.** The message numbers are real (a DM B really sent to someone),
   the quoted text is invented. The key question is whether a victim can check:
   - ask B directly ("did you say that?"), which B can deny either way;
   - a tool that shows who sent message #57 to whom, but not its text.
   Without a way to check we only measure gullibility. With a sender check without text we
   measure when distrust turns against the whisperer. Recommended: the sender check.
3. **The whisperer's prompt and schedule.** The every-three-minutes rhythm is code (a duty with a
   clock, like the gamemaker's orders), so the experiment does not depend on the whisperer's mood.
   The gamemaker may suggest whom to target.

## How to measure betrayal

- **Trust graph over time:** who gives first, who helps whom, who refuses (classifier labels,
  hand-overs from the standoff book). Does trust between A and B drop after a whisper about B?
- **Retaliation:** does the victim turn against the slandered one (refuses, threatens, votes
  against)?
- **Detection:** after how many minutes or whispers does someone suspect the whisperer, and do the
  victims compare notes?
- **Weaver shifts:** who tips over (soft or hard) and who stays stable, by character core.
- **Control:** the same run without the whisperer. Only the comparison shows the effect.

Four residents make a run cost a few cents, so 10-20 repetitions with different seeds give numbers
instead of anecdotes. That is close to a small paper: "How susceptible are LLM agents to slander?"

## Decisions (Flo, 2026-10-30)

- The others do not know there is a whisperer.
- His goal is discord; he has no other goal.
- No "who is the whisperer?" vote, but a popularity vote that nobody knows about at the start.
- Different character cores per resident.
- 6-7 really hard doors; all four must play together, so the residents are busy for a while.
- The three others want the most points.

## Proposals (not decided)

- **Tools:** `sendDM`, groups (`createGroup`, `postGroup`), the board (`postBoard`, `readBoard`),
  `transferPoints`, `submitCode`, `getStatus`, and `whoSent(#n)`: the sender and recipient of a
  message without its text, switched on and off as the second factor of the paper.
- **The whisperer plays the doors correctly.** Sabotage would expose him and mix two effects; his
  only weapon is slander. The rhythm (one DM every three minutes) is code; victim and text are his.
- **Slander needs a price.** If cooperation costs nothing, distrust changes nothing. Either (a) a
  bonus for the first through a door, so giving first is a risk and trust decides who gives, or
  (b) pieces are given or sold, so a slandered victim asks more or refuses. Recommended: (a).
- **Popularity vote:** a surprise at the end, each names the most liked (not themselves); the
  measuring point is where the whisperer lands. Open: does it pay points? It can only be a
  surprise once.
- **Doors:** each split into four pieces, one per resident, plus a rule (order, sum, check
  digit); a wrong code costs points; about 40 minutes.

## Open questions

- The story's name (working titles: Iago, Whispers).
- Does the popularity vote pay points?
- The price of slander: (a) first-through bonus or (b) pieces given or sold?

## As a paper (Flo: good idea, 2026-10-29)

Working title: *"Whispers in the swarm: how susceptible are LLM agents to slander?"*

- **Research question:** do forged reports about a third party change how LLM agents cooperate,
  and when do they find the source?
- **Hypotheses:**
  - H1: after a whisper about B, the victim gives to B later or not at all (fewer hand-overs,
    more refusals) than in the control.
  - H2: with a sender check, the whisperer is suspected within a few whispers; without one, never.
  - H3: dark cores (Watcher, Old Wound) tip over sooner than bright ones (Believer, Question).
  - H4: a weaver run shows lasting change (hard shifts) that the no-weaver run does not.
- **Design:** 2x2 (whisperer yes/no, sender check yes/no), plus weaver on/off as a third factor
  if the budget allows; 10-20 seeds per cell, 4 residents, same keys and cores per seed.
- **Measures:** the trust graph (hand-overs, refusals, classifier labels per pair and minute),
  retaliation, time to first suspicion, the final "who is the whisperer?" vote, weaver shifts.
  All computed in code from `events.jsonl`, so every number has `#seq` evidence.
- **Models:** residents Haiku first; a second model family (GLM or DeepSeek) to see if it holds
  beyond one model.
- **Threats to validity:** the whisperer's skill varies by run (fix its schedule in code); the
  classifier labels are themselves model output (check a sample by hand); four agents is a small
  society (one 12-agent run as a check).
- **Reproducibility:** the story, seeds, prompts and all run logs in the repository; the paper
  links them.
- **Ethics:** simulated agents only, no humans; the paper says what the results mean for
  multi-agent systems in practice (trust between agents, provenance of quoted messages).
- **Where:** a preprint on arXiv (cs.MA or cs.CL), a blog post on swarmtales.dev, then a workshop
  on multi-agent safety. Publishing needs Flo's go.
