import request from "supertest";
import express from "express";
import { AppDataSource } from "../../../config/typeorm.config";
import { UserRole } from "../../../enums";
import { errorHandler } from "../../../middleware/error.middleware";
import { languageMiddleware } from "../../../middleware/language.middleware";
import { FavoritesController } from "../../../controllers/favorites.controller";
import { Router } from "express";

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

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockAuthenticate = (req: any, _res: any, next: any) => {
    req.user = {
        id: "authenticated-user-uuid",
        email: "user@example.com",
        name: "Test User",
        role: UserRole.BUYER,
        verified: true,
    };
    next();
};
/* eslint-enable @typescript-eslint/no-explicit-any */

describe("POST /api/favorites/:propertyId", () => {
    let app: express.Application;

    const mockFavoritesRepository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockPropertyRepository = {
        findOne: jest.fn(),
    };

    const mockUser = {
        id: "authenticated-user-uuid",
        email: "user@example.com",
        name: "Test User",
        role: UserRole.BUYER,
        verified: true,
    };

    const existingProperty = {
        id: "property-uuid-1",
        userId: "seller-uuid",
        title: "Test Property",
        price: 200000,
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.post("/:propertyId", mockAuthenticate, FavoritesController.addFavorite);

        app.use("/api/favorites", router);
        app.use(errorHandler);

        (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            if (entity.name === "Favorites") {
                return mockFavoritesRepository;
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
        it("should add property to favorites successfully", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);
            mockFavoritesRepository.findOne.mockResolvedValue(null);

            const newFavorite = {
                id: "favorite-uuid-1",
                userId: mockUser.id,
                propertyId: existingProperty.id,
                createdAt: new Date(),
            };

            mockFavoritesRepository.create.mockReturnValue(newFavorite);
            mockFavoritesRepository.save.mockResolvedValue(newFavorite);

            const response = await request(app).post(`/api/favorites/${existingProperty.id}`);

            expect(response.status).toBe(201);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();

            expect(mockPropertyRepository.findOne).toHaveBeenCalledWith({
                where: { id: existingProperty.id },
            });

            expect(mockFavoritesRepository.findOne).toHaveBeenCalledWith({
                where: { userId: mockUser.id, propertyId: existingProperty.id },
            });

            expect(mockFavoritesRepository.create).toHaveBeenCalledWith({
                userId: mockUser.id,
                propertyId: existingProperty.id,
            });

            expect(mockFavoritesRepository.save).toHaveBeenCalledWith(newFavorite);
        });

        it("should work with different property IDs", async () => {
            const anotherProperty = {
                id: "property-uuid-2",
                userId: "seller-uuid",
                title: "Another Property",
                price: 300000,
            };

            mockPropertyRepository.findOne.mockResolvedValue(anotherProperty);
            mockFavoritesRepository.findOne.mockResolvedValue(null);
            mockFavoritesRepository.create.mockReturnValue({});
            mockFavoritesRepository.save.mockResolvedValue({});

            const response = await request(app).post(`/api/favorites/${anotherProperty.id}`);

            expect(response.status).toBe(201);
            expect(mockPropertyRepository.findOne).toHaveBeenCalledWith({
                where: { id: anotherProperty.id },
            });
        });
    });

    describe("Error Cases", () => {
        it("should return 404 if property does not exist", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(null);

            const response = await request(app).post("/api/favorites/non-existent-property");

            expect(response.status).toBe(404);
            expect(mockFavoritesRepository.findOne).not.toHaveBeenCalled();
            expect(mockFavoritesRepository.save).not.toHaveBeenCalled();
        });

        it("should return 409 if property is already favorited", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);

            const existingFavorite = {
                id: "favorite-uuid-1",
                userId: mockUser.id,
                propertyId: existingProperty.id,
                createdAt: new Date(),
            };

            mockFavoritesRepository.findOne.mockResolvedValue(existingFavorite);

            const response = await request(app).post(`/api/favorites/${existingProperty.id}`);

            expect(response.status).toBe(409);
            expect(mockFavoritesRepository.save).not.toHaveBeenCalled();
        });

        it("should handle database errors gracefully", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);
            mockFavoritesRepository.findOne.mockResolvedValue(null);
            mockFavoritesRepository.create.mockReturnValue({});
            mockFavoritesRepository.save.mockRejectedValue(new Error("Database error"));

            const response = await request(app).post(`/api/favorites/${existingProperty.id}`);

            expect(response.status).toBe(500);
        });
    });

    describe("Authentication", () => {
        it("should require authentication", async () => {
            const appNoAuth = express();
            appNoAuth.use(express.json());
            appNoAuth.use(languageMiddleware);

            const router = Router();
            router.post("/:propertyId", FavoritesController.addFavorite);

            appNoAuth.use("/api/favorites", router);
            appNoAuth.use(errorHandler);

            const response = await request(appNoAuth).post("/api/favorites/some-property-id");

            expect(response.status).toBe(500); // Will error because req.user is undefined
        });
    });

    describe("Edge Cases", () => {
        it("should handle UUID format for propertyId", async () => {
            const validUUID = "550e8400-e29b-41d4-a716-446655440000";

            mockPropertyRepository.findOne.mockResolvedValue({
                id: validUUID,
                title: "Test Property",
            });
            mockFavoritesRepository.findOne.mockResolvedValue(null);
            mockFavoritesRepository.create.mockReturnValue({});
            mockFavoritesRepository.save.mockResolvedValue({});

            const response = await request(app).post(`/api/favorites/${validUUID}`);

            expect(response.status).toBe(201);
            expect(mockPropertyRepository.findOne).toHaveBeenCalledWith({
                where: { id: validUUID },
            });
        });

        it("should allow favoriting own property", async () => {
            const ownProperty = {
                id: "property-uuid-3",
                userId: mockUser.id, // Same as authenticated user
                title: "Own Property",
                price: 400000,
            };

            mockPropertyRepository.findOne.mockResolvedValue(ownProperty);
            mockFavoritesRepository.findOne.mockResolvedValue(null);
            mockFavoritesRepository.create.mockReturnValue({});
            mockFavoritesRepository.save.mockResolvedValue({});

            const response = await request(app).post(`/api/favorites/${ownProperty.id}`);

            expect(response.status).toBe(201);
        });
    });
});
