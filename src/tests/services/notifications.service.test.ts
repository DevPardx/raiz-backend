import { NotificationsService } from "../../services/notifications.service";
import { AppDataSource } from "../../config/typeorm.config";

// Mock dependencies
jest.mock("../../config/typeorm.config", () => ({
    AppDataSource: {
        getRepository: jest.fn(),
    },
}));

jest.mock("../../utils/logger.util", () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock("../../config/web-push.config", () => ({
    __esModule: true,
    default: {
        sendNotification: jest.fn(),
        setVapidDetails: jest.fn(),
    },
}));

import webPush from "../../config/web-push.config";

describe("NotificationsService", () => {
    const mockPushSubscriptionRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
        remove: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockPushSubscriptionRepository);
    });

    describe("sendNotificationToUser", () => {
        it("should send push notification to all user subscriptions", async () => {
            const userId = "user-123";
            const notificationPayload = {
                title: "Test Notification",
                body: "This is a test",
                icon: "/icon.png",
                badge: "/badge.png",
                data: { url: "/test" },
            };

            const mockSubscriptions = [
                {
                    id: "sub-1",
                    userId,
                    endpoint: "https://fcm.googleapis.com/endpoint1",
                    keysJson: JSON.stringify({ p256dh: "key1", auth: "auth1" }),
                },
                {
                    id: "sub-2",
                    userId,
                    endpoint: "https://fcm.googleapis.com/endpoint2",
                    keysJson: JSON.stringify({ p256dh: "key2", auth: "auth2" }),
                },
            ];

            mockPushSubscriptionRepository.find.mockResolvedValue(mockSubscriptions);
            (webPush.sendNotification as jest.Mock).mockResolvedValue({ statusCode: 201 });

            await NotificationsService.sendNotificationToUser(userId, notificationPayload);

            expect(mockPushSubscriptionRepository.find).toHaveBeenCalledWith({
                where: { userId },
            });
            expect(webPush.sendNotification).toHaveBeenCalledTimes(2);
        });

        it("should handle subscription with no endpoint gracefully", async () => {
            const userId = "user-123";
            const notificationPayload = {
                title: "Test Notification",
                body: "This is a test",
            };

            mockPushSubscriptionRepository.find.mockResolvedValue([]);

            await expect(
                NotificationsService.sendNotificationToUser(userId, notificationPayload),
            ).resolves.not.toThrow();

            expect(webPush.sendNotification).not.toHaveBeenCalled();
        });

        it("should remove expired subscriptions on 410 response", async () => {
            const userId = "user-123";
            const notificationPayload = {
                title: "Test Notification",
                body: "This is a test",
            };

            const mockSubscriptions = [
                {
                    id: "sub-1",
                    userId,
                    endpoint: "https://fcm.googleapis.com/endpoint1",
                    keysJson: JSON.stringify({ p256dh: "key1", auth: "auth1" }),
                },
            ];

            mockPushSubscriptionRepository.find.mockResolvedValue(mockSubscriptions);
            const error = new Error("Gone") as Error & { statusCode?: number };
            error.statusCode = 410;
            (webPush.sendNotification as jest.Mock).mockRejectedValue(error);

            await NotificationsService.sendNotificationToUser(userId, notificationPayload);

            expect(mockPushSubscriptionRepository.remove).toHaveBeenCalledWith(
                mockSubscriptions[0],
            );
        });

        it("should handle 404 response by removing subscription", async () => {
            const userId = "user-123";
            const notificationPayload = {
                title: "Test Notification",
                body: "This is a test",
            };

            const mockSubscriptions = [
                {
                    id: "sub-1",
                    userId,
                    endpoint: "https://fcm.googleapis.com/endpoint1",
                    keysJson: JSON.stringify({ p256dh: "key1", auth: "auth1" }),
                },
            ];

            mockPushSubscriptionRepository.find.mockResolvedValue(mockSubscriptions);
            const error = new Error("Not Found") as Error & { statusCode?: number };
            error.statusCode = 404;
            (webPush.sendNotification as jest.Mock).mockRejectedValue(error);

            await NotificationsService.sendNotificationToUser(userId, notificationPayload);

            expect(mockPushSubscriptionRepository.remove).toHaveBeenCalledWith(
                mockSubscriptions[0],
            );
        });

        it("should continue sending to other subscriptions if one fails", async () => {
            const userId = "user-123";
            const notificationPayload = {
                title: "Test Notification",
                body: "This is a test",
            };

            const mockSubscriptions = [
                {
                    id: "sub-1",
                    userId,
                    endpoint: "https://fcm.googleapis.com/endpoint1",
                    keysJson: JSON.stringify({ p256dh: "key1", auth: "auth1" }),
                },
                {
                    id: "sub-2",
                    userId,
                    endpoint: "https://fcm.googleapis.com/endpoint2",
                    keysJson: JSON.stringify({ p256dh: "key2", auth: "auth2" }),
                },
            ];

            mockPushSubscriptionRepository.find.mockResolvedValue(mockSubscriptions);
            (webPush.sendNotification as jest.Mock)
                .mockRejectedValueOnce(new Error("Network error"))
                .mockResolvedValueOnce({ statusCode: 201 });

            await NotificationsService.sendNotificationToUser(userId, notificationPayload);

            expect(webPush.sendNotification).toHaveBeenCalledTimes(2);
        });
    });

    describe("subscribe", () => {
        it("should create new subscription if not exists", async () => {
            const userId = "user-123";
            const subscription = {
                endpoint: "https://fcm.googleapis.com/endpoint1",
                keys: {
                    p256dh: "key1",
                    auth: "auth1",
                },
            };

            const mockT = (key: string): string => key;

            mockPushSubscriptionRepository.findOne.mockResolvedValue(null);
            mockPushSubscriptionRepository.create.mockReturnValue({
                userId,
                endpoint: subscription.endpoint,
                keysJson: JSON.stringify(subscription.keys),
            });
            mockPushSubscriptionRepository.save.mockResolvedValue({
                id: "sub-1",
                userId,
                endpoint: subscription.endpoint,
                keysJson: JSON.stringify(subscription.keys),
            });

            await NotificationsService.subscribe(userId, subscription, mockT);

            expect(mockPushSubscriptionRepository.findOne).toHaveBeenCalledWith({
                where: { endpoint: subscription.endpoint },
            });
            expect(mockPushSubscriptionRepository.save).toHaveBeenCalled();
        });

        it("should update existing subscription if it exists", async () => {
            const userId = "user-123";
            const subscription = {
                endpoint: "https://fcm.googleapis.com/endpoint1",
                keys: {
                    p256dh: "key1",
                    auth: "auth1",
                },
            };

            const mockT = (key: string): string => key;

            const existingSubscription = {
                id: "sub-1",
                userId,
                endpoint: subscription.endpoint,
                keysJson: JSON.stringify(subscription.keys),
            };

            mockPushSubscriptionRepository.findOne.mockResolvedValue(existingSubscription);
            mockPushSubscriptionRepository.save.mockResolvedValue(existingSubscription);

            await NotificationsService.subscribe(userId, subscription, mockT);

            expect(mockPushSubscriptionRepository.save).not.toHaveBeenCalled();
        });
    });

    describe("unsubscribe", () => {
        it("should remove subscription by endpoint", async () => {
            const userId = "user-123";
            const endpoint = "https://fcm.googleapis.com/endpoint1";
            const mockT = (key: string): string => key;

            const existingSubscription = {
                id: "sub-1",
                userId,
                endpoint,
            };

            mockPushSubscriptionRepository.findOne.mockResolvedValue(existingSubscription);
            mockPushSubscriptionRepository.remove.mockResolvedValue(existingSubscription);

            await NotificationsService.unsubscribe(userId, endpoint, mockT);

            expect(mockPushSubscriptionRepository.findOne).toHaveBeenCalledWith({
                where: { userId, endpoint },
            });
            expect(mockPushSubscriptionRepository.remove).toHaveBeenCalledWith(
                existingSubscription,
            );
        });

        it("should handle non-existent subscription gracefully", async () => {
            const userId = "user-123";
            const endpoint = "https://fcm.googleapis.com/endpoint1";
            const mockT = (key: string): string => key;

            mockPushSubscriptionRepository.findOne.mockResolvedValue(null);

            await expect(
                NotificationsService.unsubscribe(userId, endpoint, mockT),
            ).rejects.toThrow();
        });
    });
});
