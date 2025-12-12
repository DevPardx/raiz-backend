import request from "supertest";
import express from "express";
import { AppDataSource } from "../../../config/typeorm.config";
import { UserRole, MessageType, MessageStatus } from "../../../enums";
import { errorHandler } from "../../../middleware/error.middleware";
import { languageMiddleware } from "../../../middleware/language.middleware";
import { ConversationsController } from "../../../controllers/conversations.controller";
import { Router } from "express";
import { validateDto, validateQuery } from "./test-helpers";
import { GetMessagesQueryDto, SendMessageDto } from "../../../dtos/conversation.dto";

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

jest.mock("../../../utils/cloudinary.util", () => ({
    uploadImage: jest.fn().mockResolvedValue({
        url: "https://res.cloudinary.com/test/image.jpg",
        publicId: "chat-images/test-image",
    }),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockAuthenticate = (req: any, _res: any, next: any) => {
    req.user = {
        id: "user-uuid",
        email: "user@example.com",
        name: "Test User",
        role: UserRole.BUYER,
        verified: true,
    };
    next();
};
/* eslint-enable @typescript-eslint/no-explicit-any */

describe("Conversation Messages", () => {
    let app: express.Application;

    const mockConversationRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
    };

    const mockMessagesRepository = {
        findAndCount: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
    };

    const mockUser = {
        id: "user-uuid",
        email: "user@example.com",
        name: "Test User",
    };

    const mockConversation = {
        id: "conversation-uuid",
        propertyId: "property-uuid",
        buyerId: mockUser.id,
        sellerId: "seller-uuid",
        lastMessage: "Previous message",
        lastMessageAt: new Date(),
        buyerUnreadCount: 0,
        sellerUnreadCount: 0,
        buyer: mockUser,
        seller: { id: "seller-uuid", name: "Seller" },
        property: { id: "property-uuid", title: "Test Property", images: [] },
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.get(
            "/:id/messages",
            mockAuthenticate,
            validateQuery(GetMessagesQueryDto),
            ConversationsController.getConversationMessages,
        );
        router.post(
            "/:id/messages",
            mockAuthenticate,
            validateDto(SendMessageDto),
            ConversationsController.sendMessage,
        );

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
        // Reset mocked conversation unread counts to avoid test pollution
        mockConversation.buyerUnreadCount = 0;
        mockConversation.sellerUnreadCount = 0;
    });

    describe("GET /:id/messages", () => {
        const mockMessage1 = {
            id: "msg-1",
            conversationId: "conversation-uuid",
            senderId: mockUser.id,
            type: MessageType.TEXT,
            content: "Hello",
            status: MessageStatus.READ,
            isRead: true,
            createdAt: new Date("2025-12-11T10:00:00Z"),
            sender: mockUser,
        };

        const mockMessage2 = {
            id: "msg-2",
            conversationId: "conversation-uuid",
            senderId: "seller-uuid",
            type: MessageType.TEXT,
            content: "Hi there",
            status: MessageStatus.SENT,
            isRead: false,
            createdAt: new Date("2025-12-11T10:01:00Z"),
            sender: { id: "seller-uuid", name: "Seller" },
        };

        it("should get conversation messages with default pagination", async () => {
            mockConversationRepository.findOne.mockResolvedValue(mockConversation);
            mockMessagesRepository.findAndCount.mockResolvedValue([
                [mockMessage1, mockMessage2],
                2,
            ]);

            const response = await request(app).get(
                "/api/conversations/conversation-uuid/messages",
            );

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("data");
            expect(response.body).toHaveProperty("pagination");
            expect(response.body).toHaveProperty("conversation");
            expect(response.body.data).toHaveLength(2);

            expect(response.body.pagination).toEqual({
                page: 1,
                limit: 50,
                total: 2,
                totalPages: 1,
            });
        });

        it("should get messages with custom pagination", async () => {
            mockConversationRepository.findOne.mockResolvedValue(mockConversation);
            mockMessagesRepository.findAndCount.mockResolvedValue([[mockMessage1], 10]);

            const response = await request(app).get(
                "/api/conversations/conversation-uuid/messages?page=2&limit=5",
            );

            expect(response.status).toBe(200);
            expect(response.body.pagination).toEqual({
                page: 2,
                limit: 5,
                total: 10,
                totalPages: 2,
            });
        });

        it("should return 404 if conversation does not exist", async () => {
            mockConversationRepository.findOne.mockResolvedValue(null);

            const response = await request(app).get("/api/conversations/non-existent/messages");

            expect(response.status).toBe(404);
        });

        it("should return 403 if user is not participant", async () => {
            const otherConversation = {
                ...mockConversation,
                buyerId: "other-user",
                sellerId: "another-user",
            };

            mockConversationRepository.findOne.mockResolvedValue(otherConversation);

            const response = await request(app).get(
                "/api/conversations/conversation-uuid/messages",
            );

            expect(response.status).toBe(403);
        });

        it("should include sender information in messages", async () => {
            mockConversationRepository.findOne.mockResolvedValue(mockConversation);
            mockMessagesRepository.findAndCount.mockResolvedValue([[mockMessage1], 1]);

            const response = await request(app).get(
                "/api/conversations/conversation-uuid/messages",
            );

            expect(response.status).toBe(200);
            expect(response.body.data[0]).toHaveProperty("sender");
            expect(response.body.data[0].sender).toHaveProperty("name");
        });
    });

    describe("POST /:id/messages", () => {
        it("should send a text message successfully", async () => {
            mockConversationRepository.findOne.mockResolvedValue(mockConversation);

            const newMessage = {
                id: "new-msg-1",
                conversationId: mockConversation.id,
                senderId: mockUser.id,
                type: MessageType.TEXT,
                content: "New message",
                status: MessageStatus.SENT,
                isRead: false,
                createdAt: new Date(),
            };

            mockMessagesRepository.create.mockReturnValue(newMessage);
            mockMessagesRepository.save.mockResolvedValue(newMessage);
            mockMessagesRepository.findOne.mockResolvedValue({
                ...newMessage,
                sender: mockUser,
            });

            const response = await request(app)
                .post("/api/conversations/conversation-uuid/messages")
                .send({
                    type: MessageType.TEXT,
                    content: "New message",
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("id");
            expect(response.body.content).toBe("New message");
            expect(response.body.type).toBe(MessageType.TEXT);

            expect(mockConversationRepository.save).toHaveBeenCalled();
        });

        it("should send an image message successfully", async () => {
            mockConversationRepository.findOne.mockResolvedValue(mockConversation);

            const imageMessage = {
                id: "img-msg-1",
                conversationId: mockConversation.id,
                senderId: mockUser.id,
                type: MessageType.IMAGE,
                content: "Check this out",
                imageUrl: "https://res.cloudinary.com/test/image.jpg",
                status: MessageStatus.SENT,
                isRead: false,
                createdAt: new Date(),
            };

            mockMessagesRepository.create.mockReturnValue(imageMessage);
            mockMessagesRepository.save.mockResolvedValue(imageMessage);
            mockMessagesRepository.findOne.mockResolvedValue({
                ...imageMessage,
                sender: mockUser,
            });

            const response = await request(app)
                .post("/api/conversations/conversation-uuid/messages")
                .send({
                    type: MessageType.IMAGE,
                    content: "Check this out",
                    imageUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
                });

            expect(response.status).toBe(201);
            expect(response.body.type).toBe(MessageType.IMAGE);
        });

        it("should increment seller unread count when buyer sends message", async () => {
            const conversation = { ...mockConversation };
            mockConversationRepository.findOne.mockResolvedValue(conversation);
            mockMessagesRepository.create.mockReturnValue({});
            mockMessagesRepository.save.mockResolvedValue({});
            mockMessagesRepository.findOne.mockResolvedValue({ sender: mockUser });

            await request(app).post("/api/conversations/conversation-uuid/messages").send({
                type: MessageType.TEXT,
                content: "Test",
            });

            expect(mockConversationRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    sellerUnreadCount: 1,
                }),
            );
        });

        it("should return 404 if conversation does not exist", async () => {
            mockConversationRepository.findOne.mockResolvedValue(null);

            const response = await request(app)
                .post("/api/conversations/non-existent/messages")
                .send({
                    type: MessageType.TEXT,
                    content: "Test",
                });

            expect(response.status).toBe(404);
        });

        it("should return 403 if user is not participant", async () => {
            const otherConversation = {
                ...mockConversation,
                buyerId: "other-user",
                sellerId: "another-user",
            };

            mockConversationRepository.findOne.mockResolvedValue(otherConversation);

            const response = await request(app)
                .post("/api/conversations/conversation-uuid/messages")
                .send({
                    type: MessageType.TEXT,
                    content: "Test",
                });

            expect(response.status).toBe(403);
        });

        it("should return 400 if type is missing", async () => {
            const response = await request(app)
                .post("/api/conversations/conversation-uuid/messages")
                .send({
                    content: "Test",
                });

            expect(response.status).toBe(400);
        });

        it("should return 400 if content is missing", async () => {
            const response = await request(app)
                .post("/api/conversations/conversation-uuid/messages")
                .send({
                    type: MessageType.TEXT,
                });

            expect(response.status).toBe(400);
        });

        it("should update lastMessage and lastMessageAt", async () => {
            mockConversationRepository.findOne.mockResolvedValue(mockConversation);
            mockMessagesRepository.create.mockReturnValue({});
            mockMessagesRepository.save.mockResolvedValue({});
            mockMessagesRepository.findOne.mockResolvedValue({ sender: mockUser });

            await request(app).post("/api/conversations/conversation-uuid/messages").send({
                type: MessageType.TEXT,
                content: "Latest message",
            });

            expect(mockConversationRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    lastMessage: "Latest message",
                }),
            );
        });

        it("should set lastMessage to 'Image' for image messages", async () => {
            mockConversationRepository.findOne.mockResolvedValue(mockConversation);
            mockMessagesRepository.create.mockReturnValue({});
            mockMessagesRepository.save.mockResolvedValue({});
            mockMessagesRepository.findOne.mockResolvedValue({ sender: mockUser });

            await request(app).post("/api/conversations/conversation-uuid/messages").send({
                type: MessageType.IMAGE,
                content: "Photo description",
                imageUrl: "data:image/jpeg;base64,test",
            });

            expect(mockConversationRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    lastMessage: "Image",
                }),
            );
        });
    });
});
