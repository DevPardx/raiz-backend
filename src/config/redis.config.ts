import { createClient } from "redis";
import { env } from "./env.config";
import logger from "../utils/logger.util";

export const redisClient = createClient({
    socket: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
    },
    password: env.REDIS_PASSWORD,
});

redisClient.on("error", (err) => {
    logger.error("Redis Client Error:", err);
});

redisClient.on("connect", () => {
    logger.info("Redis Client Connected");
});

redisClient.on("ready", () => {
    logger.info("Redis Client Ready");
});

redisClient.on("disconnect", () => {
    logger.warn("Redis Client Disconnected");
});

export async function connectRedis(): Promise<void> {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
            logger.info("Redis connection established successfully");
        }
    } catch (error) {
        logger.error("Failed to connect to Redis:", error);
        throw error;
    }
}

export async function disconnectRedis(): Promise<void> {
    try {
        if (redisClient.isOpen) {
            await redisClient.quit();
            logger.info("Redis connection closed");
        }
    } catch (error) {
        logger.error("Error closing Redis connection:", error);
    }
}
