"use client";

import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Play, RotateCcw, Undo2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { PGN_EXAMPLES } from "@/lib/examples";
import { tokenize } from "@/lib/interpreter";
import {
  applyMove,
  findKing,
  initialGame,
  legalMoves,
  movetext,
  replaySan,
  sameSquare,
  squareName,
  status,
  toSan,
  type GameState,
  type Piece,
  type PieceType,
  type Square,
} from "@/lib/chess";

const GLYPH: Record<PieceType, string> = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
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

export type ChessboardHandle = { play: (label: string, tokens: string[]) => void };

type Timeline = { states: GameState[]; sans: string[] };
type Autoplay = { label: string; states: GameState[]; sans: string[]; step: number };

const freshTimeline = (): Timeline => ({ states: [initialGame()], sans: [] });
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* A whole game plays in ~14s; long compiled programs speed up rather than drag on. */
const stepDelay = (plies: number) => Math.min(420, Math.max(60, Math.round(14000 / Math.max(plies, 1))));

export function Chessboard({
  ref,
  onRunGame,
}: {
  ref?: React.Ref<ChessboardHandle>;
  onRunGame?: (pgn: string, label: string) => void;
}) {
  const [timeline, setTimeline] = useState<Timeline>(freshTimeline);
  const [selected, setSelected] = useState<Square | null>(null);
  const [auto, setAuto] = useState<Autoplay | null>(null);
  const [playedLabel, setPlayedLabel] = useState<string | null>(null);
  const movesRef = useRef<HTMLParagraphElement>(null);

  const game = timeline.states[timeline.states.length - 1];
  const targets = useMemo(() => (selected && !auto ? legalMoves(game, selected) : []), [game, selected, auto]);
  const gameStatus = useMemo(() => status(game), [game]);
  const finished = gameStatus.kind === "checkmate" || gameStatus.kind === "stalemate";
  const checkedKing =
    gameStatus.kind === "check" || gameStatus.kind === "checkmate" ? findKing(game.board, game.turn) : null;

  const pieces = useMemo(() => {
    const placed: { piece: Piece; r: number; f: number }[] = [];
    game.board.forEach((row, r) => row.forEach((piece, f) => piece && placed.push({ piece, r, f })));
    // Stable order by id: React only updates each piece's transform, so the CSS transition animates the move.
    return placed.sort((a, b) => a.piece.id - b.piece.id);
  }, [game]);

  function startAutoplay(label: string, tokens: string[]) {
    const replay = replaySan(tokens);
    setSelected(null);
    setPlayedLabel(label);
    if (prefersReducedMotion() || replay.sans.length === 0) {
      setAuto(null);
      setTimeline({ states: replay.states, sans: replay.sans });
      return;
    }
    setTimeline(freshTimeline());
    setAuto({ label, states: replay.states, sans: replay.sans, step: 0 });
  }

  useImperativeHandle(ref, () => ({ play: startAutoplay }));

  useEffect(() => {
    if (!auto) return;
    const timer = window.setTimeout(() => {
      const step = auto.step + 1;
      setTimeline({ states: auto.states.slice(0, step + 1), sans: auto.sans.slice(0, step) });
      setAuto(step >= auto.states.length - 1 ? null : { ...auto, step });
    }, stepDelay(auto.states.length - 1));
    return () => window.clearTimeout(timer);
  }, [auto]);

  useEffect(() => {
    const el = movesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [timeline.sans.length]);

  function handleSquare(r: number, f: number) {
    if (finished || auto) return;

    const move = targets.find((m) => m.to.r === r && m.to.f === f);
    if (move) {
      const san = toSan(game, move);
      setTimeline((t) => ({ states: [...t.states, applyMove(game, move)], sans: [...t.sans, san] }));
      setSelected(null);
      setPlayedLabel(null);
      return;
    }

    if (sameSquare(selected, { r, f })) {
      setSelected(null);
      return;
    }

    const piece = game.board[r][f];
    setSelected(piece && piece.color === game.turn ? { r, f } : null);
  }

  function undo() {
    setAuto(null);
    setSelected(null);
    setPlayedLabel(null);
    setTimeline((t) =>
      t.states.length > 1 ? { states: t.states.slice(0, -1), sans: t.sans.slice(0, -1) } : t
    );
  }

  function reset() {
    setAuto(null);
    setSelected(null);
    setPlayedLabel(null);
    setTimeline(freshTimeline());
  }

  function runAsProgram() {
    const label = playedLabel ?? "your game on the board";
    onRunGame?.(`[Event "${label}"]\n\n${movetext(timeline.sans)} *\n`, label);
  }

  const plies = timeline.sans.length;
  const mover = game.turn === "w" ? "white" : "black";
  const winner = game.turn === "w" ? "black" : "white";
  const statusText = auto
    ? `playing ${auto.label}`
    : gameStatus.kind === "checkmate"
      ? `checkmate — ${winner} wins`
      : gameStatus.kind === "stalemate"
        ? "stalemate — draw"
        : gameStatus.kind === "check"
          ? `${mover} to move — check`
          : `${mover} to move`;

  return (
    <div className="glow-brass -mx-3 rounded-md border border-primary/25 bg-card p-2 sm:mx-0 sm:p-5">
      <div className="flex gap-1.5 sm:gap-2">
        <div className="flex flex-col justify-around font-mono text-[10px] text-primary" aria-hidden="true">
          {RANKS.map((rank) => (
            <span key={rank}>{rank}</span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="@container relative aspect-square border-2 border-primary">
            <div className="absolute inset-0 grid grid-cols-8">
              {game.board.map((row, r) =>
                row.map((piece, f) => {
                  const dark = (r + f) % 2 === 1;
                  const isSelected = sameSquare(selected, { r, f });
                  const target = targets.find((m) => m.to.r === r && m.to.f === f);
                  const isLastMove =
                    sameSquare(game.lastMove?.from ?? null, { r, f }) ||
                    sameSquare(game.lastMove?.to ?? null, { r, f });

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
                        "relative flex aspect-square items-center justify-center",
                        "transition-[box-shadow,background-color] duration-150",
                        "focus-visible:z-20 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                        dark ? "bg-board-dark" : "bg-board-light",
                        isLastMove && "inset-ring-2 inset-ring-gold/70",
                        isSelected && "inset-ring-2 inset-ring-primary",
                        sameSquare(checkedKing, { r, f }) && "bg-destructive/60"
                      )}
                    >
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

            <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
              {pieces.map(({ piece, r, f }) => (
                <span
                  key={piece.id}
                  className={cn(
                    "absolute top-0 left-0 flex h-[12.5%] w-[12.5%] items-center justify-center text-[8cqw] leading-none",
                    "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                    piece.color === "w" ? "piece-white" : "piece-black"
                  )}
                  style={{ transform: `translate(${f * 100}%, ${r * 100}%)` }}
                >
                  {GLYPH[piece.type]}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-1 grid grid-cols-8 font-mono text-[10px] text-primary" aria-hidden="true">
            {FILES.map((file) => (
              <span key={file} className="text-center">
                {file}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <p aria-live="polite" className="min-w-0 truncate font-mono text-[11px] tracking-wide text-muted-foreground">
          {statusText}
          {auto && (
            <span className="ml-2 tabular-nums text-primary">
              {auto.step}/{auto.states.length - 1}
            </span>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-4 font-mono text-[11px] tracking-wide">
          <button
            type="button"
            onClick={undo}
            disabled={plies === 0}
            className="flex items-center gap-1.5 text-primary transition-opacity hover:opacity-70 disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Undo2 className="h-3 w-3" strokeWidth={2} /> undo
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1.5 text-primary transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <RotateCcw className="h-3 w-3" strokeWidth={2} /> reset
          </button>
        </div>
      </div>

      {plies > 0 && (
        <p
          ref={movesRef}
          className="mt-3 max-h-16 overflow-y-auto font-mono text-[11px] leading-5 text-foreground/80"
          aria-label="moves played"
        >
          {movetext(timeline.sans)}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={runAsProgram}
          disabled={plies === 0 || !!auto}
          className="flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 font-mono text-[11px] tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Play className="h-3 w-3" strokeWidth={2.5} /> run this game as a program
        </button>
        <button
          type="button"
          onClick={() =>
            startAutoplay("the legal game that prints 100", tokenize(PGN_EXAMPLES["actual_game_sample.pgn"]))
          }
          disabled={!!auto}
          className="font-mono text-[11px] tracking-wide text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          watch a real game print 100 →
        </button>
      </div>

      <p className="mt-3 text-center font-mono text-[10px] leading-5 text-muted-foreground">
        ordinary chess rules. every game is also a program — run yours and see what it computes.
      </p>
    </div>
  );
}
