import { Request, Response, NextFunction } from "express";
import { AppError } from "../handler/error.handler";
import logger from "../utils/logger.util";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
        // Only log in non-test environments to avoid issues with logger mocks
        if (process.env.NODE_ENV !== "test") {
            if (err.statusCode >= 500) {
                logger.error(`AppError [${err.statusCode}]: ${err.message}`, { stack: err.stack });
            } else {
                logger.error(`AppError [${err.statusCode}]: ${err.message}`);
            }
        }

        if (err.errors && err.errors.length > 0) {
            return res.status(err.statusCode).json({
                errors: err.errors,
            });
        }

        return res.status(err.statusCode).json({
            error: err.message,
        });
    }

    // Only log in non-test environments
    if (process.env.NODE_ENV !== "test") {
        logger.error("Unexpected error:", err);
    }

    return res.status(500).json({
        error: req.t("internal_server_error"),
    });
};
