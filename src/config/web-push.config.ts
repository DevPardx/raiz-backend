import webPush from "web-push";
import { env } from "./env.config";
import logger from "../utils/logger.util";

try {
    if (env.VAPID_SUBJECT && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
        webPush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

        logger?.info?.("Web Push configured successfully");
    } else {
        logger?.warn?.("VAPID details not configured; skipping Web Push setup");
    }
} catch (error) {
    logger?.error?.("Failed to configure Web Push:", error);
    throw error;
}

export default webPush;
