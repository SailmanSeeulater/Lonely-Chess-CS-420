// Move generation is checked with perft: count every legal line to a fixed
// depth and compare with published reference counts.
import fs from "node:fs";
import path from "node:path";

import { allLegalMoves, applyMove, findMoveBySan, replaySan, toSan } from "../lib/chess.ts";
import { tokenize } from "../lib/interpreter.ts";
import { REPO_ROOT, reporter } from "./helpers.mjs";

const t = reporter("engine");

function fromFen(fen) {
  const [placement, turn, castling, ep] = fen.split(" ");
  let id = 0;
  const board = placement.split("/").map((row) => {
    const rank = [];
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) rank.push(null);
      else rank.push({ type: ch.toLowerCase(), color: ch === ch.toUpperCase() ? "w" : "b", id: id++ });
    }
    return rank;
  });
  return {
    board,
    turn,
    castling: { wk: castling.includes("K"), wq: castling.includes("Q"), bk: castling.includes("k"), bq: castling.includes("q") },
    enPassant: ep === "-" ? null : { r: 8 - Number(ep[1]), f: ep.charCodeAt(0) - 97 },
    lastMove: null,
  };
}

function perft(state, depth) {
  if (depth === 0) return 1;
  let nodes = 0;
  for (const move of allLegalMoves(state)) nodes += perft(applyMove(state, move), depth - 1);
  return nodes;
}

// Depths chosen where the reference counts include no promotions: the board auto-queens.
for (const [label, fen, depth, expected] of [
  ["start position", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -", 4, 197281],
  ["Kiwipete (castling, en passant, pins)", "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -", 3, 97862],
  ["position 3 (en passant discovered check)", "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -", 4, 43238],
]) {
  const got = perft(fromFen(fen), depth);
  t.check(got === expected, `perft ${label} d${depth}`, `${got} vs ${expected}`);
}

const legalGame = tokenize(fs.readFileSync(path.join(REPO_ROOT, "actual_game_sample.pgn"), "utf8"));
const replay = replaySan(legalGame);
t.check(replay.illegalAt === null, "actual_game_sample.pgn is legal chess");
t.check(replay.sans.join(" ") === legalGame.join(" "), "regenerated SAN matches the file");

t.check(replaySan(["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "O-O"]).sans[6] === "O-O", "castling is written O-O");
t.check(replaySan(["f3", "e5", "g4", "Qh4"]).sans.at(-1) === "Qh4#", "checkmate gets #");
t.check(replaySan(["e4", "d5", "Bb5"]).sans.at(-1) === "Bb5+", "check gets +");
t.check(replaySan(["e4", "e5", "Ke3"]).illegalAt === 2, "an illegal move stops a replay");

const ambiguous = replaySan(["d4", "d5", "Nf3", "Nf6"]).states.at(-1);
const nbd2 = findMoveBySan(ambiguous, "Nbd2");
t.check(!!nbd2 && toSan(ambiguous, nbd2) === "Nb1d2", "Nbd2 is read, and written as Nb1d2");

const promotion = fromFen("8/P6k/8/8/8/8/8/K7 w - -");
const a8 = findMoveBySan(promotion, "a8=Q");
t.check(!!a8 && toSan(promotion, a8) === "a8=Q", "promotion is written a8=Q");

t.finish();
