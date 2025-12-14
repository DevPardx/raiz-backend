import { env } from "../config/env.config";

export const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

export const tokenExpiresIn = (hours?: number) =>
    new Date(Date.now() + (hours || env.VERIFICATION_TOKEN_EXPIRATION_HOURS) * 60 * 60 * 1000);

export const refreshTokenExpiresIn = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
