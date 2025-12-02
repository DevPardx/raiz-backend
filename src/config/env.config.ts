import "dotenv/config";
import colors from "colors";

interface EnvConfig {
    POSTGRES_DB: string;
    POSTGRES_USER: string;
    POSTGRES_PASSWORD: string;
    POSTGRES_HOST: string;
    POSTGRES_PORT: string;

    NODE_ENV: string;
    PORT: string;

    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
}

const requiredEnvVars: (keyof EnvConfig)[] = [
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_HOST",
    "POSTGRES_PORT",

    "NODE_ENV",
    "PORT",

    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
];

export function validateEnv(): void {
    const missing: string[] = [];
    const warnings: string[] = [];

    for (const envVar of requiredEnvVars) {
        if (process.env.NODE_ENV === "production") {
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
    }

    if (missing.length > 0) {
        console.log(colors.red.bold("Missing required environment variables:"));
        missing.forEach(envVar => {
            console.log(colors.red(`   - ${envVar}`));
        });
        console.log(colors.red("Please create a .env file based on .env.example"));
        process.exit(1);
    }

    if (warnings.length > 0) {
        console.log(colors.yellow.bold("Environment configuration warnings:"));
        warnings.forEach(warning => {
            console.log(colors.yellow.bold(`   - ${warning}`));
        });
    }

    console.log(colors.blue.bold("Environment variables validated successfully"));
}

export const env: EnvConfig = {
    POSTGRES_DB: process.env.POSTGRES_DB!,
    POSTGRES_USER: process.env.POSTGRES_USER!,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD!,
    POSTGRES_HOST: process.env.POSTGRES_HOST!,
    POSTGRES_PORT: process.env.POSTGRES_PORT!,

    NODE_ENV: process.env.NODE_ENV!,
    PORT: process.env.PORT!,

    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
};
