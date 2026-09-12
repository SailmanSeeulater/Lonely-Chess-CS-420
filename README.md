# Lonely Chess

A chess-based esoteric programming language where source code is a standard PGN
(Portable Game Notation) file. Every chess move encodes an instruction — variable
declarations, binary values, arithmetic, control flow, and print statements.

Created by Perfect Phanitchaleun and Nicolaus ReyasBautista — CS 420 Final Project.

```bash
python lonely_chess_runtime.py actual_game_sample.pgn
# 100
```

That file is a **legal, playable 22-ply chess game** — and it prints `100`.

---

## Chess legality

Lonely Chess programs are valid **Lonely Chess source**, not necessarily valid
over-the-board chess. The language's semantic requirements — specific piece
movements to encode binary values, trigger control flow, and perform arithmetic —
routinely conflict with the rules of chess (rooks passing through pawns, pieces
jumping between distant squares, and so on).

This is intentional. Like other esoteric languages, Lonely Chess borrows a
notation, not a rule set: PGN is used because it is compact and human-readable,
not as a claim that every program could be played. The interpreter reads only the
**move tokens** (`Na3`, `Ra6`, `Ke2`) and ignores legality entirely.

Concretely, verified against a real chess engine:

| File | Legal chess? |
|------|--------------|
| `actual_game_sample.pgn` | fully legal — and a working program |
| `sample_str_hello.pgn` | legal for 158 of 162 plies |
| `sample_int100.pgn` | legal for 18 of 22 plies |
| `fizzbuzz_100.pgn` | diverges at ply 6 |

Writing programs that are *also* legal chess is possible at small scale — see
`actual_game_sample.pgn` — but becomes impractical at FizzBuzz size.

---

## Files

| File | Purpose |
|------|---------|
| `lonely_chess_interpreter.py` | Full interpreter — annotates every move |
| `lonely_chess_runtime.py` | Silent runtime — only explicit output |
| `test_lonely_chess.py` | Regression suite (stdlib only) |
| `actual_game_sample.pgn` | Legal chess game that prints `100` |
| `sample_int100.pgn` | `int p_h2 = 100` then `print(p_h2)` |
| `sample_int95.pgn` | `int p_h2 = 95` then `print(p_h2)` |
| `sample_str_hello.pgn` | `String p_h2 = "Hello World"` then print |
| `sample_dom_dabish.pgn` | Encode and print a long string |
| `sample_arithmetic.pgn` | `+`, `-`, `*`, `/` operations |
| `fizzbuzz_complete.pgn` | FizzBuzz 1–15 — self-contained |
| `fizzbuzz_100.pgn` | FizzBuzz 1–100 — 2,669 moves (5,338 plies) |

---

## Requirements

Pure Python 3.6+ — no external dependencies.

## Run

```bash
# Full move-by-move trace with annotations
python lonely_chess_interpreter.py sample_int100.pgn

# Silent — only explicit print() calls produce output
python lonely_chess_runtime.py fizzbuzz_100.pgn

# Tests
python test_lonely_chess.py
```

---

## PGN format

Standard PGN import format. The parser discards brace comments `{ }`,
rest-of-line comments `;`, recursive annotation variations `( )`, NAGs (`$1`),
and suffix annotations (`!`, `?`, `!!`, `?!`) before execution, so you can
annotate programs freely and paste games straight from Chess.com or Lichess.

```
[Event "Live Chess"]

{ This is a comment }
1. Na3 a5   { begin int mode }
2. h3  a4   { declare p_h2 }
```

---

## Language reference

### Piece roles

| Piece | Move | Meaning |
|-------|------|---------|
| W Knight (b1) | b1→a3 | begin integer declaration |
| W Knight (b1) | b1→c3 | begin string declaration |
| W Knight | any→b1 | commit variable, end encoding |
| B Rook (a8) | a8→a6 | enter encoding mode |
| B Rook | rank 6 (b6–h6) | write binary bits |
| B Rook | →a6 | finalise value / char |
| B Rook | →a8 | encoding complete |
| B Pawn | h7→h5 *during int setup* | negate the value being encoded |
| W King | e1→e2 | start `for` loop |
| W King | e2→e1 | end iteration → print buffer or i |
| W Rook (h) | h1→h2 | arm loop variable i |
| W Rook (h) | h2→h1 | close range, loop begins |
| W Rook (h) | h2→h3→h2 | i++ |
| B Rook (a8) | a6→h6→a6 | encode loop bound in binary |
| W Bishop (f1) | f1→h3 | open `if` block |
| W Bishop | h3→f1 | close `if` block → implicit else prints i |
| W Pawn | push *while if open* | select the variable supplying the word |
| W Rook (h) | h2→h3 | push i into condition |
| W Rook (a) | a1→a3 | `%` modulo operator |
| B Rook (a) | a3↔a2 × N | count divisor N |
| W Rook (a) | a3→a1 | evaluate `i % N == 0` |
| B Pawn | h7→h5 *when idle* | arm `+` operator |
| B Pawn | g7→g5 | arm `-` operator |
| B Pawn | f7→f5 | arm `*` operator |
| B Pawn | e7→e5 | arm `/` operator |
| W Rook (a) | a1→X2 | arithmetic op1 = p_X2 |
| W Rook (a) | X2→Y2 | arithmetic op2 = p_Y2 |
| W Rook (a) | Y2→a2→a1 | execute: p_X2 = p_X2 OP p_Y2 |
| W Pawn | push (IDLE) | select variable for print |
| W Queen | d1→d2 | initiate print |
| W Queen | d2→d1 | finalise print → output |
| Any | move`#` | checkmate → halt |

---

### Integer — `int p_h2 = 100`

Variable name comes from the **home square of the White pawn moved during setup**.
Moving the h2 pawn → variable named `p_h2`.

```
1. Na3  a5      W Knight→a3: begin int mode
2. h3   a4      W pawn h2→h3: declare var p_h2
3. h4   Ra6     W pawn h3→h4: no-op | B Rook→a6: enter encoding
4. Nc4  Rb6     no-op wait   | write bit[6]=1  acc=1000000
5. Na3  Rc6     no-op wait   | write bit[5]=1  acc=1100000
6. Nc4  Rf6     no-op wait   | write bit[2]=1  acc=1100100 = 100
7. Na3  Ra6     no-op wait   | finalise 100
8. Nb1  Ra8     commit p_h2=100 | encoding complete
```

**Binary encoding — 7-bit via rank 6:**

| Square | b6 | c6 | d6 | e6 | f6 | g6 | h6 |
|--------|----|----|----|----|----|----|----|
| Bit | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
| Value | 64 | 32 | 16 | 8 | 4 | 2 | 1 |

Visiting `b6`, `c6`, `f6` → `1100100` → **100**

**Range:** 0–127. Seven bits is a hard ceiling; there is no eighth bit square.

**Negative integers:** move Black's h7 pawn to h5 *during int setup* (before the
rook reaches a6) to negate the result. Outside setup the same move arms `+`.

---

### String — `String p_g2 = "Fizz"`

The Knight moves to c3 instead of a3 to enter string mode. Each character is
encoded as a 7-bit ASCII value using the same rook mechanism, so only ASCII
0–127 is representable. Between characters the rook resets via `a6→a8→a6`.

---

### Print — `print(p_h2)`

The variable's pawn must push first, both to clear the Queen's path and to
identify which variable to print.

```
h5   filler     pawn push → select p_h2 for printing
Qd2  filler     Queen advances → initiate print
Qd1  filler     Queen retreats → OUTPUT value
```

---

### For loop

`Ke2` starts the loop with `i = 1`; the Black rook encodes the bound N in binary;
`Rh1` arms it. The loop runs **`i = 1 … N` inclusive** — equivalent to Python's
`range(1, N+1)`. `Ke1` ends an iteration and prints the buffer, or `i` if the
buffer is empty.

```
Ke2  filler     start loop  (i=1)
Rh2  filler     arm loop variable i
...  B rook     Black rook scans rank 6 to encode N
Rh1  filler     loop armed → i = 1..N

[per iteration body]

Ke1  filler     end iteration → print(buffer or i), i++
Ke2  filler     next iteration (or exit if i > N)
```

Encoding `1100100` (100) therefore yields exactly 100 iterations.

---

### If statement

```
Bh3  filler     open if block
d5   filler     (optional) W pawn push → word source = p_d2
Rh3  filler     push i into condition
Ra3  filler     % operator
...  Ra2×N      Black rook bounces N times (divisor)
Ra1  filler     evaluate i % N == 0 → append word to buffer if matched
Bf1  filler     close if → if buffer empty, print i (implicit else)
```

The word appended on a match comes from the variable named by a White pawn push
while the block is open. If no pawn is pushed, a positional default applies for
backward compatibility: **block 1 → `p_g2`, block 2+ → `p_f2`**. The stock
FizzBuzz samples rely on that default.

```
if i % 3 == 0: buffer += "Fizz"   ← if block 1
if i % 5 == 0: buffer += "Buzz"   ← if block 2
print(buffer or i)                 ← Ke2→e1
```

---

### Arithmetic

Arm an operator with a Black pawn dropping from rank 7 to rank 5, then use the
White a-Rook to select operands on rank 2. The result overwrites op1's variable.

```
h7→h5   arm +        g7→g5   arm -
f7→f5   arm *        e7→e5   arm /

Ra1→h2  op1 = p_h2
Rh2→g2  op2 = p_g2
Rg2→a2  begin return
Ra2→a1  EXECUTE: p_h2 = p_h2 OP p_g2
```

Negative results are supported. Integer division truncates toward zero
(`-7 / 2 == -3`). Division by zero raises an error rather than silently
producing a value.

---

## Sample output

```
$ python lonely_chess_runtime.py fizzbuzz_100.pgn
1
2
Fizz
4
Buzz
...

$ python lonely_chess_runtime.py sample_dom_dabish.pgn
I love to learn coding with Dom Dabish

$ python lonely_chess_runtime.py sample_arithmetic.pgn
24
20
80
20
```

---

## Known limits

- Integers and string characters are 7-bit: `0–127`.
- Unrecognised move tokens are skipped rather than reported as syntax errors.
- The `if` construct supports two blocks per iteration by default; more than two
  require explicit word-source selection.