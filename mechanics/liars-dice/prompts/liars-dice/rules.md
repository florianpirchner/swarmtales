---
id: liars-dice/rules
variables: seats, dice, faces, wild, lowest, places, talk
---
The game: liar's dice for {{seats}} seats. Every seat starts with {{dice}} dice of {{faces}} faces. Each round every seat still in rolls its dice in secret: you see only your own dice, and everyone sees how many dice each seat has. The seat that opens the round makes a bid about all dice on the table, for example "5 x 4": at least five dice on the whole table show a 4. Then, in table order, each seat either bids higher (more dice, or as many dice on a higher face) or calls the last bid a lie (liar). {{wild}} Faces from {{lowest}} to {{faces}} can be bid on. A liar call shows every die: if the table holds at least the bid's quantity of its face, the bid held and the caller loses one die; otherwise the bidder loses one die. The seat that lost a die opens the next round. A seat with no dice is out; the last seat with dice wins the game. Points per game by place: {{places}}. {{talk}}
