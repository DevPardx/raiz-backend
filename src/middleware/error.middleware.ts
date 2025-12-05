import { Request, Response, NextFunction } from "express";
import { AppError } from "../handler/error.handler";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      console.log(`AppError [${err.statusCode}]: ${err.message}`, { stack: err.stack });
    } else {
      console.log(`AppError [${err.statusCode}]: ${err.message}`);
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

  console.error("Unexpected error:", err);

  return res.status(500).json({
    error: req.t("internal_server_error"),
  });
};
