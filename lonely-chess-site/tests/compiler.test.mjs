// Every compiled program must print its input in both interpreters and be
// a sequence of legal chess moves.
import { replaySan } from "../lib/chess.ts";
import { compile } from "../lib/compiler.ts";
import { run, tokenize } from "../lib/interpreter.ts";
import { reporter, runPython } from "./helpers.mjs";

const t = reporter("compiler");

function verify(input, { python }) {
  const result = compile(input);
  if (!result.ok) return t.check(false, JSON.stringify(input), `did not compile: ${result.message}`);

  const problems = [];
  const ts = run(result.pgn);
  if (JSON.stringify(ts.lines) !== JSON.stringify([input])) problems.push(`ts printed ${JSON.stringify(ts.lines)}`);

  const tokens = tokenize(result.pgn);
  const replay = replaySan(tokens);
  if (replay.illegalAt !== null) problems.push(`ply ${replay.illegalAt + 1} (${tokens[replay.illegalAt]}) is illegal`);
  else if (replay.sans.join(" ") !== tokens.join(" ")) problems.push("tokens differ from the SAN a board would write");

  if (python) {
    const py = runPython(result.pgn);
    if (JSON.stringify(py.lines) !== JSON.stringify([input])) problems.push(`python printed ${JSON.stringify(py.lines)}`);
  }
  t.check(problems.length === 0, JSON.stringify(input), problems.join("; "));
}

for (let n = -127; n <= 127; n++) verify(String(n), { python: n % 8 === 0 || Math.abs(n) === 127 || n === -1 });

for (const s of ["a", "gg", "Hi", "Hello World", "checkmate", "}{", "a}b{c", "~!@#$%^&*()", "  spaced  ", " ", "-", "x".repeat(40)]) {
  verify(s, { python: true });
}

let seed = 42;
const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
for (let i = 0; i < 200; i++) {
  const length = 1 + Math.floor(random() * 40);
  let s = Array.from({ length }, () => String.fromCharCode(32 + Math.floor(random() * 95))).join("");
  if (/^-?\d+$/.test(s.trim())) s = `x${s.slice(1)}`; // numeric-looking input compiles as an int, by design
  verify(s, { python: i % 20 === 0 });
}

for (const [input, pattern] of [["", /type/], ["128", /7-bit/], ["-128", /7-bit/], ["é", /ASCII/], ["x".repeat(41), /40/]]) {
  const result = compile(input);
  t.check(!result.ok && pattern.test(result.message), `rejects ${JSON.stringify(input)}`);
}

t.finish();
