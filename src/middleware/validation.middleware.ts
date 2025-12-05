import { Request, Response, NextFunction } from "express";
import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { BadRequestError } from "../handler/error.handler";

const getConstraintValue = (error: ValidationError, constraintName: string): number | undefined => {
  const constraint = error.constraints?.[constraintName];
  if (constraint) {
    const match = constraint.match(/\d+/);
    return match ? parseInt(match[0]) : undefined;
  }
  return undefined;
};

const translateValidationMessage = (error: ValidationError, req: Request): string => {
  const messageKey = Object.values(error.constraints || {})[0];

  if (!messageKey) {
    return req.t("invalid_value");
  }

  if (messageKey.startsWith("validation:")) {
    const key = messageKey.replace("validation:", "");
    const min = getConstraintValue(error, "minLength");
    return req.t(key, { ns: "validation", min });
  }

  return messageKey;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export const validateDto = (dtoClass: any) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const dtoInstance = plainToInstance(dtoClass, req.body);

      const errors: ValidationError[] = await validate(dtoInstance);

      if (errors.length > 0) {
        const formattedErrors = errors.map((error) => ({
          field: error.property,
          message: translateValidationMessage(error, req),
        }));

        throw new BadRequestError(req.t("validation_failed"), formattedErrors);
      }

      req.body = dtoInstance;
      next();
    } catch (error) {
      next(error);
    }
  };
};
