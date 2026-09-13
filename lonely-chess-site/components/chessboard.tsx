"use client";

import React, { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  applyMove,
  findKing,
  initialGame,
  legalMoves,
  sameSquare,
  squareName,
  status,
  type GameState,
  type PieceType,
  type Square,
} from "@/lib/chess";

const GLYPH: Record<PieceType, string> = {
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

const PIECE_NAME: Record<PieceType, string> = {
  k: "king",
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
  p: "pawn",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

export function Chessboard() {
  const [game, setGame] = useState<GameState>(initialGame);
  const [selected, setSelected] = useState<Square | null>(null);

  const moves = useMemo(() => (selected ? legalMoves(game, selected) : []), [game, selected]);
  const gameStatus = useMemo(() => status(game), [game]);
  const finished = gameStatus.kind === "checkmate" || gameStatus.kind === "stalemate";
  const checkedKing =
    gameStatus.kind === "check" || gameStatus.kind === "checkmate"
      ? findKing(game.board, game.turn)
      : null;

  function handleSquare(r: number, f: number) {
    if (finished) return;

    const move = moves.find((m) => m.to.r === r && m.to.f === f);
    if (move) {
      setGame(applyMove(game, move));
      setSelected(null);
      return;
    }

    if (sameSquare(selected, { r, f })) {
      setSelected(null);
      return;
    }

    const piece = game.board[r][f];
    setSelected(piece && piece.color === game.turn ? { r, f } : null);
  }

  function reset() {
    setGame(initialGame());
    setSelected(null);
  }

  const mover = game.turn === "w" ? "White" : "Black";
  const winner = game.turn === "w" ? "Black" : "White";
  const statusText =
    gameStatus.kind === "checkmate"
      ? `checkmate — ${winner.toLowerCase()} wins`
      : gameStatus.kind === "stalemate"
        ? "stalemate — draw"
        : gameStatus.kind === "check"
          ? `${mover.toLowerCase()} to move — check`
          : `${mover.toLowerCase()} to move`;

  // The phone-only negative margin buys back enough width to keep squares at a
  // usable tap size inside the hero's own horizontal padding.
  return (
    <div className="glow-brass -mx-3 rounded-md border border-primary/25 bg-card p-2 sm:mx-0 sm:p-5">
      <div className="flex gap-1.5 sm:gap-2">
        <div className="flex flex-col justify-around font-mono text-[10px] text-primary">
          {RANKS.map((rank) => (
            <span key={rank}>{rank}</span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="@container grid aspect-square grid-cols-8 border-2 border-primary">
            {game.board.map((row, r) =>
              row.map((piece, f) => {
                const dark = (r + f) % 2 === 1;
                const isSelected = sameSquare(selected, { r, f });
                const target = moves.find((m) => m.to.r === r && m.to.f === f);
                const isLastMove =
                  sameSquare(game.lastMove?.from ?? null, { r, f }) ||
                  sameSquare(game.lastMove?.to ?? null, { r, f });
                const isCheckedKing = sameSquare(checkedKing, { r, f });

                return (
                  <button
                    key={`${r}-${f}`}
                    type="button"
                    onClick={() => handleSquare(r, f)}
                    aria-pressed={isSelected}
                    aria-label={[
                      squareName({ r, f }),
                      piece
                        ? `${piece.color === "w" ? "white" : "black"} ${PIECE_NAME[piece.type]}`
                        : "empty",
                      target ? (target.capture ? "capture available" : "legal move") : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                    className={cn(
                      "relative flex aspect-square items-center justify-center text-[8cqw] leading-none",
                      "transition-[box-shadow,background-color] duration-150",
                      "focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                      dark ? "bg-board-dark" : "bg-board-light",
                      isLastMove && "inset-ring-2 inset-ring-gold/70",
                      isSelected && "inset-ring-2 inset-ring-primary",
                      isCheckedKing && "bg-destructive/60"
                    )}
                  >
                    {piece && (
                      <span className={piece.color === "w" ? "piece-white" : "piece-black"}>
                        {GLYPH[piece.type]}
                      </span>
                    )}
                    {target && !piece && (
                      <span className="pointer-events-none absolute h-[20%] w-[20%] rounded-full bg-primary/60" />
                    )}
                    {target && piece && (
                      <span className="pointer-events-none absolute inset-[7%] rounded-full border-[0.35rem] border-primary/50" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-1 grid grid-cols-8 font-mono text-[10px] text-primary">
            {FILES.map((file) => (
              <span key={file} className="text-center">
                {file}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <p aria-live="polite" className="font-mono text-[11px] tracking-wide text-muted-foreground">
          {statusText}
        </p>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-primary transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <RotateCcw className="h-3 w-3" strokeWidth={2} /> reset
        </button>
      </div>

      <p className="mt-3 text-center font-mono text-[10px] leading-5 text-muted-foreground">
        a playable board — ordinary chess rules. it does not drive the
        interpreter; paste a PGN program below for that.
      </p>
    </div>
  );
}
