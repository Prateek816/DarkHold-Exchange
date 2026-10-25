import http from "http";
import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/db";
import { engineClient } from "./engine/engineClient";
import { sseConsumer } from "./engine/sseConsumer";
import { settlementWorker } from "./engine/settlementWorker";
import { orderResolver } from "./engine/resolver";
import { matchingEngineService } from "./engine/service";
import { candleService } from "./market/candleService";
import { wsGateway } from "./market/wsGateway";
import { syncEngineAssets } from "./engine/assetSync";

async function startServer() {
  console.log("[Darkhold Exchange Backend] Booting services...");

  // 1. Ensure Matching Engine is reachable; if not running externally, launch internal engine service
  try {
    const health = await engineClient.getHealth();
    console.log(`[Darkhold Exchange] Connected to external engine (epoch: ${health.engine_epoch}, seq: ${health.seq})`);
  } catch (err: any) {
    if (!env.MATCHING_SIM_ENABLED) {
      console.error(`[Darkhold Exchange] FATAL: External matching engine at ${env.ENGINE_URL} is unreachable and MATCHING_SIM_ENABLED is false.`);
      throw new Error(`Configured matching engine at ${env.ENGINE_URL} is unreachable: ${err?.message || err}`);
    }

    let portToUse = 7000;
    try {
      const url = new URL(env.ENGINE_URL);
      if (url.port) portToUse = parseInt(url.port, 10);
    } catch {}

    try {
      console.log(`[Darkhold Exchange] External engine not detected. MATCHING_SIM_ENABLED is active; launching contract-compliant internal engine on port ${portToUse}...`);
      await matchingEngineService.start(portToUse);
      engineClient.setBaseUrl(`http://localhost:${portToUse}`);
      sseConsumer.setUrl(`http://localhost:${portToUse}`);
      console.log(`[Darkhold Exchange] Internal matching engine service running on port ${portToUse}`);
    } catch (startErr: any) {
      if (startErr.code === "EADDRINUSE") {
        const fallbackPort = portToUse === 7000 ? 7001 : portToUse + 1;
        console.warn(`[Darkhold Exchange] Port ${portToUse} is in use (e.g. macOS AirPlay receiver). Falling back to internal engine port ${fallbackPort}...`);
        await matchingEngineService.start(fallbackPort);
        engineClient.setBaseUrl(`http://localhost:${fallbackPort}`);
        sseConsumer.setUrl(`http://localhost:${fallbackPort}`);
        console.log(`[Darkhold Exchange] Internal matching engine service running on fallback port ${fallbackPort}`);
      } else {
        throw startErr;
      }
    }
  }

  // 2. Initialize Candle Service (@darkhold/candles)
  await candleService.initialize();

  // 3. Start Persistent SSE Consumer
  await sseConsumer.start();
  console.log(`[Darkhold Exchange] SSE Consumer connected at sequence ${sseConsumer.getLastSeq()}`);

  // 4. Register and configure DB assets on matching engine (Section 6.1 Step 5)
  await syncEngineAssets(sseConsumer.getEngineAssets());

  // 5. Start Settlement Worker and Order Resolver
  settlementWorker.start(50);
  orderResolver.start(2000);
  console.log("[Darkhold Exchange] Settlement worker and order resolver active");

  // 5. Create HTTP Server & Attach WebSocket Gateway
  const server = http.createServer(app);
  if (env.WS_ENABLED) {
    wsGateway.attach(server);
    console.log("[Darkhold Exchange] WebSocket gateway attached at path /ws");
  }

  // 6. Listen on PORT
  server.listen(env.PORT, () => {
    console.log(`[Darkhold Exchange Backend] Running on http://localhost:${env.PORT}`);
    console.log(`[Darkhold Exchange Backend] Environment: ${env.NODE_ENV}`);
    console.log(`[Darkhold Exchange Backend] Frontend origin: ${env.FRONTEND_URL}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    orderResolver.stop();
    settlementWorker.stop();
    sseConsumer.stop();
    candleService.stop();
    wsGateway.stop();
    await matchingEngineService.stop();

    server.close(async () => {
      await prisma.$disconnect();
      console.log("Database connection closed. Process terminated.");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
