import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { BadRequestError } from "../../../handler/error.handler";
import { UserRole } from "../../../enums";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const validateDto = (dtoClass: any) => {
    return async (req: any, _res: any, next: any) => {
        try {
            const dtoInstance = plainToInstance(dtoClass, req.body);
            const errors = await validate(dtoInstance as object);

            if (errors.length > 0) {
                const formattedErrors = errors.map((error) => ({
                    field: error.property,
                    message: Object.values(error.constraints || {})[0] || req.t("invalid_value"),
                }));

                throw new BadRequestError(req.t("validation_failed"), formattedErrors);
            }

            // Replace req.body with validated DTO instance
            req.body = dtoInstance;

            next();
        } catch (error) {
            next(error);
        }
    };
};

export const validateQuery = (dtoClass: any) => {
    return async (req: any, _res: any, next: any) => {
        try {
            const dtoInstance = plainToInstance(dtoClass, req.query);
            const errors = await validate(dtoInstance as object);

            if (errors.length > 0) {
                const formattedErrors = errors.map((error) => ({
                    field: error.property,
                    message: Object.values(error.constraints || {})[0] || req.t("invalid_value"),
                }));

                throw new BadRequestError(req.t("validation_failed"), formattedErrors);
            }

            Object.defineProperty(req, "query", {
                value: dtoInstance,
                writable: true,
                configurable: true,
            });

            next();
        } catch (error) {
            next(error);
        }
    };
};

export const mockAuthenticate = (req: any, _res: any, next: any) => {
    req.user = {
        id: "authenticated-user-uuid",
        email: "authenticated@example.com",
        name: "Authenticated User",
        role: UserRole.BUYER,
        verified: true,
    };
    next();
};
/* eslint-enable @typescript-eslint/no-explicit-any */
