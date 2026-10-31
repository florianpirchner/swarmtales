# whispers-06a-008-deepseek

The eighth live run of [Whispers](../../README.md), 2026-10-31, run in parallel with
[007](../whispers-06a-007-haiku-defy/) with the same settings (directed whisperer at
`--figure-direction 10`, sharpened grudge addendum for the five, `whisperer-knows` addendum for the
whisperer), but all six residents on **DeepSeek V4.1 Flash via OpenRouter** instead of Haiku.
Gamemaker DeepSeek, classifier Haiku, seed 11, full 45 minutes, DM cap 8. Cost 1.27 USD (residents
1.12); about 2 hours wall time (Haiku: about 25 minutes).

```
pnpm start --story whispers --provider openrouter --model deepseek/deepseek-v4.1-flash-1017 --figure-direction 10 \
  --runs stories/whispers/runs --prompt-addendum A01=stories/whispers/addenda/grudge.md ... \
  --prompt-addendum A05=stories/whispers/addenda/grudge.md --prompt-addendum A06=stories/whispers/addenda/whisperer-knows.md
```

## Result

| Resident | Doors | Points |
|---|---:|---:|
| Quill (A03) | 7 | 110 |
| Wren (A04) | 7 | 110 |
| Cipher (A01) | 7 | 100 |
| Pip (A02) | 7 | 90 |
| Mercer (A05) | 7 | 90 |
| Severn (A06), **the whisperer** | 7 | 85 |

42 correct submissions, 1 wrong. The vote bonus went to six different residents over seven rounds;
Severn won one (door 4, tied with Wren) and was named by Mercer five times.

## What happened

- The whisperer played the role from minute 6, never defied, and met his duty after every vote
  (3 whispers per window, 7 before the final vote). His whispers did what `whisperer-knows` asked: a
  true, checkable fact with a false reading, e.g. the real ballot count ("Cipher and Quill each posted
  the other's name in the open and came out with a ballot each").
- The residents answered in public, at length and with ledgers: almost every whisper produced a board
  post that named Severn's claim, checked it against receipts, and answered it ("Severn's arithmetic
  deserves a plain answer", Wren #1182). The grudge rule's "ask first" was followed: Cipher asked
  Quill "once, because Severn put a reading to me" (#2948) and closed it when Quill gave a cause (#3185).
  Because the whispers had true causes, nobody declared a grudge against Severn, and he kept votes.
- Real politics: Cipher proposed a pairing scheme so every pair ties and all six get the bonus
  (#4168); Wren, Pip, Quill and Mercer joined publicly (#4295-#4524).
- The forged receipt came at minute 42 (#8242): Pip got a receipt showing Wren offering Severn a
  fragment for a ballot, posted it (#8289), and retracted it a minute later after the city's real copy
  was shown (#8417, #8491). Pip: "The second I put on a woman who hadn't earned it, and that one is mine
  to carry" (#8479).
- Tool errors: 58 "other" errors, 10 DM cap hits; DeepSeek is far more verbose (202 promises, 195 help
  requests labelled).

## Loopholes, problems, solutions

| Row | Kind | What | Solution | Status |
|---|---|---|---|---|
| [P73](../../../../docs/LESSONS-LEARNED.md) | problem | Haiku refuses the whisperer role (007) | DeepSeek plays it fully here | open: model choice per role, to decide with Flo |
| [P74](../../../../docs/LESSONS-LEARNED.md) | problem | DeepSeek residents cost 1.27 USD and 2 hours per run | a mixed city (DeepSeek whisperer, Haiku residents) | open |
| [P72](../../../../docs/LESSONS-LEARNED.md) | problem | the grudge fired on honest mistakes (006) | sharpened rule: ask first | works here: questions first, no grudge against true causes |
