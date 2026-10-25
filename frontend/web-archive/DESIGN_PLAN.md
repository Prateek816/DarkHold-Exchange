# ARCANE OBSIDIAN — DESIGN PLAN
## The Darkhold Exchange Visual Redesign

---

## 1. DESIGN DIRECTION: "ARCANE OBSIDIAN"

**Core Concept:** A near-black canvas with frosted-glass surfaces, violet ambient light with mint accents, glowing data lines, and big confident numbers. Premium, calm, and modern with an occult Darkhold soul — dramatic in the landing and shell, restrained and highly legible inside the terminal. It should feel like an expensive trading product a judge remembers, not a template.

**Differentiation from References:**
- Not a copy of ref-violet or ref-teal — those are *inspiration* for component patterns only
- Violet is the **brand** (not teal); mint is the **positive/buy** accent
- SIM uses **ice blue** with diagonal hatch (never violet)
- The Ward (price ceiling) uses **ember gold** — distinct from both brand and SIM
- Rare crimson accent only on landing hero and failed-reconciliation ring

---

## 2. COLOR TOKENS (CSS Variables + Tailwind Theme)

### Canvas & Glass
| Token | Hex / Value | Usage |
|-------|-------------|-------|
| `--bg` | `#05050A` | Deepest canvas |
| `--bg-2` | `#0A0A12` | Elevated surfaces |
| `--glass-fill` | `rgba(255,255,255,0.035)` | Card backgrounds |
| `--glass-fill-hover` | `rgba(255,255,255,0.06)` | Card hover |
| `--glass-border` | `rgba(255,255,255,0.08)` | Hairline borders |
| `--glass-border-strong` | `rgba(255,255,255,0.15)` | Active/emphasis borders |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--text` | `#F3F2F8` | Primary text (AA on glass) |
| `--text-muted` | `#9892AD` | Secondary labels |
| `--text-dim` | `#5F5A73` | Tertiary/captions |

### Brand & Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| `--brand-300` | `#B8A6FF` | Brand light |
| `--brand-400` | `#9B82FF` | Brand mid |
| `--brand-500` | `#7C5CFF` | **Primary brand** |
| `--brand-600` | `#5B3FE0` | Brand dark |
| `--brand-glow` | `rgba(124,92,255,0.40)` | Brand glow effects |
| `--mint-300` | `#7DF2DC` | Mint light |
| `--mint-400` | `#3EE6C8` | Mint mid |
| `--mint-500` | `#19CBB0` | **Buy/positive primary** |
| `--mint-glow` | `rgba(25,203,176,0.30)` | Mint glow |
| `--buy-text` | `#2EE6A6` | Buy text |
| `--buy-solid` | `#1FBF86` | Buy solid |
| `--buy-tint` | `rgba(46,230,166,0.14)` | Buy backgrounds |
| `--sell-text` | `#FF5C7A` | Sell text |
| `--sell-solid` | `#E0405E` | Sell solid |
| `--sell-tint` | `rgba(255,92,122,0.14)` | Sell backgrounds |
| `--ward` | `#F5B544` | **WARD ceiling** (ember gold) |
| `--ward-glow` | `rgba(245,181,68,0.35)` | Ward glow |
| `--sim` | `#5AA9FF` | **SIM ice blue** (with hatch) |
| `--sim-hatch` | `repeating-linear-gradient(45deg, rgba(90,169,255,0.28), rgba(90,169,255,0.28) 1px, transparent 1px, transparent 4px)` | SIM shading |
| `--warning` | `#F5B544` | Warning/amber |
| `--info` | `#5AA9FF` | Info |
| `--lime` | `#D6F24A` | **Dot-matrix latest group only** |
| `--crimson` | `#C1272D` | Landing hero accent, failed ring only |

### Radii & Spacing
| Token | Value |
|-------|-------|
| `--radius-card` | `24px` |
| `--radius-panel` | `16px` |
| `--radius-tile` | `12px` |
| `--radius-pill` | `999px` |
| `--space-unit` | `8px` |
| `--card-padding` | `20-24px` |
| `--gap` | `16-20px` |

---

## 3. TYPOGRAPHY

| Role | Font | Weights | Notes |
|------|------|---------|-------|
| **Display / Headlines** | **Instrument Serif** (italic for accent words) | 400 | Fallback: Fraunces. Landing hero 80-112px, auction price 72-88px |
| **UI / Body** | **Plus Jakarta Sans** | 400-700 | Fallback: Manrope. Section titles 18-20px/600, body 14px, captions 12px |
| **Numbers (UI)** | Plus Jakarta Sans | 400-700 | `font-variant-numeric: tabular-nums`, `-0.02em` tracking. Big numbers 28-32px semibold |
| **Monospace** | **JetBrains Mono** | 400-600 | **ONLY** for IDs, hashes, order IDs, ledger TXNs, address chips |

**Scale:**
- Landing hero: 80-112px (clamp)
- Auction price: 72-88px
- Highlight number: 56px
- Stat numbers: 28-32px
- Section titles: 18-20px / 600
- Body: 14px
- Captions: 12px

**Brand Wordmark:** "Darkhold" in Instrument Serif with original sigil mark (hexagon with center dot — NOT copied from refs)

**Loading:** `next/font` with `display: swap`, no layout shift.

---

## 4. BACKGROUND LAYERS (Fixed, Behind Everything)

```
Layer 1: Canvas (--bg)
Layer 2: Large blurred VIOLET glow from top-center (~900x520, α=0.32)
         Smaller MINT glow from top-left (~700x420, α=0.20)
Layer 3: Faint 64px grid (α=0.025) masked with radial fade (shows only near glows)
Layer 4: ~3% film grain (SVG turbulence)
```

**Glow Animation:** Transform-only drift, 24-30s alternate, cross-fade per route:
- Marketplace/Console: mint + violet
- Terminal: balanced
- Auctions: violet-leaning
- Landing: strongest

---

## 5. CORE PRIMITIVES (Build Once, Reuse Everywhere — Show All on `/dev/theme`)

### 5.1 GlassCard
- Gradient fill: `linear-gradient(145deg, rgba(255,255,255,0.065) 6.5%, rgba(255,255,255,0.01) 100%)`
- 1px hairline border (brighter at top-left via `box-shadow: inset 0 1px 0 rgba(255,255,255,0.15)`)
- Backdrop blur: 18px
- Radius: 24px
- Deep soft shadow: `0 30px 70px -30px rgba(0,0,0,0.9)`
- Optional 2px colored bottom-edge glow (brand/mint/rose)
- Pointer-following spotlight on hover
- Lift 2px on hover

### 5.2 IconTile (40px)
- Glass rounded-12, thin-stroke Lucide icon
- Variants: brand, mint, sell, amber, neutral

### 5.3 SectionHeader
- IconTile + title + muted subtitle + optional round three-dots menu button

### 5.4 StatCard
- IconTile top-left, label, three-dots menu top-right
- Big number (tabular-nums), tinted DeltaPill
- Optional: AreaGlowChart, GaugeBar, or progress bar with round end dots

### 5.5 DeltaPill
- Tinted pill with arrow (mint for positive, rose for negative, amber for neutral)

### 5.6 Glass Popovers & Dropdowns
- Glass pill triggers, glass popovers with same styling

### 5.7 Buttons
- **Primary CTA:** Violet gradient pill, soft glow, slow shine sweep on hover
- **Mint CTA (Buy):** Mint gradient, mint glow
- **Rose CTA (Sell):** Rose gradient, rose glow
- **Outlined Pill:** Hairline border, icon support (Buy style with lightning)
- **Destructive:** Outlined red pill

### 5.8 SegmentedTabs
- Sliding indicator (shared `layoutId` for FLIP animation)

### 5.9 Toggle Switch
- Spring thumb animation

### 5.10 Glass Inputs (44px)
- Brand focus ring + glow, numeric steppers

### 5.11 DataTable
- Rounded header strip, hairline row separators, hover fill
- Avatar tile cells, **NO backdrop blur on rows**

### 5.12 StatusPill Set (spec text locked)
| Status | Style |
|--------|-------|
| Settled / Success | Solid green with check |
| Matched, settling | Amber outlined |
| Open / Partially filled | Violet-tinted |
| Canceled / Pending | Grey |
| Rejected | Rose-tinted |
| SIM | Ice-blue hatched |

### 5.13 AddressChip
- Monospace, bordered, copy icon — for trade ID, order ID, ledger TXN ID, request ID

### 5.14 LivePill
- Pulsing ring animation

### 5.15 Skeletons
- Shimmer matching final layout

### 5.16 Toasts
- Spring entrance, ARIA live region

### 5.17 Modal / Drawer
- Blurred dim backdrop, scale-in
- Right-side glass Drawer

### 5.18 GaugeBar
- Thin two-tone rounded bar with round end dots and labels at each end (like Win Rate bar in ref-violet)

### 5.19 DotMatrixChart
- 3px dots, 5px pitch, white at 85% opacity
- Thin vertical hairlines between groups
- Latest group in lime (`#D6F24A`)
- Month labels beneath

### 5.20 AreaGlowChart
- Smooth monotone line, 2px stroke with SVG glow
- Gradient fill fading to 0
- Faint horizontal grid only
- Hover: white dot with dark ring + halo, hairline, floating glass tooltip pill (spring between points)
- First-load: stroke draw-in 700ms

---

## 6. APP SHELL (All Authenticated Pages)

### 6.1 Floating Glass Sidebar (248px → 76px icon rail)
- Radius 28, sticky, collapses with animation
- Violet-to-black vertical gradient tint
- Top: Wordmark + sigil + collapse chevron
- Greeting: "Welcome back, {username}" + muted "Last login" line
- Grouped nav:
  - **Overview:** Marketplace, Terminal (shortcut to last asset)
  - **Activity:** Auctions, Portfolio
  - **Other:** Demo Console (operators only)
- Active item: Raised glass pill with brand bar on right edge + sliding indicator
- Hover: icon nudge
- Bottom: Log Out + persistent simulated-market notice (small glass note)

### 6.2 Main Header
- Breadcrumb: "Overview / {Page}"
- Search field with `Ctrl/Cmd+K` chip → quick-jump palette (pages + asset names)
- Compact VaultBar (Available vs Reserved) — GaugeBar with end caps
- Live connection pill (green/amber/red + text)
- Notification bell + avatar (round glass buttons)
- Outlined pill actions where page needs them

### 6.3 Global Banners
- Full-width glass, colored left accent
- Types: asset halted, API unreachable, WebSocket disconnected

### 6.4 Toast Region
- Top-right

### 6.5 Mobile
- Bottom glass tab bar + slide-in drawer
- Reduce blur and glow

---

## 7. SIGNATURE ELEMENTS (Required — Make It Memorable)

1. **THE WARD:** Ember-gold dashed line on chart/order book with "Resale cap" chip. Input above ceiling → bumps, shakes once, shows message: "Resale cap is {ceiling} ({pct}% of face value {face}). Lower your price."

2. **THE SEAL:** Small sigil per order/trade, fills in 3 steps: Reserved → Matched → Settled. "Matched, settling" = half-filled, tooltip: "Matched and final, settlement in progress." Completes only on SettlementCompleted. Failed = amber: "Settlement delayed, funds remain reserved."

3. **THE VAULT BAR:** GaugeBar (Available vs Reserved) with end caps and labels. Compact in header, large on Portfolio. Slice moves to reserved only after server confirmation.

4. **BREATHING DEPTH:** Order book depth bars grow/shrink smoothly with gradient fills from right edge (mint bids, rose asks, ~18% alpha). User's orders get marker dot. Click price → prefills form. Spread row = glass pill.

5. **HOURGLASS AUCTION:** Huge odometer-style price with soft violet glow, countdown pill to next step, decay curve with pulsing glowing "now" dot and start/floor/ceiling reference lines.

6. **EIGHT RINGS:** Reconciliation R1-R8 as thin glowing rings lighting up sequentially (mint pass, crimson fail), each labeled with check name.

7. **SIMULATED HAZE:** Seeded candles get ice-blue hatch overlay, "Simulated history" legend, "Live from here" divider (thin glass vertical label).

8. **LANDING SCROLL STORY:** Reserve → Match → Settle as sticky glass cards revealing on scroll, beside live ticker strip.

9. **SHARED-ELEMENT TRANSITION:** Marketplace card expands into Terminal header (via `layoutId`).

10. **LINE-ART EMPTY STATES:** Original illustrations for: "No sellers", "No buyers", "No holdings yet", "No active auctions", "No trades for 3m".

---

## 8. CHARTS & GRAPHS (All Required, Each Needs Loading/Empty/Stale States)

| Page | Charts |
|------|--------|
| **Terminal** | Candlesticks + volume (5s/1m toggle, transparent BG, faint grid, no scale borders, dashed crosshair with glass label pills, up `#2EE6A6`/down `#FF5C7A`, slim wicks; volume as slim rounded bars at 35% alpha; WARD line; SIM haze) |
| | Depth chart (mint bids, rose asks, soft glow, mid-price hairline) |
| | Spread-over-time line |
| | Ceiling gauge (face value / ceiling / last price on two-tone bar) |
| | Trade tape strip of dots sized by qty, colored by aggressor (SIM = ice-blue) |
| | Order fill progress bars |
| **Marketplace** | Highlights GlassCard with DotMatrixChart (volume by time bucket from mock data, headline total + delta pills) |
| | Per-asset sparkline (AreaGlowChart) + ceiling gauge on every asset card |
| **Portfolio** | VaultBar (large) |
| | Thick-ring donut with rounded segment caps, soft glow, centered big number (holdings by value) |
| | Portfolio value over time (AreaGlowChart) |
| **Auctions** | Decay curve with now marker |
| | Create-auction form with live decay preview |
| **Demo Console** | Settlement-lag histogram (DotMatrixChart with p50/p99 markers) |
| | Offered vs accepted vs matched vs executed vs settled per second (multi-line) |
| | Engine seq vs consumer offset (two lines; gap = lag) |
| | Eight reconciliation rings |
| | Advisory ML risk-score panel (ranked table, score distribution as dot-matrix, per-account feature bars; labeled "Advisory only. Trained on simulated data. Does not block trades or move money."; reads mock JSON) |

---

## 9. PAGE LAYOUTS (Content/Behavior per `frontend.md`)

### 1. Login / Register
- Centered glass card over ambient glow
- Segmented Login/Register tabs
- Violet CTA, inline errors, RATE_LIMITED countdown

### 2. Marketplace (ref-teal dashboard rhythm)
- Page header: breadcrumb + greeting
- **Highlights GlassCard:** IconTile, title, huge total, delta pills, DotMatrixChart
- **Top Assets section:** Glass pill dropdown filters (category, sort)
- Asset StatCards: IconTile, name/category, big last price, DeltaPill, glowing sparkline with hover dot, ceiling gauge, best bid/ask, available ask qty, SIM/auction/thin-market badges, bottom-edge glow
- States: skeleton, empty, error with request ID, stale, halted, disconnected polling

### 3. Asset Terminal (Hero page — ref-violet stat row + ref-teal chart cards)
- Header: asset name, mono sub-line, SIM badge, outlined pill actions
- **4 StatCards:** Last price + mini area chart, best bid/ask, spread, ceiling gauge
- **Bento grid:**
  - Large chart card (pill tabs 5s/1m)
  - Depth chart card
  - Order-book ladder card (top 15 levels, cumulative qty, DataTable style)
  - Recent trades list (StatusPill/SIM pill, relative time, mono IDs)
  - Order form card (Buy/Sell segmented with mint/rose glow, Limit/Market tabs, glass inputs with steppers, cost estimate, ceiling hint, balance, max chip, CTA, market confirm dialog with worst price + max reserved cost)
  - Large DataTable card with pill tabs (Open Orders / Order History / Activity), fill-progress bars, Seal icons, outlined Cancel pills, utilities row

### 4. Portfolio (ref-violet style)
- Header: title + mono sub-line
- 4 StatCards: available, reserved, total, holdings count
- Large VaultBar
- Donut
- Value-over-time chart (AreaGlowChart)
- DataTable tabs: Holdings / Open Orders / Order History / Transactions
- AddressChips, quick Sell/Auction outlined pills
- Right-side receipt Drawer (all spec fields)

### 5. Auctions
- List: glass cards (live price, floor, qty, time left, status, status filter)
- Detail: hourglass odometer, countdown pill, decay curve, qty, seller badge, total cost, balance, "Accept at current price" CTA with every outcome message
- Create-auction form with decay preview

### 6. Demo Console (Operator)
- Bento of glass panels:
  - Simulator state + start/pause
  - Mode toggle
  - Scenario buttons (outlined pills with icons: wake market, sell wall, pump, scalper attempt, auction drop)
  - Health StatCards (engine status, consumer offset vs seq, pending settlement, settlement lag, event-loop lag)
  - Lag DotMatrixChart
  - Throughput multi-line chart
  - Seq vs offset chart
  - Eight rings + Run reconciliation button + last verdict
  - Benchmark summary + artifact link
  - ML risk-score panel
  - Halt/resume asset, kill engine, reset demo (destructive = outlined red pills behind confirm dialogs, results inline with timestamps)

### 7. Landing
- Full-viewport hero: strongest glows, huge serif headline with italic accent word
- Glass ticker strip
- Three value points
- Scroll story (Reserve → Match → Settle)
- Violet CTA + outlined login pill
- Simulated-market notice

### 8. Notification Center & Profile/Security
- Only if time remains

**All pages:** Loading skeletons, line-art empty states, error, disconnected, stale, halted states — all restyled in this theme.

---

## 10. WEBSOCKET LIFECYCLE & ERROR MAP

**Lifecycle:** Connect → Authenticate → Subscribe → Sync (snapshot + REST catch-up) → Live → Reconnect (exponential backoff with jitter, heartbeat)

**Subscriptions:** Only channels for visible page (market, book, trades, candles, auction, user)

**Error Map:** Central `errorCode → message` covering every spec code, with real numbers in text, correct placement (inline, toast, banner)

---

## 11. MOTION SYSTEM

| Motion | Easing / Spring | Duration |
|--------|-----------------|----------|
| Entrances | `cubic-bezier(0.22, 1, 0.36, 1)` | 150-450ms |
| Toggles, tabs, popovers | Spring (stiffness 300, damping 30) | - |
| Page entrance | Cards fade-up (y: 14→0, blur: 6px→0) with 50-70ms stagger | - |
| Route cross-fade | Slight scale (0.99→1) | - |
| Sidebar | Sliding active indicator, smooth collapse | - |
| Tab pills | Sliding indicator | - |
| Card hover | Lift 2px + pointer spotlight | - |
| CTA shine | Sweep on hover | - |
| Press | Scale 0.97 | - |
| Magnetic pull | 4-6px on primary CTAs (optional) | - |
| Count-up | First render of big numbers only (once per mount) | - |
| Chart draw-in | Line draw-in 700ms first load | - |
| Dot-matrix | Columns rise with stagger | - |
| Ring sequence | Sequential light-up | - |
| Live dot | Pulsing | - |
| Toasts | Spring | - |
| Modals | Scale + blur | - |
| Popovers | Scale from origin | - |
| Skeletons | Shimmer | - |
| Ambient glow | Slow drift | - |
| Landing scroll | Scroll-driven reveals | - |

**HARD RULE:** Live data is NEVER eased (see Hard Rules in brief).

**Performance:** Animate only `transform`, `opacity`, `filter`. Backdrop-filter ONLY on sidebar, header, modals, top-level cards (never rows/list items). Lazy-load chart libraries. Target 60fps mid-range laptop.

**Reduced Effects Mode:** No blur, static glows. Honor `prefers-reduced-motion` (disable transforms/loops, keep simple color changes).

---

## 12. RESPONSIVE & ACCESSIBILITY

| Breakpoint | Layout |
|------------|--------|
| Desktop (primary) | Full bento terminal |
| Tablet | Chart on top, book + form side by side |
| Mobile | Stacked panels with tab switcher (Chart, Book, Trades, Trade); order form as bottom sheet |

**Accessibility:**
- Full keyboard operation
- Visible 2px brand focus rings
- ARIA live toasts
- Order book announced as labeled table with throttled announcements
- AA contrast for text on glass
- Buy/sell/status never color-only (always label/icon)

---

## 13. BUILD ORDER (Verify Each Stage)

| Stage | Deliverable |
|-------|-------------|
| 1 | Scaffold/reset `/web`, fonts, tokens, background, primitives, `/dev/theme` |
| 2 | Mock server, fake WebSocket, fixtures, error map, stores, merge rules |
| 3 | App shell + auth |
| 4 | Marketplace |
| 5 | Terminal (chart, depth, ladder, form, trades, tabs, live data layer, edge states) |
| 6 | Portfolio |
| 7 | Auctions |
| 8 | Demo Console + ML panel |
| 9 | Landing |
| 10 | Motion pass, performance pass, responsive + accessibility pass |

**After each stage:** Run app, view in browser, compare against both reference images for surface depth, glow level, spacing, chart style, typography. Fix gaps. 3-line summary.

---

## 14. QUALITY BAR (Final Checklist)

- [ ] All pages and states from `frontend.md` present
- [ ] No business logic in UI
- [ ] No live-data smoothing
- [ ] SIM labels and Ward line intact
- [ ] Runs fully on mocks with `npm run dev`
- [ ] Reduced-motion works
- [ ] Lint and type-check pass
- [ ] No text, logo, or brand copied from references
- [ ] Strong visual hierarchy, deliberate spacing
- [ ] No default component-library look
- [ ] No neon overload (low-alpha glows, max one colored glow per card)
- [ ] No clutter, generous whitespace
- [ ] Premium product with clear identity

---

## 15. FOLDER STRUCTURE (Target)

```
web/
  app/
    (auth)/login/page.tsx
    (auth)/register/page.tsx
    (dashboard)/
      layout.tsx          # App shell with sidebar + header
      market/page.tsx     # Marketplace
      trade/[assetId]/page.tsx  # Asset Terminal
      portfolio/page.tsx
      auctions/page.tsx
      auctions/[id]/page.tsx
      demo/page.tsx
    dev/theme/page.tsx
    landing/page.tsx      # Public landing (outside dashboard layout)
    layout.tsx            # Root layout
    globals.css
  components/
    shell/                # AppLayout, Sidebar, TopHeader, GlobalBanners, ToastRegion, ObsidianBackground, VaultBar, Wordmark
    market/               # MarketplaceHero, AssetCard, HighlightsCard, DotMatrixChart
    trading/              # TerminalHeader, CandleChart, DepthChart, OrderBookLadder, TradeTape, OrderForm, BottomTabs, MarketConfirmDialog
    portfolio/            # WalletCards, HoldingsTable, TransactionsTable, AllocationDonut, PortfolioValueChart, ReceiptDrawer
    auctions/             # AuctionCard, AuctionDetailView, OdometerPrice, DecayCurveChart, CreateAuctionModal
    admin/                # SimControl, ScenarioButtons, HealthPanel, ReconPanel, EightRings, MetricsCharts, MLRiskScorePanel
    ui/                   # All primitives (GlassCard, IconTile, StatCard, DeltaPill, SegmentedTabs, Toggle, GlassInput, DataTable, StatusPill, AddressChip, LivePill, SimBadge, GaugeBar, AreaGlowChart, DotMatrixChart, TheWard, TheSeal, Skeleton, Modal, Drawer, PageHeader, SectionHeader, LineArtEmptyState, IconButton, PillButton, SearchField, Breadcrumb, AvatarButton)
  lib/
    api-client.ts
    ws/                   # Connection manager, channel subscriptions, router
    stores/               # Market, user, connection stores with merge rules
    format/               # Price, qty, time, percent formatters
    errors/               # Error code → message map
    config.ts
    utils.ts
    types/index.ts
  mocks/
    fake-server.ts
    fake-websocket.ts
    scenarios.ts
    fixtures/             # assets, candles, orderBook, trades, orders, wallet, auctions, reconciliation, mlScores
```

---

## 16. REVIEW AGAINST BRIEF (Self-Critique)

**Potential Generic Defaults to Avoid:**
- ❌ Warm cream background → ✅ Near-black `#05050A`
- ❌ Terracotta/warm-clay accent → ✅ Violet brand + mint buy + ember gold ward
- ❌ Near-black with single acid green → ✅ Multi-glow layered depth
- ❌ Broadsheet hairline rules → ✅ Frosted glass with subtle borders
- ❌ SaaS card kit (identical rounded cards, same shadow) → ✅ Varied card treatments, contextual glows
- ❌ ALL-CAPS eyebrows everywhere → ✅ Sparing use, only where hierarchical
- ❌ Meta strings with middle dots → ✅ Clean separators
- ❌ `WORD — fragment` spaced em dash labels → ✅ Purposeful label design
- ❌ Tinted near-black standing in for black → ✅ True `#05050A` canvas
- ❌ Monospace for small data labels → ✅ Monospace ONLY for IDs/hashes
- ❌ `→` appended to links/buttons → ✅ No forced arrows

**Boldness Budget:** Spent on **background glow layers + GlassCard spotlight + Seal animation + Hourglass auction odometer + Eight Rings sequence**. Everything else quiet and disciplined.

**Chanel Check:** Remove one accessory → The "three-dots menu on every card" is reduced to only where actions exist.

---

*End of Design Plan. Proceed to implementation.*