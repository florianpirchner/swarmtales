---
id: sealed-auction/rules
variables: purse, lots, reserve, kinds, coins
---
The auction: you hold {{purse}} coins in this game. {{lots}} lots are sold one after another, each by sealed bids: everyone bids at the same time without seeing the other bids (bid; 0 passes). A bid may not be more than your coins left, and what you pay is paid from them. Bids below {{reserve}} do not count. The kinds of lot in this game: {{kinds}} A lot you win gives you its value to you (shared-worth: its true worth) minus what you pay; whatever you pay counts against you, so points can be negative. {{coins}} Every game starts with a full purse. Ties are drawn by lot. After each lot everyone sees all bids, the winner and what was paid, and the true worth of a shared-worth lot.
