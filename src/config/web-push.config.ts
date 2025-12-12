import webPush from "web-push";
import { env } from "./env.config";
import logger from "../utils/logger.util";

try {
    webPush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

    logger?.info?.("Web Push configured successfully");
} catch (error) {
    logger?.error?.("Failed to configure Web Push:", error);
    throw error;
}

export default webPush;
