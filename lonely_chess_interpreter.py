"""
lonely_chess_interpreter.py  (v5)
==================================
Lonely Chess — chess-based esoteric language interpreter.

Usage:
    python lonely_chess_interpreter.py game.pgn

Pure Python — no external dependencies.
"""

import sys, re


# ─── Regex move parser ────────────────────────────────────────────────────────

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
    if m.group('piece'):
        return (m.group('piece'),  m.group('to_f2'), int(m.group('to_r2')), m.group('chk2') == '#')
    if m.group('piece2'):
        return (m.group('piece2'), m.group('to_f'),  int(m.group('to_r')),  m.group('chk')  == '#')
    if m.group('pfrom'):
        return ('P', m.group('pto_f'), int(m.group('pto_r')), m.group('pchk') == '#')
    if m.group('ppush_f'):
        return ('P', m.group('ppush_f'), int(m.group('ppush_r')), m.group('ppchk') == '#')
    return None


# ─── PGN tokeniser ───────────────────────────────────────────────────────────

def parse_pgn(path):
    with open(path, 'r') as f:
        text = f.read()

    text = re.sub(r'\{[^}]*\}', '', text)
    headers = re.findall(r'\[(\w+)\s+"([^"]*)"\]', text)
    move_text = re.sub(r'\[[^\]]*\]', '', text)
    move_text = re.sub(r'(1-0|0-1|1/2-1/2|\*)', '', move_text).strip()

    raw_tokens = move_text.split()
    move_tokens = [t for t in raw_tokens if not re.fullmatch(r'\d+\.+', t)]

    moves = []
    i = 0
    move_num = 1
    while i < len(move_tokens):
        white = move_tokens[i]; i += 1
        black = move_tokens[i] if i < len(move_tokens) else None
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
        self.str_buffer     = ""      # accumulates chars during STR_ENCODING
        self.str_resetting  = False   # True when rook went a6→a8, waiting for a6 return
        self.print_var      = None
        self.negative_flag  = False

    @staticmethod
    def file_to_col(f):
        return ord(f) - ord('a') + 1


# ─── Interpreter ─────────────────────────────────────────────────────────────

class LonelyChessInterpreter:

    def __init__(self):
        self.board          = BoardState()
        self._annotation    = ""
        self._print_output  = None

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
                print(f"    {k} = {repr(v)}")
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

        if is_cm:
            print(f"{label:<28}", end="")
            self._checkmate(side)
            return

        self._annotation    = ""
        self._print_output  = None
        if side == 'W':
            self._white(piece, to_file, to_rank)
        else:
            self._black(piece, to_file, to_rank)

        print(f"{label:<28}{self._annotation}")

        if self._print_output:
            var, val = self._print_output
            border = "═" * (len(str(val)) + 6)
            print()
            print(f"  ╔{border}╗")
            print(f"  ║  OUTPUT: {val}  ║")
            print(f"  ╚{border}╝")
            print()

    # ── White moves ───────────────────────────────────────────────────────────

    def _white(self, piece, to_file, to_rank):
        b = self.board

        # Knight → a3 : begin INTEGER mode
        if piece == 'N' and to_file == 'a' and to_rank == 3:
            if b.mode == 'IDLE':
                b.mode = 'INT_SETUP'
                self._annotation = "→ begin_int mode"
            else:
                self._annotation = "→ no_op (wait)"
            return

        # Knight → c3 : begin STRING mode
        if piece == 'N' and to_file == 'c' and to_rank == 3:
            if b.mode == 'IDLE':
                b.mode = 'STR_SETUP'
                self._annotation = "→ begin_string mode"
            else:
                self._annotation = "→ no_op (wait)"
            return

        # Pawn during INT_SETUP or STR_SETUP: first push names the var
        if piece == 'P' and b.mode in ('INT_SETUP', 'STR_SETUP'):
            if b.current_var is None:
                b.current_var = f"p_{to_file}2"
                self._annotation = f"→ declare var: {b.current_var}"
            else:
                self._annotation = f"→ setup pawn no-op  (var={b.current_var})"
            return

        # Knight → b1 : commit variable (MUST come before generic no-op)
        if piece == 'N' and to_file == 'b' and to_rank == 1:
            if b.mode == 'INT_ENCODING':
                value = -b.rook_bits if b.negative_flag else b.rook_bits
                b.variables[b.current_var] = value
                b.mode          = 'INT_COMMIT'
                b.negative_flag = False
                self._annotation = f"→ commit {b.current_var} = {value}"
            elif b.mode == 'STR_ENCODING':
                b.variables[b.current_var] = b.str_buffer
                b.mode       = 'STR_COMMIT'
                b.str_buffer = ""
                self._annotation = f"→ commit {b.current_var} = \"{b.variables[b.current_var]}\""
            return

        # Knight oscillates during encoding → no-op
        if piece == 'N' and b.mode in ('INT_ENCODING', 'STR_ENCODING'):
            self._annotation = "→ no_op (wait)"
            return

        # PRINT step 1: pawn push while IDLE selects variable
        if piece == 'P' and b.mode == 'IDLE':
            var_name = f"p_{to_file}2"
            if var_name in b.variables:
                b.print_var = var_name
                b.mode      = 'PRINT_PAWN_MOVED'
                self._annotation = f"→ print select: {var_name}"
            return

        # PRINT step 2: Queen advances → initiate print
        if piece == 'Q' and b.mode == 'PRINT_PAWN_MOVED':
            if to_rank == 2:
                b.mode = 'PRINT_WAIT'
                self._annotation = "→ initiate_print"
            return

        # PRINT step 3: Queen retreats → output value
        if piece == 'Q' and to_rank == 1 and b.mode == 'PRINT_WAIT':
            val = b.variables.get(b.print_var, "<undefined>")
            self._annotation = f"→ print({b.print_var})"
            # Print the output block after this move line is printed
            self._print_output = (b.print_var, val)
            b.mode      = 'IDLE'
            b.print_var = None
            return

    # ── Black moves ───────────────────────────────────────────────────────────

    def _black(self, piece, to_file, to_rank):
        b = self.board

        # Pawn during setup: path clearing
        if piece == 'P' and b.mode in ('INT_SETUP', 'STR_SETUP'):
            if to_file == 'h' and to_rank == 5:
                b.negative_flag = True
                self._annotation = "→ negative_flag SET"
            else:
                self._annotation = "→ clear path (no-op)"
            return

        # ── Rook → a6 ────────────────────────────────────────────────────────
        if piece == 'R' and to_file == 'a' and to_rank == 6:

            # Enter encoding from setup
            if b.mode == 'INT_SETUP':
                b.mode      = 'INT_ENCODING'
                b.rook_bits = 0
                self._annotation = "→ enter_encoding_mode"

            elif b.mode == 'STR_SETUP':
                b.mode         = 'STR_ENCODING'
                b.rook_bits    = 0
                b.str_buffer   = ""
                b.str_resetting = False
                self._annotation = "→ enter_string_encoding_mode"

            elif b.mode == 'INT_ENCODING':
                self._annotation = f"→ finalise  {b.rook_bits:07b} = {b.rook_bits}"

            elif b.mode == 'STR_ENCODING':
                if b.str_resetting:
                    # Rook returning after reset — ready for next character
                    b.str_resetting = False
                    b.rook_bits     = 0
                    self._annotation = "→ reset complete, ready for next char"
                else:
                    # Finalise current character
                    ch = chr(b.rook_bits)
                    b.str_buffer += ch
                    self._annotation = f"→ finalise char '{ch}'  buffer=\"{b.str_buffer}\""
                    b.rook_bits = 0
            return

        # ── Rook → a8 ────────────────────────────────────────────────────────
        if piece == 'R' and to_file == 'a' and to_rank == 8:
            if b.mode == 'INT_COMMIT':
                b.mode        = 'IDLE'
                b.current_var = None
                b.rook_bits   = 0
                self._annotation = "→ encoding_complete"
            elif b.mode == 'STR_COMMIT':
                b.mode        = 'IDLE'
                b.current_var = None
                b.rook_bits   = 0
                self._annotation = "→ encoding_complete"
            elif b.mode == 'STR_ENCODING':
                # Mid-encoding reset: rook parks at a8 between characters
                b.str_resetting = True
                self._annotation = "→ reset (between chars)"
            return

        # ── Rook along rank 6 (b6…h6): write bits ────────────────────────────
        if piece == 'R' and to_rank == 6 and to_file in 'bcdefgh':
            if b.mode in ('INT_ENCODING', 'STR_ENCODING'):
                col     = b.file_to_col(to_file)
                bit_pos = 8 - col
                b.rook_bits |= (1 << bit_pos)
                self._annotation = f"→ write_bit[{bit_pos}]=1  acc={b.rook_bits:07b}"
            return

    # ── Checkmate → program exit ──────────────────────────────────────────────

    def _checkmate(self, side):
        print("→ exit()  [CHECKMATE]")
        print()
        print("  Final variable store:")
        for k, v in self.board.variables.items():
            print(f"    {k} = {repr(v)}")
        sys.exit(0)


# ─── Entry point ─────────────────────────────────────────────────────────────

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python lonely_chess_interpreter.py <game.pgn>")
        sys.exit(1)

    interp = LonelyChessInterpreter()
    interp.run(sys.argv[1])