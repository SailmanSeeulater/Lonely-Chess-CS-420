"use client";

import React, { useState } from "react";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CodeBlock({
  children,
  title,
  className,
}: {
  children: string;
  title?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="relative overflow-hidden rounded-md border border-terminal-border bg-terminal-bg text-terminal-foreground">
      <div className="flex items-center justify-between border-b border-terminal-border px-4 py-2">
        <span className="font-mono text-xs text-terminal-muted">» {title ?? "lonely-chess"}</span>
        <Button size="sm" variant="ghost" onClick={copy} className="text-terminal-muted hover:bg-white/5 hover:text-primary">
          <Copy className="mr-2 h-3.5 w-3.5" /> {copied ? "copied" : "copy"}
        </Button>
      </div>
      <pre
        className={cn(
          "overflow-x-auto whitespace-pre-wrap p-5 font-mono text-[13px] leading-6 text-terminal-foreground",
          className
        )}
      >
        <code>{children}</code>
      </pre>
    </div>
  );
}
