import { Repository } from "typeorm";
import { AppDataSource } from "../config/typeorm.config";
import { PushSubscription } from "../entities/PushSubscription.entity";
import { SubscribePushNotificationDto, SendNotificationDto } from "../dtos/notification.dto";
import webPush from "../config/web-push.config";
import logger from "../utils/logger.util";
import { TFunction } from "i18next";
import { NotFoundError } from "../handler/error.handler";

export class NotificationsService {
    private static pushSubscriptionRepository: Repository<PushSubscription>;

    private static getPushSubscriptionRepository(): Repository<PushSubscription> {
        if (!this.pushSubscriptionRepository) {
            this.pushSubscriptionRepository = AppDataSource.getRepository(PushSubscription);
        }
        return this.pushSubscriptionRepository;
    }

    static subscribe = async (
        userId: string,
        subscriptionData: SubscribePushNotificationDto,
        t: TFunction,
    ) => {
        const { endpoint, keys } = subscriptionData;

        const existingSubscription = await this.getPushSubscriptionRepository().findOne({
            where: { endpoint },
        });

        if (existingSubscription) {
            if (existingSubscription.userId !== userId) {
                existingSubscription.userId = userId;
                existingSubscription.keysJson = JSON.stringify(keys);
                await this.getPushSubscriptionRepository().save(existingSubscription);
            }
            return {
                message: t("subscription_updated"),
                subscription: existingSubscription,
            };
        }

        const newSubscription = this.getPushSubscriptionRepository().create({
            userId,
            endpoint,
            keysJson: JSON.stringify(keys),
        });

        await this.getPushSubscriptionRepository().save(newSubscription);

        return {
            message: t("subscription_created"),
            subscription: newSubscription,
        };
    };

    static unsubscribe = async (userId: string, endpoint: string, t: TFunction) => {
        const subscription = await this.getPushSubscriptionRepository().findOne({
            where: { userId, endpoint },
        });

        if (!subscription) {
            throw new NotFoundError(t("subscription_not_found"));
        }

        await this.getPushSubscriptionRepository().remove(subscription);

        return { message: t("subscription_deleted") };
    };

    static getUserSubscriptions = async (userId: string) => {
        return await this.getPushSubscriptionRepository().find({
            where: { userId },
        });
    };

    static sendNotificationToUser = async (userId: string, notification: SendNotificationDto) => {
        const subscriptions = await this.getUserSubscriptions(userId);

        if (subscriptions.length === 0) {
            logger.warn(`No push subscriptions found for user ${userId}`);
            return { sent: 0, failed: 0 };
        }

        const payload = JSON.stringify({
            title: notification.title,
            body: notification.body,
            icon: notification.icon,
            badge: notification.badge,
            tag: notification.tag,
            data: notification.data,
        });

        let sent = 0;
        let failed = 0;

        for (const subscription of subscriptions) {
            try {
                const keys = JSON.parse(subscription.keysJson);
                const pushSubscription = {
                    endpoint: subscription.endpoint,
                    keys,
                };

                await webPush.sendNotification(pushSubscription, payload);
                sent++;
            } catch (error) {
                failed++;
                logger.error(
                    `Failed to send notification to subscription ${subscription.id}:`,
                    error,
                );

                if (error instanceof Error && "statusCode" in error) {
                    const statusCode = error.statusCode;
                    if (statusCode === 410 || statusCode === 404) {
                        logger.info(
                            `Removing invalid subscription ${subscription.id} (status ${statusCode})`,
                        );
                        await this.getPushSubscriptionRepository().remove(subscription);
                    }
                }
            }
        }

        return { sent, failed };
    };

    static sendNotificationToUsers = async (
        userIds: string[],
        notification: SendNotificationDto,
    ) => {
        let totalSent = 0;
        let totalFailed = 0;

        for (const userId of userIds) {
            const result = await this.sendNotificationToUser(userId, notification);
            totalSent += result.sent;
            totalFailed += result.failed;
        }

        return { sent: totalSent, failed: totalFailed };
    };

    static getVapidPublicKey = () => {
        return process.env.VAPID_PUBLIC_KEY;
    };
}
