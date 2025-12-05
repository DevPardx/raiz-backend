import nodemailer from "nodemailer";
import { env } from "./env.config";

const config = {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
    },
};

export const transporter = nodemailer.createTransport(config);
