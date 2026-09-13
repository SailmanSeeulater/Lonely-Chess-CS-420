# Design

<!-- impeccable:design-schema 1 -->

Scope: `lonely-chess-site` (single-route marketing/demo site). Direction
contract lived at `.impeccable/surface-briefs/lonely-chess-site-home.md`
during the build; this file records what actually shipped.

## World

An illuminated manuscript page that happens to have a computer terminal set
into it. The page itself is bright — ivory ground, deep-green ink — carrying
green and gold at real presence (not sprinkled as decoration); the
"terminal" identity survives as literal dark console windows embedded in
that bright page (the PGN input, program output, variables, and every code
block) rather than as the page's own background.

**Revision history (fastest-moving part of this file — read git blame if it
matters which iteration you're looking at):** shipped dark-mode-only with a
single brass accent → user asked for green primary + a complementary color,
gold was demoted to a named second role rather than discarded → user said
"I like the green/white/gold combination [on the chessboard], apply that to
the whole website," which flipped the page itself from dark to bright
ivory. The code/PGN surfaces did **not** flip with it — they were kept as
deliberate dark insets, both because a real terminal reads as a dark window
regardless of what room it sits in, and because the interpreter's actual
program output (`text-primary`, phosphor green on near-black) only reads as
"live terminal" against a dark ground. This is a judgment call, disclosed
here: the user asked for the combination "on the whole website," and this
build interprets a dark, purposeful terminal-window exception as truer to
"terminal bound like a manuscript" than forcing green-on-white into the
program-output text too.

## Color

Two coexisting surfaces, both OKLCH tokens in `app/globals.css`, no
`.dark` variant (see Theming note below):

**Page chrome** (bright):

| Token | Value | Role |
|---|---|---|
| `--background` | `oklch(0.985 0.006 85)` | page ground, bright ivory |
| `--foreground` | `oklch(0.22 0.025 152)` | body text, deep green-black ink |
| `--card` | `oklch(0.97 0.01 85)` | panel surfaces (slightly deeper than page ground) |
| `--primary` | `oklch(0.5 0.15 152)` | terminal-green accent — buttons, links, focus, active tab, ornament |
| `--gold` | `oklch(0.62 0.14 83)` | manuscript-gilding complement — black chess pieces |
| `--board-light` / `--board-dark` | `oklch(0.97 0.015 85)` / `oklch(0.4 0.09 152)` | chessboard squares — ivory / a deep shade of the primary green |
| `--muted-foreground` | `oklch(0.42 0.03 140)` | secondary text |
| `--border` | `oklch(0.22 0.025 152 / 12%)` | hairline rules — dark ink at low alpha, not a gray |
| `--destructive` | `oklch(0.5 0.19 25)` | error state only, not a brand color |

**Terminal insets** (dark, independent of the page theme):

| Token | Value | Role |
|---|---|---|
| `--terminal-bg` | `oklch(0.16 0.02 152)` | code block / PGN input / output / variables background |
| `--terminal-foreground` | `oklch(0.93 0.02 90)` | code text (bone, not page `--foreground`, which is now dark) |
| `--terminal-muted` | `oklch(0.62 0.03 100)` | filenames, dimmer terminal chrome text |
| `--terminal-border` | `oklch(0.72 0.15 152 / 35%)` | green-tinted hairline around terminal panels |

Note the primary green's lightness dropped from `L 0.72` (legible as text
*on* dark) to `L 0.5` (legible as text *and* button-fill on bright ivory) —
the same hue, retuned for the surface it now has to work against. Gold
deepened similarly (`L 0.78` → `L 0.62`) for the same reason.

Strategy: **Committed** (green carries real coverage — CTAs, links, focus,
active tab, ornament, board frame) plus a **named second role** (gold) for
decoration, now applied consistently across the whole page rather than just
the chessboard. Browser-surface theming (`::selection`, scrollbar thumb,
`.glow-brass`) reads `--primary` through `color-mix()`, so it followed the
green retune automatically; `::selection`'s text color was hand-fixed from a
hardcoded near-white (illegible on the new light-green highlight) to
`var(--color-foreground)`.

## Type

- **Display headings** (`--font-heading` → `--font-stardom`, falls back to
  Quicksand): **Stardom** (Indian Type Foundry, via Fontshare, ITF Free Font
  License), a single-weight serif "designed to be used at extreme large
  sizes" (tags: Branding/Experimental/Fun/Logos/Poster). Self-hosted at
  `app/fonts/Stardom-Regular.woff2` via `next/font/local`. Applied to H1 and
  every section heading — matches its stated purpose. **Not** applied to
  body copy: it ships one weight with no italic and is explicitly a
  display/poster face, so forcing it onto paragraph text would have been a
  real readability regression, not a style choice. Body copy stayed on
  Quicksand, disclosed as a deliberate deviation from a literal "replace
  Quicksand" reading of the request.
- **Body text** (`--font-sans` → `--font-quicksand`): **Quicksand** (Andrew
  Paglinawan, Google Fonts / Fontshare, SIL OFL), weights 400–700, unchanged
  from the prior pass — kept specifically because Stardom can't cover this
  role (see above).
- **Nav wordmark / signage** (new role, `--font-signage` → `--font-teko`,
  falls back to RX100): **Teko** (Manushi Parikh, ITF, via Google Fonts,
  SIL OFL) — "created for use in headlines and other display-sized text,"
  tags Banners/Credits/Headlines. Applied only to the `$ lonely-chess` nav
  wordmark, matching its signage purpose. **Not** applied to the PGN/code
  content it was requested to replace RX100 in: Teko is a proportional
  display face, not monospace, and the actual PGN source/output content
  depends on fixed-width alignment to read as code at all. RX100 stayed in
  that role for the same reason Quicksand stayed on body text.
- **Code/terminal** (`--font-mono` → `--font-rx100`, unchanged): **RX100**
  (Indian Type Foundry, via Fontshare, ITF FFL), self-hosted at
  `app/fonts/RX100-Regular.woff2`. All PGN source, program output, and
  variable dumps — where monospace alignment is functional, not decorative.

Two fonts in this list (Stardom, Teko) were requested as full replacements
for an existing role and were instead scoped to the sub-role their own
design intent actually fits, with the previous face kept for the rest. Both
deviations are disclosed here and in the reply that shipped them, not
silently decided.

Known-bad state before the original redesign pass: `--font-sans: var(--font-sans)`
in `globals.css` was circular and resolved to nothing, so the entire site
silently rendered in the browser's default Times New Roman. Fixed by giving
every role a real face; the faces themselves have changed several times
since at the user's direction, but every role still resolves to a loaded
webfont.

## Components

- **Buttons/Cards/Badge/Tabs**: shadcn primitives, unmodified structurally;
  restyled entirely through the token layer (`bg-primary`, `bg-card`,
  `text-muted-foreground`, etc.), so they inherited the new world for free.
  Radius tightened (`--radius: 0.3rem`) — hairline/manuscript register reads
  wrong at the previous generous `2xl` rounding.
- **No eyebrow/kicker badges** above headings anywhere (hero or section) —
  removed per the craft floor's hard ban; headings carry their own weight.
- **No icon+heading+text card grids** — the four "how it works" facts and
  the six syntax rules are set as hairline-divided definition-list rows
  (`GlossaryRow`, `RuleRow`), not a repeated card template.
- **Chess iconography**: real vector icons from `lucide-react`'s Chess* set
  (`ChessKnight`, `ChessRook`, `ChessBishop`, `ChessQueen`, `ChessPawn`) —
  a real icon library, consistent stroke/weight, per the craft floor's ban on
  unicode-as-icon-system. The one deliberate exception is the starting-
  position board plate itself, which sets real chess-piece Unicode glyphs
  (♔♕♖♗♘♙ / ♚♛♜♝♞♟) as literal chess notation content, not as UI icons.
- **`Chessboard`** (`components/chessboard.tsx`, rules in `lib/chess.ts`): a
  **playable** board in the hero — click a piece, click a destination. Full
  standard rules: per-piece movement, blocked paths, captures, alternating
  turns, castling (both sides, including the "can't castle through check"
  rule), en passant, pawn double-step, promotion, check, checkmate, and
  stalemate. Illegal moves are never offered rather than rejected after the
  fact: selecting a piece shows only its legal destinations (a dot on empty
  squares, a ring around capturable pieces), and moves that would leave your
  own king in check are filtered out by playing each candidate onto a cloned
  board and testing the king. State is `useState` only — the game resets on
  refresh, by design; there is no persistence, no engine opponent, no clock,
  no captured-piece tray, no move list.
  - Promotion is **auto-queen**; under-promotion is not offered. A deliberate
    simplification for a board of this scope, not an oversight.
  - Rendered as 64 `<button>` elements in a CSS grid rather than the previous
    inline SVG, so squares are focusable, keyboard-operable, and carry real
    labels (`"e4, white pawn, capture available"`); the status line is an
    `aria-live` region.
  - Squares keep the tournament-set pairing (`--board-light` bright ivory /
    `--board-dark` a deep shade of the primary green). Pieces use one filled
    glyph set for both sides, told apart by fill and given a thin
    `-webkit-text-stroke` (`.piece-white` / `.piece-black` in `globals.css`)
    so they stay legible on either square color. Every piece color still
    comes from the page's green/gold/ivory palette.
  - Piece size scales with the board via container-query units (`text-[8cqw]`
    inside an `@container` grid), so one rule covers every viewport.
  - On phones the card takes a negative horizontal margin and tighter padding
    to buy back width — squares land at ~40px instead of ~35px. Below `sm`
    only; the desktop composition is untouched.
  - **It does not drive the interpreter, and the caption says so.** The
    interpreter's `BoardState` is a semantic state machine
    (mode/variables/rook-bits), not a spatial board, and the README documents
    that larger programs stop being legal chess after a few plies — so wiring
    this board's moves into the runner would misrepresent the language. The
    two systems are intentionally separate: `lib/chess.ts` validates ordinary
    chess, the interpreter in `app/page.tsx` ignores legality entirely.
- **`SiteNav`**: sticky, hairline-bottomed, `$ lonely-chess` wordmark set in
  Teko (signage role) with a blinking text cursor, anchor links in RX100
  mono styled as shell subcommands (`run`, `syntax`, `examples`).
- **Browser-surface theming**: `::selection`, scrollbar thumb/track, and
  focus rings are all themed from the primary green in `globals.css` rather
  than left as browser defaults.

## Motion

One authored signature moment plus one decorative loop, not scattered
effects:

- A blinking text-cursor (`cursor-blink`, `▍`) after the nav wordmark and at
  the end of the program-output stream — reinforces "this is a live
  terminal," not a static screenshot.
- `field-drift`: the hero's faint etched-checkerboard field drifts left to
  right on a seamless 10s loop (sped up from an initial 40s at the user's
  request) (`background-position` shifted by exactly one
  tile period so it never jumps). Disabled under `prefers-reduced-motion`.

## Navigation

- Anchor links (`SiteNav`'s `run`/`syntax`/`examples`, the hero's two CTAs)
  scroll smoothly via the `scroll-smooth` / `motion-reduce:scroll-auto`
  Tailwind utilities on `<html>` (`app/layout.tsx`), not a raw
  `scroll-behavior` CSS declaration — an equivalent raw declaration inside
  `@layer base { html {...} }` was silently dropped from the compiled
  stylesheet (confirmed via the served CSS bytes, not just DevTools), for
  reasons not fully diagnosed; the Tailwind-utility form compiles reliably,
  so that's the pattern to reach for first if a future raw CSS addition to
  this file mysteriously doesn't take effect.
- Every anchor target (`#runner`, `#guide`, `#examples`, `#local`) carries
  `scroll-mt-20` so the sticky header never covers the section heading after
  a jump.
- `SiteNav` is sized responsively (`text-xl`/`text-2xl`/`text-3xl` wordmark
  across breakpoints, matching nav-link and padding steps) rather than one
  fixed size — a flat 1.5× bump on all breakpoints at once caused the
  wordmark and links to wrap and collide below `sm`. Full size is reached at
  `md` and up; mobile keeps a smaller proportional step.

## Interaction contract

The runner starts empty (no output, no variables) until the visitor presses
**Run program** — loading a sample fills the input but does not run it. The
visitor's own click is what proves the demo is live, not a pre-computed
result waiting on page load.

## Known, deliberate deferrals

- PGN parser/interpreter (`app/page.tsx` lines ~1–394) was left untouched
  and unsplit from the page component — a real maintainability issue, but
  orthogonal to this visual redesign; flagged, not fixed, per "never repair
  drift as a side effect of a design task."
- No comp-led round: the installed `impeccable` CLI (v4.0.0) does not expose
  `concept-seed` / `serve-question` / `build-phase` / `comp-spec` (only
  `detect`, `install`, `link`, `update`, `check`, `help`), and the direction
  was brief-pinned by the user rather than tournament-selected, so this was
  a code-led build by necessity and by brief. No formal finish-reviewer
  subagent pass either — that reference expects on-disk screenshot files
  this browser tool surface cannot produce — inspection was done inline
  (desktop 1440px, mobile 375px, type-check, production build, detector).
