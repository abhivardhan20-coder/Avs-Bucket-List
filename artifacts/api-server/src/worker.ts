import cron from "node-cron";
import { logger } from "./lib/logger";
import { env } from "./lib/env";
import { cleanupBlacklist } from "./lib/blacklist";

logger.info(`Starting worker process...`);
logger.info(`Blacklist cleanup cron scheduled with expression: ${env.CLEANUP_CRON_SCHEDULE}`);

cron.schedule(env.CLEANUP_CRON_SCHEDULE, () => {
  logger.info("Running token blacklist cleanup task...");
  cleanupBlacklist()
    .then(() => logger.info("Token blacklist cleanup task completed successfully."))
    .catch(err => logger.error({ err }, "Failed to clean up blacklist in worker"));
});
