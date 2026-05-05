# Lonely Chess

A chess-based esoteric programming language where source code is a standard PGN
(Portable Game Notation) file. Every chess move encodes an instruction — variable
declarations, binary values, arithmetic, control flow, and print statements.

Created by Perfect Phanitchaleun and Nicolaus ReyasBautista — CS 420 Final Project.

---

## ⚠️ Chess Legality Disclaimer

Lonely Chess PGN files are valid **Lonely Chess programs**, not necessarily valid
over-the-board chess games. The language's semantic requirements — specific piece
movements to encode binary values, trigger control flow, and perform arithmetic —
often conflict with standard chess rules (pieces moving through occupied squares,
rooks bypassing pawns, kings moving to occupied squares, etc.).

This is intentional and expected. Like other esoteric languages (Brainfuck source
code is not valid C, Whitespace programs are not valid prose), Lonely Chess source
code operates in its own domain. The `.pgn` file format is used as a convenient,
human-readable notation for encoding programs — not as a claim that the game could
be played on a real chessboard.

The interpreter reads only the **move tokens** (e.g. `Na3`, `Ra6`, `Ke2`) and
ignores chess legality entirely. Any valid PGN file is a valid Lonely Chess program.

---

## Files

| File | Purpose |
|------|---------|
| `lonely_chess_interpreter.py` | Full interpreter — shows every move annotated |
| `lonely_chess_runtime.py` | Silent runtime — only prints explicit output |
| `lonely_chess.tx` | TextX grammar (reference only, not required to run) |
| `sample_int100.pgn` | Sample: `int p_h2 = 100` then `print(p_h2)` |
| `sample_str_hello.pgn` | Sample: `String p_h2 = "Hello World"` then print |
| `sample_dom_dabish.pgn` | Sample: encode and print a long string |
| `sample_arithmetic.pgn` | Sample: `+`, `-`, `*`, `/` operations |
| `fizzbuzz_complete.pgn` | FizzBuzz range(1, 16) — self-contained |
| `fizzbuzz_100.pgn` | FizzBuzz range(1, 101) — full program |

---

## Requirements

Pure Python 3 — no external dependencies.

```bash
python --version   # Python 3.6+
```

---

## Run

```bash
# Full move-by-move trace with annotations
python lonely_chess_interpreter.py game.pgn

# Silent — only explicit print() calls produce output
python lonely_chess_runtime.py game.pgn
```

---

## PGN format

Standard chess.com PGN. Curly-brace annotations `{ }` are stripped before
parsing so you can annotate your programs freely.

```
[Event "Live Chess"]
[Site "Chess.com"]
...

{ This is a comment }
1. Na3 a5   { begin int mode }
2. h3 a4    { declare p_h2 }
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
| W King | e1→e2 | start `for` loop |
| W King | e2→e1 | end iteration → print buffer or i |
| W Rook (h) | h1→h2 | arm loop variable i |
| W Rook (h) | h2→h1 | close range, loop begins |
| W Rook (h) | h2→h3→h2 | i++ |
| B Rook (a8) | a6→h6→a6 | encode loop range end in binary |
| W Bishop (f1) | f1→h3 | open `if` block |
| W Bishop | h3→f1 | close `if` block → implicit else prints i |
| W Rook (h) | h2→h3 | push i into condition |
| W Rook (a) | a1→a3 | `%` modulo operator |
| B Rook (a) | a3↔a2 × N | count divisor N |
| W Rook (a) | a3→a1 | evaluate `i % N == 0` |
| B Pawn | h7→h5 | arm `+` operator |
| B Pawn | g7→g5 | arm `-` operator |
| B Pawn | f7→f5 | arm `*` operator |
| B Pawn | e7→e5 | arm `/` operator |
| W Rook (a) | a1→X2 | arithmetic op1 = p_X2 |
| W Rook (a) | X2→Y2 | arithmetic op2 = p_Y2 |
| W Rook (a) | Y2→a2→a1 | execute: p_X2 = p_X2 OP p_Y2 |
| W Pawn | push (IDLE) | select variable for print |
| W Queen | d1→d2 | initiate print |
| W Queen | d2→d1 | finalise print → output |
| Any | move`#` | checkmate → `exit()` |

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

| Square | Bit | Value |
|--------|-----|-------|
| b6 | bit 6 (MSB) | 64 |
| c6 | bit 5 | 32 |
| d6 | bit 4 | 16 |
| e6 | bit 3 | 8 |
| f6 | bit 2 | 4 |
| g6 | bit 1 | 2 |
| h6 | bit 0 (LSB) | 1 |

Visiting `b6`, `c6`, `f6` → `1100100` → **100**

**Negative integers:** move Black's h7 pawn to h5 during setup to negate the result.

---

### String — `String p_g2 = "Fizz"`

Knight moves to c3 instead of a3 to enter string mode. Each character is encoded
as a 7-bit ASCII value using the same rook mechanism. Between characters, the rook
resets via `a6→a8→a6`.

```
1. Nc3  a5      begin string mode
2. g3   a4      declare var p_g2
3. g4   Ra6     enter string encoding
...             (rook encodes each ASCII character)
N. Nb1  Ra8     commit p_g2 = "Fizz"
```

---

### Print — `print(p_h2)`

The variable's pawn must push first to clear the Queen's path and identify which
variable to print.

```
h5   filler     pawn push → select p_h2 for printing
Qd2  filler     Queen advances → initiate print
Qd1  filler     Queen retreats → OUTPUT value
```

---

### For loop — `for i in range(1, N)`

```
Ke2  filler     start loop  (i=1)
Rh2  filler     arm loop variable i
...  B rook     Black rook scans rank 6 to encode N in binary
Rh1  filler     loop armed → range(1, N)

[per iteration body]

Ke1  filler     end iteration → print(buffer or i), i++
Ke2  filler     next iteration (or exit if i > N)
```

---

### If statement

```
Bh3  filler     open if block
Rh3  filler     push i into condition
Ra3  filler     % operator
...  Ra2×N      Black rook bounces N times (divisor)
Ra1  filler     evaluate i % N == 0 → append word to buffer if matched
Bf1  filler     close if → if buffer empty, print i (implicit else)
```

Two independent if blocks per iteration:

```
if i % 3 == 0: buffer += "Fizz"   ← if block 1
if i % 5 == 0: buffer += "Buzz"   ← if block 2
print(buffer or i)                 ← Ke2→e1
```

---

### Arithmetic

Arm operator with a Black pawn dropping from rank 7 to rank 5, then use the
White a-Rook to select operands on rank 2. Result overwrites op1's variable.

```
h7→h5   arm +        g7→g5   arm -
f7→f5   arm *        e7→e5   arm /

Ra1→h2  op1 = p_h2
Rh2→g2  op2 = p_g2
Rg2→a2  begin return
Ra2→a1  EXECUTE: p_h2 = p_h2 OP p_g2
```

Negative results are supported. Integer division truncates toward zero.

---

## Sample output

### `python lonely_chess_runtime.py fizzbuzz_100.pgn`

```
1
2
Fizz
4
Buzz
Fizz
7
8
Fizz
Buzz
11
Fizz
13
14
FizzBuzz
...
```

### `python lonely_chess_runtime.py sample_dom_dabish.pgn`

```
I love to learn coding with Dom Dabish
```

### `python lonely_chess_runtime.py sample_arithmetic.pgn`

```
24
20
80
20
```