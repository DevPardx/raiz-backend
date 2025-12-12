import request from "supertest";
import express from "express";
import { AppDataSource } from "../../../config/typeorm.config";
import { UserRole } from "../../../enums";
import { errorHandler } from "../../../middleware/error.middleware";
import { languageMiddleware } from "../../../middleware/language.middleware";
import { ConversationsController } from "../../../controllers/conversations.controller";
import { Router } from "express";
import { validateDto } from "./test-helpers";
import { CreateConversationDto } from "../../../dtos/conversation.dto";

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
        id: "buyer-uuid",
        email: "buyer@example.com",
        name: "Test Buyer",
        role: UserRole.BUYER,
        verified: true,
    };
    next();
};
/* eslint-enable @typescript-eslint/no-explicit-any */

describe("POST /api/conversations", () => {
    let app: express.Application;

    const mockConversationRepository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockPropertyRepository = {
        findOne: jest.fn(),
    };

    const mockUser = {
        id: "buyer-uuid",
        email: "buyer@example.com",
        name: "Test Buyer",
        role: UserRole.BUYER,
    };

    const mockSeller = {
        id: "seller-uuid",
        email: "seller@example.com",
        name: "Test Seller",
        role: UserRole.SELLER,
    };

    const mockProperty = {
        id: "property-uuid-1",
        userId: "seller-uuid",
        title: "Beautiful House",
        price: 200000,
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.post(
            "/",
            mockAuthenticate,
            validateDto(CreateConversationDto),
            ConversationsController.createConversation,
        );

        app.use("/api/conversations", router);
        app.use(errorHandler);

        (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            if (entity.name === "Conversation") {
                return mockConversationRepository;
            }
            if (entity.name === "Property") {
                return mockPropertyRepository;
            }
            return {};
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Success Cases", () => {
        it("should create a new conversation successfully", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
            mockConversationRepository.findOne.mockResolvedValueOnce(null);

            const newConversation = {
                id: "conversation-uuid-1",
                propertyId: mockProperty.id,
                buyerId: mockUser.id,
                sellerId: mockSeller.id,
                lastMessage: null,
                lastMessageAt: null,
                buyerUnreadCount: 0,
                sellerUnreadCount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockConversationRepository.create.mockReturnValue(newConversation);
            mockConversationRepository.save.mockResolvedValue(newConversation);

            const fullConversation = {
                ...newConversation,
                buyer: mockUser,
                seller: mockSeller,
                property: {
                    ...mockProperty,
                    images: [],
                },
            };

            mockConversationRepository.findOne.mockResolvedValueOnce(fullConversation);

            const response = await request(app).post("/api/conversations").send({
                propertyId: mockProperty.id,
                sellerId: mockSeller.id,
            });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("id");
            expect(response.body).toHaveProperty("buyer");
            expect(response.body).toHaveProperty("seller");
            expect(response.body).toHaveProperty("property");
            expect(response.body.buyerId).toBe(mockUser.id);
            expect(response.body.sellerId).toBe(mockSeller.id);

            expect(mockPropertyRepository.findOne).toHaveBeenCalledWith({
                where: { id: mockProperty.id },
            });
        });

        it("should create conversation with different property", async () => {
            const anotherProperty = {
                id: "property-uuid-2",
                userId: "seller-uuid",
                title: "Another Property",
                price: 150000,
            };

            mockPropertyRepository.findOne.mockResolvedValue(anotherProperty);
            mockConversationRepository.findOne.mockResolvedValueOnce(null);
            mockConversationRepository.create.mockReturnValue({});
            mockConversationRepository.save.mockResolvedValue({});
            mockConversationRepository.findOne.mockResolvedValueOnce({
                id: "conversation-uuid-2",
                propertyId: anotherProperty.id,
            });

            const response = await request(app).post("/api/conversations").send({
                propertyId: anotherProperty.id,
                sellerId: mockSeller.id,
            });

            expect(response.status).toBe(201);
        });
    });

    describe("Validation Errors", () => {
        it("should return 400 if propertyId is missing", async () => {
            const response = await request(app).post("/api/conversations").send({
                sellerId: mockSeller.id,
            });

            expect(response.status).toBe(400);
        });

        it("should return 400 if sellerId is missing", async () => {
            const response = await request(app).post("/api/conversations").send({
                propertyId: mockProperty.id,
            });

            expect(response.status).toBe(400);
        });
    });

    describe("Error Cases", () => {
        it("should return 404 if property does not exist", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(null);

            const response = await request(app).post("/api/conversations").send({
                propertyId: "non-existent-property",
                sellerId: mockSeller.id,
            });

            expect(response.status).toBe(404);
        });

        it("should return 403 if trying to message own property", async () => {
            const ownProperty = {
                ...mockProperty,
                userId: mockUser.id, // Same as authenticated user
            };

            mockPropertyRepository.findOne.mockResolvedValue(ownProperty);

            const response = await request(app).post("/api/conversations").send({
                propertyId: ownProperty.id,
                sellerId: mockUser.id,
            });

            expect(response.status).toBe(403);
        });

        it("should return 403 if sellerId is not the property owner", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(mockProperty);

            const response = await request(app).post("/api/conversations").send({
                propertyId: mockProperty.id,
                sellerId: "wrong-seller-uuid",
            });

            expect(response.status).toBe(403);
        });

        it("should return 409 if conversation already exists", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(mockProperty);

            const existingConversation = {
                id: "existing-conversation-uuid",
                propertyId: mockProperty.id,
                buyerId: mockUser.id,
                sellerId: mockSeller.id,
            };

            mockConversationRepository.findOne.mockResolvedValue(existingConversation);

            const response = await request(app).post("/api/conversations").send({
                propertyId: mockProperty.id,
                sellerId: mockSeller.id,
            });

            expect(response.status).toBe(409);
        });

        it("should handle database errors gracefully", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
            mockConversationRepository.findOne.mockResolvedValue(null);
            mockConversationRepository.create.mockReturnValue({});
            mockConversationRepository.save.mockRejectedValue(new Error("Database error"));

            const response = await request(app).post("/api/conversations").send({
                propertyId: mockProperty.id,
                sellerId: mockSeller.id,
            });

            expect(response.status).toBe(500);
        });
    });

    describe("Authentication", () => {
        it("should require authentication", async () => {
            const appNoAuth = express();
            appNoAuth.use(express.json());
            appNoAuth.use(languageMiddleware);

            const router = Router();
            router.post(
                "/",
                validateDto(CreateConversationDto),
                ConversationsController.createConversation,
            );

            appNoAuth.use("/api/conversations", router);
            appNoAuth.use(errorHandler);

            const response = await request(appNoAuth).post("/api/conversations").send({
                propertyId: mockProperty.id,
                sellerId: mockSeller.id,
            });

            expect(response.status).toBe(500); // Will error because req.user is undefined
        });
    });

    describe("Edge Cases", () => {
        it("should handle valid UUIDs correctly", async () => {
            const validPropertyId = "550e8400-e29b-41d4-a716-446655440000";
            const validSellerId = "650e8400-e29b-41d4-a716-446655440001";

            const property = {
                ...mockProperty,
                id: validPropertyId,
                userId: validSellerId,
            };

            mockPropertyRepository.findOne.mockResolvedValue(property);
            mockConversationRepository.findOne.mockResolvedValueOnce(null);
            mockConversationRepository.create.mockReturnValue({});
            mockConversationRepository.save.mockResolvedValue({});
            mockConversationRepository.findOne.mockResolvedValueOnce({
                id: "conversation-uuid",
                propertyId: validPropertyId,
            });

            const response = await request(app).post("/api/conversations").send({
                propertyId: validPropertyId,
                sellerId: validSellerId,
            });

            expect(response.status).toBe(201);
        });

        it("should include property images in response", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
            mockConversationRepository.findOne.mockResolvedValueOnce(null);
            mockConversationRepository.create.mockReturnValue({});
            mockConversationRepository.save.mockResolvedValue({});

            const fullConversation = {
                id: "conversation-uuid",
                property: {
                    ...mockProperty,
                    images: [{ id: "img-1", url: "https://example.com/image1.jpg" }],
                },
            };

            mockConversationRepository.findOne.mockResolvedValueOnce(fullConversation);

            const response = await request(app).post("/api/conversations").send({
                propertyId: mockProperty.id,
                sellerId: mockSeller.id,
            });

            expect(response.status).toBe(201);
            expect(response.body.property.images).toBeDefined();
        });
    });
});
