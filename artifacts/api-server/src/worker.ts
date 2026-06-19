import cron from "node-cron";
import { logger } from "./lib/logger";
import { env } from "./lib/env";
import { cleanupBlacklist } from "./lib/blacklist";
import http from "http";

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught Exception in worker");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled Rejection in worker");
  process.exit(1);
});

function startWorker() {
  try {
    logger.info(`Starting worker process...`);
    logger.info(`Blacklist cleanup cron scheduled with expression: ${env.CLEANUP_CRON_SCHEDULE}`);

    cron.schedule(env.CLEANUP_CRON_SCHEDULE, () => {
      logger.info("Running token blacklist cleanup task...");
      cleanupBlacklist()
        .then(() => logger.info("Token blacklist cleanup task completed successfully."))
        .catch(err => logger.error({ err }, "Failed to clean up blacklist in worker"));
    });

    // Start a simple health check server for the worker on PORT + 1
    const workerPort = parseInt(env.PORT) + 1;
    const server = http.createServer((req, res) => {
      if (req.url === "/healthz" || req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", service: "worker" }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(workerPort, () => {
      logger.info(`Worker health check running on port ${workerPort}`);
    });

  } catch (error) {
    logger.fatal({ err: error }, "Failed to start worker");
    process.exit(1);
  }
}

startWorker();
