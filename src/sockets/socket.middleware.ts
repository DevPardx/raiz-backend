import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.config";
import logger from "../utils/logger.util";

export interface AuthenticatedSocket extends Socket {
    userId?: string;
    userEmail?: string;
}

export const socketAuthMiddleware = (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;

        if (!token) {
            logger.warn("Socket connection attempted without token");
            return next(new Error("Authentication error: No token provided"));
        }

        const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;

        const decoded = jwt.verify(cleanToken, env.JWT_SECRET) as {
            id: string;
            email: string;
        };

        socket.userId = decoded.id;
        socket.userEmail = decoded.email;

        logger.info(`Socket authenticated for user: ${decoded.email}`);
        next();
    } catch (error) {
        logger.error(`Socket authentication failed: ${error}`);
        next(new Error("Authentication error: Invalid token"));
    }
};
