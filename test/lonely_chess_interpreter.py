"""
lonely_chess_interpreter.py  (v4)
==================================
Lonely Chess — chess-based esoteric language interpreter.

Usage:
    python lonely_chess_interpreter.py game.pgn

Requires:
    pip install textx
"""

import sys, os, re
from textx import metamodel_from_file


# ─── Regex move parser ────────────────────────────────────────────────────────
# Parses a single PGN move token into (piece, to_file, to_rank, is_checkmate).
# Handles: castling, piece moves, piece disambig, pawn pushes, pawn captures.

MOVE_RE = re.compile(
    r'(?P<castle>O-O-O|O-O)[+#]?'
    r'|(?P<piece>[KQRBN])(?P<from_f>[a-h])(?P<from_r>[1-8])x?(?P<to_f2>[a-h])(?P<to_r2>[1-8])(?:=[KQRBN])?(?P<chk2>[+#])?'
    r'|(?P<piece2>[KQRBN])x?(?P<to_f>[a-h])(?P<to_r>[1-8])(?:=[KQRBN])?(?P<chk>[+#])?'
    r'|(?P<pfrom>[a-h])x(?P<pto_f>[a-h])(?P<pto_r>[1-8])(?:=[KQRBN])?(?P<pchk>[+#])?'
    r'|(?P<ppush_f>[a-h])(?P<ppush_r>[1-8])(?:=[KQRBN])?(?P<ppchk>[+#])?'
)

def parse_move(token):
    """Returns (piece, to_file, to_rank, is_checkmate) or None."""
    m = MOVE_RE.fullmatch(token.strip())
    if not m:
        return None
    if m.group('castle'):
        return ('K', None, None, token.endswith('#'))
    if m.group('piece'):    # disambig: Qd1h5
        return (m.group('piece'),  m.group('to_f2'), int(m.group('to_r2')), m.group('chk2') == '#')
    if m.group('piece2'):   # normal piece: Na3, Rf6, Qxh5
        return (m.group('piece2'), m.group('to_f'),  int(m.group('to_r')),  m.group('chk')  == '#')
    if m.group('pfrom'):    # pawn capture: exd5
        return ('P', m.group('pto_f'), int(m.group('pto_r')), m.group('pchk') == '#')
    if m.group('ppush_f'):  # pawn push: h4, a6
        return ('P', m.group('ppush_f'), int(m.group('ppush_r')), m.group('ppchk') == '#')
    return None


# ─── PGN tokeniser ───────────────────────────────────────────────────────────
# Strips comments, then yields (move_number, white_token, black_token|None).

def parse_pgn(path):
    with open(path, 'r') as f:
        text = f.read()

    # Strip { } comments
    text = re.sub(r'\{[^}]*\}', '', text)

    # Pull out headers
    headers = re.findall(r'\[(\w+)\s+"([^"]*)"\]', text)

    # Remove header lines, leaving only the move text
    move_text = re.sub(r'\[[^\]]*\]', '', text)

    # Strip result token and extra whitespace
    move_text = re.sub(r'(1-0|0-1|1/2-1/2|\*)', '', move_text).strip()

    # Tokenise: split on whitespace, keep only move tokens (not move numbers)
    raw_tokens = move_text.split()
    move_tokens = [t for t in raw_tokens if not re.fullmatch(r'\d+\.+', t)]

    # Pair into (number, white, black) tuples
    moves = []
    i = 0
    move_num = 1
    while i < len(move_tokens):
        white = move_tokens[i]; i += 1
        black = move_tokens[i] if i < len(move_tokens) else None
        # If black token looks like a move number, it's a new move — skip
        if black and re.fullmatch(r'\d+\.+', black):
            black = None
        else:
            i += 1
        moves.append((move_num, white, black))
        move_num += 1

    return headers, moves


# ─── Board state ─────────────────────────────────────────────────────────────

class BoardState:
    def __init__(self):
        self.variables      = {}
        self.mode           = 'IDLE'
        self.current_var    = None
        self.rook_bits      = 0
        self.print_var      = None
        self.negative_flag  = False

    @staticmethod
    def file_to_col(f):
        return ord(f) - ord('a') + 1


# ─── Interpreter ─────────────────────────────────────────────────────────────

class LonelyChessInterpreter:

    def __init__(self):
        self.board = BoardState()

    def run(self, pgn_path):
        headers, moves = parse_pgn(pgn_path)

        print("=" * 56)
        print("  Lonely Chess Interpreter")
        print("=" * 56)
        for key, val in headers:
            print(f"  {key:15s} {val}")
        print()

        for move_num, white_tok, black_tok in moves:
            self._step(move_num, 'W', white_tok)
            if black_tok:
                self._step(move_num, 'B', black_tok)

        print()
        print("─" * 56)
        print("  Variables at program end:")
        if self.board.variables:
            for k, v in self.board.variables.items():
                print(f"    {k} = {v}")
        else:
            print("    (none committed)")

    # ── single ply ────────────────────────────────────────────────────────────

    def _step(self, n, side, token):
        parsed = parse_move(token)
        if parsed is None:
            print(f"  {n}{'.' if side=='W' else '..'} {side} {token:<6}  (unrecognised token)")
            return

        piece, to_file, to_rank, is_cm = parsed
        dest  = f"{to_file}{to_rank}" if to_file else "O-O"
        label = f"  {n}{'.' if side=='W' else '..'} {side} {piece}{dest}"
        print(f"{label:<28}", end="")

        if is_cm:
            self._checkmate(side)
            return

        if side == 'W':
            self._white(piece, to_file, to_rank)
        else:
            self._black(piece, to_file, to_rank)

        print()

    # ── White moves ───────────────────────────────────────────────────────────

    def _white(self, piece, to_file, to_rank):
        b = self.board

        # Knight → a3 : begin INTEGER mode
        if piece == 'N' and to_file == 'a' and to_rank == 3:
            if b.mode == 'IDLE':
                b.mode = 'INT_SETUP'
                print("→ begin_int mode", end="")
            else:
                print("→ no_op (wait)", end="")
            return

        # Knight → c3 : begin STRING mode (stub)
        if piece == 'N' and to_file == 'c' and to_rank == 3:
            if b.mode == 'IDLE':
                b.mode = 'STR_SETUP'
                print("→ begin_string mode (stub)", end="")
            return

        # Pawn during INT_SETUP: first push names the var, second is no-op
        if piece == 'P' and b.mode == 'INT_SETUP':
            if b.current_var is None:
                b.current_var = f"p_{to_file}2"
                print(f"→ declare var: {b.current_var}", end="")
            else:
                print(f"→ INT_SETUP pawn no-op  (var={b.current_var})", end="")
            return

        # Knight → b1 : commit variable  (MUST come before generic no-op)
        if piece == 'N' and to_file == 'b' and to_rank == 1:
            if b.mode == 'INT_ENCODING':
                value = -b.rook_bits if b.negative_flag else b.rook_bits
                b.variables[b.current_var] = value
                b.mode          = 'INT_COMMIT'
                b.negative_flag = False
                print(f"→ commit {b.current_var} = {value}", end="")
            return

        # Knight oscillates during INT_ENCODING → no-op
        if piece == 'N' and b.mode == 'INT_ENCODING':
            print("→ no_op (wait)", end="")
            return

        # ── PRINT SEQUENCE ───────────────────────────────────────────────────
        # Step 1: Pawn push while IDLE — selects variable + clears Queen's path
        if piece == 'P' and b.mode == 'IDLE':
            var_name = f"p_{to_file}2"
            if var_name in b.variables:
                b.print_var = var_name
                b.mode      = 'PRINT_PAWN_MOVED'
                print(f"→ print select: {var_name}", end="")
            return

        # Step 2: Queen advances to rank 2 — initiate print
        if piece == 'Q' and b.mode == 'PRINT_PAWN_MOVED':
            if to_rank == 2:
                b.mode = 'PRINT_WAIT'
                print("→ initiate_print", end="")
            return

        # Step 3: Queen retreats to rank 1 — output value
        if piece == 'Q' and to_rank == 1 and b.mode == 'PRINT_WAIT':
            val = b.variables.get(b.print_var, "<undefined>")
            print(f"→ finalise_print", end="")
            print()
            print()
            print(f"  ╔══════════════════════╗")
            print(f"  ║  print({b.print_var})")
            print(f"  ║  OUTPUT: {val}")
            print(f"  ╚══════════════════════╝", end="")
            b.mode      = 'IDLE'
            b.print_var = None
            return

    # ── Black moves ───────────────────────────────────────────────────────────

    def _black(self, piece, to_file, to_rank):
        b = self.board

        # Pawn during INT_SETUP: path clearing
        if piece == 'P' and b.mode == 'INT_SETUP':
            if to_file == 'h' and to_rank == 5:
                b.negative_flag = True
                print("→ negative_flag SET", end="")
            else:
                print("→ clear path (no-op)", end="")
            return

        # Rook → a6 : enter encoding, or finalise on return
        if piece == 'R' and to_file == 'a' and to_rank == 6:
            if b.mode == 'INT_SETUP':
                b.mode      = 'INT_ENCODING'
                b.rook_bits = 0
                print("→ enter_encoding_mode", end="")
            elif b.mode == 'INT_ENCODING':
                print(f"→ finalise  {b.rook_bits:07b} = {b.rook_bits}", end="")
            return

        # Rook along rank 6 (b6…h6) : write bits
        if piece == 'R' and to_rank == 6 and to_file in 'bcdefgh':
            if b.mode == 'INT_ENCODING':
                col     = b.file_to_col(to_file)
                bit_pos = 8 - col
                b.rook_bits |= (1 << bit_pos)
                print(f"→ write_bit[{bit_pos}]=1  acc={b.rook_bits:07b}", end="")
            return

        # Rook → a8 : encoding complete
        if piece == 'R' and to_file == 'a' and to_rank == 8:
            if b.mode == 'INT_COMMIT':
                b.mode        = 'IDLE'
                b.current_var = None
                b.rook_bits   = 0
                print("→ encoding_complete", end="")
            return

    # ── Checkmate → program exit ──────────────────────────────────────────────

    def _checkmate(self, side):
        print("→ exit()  [CHECKMATE]")
        print()
        print("  Final variable store:")
        for k, v in self.board.variables.items():
            print(f"    {k} = {v}")
        sys.exit(0)


# ─── Entry point ─────────────────────────────────────────────────────────────

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python lonely_chess_interpreter.py <game.pgn>")
        sys.exit(1)

    interp = LonelyChessInterpreter()
    interp.run(sys.argv[1])