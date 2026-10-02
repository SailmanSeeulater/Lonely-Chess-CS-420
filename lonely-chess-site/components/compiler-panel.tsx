"use client";

import React, { useDeferredValue, useMemo, useState } from "react";
import { ChessKnight, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CodeBlock } from "@/components/code-block";
import { replaySan } from "@/lib/chess";
import { compile, MAX_MESSAGE_LENGTH } from "@/lib/compiler";
import { tokenize } from "@/lib/interpreter";

const EXAMPLES = ["gg", "Hello World", "checkmate", "42", "-7", "127"];

export function CompilerPanel({
  onRun,
  onWatch,
}: {
  onRun: (pgn: string, label: string) => void;
  onWatch: (label: string, tokens: string[]) => void;
}) {
  const [input, setInput] = useState("gg");
  // Legality replay is the expensive part; let typing stay responsive while it catches up.
  const deferredInput = useDeferredValue(input);
  const result = useMemo(() => compile(deferredInput), [deferredInput]);

  const verdict = useMemo(() => {
    if (!result.ok) return null;
    const tokens = tokenize(result.pgn);
    const replay = replaySan(tokens);
    return { tokens, illegalAt: replay.illegalAt };
  }, [result]);

  const label = result.ok
    ? result.kind === "int"
      ? `compiled ${result.value}`
      : `compiled ${JSON.stringify(result.value)}`
    : "";
  const legal = verdict !== null && verdict.illegalAt === null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <Card className="rounded-md border-border bg-card">
        <CardContent className="p-6">
          <label htmlFor="compile-input" className="font-heading text-xl font-semibold text-foreground">
            Message
          </label>
          <input
            id="compile-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            spellCheck={false}
            autoComplete="off"
            className="mt-4 w-full rounded-sm border border-terminal-border bg-terminal-bg px-4 py-3 font-mono text-lg text-terminal-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="text-muted-foreground">try</span>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setInput(example)}
                className="rounded-sm border border-border px-2 py-1 text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {example}
              </button>
            ))}
          </div>

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-border pt-5 font-mono text-[13px]">
            {result.ok ? (
              <>
                <dt className="text-muted-foreground">type</dt>
                <dd className="text-foreground">
                  {result.kind === "int"
                    ? "integer"
                    : `string · ${result.value.length} character${result.value.length === 1 ? "" : "s"}`}
                </dd>
                <dt className="text-muted-foreground">length</dt>
                <dd className="tabular-nums text-foreground">
                  {result.plies} plies · {result.plies / 2} moves
                </dd>
                <dt className="text-muted-foreground">chess</dt>
                <dd className={legal ? "text-primary" : "text-destructive"}>
                  {legal
                    ? "✓ every move is a legal chess move"
                    : `✗ ply ${(verdict?.illegalAt ?? 0) + 1} is not a legal move`}
                </dd>
              </>
            ) : (
              <>
                <dt className="text-muted-foreground">error</dt>
                <dd className="text-destructive" role="status">
                  {result.message}
                </dd>
              </>
            )}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="rounded-sm"
              disabled={!result.ok}
              onClick={() => result.ok && onRun(result.pgn, label)}
            >
              <Play className="mr-2 h-4 w-4" /> Run it
            </Button>
            <Button
              variant="outline"
              className="rounded-sm border-primary/30 text-foreground hover:bg-primary/10"
              disabled={!legal}
              onClick={() => verdict && onWatch(label, verdict.tokens)}
            >
              <ChessKnight className="mr-2 h-4 w-4" /> Watch it on the board
            </Button>
          </div>
        </CardContent>
      </Card>

      <CodeBlock title="compiled.pgn" className="max-h-[560px] overflow-y-auto">
        {result.ok ? result.pgn : "; nothing to compile yet"}
      </CodeBlock>
    </div>
  );
}
