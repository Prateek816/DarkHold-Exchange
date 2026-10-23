import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/db";

async function startServer() {
  const server = app.listen(env.PORT, () => {
    console.log(`[Darkhold Exchange Backend] Running on http://localhost:${env.PORT}`);
    console.log(`[Darkhold Exchange Backend] Environment: ${env.NODE_ENV}`);
    console.log(`[Darkhold Exchange Backend] Frontend origin: ${env.FRONTEND_URL}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
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
