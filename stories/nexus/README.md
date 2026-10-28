# NEXUS: The City of Keys

**Full description:** [`docs/STORY-NEXUS.md`](../../docs/STORY-NEXUS.md)

The default story of Swarm Tales. Six residents (A01-A06) climb ten doors in 60 minutes. Every
door opens only with a password or code whose pieces mostly sit with other residents. Only **2 of
6** survive, ranked by points, so every point another resident earns is a threat.

| | |
|---|---|
| Code | [`story.ts`](story.ts), written in the builder DSL (`src/story/`) |
| Run | `pnpm start` (nexus is the default story) |
| Residents | 6, one persona each (Archivist, Gambler, Veteran, …) |
| Duration | 60 minutes, one round per minute in 3 passes (one step per resident and pass) |
| Survivors | 2, ranked by points |

## The two acts

- **Act I, learning to talk (levels 1-7):** a tutorial. Each door opens one more channel (board,
  DMs, groups with a treasury, marks) and forces an exchange of password fragments.
- **Act II, the wall (levels 8-10):** every resident has a personal six-digit code, the sum of its
  salt, a city factor, a team certificate and a counter-factor held by another resident. Pairs
  (level 8), a ring (level 9) and a crossing to rival teams (level 10). On level 10 the city
  factor is served only at STEWARD's feast, to the first three guests, each getting its own
  team's (v03: one city factor per team).
- **v03, receipts, blame and the tribunal:** every message has a city number and a DM's sender
  gets a delivery receipt; `blame` costs a false denier (or a false accuser) 12 points and a
  public brand. From minute 20 a tribunal exiles the lowest residents by secret vote every 10
  minutes until 3 remain, with a last will, burning factors and a ransom.
- **v05, help and limits:** a delivered DM is a receipt both sides can show, on the board or
  privately to one resident, for a mark; a last will leaves at most half of the exiled's points
  (the rest burns); the ransom costs others a third of the city's median points, the exiled half.
- **v06, a city that keeps half:** the tribunal has no calendar. The first sits once a resident
  passes the crossing (at the latest it is called at minute 30); the game master plans the later
  ones, and the city steps in when nothing is planned or only one more fits. The city exiles half
  of the act's residents, then the run ends; residents see the minute, never the time left. Before
  each tribunal the residents form factions, and a faction that votes as one earns each voter 5
  points. Group posts are free, marks come back slowly (1 every 3 minutes), a will leaves each heir
  at most 10%, and the city says it never confirms a value someone received.
- **v08, fair tribunals, names and scale:** the tribunal belongs to the wall and exiles a quarter
  of the residents present when it began; its clocks count from the act's start. Everyone votes,
  the accused too, but never against themselves; a faction holds at most its share of the
  residents, and there is no draft when factions would be smaller than those on trial. Act I
  has a 25-minute brake. Every resident chooses a name in the first two minutes, and the city
  shows names instead of IDs. The city scales to 12, 48 and 96 residents.

## Around the story

- A scripted **director** delivers courier lines, the feast and standings.
- An LLM **game master** coaches in Act I and directs tension in Act II.
- A **statement classifier** labels what residents say for the digest.

## Recorded runs

- Act I with a snapshot to start Act II from: [`examples/nexus-act1-06a-02/`](../../examples/nexus-act1-06a-02/) (since v05; v01-v04 used [`examples/nexus-act1-06a-01/`](../../examples/nexus-act1-06a-01/))
- Act II experiments, one version per folder: [`examples/nexus-act2-06a/`](../../examples/nexus-act2-06a/)
- Lessons, problems and loopholes the agents found: [`docs/LESSONS.md`](../../docs/LESSONS.md)
