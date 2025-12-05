import { Request, Response, NextFunction } from "express";
import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { BadRequestError } from "../handler/error.handler";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const validateDto = (dtoClass: any) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const dtoInstance = plainToInstance(dtoClass, req.body);

      const errors: ValidationError[] = await validate(dtoInstance);

      if (errors.length > 0) {
        const formattedErrors = errors.map((error) => ({
          field: error.property,
          message: Object.values(error.constraints || {})[0] || "Invalid value",
        }));

        throw new BadRequestError("Validation failed", formattedErrors);
      }

      req.body = dtoInstance;
      next();
    } catch (error) {
      next(error);
    }
  };
};
