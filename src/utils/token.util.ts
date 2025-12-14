import jwt from "jsonwebtoken";
import { env } from "../config/env.config";

export const generateToken = () => Math.floor(100000 + Math.random() * 900000).toString();

export const generateJWT = (payload: object): string => {
    return jwt.sign(payload, env.JWT_SECRET as jwt.Secret, {
        expiresIn: env.JWT_EXPIRATION as jwt.SignOptions["expiresIn"],
    });
};

export const verifyJWT = (token: string): string | jwt.JwtPayload => {
    return jwt.verify(token, env.JWT_SECRET as jwt.Secret) as string | jwt.JwtPayload;
};

export const generateRefreshToken = (payload: object): string => {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET as jwt.Secret, {
        expiresIn: env.JWT_REFRESH_EXPIRATION as jwt.SignOptions["expiresIn"],
    });
};

export const verifyRefreshToken = (token: string): string | jwt.JwtPayload => {
    return jwt.verify(token, env.JWT_REFRESH_SECRET as jwt.Secret) as string | jwt.JwtPayload;
};
