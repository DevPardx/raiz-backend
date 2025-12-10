import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { BadRequestError } from "../../../handler/error.handler";
import { UserRole } from "../../../enums";

// Custom validation middleware for tests that works around readonly req.query
/* eslint-disable @typescript-eslint/no-explicit-any */
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

            // Work around readonly query property in tests
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

// Mock authenticate middleware for testing protected routes
export const mockAuthenticate = (req: any, _res: any, next: any) => {
    // Simulate authenticated user
    req.user = {
        id: "authenticated-user-uuid",
        email: "authenticated@example.com",
        name: "Authenticated User",
        role: UserRole.SELLER,
        verified: true,
    };
    next();
};
