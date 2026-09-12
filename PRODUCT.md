# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: programmers, CS students, and esoteric-language enthusiasts (Hacker
News / r/programminglanguages / esolang-curious crowd) who land on the site
after seeing the project shared somewhere. Secondary: the course grader/instructor
for CS 420. Job to be done: understand, in under a minute, "wait — chess moves
are the source code?", then verify it's real by actually running a program.
*(Inferred from README framing and project structure; not directly confirmed.)*

## Product Purpose

Lonely Chess is an esoteric programming language: a legal-or-near-legal PGN
chess game is the source program. Chess moves encode variable declarations,
7-bit binary values, arithmetic, loops, conditionals, and print statements.
The website's purpose is to demonstrate and let visitors run this language in
the browser — it is a live proof, not just marketing copy. Success = a visitor
runs a real PGN program and sees correct output within their first minute on
the page.

## Positioning

Not "a chess website" and not "a toy esolang list entry." The specific,
unusual mechanism a neighboring project could not truthfully copy: **the
interpreter reads only move tokens, so a Lonely Chess program can simultaneously
be executable code and (at small scale) a legally playable chess game** —
verified in the README against a real chess engine, ply-by-ply, for each
sample file. The FizzBuzz-scale program diverges from legal chess at ply 6,
which is itself part of the honest story, not something to hide.

## Operating Context

- The in-browser runner re-implements the same parsing/interpretation rules
  as the Python reference implementation (`lonely_chess_runtime.py` /
  `lonely_chess_interpreter.py`) in TypeScript, client-side, no backend.
- Visitors paste or load a `.pgn` file's text, run it, and read printed output
  plus end-state variables — this is the load-bearing interactive feature of
  the page, not a decorative demo.
- Deployed as a static export to GitHub Pages (`npm run deploy` →
  `next build && gh-pages -d out`).
- The full language reference (piece-role table, binary encoding, loop/if/
  arithmetic mechanics) already exists as prose in the repo README and is
  real, non-negotiable technical content — not something to summarize away
  in a redesign.

## Capabilities and Constraints

- Pure client-side interpreter; no server, no persistence, no accounts.
- Integers/string chars are 7-bit (0–127); division by zero errors instead of
  silently producing a value; unrecognized move tokens are skipped, not
  reported as syntax errors — these are real, documented language limits, not
  bugs to paper over in copy.
- Real sample programs exist as `.pgn` files in the repo root
  (`sample_int100.pgn`, `sample_str_hello.pgn`, `sample_arithmetic.pgn`,
  `fizzbuzz_100.pgn`, `actual_game_sample.pgn`, etc.) — evidence on hand, see
  below.
- Undecided: whether the site should surface a legality-checked chessboard
  visualization of the running program (raised as a possible follow-up
  feature, not committed).

## Brand Commitments

Project name is fixed: **Lonely Chess**. Attributed to Perfect Phanitchaleun
and Nicolaus ReyasBautista, CS 420 Final Project. No existing logo/visual
identity beyond the current (to-be-replaced) generic template — this redesign
is establishing the first real visual world, not modifying a committed one.

## Evidence on Hand

Real, non-fabricated content already in the repo, safe to feature directly:

- `README.md` — full language reference, piece-role table, verified
  chess-legality table, sample output transcripts.
- `actual_game_sample.pgn`, `sample_int100.pgn`, `sample_int95.pgn`,
  `sample_str_hello.pgn`, `sample_dom_dabish.pgn`, `sample_arithmetic.pgn`,
  `fizzbuzz_complete.pgn`, `fizzbuzz_100.pgn` — real runnable programs.
- `lonely_chess_interpreter.py`, `lonely_chess_runtime.py`,
  `test_lonely_chess.py` — the reference implementation and its regression
  suite (stdlib-only Python).

No testimonials, press, benchmarks, or pricing exist and none should be
invented.

## Product Principles

1. The runner is the product. Every design decision should make "paste PGN →
   run → see correct output" faster to reach and more legible, not just
   decorate the page around it.
2. Show real chess, not a metaphor. The site should not shy away from actual
   PGN notation, real move tokens, and the real (sometimes-illegal-past-ply-6)
   relationship to legal chess — that tension is the actual hook.
3. Technical honesty over polish-washing. Known limits (7-bit range, skipped
   unrecognized tokens, divide-by-zero errors) are documented facts to state
   plainly, not smooth over.
4. One clear reading path for a cold visitor: hook → run it yourself → learn
   the rules → see more examples → run it locally.

## Accessibility & Inclusion

No project-specific requirement was established beyond ordinary WCAG AA
web-accessibility practice (keyboard operability of the runner, labeled form
controls, sufficient contrast) — treated as a baseline, not a special case.
