import request from "supertest";
import express from "express";
import { AppDataSource } from "../../../config/typeorm.config";
import { UserRole, MessageStatus } from "../../../enums";
import { errorHandler } from "../../../middleware/error.middleware";
import { languageMiddleware } from "../../../middleware/language.middleware";
import { ConversationsController } from "../../../controllers/conversations.controller";
import { Router } from "express";

jest.mock("../../../config/typeorm.config", () => ({
    AppDataSource: {
        getRepository: jest.fn(),
        initialize: jest.fn().mockResolvedValue(true),
    },
}));

jest.mock("../../../utils/logger.util", () => ({
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock("../../../config/cloudinary.config", () => ({
    cloudinary: {},
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockAuthenticate = (req: any, _res: any, next: any) => {
    req.user = {
        id: "buyer-uuid",
        email: "buyer@example.com",
        name: "Test Buyer",
        role: UserRole.BUYER,
        verified: true,
    };
    next();
};
/* eslint-enable @typescript-eslint/no-explicit-any */

describe("PATCH /api/conversations/:id/read", () => {
    let app: express.Application;

    const mockConversationRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
    };

    const mockMessagesRepository = {
        find: jest.fn(),
        update: jest.fn(),
    };

    const mockBuyer = {
        id: "buyer-uuid",
        email: "buyer@example.com",
        name: "Test Buyer",
    };

    const mockSeller = {
        id: "seller-uuid",
        email: "seller@example.com",
        name: "Test Seller",
    };

    const mockConversation = {
        id: "conversation-uuid",
        propertyId: "property-uuid",
        buyerId: mockBuyer.id,
        sellerId: mockSeller.id,
        buyerUnreadCount: 3,
        sellerUnreadCount: 0,
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.patch("/:id/read", mockAuthenticate, ConversationsController.markAsRead);

        app.use("/api/conversations", router);
        app.use(errorHandler);

        (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            if (entity.name === "Conversation") {
                return mockConversationRepository;
            }
            if (entity.name === "Messages") {
                return mockMessagesRepository;
            }
            return {};
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Success Cases", () => {
        it("should mark messages as read successfully", async () => {
            mockConversationRepository.findOne.mockResolvedValue(mockConversation);

            const unreadMessages = [
                {
                    id: "msg-1",
                    conversationId: mockConversation.id,
                    senderId: mockSeller.id,
                    isRead: false,
                },
                {
                    id: "msg-2",
                    conversationId: mockConversation.id,
                    senderId: mockSeller.id,
                    isRead: false,
                },
            ];

            mockMessagesRepository.find.mockResolvedValue(unreadMessages);
            mockMessagesRepository.update.mockResolvedValue({});
            mockConversationRepository.save.mockResolvedValue({});

            const response = await request(app).patch("/api/conversations/conversation-uuid/read");

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();

            expect(mockMessagesRepository.update).toHaveBeenCalledWith(
                ["msg-1", "msg-2"],
                expect.objectContaining({
                    isRead: true,
                    status: MessageStatus.READ,
                }),
            );
        });

        it("should reset buyer unread count when buyer marks as read", async () => {
            const conversation = {
                ...mockConversation,
                buyerId: mockBuyer.id,
                buyerUnreadCount: 5,
            };

            mockConversationRepository.findOne.mockResolvedValue(conversation);
            mockMessagesRepository.find.mockResolvedValue([
                { id: "msg-1", senderId: mockSeller.id },
            ]);
            mockMessagesRepository.update.mockResolvedValue({});

            await request(app).patch("/api/conversations/conversation-uuid/read");

            expect(mockConversationRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    buyerUnreadCount: 0,
                }),
            );
        });

        it("should not update messages sent by current user", async () => {
            mockConversationRepository.findOne.mockResolvedValue(mockConversation);

            const messages = [
                { id: "msg-1", senderId: mockSeller.id, isRead: false },
                { id: "msg-2", senderId: mockBuyer.id, isRead: false }, // Own message
            ];

            mockMessagesRepository.find.mockResolvedValue(messages);
            mockMessagesRepository.update.mockResolvedValue({});

            await request(app).patch("/api/conversations/conversation-uuid/read");

            // Should only update msg-1
            expect(mockMessagesRepository.update).toHaveBeenCalledWith(
                ["msg-1"],
                expect.anything(),
            );
        });

        it("should do nothing if no unread messages", async () => {
            mockConversationRepository.findOne.mockResolvedValue(mockConversation);
            mockMessagesRepository.find.mockResolvedValue([]);

            const response = await request(app).patch("/api/conversations/conversation-uuid/read");

            expect(response.status).toBe(200);
            expect(mockMessagesRepository.update).not.toHaveBeenCalled();
            expect(mockConversationRepository.save).not.toHaveBeenCalled();
        });

        it("should set readAt timestamp when marking as read", async () => {
            mockConversationRepository.findOne.mockResolvedValue(mockConversation);
            mockMessagesRepository.find.mockResolvedValue([
                { id: "msg-1", senderId: mockSeller.id },
            ]);
            mockMessagesRepository.update.mockResolvedValue({});

            await request(app).patch("/api/conversations/conversation-uuid/read");

            expect(mockMessagesRepository.update).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    readAt: expect.any(Date),
                }),
            );
        });
    });

    describe("Error Cases", () => {
        it("should return 404 if conversation does not exist", async () => {
            mockConversationRepository.findOne.mockResolvedValue(null);

            const response = await request(app).patch("/api/conversations/non-existent/read");

            expect(response.status).toBe(404);
        });

        it("should return 403 if user is not participant", async () => {
            const otherConversation = {
                ...mockConversation,
                buyerId: "other-user",
                sellerId: "another-user",
            };

            mockConversationRepository.findOne.mockResolvedValue(otherConversation);

            const response = await request(app).patch("/api/conversations/conversation-uuid/read");

            expect(response.status).toBe(403);
        });

        it("should handle database errors gracefully", async () => {
            mockConversationRepository.findOne.mockResolvedValue(mockConversation);
            mockMessagesRepository.find.mockResolvedValue([
                { id: "msg-1", senderId: mockSeller.id },
            ]);
            mockMessagesRepository.update.mockRejectedValue(new Error("Database error"));

            const response = await request(app).patch("/api/conversations/conversation-uuid/read");

            expect(response.status).toBe(500);
        });
    });

    describe("Authentication", () => {
        it("should require authentication", async () => {
            const appNoAuth = express();
            appNoAuth.use(express.json());
            appNoAuth.use(languageMiddleware);

            const router = Router();
            router.patch("/:id/read", ConversationsController.markAsRead);

            appNoAuth.use("/api/conversations", router);
            appNoAuth.use(errorHandler);

            const response = await request(appNoAuth).patch(
                "/api/conversations/conversation-uuid/read",
            );

            expect(response.status).toBe(500); // Will error because req.user is undefined
        });
    });

    describe("Edge Cases", () => {
        it("should work for seller marking messages as read", async () => {
            const sellerConversation = {
                ...mockConversation,
                sellerId: mockBuyer.id, // Current user is seller
                buyerId: "other-user-uuid",
                sellerUnreadCount: 4,
            };

            mockConversationRepository.findOne.mockResolvedValue(sellerConversation);
            mockMessagesRepository.find.mockResolvedValue([
                { id: "msg-1", senderId: "other-user-uuid" },
            ]);
            mockMessagesRepository.update.mockResolvedValue({});

            await request(app).patch("/api/conversations/conversation-uuid/read");

            expect(mockConversationRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    sellerUnreadCount: 0,
                }),
            );
        });

        it("should handle multiple unread messages", async () => {
            mockConversationRepository.findOne.mockResolvedValue(mockConversation);

            const manyMessages = Array.from({ length: 10 }, (_, i) => ({
                id: `msg-${i}`,
                senderId: mockSeller.id,
                isRead: false,
            }));

            mockMessagesRepository.find.mockResolvedValue(manyMessages);
            mockMessagesRepository.update.mockResolvedValue({});

            const response = await request(app).patch("/api/conversations/conversation-uuid/read");

            expect(response.status).toBe(200);
            expect(mockMessagesRepository.update).toHaveBeenCalledWith(
                expect.arrayContaining([
                    "msg-0",
                    "msg-1",
                    "msg-2",
                    "msg-3",
                    "msg-4",
                    "msg-5",
                    "msg-6",
                    "msg-7",
                    "msg-8",
                    "msg-9",
                ]),
                expect.anything(),
            );
        });

        it("should not reset unread count if no messages were updated", async () => {
            mockConversationRepository.findOne.mockResolvedValue(mockConversation);
            mockMessagesRepository.find.mockResolvedValue([
                { id: "msg-1", senderId: mockBuyer.id }, // Own message
            ]);

            await request(app).patch("/api/conversations/conversation-uuid/read");

            expect(mockConversationRepository.save).not.toHaveBeenCalled();
        });
    });
});
