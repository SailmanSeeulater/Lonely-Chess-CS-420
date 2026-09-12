"""
lonely_chess_interpreter.py  (v7)
==================================
Lonely Chess — chess-based esoteric language interpreter.

Usage:
    python lonely_chess_interpreter.py game.pgn

Pure Python — no external dependencies.

FizzBuzz pattern:
    for num in range(1, 101):
        output = ""
        if num % 3 == 0: output += "Fizz"
        if num % 5 == 0: output += "Buzz"
        print(output or num)

Per-iteration move structure:
    Bh3 / Rh3 / Ra3 / [bounces×3] / Ra1 / Bf1   → if num%3==0: buffer+="Fizz"
    Bh3 / Rh3 / Ra3 / [bounces×5] / Ra1 / Bf1   → if num%5==0: buffer+="Buzz"
    Ke1                                           → print(buffer or i), i++
    Ke2                                           → next iteration
"""

import sys, re


class ProgramExit(Exception):
    """Raised by a checkmate (`#`) move to halt the program.

    Using an exception rather than sys.exit() keeps the interpreter embeddable:
    a host program can run a .pgn file without having its own process killed.
    """


# ─── Regex move parser ────────────────────────────────────────────────────────

MOVE_RE = re.compile(
    r'(?P<castle>O-O-O|O-O)[+#]?'
    r'|(?P<piece>[KQRBN])(?P<from_f>[a-h])(?P<from_r>[1-8])x?(?P<to_f2>[a-h])(?P<to_r2>[1-8])(?:=[KQRBN])?(?P<chk2>[+#])?'
    r'|(?P<piece2>[KQRBN])x?(?P<to_f>[a-h])(?P<to_r>[1-8])(?:=[KQRBN])?(?P<chk>[+#])?'
    r'|(?P<pfrom>[a-h])x(?P<pto_f>[a-h])(?P<pto_r>[1-8])(?:=[KQRBN])?(?P<pchk>[+#])?'
    r'|(?P<ppush_f>[a-h])(?P<ppush_r>[1-8])(?:=[KQRBN])?(?P<ppchk>[+#])?'
)

def parse_move(token):
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
    """Tokenise a PGN file into (move_num, white_token, black_token) triples.

    Handles the full standard PGN import format: brace comments, rest-of-line
    (";") comments, recursive annotation variations, NAGs ($1), and suffix
    annotations (!, ?, !!, ?!).  Anything that is not a playable move token is
    discarded *before* plies are paired, so stray tokens can never desynchronise
    White and Black for the remainder of the file.
    """
    with open(path, 'r') as f:
        text = f.read()

    headers = re.findall(r'\[(\w+)\s+"([^"]*)"\]', text)

    move_text = re.sub(r'\{[^}]*\}', ' ', text)          # { brace comments }
    move_text = re.sub(r';[^\n]*', ' ', move_text)        # ; rest-of-line comments
    move_text = re.sub(r'\[[^\]]*\]', ' ', move_text)     # [Header "tags"]

    # Recursive annotation variations — innermost first, repeat until stable.
    prev = None
    while prev != move_text:
        prev = move_text
        move_text = re.sub(r'\([^()]*\)', ' ', move_text)

    move_text = re.sub(r'\$\d+', ' ', move_text)          # NAGs
    move_text = re.sub(r'(1-0|0-1|1/2-1/2|\*)', ' ', move_text)

    tokens = []
    for raw in move_text.split():
        tok = re.sub(r'^\d+\.+', '', raw)                # glued "12.Nf3"
        tok = tok.rstrip('!?')                            # suffix annotations
        if not tok or re.fullmatch(r'\d+\.*', tok):
            continue
        if parse_move(tok) is None:
            continue                                      # never consumes a ply slot
        tokens.append(tok)

    moves = []
    for i in range(0, len(tokens), 2):
        white = tokens[i]
        black = tokens[i + 1] if i + 1 < len(tokens) else None
        moves.append((i // 2 + 1, white, black))
    return headers, moves


# ─── Board state ─────────────────────────────────────────────────────────────

class BoardState:
    def __init__(self):
        self.variables      = {}
        self.mode           = 'IDLE'
        self.current_var    = None
        self.rook_bits      = 0
        self.str_buffer     = ""
        self.str_resetting  = False
        self.print_var      = None
        self.negative_flag  = False

        # For loop
        self.loop_i         = 0
        self.loop_end       = 0
        self.loop_active    = False
        self.loop_rook_pos  = 'h1'

        # Output buffer (accumulates Fizz/Buzz per iteration)
        self.output_buffer  = ""

        # Arithmetic state
        self.arith_op       = None   # '+' '-' '*' '/'
        self.arith_op1_var  = None   # variable name of operand 1 (result stored here)
        self.arith_op2_var  = None   # variable name of operand 2
        self.arith_mode     = None   # None | 'OP1' | 'OP2' | 'RETURN'
        self.arith_rook_pos = 'a1'   # tracks a-rook position during arithmetic

        # If block
        self.if_open        = False
        self.if_count       = 0   # how many if blocks opened this iteration
        self.if_var         = None  # variable supplying this block's word

        # Modulo
        self.mod_open       = False
        self.mod_count      = 0
        self.mod_rook_pos   = 'a1'

    @staticmethod
    def file_to_col(f):
        return ord(f) - ord('a') + 1


# ─── Interpreter ─────────────────────────────────────────────────────────────

class LonelyChessInterpreter:

    def __init__(self):
        self.board         = BoardState()
        self._annotation   = ""
        self._print_output = None

    def run(self, pgn_path):
        headers, moves = parse_pgn(pgn_path)

        print("=" * 56)
        print("  Lonely Chess Interpreter")
        print("=" * 56)
        for key, val in headers:
            print(f"  {key:15s} {val}")
        print()

        try:
            for move_num, white_tok, black_tok in moves:
                self._step(move_num, 'W', white_tok)
                if black_tok:
                    self._step(move_num, 'B', black_tok)
        except ProgramExit:
            pass

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

        self._annotation   = ""
        self._print_output = None
        if side == 'W':
            self._white(piece, to_file, to_rank)
        else:
            self._black(piece, to_file, to_rank)

        print(f"{label:<28}{self._annotation}")

        if self._print_output:
            label_str, val = self._print_output
            val_str = str(val)
            border  = "═" * (len(label_str) + len(val_str) + 4)
            print(f"  ╔{border}╗")
            print(f"  ║  {label_str}: {val_str}  ║")
            print(f"  ╚{border}╝")

    # ── White moves ───────────────────────────────────────────────────────────

    def _white(self, piece, to_file, to_rank):
        b = self.board

        # ── FOR LOOP ─────────────────────────────────────────────────────────

        # King e1→e2 : start loop or next iteration
        if piece == 'K' and to_file == 'e' and to_rank == 2:
            if not b.loop_active:
                b.loop_active  = True
                b.loop_i       = 1
                b.mode         = 'FOR_RANGE'
                b.output_buffer = ""
                self._annotation = "→ for loop start  (i=1)"
            else:
                b.loop_i      += 1
                b.output_buffer = ""
                b.if_count     = 0
                if b.loop_i > b.loop_end:
                    b.loop_active = False
                    b.mode        = 'IDLE'
                    self._annotation = f"→ loop end  (i={b.loop_i} > {b.loop_end})"
                else:
                    self._annotation = f"→ next iteration  i={b.loop_i}"
            return

        # King e2→e1 : end of iteration → print(buffer or i)
        if piece == 'K' and to_file == 'e' and to_rank == 1:
            output = b.output_buffer if b.output_buffer else str(b.loop_i)
            self._annotation   = f"→ end iteration  →  {output}"
            self._print_output = (f"i={b.loop_i}", output)
            b.output_buffer    = ""
            b.if_count         = 0
            return

        # W Rook h1→h2 : arm loop variable (only fires during loop setup/running)
        if piece == 'R' and to_file == 'h' and to_rank == 2 and b.loop_active:
            if b.mode == 'FOR_RANGE':
                b.loop_rook_pos  = 'h2'
                self._annotation = "→ arm loop var i"
            elif b.loop_rook_pos == 'h3':
                b.loop_rook_pos  = 'h2'
                self._annotation = f"→ i++ complete  i={b.loop_i}"
            return

        # W Rook h1 : close range declaration
        if piece == 'R' and to_file == 'h' and to_rank == 1:
            if b.mode == 'FOR_RANGE':
                b.mode           = 'FOR_RUNNING'
                b.loop_rook_pos  = 'h1'
                self._annotation = f"→ loop armed  range(1, {b.loop_end + 1})"
            return

        # W Rook h2→h3 : push i into condition OR i++ step 1
        if piece == 'R' and to_file == 'h' and to_rank == 3:
            if b.if_open:
                b.loop_rook_pos  = 'h3'
                self._annotation = f"→ push i={b.loop_i} into condition"
            elif b.loop_active:
                b.loop_rook_pos  = 'h3'
                self._annotation = f"→ i++ step 1"
            return

        # ── IF BLOCK ─────────────────────────────────────────────────────────

        # W Bishop f1→h3 : open if block
        if piece == 'B' and to_file == 'h' and to_rank == 3:
            b.if_open   = True
            b.if_var    = None
            b.if_count += 1
            self._annotation = f"→ if  (block {b.if_count})"
            return

        # W Pawn push while an if block is open : choose which variable
        # supplies the word appended on a match.  Omit it and the historical
        # positional default applies (block 1 -> p_g2, block 2+ -> p_f2).
        if piece == 'P' and b.if_open:
            b.if_var = f"p_{to_file}2"
            self._annotation = f"→ if-block word source: {b.if_var}"
            return

        # W Bishop h3→f1 : close if block
        if piece == 'B' and to_file == 'f' and to_rank == 1:
            b.if_open = False
            self._annotation = f"→ close if  (block {b.if_count})"
            return

        # ── MODULO ────────────────────────────────────────────────────────────

        # W Rook a1→a3 : open modulo
        if piece == 'R' and to_file == 'a' and to_rank == 3:
            b.mod_open     = True
            b.mod_count    = 0
            b.mod_rook_pos = 'a3'
            self._annotation = "→ % modulo open"
            return

        # W Rook a3→a1 : close modulo, evaluate, append to buffer if matched
        # Only intercept if modulo is actually open — otherwise fall through to arithmetic
        if piece == 'R' and to_file == 'a' and to_rank == 1 and b.mod_open:
            divisor        = b.mod_count
            b.mod_open     = False
            b.mod_rook_pos = 'a1'
            matched        = (b.loop_i % divisor == 0) if divisor > 0 else False
            if matched:
                var    = b.if_var or ('p_g2' if b.if_count == 1 else 'p_f2')
                word   = b.variables.get(var, f"<{var}>")
                b.output_buffer += word
                self._annotation = f"→ i%{divisor}==0 ✓  buffer+=\"{word}\"  buffer=\"{b.output_buffer}\""
            else:
                self._annotation = f"→ i%{divisor}=={b.loop_i % divisor if divisor else '?'}  no match"
            return

        # ── ARITHMETIC ───────────────────────────────────────────────────────────

        # W Rook a1→rank2 : select op1
        if piece == 'R' and to_rank == 2 and b.arith_mode == 'OP1' and b.arith_rook_pos == 'a1':
            var_name         = f"p_{to_file}2"
            b.arith_op1_var  = var_name
            b.arith_mode     = 'OP2'
            b.arith_rook_pos = f"{to_file}2"
            self._annotation = f"→ arith op1: {var_name} = {b.variables.get(var_name, '?')}"
            return

        # W Rook rank2→rank2 : select op2
        if piece == 'R' and to_rank == 2 and b.arith_mode == 'OP2':
            var_name         = f"p_{to_file}2"
            b.arith_op2_var  = var_name
            b.arith_mode     = 'RETURN'
            b.arith_rook_pos = f"{to_file}2"
            self._annotation = f"→ arith op2: {var_name} = {b.variables.get(var_name, '?')}"
            return

        # W Rook rank2→a2 : begin return
        if piece == 'R' and to_file == 'a' and to_rank == 2 and b.arith_mode == 'RETURN':
            b.arith_rook_pos = 'a2'
            self._annotation = "→ arith returning"
            return

        # W Rook a2→a1 : EXECUTE
        if piece == 'R' and to_file == 'a' and to_rank == 1 and b.arith_mode == 'RETURN':
            v1  = b.variables.get(b.arith_op1_var, 0)
            v2  = b.variables.get(b.arith_op2_var, 0)
            op  = b.arith_op
            if   op == '+': result = v1 + v2
            elif op == '-': result = v1 - v2
            elif op == '*': result = v1 * v2
            elif op == '/':
                if v2 == 0:
                    raise ZeroDivisionError(
                        f"division by zero: {b.arith_op1_var} / {b.arith_op2_var}")
                q      = abs(v1) // abs(v2)          # exact; truncates toward zero
                result = q if (v1 < 0) == (v2 < 0) else -q
            b.variables[b.arith_op1_var] = result
            self._annotation = f"→ EXECUTE: {b.arith_op1_var} = {v1} {op} {v2} = {result}"
            b.arith_op = None; b.arith_mode = None
            b.arith_op1_var = None; b.arith_op2_var = None
            b.arith_rook_pos = 'a1'
            return

        # ── VARIABLE DECLARATION (existing) ──────────────────────────────────

        if piece == 'N' and to_file == 'a' and to_rank == 3:
            if b.mode == 'IDLE':
                b.mode = 'INT_SETUP'
                self._annotation = "→ begin_int mode"
            else:
                self._annotation = "→ no_op (wait)"
            return

        if piece == 'N' and to_file == 'c' and to_rank == 3:
            if b.mode == 'IDLE':
                b.mode = 'STR_SETUP'
                self._annotation = "→ begin_string mode"
            else:
                self._annotation = "→ no_op (wait)"
            return

        if piece == 'P' and b.mode in ('INT_SETUP', 'STR_SETUP'):
            if b.current_var is None:
                b.current_var    = f"p_{to_file}2"
                self._annotation = f"→ declare var: {b.current_var}"
            else:
                self._annotation = f"→ setup pawn no-op  (var={b.current_var})"
            return

        if piece == 'N' and to_file == 'b' and to_rank == 1:
            if b.mode == 'INT_ENCODING':
                value = -b.rook_bits if b.negative_flag else b.rook_bits
                b.variables[b.current_var] = value
                b.mode = 'INT_COMMIT'; b.negative_flag = False
                self._annotation = f"→ commit {b.current_var} = {value}"
            elif b.mode == 'STR_ENCODING':
                b.variables[b.current_var] = b.str_buffer
                b.mode = 'STR_COMMIT'
                self._annotation = f"→ commit {b.current_var} = \"{b.str_buffer}\""
                b.str_buffer = ""
            return

        if piece == 'N' and b.mode in ('INT_ENCODING', 'STR_ENCODING'):
            self._annotation = "→ no_op (wait)"
            return

        # ── PRINT SEQUENCE (manual, outside loop) ────────────────────────────

        if piece == 'P' and b.mode == 'IDLE':
            var_name = f"p_{to_file}2"
            if var_name in b.variables:
                b.print_var      = var_name
                b.mode           = 'PRINT_PAWN_MOVED'
                self._annotation = f"→ print select: {var_name}"
            return

        if piece == 'Q' and b.mode == 'PRINT_PAWN_MOVED':
            if to_rank == 2:
                b.mode           = 'PRINT_WAIT'
                self._annotation = "→ initiate_print"
            return

        if piece == 'Q' and to_rank == 1 and b.mode == 'PRINT_WAIT':
            val                  = b.variables.get(b.print_var, "<undefined>")
            self._annotation     = f"→ print({b.print_var})"
            self._print_output   = (f"print({b.print_var})", val)
            b.mode               = 'IDLE'
            b.print_var          = None
            return

    # ── Black moves ───────────────────────────────────────────────────────────

    def _black(self, piece, to_file, to_rank):
        b = self.board

        # Modulo counting: Rook bounces a3↔a2
        # Only handle Ra2/Ra3 as bounces when mod is open AND rook is on the
        # correct source square — prevents confusion with other Ra3 moves
        if piece == 'R' and to_file == 'a' and b.mod_open:
            if to_rank == 2 and b.mod_rook_pos == 'a3':
                b.mod_count   += 1
                b.mod_rook_pos = 'a2'
                self._annotation = f"→ mod count={b.mod_count}"
                return
            elif to_rank == 3 and b.mod_rook_pos == 'a2':
                b.mod_rook_pos = 'a3'
                self._annotation = "→ mod bounce"
                return

        # For range encoding: Black Rook scans rank 6
        if piece == 'R' and b.mode == 'FOR_RANGE':
            if to_file == 'a' and to_rank == 6:
                if b.rook_bits == 0:
                    self._annotation = "→ enter range encoding"
                else:
                    b.loop_end       = b.rook_bits
                    b.rook_bits      = 0
                    self._annotation = f"→ range end = {b.loop_end}"
            elif to_rank == 6 and to_file in 'bcdefgh':
                col     = b.file_to_col(to_file)
                bit_pos = 8 - col
                b.rook_bits     |= (1 << bit_pos)
                self._annotation = f"→ range bit[{bit_pos}]=1  acc={b.rook_bits:07b}"
            return

        # Setup fillers
        if piece == 'P' and b.mode in ('INT_SETUP', 'STR_SETUP'):
            # Black h7->h5 during INT_SETUP negates the value about to be encoded.
            if b.mode == 'INT_SETUP' and to_file == 'h' and to_rank == 5:
                b.negative_flag  = True
                self._annotation = "→ negate  (value will be negative)"
            else:
                self._annotation = "→ clear path (no-op)"
            return

        # Arithmetic operator signals (Black pawn rank 7→5)
        # Ignore if arithmetic is already in progress (mid-sequence)
        op_map = {'h': '+', 'g': '-', 'f': '*', 'e': '/'}
        if piece == 'P' and to_rank == 5 and to_file in op_map:
            if b.arith_mode is None:
                b.arith_op       = op_map[to_file]
                b.arith_mode     = 'OP1'
                b.arith_op1_var  = None
                b.arith_op2_var  = None
                b.arith_rook_pos = 'a1'
                self._annotation = f"→ arm operator: {op_map[to_file]}"
            else:
                self._annotation = f"→ (operator {op_map[to_file]} ignored — arith in progress)"
            return

        # Encoding (existing)
        if piece == 'R' and to_file == 'a' and to_rank == 6:
            if b.mode == 'INT_SETUP':
                b.mode = 'INT_ENCODING'; b.rook_bits = 0
                self._annotation = "→ enter_encoding_mode"
            elif b.mode == 'STR_SETUP':
                b.mode = 'STR_ENCODING'; b.rook_bits = 0
                b.str_buffer = ""; b.str_resetting = False
                self._annotation = "→ enter_string_encoding_mode"
            elif b.mode == 'INT_ENCODING':
                self._annotation = f"→ finalise  {b.rook_bits:07b} = {b.rook_bits}"
            elif b.mode == 'STR_ENCODING':
                if b.str_resetting:
                    b.str_resetting  = False
                    b.rook_bits      = 0
                    self._annotation = "→ reset complete, ready for next char"
                else:
                    ch               = chr(b.rook_bits)
                    b.str_buffer    += ch
                    self._annotation = f"→ finalise char '{ch}'  buffer=\"{b.str_buffer}\""
                    b.rook_bits      = 0
            return

        if piece == 'R' and to_file == 'a' and to_rank == 8:
            if b.mode == 'INT_COMMIT':
                b.mode = 'IDLE'; b.current_var = None; b.rook_bits = 0
                self._annotation = "→ encoding_complete"
            elif b.mode == 'STR_COMMIT':
                b.mode = 'IDLE'; b.current_var = None; b.rook_bits = 0
                self._annotation = "→ encoding_complete"
            elif b.mode == 'STR_ENCODING':
                b.str_resetting  = True
                self._annotation = "→ reset (between chars)"
            return

        if piece == 'R' and to_rank == 6 and to_file in 'bcdefgh':
            if b.mode in ('INT_ENCODING', 'STR_ENCODING'):
                col = b.file_to_col(to_file); bit_pos = 8 - col
                b.rook_bits     |= (1 << bit_pos)
                self._annotation = f"→ write_bit[{bit_pos}]=1  acc={b.rook_bits:07b}"
            return

    # ── Checkmate → exit ─────────────────────────────────────────────────────

    def _checkmate(self, side):
        print("→ exit()  [CHECKMATE]")
        print()
        print("  Final variable store:")
        for k, v in self.board.variables.items():
            print(f"    {k} = {repr(v)}")
        raise ProgramExit()


# ─── Entry point ─────────────────────────────────────────────────────────────

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python lonely_chess_interpreter.py <game.pgn>", file=sys.stderr)
        sys.exit(1)
    try:
        LonelyChessInterpreter().run(sys.argv[1])
    except FileNotFoundError:
        print(f"error: no such PGN file: {sys.argv[1]}", file=sys.stderr)
        sys.exit(1)
    except (ZeroDivisionError, ValueError) as exc:
        print(f"runtime error: {exc}", file=sys.stderr)
        sys.exit(1)