# Design Direction: Workplace Architecture & Wireframes

This document details the visual rules, tokens, and structural wireframes for the redesign of the Darkhold Exchange workplace, translating the Stakent visual language (`ref-app.png`) into the festival pass and limited merch marketplace.

---

## 1. Design Tokens & Visual Hierarchy

### Surfaces
- `--bg-0`: `#050508` (Sidebar, top bar base, outer container).
- `--bg-1`: `#0A0A10` (Main workspace canvas).
- `--card`: `linear-gradient(165deg, #12121A 0%, #0B0B11 100%)`.
- `--card-solid`: `#0D0D14`.
- `--card-hover`: `#14141D` (Hover border lifts to `--line`).
- `--raised`: `#171722` (Buttons, inputs, chips, active nav items).
- `--inset`: `#07070B` (Recessed tracks, nested pods).

### Lines & Borders
- `--line-soft`: `rgba(255, 255, 255, 0.06)` (card borders, hairlines).
- `--line`: `rgba(255, 255, 255, 0.10)` (inputs, interactive outlines).
- Inner top highlight: `inset 0 1px 0 rgba(255, 255, 255, 0.03)` on all cards.

### Brand & Semantic Colors
- Primary Lavender: `--lav: #B9A7FF`, `--lav-line: #A78BFA`, `--lav-tint: rgba(167, 139, 250, 0.16)`.
- Text on Lavender: `--lav-dark: #17122E`.
- Positive / Buy: `--buy: #3DDC6E`, `--buy-tint: rgba(61, 220, 110, 0.12)`.
- Negative / Sell: `--sell: #FF5A5F`, `--sell-tint: rgba(255, 90, 95, 0.12)`.
- Anti-Scalp Ceiling: `--cap: #FFB547` (Resale cap line & badge only).
- Simulated Data: `--sim: #5EDCF5` (diagonal hatch pattern & SIM badge).

### Radii & Spacing Grid
- Cards: `18px`
- Nested Panels: `14px`
- Buttons & Inputs: `10px`
- Chips & Filter Pills: `8px`
- Tags: `6px`
- Segmented Toggles: `12px`
- Round Icon Buttons: `9999px` (Circle 32px)
- Base Grid: 8px grid (gaps: 16px, page padding: 24px/32px, card padding: 20px).

---

## 2. ASCII Wireframe: Dashboard (`/market`)

```
+-------------------------------------------------------------------------------------------------------------------+
| Top Bar (64px)                                                                                                    |
| [@judge_buyer DEMO] [New Order +]    [Available: $1,500 | Reserved: $278]  [2 Bell] [Search Ctrl+K] [Settings] [●Live] |
+-----------+-------------------------------------------------------------------------------------------------------+
| SIDEBAR   | MAIN CANVAS (1440px viewport)                                                                         |
| (248px)   |                                                                                                       |
|           | [Most traded in last 24h (3 assets)]                                   [24H v] [All v] [Desc v]        |
| [D]       | Top assets                                                                                            |
| Darkhold  | +-----------------------------------------------------------------+ +-------------------------------+ |
| Exchange  | | ASSET CARD 1 (DFEST-WKD)  | ASSET CARD 2 (MOON-GA)  | ASSET 3   | | AUCTION PROMO CARD (30%)      | |
| [Pass|Mrch| | [T] FESTIVAL    [↗]       | [T] FESTIVAL    [↗]     | [T] MERCH | | [D] Dutch auction live now    | |
|           | | Darkhold Fest Weekend Pass| Moonrise GA Pass        | Hoodie    | | Moonrise GA Batch #4          | |
| NAV LIST  | | Last price                | Last price              |           | | Current price: $88.00         | |
| [Dashboard| | $348.000       [+4.2%]    | $88.140        [-1.5%]  | $76.000   | | (Purple radial glow & stars)  | |
|  Auctions | | ~~~~~~/\~~~~~~ (Lavender) | ~~~~~\/~~~~~~~ (Red)    | ~~~~~~~~  | |                               | |
|  Portfolio| | [+$14.20] (Floating tag)  | [-$1.35]                |           | | [ Accept at current price   ] | |
|  Terminal | | Bid $347 | Ask $349 (24q) | Bid $87.5 | Ask $88.5   |           | | [ View all auctions         ] | |
|  Console  | +-----------------------------------------------------------------+ +-------------------------------+ |
|  Profile  |                                                                                                       |
|           | YOUR ORDERS AND POSITIONS                                                         [Chart] [+] [⟳] [Filter] |
| OPEN ORDRS| +---------------------------------------------------------------------------------------------------+ |
| [2] v     | | (Clock) Last trade 12s ago                                          HISTORY WINDOW                | |
| [T] Buy   | | [T] Darkhold Fest Weekend Pass [Link] [Share] [Open terminal ↗]     [6h chip]                     | |
| 2 @ 9,800 | |                                                                     | | | | | | | | | | | (Ticks) | |
| [T] Sell  | | Last price, credits                                                 ----( [||] )----------------- | |
|           | | $348.000 (dim tail)        [ Buy (Lavender) ]  [ Sell (Raised) ]                                  | |
|           | |---------------------------------------------------------------------------------------------------| |
|           | | > Market: Spread $2.00 (0.57%) | Best Bid $347.00 | Best Ask $349.00                                  | |
| [Simulated| | > Order book: (Mini depth chart)                                                                  | |
|  market   | | > Settlement: Pending 0 | Average lag 42ms                                                        | |
|  notice]  | | > Ceiling: Face value $350.00 | Cap $420.00 (120%) | Headroom $72.00                               | |
|           | +---------------------------------------------------------------------------------------------------+ |
|           |                                                                                                       |
|           | STAT CARDS (4 Columns)                                                                                |
|           | +---------------------+ +---------------------+ +---------------------+ +---------------------------+ |
|           | | Volume (24H)  [24H] | | Price (24H)   [24H] | | Spread        [24H] | | Valuation Ratios    [24H] | |
|           | | 1,420 units         | | $348.000    [+4.2%] | | $2.00 (0.57%)       | | vs Face: [======--]  99%  | |
|           | |                     | |                     | |                     | | vs Cap:  [========]  82%  | |
|           | +---------------------+ +---------------------+ +---------------------+ +---------------------------+ |
+-----------+-------------------------------------------------------------------------------------------------------+
```

---

## 3. ASCII Wireframe: Trading Terminal (`/trade/[assetId]`)

```
+-------------------------------------------------------------------------------------------------------------------+
| Top Bar (same shell)                                                                                              |
+-----------+-------------------------------------------------------------------------------------------------------+
| SIDEBAR   | HEADER STRIP: [T] Darkhold Fest Weekend Pass [SIM] | Face: $350 | Cap: $420 (i) | Last: $348 [Flash]      |
|           | +-----------------------------------------------------------+ +-------------------------------------+ |
|           | | MAIN CHART (TradingView Lightweight Charts) [5s] [1m]     | | ORDER FORM CARD                     | |
|           | | ------------------- Cap $420.00 (Amber Dashed) ---------- | | [ Buy (Green) ]   [ Sell (Red) ]    | |
|           | |        /\_                                                | | [ Limit ]  [ Market ]               | |
|           | |    _/\    \                                               | | Price:   [ $348.00            ]     | |
|           | |   /   \    \                                              | | (Ticked slider stopping at cap)     | |
|           | |  /     \                                                  | | Qty:     [ 1                  ] Max | |
|           | | [Live from here]                                          | | Est Total: $348.00                  | |
|           | | Volume bars | | | | | |                                   | | [ Buy 1 DFEST-WKD (Lavender)      ] | |
|           | +-----------------------------------------------------------+ +-------------------------------------+ |
|           | | DEPTH CHART CARD              | ORDER BOOK LADDER CARD    | | RECENT TRADES CARD                  | |
|           | | Stepped green bids / red asks | Asks (Red): 15 levels     | | 19:42:01  $348.00  1q  [SIM]        | |
|           | | Mid-price hairline            | Spread: $2.00             | | 19:41:58  $347.50  2q  [SIM]        | |
|           | |                               | Bids (Green): 15 levels   | | 19:41:52  $348.00  1q  [USER]       | |
|           | +-----------------------------------------------------------+ +-------------------------------------+ |
|           |                                                                                                       |
|           | TABBED ORDERS & LIFECYCLE TABLE                                                                       |
|           | [ Open Orders (1) ]  [ Order History (8) ]  [ Settlement Activity (Double-Entry Ledger) ]                |
|           | ----------------------------------------------------------------------------------------------------- |
|           | Asset     Side   Type   Price    Qty  Filled  Status               Action                             |
|           | DFEST-WKD BUY    LIMIT  $348.00  2    0/2     [Matched, Settling]  [Cancel]                           |
+-----------+-------------------------------------------------------------------------------------------------------+
```

---

## 4. Key Interactive Primitives to Build

1. `DimTail` & `UnitSuffix`: String formatting rendering trailing 3 digits at 45% opacity without altering layout or numeric semantics.
2. `TickedSlider`: Fine waveform ticks across `--inset` recessed track, lavender ring handle, tooltip badge.
3. `AccordionRow`: Expandable rows with chevron indicators, hairline dividers, holding mini depth chart & metrics.
4. `PromoAuctionCard`: Purple radial glow, star speckles, shooting star hairline, live decay countdown, instant accept action.
5. `AssetCardSpline`: Monotone SVG spline with ghost curve, ring marker, and floating delta tag.
