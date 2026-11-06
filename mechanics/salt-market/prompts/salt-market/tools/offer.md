---
id: salt-market/tools/offer
variables: 
---
Make an offer through the bank, to one trader or to all: what you give now (give), what you want now (get), and optionally goods you deliver later by the end of a later round (later, with round, and escrow true to have the bank hold and deliver them for a fee; otherwise it is a promise you keep with give). Counts by good, for example give {"cloth": 2}, get {"spice": 1, "salt": 1}. A counter-offer is a new offer. You must hold what you give now (and escrowed goods, tax and fee).
