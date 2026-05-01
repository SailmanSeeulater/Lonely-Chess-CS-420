"""
lonely_chess_interpreter.py  (v3)
==================================
Lonely Chess — chess-based esoteric language interpreter.

Usage:
    python lonely_chess_interpreter.py game.pgn

Requires:
    pip install textx
"""

import sys
import os
from textx import metamodel_from_file


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


# ─── Move normaliser ──────────────────────────────────────────────────────────
# Collapses all 6 HalfMove sub-types into (piece, to_file, to_rank, is_checkmate)

def normalise(hm):
    cls = hm.__class__.__name__

    if cls == 'CastleMove':
        return ('K', None, None, hm.check == '#')

    to_file = hm.to_file
    to_rank = int(hm.to_rank)
    is_cm   = (hm.check == '#') if hm.check else False

    # Pawn moves have no .piece attribute
    if cls in ('PawnPush', 'PawnCapture'):
        piece = 'P'
    else:
        piece = hm.piece

    return (piece, to_file, to_rank, is_cm)


# ─── Interpreter ─────────────────────────────────────────────────────────────

class LonelyChessInterpreter:

    def __init__(self, grammar_path):
        self.mm    = metamodel_from_file(grammar_path)
        self.board = BoardState()

    def run(self, pgn_path):
        model = self.mm.model_from_file(pgn_path)

        print("=" * 56)
        print("  Lonely Chess Interpreter")
        print("=" * 56)
        for h in model.headers:
            print(f"  {h.key:15s} {h.value}")
        print()

        for entry in model.moves:
            n = entry.number
            self._step(n, 'W', entry.white)
            if entry.black:
                self._step(n, 'B', entry.black)

        print()
        print("─" * 56)
        print("  Variables at program end:")
        if self.board.variables:
            for k, v in self.board.variables.items():
                print(f"    {k} = {v}")
        else:
            print("    (none committed)")

    # ── single ply ────────────────────────────────────────────────────────────

    def _step(self, n, side, hm):
        piece, to_file, to_rank, is_cm = normalise(hm)

        dest  = f"{to_file}{to_rank}" if to_file else "O-O"
        label = f"  {n}{'.' if side == 'W' else '..'} {side} {piece}{dest}"
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
            return

        # Knight → c3 : begin STRING mode (stub)
        if piece == 'N' and to_file == 'c' and to_rank == 3:
            if b.mode == 'IDLE':
                b.mode = 'STR_SETUP'
                print("→ begin_string mode (stub)", end="")
            return

        # Pawn during INT_SETUP → declare variable name from home square
        if piece == 'P' and b.mode == 'INT_SETUP':
            if to_rank in (3, 4) and b.current_var is None:
                b.current_var = f"p_{to_file}2"
                print(f"→ declare var: {b.current_var}", end="")
            return

        # Knight oscillates during INT_ENCODING → no-op / wait
        if piece == 'N' and b.mode == 'INT_ENCODING':
            print("→ no_op (wait)", end="")
            return

        # Knight → b1 : commit variable
        if piece == 'N' and to_file == 'b' and to_rank == 1:
            if b.mode == 'INT_ENCODING':
                value = -b.rook_bits if b.negative_flag else b.rook_bits
                b.variables[b.current_var] = value
                b.mode          = 'INT_COMMIT'
                b.negative_flag = False
                print(f"→ commit {b.current_var} = {value}", end="")
            return

        # Queen → d2 : initiate print
        if piece == 'Q' and to_file == 'd' and to_rank == 2:
            b.mode      = 'PRINT_WAIT'
            b.print_var = None
            print("→ initiate_print", end="")
            return

        # Pawn during PRINT_WAIT → identify variable to print
        if piece == 'P' and b.mode == 'PRINT_WAIT':
            b.print_var = f"p_{to_file}2"
            print(f"→ print target: {b.print_var}", end="")
            return

        # Queen → d1 : finalise print / output
        if piece == 'Q' and to_file == 'd' and to_rank == 1:
            if b.mode == 'PRINT_WAIT' and b.print_var:
                val = b.variables.get(b.print_var, "<undefined>")
                print(f"→ print({b.print_var})", end="")
                print()
                print()
                print(f"  ╔══ OUTPUT ═══╗")
                print(f"  ║  {b.print_var} = {val}")
                print(f"  ╚═════════════╝", end="")
                b.mode = 'IDLE'
            return

    # ── Black moves ───────────────────────────────────────────────────────────

    def _black(self, piece, to_file, to_rank):
        b = self.board

        # Pawn during INT_SETUP : path-clearing (h7→h5 sets negative flag)
        if piece == 'P' and b.mode == 'INT_SETUP':
            if to_file == 'h' and to_rank == 5:
                b.negative_flag = True
                print("→ negative_flag SET", end="")
            else:
                print("→ clear path (no-op)", end="")
            return

        # Rook → a6 : arm encoding, or finalise on return
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
                col     = b.file_to_col(to_file)   # b→2 … h→8
                bit_pos = 8 - col                   # b→6(MSB) … h→0(LSB)
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

    # ── Checkmate → exit ──────────────────────────────────────────────────────

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

    grammar = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lonely_chess.tx')
    interp  = LonelyChessInterpreter(grammar)
    interp.run(sys.argv[1])