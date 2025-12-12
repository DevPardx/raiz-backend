import { createServer } from "http";
import { Server } from "socket.io";
import app from "./server";
import { validateEnv, env } from "./config/env.config";
import logger from "./utils/logger.util";
import { socketAuthMiddleware } from "./sockets/socket.middleware";
import { setupChatSocketHandlers } from "./sockets/chat.socket";

validateEnv();

const PORT = env.PORT || 3000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: env.FRONTEND_URL || "*",
        methods: ["GET", "POST"],
        credentials: true,
    },
});

io.use(socketAuthMiddleware);

setupChatSocketHandlers(io);

httpServer.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info("Socket.IO server initialized");
});
