# Samples

The sample ladder: one folder per sample, each written as a test. The folder is empty at milestone M0. Sample 1 (the
Hello Game) arrives at milestone M1; the code block of the root `README.md` is an include of it. The tutorial [Write a game](../docs/tutorials/game.md) teaches from samples 1 to 4.

- [`team-game/`](team-game/README.md): sample 2, combine mechanics (team tic-tac-toe with `grid`, `team-channel` and `consensus`, a grant override, `--set`, and the same game as YAML).
- [`roles/`](roles/README.md): sample 3, roles and private texts (a fixed captain per team, a briefing per role and per resident, one model for every resident).
- [`shipped-director/`](shipped-director/README.md): sample 4, a Director and its dial (the coach, woken every second tick by a tick trigger, its dial `direction` at 0 and at 8 read from the log; why the shipped Directors need the City's frame).
- [`own-mechanic/`](own-mechanic/README.md): sample 5, a mechanic of your own (a tool, an event, a service, a decision through `decisions`, `exile` used when it is there); its tutorial is [Write a mechanic](../docs/tutorials/mechanic.md).
- [`own-director/`](own-director/README.md): sample 6, a Director of your own; its tutorial is [Write a Director](../docs/tutorials/director.md).
- [`own-scheduler/`](own-scheduler/README.md): a second scheduler, `parallel`, written outside the engine; its tutorial is [Write a scheduler](../docs/tutorials/scheduler.md).
