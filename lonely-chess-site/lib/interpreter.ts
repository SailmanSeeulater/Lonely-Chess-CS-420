/*
  Browser port of lonely_chess_runtime.py — the Python file is the reference
  implementation; this one must stay in lockstep with it (same tokenizer, same
  move semantics, same error behavior). Parity is checked by running every
  repository sample and every case from test_lonely_chess.py through both.
*/

export type PieceLetter = "K" | "Q" | "R" | "B" | "N" | "P";

export type ParsedMove = {
  piece: PieceLetter;
  toFile: string | null;
  toRank: number | null;
  checkmate: boolean;
};

export type RunResult = {
  lines: string[];
  variables: Record<string, string | number>;
  error: string | null;
};

const MOVE_RE = new RegExp(
  "^(?:(?<castle>O-O-O|O-O)[+#]?" +
    "|(?<piece>[KQRBN])(?<fromF>[a-h])(?<fromR>[1-8])x?(?<toF2>[a-h])(?<toR2>[1-8])(?:=[KQRBN])?(?<chk2>[+#])?" +
    "|(?<piece2>[KQRBN])x?(?<toF>[a-h])(?<toR>[1-8])(?:=[KQRBN])?(?<chk>[+#])?" +
    "|(?<pfrom>[a-h])x(?<ptoF>[a-h])(?<ptoR>[1-8])(?:=[KQRBN])?(?<pchk>[+#])?" +
    "|(?<ppushF>[a-h])(?<ppushR>[1-8])(?:=[KQRBN])?(?<ppchk>[+#])?)$"
);

export function parseMove(token: string): ParsedMove | null {
  const t = token.trim();
  const g = MOVE_RE.exec(t)?.groups;
  if (!g) return null;
  if (g.castle) return { piece: "K", toFile: null, toRank: null, checkmate: t.endsWith("#") };
  if (g.piece) {
    return { piece: g.piece as PieceLetter, toFile: g.toF2, toRank: Number(g.toR2), checkmate: g.chk2 === "#" };
  }
  if (g.piece2) {
    return { piece: g.piece2 as PieceLetter, toFile: g.toF, toRank: Number(g.toR), checkmate: g.chk === "#" };
  }
  if (g.pfrom) return { piece: "P", toFile: g.ptoF, toRank: Number(g.ptoR), checkmate: g.pchk === "#" };
  if (g.ppushF) return { piece: "P", toFile: g.ppushF, toRank: Number(g.ppushR), checkmate: g.ppchk === "#" };
  return null;
}

/*
  Mirrors parse_pgn(): comments, variations, NAGs, suffix annotations and
  glued move numbers are stripped, and anything that is not a playable move
  token is discarded BEFORE plies are paired, so a stray token can never
  shift White's moves onto Black.
*/
export function tokenize(text: string): string[] {
  let moveText = text.replace(/\{[^}]*\}/g, " ");
  moveText = moveText.replace(/;[^\n]*/g, " ");
  moveText = moveText.replace(/\[[^\]]*\]/g, " ");

  let previous: string | null = null;
  while (previous !== moveText) {
    previous = moveText;
    moveText = moveText.replace(/\([^()]*\)/g, " ");
  }

  moveText = moveText.replace(/\$\d+/g, " ");
  moveText = moveText.replace(/(1-0|0-1|1\/2-1\/2|\*)/g, " ");

  const tokens: string[] = [];
  for (const raw of moveText.split(/\s+/)) {
    if (!raw) continue;
    const token = raw.replace(/^\d+\.+/, "").replace(/[!?]+$/, "");
    if (!token || /^\d+\.*$/.test(token)) continue;
    if (!parseMove(token)) continue;
    tokens.push(token);
  }
  return tokens;
}

type State = {
  variables: Record<string, string | number>;
  mode: string;
  currentVar: string | null;
  rookBits: number;
  strBuffer: string;
  strResetting: boolean;
  printVar: string | null;
  negativeFlag: boolean;
  loopI: number;
  loopEnd: number;
  loopActive: boolean;
  loopRookPos: string;
  outputBuffer: string;
  arithOp: string | null;
  arithOp1Var: string | null;
  arithOp2Var: string | null;
  arithMode: string | null;
  arithRookPos: string;
  ifOpen: boolean;
  ifCount: number;
  ifVar: string | null;
  modOpen: boolean;
  modCount: number;
  modRookPos: string;
};

function freshState(): State {
  return {
    variables: {},
    mode: "IDLE",
    currentVar: null,
    rookBits: 0,
    strBuffer: "",
    strResetting: false,
    printVar: null,
    negativeFlag: false,
    loopI: 0,
    loopEnd: 0,
    loopActive: false,
    loopRookPos: "h1",
    outputBuffer: "",
    arithOp: null,
    arithOp1Var: null,
    arithOp2Var: null,
    arithMode: null,
    arithRookPos: "a1",
    ifOpen: false,
    ifCount: 0,
    ifVar: null,
    modOpen: false,
    modCount: 0,
    modRookPos: "a1",
  };
}

class RuntimeError extends Error {}
class ProgramExit extends Error {}

const fileToCol = (file: string) => file.charCodeAt(0) - "a".charCodeAt(0) + 1;
const ENCODING = new Set(["INT_ENCODING", "STR_ENCODING"]);
const SETUP = new Set(["INT_SETUP", "STR_SETUP"]);

/* Python's arithmetic on this language's values: ints, plus str + str and str * int. */
function arithmetic(op: string | null, v1: string | number, v2: string | number, op1: string, op2: string) {
  if (typeof v1 === "number" && typeof v2 === "number") {
    if (op === "+") return v1 + v2;
    if (op === "-") return v1 - v2;
    if (op === "*") return v1 * v2;
    if (op === "/") {
      if (v2 === 0) throw new RuntimeError(`division by zero: ${op1} / ${op2}`);
      return Math.trunc(v1 / v2);
    }
    return 0;
  }
  if (op === "+" && typeof v1 === "string" && typeof v2 === "string") return v1 + v2;
  if (op === "*" && typeof v1 === "string" && typeof v2 === "number") return v1.repeat(Math.max(0, v2));
  if (op === "*" && typeof v1 === "number" && typeof v2 === "string") return v2.repeat(Math.max(0, v1));
  throw new RuntimeError(`unsupported operand types for ${op}: ${op1} and ${op2}`);
}

export function run(text: string): RunResult {
  const b = freshState();
  const lines: string[] = [];
  const tokens = tokenize(text);

  function white(piece: PieceLetter, toFile: string | null, toRank: number | null) {
    // ── for loop ──
    if (piece === "K" && toFile === "e" && toRank === 2) {
      if (!b.loopActive) {
        b.loopActive = true;
        b.loopI = 1;
        b.mode = "FOR_RANGE";
        b.outputBuffer = "";
      } else {
        b.loopI += 1;
        b.outputBuffer = "";
        b.ifCount = 0;
        if (b.loopI > b.loopEnd) {
          b.loopActive = false;
          b.mode = "IDLE";
        }
      }
      return;
    }
    if (piece === "K" && toFile === "e" && toRank === 1) {
      lines.push(b.outputBuffer ? b.outputBuffer : String(b.loopI));
      b.outputBuffer = "";
      b.ifCount = 0;
      return;
    }
    if (piece === "R" && toFile === "h" && toRank === 2 && b.loopActive) {
      if (b.mode === "FOR_RANGE") b.loopRookPos = "h2";
      else if (b.loopRookPos === "h3") b.loopRookPos = "h2";
      return;
    }
    if (piece === "R" && toFile === "h" && toRank === 1) {
      if (b.mode === "FOR_RANGE") {
        b.mode = "FOR_RUNNING";
        b.loopRookPos = "h1";
      }
      return;
    }
    if (piece === "R" && toFile === "h" && toRank === 3) {
      if (b.ifOpen || b.loopActive) b.loopRookPos = "h3";
      return;
    }

    // ── if block ──
    if (piece === "B" && toFile === "h" && toRank === 3) {
      b.ifOpen = true;
      b.ifVar = null;
      b.ifCount += 1;
      return;
    }
    if (piece === "P" && b.ifOpen) {
      b.ifVar = `p_${toFile}2`;
      return;
    }
    if (piece === "B" && toFile === "f" && toRank === 1) {
      b.ifOpen = false;
      return;
    }

    // ── modulo ──
    if (piece === "R" && toFile === "a" && toRank === 3) {
      b.modOpen = true;
      b.modCount = 0;
      b.modRookPos = "a3";
      return;
    }
    if (piece === "R" && toFile === "a" && toRank === 1 && b.modOpen) {
      const divisor = b.modCount;
      b.modOpen = false;
      b.modRookPos = "a1";
      if (divisor > 0 && b.loopI % divisor === 0) {
        const name = b.ifVar ?? (b.ifCount === 1 ? "p_g2" : "p_f2");
        b.outputBuffer += String(b.variables[name] ?? `<${name}>`);
      }
      return;
    }

    // ── arithmetic ──
    if (piece === "R" && toRank === 2 && b.arithMode === "OP1" && b.arithRookPos === "a1") {
      b.arithOp1Var = `p_${toFile}2`;
      b.arithMode = "OP2";
      b.arithRookPos = `${toFile}2`;
      return;
    }
    if (piece === "R" && toRank === 2 && b.arithMode === "OP2") {
      b.arithOp2Var = `p_${toFile}2`;
      b.arithMode = "RETURN";
      b.arithRookPos = `${toFile}2`;
      return;
    }
    if (piece === "R" && toFile === "a" && toRank === 2 && b.arithMode === "RETURN") {
      b.arithRookPos = "a2";
      return;
    }
    if (piece === "R" && toFile === "a" && toRank === 1 && b.arithMode === "RETURN") {
      const op1 = b.arithOp1Var ?? "";
      const op2 = b.arithOp2Var ?? "";
      b.variables[op1] = arithmetic(b.arithOp, b.variables[op1] ?? 0, b.variables[op2] ?? 0, op1, op2);
      b.arithOp = null;
      b.arithMode = null;
      b.arithOp1Var = null;
      b.arithOp2Var = null;
      b.arithRookPos = "a1";
      return;
    }

    // ── variable declaration ──
    if (piece === "N" && toFile === "a" && toRank === 3) {
      if (b.mode === "IDLE") b.mode = "INT_SETUP";
      return;
    }
    if (piece === "N" && toFile === "c" && toRank === 3) {
      if (b.mode === "IDLE") b.mode = "STR_SETUP";
      return;
    }
    if (piece === "P" && SETUP.has(b.mode)) {
      if (b.currentVar === null) b.currentVar = `p_${toFile}2`;
      return;
    }
    if (piece === "N" && toFile === "b" && toRank === 1) {
      if (b.mode === "INT_ENCODING") {
        b.variables[b.currentVar ?? ""] = b.negativeFlag ? -b.rookBits : b.rookBits;
        b.mode = "INT_COMMIT";
        b.negativeFlag = false;
      } else if (b.mode === "STR_ENCODING") {
        b.variables[b.currentVar ?? ""] = b.strBuffer;
        b.mode = "STR_COMMIT";
        b.strBuffer = "";
      }
      return;
    }
    if (piece === "N" && ENCODING.has(b.mode)) return;

    // ── print ──
    if (piece === "P" && b.mode === "IDLE") {
      const name = `p_${toFile}2`;
      if (Object.prototype.hasOwnProperty.call(b.variables, name)) {
        b.printVar = name;
        b.mode = "PRINT_PAWN_MOVED";
      }
      return;
    }
    if (piece === "Q" && b.mode === "PRINT_PAWN_MOVED") {
      if (toRank === 2) b.mode = "PRINT_WAIT";
      return;
    }
    if (piece === "Q" && toRank === 1 && b.mode === "PRINT_WAIT") {
      lines.push(String(b.variables[b.printVar ?? ""] ?? "<undefined>"));
      b.mode = "IDLE";
      b.printVar = null;
    }
  }

  function black(piece: PieceLetter, toFile: string | null, toRank: number | null) {
    if (piece === "R" && toFile === "a" && b.modOpen) {
      if (toRank === 2 && b.modRookPos === "a3") {
        b.modCount += 1;
        b.modRookPos = "a2";
        return;
      }
      if (toRank === 3 && b.modRookPos === "a2") {
        b.modRookPos = "a3";
        return;
      }
    }

    if (piece === "R" && b.mode === "FOR_RANGE") {
      if (toFile === "a" && toRank === 6) {
        if (b.rookBits !== 0) {
          b.loopEnd = b.rookBits;
          b.rookBits = 0;
        }
      } else if (toRank === 6 && toFile && "bcdefgh".includes(toFile)) {
        b.rookBits |= 1 << (8 - fileToCol(toFile));
      }
      return;
    }

    if (piece === "P" && SETUP.has(b.mode)) {
      // Black h7→h5 during int setup negates the value about to be encoded.
      if (b.mode === "INT_SETUP" && toFile === "h" && toRank === 5) b.negativeFlag = true;
      return;
    }

    const opMap: Record<string, string> = { h: "+", g: "-", f: "*", e: "/" };
    if (piece === "P" && toRank === 5 && toFile && opMap[toFile]) {
      if (b.arithMode === null) {
        b.arithOp = opMap[toFile];
        b.arithMode = "OP1";
        b.arithOp1Var = null;
        b.arithOp2Var = null;
        b.arithRookPos = "a1";
      }
      return;
    }

    if (piece === "R" && toFile === "a" && toRank === 6) {
      if (b.mode === "INT_SETUP") {
        b.mode = "INT_ENCODING";
        b.rookBits = 0;
      } else if (b.mode === "STR_SETUP") {
        b.mode = "STR_ENCODING";
        b.rookBits = 0;
        b.strBuffer = "";
        b.strResetting = false;
      } else if (b.mode === "STR_ENCODING") {
        if (b.strResetting) {
          b.strResetting = false;
        } else {
          b.strBuffer += String.fromCharCode(b.rookBits);
        }
        b.rookBits = 0;
      }
      return;
    }

    if (piece === "R" && toFile === "a" && toRank === 8) {
      if (b.mode === "INT_COMMIT" || b.mode === "STR_COMMIT") {
        b.mode = "IDLE";
        b.currentVar = null;
        b.rookBits = 0;
      } else if (b.mode === "STR_ENCODING") {
        b.strResetting = true;
      }
      return;
    }

    if (piece === "R" && toRank === 6 && toFile && "bcdefgh".includes(toFile) && ENCODING.has(b.mode)) {
      b.rookBits |= 1 << (8 - fileToCol(toFile));
    }
  }

  let error: string | null = null;
  try {
    for (let i = 0; i < tokens.length; i++) {
      const parsed = parseMove(tokens[i]);
      if (!parsed) continue;
      if (parsed.checkmate) throw new ProgramExit();
      if (i % 2 === 0) white(parsed.piece, parsed.toFile, parsed.toRank);
      else black(parsed.piece, parsed.toFile, parsed.toRank);
    }
  } catch (err) {
    if (err instanceof RuntimeError) error = err.message;
    else if (!(err instanceof ProgramExit)) throw err;
  }

  return { lines, variables: { ...b.variables }, error };
}
