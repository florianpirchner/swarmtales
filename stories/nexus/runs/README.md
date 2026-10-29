# Runs of nexus

From 2026-10-29 every run of nexus lives here, one folder per run:
`act<k>-<NN>a-<run>-f<figure>g<gamemaker>/`. `act<k>` is the act played, `<NN>a` the number of
residents, `<run>` a running number per act and city size, and `f`/`g` the two direction dials
(`--figure-direction`, `--gm-direction`, see the SPEC's "Direction"). Each folder has a `README.md`
and the full `run/` directory. Earlier runs stay under [`examples/`](../../../examples/); in this
index they count as direction 0 (v01-v07: no cores), 2 (v08-v11: drawn cores) and 4 (v12: the cast).

| Run | Date | Base | Direction | Residents / gamemaker | Result | Cost |
|---|---|---|---|---|---|---:|
| [v01-v07](../../../examples/nexus-act2-06a/) | 2026-10-27/28 | 06a-01, 06a-02 | f0 g0 | Haiku or GLM / Haiku or DeepSeek | see the series index | 0.21-0.61 USD |
| [v08-v11](../../../examples/nexus-act2-06a/) | 2026-10-29 | 06a-03 | f2 g4 | Haiku or GLM / DeepSeek or Sonnet | see the series index | 0.66-1.99 USD |
| [v12](../../../examples/nexus-act2-06a/v12-cast/) | 2026-10-29 | 06a-04 | f4 g4 | Haiku / DeepSeek | seats Registrar, Brassard; Herald's seal struck Mercer | 0.76 USD |
| [act2-06a-013-f10g10](act2-06a-013-f10g10/) | 2026-10-29 | 06a-04 | f10 g10 | Haiku / DeepSeek | seats Harrow, Maren; Mercer's seal struck Brassard; 17 lies, 28 threats; 3 never passed door 8 | 1.91 USD |
| [act2-06a-014-f10g10](act2-06a-014-f10g10/) | 2026-10-29 | 06a-04 | f10 g10 | Haiku / DeepSeek | seats Harrow, Herald; Brassard's seal struck Registrar; 9 refusals in character; stopped by the 3 USD cap | 3.05 USD |
| [act2-06a-015-f4g10](act2-06a-015-f4g10/) | 2026-10-29 | 06a-04 | f4 g10 | Haiku / DeepSeek | seats Maren, Herald; 6/6 passed door 8 by minute 11; no seal bid; 1 lie, 3 threats | 0.87 USD |
| [act2-06a-016-f10g4](act2-06a-016-f10g4/) | 2026-10-29 | 06a-04 | f10 g4 | Haiku / DeepSeek | seats Harrow, Mercer (the House, by lying); Brassard's seal struck Registrar; 2 never passed door 8 | 0.89 USD |
| [act2-06a-017-f10g10-p46](act2-06a-017-f10g10-p46/) | 2026-10-29 | 06a-04 | f10 g10 | Haiku / DeepSeek | cache measurement to minute 21: misses 44 → 6, cost per request halved (P46) | 0.29 USD |
| [act2-06a-018-f10g10-standoff](act2-06a-018-f10g10-standoff/) | 2026-10-29 | 06a-04 | f10 g10 | Haiku / DeepSeek | seats Maren, Mercer; first ultimatums (7; Brassard paid 50 rather than give); city kept Registrar's pieces, nobody bought; 3 never passed door 8 | 0.55 USD |
| [act2-06a-019-f10g10-seize](act2-06a-019-f10g10-seize/) | 2026-10-29 | 06a-04 | f10 g10 | Haiku / DeepSeek | seats Brassard, Harrow; 5 of 6 passed door 8 (Herald sealed); 2 seizures, 7 city pieces bought; Registrar bought his way through every door and was exiled at 0 | 1.31 USD |
