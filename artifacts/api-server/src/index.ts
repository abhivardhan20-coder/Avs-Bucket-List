import app from "./app";
import { logger } from "./lib/logger";
import { env } from "./lib/env";

const port = Number(env.PORT);

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
