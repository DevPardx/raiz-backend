import { Router } from "express";
import { NotificationsController } from "../controllers/notifications.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateDto } from "../middleware/validation.middleware";
import { SubscribePushNotificationDto } from "../dtos/notification.dto";

const router = Router();

router.get("/vapid-public-key", NotificationsController.getVapidPublicKey);

router.post(
    "/subscribe",
    authenticate,
    validateDto(SubscribePushNotificationDto),
    NotificationsController.subscribe,
);

router.delete("/subscribe", authenticate, NotificationsController.unsubscribe);

router.get("/subscriptions", authenticate, NotificationsController.getSubscriptions);

router.post("/test", authenticate, NotificationsController.sendTestNotification);

export default router;
