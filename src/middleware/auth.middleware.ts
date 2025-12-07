import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/typeorm.config";
import { User } from "../entities/User.entity";
import { UnauthorizedError } from "../handler/error.handler";
import { verifyJWT } from "../utils/token.util";
import { UserRole } from "../enums";

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedError(req.t("unauthorized"));
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            throw new UnauthorizedError(req.t("unauthorized"));
        }

        const decoded = verifyJWT(token) as { id: string; role: UserRole };

        const user = await AppDataSource.getRepository(User).findOne({
            where: { id: decoded.id },
            select: ["id", "email", "role", "name", "profilePicture", "verified"],
        });

        if (!user) {
            throw new UnauthorizedError(req.t("unauthorized"));
        }

        if (!user.verified) {
            throw new UnauthorizedError(req.t("account_not_verified"));
        }

        req.user = user;
        next();
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            next(error);
        } else {
            next(new UnauthorizedError(req.t("unauthorized")));
        }
    }
};

export const authorize = (...roles: UserRole[]) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        if (!req.user) {
            throw new UnauthorizedError(req.t("unauthorized"));
        }

        if (!roles.includes(req.user.role)) {
            throw new UnauthorizedError(req.t("forbidden"));
        }

        next();
    };
};
