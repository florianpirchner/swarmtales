# salt-market-04a-003-v2-s42-stopped

The first attempt of v2 seed 42 (rules as in [salt-market-04a-002-v2-s41](../salt-market-04a-002-v2-s41/)). **Stopped**
after 2 of 4 games (minute 20) when the cloud container restarted; seed 42 was run again in full as
[salt-market-04a-004-v2-s42](../salt-market-04a-004-v2-s42/). Cost 0.138 USD (from the usage events); reporter 0.0043 USD.

| Game | Points (A01-A04) | No trade (idle) | Total | Optimum | Gain over idle | Contracts filled |
|---|---|---:|---:|---:|---:|---:|
| 1 | 44, 44, 64, 46 | 152 | 198 | 267 | 0.40 | 3 |
| 2 | 46, 41, 52, 27 | 152 | 166 | 267 | 0.12 | 1 |

Game 1 is the best game of v2 (three contracts). In game 3 A02 sold 2 spice from its round-3 shipment to A04 in escrow;
the bank delivered it (#2134), the first escrow against a shipment. The same seed played differently the second time
(game 1: 158 instead of 198): the models are not deterministic, so one seed is not one result.

Loopholes: none. Problems: as in the full runs; nothing of its own except the stop itself (an infrastructure event, not
a game problem).
