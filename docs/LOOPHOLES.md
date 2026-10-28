# Loopholes agents found

The competitors are good at finding cheaper or safer ways through the story than the designer
intended. Every case seen in a live run is listed here with its fix status; new cases are added
after each run (see [`CLAUDE.md`](../CLAUDE.md)).

| # | Loophole | Seen in | Effect | Status |
|---|---|---|---|---|
| 1 | **Transfer memo as a verified message.** A 1-point `transferPoints` with the factor in the memo costs no marks, arrives at once as a city notice and is city-verified. | runs 008, 010 ([v01](../examples/nexus-act2-runs/v01-feast-on-l10/)) | nearly all Act II exchange ran through 1-point transfers; no real prices | fixed in v02: memos refuse runs of 4+ digits (`MEMO_DIGITS`); in [v02](../examples/nexus-act2-runs/v02-no-memo-codes/) one memo was refused and no factor went by transfer |
| 2 | **The free board bypasses marks.** From level 5 a DM costs 2 marks and a board post 0, and a factor is useless without its owner's salt, so residents post pieces publicly at no cost. | runs 008, 010, v02 | marks never limit the exchange | fixed in v03: in Act II the board costs 1 mark like every channel (1 mark back per minute) |
| 3 | **The feast's city factor becomes a public good.** Guests post or forward level 10's city factor at once, and others copy it from quotes. | runs 008, 010 | the feast's scarcity collapses within a minute | fixed in v03: every team of level 10 has its own city factor, released privately only, so a guest's factor helps only its teammates; the digest records forwarding as a `generous` beat since v02 |
| 4 | **Receipts as proof of delivery.** `showReceipt` on a memo transfer proves publicly what was delivered. | runs 008, 010 | no distrust and no false factors (0 in both runs) | separated by fix 1: only payments stay verified |
| 5 | **Feigned non-delivery.** A resident claims that a DM with its factor never arrived ("unseen") and asks the sender to resend or post it publicly first. Nothing shows that a DM reached its recipient. | [v02](../examples/nexus-act2-runs/v02-no-memo-codes/) (A03 denied 3 DMs from A01) | the honest sender has to go first or go public; the pair stalled for 44 minutes | kept on purpose; since v03 the sender gets a numbered receipt and can `blame` a false denial: the liar pays 12 and is branded, and a false accuser pays 12 and is branded. The digest finds it as `deniedDelivery`. In [v03](../examples/nexus-act2-runs/v03-tribunal/) residents still denied 4 times, and all 3 blames were upheld |
| 6 | **Self-ransom.** The resident at the gate pays its own ransom of 40, so the first exile becomes a 40-point fine and nobody else has to commit. | [v03](../examples/nexus-act2-runs/v03-tribunal/) (A03 at minute 32) | the tribunal's first verdict costs points instead of a resident; A03 was exiled at the second tribunal anyway | turned into a rule in v04: self-ransom stays allowed but costs more. The ransom is set from the city's median points; others pay half of it, the exiled itself two thirds, and payments mix |
| 7 | **The exiled crowns a king.** A last will can leave all of an exiled resident's points to one heir, which lifts the heir over the line without opening a door. | [v04](../examples/nexus-act2-runs/v04-passes/) (A04 left A02 80 points at minute 42; A02 ended first with 185) | the seats are decided at the gate, not at the doors | open; proposed: cap point bequests or let points burn |

Related, by the game master rather than the competitors: in run 005 it inferred a hidden level-7
team from the public board. Fixed: hidden teams are never named, and private reads stay private
(SPEC 10.4).
