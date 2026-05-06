"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Terminal, ChessKnight, Code2, BookOpen, Play, Cpu, GitBranch } from "lucide-react";

const codeBlocks = {
  run: `# Clean runtime output\npython3 lonely_chess_runtime.py fizzbuzz_100.pgn\n\n# Debug interpreter output\npython3 lonely_chess_interpreter.py fizzbuzz_100.pgn`,
  fizzbuzzPython: `for num in range(1, 101):\n    output = ""\n\n    if num % 3 == 0:\n        output += "Fizz"\n\n    if num % 5 == 0:\n        output += "Buzz"\n\n    print(output or num)`,
  fizzbuzzChess: `{ encode p_g2 = "Fizz" and p_f2 = "Buzz" }\n\nKe2 ...      { start for loop at i = 1 }\nRh2 ...      { arm loop variable i }\n... Ra6→h6   { encode loop end as 100 }\nRh1 ...      { loop is ready }\n\n{ each iteration }\nBh3→Rh3→Ra3→Ra2/Ra3 x3→Ra1→Bf1   { if i % 3 == 0, add Fizz }\nBh3→Rh3→Ra3→Ra2/Ra3 x5→Ra1→Bf1   { if i % 5 == 0, add Buzz }\nKe1 ...      { print buffer or i }\nKe2 ...      { next iteration }`,
  hello: `1. Nc3 a5       { begin string mode }\n2. h3  a4       { declare p_h2 }\n3. h4  Ra6      { enter encoding }\n...             { encode "Hello World" as 7-bit ASCII }\nN. Nb1 Ra8      { commit p_h2 }\nM. h5  ...      { select p_h2 to print }\nM. Qd2 ...      { initiate print }\nM. Qd1 ...      { output }\n\nOUTPUT:\nHello World`,
  arithmetic: `p_h2 = 20\np_g2 = 4\n\nh7→h5      { arm + operator }\nRh2→g2→a2→a1  { p_h2 = 20 + 4 = 24 }\n\ng7→g5      { arm - operator }\nRh2→g2→a2→a1  { p_h2 = 24 - 4 = 20 }\n\nf7→f5      { arm * operator }\nRh2→g2→a2→a1  { p_h2 = 20 * 4 = 80 }\n\ne7→e5      { arm / operator }\nRh2→g2→a2→a1  { p_h2 = 80 / 4 = 20 }\n\nOUTPUT:\n24 → 20 → 80 → 20`,
  intDeclare: `INTEGER EXAMPLE: int p_h2 = 100\n\n1. Na3 a5      { begin integer declaration }\n2. h3  a4      { choose variable p_h2 }\n3. h4  Ra6     { enter binary encoding mode }\n4. Nc4 Rb6     { write bit 6 = 1 }\n5. Na3 Rc6     { write bit 5 = 1 }\n6. Nc4 Rf6     { write bit 2 = 1 }\n7. Na3 Ra6     { finalize binary 1100100 = 100 }\n8. Nb1 Ra8     { commit p_h2 = 100 }`,
  stringDeclare: `STRING EXAMPLE: String p_g2 = "Fizz"\n\n1. Nc3 a5      { begin string declaration }\n2. g3  a4      { choose variable p_g2 }\n3. g4  Ra6     { enter string encoding mode }\n...            { encode each character as 7-bit ASCII }\n... Ra8/Ra6    { reset between characters }\nN. Nb1 Ra8     { commit p_g2 = "Fizz" }`
};

function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="relative rounded-2xl bg-zinc-950 text-zinc-100 shadow-xl overflow-hidden border border-zinc-800">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex gap-2">
          <span className="h-3 w-3 rounded-full bg-zinc-700" />
          <span className="h-3 w-3 rounded-full bg-zinc-700" />
          <span className="h-3 w-3 rounded-full bg-zinc-700" />
        </div>
        <Button size="sm" variant="ghost" onClick={copy} className="text-zinc-300 hover:text-white">
          <Copy className="mr-2 h-4 w-4" /> {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="p-5 overflow-x-auto text-sm leading-6"><code>{children}</code></pre>
    </div>
  );
}

function SectionTitle({ eyebrow, title, children }) {
  return (
    <div className="max-w-3xl mx-auto text-center mb-10">
      <Badge variant="secondary" className="mb-4 rounded-full px-4 py-1">{eyebrow}</Badge>
      <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-950">{title}</h2>
      {children && <p className="mt-4 text-lg text-zinc-600 leading-8">{children}</p>}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, children }) {
  return (
    <Card className="rounded-2xl shadow-sm border-zinc-200 bg-white/80 backdrop-blur">
      <CardContent className="p-6">
        <div className="h-12 w-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center mb-5">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-semibold text-zinc-950 mb-3">{title}</h3>
        <p className="text-zinc-600 leading-7">{children}</p>
      </CardContent>
    </Card>
  );
}

export default function LonelyChessSite() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-100 text-zinc-900">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.10),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.08),transparent_30%)]" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-14 w-14 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shadow-lg">
                <ChessKnight className="h-8 w-8" />
              </div>
              <Badge className="rounded-full px-4 py-1 text-sm">CS 420 Final Project</Badge>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-zinc-950 leading-tight">
              Lonely Chess
            </h1>
            <p className="mt-5 text-2xl md:text-3xl font-medium text-zinc-700">
              A chess-based esoteric programming language where a valid PGN game file becomes source code.
            </p>
            <p className="mt-6 text-lg text-zinc-600 leading-8 max-w-3xl">
              Lonely Chess turns chess moves into programming instructions. Knights declare variables, rooks encode binary values, bishops create if-statements, kings control loops, and the board acts as memory.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#try"><Button size="lg" className="rounded-2xl"><Play className="mr-2 h-5 w-5" /> Try it</Button></a>
              <a href="#language"><Button size="lg" variant="outline" className="rounded-2xl"><BookOpen className="mr-2 h-5 w-5" /> Learn the language</Button></a>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-5">
        <FeatureCard icon={Code2} title="PGN is code">A normal chess game notation file is the program. The interpreter reads each move and executes it as an instruction.</FeatureCard>
        <FeatureCard icon={Cpu} title="Board is memory">The board state works like memory. Variables live in positions like p_h2, p_g2, and p_f2.</FeatureCard>
        <FeatureCard icon={ChessKnight} title="Pieces have roles">Each piece type controls part of the language: variables, strings, loops, conditions, math, and printing.</FeatureCard>
        <FeatureCard icon={GitBranch} title="Real control flow">Lonely Chess supports loops, if-statements, modulo checks, arithmetic operations, and output.</FeatureCard>
      </section>

      <section id="try" className="max-w-7xl mx-auto px-6 py-20">
        <SectionTitle eyebrow="Try it yourself" title="Run a Lonely Chess program">
          Use the runtime for clean output, or use the interpreter when you want to see every chess move explained step by step.
        </SectionTitle>
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-7">
              <h3 className="text-2xl font-bold mb-4 flex items-center"><Terminal className="mr-3 h-6 w-6" /> Terminal commands</h3>
              <p className="text-zinc-600 leading-7 mb-5">
                Put your PGN file in the same folder as the Python files, then run one of these commands.
              </p>
              <CodeBlock>{codeBlocks.run}</CodeBlock>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-7">
              <h3 className="text-2xl font-bold mb-4">What happens when it runs?</h3>
              <ol className="space-y-4 text-zinc-700 leading-7 list-decimal list-inside">
                <li>The PGN file is opened and cleaned.</li>
                <li>Each chess move is parsed into a piece and destination square.</li>
                <li>The interpreter updates the board state, variables, loop counter, and output buffer.</li>
                <li>When a print instruction occurs, the runtime prints the result.</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="language" className="bg-zinc-950 text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <SectionTitle eyebrow="Language guide" title="How Lonely Chess works">
            <span className="text-zinc-300">Lonely Chess is intentionally strange, but the rules are consistent. Every important programming concept is mapped to chess movement.</span>
          </SectionTitle>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              ["Knight", "Na3 begins integer mode. Nc3 begins string mode. Nb1 commits the variable."],
              ["Pawn", "A pawn selects a variable name based on its file, such as p_h2 or p_g2."],
              ["Black Rook", "The black rook writes 7-bit binary values across rank 6."],
              ["King", "Ke2 starts or advances a for-loop. Ke1 ends an iteration and prints."],
              ["Bishop", "Bh3 opens an if-statement. Bf1 closes the if-statement."],
              ["Rook + Pawn", "Black pawns arm arithmetic operators; white rooks choose operands and execute math."]
            ].map(([title, text]) => (
              <Card key={title} className="rounded-2xl bg-white/10 border-white/10 text-white">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-3">{title}</h3>
                  <p className="text-zinc-300 leading-7">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <SectionTitle eyebrow="Variables" title="Declaring and assigning values">
          Variables are stored inside the interpreter's board state. A variable like p_h2 means the pawn file h is being used as a memory slot.
        </SectionTitle>
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-4">Integer declaration</h3>
            <p className="text-zinc-600 leading-7 mb-5">
              To assign an integer, the knight enters integer mode, a pawn chooses the variable, and the black rook writes the number in 7-bit binary.
            </p>
            <CodeBlock>{codeBlocks.intDeclare}</CodeBlock>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-4">String declaration</h3>
            <p className="text-zinc-600 leading-7 mb-5">
              Strings work similarly, except each character is encoded separately using 7-bit ASCII. The rook resets between characters.
            </p>
            <CodeBlock>{codeBlocks.stringDeclare}</CodeBlock>
          </div>
        </div>
      </section>

      <section className="bg-zinc-100 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <SectionTitle eyebrow="Sample programs" title="Examples you can study">
            These examples show how normal programming ideas translate into Lonely Chess notation.
          </SectionTitle>
          <Tabs defaultValue="fizzbuzz" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 rounded-2xl h-auto p-1 mb-8">
              <TabsTrigger value="fizzbuzz" className="rounded-xl py-3">FizzBuzz</TabsTrigger>
              <TabsTrigger value="hello" className="rounded-xl py-3">Hello World</TabsTrigger>
              <TabsTrigger value="arithmetic" className="rounded-xl py-3">Arithmetic</TabsTrigger>
              <TabsTrigger value="python" className="rounded-xl py-3">Python Equivalent</TabsTrigger>
            </TabsList>
            <TabsContent value="fizzbuzz">
              <Card className="rounded-2xl shadow-sm"><CardContent className="p-7">
                <h3 className="text-2xl font-bold mb-3">FizzBuzz in Lonely Chess</h3>
                <p className="text-zinc-600 leading-7 mb-5">The program encodes "Fizz" and "Buzz," loops from 1 to 100, checks divisibility by 3 and 5, then prints either the buffer or the number.</p>
                <CodeBlock>{codeBlocks.fizzbuzzChess}</CodeBlock>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="hello">
              <Card className="rounded-2xl shadow-sm"><CardContent className="p-7">
                <h3 className="text-2xl font-bold mb-3">Hello World</h3>
                <p className="text-zinc-600 leading-7 mb-5">This program declares a string, commits it to memory, then uses the print sequence to output it.</p>
                <CodeBlock>{codeBlocks.hello}</CodeBlock>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="arithmetic">
              <Card className="rounded-2xl shadow-sm"><CardContent className="p-7">
                <h3 className="text-2xl font-bold mb-3">Arithmetic</h3>
                <p className="text-zinc-600 leading-7 mb-5">Arithmetic uses black pawns to choose an operator and white rook movement to select operands and execute the operation.</p>
                <CodeBlock>{codeBlocks.arithmetic}</CodeBlock>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="python">
              <Card className="rounded-2xl shadow-sm"><CardContent className="p-7">
                <h3 className="text-2xl font-bold mb-3">FizzBuzz in regular Python</h3>
                <p className="text-zinc-600 leading-7 mb-5">This is the normal program Lonely Chess is recreating through chess moves.</p>
                <CodeBlock>{codeBlocks.fizzbuzzPython}</CodeBlock>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <SectionTitle eyebrow="Implementation" title="What the Python interpreter does">
          The Python code does not play chess. Instead, it uses chess notation as a custom syntax and simulates the language state.
        </SectionTitle>
        <div className="grid md:grid-cols-3 gap-5">
          <FeatureCard icon={BookOpen} title="1. Tokenize PGN">The parser removes PGN comments and headers, then separates white and black moves into tokens.</FeatureCard>
          <FeatureCard icon={Code2} title="2. Parse moves">Regex turns moves like Nc3 or Ra6 into a piece type and destination square.</FeatureCard>
          <FeatureCard icon={Cpu} title="3. Execute state changes">The board state stores variables, modes, loop counters, arithmetic settings, and output buffers.</FeatureCard>
        </div>
      </section>

      <section className="bg-zinc-950 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <Badge variant="secondary" className="rounded-full px-4 py-1 mb-5">Limitations</Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Why this language is difficult on purpose</h2>
            <p className="text-zinc-300 leading-8 text-lg">
              Lonely Chess is not designed to be practical. It is designed to explore how far a programming language can be stretched while still having variables, control flow, arithmetic, and output.
            </p>
          </div>
          <div className="grid gap-4">
            {[
              "Simple operations require many chess moves.",
              "Turn alternation forces filler moves that do not perform computation.",
              "The chessboard limits how many variables can be active at once.",
              "Debugging is hard because logic is spread across hundreds or thousands of moves."
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-white/10 border border-white/10 p-5 text-zinc-200">{item}</div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 text-center text-zinc-500">
        <p className="font-semibold text-zinc-700">Lonely Chess</p>
        <p className="mt-2">A chess-based esoteric programming language by Perfect Phanitchaleun and Nicolaus ReyasBautista.</p>
      </footer>
    </main>
  );
}
