import { NextFunction, Request, Response } from "express";
import { NotificationsService } from "../services/notifications.service";
import { SubscribePushNotificationDto, SendNotificationDto } from "../dtos/notification.dto";

export class NotificationsController {
    static subscribe = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const subscriptionData: SubscribePushNotificationDto = req.body;

            const result = await NotificationsService.subscribe(userId, subscriptionData, req.t);

            res.status(201).json({
                success: true,
                message: result.message,
                data: {
                    id: result.subscription.id,
                    endpoint: result.subscription.endpoint,
                    createdAt: result.subscription.createdAt,
                },
            });
        } catch (error) {
            next(error);
        }
    };

    static unsubscribe = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const { endpoint } = req.body;

            const result = await NotificationsService.unsubscribe(userId, endpoint, req.t);

            res.status(200).json({
                success: true,
                message: result.message,
            });
        } catch (error) {
            next(error);
        }
    };

    static getSubscriptions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;

            const subscriptions = await NotificationsService.getUserSubscriptions(userId);

            res.status(200).json({
                success: true,
                data: subscriptions.map((sub) => ({
                    id: sub.id,
                    endpoint: sub.endpoint,
                    createdAt: sub.createdAt,
                })),
            });
        } catch (error) {
            next(error);
        }
    };

    static getVapidPublicKey = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const publicKey = NotificationsService.getVapidPublicKey();

            res.status(200).json({
                success: true,
                data: { publicKey },
            });
        } catch (error) {
            next(error);
        }
    };

    static sendTestNotification = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const notification: SendNotificationDto = {
                title: req.t("test_notification_title"),
                body: req.t("test_notification_body"),
                icon: "/icon-192x192.png",
                badge: "/badge-72x72.png",
                tag: "test-notification",
                data: { url: "/" },
            };

            const result = await NotificationsService.sendNotificationToUser(userId, notification);

            res.status(200).json({
                success: true,
                message: req.t("test_notification_sent"),
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };
}
