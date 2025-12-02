import colors from "colors";
import server from "./server";
import { validateEnv, env } from "./config/env.config";

validateEnv();

const PORT = env.PORT || 3000;

server.listen(PORT, () => {
  console.log(colors.cyan.bold(`Server is running on port ${PORT}`));
  console.log(colors.green.bold(`Environment: ${env.NODE_ENV}`));
});
