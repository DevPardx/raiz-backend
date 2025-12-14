import { redisClient } from "../config/redis.config";
import logger from "./logger.util";

export class CacheUtil {
    static async get<T>(key: string): Promise<T | null> {
        try {
            const data = await redisClient.get(key);
            if (data) {
                return JSON.parse(data) as T;
            }
            return null;
        } catch (error) {
            logger.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }

    static async set(key: string, value: unknown, ttl?: number): Promise<void> {
        try {
            const serialized = JSON.stringify(value);
            if (ttl) {
                await redisClient.setEx(key, ttl, serialized);
            } else {
                await redisClient.set(key, serialized);
            }
        } catch (error) {
            logger.error(`Cache set error for key ${key}:`, error);
        }
    }

    static async del(key: string): Promise<void> {
        try {
            await redisClient.del(key);
        } catch (error) {
            logger.error(`Cache delete error for key ${key}:`, error);
        }
    }

    static async invalidatePattern(pattern: string): Promise<void> {
        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
                logger.info(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
            }
        } catch (error) {
            logger.error(`Cache invalidate pattern error for pattern ${pattern}:`, error);
        }
    }

    static async delMany(keys: string[]): Promise<void> {
        try {
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (error) {
            logger.error("Cache delete many error:", error);
        }
    }

    static async exists(key: string): Promise<boolean> {
        try {
            const result = await redisClient.exists(key);
            return result === 1;
        } catch (error) {
            logger.error(`Cache exists error for key ${key}:`, error);
            return false;
        }
    }

    static async expire(key: string, ttl: number): Promise<void> {
        try {
            await redisClient.expire(key, ttl);
        } catch (error) {
            logger.error(`Cache expire error for key ${key}:`, error);
        }
    }
}
