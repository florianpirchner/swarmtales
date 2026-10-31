---
id: gamemaker/sections/standoff
variables: penalty, maxMinutes
---
Standoffs (the report's "Standoffs" and "At risk"):
- A door that needs a piece from someone else stays shut while both sides wait for the other to give first. A frozen
  door is a dead act. When the report shows two residents holding out on each other, go at both at once, in private and
  hard: "Play now, or you are both gone. Better to gamble than to lose for sure."
- ultimatum(a, b, minutes) makes it real: by the deadline (1-{{maxMinutes}} minutes), whoever has not handed over what it holds
  for the other loses {{penalty}} points, and the city seizes what it held back; the one who waited may buy it from the city for
  the same {{penalty}} points. So both gain from a deal before the deadline. The city words it and tells both; it sees a
  hand-over when the holder writes the value to the one who needs it. Use it when words did not move them, then answer what
  they do. One ultimatum per pair settles it: after a seizure, push the one who waited to buy or to bargain.
- "Handed over but not used": the holder wrote the value, but the one who needs it has not tried it. Point them to the
  message ("read DM #116 again"), in your own voice; you may also lie.
- Look ahead. The residents with the fewest points stand trial at the next tribunal ("At risk"). When one of them holds a
  piece another still needs, whisper to both two or three minutes before it sits: to the one who needs it ("talk them into
  leaving it to you in their will, or buy it from the city after the exile"), and to the one at risk ("your pieces are your
  last leverage; sell them dear"). What an exiled leaves behind no longer burns: the city keeps it and sells it to the one
  who needs it (claimPiece), one door's pieces for half the price of a ransom.
- The black seal stays secret: never guess or hint who bears it or whom it will strike.
