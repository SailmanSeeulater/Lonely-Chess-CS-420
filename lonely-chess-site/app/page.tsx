"use client";

import React, { useRef, useState } from "react";
import { BookOpen, ChessKnight, ChessPawn, ChessQueen, ChessRook, Play, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Chessboard, type ChessboardHandle } from "@/components/chessboard";
import { CodeBlock } from "@/components/code-block";
import { CompilerPanel } from "@/components/compiler-panel";
import { PGN_EXAMPLES, type ExampleName } from "@/lib/examples";
import { run, type RunResult } from "@/lib/interpreter";

const SHOWCASE: readonly (readonly [ExampleName, string])[] = [
  ["sample_int100.pgn", "int_100"],
  ["sample_str_hello.pgn", "hello"],
  ["sample_arithmetic.pgn", "arithmetic"],
  ["sample_dom_dabish.pgn", "dom_dabish"],
  ["fizzbuzz_100.pgn", "fizzbuzz_100"],
  ["actual_game_sample.pgn", "legal_game"],
];

function SectionHeading({
  title,
  align = "left",
  children,
}: {
  title: string;
  align?: "left" | "center";
  children?: React.ReactNode;
}) {
  return (
    <div className={`mb-12 max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      <h2 className="text-balance font-heading text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
        {title}
      </h2>
      {children && (
        <p className="mt-4 max-w-[62ch] text-lg leading-8 text-muted-foreground">{children}</p>
      )}
    </div>
  );
}

function Ornament() {
  return (
    <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-2" aria-hidden="true">
      <div className="h-px flex-1 bg-border" />
      <ChessKnight className="h-4 w-4 shrink-0 text-gold/80" strokeWidth={1.5} />
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function GlossaryRow({
  icon: Icon,
  term,
  children,
}: {
  icon: React.ElementType;
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-5 border-b border-border py-6 first:pt-0 last:border-b-0">
      <Icon className="mt-1 h-6 w-6 shrink-0 text-primary" strokeWidth={1.5} aria-hidden="true" />
      <div>
        <dt className="font-heading text-xl font-semibold text-foreground">{term}</dt>
        <dd className="mt-1 max-w-[60ch] leading-7 text-muted-foreground">{children}</dd>
      </div>
    </div>
  );
}

function RuleRow({ square, title, children }: { square: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 border-b border-border py-6 first:pt-0 last:border-b-0 md:border-b-0 md:odd:border-r md:odd:pr-8 md:even:pl-8 md:[&:nth-last-child(-n+2)]:pb-0 md:[&:nth-child(-n+2)]:pt-0">
      <span className="mt-1 shrink-0 rounded-sm border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] tracking-wide text-primary tabular-nums">
        {square}
      </span>
      <div>
        <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1 leading-7 text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

function SiteNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 sm:py-[18px]">
        <a href="#top" className="whitespace-nowrap font-signage text-xl tracking-wide text-foreground sm:text-2xl md:text-3xl">
          <span className="text-primary">$</span> lonely-chess
          <span className="cursor-blink text-primary">▍</span>
        </a>
        <nav className="flex items-center gap-4 font-mono text-xs text-muted-foreground sm:gap-6 sm:text-sm md:gap-9 md:text-lg">
          <a href="#runner" className="transition-colors hover:text-primary">run</a>
          <a href="#compile" className="transition-colors hover:text-primary">compile</a>
          <a href="#guide" className="hidden transition-colors hover:text-primary sm:inline">syntax</a>
          <a href="#examples" className="transition-colors hover:text-primary">examples</a>
          <span className="hidden text-muted-foreground/60 sm:inline">CS 420 · Final Project</span>
        </nav>
      </div>
    </header>
  );
}

export default function LonelyChessSite() {
  const boardRef = useRef<ChessboardHandle>(null);
  const [pgnInput, setPgnInput] = useState<string>(PGN_EXAMPLES["sample_int100.pgn"]);
  const [source, setSource] = useState("sample_int100.pgn");
  const [runResult, setRunResult] = useState<RunResult | null>(null);

  function runProgram() {
    setRunResult(run(pgnInput));
  }

  function loadExample(name: ExampleName) {
    setPgnInput(PGN_EXAMPLES[name]);
    setSource(name);
    setRunResult(null);
  }

  function runFrom(pgn: string, label: string) {
    setPgnInput(pgn);
    setSource(label);
    setRunResult(run(pgn));
    document.getElementById("runner")?.scrollIntoView({ block: "start" });
  }

  function watchOnBoard(label: string, tokens: string[]) {
    boardRef.current?.play(label, tokens);
    document.getElementById("board")?.scrollIntoView({ block: "center" });
  }

  return (
    <main id="top" className="min-h-screen bg-background text-foreground">
      <SiteNav />

      <section className="field-board relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h1 className="text-balance font-heading text-6xl font-bold leading-[0.95] tracking-tight text-foreground md:text-8xl">
              Lonely Chess
            </h1>
            <p className="mt-6 max-w-xl text-2xl leading-9 text-foreground/90 md:text-3xl">
              A legal PGN chess game, read as source code.
            </p>
            <p className="mt-5 max-w-[58ch] text-base leading-7 text-muted-foreground">
              Every move in the game file below is an instruction: a variable
              declaration, a binary digit, a loop, an arithmetic step, or a
              print. The runner on this page is a real, independent
              implementation of the language — not a recording of the Python
              original.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href="#runner">
                <Button size="lg" className="rounded-sm">
                  <Play className="mr-2 h-4 w-4" /> Run a program
                </Button>
              </a>
              <a href="#guide">
                <Button size="lg" variant="outline" className="rounded-sm border-primary/30 text-foreground hover:bg-primary/10">
                  <BookOpen className="mr-2 h-4 w-4" /> Read the rules
                </Button>
              </a>
            </div>
          </div>
          <div id="board" className="scroll-mt-28">
            <Chessboard ref={boardRef} onRunGame={runFrom} />
          </div>
        </div>
      </section>

      <Ornament />

      <section className="mx-auto max-w-4xl px-6 py-16">
        <SectionHeading title="Four things worth knowing before you run one">
          The mechanism, in short.
        </SectionHeading>
        <dl>
          <GlossaryRow icon={ChessPawn} term="A PGN file is the program">
            Standard Portable Game Notation — the same format Chess.com and
            Lichess export — is parsed directly. No custom file format, no
            preprocessing.
          </GlossaryRow>
          <GlossaryRow icon={ChessRook} term="The board is memory">
            Interpreter state lives in named slots like <code className="font-mono text-sm text-primary">p_h2</code> and{" "}
            <code className="font-mono text-sm text-primary">p_g2</code>, one per pawn&apos;s home
            square.
          </GlossaryRow>
          <GlossaryRow icon={ChessKnight} term="Pieces carry syntax">
            Knights, rooks, bishops, kings, and queens each perform a fixed
            programming role — declaration, encoding, looping, branching,
            printing.
          </GlossaryRow>
          <GlossaryRow icon={ChessQueen} term="Two implementations, one language">
            A Python reference implementation ships in the repository; this
            page runs a TypeScript port held to the same rules — every sample
            and regression case prints identical output in both, checked by{" "}
            <code className="font-mono text-sm text-primary">npm test</code>.
          </GlossaryRow>
        </dl>
      </section>

      <section id="runner" className="scroll-mt-20 border-y border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <SectionHeading title="Run it yourself">
            Paste a PGN program, or load one of the samples below. This parses
            moves, tracks interpreter state, and prints only when the program
            reaches an explicit print instruction — the same contract as the
            Python runtime.
          </SectionHeading>
          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="rounded-md border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-baseline justify-between gap-4">
                  <label htmlFor="pgn-input" className="font-heading text-xl font-semibold text-foreground">
                    PGN input
                  </label>
                  <span className="truncate font-mono text-[11px] text-muted-foreground">{source}</span>
                </div>
                <textarea
                  id="pgn-input"
                  value={pgnInput}
                  onChange={(e) => {
                    setPgnInput(e.target.value);
                    setSource("your edits");
                  }}
                  spellCheck={false}
                  className="mt-4 h-[420px] w-full rounded-sm border border-terminal-border bg-terminal-bg p-4 font-mono text-sm text-terminal-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring md:h-[480px]"
                />
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button onClick={runProgram} className="rounded-sm">
                    <Play className="mr-2 h-4 w-4" /> Run program
                  </Button>
                  {(
                    [
                      ["sample_int100.pgn", "int 100"],
                      ["sample_str_hello.pgn", "Hello"],
                      ["sample_arithmetic.pgn", "Arithmetic"],
                      ["fizzbuzz_100.pgn", "FizzBuzz"],
                      ["actual_game_sample.pgn", "Legal game"],
                    ] as const
                  ).map(([name, text]) => (
                    <Button key={name} variant="outline" className="rounded-sm border-border" onClick={() => loadExample(name)}>
                      {text}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-8">
              <Card className="glow-brass rounded-md border-primary/25 bg-terminal-bg">
                <CardContent className="p-6">
                  <h3 className="flex items-center gap-2 font-heading text-xl font-semibold text-terminal-foreground">
                    <Terminal className="h-5 w-5 text-primary" /> Program output
                  </h3>
                  <div className="mt-4 min-h-[220px] max-h-[360px] overflow-auto rounded-sm border border-primary/20 bg-black/25 p-5 font-mono text-sm leading-7 whitespace-pre-wrap tabular-nums text-primary">
                    {!runResult ? (
                      <span className="text-terminal-muted">
                        waiting for <span className="text-primary">Run program</span>
                      </span>
                    ) : runResult.lines.length > 0 ? (
                      runResult.lines.join("\n")
                    ) : (
                      !runResult.error && (
                        <span className="text-terminal-muted">the program ran; no move reached a print instruction</span>
                      )
                    )}
                    {runResult?.error && (
                      <span className="block text-terminal-error">runtime error: {runResult.error}</span>
                    )}
                    <span className="cursor-blink">▍</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-md border-terminal-border bg-terminal-bg">
                <CardContent className="p-6">
                  <h3 className="font-heading text-xl font-semibold text-terminal-foreground">Variables at end</h3>
                  <pre className="mt-4 max-h-[220px] overflow-auto rounded-sm border border-terminal-border bg-black/25 p-5 font-mono text-sm text-terminal-foreground whitespace-pre-wrap">
                    {runResult ? JSON.stringify(runResult.variables, null, 2) : "{ }"}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section id="compile" className="scroll-mt-20 mx-auto max-w-7xl px-6 py-20">
        <SectionHeading title="Write a message, get a chess game">
          Type a number from −127 to 127, or a short line of plain text. The
          compiler writes the Lonely Chess program that prints it, then replays
          it on a real chess engine to check that every move is legal — so it
          can actually be played over a board.
        </SectionHeading>
        <CompilerPanel onRun={runFrom} onWatch={watchOnBoard} />
      </section>

      <Ornament />

      <section id="guide" className="scroll-mt-20 mx-auto max-w-5xl px-6 py-20">
        <SectionHeading title="How the language reads">
          Every chess move either changes the interpreter&apos;s mode, writes
          data, performs arithmetic, controls flow, or prints — never more
          than one at a time.
        </SectionHeading>
        <div className="grid gap-x-0 gap-y-0 md:grid-cols-2">
          <RuleRow square="Na3" title="Integer mode">
            White Knight to a3 begins an integer declaration.
          </RuleRow>
          <RuleRow square="Nc3" title="String mode">
            White Knight to c3 begins a string declaration instead.
          </RuleRow>
          <RuleRow square="h2→h3" title="Variable name">
            A pawn move selects a variable by file — the h-file pawn becomes{" "}
            <code className="font-mono text-primary">p_h2</code>.
          </RuleRow>
          <RuleRow square="b6–h6" title="Binary encoding">
            The Black rook walks rank 6 to write 7-bit values, most
            significant bit first.
          </RuleRow>
          <RuleRow square="Ke2 / Ke1" title="Loop">
            King to e2 starts or advances the loop; king to e1 prints the
            current iteration and clears the buffer.
          </RuleRow>
          <RuleRow square="Bh3…Bf1" title="If + modulo">
            Bishop opens the if-block, the a-rook opens modulo, the black rook
            bounces to count the divisor, and the a-rook returns to a1 to
            evaluate the match.
          </RuleRow>
        </div>
      </section>

      <Ornament />

      <section id="examples" className="scroll-mt-20 mx-auto max-w-7xl px-6 py-20">
        <SectionHeading title="Real programs, unabridged">
          Six sample files straight from the repository, shown in full — no
          shortcut ellipses. The last one is a fully legal chess game that
          prints 100.
        </SectionHeading>
        <Tabs defaultValue="sample_int100.pgn" className="w-full">
          <TabsList variant="line" className="mb-8 flex h-auto w-full flex-wrap justify-start gap-1 border-b border-border p-0">
            {SHOWCASE.map(([name, tab]) => (
              <TabsTrigger key={name} value={name} className="rounded-none px-3 py-2 font-mono text-xs">
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
          {SHOWCASE.map(([name]) => (
            <TabsContent key={name} value={name}>
              <CodeBlock title={name} className="max-h-[640px] overflow-y-auto">
                {PGN_EXAMPLES[name]}
              </CodeBlock>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      <section id="local" className="scroll-mt-20 border-t border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-2">
          <div>
            <h3 className="font-heading text-2xl font-semibold text-foreground">Run it locally</h3>
            <p className="mt-2 max-w-[55ch] leading-7 text-muted-foreground">
              Pure Python 3.6+, no dependencies.
            </p>
            <div className="mt-5">
              <CodeBlock title="terminal">{`python3 lonely_chess_runtime.py fizzbuzz_100.pgn\n\npython3 lonely_chess_interpreter.py sample_int100.pgn`}</CodeBlock>
            </div>
          </div>
          <div>
            <h3 className="font-heading text-2xl font-semibold text-foreground">Runtime vs. interpreter</h3>
            <p className="mt-2 max-w-[55ch] leading-7 text-muted-foreground">
              <code className="font-mono text-primary">lonely_chess_runtime.py</code> prints only
              final program output. <code className="font-mono text-primary">lonely_chess_interpreter.py</code> annotates
              every move — better for debugging and for watching each chess
              move change the program state.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-12 text-center">
        <p className="font-heading text-lg font-semibold text-foreground">Lonely Chess</p>
        <p className="mt-2 text-sm text-muted-foreground">
          A chess-based esoteric programming language by Perfect Phanitchaleun
          and Nicolaus ReyasBautista — CS 420 Final Project.
        </p>
      </footer>
    </main>
  );
}
