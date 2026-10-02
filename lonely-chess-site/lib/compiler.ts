/*
  Compiles an integer or a short ASCII message into a Lonely Chess program
  that prints it — and that is also a sequence of legal chess moves.

  The template generalizes actual_game_sample.pgn, the repository's legal
  game: the d-pawn names the variable (p_d2), so once it has advanced the
  queen's print steps Qd2/Qd1 are legal; a white knight hops back and forth
  as filler (a3↔c4 for ints, c3↔e4 for strings) while Black's a-rook writes
  bits along rank 6. Knight parity is arranged so the knight is always on a
  square that reaches b1 when the commit move Nb1 arrives.
*/

export type CompileResult =
  | { ok: true; kind: "int" | "string"; value: string; pgn: string; plies: number }
  | { ok: false; message: string };

export const MAX_MESSAGE_LENGTH = 40;

type Line = { white: string; black: string; note?: string };

/* b6..h6 carry bits 6..0, so set bits are visited left to right. */
function bitFiles(value: number): string[] {
  const files: string[] = [];
  for (let bit = 6; bit >= 0; bit--) {
    if (value & (1 << bit)) files.push("bcdefgh"[6 - bit]);
  }
  return files;
}

/* A knight that alternates between two squares, returning the SAN of each hop. */
function hopper(home: string, away: string) {
  let at = home;
  return () => {
    at = at === home ? away : home;
    return `N${at}`;
  };
}

/* Brace comments end at the first "}", so it can never appear inside one. */
const commentSafe = (text: string) => text.replace(/}/g, ")");

function describeChar(ch: string): string {
  if (ch === " ") return "space";
  if (ch === "}") return "right brace";
  return `'${ch}'`;
}

function render(lines: Line[], summary: string): string {
  const body = lines.map((line, i) => {
    const move = `${i + 1}. ${line.white} ${line.black}`;
    return line.note ? `${move.padEnd(18)}{ ${commentSafe(line.note)} }` : move;
  });
  return [
    '[Event "Compiled Lonely Chess program"]',
    '[Site "lonely-chess compiler"]',
    '[Result "*"]',
    "",
    `{ ${commentSafe(summary)} }`,
    "",
    ...body,
    "*",
    "",
  ].join("\n");
}

function printLines(dPawnPush: string, shown: string): Line[] {
  return [
    { white: dPawnPush, black: "Nc6", note: "d-pawn: select p_d2" },
    { white: "Qd2", black: "Nb8", note: "queen out: print" },
    { white: "Qd1", black: "Nc6", note: `queen home: output ${shown}` },
  ];
}

function compileInt(value: number): CompileResult {
  const negative = value < 0;
  const magnitude = Math.abs(value);
  const files = bitFiles(magnitude);
  const encodingPlies = files.length + (files.length > 0 ? 1 : 0);
  const fixParity = encodingPlies % 2 === 1;
  const knight = hopper("a3", "c4");

  const lines: Line[] = [
    { white: "Na3", black: negative ? "h5" : "a5", note: negative ? "begin int; h-pawn negates" : "begin int" },
    { white: "d3", black: negative ? "a5" : "a4", note: "declare p_d2" },
    { white: fixParity ? knight() : "d4", black: "Ra6", note: "rook enters rank 6" },
  ];
  let rookFile = "a";
  files.forEach((file) => {
    const bit = 6 - "bcdefgh".indexOf(file);
    // Negating pushes the h-pawn, which lets the h8 rook reach h6 too; name the origin to keep it unambiguous.
    const san = negative && file === "h" ? `R${rookFile}6h6` : `R${file}6`;
    lines.push({ white: knight(), black: san, note: `bit ${bit} (+${1 << bit})` });
    rookFile = file;
  });
  if (files.length > 0) lines.push({ white: knight(), black: "Ra6", note: `= ${magnitude}` });
  lines.push({ white: "Nb1", black: "Ra8", note: `commit p_d2 = ${value}` });
  lines.push(...printLines(fixParity ? "d4" : "d5", String(value)));

  const pgn = render(lines, `int p_d2 = ${value}; print(p_d2)`);
  return { ok: true, kind: "int", value: String(value), pgn, plies: lines.length * 2 };
}

function compileString(message: string): CompileResult {
  const codes = [...message].map((ch) => ch.charCodeAt(0));
  const encodingPlies = codes.reduce(
    (total, code, i) => total + (i > 0 ? 2 : 0) + bitFiles(code).length + 1,
    0
  );
  const fixParity = encodingPlies % 2 === 1;
  const knight = hopper("c3", "e4");

  const lines: Line[] = [
    { white: "Nc3", black: "a5", note: "begin string" },
    { white: "d3", black: "a4", note: "declare p_d2" },
    { white: fixParity ? knight() : "d4", black: "Ra6", note: "rook enters rank 6" },
  ];
  [...message].forEach((ch, i) => {
    if (i > 0) {
      lines.push({ white: knight(), black: "Ra8", note: "next character" });
      lines.push({ white: knight(), black: "Ra6" });
    }
    bitFiles(ch.charCodeAt(0)).forEach((file) => lines.push({ white: knight(), black: `R${file}6` }));
    lines.push({ white: knight(), black: "Ra6", note: `${describeChar(ch)} = ${ch.charCodeAt(0)}` });
  });
  lines.push({ white: "Nb1", black: "Ra8", note: `commit p_d2 (${message.length} chars)` });
  lines.push(...printLines(fixParity ? "d4" : "d5", JSON.stringify(message)));

  const pgn = render(lines, `String p_d2 = ${JSON.stringify(message)}; print(p_d2)`);
  return { ok: true, kind: "string", value: message, pgn, plies: lines.length * 2 };
}

export function compile(input: string): CompileResult {
  if (input.length === 0) return { ok: false, message: "type a number or a short message" };

  if (/^-?\d+$/.test(input.trim())) {
    const value = Number(input.trim());
    if (Math.abs(value) > 127) {
      return { ok: false, message: "integers are 7-bit: -127 to 127" };
    }
    return compileInt(value === 0 ? 0 : value);
  }

  if (input.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, message: `keep messages to ${MAX_MESSAGE_LENGTH} characters` };
  }
  const outside = [...input].find((ch) => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) > 126);
  if (outside) {
    return { ok: false, message: `only plain ASCII fits in 7 bits — "${outside}" doesn't` };
  }
  return compileString(input);
}
