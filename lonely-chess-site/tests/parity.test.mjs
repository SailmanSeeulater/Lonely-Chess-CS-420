// The browser interpreter must print exactly what the Python reference prints.
import fs from "node:fs";
import path from "node:path";

import { run } from "../lib/interpreter.ts";
import { REPO_ROOT, reporter, runPython } from "./helpers.mjs";

const t = reporter("parity");

function check(label, text, expected, { expectError = false } = {}) {
  const ts = run(text);
  const py = runPython(text);
  const same = JSON.stringify(ts.lines) === JSON.stringify(py.lines) && (ts.error === null) === (py.error === null);
  const matches = JSON.stringify(ts.lines) === JSON.stringify(expected);
  const errorOk = expectError ? ts.error !== null : ts.error === null;
  t.check(same && matches && errorOk, label, `ts=${JSON.stringify(ts.lines).slice(0, 60)} py=${JSON.stringify(py.lines).slice(0, 60)}`);
}

const fizz = (n) =>
  Array.from({ length: n }, (_, k) => {
    const i = k + 1;
    return (i % 3 === 0 ? "Fizz" : "") + (i % 5 === 0 ? "Buzz" : "") || String(i);
  });

const SAMPLES = {
  "sample_int100.pgn": ["100"],
  "sample_int95.pgn": ["95"],
  "sample_str_hello.pgn": ["Hello World"],
  "sample_dom_dabish.pgn": ["I love to learn coding with Dom Dabish"],
  "sample_arithmetic.pgn": ["24", "20", "80", "20"],
  "actual_game_sample.pgn": ["100"],
  "fizzbuzz_complete.pgn": fizz(15),
  "fizzbuzz_100.pgn": fizz(100),
};
for (const [file, expected] of Object.entries(SAMPLES)) {
  check(file, fs.readFileSync(path.join(REPO_ROOT, file), "utf8"), expected);
}

// The same cases as test_lonely_chess.py.
const INT_100 = `[Event "Test"]

1. Na3 {b} 2. h3 {b} 3. h4 Ra6 4. Nc4 Rb6 5. Na3 Rc6 6. Nc4 Rf6
7. Na3 Ra6 8. Nb1 Ra8 9. h5 e6 10. Qd2 e5 11. Qd1 e4 *
`;
const int100 = (b1 = "a5", b2 = "a4") =>
  INT_100.replace("1. Na3 {b}", `1. Na3 ${b1}`).replace("2. h3 {b}", `2. h3 ${b2}`);

check("baseline", int100(), ["100"]);
check("NAG is ignored", int100().replace("1. Na3 a5", "1. Na3 a5 $1"), ["100"]);
check("suffix annotation is ignored", int100().replace("11. Qd1", "11. Qd1!!"), ["100"]);
check("variation is ignored", int100().replace("2. h3", "2. h3 (2. Nc3 a4 3. Nb1 Ra8)"), ["100"]);
check("semicolon comment is ignored", int100().replace('[Event "Test"]', '[Event "Test"]\n; a comment'), ["100"]);
check("brace comment is ignored", int100().replace("3. h4", "{ note } 3. h4"), ["100"]);
check("glued move numbers", int100().replace("4. Nc4", "4.Nc4").replace("5. Na3", "5...Na3"), ["100"]);
check(
  "checkmate halts execution",
  int100().replace("11. Qd1 e4 *", "11. Qd1 e4 12. Nc3# e3 13. h6 d6 14. Qd2 d5 15. Qd1 d4 *"),
  ["100"]
);
check("empty program is silent", '[Event "t"]\n\n*\n', []);
check("negative integer", int100("a5", "h5"), ["-100"]);
check(
  "seven-bit ceiling",
  int100().replace(
    "4. Nc4 Rb6 5. Na3 Rc6 6. Nc4 Rf6\n7. Na3 Ra6",
    "4. Nc4 Rb6 5. Na3 Rc6 6. Nc4 Rd6 7. Na3 Re6 8. Nc4 Rf6 9. Na3 Rg6 10. Nc4 Rh6 11. Na3 Ra6"
  ),
  ["127"]
);
check(
  "division by zero is an error",
  `[Event "t"]

1. Na3 a5 2. h3 a4 3. h4 Ra6 4. Nc4 Rb6 5. Na3 Rc6 6. Nc4 Rf6 7. Na3 Ra6
8. Nb1 Ra8 9. Na3 a3 10. g3 b6 11. g4 Ra6 12. Na3 Ra6 13. Nb1 Ra8
14. b5 e5 15. Rh2 b4 16. Rg2 c6 17. Ra2 c5 18. Ra1 c4
19. h5 d6 20. Qd2 d5 21. Qd1 d4 *
`,
  [],
  { expectError: true }
);

t.finish();
