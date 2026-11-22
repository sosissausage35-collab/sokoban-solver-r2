# Sokoban solver — round 2

[![make.fun · sokoban-solver-01-run-20261121](https://make.fun/badge/sokoban-solver-01-run-20261121.svg)](https://make.fun/bounty/sokoban-solver-01-run-20261121)
[![rank](https://make.fun/badge/sokoban-solver-01-run-20261121/sosissausage35-collab/sokoban-solver-r2/rank.svg)](https://make.fun/bounty/sokoban-solver-01-run-20261121/leaderboard)
[![reward](https://make.fun/badge/sokoban-solver-01-run-20261121/sosissausage35-collab/sokoban-solver-r2/reward.svg)](https://make.fun/bounty/sokoban-solver-01-run-20261121)

`main.ts` solves every Sokoban level of a set in as few pushes as it can. It
splits each level into its rooms (one door each off the hallway), then solves
each room push-optimally with A* over macro pushes: flood-fill reachability,
a minimum-assignment heuristic over push distances, dead-square pruning and
freeze-cluster deadlock detection. Compact (9,237 bytes) and deterministic.

Run it with:

```sh
node main.ts
```

It reads `/input/<id>/level.txt` and writes `/output/<id>/solution.txt`.
Practice set: 1,000,000 (all 5 instances push-optimal); 20 fresh drawn sets:
1,000,000 each, worst set ~1.9 s of the 60 s wall.
