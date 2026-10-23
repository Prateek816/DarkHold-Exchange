import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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

  // 5. Seed Assets
  const assetsData = [
    {
      id: "DARKHOLD-PASS-2026",
      symbol: "DKH-FEST",
      name: "Darkhold Fest Weekend Pass",
      category: "FESTIVAL_PASS",
      faceValue: BigInt(25000), // $250.00
      ceilingPct: 110,
      ceilingPrice: BigInt(27500), // $275.00 cap
      lastPrice: BigInt(26850),
      lastPriceTimestamp: new Date(Date.now() - 12000),
      priceChange24hPct: 4.8,
      bestBid: BigInt(26700),
      bestAsk: BigInt(26900),
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
      faceValue: BigInt(18000), // $180.00
      ceilingPct: 115,
      ceilingPrice: BigInt(20700), // $207.00 cap
      lastPrice: BigInt(19400),
      lastPriceTimestamp: new Date(Date.now() - 45000),
      priceChange24hPct: 2.1,
      bestBid: BigInt(19200),
      bestAsk: BigInt(19500),
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
      faceValue: BigInt(12000), // $120.00
      ceilingPct: 125,
      ceilingPrice: BigInt(15000), // $150.00 cap
      lastPrice: BigInt(14200),
      lastPriceTimestamp: new Date(Date.now() - 110000),
      priceChange24hPct: -1.4,
      bestBid: BigInt(13900),
      bestAsk: BigInt(14300),
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
      faceValue: BigInt(3500), // $35.00
      ceilingPct: 150,
      ceilingPrice: BigInt(5250), // $52.50 cap
      lastPrice: BigInt(4800),
      lastPriceTimestamp: new Date(Date.now() - 240000),
      priceChange24hPct: 8.5,
      bestBid: BigInt(4500),
      bestAsk: BigInt(4900),
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
