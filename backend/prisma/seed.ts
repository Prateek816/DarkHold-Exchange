import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { ENGINE_TO_DB_MAP } from "../src/utils/assetMapping";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Darkhold Exchange database...");

  // 1. Clean existing demo data if any
  await prisma.ledgerEntry.deleteMany({});
  await prisma.trade.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.auction.deleteMany({});
  await prisma.walletHolding.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.candleRecord.deleteMany({});

  // 2. Hash default passwords
  const passwordHash = await bcrypt.hash("darkhold2026!", 10);

  // 3. Create Users
  const trader = await prisma.user.create({
    data: {
      id: "trader_01",
      email: "trader@darkhold.io",
      name: "trader_01",
      passwordHash,
      role: "TRADER",
      status: "ACTIVE",
    },
  });

  const admin = await prisma.user.create({
    data: {
      id: "admin_01",
      email: "admin@darkhold.io",
      name: "admin_01",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const curatorBot = await prisma.user.create({
    data: {
      id: "sim_curator_bot",
      email: "curator@darkhold.io",
      name: "Curator Bot",
      passwordHash,
      role: "OPERATOR",
      status: "ACTIVE",
    },
  });

  // 4. Create Active Session for trader_01
  await prisma.session.create({
    data: {
      id: "sess_trader_01",
      userId: trader.id,
      token: "dkh_sess_trader_01_live",
      expiresAt: new Date(Date.now() + 86400000 * 30),
    },
  });

  // 5. Seed Assets aligned with canonical ops/seed/assets.json and matching engine
  const assetsData = [
    {
      id: "DARKHOLD-PASS-2026",
      symbol: "DKH-FEST",
      name: "Darkhold Fest Weekend Pass",
      category: "FESTIVAL_PASS",
      faceValue: BigInt(10000), // $100.00
      ceilingPct: 120,
      ceilingPrice: BigInt(12000), // $120.00 cap
      lastPrice: BigInt(10460), // $104.60
      lastPriceTimestamp: new Date(Date.now() - 12000),
      priceChange24hPct: 4.6,
      bestBid: BigInt(10400),
      bestAsk: BigInt(10480),
      availableAskQty: 48,
      volume24h: 382,
      isHalted: false,
      isThin: false,
      simActive: true,
      hasActiveAuction: true,
    },
    {
      id: "MOONRISE-GA-2026",
      symbol: "MNR-GA",
      name: "Moonrise GA Pass",
      category: "FESTIVAL_PASS",
      faceValue: BigInt(8000), // $80.00
      ceilingPct: 120,
      ceilingPrice: BigInt(9600), // $96.00 cap
      lastPrice: BigInt(8490), // $84.90
      lastPriceTimestamp: new Date(Date.now() - 45000),
      priceChange24hPct: 2.1,
      bestBid: BigInt(8450),
      bestAsk: BigInt(8520),
      availableAskQty: 24,
      volume24h: 154,
      isHalted: false,
      isThin: false,
      simActive: true,
      hasActiveAuction: true,
    },
    {
      id: "DARKHOLD-HOODIE-LTD",
      symbol: "DKH-HOOD",
      name: "Darkhold Hoodie Limited",
      category: "LIMITED_MERCH",
      faceValue: BigInt(3000), // $30.00
      ceilingPct: 120,
      ceilingPrice: BigInt(3600), // $36.00 cap
      lastPrice: BigInt(3135), // $31.35
      lastPriceTimestamp: new Date(Date.now() - 110000),
      priceChange24hPct: -1.4,
      bestBid: BigInt(3100),
      bestAsk: BigInt(3150),
      availableAskQty: 12,
      volume24h: 89,
      isHalted: false,
      isThin: false,
      simActive: true,
      hasActiveAuction: false,
    },
    {
      id: "SIGIL-COLLECTOR-PIN",
      symbol: "SGL-PIN",
      name: "Sigil Collector Pin",
      category: "LIMITED_MERCH",
      faceValue: BigInt(500), // $5.00
      ceilingPct: 120,
      ceilingPrice: BigInt(600), // $6.00 cap
      lastPrice: BigInt(511), // $5.11
      lastPriceTimestamp: new Date(Date.now() - 240000),
      priceChange24hPct: 2.2,
      bestBid: BigInt(505),
      bestAsk: BigInt(515),
      availableAskQty: 5,
      volume24h: 18,
      isHalted: false,
      isThin: true,
      simActive: true,
      hasActiveAuction: true,
    },
  ];

  for (const a of assetsData) {
    await prisma.asset.create({ data: a });
  }

  // 6. Seed Trader Wallet & Holdings
  const traderWallet = await prisma.wallet.create({
    data: {
      userId: trader.id,
      availableBalance: BigInt(447000), // $4,470.00 available
      reservedBalance: BigInt(53000), // $530.00 reserved in ORD-001
      totalBalance: BigInt(500000), // $5,000.00 total
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      walletId: traderWallet.id,
      referenceId: "INIT-WALLET",
      entryType: "INITIAL_CREDIT",
      amount: BigInt(500000),
      balanceBefore: BigInt(0),
      balanceAfter: BigInt(500000),
      description: "Initial demo wallet seed",
    },
  });

  await prisma.walletHolding.createMany({
    data: [
      {
        walletId: traderWallet.id,
        assetId: "DARKHOLD-PASS-2026",
        availableUnits: 3,
        reservedUnits: 0,
        totalUnits: 3,
        avgCost: BigInt(25500),
      },
      {
        walletId: traderWallet.id,
        assetId: "MOONRISE-GA-2026",
        availableUnits: 1,
        reservedUnits: 1,
        totalUnits: 2,
        avgCost: BigInt(18000),
      },
      {
        walletId: traderWallet.id,
        assetId: "DARKHOLD-HOODIE-LTD",
        availableUnits: 1,
        reservedUnits: 0,
        totalUnits: 1,
        avgCost: BigInt(13000),
      },
    ],
  });

  // 7. Seed Orders
  await prisma.order.createMany({
    data: [
      {
        id: "ORD-001",
        userId: trader.id,
        assetId: "DARKHOLD-PASS-2026",
        side: "BUY",
        type: "LIMIT",
        price: BigInt(26500),
        originalQuantity: 2,
        matchedQuantity: 0,
        remainingQuantity: 2,
        reservedAmount: BigInt(53000),
        status: "OPEN",
        settlementStatus: "PENDING",
        idempotencyKey: "IDEMP-001",
      },
      {
        id: "ORD-002",
        userId: trader.id,
        assetId: "DARKHOLD-PASS-2026",
        side: "BUY",
        type: "LIMIT",
        price: BigInt(26800),
        originalQuantity: 4,
        matchedQuantity: 2,
        remainingQuantity: 2,
        reservedAmount: BigInt(107200),
        status: "PARTIALLY_FILLED",
        settlementStatus: "PENDING",
        idempotencyKey: "IDEMP-002",
      },
    ],
  });

  // 8. Seed Dutch Auctions
  const now = Date.now();
  await prisma.auction.createMany({
    data: [
      {
        id: "AUC-101",
        assetId: "DARKHOLD-PASS-2026",
        sellerId: curatorBot.id,
        quantity: 1,
        remainingQuantity: 1,
        startPrice: BigInt(27500),
        floorPrice: BigInt(24000),
        ceilingPrice: BigInt(27500),
        currentPrice: BigInt(25800),
        stepSeconds: 15,
        priceDecrement: BigInt(50),
        startTime: new Date(now - 1800000),
        endTime: new Date(now + 1800000),
        status: "ACTIVE",
        isSimSeller: true,
      },
      {
        id: "AUC-102",
        assetId: "SIGIL-COLLECTOR-PIN",
        sellerId: curatorBot.id,
        quantity: 2,
        remainingQuantity: 2,
        startPrice: BigInt(5200),
        floorPrice: BigInt(3500),
        ceilingPrice: BigInt(5250),
        currentPrice: BigInt(4100),
        stepSeconds: 30,
        priceDecrement: BigInt(25),
        startTime: new Date(now - 3600000),
        endTime: new Date(now + 7200000),
        status: "ACTIVE",
        isSimSeller: true,
      },
      {
        id: "AUC-103",
        assetId: "MOONRISE-GA-2026",
        sellerId: curatorBot.id,
        quantity: 1,
        remainingQuantity: 0,
        startPrice: BigInt(20500),
        floorPrice: BigInt(18000),
        ceilingPrice: BigInt(20700),
        currentPrice: BigInt(18900),
        stepSeconds: 15,
        priceDecrement: BigInt(50),
        startTime: new Date(now - 7200000),
        endTime: new Date(now - 1200000),
        status: "SOLD",
        winnerId: trader.id,
        isSimSeller: true,
      },
    ],
  });

  // 9. Seed Simulated Bot Accounts from ops/seed/accounts.json
  const accountsPaths = [
    path.resolve(__dirname, "../../ops/seed/accounts.json"),
    path.resolve(process.cwd(), "../ops/seed/accounts.json"),
    path.resolve(process.cwd(), "ops/seed/accounts.json"),
    "/app/ops/seed/accounts.json",
  ];
  const accountsFile = accountsPaths.find((p) => fs.existsSync(p));
  if (accountsFile) {
    console.log(`Seeding bot accounts from ${accountsFile}...`);
    const accountsData = JSON.parse(fs.readFileSync(accountsFile, "utf-8"));
    const simPasswordHash = await bcrypt.hash(accountsData.password || "darkhold-sim-dev", 10);

    for (const a of accountsData.accounts) {
      const email = a.email.toLowerCase();
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            id: a.key,
            email,
            name: a.key,
            passwordHash: simPasswordHash,
            role: a.role === "admin" ? "ADMIN" : "TRADER",
            status: "ACTIVE",
          },
        });
      }

      // Wallet
      let wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
      const starterCredits = BigInt(a.starter_credits || 0);
      if (!wallet) {
        wallet = await prisma.wallet.create({
          data: {
            userId: user.id,
            availableBalance: starterCredits,
            reservedBalance: BigInt(0),
            totalBalance: starterCredits,
          },
        });

        if (starterCredits > BigInt(0)) {
          await prisma.ledgerEntry.create({
            data: {
              walletId: wallet.id,
              referenceId: `INIT-${a.key}`,
              entryType: "INITIAL_CREDIT",
              amount: starterCredits,
              balanceBefore: BigInt(0),
              balanceAfter: starterCredits,
              description: `Initial bot balance for ${a.key}`,
            },
          });
        }
      }

      // Initial Units
      if (a.initial_units) {
        for (const [engineSym, units] of Object.entries(a.initial_units)) {
          const qty = Number(units);
          if (qty <= 0) continue;
          const mapped = ENGINE_TO_DB_MAP[engineSym];
          const assetId = mapped ? mapped.id : engineSym;

          const existingHolding = await prisma.walletHolding.findFirst({
            where: { walletId: wallet.id, assetId },
          });

          if (!existingHolding) {
            await prisma.walletHolding.create({
              data: {
                walletId: wallet.id,
                assetId,
                availableUnits: qty,
                reservedUnits: 0,
                totalUnits: qty,
                avgCost: BigInt(10000),
              },
            });
          }
        }
      }
    }
    console.log(`Seeded ${accountsData.accounts.length} bot accounts!`);
  }

  // 7. Seed Historical Candles from candles.seeded.json
  const candlesPath = [
    "/app/ops/seed/candles.seeded.json",
    path.join(__dirname, "../../ops/seed/candles.seeded.json"),
    path.join(process.cwd(), "ops/seed/candles.seeded.json"),
    path.join(__dirname, "../../../ops/seed/candles.seeded.json"),
  ].find((p) => fs.existsSync(p));

  if (candlesPath) {
    console.log(`Seeding historical candles from ${candlesPath}...`);
    const candlesContent = fs.readFileSync(candlesPath, "utf-8");
    const candlesData = JSON.parse(candlesContent);
    const fixtureEnd = Number(candlesData.end_ts) || 0;
    const now = Date.now();
    const shiftMs = fixtureEnd > 0 && now > fixtureEnd ? Math.floor((now - fixtureEnd) / 60000) * 60000 : 0;
    const recordsToInsert: any[] = [];

    for (const [engineSym, assetData] of Object.entries<any>(candlesData.assets || {})) {
      const mapped = ENGINE_TO_DB_MAP[engineSym];
      const dbAssetId = mapped ? mapped.id : engineSym;
      const targetIds = Array.from(new Set([dbAssetId, engineSym]));

      for (const targetId of targetIds) {
        for (const interval of ["1m", "5s"]) {
          const list = assetData.candles?.[interval] || [];
          for (const c of list) {
            recordsToInsert.push({
              assetId: targetId,
              interval: c.interval,
              openTime: BigInt(c.openTime) + BigInt(shiftMs),
              open: BigInt(c.open),
              high: BigInt(c.high),
              low: BigInt(c.low),
              close: BigInt(c.close),
              volume: BigInt(c.volume),
              tradeCount: Number(c.tradeCount || 1),
              origin: "SEEDED_SIM",
            });
          }
        }
      }
    }

    if (recordsToInsert.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
        const chunk = recordsToInsert.slice(i, i + chunkSize);
        await prisma.candleRecord.createMany({
          data: chunk,
          skipDuplicates: true,
        });
      }
      console.log(`Seeded ${recordsToInsert.length} historical candle records!`);
    }
  }

  console.log("Database seeded successfully!");
}


main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
