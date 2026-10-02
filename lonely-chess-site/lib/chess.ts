/*
  A standard-rules chess engine for the board on the home page. Deliberately
  separate from the Lonely Chess interpreter: this validates ordinary chess
  legality, which the interpreter explicitly does not do (it reads move
  tokens and ignores legality). Nothing here feeds the interpreter.
*/

export type Color = "w" | "b";
export type PieceType = "k" | "q" | "r" | "b" | "n" | "p";
/* `id` is stable across moves (a promoted pawn keeps it), so the board can
   animate a piece from one square to the next instead of re-rendering it. */
export type Piece = { type: PieceType; color: Color; id: number };
export type Square = { r: number; f: number };
export type Board = (Piece | null)[][];

export type Move = {
  from: Square;
  to: Square;
  promotion?: PieceType;
  castle?: "k" | "q";
  enPassant?: boolean;
  capture?: boolean;
};

export type CastlingRights = { wk: boolean; wq: boolean; bk: boolean; bq: boolean };

export type GameState = {
  board: Board;
  turn: Color;
  castling: CastlingRights;
  enPassant: Square | null;
  lastMove: { from: Square; to: Square } | null;
};

/* r = 0 is rank 8 (black's back rank); r = 7 is rank 1. White moves toward r = 0. */
const BACK_RANK: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
const ROOK_DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const BISHOP_DIRS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const KNIGHT_HOPS = [
  [1, 2],
  [2, 1],
  [-1, 2],
  [-2, 1],
  [1, -2],
  [2, -1],
  [-1, -2],
  [-2, -1],
];
const KING_STEPS = [...ROOK_DIRS, ...BISHOP_DIRS];

const onBoard = (r: number, f: number) => r >= 0 && r < 8 && f >= 0 && f < 8;

export const sameSquare = (a: Square | null, b: Square | null) =>
  !!a && !!b && a.r === b.r && a.f === b.f;

export const squareName = ({ r, f }: Square) => `${"abcdefgh"[f]}${8 - r}`;

export function initialGame(): GameState {
  const board: Board = Array.from({ length: 8 }, () => Array<Piece | null>(8).fill(null));
  for (let f = 0; f < 8; f++) {
    board[0][f] = { type: BACK_RANK[f], color: "b", id: f };
    board[1][f] = { type: "p", color: "b", id: 8 + f };
    board[6][f] = { type: "p", color: "w", id: 16 + f };
    board[7][f] = { type: BACK_RANK[f], color: "w", id: 24 + f };
  }
  return {
    board,
    turn: "w",
    castling: { wk: true, wq: true, bk: true, bq: true },
    enPassant: null,
    lastMove: null,
  };
}

export function findKing(board: Board, color: Color): Square | null {
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece && piece.type === "k" && piece.color === color) return { r, f };
    }
  }
  return null;
}

export function isAttacked(board: Board, sq: Square, by: Color): boolean {
  // A white pawn attacking sq stands one rank below it (higher r); black, above.
  const pawnRow = sq.r + (by === "w" ? 1 : -1);
  for (const df of [-1, 1]) {
    const f = sq.f + df;
    if (onBoard(pawnRow, f)) {
      const piece = board[pawnRow][f];
      if (piece && piece.color === by && piece.type === "p") return true;
    }
  }

  for (const [dr, df] of KNIGHT_HOPS) {
    const r = sq.r + dr;
    const f = sq.f + df;
    if (!onBoard(r, f)) continue;
    const piece = board[r][f];
    if (piece && piece.color === by && piece.type === "n") return true;
  }

  for (const [dr, df] of KING_STEPS) {
    const r = sq.r + dr;
    const f = sq.f + df;
    if (!onBoard(r, f)) continue;
    const piece = board[r][f];
    if (piece && piece.color === by && piece.type === "k") return true;
  }

  const slides = (dirs: number[][], types: PieceType[]) => {
    for (const [dr, df] of dirs) {
      let r = sq.r + dr;
      let f = sq.f + df;
      while (onBoard(r, f)) {
        const piece = board[r][f];
        if (piece) {
          if (piece.color === by && types.includes(piece.type)) return true;
          break;
        }
        r += dr;
        f += df;
      }
    }
    return false;
  };

  return slides(ROOK_DIRS, ["r", "q"]) || slides(BISHOP_DIRS, ["b", "q"]);
}

function pawnMoves(state: GameState, from: Square, piece: Piece): Move[] {
  const moves: Move[] = [];
  const { board } = state;
  const dir = piece.color === "w" ? -1 : 1;
  const startRank = piece.color === "w" ? 6 : 1;
  const promoRank = piece.color === "w" ? 0 : 7;
  const ahead = from.r + dir;

  const add = (to: Square, capture: boolean) => {
    // Auto-queen: under-promotion is intentionally not offered on this board.
    if (to.r === promoRank) moves.push({ from, to, promotion: "q", capture });
    else moves.push({ from, to, capture });
  };

  if (onBoard(ahead, from.f) && !board[ahead][from.f]) {
    add({ r: ahead, f: from.f }, false);
    const twoAhead = from.r + 2 * dir;
    if (from.r === startRank && !board[twoAhead][from.f]) {
      moves.push({ from, to: { r: twoAhead, f: from.f } });
    }
  }

  for (const df of [-1, 1]) {
    const f = from.f + df;
    if (!onBoard(ahead, f)) continue;
    const target = board[ahead][f];
    if (target && target.color !== piece.color) {
      add({ r: ahead, f }, true);
    } else if (!target && sameSquare(state.enPassant, { r: ahead, f })) {
      moves.push({ from, to: { r: ahead, f }, enPassant: true, capture: true });
    }
  }

  return moves;
}

function pseudoMoves(state: GameState, from: Square): Move[] {
  const piece = state.board[from.r][from.f];
  if (!piece) return [];
  if (piece.type === "p") return pawnMoves(state, from, piece);

  const moves: Move[] = [];
  const { board } = state;

  /* Returns true when the square was empty, i.e. a slider may continue past it. */
  const push = (r: number, f: number) => {
    if (!onBoard(r, f)) return false;
    const target = board[r][f];
    if (target && target.color === piece.color) return false;
    moves.push({ from, to: { r, f }, capture: !!target });
    return !target;
  };

  if (piece.type === "n") {
    for (const [dr, df] of KNIGHT_HOPS) push(from.r + dr, from.f + df);
    return moves;
  }

  if (piece.type === "k") {
    for (const [dr, df] of KING_STEPS) push(from.r + dr, from.f + df);
    return moves;
  }

  const dirs =
    piece.type === "r" ? ROOK_DIRS : piece.type === "b" ? BISHOP_DIRS : [...ROOK_DIRS, ...BISHOP_DIRS];
  for (const [dr, df] of dirs) {
    let r = from.r + dr;
    let f = from.f + df;
    while (push(r, f)) {
      r += dr;
      f += df;
    }
  }
  return moves;
}

function castlingMoves(state: GameState, from: Square): Move[] {
  const piece = state.board[from.r][from.f];
  if (!piece || piece.type !== "k") return [];

  const homeRank = piece.color === "w" ? 7 : 0;
  if (from.r !== homeRank || from.f !== 4) return [];

  const opponent: Color = piece.color === "w" ? "b" : "w";
  if (isAttacked(state.board, from, opponent)) return [];

  const empty = (f: number) => !state.board[homeRank][f];
  const safe = (f: number) => !isAttacked(state.board, { r: homeRank, f }, opponent);
  const rights = state.castling;
  const moves: Move[] = [];

  if ((piece.color === "w" ? rights.wk : rights.bk) && empty(5) && empty(6) && safe(5) && safe(6)) {
    moves.push({ from, to: { r: homeRank, f: 6 }, castle: "k" });
  }
  if (
    (piece.color === "w" ? rights.wq : rights.bq) &&
    empty(3) &&
    empty(2) &&
    empty(1) &&
    safe(3) &&
    safe(2)
  ) {
    moves.push({ from, to: { r: homeRank, f: 2 }, castle: "q" });
  }
  return moves;
}

export function applyMove(state: GameState, move: Move): GameState {
  const board = state.board.map((row) => row.slice());
  const piece = board[move.from.r][move.from.f];
  if (!piece) return state;

  board[move.from.r][move.from.f] = null;
  if (move.enPassant) board[move.from.r][move.to.f] = null;

  const captured = board[move.to.r][move.to.f];
  board[move.to.r][move.to.f] = move.promotion
    ? { type: move.promotion, color: piece.color, id: piece.id }
    : piece;

  if (move.castle) {
    const rank = move.from.r;
    if (move.castle === "k") {
      board[rank][5] = board[rank][7];
      board[rank][7] = null;
    } else {
      board[rank][3] = board[rank][0];
      board[rank][0] = null;
    }
  }

  const castling = { ...state.castling };
  if (piece.type === "k") {
    if (piece.color === "w") {
      castling.wk = false;
      castling.wq = false;
    } else {
      castling.bk = false;
      castling.bq = false;
    }
  }
  const clearRookRight = (r: number, f: number) => {
    if (r === 7 && f === 0) castling.wq = false;
    if (r === 7 && f === 7) castling.wk = false;
    if (r === 0 && f === 0) castling.bq = false;
    if (r === 0 && f === 7) castling.bk = false;
  };
  if (piece.type === "r") clearRookRight(move.from.r, move.from.f);
  if (captured && captured.type === "r") clearRookRight(move.to.r, move.to.f);

  const enPassant =
    piece.type === "p" && Math.abs(move.to.r - move.from.r) === 2
      ? { r: (move.to.r + move.from.r) / 2, f: move.from.f }
      : null;

  return {
    board,
    turn: state.turn === "w" ? "b" : "w",
    castling,
    enPassant,
    lastMove: { from: move.from, to: move.to },
  };
}

export function isInCheck(state: GameState, color: Color): boolean {
  const king = findKing(state.board, color);
  if (!king) return false;
  return isAttacked(state.board, king, color === "w" ? "b" : "w");
}

export function legalMoves(state: GameState, from: Square): Move[] {
  const piece = state.board[from.r][from.f];
  if (!piece || piece.color !== state.turn) return [];
  return [...pseudoMoves(state, from), ...castlingMoves(state, from)].filter(
    (move) => !isInCheck(applyMove(state, move), piece.color)
  );
}

export function hasAnyLegalMove(state: GameState): boolean {
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = state.board[r][f];
      if (piece && piece.color === state.turn && legalMoves(state, { r, f }).length > 0) return true;
    }
  }
  return false;
}

export type Status = {
  kind: "playing" | "check" | "checkmate" | "stalemate";
  turn: Color;
};

export function status(state: GameState): Status {
  const check = isInCheck(state, state.turn);
  if (!hasAnyLegalMove(state)) {
    return { kind: check ? "checkmate" : "stalemate", turn: state.turn };
  }
  return { kind: check ? "check" : "playing", turn: state.turn };
}

export function allLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = state.board[r][f];
      if (piece && piece.color === state.turn) moves.push(...legalMoves(state, { r, f }));
    }
  }
  return moves;
}

/*
  SAN without the check suffix. When two same-type pieces can reach the
  destination, the full origin square is written ("Nb1d2", not "Nbd2"): the
  Lonely Chess tokenizer only recognizes full-square disambiguation, and
  every PGN reader accepts it.
*/
function sanForms(state: GameState, move: Move): { full: string; standard: string } {
  if (move.castle) {
    const san = move.castle === "k" ? "O-O" : "O-O-O";
    return { full: san, standard: san };
  }
  const piece = state.board[move.from.r][move.from.f];
  if (!piece) return { full: "", standard: "" };
  const dest = squareName(move.to);

  if (piece.type === "p") {
    const base = move.capture ? `${"abcdefgh"[move.from.f]}x${dest}` : dest;
    const san = move.promotion ? `${base}=${move.promotion.toUpperCase()}` : base;
    return { full: san, standard: san };
  }

  const rivals: Square[] = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const other = state.board[r][f];
      if (!other || other.color !== piece.color || other.type !== piece.type) continue;
      if (r === move.from.r && f === move.from.f) continue;
      if (legalMoves(state, { r, f }).some((m) => sameSquare(m.to, move.to))) rivals.push({ r, f });
    }
  }

  const letter = piece.type.toUpperCase();
  const capture = move.capture ? "x" : "";
  if (rivals.length === 0) {
    const san = `${letter}${capture}${dest}`;
    return { full: san, standard: san };
  }

  const from = squareName(move.from);
  const minimal = !rivals.some((s) => s.f === move.from.f)
    ? from[0]
    : !rivals.some((s) => s.r === move.from.r)
      ? from[1]
      : from;
  return { full: `${letter}${from}${capture}${dest}`, standard: `${letter}${minimal}${capture}${dest}` };
}

export function toSan(state: GameState, move: Move): string {
  const after = status(applyMove(state, move));
  const suffix = after.kind === "checkmate" ? "#" : after.kind === "check" ? "+" : "";
  return sanForms(state, move).full + suffix;
}

const normalizeSan = (san: string) => san.trim().replace(/0-0-0/g, "O-O-O").replace(/0-0/g, "O-O").replace(/[+#!?]+$/, "");

/* The legal move a SAN token names in this position, or null if it names none. */
export function findMoveBySan(state: GameState, san: string): Move | null {
  const wanted = normalizeSan(san);
  return (
    allLegalMoves(state).find((move) => {
      const forms = sanForms(state, move);
      return forms.full === wanted || forms.standard === wanted;
    }) ?? null
  );
}

export type Replay = { states: GameState[]; sans: string[]; illegalAt: number | null };

/* Plays SAN tokens from the starting position, stopping at the first one that is not a legal move. */
export function replaySan(tokens: string[]): Replay {
  const states = [initialGame()];
  const sans: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const state = states[states.length - 1];
    const move = findMoveBySan(state, tokens[i]);
    if (!move) return { states, sans, illegalAt: i };
    sans.push(toSan(state, move));
    states.push(applyMove(state, move));
  }
  return { states, sans, illegalAt: null };
}

/* Standard movetext ("1. e4 e5 2. Nf3") for SAN moves played from the start. */
export function movetext(sans: string[]): string {
  const parts: string[] = [];
  sans.forEach((san, i) => parts.push(i % 2 === 0 ? `${i / 2 + 1}. ${san}` : san));
  return parts.join(" ");
}
