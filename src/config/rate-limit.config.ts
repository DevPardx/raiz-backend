import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { Request, Response } from "express";
import { redisClient } from "./redis.config";

const createRateLimiter = (
    windowMs: number,
    max: number,
    translationKey: string,
    skipSuccessfulRequests = false,
): RateLimitRequestHandler => {
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests,
        store: new RedisStore({
            sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        }),
        handler: (req: Request, res: Response) => {
            const message = req.t ? req.t(translationKey) : translationKey;
            res.status(429).json({
                error: message,
            });
        },
    });
};

/**
 * General API rate limiter
 * Applied to all API endpoints
 * 100 requests per 15 minutes per IP
 */
export const generalLimiter = createRateLimiter(15 * 60 * 1000, 100, "rate_limit_general");

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks
 * 5 attempts per 15 minutes per IP
 */
export const authLimiter = createRateLimiter(15 * 60 * 1000, 5, "rate_limit_auth", true);

/**
 * Password reset rate limiter
 * Prevents abuse of password reset functionality
 * 3 attempts per hour per IP
 */
export const passwordResetLimiter = createRateLimiter(
    60 * 60 * 1000,
    3,
    "rate_limit_password_reset",
);

/**
 * Email verification rate limiter
 * Prevents email spam
 * 10 attempts per hour per IP
 */
export const emailVerificationLimiter = createRateLimiter(
    60 * 60 * 1000,
    10,
    "rate_limit_email_verification",
);

/**
 * File upload rate limiter
 * Prevents upload spam and abuse
 * 20 uploads per 15 minutes per IP
 */
export const uploadLimiter = createRateLimiter(15 * 60 * 1000, 20, "rate_limit_upload");

/**
 * Chat/Message rate limiter
 * Prevents message spam
 * 60 messages per minute per IP
 */
export const messageLimiter = createRateLimiter(1 * 60 * 1000, 60, "rate_limit_message");

/**
 * Create property rate limiter
 * Prevents spam property creation
 * 10 properties per hour per IP
 */
export const createPropertyLimiter = createRateLimiter(
    60 * 60 * 1000,
    10,
    "rate_limit_create_property",
);

/**
 * Search rate limiter
 * Prevents search API abuse
 * 100 searches per 15 minutes per IP
 */
export const searchLimiter = createRateLimiter(15 * 60 * 1000, 100, "rate_limit_search");
