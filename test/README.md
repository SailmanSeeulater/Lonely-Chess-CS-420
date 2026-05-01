# Lonely Chess — Setup & Usage

## Install

```bash
pip install textx
```

## Run

```bash
python lonely_chess_interpreter.py sample_int100.pgn
```

---

## How the grammar works

### `lonely_chess.tx` — TextX grammar

```
PGNGame          → headers + moves + result
Header           → [Key "Value"]
MoveEntry        → number '.' WhiteHalfMove [BlackHalfMove]
HalfMove         → CastleMove | RegularMove
RegularMove      → [Piece] [disambig file/rank] [x] dest_file dest_rank [=Promo] [+/#]
```

Piece letters: `K Q R B N` (absent = Pawn)  
Files: `a–h`   Ranks: `1–8`

---

## How the interpreter works

The grammar just **parses** the PGN into a Python object tree.
The interpreter then walks those moves and maintains a tiny **state machine**:

```
IDLE → INT_SETUP → INT_ENCODING → INT_COMMIT → IDLE
                                    ↑ loop (rook encodes bits)
```

### Integer instantiation  (`int p_h2 = 100`)

| Move | Side | Piece | Destination | Interpreter action |
|------|------|-------|-------------|--------------------|
| 1 | W | N | a3 | `begin_int mode` — Knight signals integer declaration |
| 1 | B | P | a6 | path clearing (no-op) |
| 2 | W | N | a4 | no-op (still INT_SETUP) |
| 2 | B | P | b5 | path clearing |
| 3 | W | N | c3 | — |
| 3 | B | P | a5 | path clearing |
| 4 | W | N | a4 | — |
| 4 | B | R | a6 | `enter_encoding_mode` — rook armed |
| 5 | W | P | h4 | `variable declared: p_h2` (pawn home = h2) |
| 5 | B | R | b6 | `write_bit[6]=1`  acc=`1000000` |
| 6 | W | N | c3 | `no_op / wait` |
| 6 | B | R | c6 | `write_bit[5]=1`  acc=`1100000` |
| 7 | W | N | a4 | `no_op / wait` |
| 7 | B | R | f6 | `write_bit[2]=1`  acc=`1100100` = **100** |
| 8 | W | N | c3 | `no_op / wait` |
| 8 | B | R | a6 | `finalise bits = 1100100 = 100` |
| 9 | W | N | b1 | `commit p_h2 = 100` |
| 9 | B | R | a8 | `encoding_complete` |

**Result:** `p_h2 = 100`

### Binary encoding rules

Rank 6 columns map to 7-bit positions (MSB first):

| Column | File | Bit position |
|--------|------|-------------|
| 2 | b6 | bit 6 (64) |
| 3 | c6 | bit 5 (32) |
| 4 | d6 | bit 4 (16) |
| 5 | e6 | bit 3 ( 8) |
| 6 | f6 | bit 2 ( 4) |
| 7 | g6 | bit 1 ( 2) |
| 8 | h6 | bit 0 ( 1) |

Each time the rook *visits* a square, that bit is set to 1.  
`b6 + c6 + f6` → `1100100` → **100** ✓

### Negative numbers
Move Black's h7 pawn to h5 at any point during INT_SETUP to set the **negative flag**.  
The committed value will be negated.

### Print  (`print(p_h2)`)
1. White Queen → d2     `initiate_print`  
2. White Pawn (variable pawn) moves    `print target = p_h2`  
3. White Queen → d1     `output variable value`

### Program end
Any move annotated `#` (checkmate) triggers `exit()` and dumps the variable store.

---

## Files

| File | Purpose |
|------|---------|
| `lonely_chess.tx` | TextX grammar |
| `lonely_chess_interpreter.py` | Interpreter / state machine |
| `sample_int100.pgn` | Sample: `int p_h2 = 100` |
