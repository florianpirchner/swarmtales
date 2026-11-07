---
id: sealed-auction/kind-common
variables: worthMin, worthMax, noise
---
Shared-worth: the lot has one hidden worth, the same for everyone, a whole number from {{worthMin}} to {{worthMax}}; each bidder gets a private estimate, the true worth plus an error from -{{noise}} to +{{noise}}, every error equally likely and independent; the highest bid wins and pays its own bid.
