import request from "supertest";
import express from "express";
import { AppDataSource } from "../../../config/typeorm.config";
import { UserRole } from "../../../enums";
import { errorHandler } from "../../../middleware/error.middleware";
import { languageMiddleware } from "../../../middleware/language.middleware";
import { ConversationsController } from "../../../controllers/conversations.controller";
import { Router } from "express";
import { validateQuery } from "./test-helpers";
import { GetConversationsQueryDto } from "../../../dtos/conversation.dto";

// Mock dependencies
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
        id: "user-uuid",
        email: "user@example.com",
        name: "Test User",
        role: UserRole.BUYER,
        verified: true,
    };
    next();
};

describe("GET /api/conversations", () => {
    let app: express.Application;

    const mockUser = {
        id: "user-uuid",
        email: "user@example.com",
        name: "Test User",
        role: UserRole.BUYER,
    };

    const mockConversation1 = {
        id: "conversation-uuid-1",
        propertyId: "property-uuid-1",
        buyerId: mockUser.id,
        sellerId: "seller-uuid-1",
        lastMessage: "Hello, is this available?",
        lastMessageAt: new Date("2025-12-11T10:00:00Z"),
        buyerUnreadCount: 2,
        sellerUnreadCount: 0,
        createdAt: new Date("2025-12-10T10:00:00Z"),
        buyer: { id: mockUser.id, name: "Test User" },
        seller: { id: "seller-uuid-1", name: "Seller One" },
        property: {
            id: "property-uuid-1",
            title: "Beautiful House",
            images: [],
        },
    };

    const mockConversation2 = {
        id: "conversation-uuid-2",
        propertyId: "property-uuid-2",
        buyerId: "other-buyer-uuid",
        sellerId: mockUser.id,
        lastMessage: "I'm interested",
        lastMessageAt: new Date("2025-12-11T11:00:00Z"),
        buyerUnreadCount: 0,
        sellerUnreadCount: 3,
        createdAt: new Date("2025-12-10T11:00:00Z"),
        buyer: { id: "other-buyer-uuid", name: "Other Buyer" },
        seller: { id: mockUser.id, name: "Test User" },
        property: {
            id: "property-uuid-2",
            title: "Modern Apartment",
            images: [],
        },
    };

    /** eslint-disable @typescript-eslint/no-explicit-any */
    const createMockQueryBuilder = (conversations: any[], total: number) => {
        return {
            createQueryBuilder: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getManyAndCount: jest.fn().mockResolvedValue([conversations, total]),
        };
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.get(
            "/",
            mockAuthenticate,
            validateQuery(GetConversationsQueryDto),
            ConversationsController.getUserConversations,
        );

        app.use("/api/conversations", router);
        app.use(errorHandler);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Success Cases", () => {
        it("should return user's conversations with default pagination", async () => {
            const mockRepo = createMockQueryBuilder([mockConversation1, mockConversation2], 2);

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "Conversation") {
                    return mockRepo;
                }
                return {};
            });

            const response = await request(app).get("/api/conversations");

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("data");
            expect(response.body).toHaveProperty("pagination");
            expect(response.body.data).toHaveLength(2);

            expect(response.body.pagination).toEqual({
                page: 1,
                limit: 20,
                total: 2,
                totalPages: 1,
            });

            // Check unreadCount is correct for each conversation
            expect(response.body.data[0].unreadCount).toBe(2); // Buyer's unread count
            expect(response.body.data[1].unreadCount).toBe(3); // Seller's unread count
        });

        it("should return conversations with custom pagination", async () => {
            const mockRepo = createMockQueryBuilder([mockConversation1], 10);

            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

            const response = await request(app).get("/api/conversations?page=2&limit=5");

            expect(response.status).toBe(200);
            expect(response.body.pagination).toEqual({
                page: 2,
                limit: 5,
                total: 10,
                totalPages: 2,
            });

            expect(mockRepo.skip).toHaveBeenCalledWith(5);
            expect(mockRepo.take).toHaveBeenCalledWith(5);
        });

        it("should return empty array when user has no conversations", async () => {
            const mockRepo = createMockQueryBuilder([], 0);

            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

            const response = await request(app).get("/api/conversations");

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([]);
            expect(response.body.pagination.total).toBe(0);
        });

        it("should include property images in conversations", async () => {
            const conversationWithImages = {
                ...mockConversation1,
                property: {
                    ...mockConversation1.property,
                    images: [{ id: "img-1", url: "https://example.com/image1.jpg" }],
                },
            };

            const mockRepo = createMockQueryBuilder([conversationWithImages], 1);

            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

            const response = await request(app).get("/api/conversations");

            expect(response.status).toBe(200);
            expect(response.body.data[0].property.images).toHaveLength(1);
        });

        it("should order conversations by lastMessageAt DESC", async () => {
            const mockRepo = createMockQueryBuilder([mockConversation2, mockConversation1], 2);

            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

            const response = await request(app).get("/api/conversations");

            expect(response.status).toBe(200);
            expect(mockRepo.orderBy).toHaveBeenCalledWith(
                "conversation.lastMessageAt",
                "DESC",
                "NULLS LAST",
            );
        });

        it("should handle conversations without lastMessage", async () => {
            const conversationNoMessage = {
                ...mockConversation1,
                lastMessage: null,
                lastMessageAt: null,
            };

            const mockRepo = createMockQueryBuilder([conversationNoMessage], 1);

            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

            const response = await request(app).get("/api/conversations");

            expect(response.status).toBe(200);
            expect(response.body.data[0].lastMessage).toBeNull();
        });
    });

    describe("Validation", () => {
        it("should reject invalid page parameter (0)", async () => {
            const response = await request(app).get("/api/conversations?page=0");

            expect(response.status).toBe(400);
        });

        it("should reject invalid page parameter (negative)", async () => {
            const response = await request(app).get("/api/conversations?page=-1");

            expect(response.status).toBe(400);
        });

        it("should reject invalid limit parameter (0)", async () => {
            const response = await request(app).get("/api/conversations?limit=0");

            expect(response.status).toBe(400);
        });

        it("should reject limit greater than 100", async () => {
            const response = await request(app).get("/api/conversations?limit=101");

            expect(response.status).toBe(400);
        });

        it("should reject non-numeric page", async () => {
            const response = await request(app).get("/api/conversations?page=abc");

            expect(response.status).toBe(400);
        });

        it("should reject non-numeric limit", async () => {
            const response = await request(app).get("/api/conversations?limit=xyz");

            expect(response.status).toBe(400);
        });
    });

    describe("Authentication", () => {
        it("should require authentication", async () => {
            const appNoAuth = express();
            appNoAuth.use(express.json());
            appNoAuth.use(languageMiddleware);

            const router = Router();
            router.get(
                "/",
                validateQuery(GetConversationsQueryDto),
                ConversationsController.getUserConversations,
            );

            appNoAuth.use("/api/conversations", router);
            appNoAuth.use(errorHandler);

            const response = await request(appNoAuth).get("/api/conversations");

            expect(response.status).toBe(500); // Will error because req.user is undefined
        });
    });

    describe("Edge Cases", () => {
        it("should calculate total pages correctly", async () => {
            const mockRepo = createMockQueryBuilder([mockConversation1], 25);

            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

            const response = await request(app).get("/api/conversations?limit=10");

            expect(response.status).toBe(200);
            expect(response.body.pagination.totalPages).toBe(3);
        });

        it("should handle large page numbers", async () => {
            const mockRepo = createMockQueryBuilder([], 2);

            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

            const response = await request(app).get("/api/conversations?page=100&limit=20");

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([]);
            expect(response.body.pagination.page).toBe(100);
        });

        it("should show correct unreadCount for buyer", async () => {
            const buyerConversation = {
                ...mockConversation1,
                buyerId: mockUser.id,
                buyerUnreadCount: 5,
                sellerUnreadCount: 0,
            };

            const mockRepo = createMockQueryBuilder([buyerConversation], 1);

            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

            const response = await request(app).get("/api/conversations");

            expect(response.status).toBe(200);
            expect(response.body.data[0].unreadCount).toBe(5);
        });

        it("should show correct unreadCount for seller", async () => {
            const sellerConversation = {
                ...mockConversation1,
                sellerId: mockUser.id,
                buyerId: "other-buyer-uuid",
                buyerUnreadCount: 0,
                sellerUnreadCount: 7,
            };

            const mockRepo = createMockQueryBuilder([sellerConversation], 1);

            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

            const response = await request(app).get("/api/conversations");

            expect(response.status).toBe(200);
            expect(response.body.data[0].unreadCount).toBe(7);
        });

        it("should include buyer and seller information", async () => {
            const mockRepo = createMockQueryBuilder([mockConversation1], 1);

            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

            const response = await request(app).get("/api/conversations");

            expect(response.status).toBe(200);
            expect(response.body.data[0]).toHaveProperty("buyer");
            expect(response.body.data[0]).toHaveProperty("seller");
            expect(response.body.data[0].buyer).toHaveProperty("name");
            expect(response.body.data[0].seller).toHaveProperty("name");
        });
    });
});
