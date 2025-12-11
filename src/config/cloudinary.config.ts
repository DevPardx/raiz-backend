import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.config";
import logger from "../utils/logger.util";

if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    logger.error("Cloudinary credentials are missing in environment variables");
    throw new Error(
        "Missing Cloudinary credentials. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file",
    );
}

cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
});

logger.info("Cloudinary configured successfully");

export { cloudinary };
