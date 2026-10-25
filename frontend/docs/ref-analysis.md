# Visual Reference Analysis: Workplace Redesign

Reference file: `docs/refs/ref-app.png` (Stakent Dark UI Dashboard)  
Normalized target viewport: **1440px × 900px** (App fills full viewport without browser mockup borders).

---

## 1. Spatial Layout & Proportions (at 1440px)

| Region | Width / Dimensions | Height / Scope | Notes & Proportions |
| :--- | :--- | :--- | :--- |
| **Sidebar (`app-sidebar`)** | **248px** (fixed) | 100vh (full height) | Surface `--bg-0` (`#050508`), 1px right border `--line-soft` (`rgba(255,255,255,0.06)`). |
| **Top Bar (`app-topbar`)** | 100% - 248px (**1192px**) | **64px** (fixed) | Surface `--bg-1` (`#0A0A10`), 1px bottom border `--line-soft`. Sticky header. |
| **Main Content Canvas** | **1192px** | Calc(100vh - 64px) scrollable | Padding: **24px** (horizontal: 32px on wide displays ≥1440px, 24px vertical). |
| **Grid Gap System** | Standard gap **16px** | 8px base spacing grid | All card margins, row spacings, and flex arrangements conform to 8px/16px/24px steps. |

---

## 2. Grid Architecture & Section Ratios

### Top Section (Height: ~300px)
- **Top Row Header**: Single line: left subtitle with clock icon (`12px` muted) + chip ("3 assets"), large bold heading (`24px/500` white "Top assets"), right filter pills (Time range `24H` ▾, Category `All` ▾, Sort `Desc` ▾).
- **Asset Cards Grid (Left 68%)**: 3 equal columns (`~258px` each at 1440px, gap `16px`).
  - Card Dimensions: Width ~258px, Height ~240px.
  - Border radius: **18px**.
  - Surface: `--card` (`linear-gradient(165deg, #12121A 0%, #0B0B11 100%)`).
  - Border: 1px `--line-soft`, inner top highlight `inset 0 1px 0 rgba(255,255,255,0.03)`.
  - Content: 36px asset tile, category tag, asset title, round icon button (↗), last price with DimTail and UnitSuffix, delta pill, custom monotone SVG spline with ghost line and floating delta badge (`+2,956`), compact bid/ask/qty strip at bottom.
- **Auction Promo Card (Right 30%)**: Single tall card (`~340px` wide, `~240px` high).
  - Surface: Deep card with purple radial glow: `radial-gradient(ellipse at 50% 110%, #7C5CFF 0%, #5B3FD8 35%, transparent 70%)` over `#0D0D14`.
  - Micro-details: Faint 1px star speckles (20–40% opacity) and a delicate diagonal shooting star hairline at the top right.
  - Buttons: Two stacked full-width buttons:
    1. Primary: Lavender fill (`#B9A7FF`), dark text (`#17122E`), 40px height, 10px radius ("Accept at current price").
    2. Secondary: `--raised` fill (`#171722`), white text, 1px `--line` border ("View all auctions").

### Lower Section (Height: ~360px)
- **Large Card ("Your orders and positions")**: Full width of content area (`1128px` at 1440px).
  - Radius: **18px**, Surface: `--card`, 1px border.
  - Top strip: Left title ("Your orders and positions") + 4 icon buttons at right (chart view, new order, refresh, filter).
  - Left Hero Block:
    - Time elapsed line ("Last trade 12s ago" with clock).
    - Selected asset title (`34px/500`) with tile, copy link button, share button, and "Open terminal" button.
    - Large hero price display: `72px/400` with DimTail (last three digits at 45% opacity).
    - Action buttons: Lavender "Buy" button (40px) and secondary "Sell" button.
  - Right History Window Panel:
    - Inset container (`--raised` `#171722`), label "History window", chip ("6h").
    - Ticked waveform slider: Fine vertical tick marks across recessed track (`--inset` `#07070B`), round handle with lavender ring and center bar icon, floating tooltip badge.
  - 4 Accordion Rows:
    - Market (spread, best bid/ask), Order Book (mini depth chart), Settlement (pending count/lag), Ceiling (face value, headroom).
    - Separated by hairlines (`rgba(255,255,255,0.06)`), expanding inline with chevron icons.
  - 4 Stat Cards Row:
    - Volume (24H), Price (24H) with delta, Spread, and dual slider comparison ("Last price vs face value" and "Last price vs ceiling").

---

## 3. Color Token Mapping (Measured Values)

```css
/* Surfaces */
--bg-0:        #050508; /* Sidebar, outer frame */
--bg-1:        #0A0A10; /* Main stage canvas */
--card:        linear-gradient(165deg, #12121A 0%, #0B0B11 100%);
--card-solid:  #0D0D14;
--card-hover:  #14141D;
--raised:      #171722; /* Buttons, inputs, chips, active tabs */
--inset:       #07070B; /* Recessed tracks, nested pods */

/* Lines & Borders */
--line-soft:   rgba(255, 255, 255, 0.06);
--line:        rgba(255, 255, 255, 0.10);
--highlight:   inset 0 1px 0 rgba(255, 255, 255, 0.03);

/* Typography */
--text:        #F4F4FA; /* High contrast body & headers */
--muted:       #8A8CA3; /* Secondary text, labels */
--dim:         #5F6178; /* Decorative, DimTail */

/* Brand & Semantics */
--lav:         #B9A7FF; /* Primary CTA fill, active focus */
--lav-dark:    #17122E; /* Text on lavender */
--lav-line:    #A78BFA; /* Chart positive lines */
--lav-tint:    rgba(167, 139, 250, 0.16);
--lav-glow:    rgba(167, 139, 250, 0.35);

--buy:         #3DDC6E; /* Positive delta, buy orders */
--buy-tint:    rgba(61, 220, 110, 0.12);
--sell:        #FF5A5F; /* Negative delta, sell orders */
--sell-tint:   rgba(255, 90, 95, 0.12);

--cap:         #FFB547; /* Anti-scalp ceiling line & cap tags */
--sim:         #5EDCF5; /* SIM bot trader labels & hatch */
```

---

## 4. Typography Scale & Weights

Font Family: **Manrope** (geometric grotesque) for all UI, labels, and numbers; **JetBrains Mono** only for IDs, hashes, and sequences.

| Role | Size / Line-height | Weight | Letter-spacing | Color |
| :--- | :--- | :--- | :--- | :--- |
| **Page Title** | 34px / 40px | 500 (Medium) | -0.02em | `--text` (`#F4F4FA`) |
| **Hero Price** | 72px / 76px | 400 (Regular) | -0.03em | `--text`, last 3 digits at 45% (`--dim`) |
| **Stat Numbers** | 36px / 42px | 400 (Regular) | -0.02em | `--text`, suffix at 60% size & muted |
| **Card Headings** | 18px / 24px | 600 (SemiBold)| -0.01em | `--text` |
| **Names / Assets**| 15px / 20px | 500 (Medium) | normal | `--text` |
| **Body UI** | 14px / 20px | 400–500 | normal | `--text` |
| **Card Labels** | 13px / 18px | 500 (Medium) | normal | `--muted` (`#8A8CA3`) |
| **Captions / Chips**| 12px / 16px | 600 (SemiBold)| 0.02em | `--muted` or semantic |
