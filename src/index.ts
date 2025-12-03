import server from "./server";
import { validateEnv, env } from "./config/env.config";
import logger from "./utils/logger.util";

validateEnv();

const PORT = env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
});
