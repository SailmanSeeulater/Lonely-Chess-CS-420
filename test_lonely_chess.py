#!/usr/bin/env python3
"""
Regression tests for Lonely Chess.

    python test_lonely_chess.py

Pure standard library.  Every documented sample program is executed and its
output compared against the values printed in README.md, so the docs cannot
drift away from the implementation without a test going red.
"""

import io
import os
import contextlib
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lonely_chess_runtime import LonelyChessRuntime  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


def run_source(text):
    """Execute a PGN string and return its output lines."""
    fd, path = tempfile.mkstemp(suffix='.pgn')
    try:
        with os.fdopen(fd, 'w') as fh:
            fh.write(text)
        return run_file(path)
    finally:
        os.unlink(path)


def run_file(path):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        LonelyChessRuntime().run(path)
    return buf.getvalue().splitlines()


def sample(name):
    return run_file(os.path.join(HERE, name))


# The canonical "int p_h2 = 100 then print(p_h2)" program, as a template.
INT_100 = """[Event "Test"]

1. Na3 {b} 2. h3 {b} 3. h4 Ra6 4. Nc4 Rb6 5. Na3 Rc6 6. Nc4 Rf6
7. Na3 Ra6 8. Nb1 Ra8 9. h5 e6 10. Qd2 e5 11. Qd1 e4 *
"""


def int_100(black_move_1='a5', black_move_2='a4'):
    return (INT_100
            .replace('1. Na3 {b}', '1. Na3 ' + black_move_1)
            .replace('2. h3 {b}', '2. h3 ' + black_move_2))


class DocumentedSamples(unittest.TestCase):
    """Each assertion mirrors a value printed in README.md."""

    def test_int_100(self):
        self.assertEqual(sample('sample_int100.pgn'), ['100'])

    def test_int_95(self):
        self.assertEqual(sample('sample_int95.pgn'), ['95'])

    def test_string_hello(self):
        self.assertEqual(sample('sample_str_hello.pgn'), ['Hello World'])

    def test_long_string(self):
        self.assertEqual(sample('sample_dom_dabish.pgn'),
                         ['I love to learn coding with Dom Dabish'])

    def test_arithmetic(self):
        self.assertEqual(sample('sample_arithmetic.pgn'),
                         ['24', '20', '80', '20'])

    def test_real_chess_game_is_a_valid_program(self):
        """actual_game_sample.pgn is legal over-the-board chess AND prints 100."""
        self.assertEqual(sample('actual_game_sample.pgn'), ['100'])

    def test_fizzbuzz_15(self):
        self.assertEqual(sample('fizzbuzz_complete.pgn'), expected_fizzbuzz(15))

    def test_fizzbuzz_100(self):
        self.assertEqual(sample('fizzbuzz_100.pgn'), expected_fizzbuzz(100))


def expected_fizzbuzz(n):
    out = []
    for i in range(1, n + 1):
        word = ('Fizz' if i % 3 == 0 else '') + ('Buzz' if i % 5 == 0 else '')
        out.append(word or str(i))
    return out


class PgnRobustness(unittest.TestCase):
    """Standard PGN annotations must not change a program's meaning."""

    def test_baseline(self):
        self.assertEqual(run_source(int_100()), ['100'])

    def test_nag_is_ignored(self):
        src = int_100().replace('1. Na3 a5', '1. Na3 a5 $1')
        self.assertEqual(run_source(src), ['100'])

    def test_suffix_annotation_is_ignored(self):
        src = int_100().replace('11. Qd1', '11. Qd1!!')
        self.assertEqual(run_source(src), ['100'])

    def test_variation_is_ignored(self):
        src = int_100().replace('2. h3', '2. h3 (2. Nc3 a4 3. Nb1 Ra8)')
        self.assertEqual(run_source(src), ['100'])

    def test_semicolon_comment_is_ignored(self):
        src = int_100().replace('[Event "Test"]',
                                '[Event "Test"]\n; a rest-of-line comment')
        self.assertEqual(run_source(src), ['100'])

    def test_brace_comment_is_ignored(self):
        src = int_100().replace('3. h4', '{ note } 3. h4')
        self.assertEqual(run_source(src), ['100'])

    def test_checkmate_halts_execution(self):
        src = int_100().replace('11. Qd1 e4 *',
                                '11. Qd1 e4 12. Nc3# e3 13. h6 d6 14. Qd2 d5 15. Qd1 d4 *')
        self.assertEqual(run_source(src), ['100'])

    def test_empty_program_is_silent(self):
        self.assertEqual(run_source('[Event "t"]\n\n*\n'), [])


class Encoding(unittest.TestCase):

    def test_negative_integer(self):
        """Black h7->h5 during int setup negates the encoded value."""
        self.assertEqual(run_source(int_100(black_move_2='h5')), ['-100'])

    def test_seven_bit_ceiling(self):
        """b6..h6 all set is the largest encodable value."""
        src = int_100().replace(
            '4. Nc4 Rb6 5. Na3 Rc6 6. Nc4 Rf6\n7. Na3 Ra6',
            '4. Nc4 Rb6 5. Na3 Rc6 6. Nc4 Rd6 7. Na3 Re6 '
            '8. Nc4 Rf6 9. Na3 Rg6 10. Nc4 Rh6 11. Na3 Ra6')
        self.assertEqual(run_source(src), ['127'])


class Arithmetic(unittest.TestCase):

    def test_division_by_zero_is_an_error(self):
        src = """[Event "t"]

1. Na3 a5 2. h3 a4 3. h4 Ra6 4. Nc4 Rb6 5. Na3 Rc6 6. Nc4 Rf6 7. Na3 Ra6
8. Nb1 Ra8 9. Na3 a3 10. g3 b6 11. g4 Ra6 12. Na3 Ra6 13. Nb1 Ra8
14. b5 e5 15. Rh2 b4 16. Rg2 c6 17. Ra2 c5 18. Ra1 c4
19. h5 d6 20. Qd2 d5 21. Qd1 d4 *
"""
        with self.assertRaises(ZeroDivisionError):
            run_source(src)

    def test_truncation_toward_zero(self):
        """-7 / 2 == -3, not -4 (C-style truncation, as documented)."""
        from lonely_chess_runtime import LonelyChessRuntime as RT
        rt = RT()
        b = rt.board
        b.variables['p_h2'] = -7
        b.variables['p_g2'] = 2
        b.arith_op, b.arith_mode = '/', 'RETURN'
        b.arith_op1_var, b.arith_op2_var = 'p_h2', 'p_g2'
        rt._white('R', 'a', 1)
        self.assertEqual(b.variables['p_h2'], -3)


if __name__ == '__main__':
    unittest.main(verbosity=2)