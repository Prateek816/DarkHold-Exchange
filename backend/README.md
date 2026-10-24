# Darkhold Exchange — Backend & Persistent Database Layer

Production-oriented backend and PostgreSQL database service for **Darkhold Exchange**, a regulated ticket and asset resale exchange featuring statutory price ceiling caps, double-entry audit ledgers, deterministic order matching, and anti-scalping Dutch auctions.

---

## 1. Architecture Overview

```
backend/
├── src/
│   ├── app.ts                 # Express application initialization & middleware stack
│   ├── server.ts              # HTTP server entrypoint with graceful shutdown
│   ├── config/
│   │   ├── env.ts             # Strict environment validation using Zod
│   │   └── db.ts              # Prisma client singleton with BigInt JSON serialization
│   ├── middleware/
│   │   ├── auth.ts            # Bearer token and secure cookie session authentication
│   │   ├── rateLimiter.ts     # IP and route-level rate limiting with Retry-After headers
│   │   ├── errorHandler.ts    # Centralized error mapping to ApiErrorPayload
│   │   └── validate.ts        # Request body, query, and params Zod validators
│   ├── modules/
│   │   ├── auth/              # Registration, login, session tokens, logout
│   │   ├── users/             # User profile endpoints (/api/users/me)
│   │   ├── assets/            # Regulated assets, price ceilings, book snapshots
│   │   ├── wallets/           # Authoritative balances and inventory holdings
│   │   ├── orders/            # Order placement, price-time matching, cancellation
│   │   ├── trades/            # Historical execution ticks and counterparty receipts
│   │   ├── auctions/          # Dutch auction lifecycle, dynamic decay, single-winner races
│   │   ├── portfolio/         # Consolidated trader positions and net valuations
│   │   ├── ledger/            # Immutable double-entry financial audit entries
│   │   └── admin/             # Invariant reconciliation rings and risk scores
│   ├── services/
│   │   ├── matchingEngine.ts  # Deterministic matching engine simulation with price ceiling enforcement
│   │   └── auctionEngine.ts   # Concurrency-safe Dutch auction decay & atomic settlement
│   └── utils/
│       ├── errors.ts          # Strongly typed domain error classes matching frontend contracts
│       └── serialization.ts   # Minor unit formatting and Prisma-to-API DTO mappers
├── prisma/
│   ├── schema.prisma          # Complete relational PostgreSQL schema
│   ├── migrations/            # Version-controlled SQL migrations
│   └── seed.ts                # Explicit database seeder for demo accounts, assets & orders
├── tests/                     # Vitest automated test suite (Auth, Accounting, Matching, Auctions, API)
├── .env.example               # Environment template
└── package.json
```

---

## 2. Financial Precision & Accounting Model

- **Exact Decimal Representation**: Monetary amounts are stored as exact integer minor units (cents, e.g. `26500` = `$265.00`, starting balance `500000` = `$5,000.00`).
- **No Floating-Point Arithmetic**: The database layer uses `BigInt` columns for all balances, prices, and quantities. Express automatically serializes BigInt to JSON numeric values for frontend compatibility without precision loss.
- **Balance Conservation**:
  $$\text{Total Balance} = \text{Available Balance} + \text{Reserved Balance}$$
- **Order Placement Reservations**:
  - `BUY Limit Order`: Atomically reserves `price * qty` from available balance.
  - `BUY Market Order`: Atomically reserves `asset.ceilingPrice * qty` from available balance.
  - `SELL Order`: Atomically reserves `qty` units from user's `WalletHolding.availableUnits`.
- **Settlement & Price Improvement**:
  - If a BUY order matches below the reserved price (e.g. market order or limit price improvement), the unused reserved difference is **immediately refunded** to `availableBalance`.
- **Double-Entry Ledger Invariant**:
  - Every balance-changing operation (reserve, release, trade fill, auction payment) generates an immutable `LedgerEntry` recording `amount`, `balanceBefore`, and `balanceAfter`.

---

## 3. Statutory Price Ceiling & Ward Caps

Under exchange rules, no ticket or asset may be offered or executed above its statutory resale ceiling (e.g., 110% of face value for `DKH-FEST`):
$$\text{Ceiling Price} = \lfloor \text{Face Value} \times \frac{\text{Ceiling Pct}}{100} \rfloor$$

If a trader or bot attempts to place an order or create an auction exceeding `ceilingPrice`, the request is immediately rejected with HTTP 400 and code `PRICE_ABOVE_CEILING`.

---

## 4. Dutch Auction Single-Winner Guarantee

Dutch auctions decay from `startPrice` down to `floorPrice` every `stepSeconds`:
$$\text{Current Price} = \max\left(\text{Floor Price}, \text{Start Price} - \left(\lfloor \frac{\text{Elapsed Seconds}}{\text{Step Seconds}} \rfloor \times \text{Price Decrement}\right)\right)$$

To guarantee **single-winner atomicity** across concurrent purchase attempts:
```sql
UPDATE auctions
SET status = 'SOLD', "winnerId" = $buyerId, "currentPrice" = $currentPrice
WHERE id = $auctionId AND status = 'ACTIVE';
```
If two buyers accept simultaneously, exactly one transaction succeeds (updating 1 row), and all other concurrent buyers receive HTTP 409 `AUCTION_ALREADY_SOLD`.

---

## 5. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Port for the Express HTTP server |
| `NODE_ENV` | `development` | Runtime environment (`development`, `production`, `test`) |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS origin for Next.js frontend |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/darkhold_exchange?schema=public` | PostgreSQL connection string |
| `SESSION_SECRET` | `darkhold-exchange-secure-session-key-dev-only` | Session signing key |
| `SESSION_EXPIRY_HOURS` | `24` | Session lifetime in hours |
| `COOKIE_SECURE` | `false` | Set to `true` in HTTPS production |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Window in ms for rate limiting (1 minute) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Maximum requests per IP per window |
| `AUTH_RATE_LIMIT_MAX_ATTEMPTS` | `5` | Maximum failed auth attempts before lock |

---

## 6. Database Setup, Migration & Seeding

### Prerequisites
- Node.js >= 18
- PostgreSQL 14+ running locally or a managed cloud database URL.

### 1. Generate Prisma Client
```bash
npm run prisma:generate
```

### 2. Apply Database Migrations
```bash
# In local development:
npm run prisma:migrate

# In production / CI:
npm run prisma:deploy
```

### 3. Seed Demo Data
Populates the exchange with verified assets, demo user `trader@darkhold.io` (password: `darkhold2026!`), initial wallet balances, resting orders, and Dutch auctions:
```bash
npm run prisma:seed
```

### 4. Local Development Reset (Use with caution)
Resets the database schema and reseeds initial demo data:
```bash
npm run prisma:reset
```

---

## 7. Running the Application

### Development Mode (with hot-reload)
```bash
npm run dev
```
The server will start on `http://localhost:4000`.

### Production Build & Execution
```bash
npm run build
npm start
```

### Root-Level Orchestration
From the root repository directory:
```bash
# Start both backend and frontend concurrently
npm run dev

# Run only backend
npm run dev:backend

# Run only frontend
npm run dev:frontend
```

---

## 8. REST API Specification

### Authentication & Users
- `POST /api/auth/register` — Create account with password validation (`VALIDATION_FAILED` on duplicate).
- `POST /api/auth/login` — Authenticate and receive HTTP-only cookie and bearer token.
- `POST /api/auth/logout` — Revoke active session.
- `GET /api/auth/me` / `GET /api/auth/session` — Fetch active session user info.
- `GET /api/users/me` — Fetch detailed trader profile.

### Regulated Assets & Market Data
- `GET /api/assets` — List all tradable assets with 24h stats and sparkline history.
- `GET /api/assets/:id` — Get single asset metadata and statutory ceiling cap.
- `GET /api/book/:assetId` — Real-time price-time aggregated order book snapshot.
- `GET /api/candles/:assetId?interval=1m` — OHLCV candlestick data.
- `GET /api/trades/:assetId` — Recent public execution ticks.

### Wallet & Ledger
- `GET /api/wallet` — Authoritative available, reserved, and total credits + asset holdings.
- `GET /api/wallet/transactions` / `GET /api/receipts` — Historical trade settlement receipts and ledger logs.

### Trading & Orders
- `POST /api/orders` — Submit Limit or Market order with idempotency key and balance reservation.
- `GET /api/orders` — List current trader's open, partially filled, and filled orders.
- `GET /api/orders/:id` — Get order status and fill details.
- `POST /api/orders/:id/cancel` — Cancel open order and release remaining reservation.

### Dutch Auctions
- `GET /api/auctions` — List active and historical Dutch auctions.
- `GET /api/auctions/:id` — Get auction details with live decayed price.
- `POST /api/auctions` — Create Dutch auction with asset holding reservation.
- `POST /api/auctions/:id/buy` / `POST /api/auctions/:id/accept` — Concurrently-safe purchase.
- `POST /api/auctions/:id/cancel` — Cancel seller's active auction and release inventory.

### Portfolio & Reconciliation
- `GET /api/portfolio` — Net portfolio valuation, cash balance, and open positions.
- `GET /api/admin/reconciliation` — Exchange reconciliation rings (R1 to R8 invariant checks).
- `GET /api/admin/ml-scores` — Anti-scalping behavioral risk scores.
- `GET /health` — Service health and uptime monitor.

---

## 9. Automated Testing

Run the Vitest test suite covering auth, accounting, matching, auctions, and API contracts:
```bash
npm test
```
The test suite validates:
1. `accounting.test.ts` — Zero floating-point drift, conservation invariants, reservation releases, price improvement refunds.
2. `auth.test.ts` — Bcrypt password hashing, schema validation, duplicate email detection, session expiry, and RBAC.
3. `matchingEngine.test.ts` — Price-time priority, book sorting, ceiling ward enforcement, self-trade prevention.
4. `auctions.test.ts` — Deterministic price decay, ceiling checks, max price slippage protection, and concurrent single-winner race guarantees.
5. `api.test.ts` — REST endpoint responses, HTTP status codes, and error payload structures.
