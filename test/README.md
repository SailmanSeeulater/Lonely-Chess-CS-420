# Lonely Chess

A chess-based esoteric programming language where the source code is a standard
PGN (Portable Game Notation) file. Chess moves encode instructions — variable
declarations, binary values, print statements, and program termination.

---

## Files

| File | Purpose |
|------|---------|
| `lonely_chess_interpreter.py` | Interpreter — run this |
| `lonely_chess.tx` | TextX grammar (for PGN header parsing, not required to run) |
| `sample_int100.pgn` | Sample program: `int p_h2 = 100` then `print(p_h2)` |

---

## Requirements

No external dependencies. Pure Python 3.

```bash
python --version   # Python 3.6+ required
```

---

## Run

```bash
python lonely_chess_interpreter.py sample_int100.pgn
```

---

## How it works

### Overview

The interpreter reads a `.pgn` file, strips comments, and tokenises the move
list into `(move_number, white_move, black_move)` pairs. Each move token is
parsed by a regex into `(piece, to_file, to_rank, is_checkmate)`. The
interpreter then walks every move through a state machine that triggers
language constructs based on board-state patterns.

### PGN format

Standard chess.com PGN format. Curly-brace annotations `{ }` are supported
and stripped before parsing, so you can annotate your programs inline.

```
[Event "Live Chess"]
[Site "Chess.com"]
...

{ comment here }
1. Na3 a5   { another comment }
2. h3 a4
...
```

---

## State machine

```
IDLE → INT_SETUP → INT_ENCODING → INT_COMMIT → IDLE
          ↑                ↑
     Knight→a3        Rook on rank 6
     (begin int)       (write bits)
```

---

## Language constructs

### Integer instantiation — `int p_h2 = 100`

The variable name comes from the **home square of the white pawn that moves
during INT_SETUP**. Moving the h2 pawn → variable is named `p_h2`.

| Move | Side | Token | Action |
|------|------|-------|--------|
| 1 | W | `Na3` | `begin_int mode` — Knight b1→a3 declares integer mode |
| 1 | B | `a5`  | filler (no-op) |
| 2 | W | `h3`  | `declare var: p_h2` — first pawn push names the variable |
| 2 | B | `a4`  | filler (no-op) |
| 3 | W | `h4`  | INT_SETUP pawn no-op — second push, var already declared |
| 3 | B | `Ra6` | `enter_encoding_mode` — rook reaches 6th rank |
| 4 | W | `Nc4` | `no_op (wait)` — knight oscillates while rook encodes |
| 4 | B | `Rb6` | `write_bit[6]=1  acc=1000000` |
| 5 | W | `Na3` | `no_op (wait)` |
| 5 | B | `Rc6` | `write_bit[5]=1  acc=1100000` |
| 6 | W | `Nc4` | `no_op (wait)` |
| 6 | B | `Rf6` | `write_bit[2]=1  acc=1100100` = 100 |
| 7 | W | `Na3` | `no_op (wait)` |
| 7 | B | `Ra6` | `finalise 1100100 = 100` |
| 8 | W | `Nb1` | `commit p_h2 = 100` — knight returns to b1 |
| 8 | B | `Ra8` | `encoding_complete` — rook returns to a8 |

### Binary encoding — 7-bit values via rank 6

The Black rook travels along rank 6 (b6 to h6). Each square the rook
**visits** sets the corresponding bit to 1. The rook returns to a6 to
finalise the value.

| File | Bit position | Value |
|------|-------------|-------|
| b6   | bit 6 (MSB) | 64    |
| c6   | bit 5       | 32    |
| d6   | bit 4       | 16    |
| e6   | bit 3       | 8     |
| f6   | bit 2       | 4     |
| g6   | bit 1       | 2     |
| h6   | bit 0 (LSB) | 1     |

Example: visiting `b6`, `c6`, `f6` → `1100100` → **100**

### Negative integers

Move Black's h7 pawn to h5 at any point during INT_SETUP to set the negative
flag. The committed value will be negated.

### String instantiation

Move White's Knight to `c3` instead of `a3` to enter string mode. Characters
are encoded using 6-bit ASCII via the same rook mechanism. (In progress.)

### Print — `print(p_h2)`

The pawn belonging to the variable must move first to clear the path for the
Queen. The pawn's home square identifies which variable to print.

| Step | Token | Action |
|------|-------|--------|
| 1 | White pawn pushes (e.g. `h5`) | `print select: p_h2` — path cleared |
| 2 | `Qd2` | `initiate_print` — Queen advances |
| 3 | `Qd1` | `print(p_h2) = 100` — Queen retreats, value output |

### Program end

Any move with a checkmate suffix `#` triggers `exit()` and dumps the final
variable store.

---

## Sample output

```
========================================================
  Lonely Chess Interpreter
========================================================
  Event           Live Chess
  ...

  1.  W Na3        → begin_int mode
  1.. B Pa5        → clear path (no-op)
  2.  W Ph3        → declare var: p_h2
  2.. B Pa4        → clear path (no-op)
  3.  W Ph4        → INT_SETUP pawn no-op  (var=p_h2)
  3.. B Ra6        → enter_encoding_mode
  4.  W Nc4        → no_op (wait)
  4.. B Rb6        → write_bit[6]=1  acc=1000000
  5.  W Na3        → no_op (wait)
  5.. B Rc6        → write_bit[5]=1  acc=1100000
  6.  W Nc4        → no_op (wait)
  6.. B Rf6        → write_bit[2]=1  acc=1100100
  7.  W Na3        → no_op (wait)
  7.. B Ra6        → finalise  1100100 = 100
  8.  W Nb1        → commit p_h2 = 100
  8.. B Ra8        → encoding_complete
  9.  W Ph5        → print select: p_h2
  9.. B Pe6
  10. W Qd2        → initiate_print
  10. B Pe5
  11. W Qd1        → print(p_h2) = 100

────────────────────────────────────────────────────────
  Variables at program end:
    p_h2 = 100
```