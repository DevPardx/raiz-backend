import "dotenv/config";
import logger from "../utils/logger.util";

interface EnvConfig {
    FRONTEND_URL: string;

    POSTGRES_DB: string;
    POSTGRES_USER: string;
    POSTGRES_PASSWORD: string;
    POSTGRES_HOST: string;
    POSTGRES_PORT: string;

    REDIS_HOST: string;
    REDIS_PORT: number;
    REDIS_PASSWORD: string;

    NODE_ENV: string;
    PORT: string;

    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;

    SMTP_HOST: string;
    SMTP_PORT: number;
    SMTP_USER: string;
    SMTP_PASS: string;

    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;

    VAPID_PUBLIC_KEY: string;
    VAPID_PRIVATE_KEY: string;
    VAPID_SUBJECT: string;
}

const requiredEnvVars: (keyof EnvConfig)[] = [
    "FRONTEND_URL",

    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_HOST",
    "POSTGRES_PORT",

    "REDIS_HOST",
    "REDIS_PORT",
    "REDIS_PASSWORD",

    "NODE_ENV",
    "PORT",

    "JWT_SECRET",
    "JWT_REFRESH_SECRET",

    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",

    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",

    "VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_SUBJECT",
];

export function validateEnv(): void {
    const missing: string[] = [];
    const warnings: string[] = [];

    for (const envVar of requiredEnvVars) {
        // Skip validation in test environment
        if (process.env.NODE_ENV === "test") {
            continue;
        }

        if (!process.env[envVar]) {
            missing.push(envVar);
        }
    }

    if (process.env.NODE_ENV === "production") {
        if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
            warnings.push("JWT_SECRET should be at least 32 characters in production");
        }

        if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
            warnings.push("JWT_REFRESH_SECRET should be at least 32 characters in production");
        }

        if (process.env.POSTGRES_PASSWORD === "password") {
            warnings.push("POSTGRES_PASSWORD appears to be a default value");
        }

        if (
            !process.env.CLOUDINARY_API_SECRET &&
            !process.env.CLOUDINARY_API_KEY &&
            !process.env.CLOUDINARY_CLOUD_NAME
        ) {
            warnings.push("CLOUDINARY credentials are missing");
        }
    }

    if (missing.length > 0) {
        logger.error("Missing required environment variables:");
        missing.forEach((envVar) => {
            logger.error(`   - ${envVar}`);
        });
        logger.error("Please create a .env file based on .env.example");
        process.exit(1);
    }

    if (warnings.length > 0) {
        logger.warn("Environment configuration warnings:");
        warnings.forEach((warning) => {
            logger.warn(`   - ${warning}`);
        });
    }

    logger.info("Environment variables validated successfully");
}

export const env: EnvConfig = {
    FRONTEND_URL: process.env.FRONTEND_URL!,

    POSTGRES_DB: process.env.POSTGRES_DB!,
    POSTGRES_USER: process.env.POSTGRES_USER!,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD!,
    POSTGRES_HOST: process.env.POSTGRES_HOST!,
    POSTGRES_PORT: process.env.POSTGRES_PORT!,

    REDIS_HOST: process.env.REDIS_HOST!,
    REDIS_PORT: +process.env.REDIS_PORT!,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD!,

    NODE_ENV: process.env.NODE_ENV!,
    PORT: process.env.PORT!,

    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,

    SMTP_HOST: process.env.SMTP_HOST!,
    SMTP_PORT: +process.env.SMTP_PORT!,
    SMTP_USER: process.env.SMTP_USER!,
    SMTP_PASS: process.env.SMTP_PASS!,

    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME!,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY!,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET!,

    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY!,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY!,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT!,
};
