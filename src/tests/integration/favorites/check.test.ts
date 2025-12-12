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

describe("GET /api/favorites/:propertyId/check", () => {
    let app: express.Application;

    const mockFavoritesRepository = {
        findOne: jest.fn(),
    };

    const mockUser = {
        id: "authenticated-user-uuid",
        email: "user@example.com",
        name: "Test User",
        role: UserRole.BUYER,
        verified: true,
    };

    const favoritedProperty = {
        id: "property-uuid-1",
        userId: "seller-uuid",
        title: "Favorited Property",
    };

    const nonFavoritedProperty = {
        id: "property-uuid-2",
        userId: "seller-uuid",
        title: "Non-Favorited Property",
    };

    const existingFavorite = {
        id: "favorite-uuid-1",
        userId: mockUser.id,
        propertyId: favoritedProperty.id,
        createdAt: new Date(),
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.get("/:propertyId/check", mockAuthenticate, FavoritesController.checkIfFavorited);

        app.use("/api/favorites", router);
        app.use(errorHandler);

        (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            if (entity.name === "Favorites") {
                return mockFavoritesRepository;
            }
            return {};
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Success Cases", () => {
        it("should return true when property is favorited", async () => {
            mockFavoritesRepository.findOne.mockResolvedValue(existingFavorite);

            const response = await request(app).get(`/api/favorites/${favoritedProperty.id}/check`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ isFavorited: true });

            expect(mockFavoritesRepository.findOne).toHaveBeenCalledWith({
                where: { userId: mockUser.id, propertyId: favoritedProperty.id },
            });
        });

        it("should return false when property is not favorited", async () => {
            mockFavoritesRepository.findOne.mockResolvedValue(null);

            const response = await request(app).get(
                `/api/favorites/${nonFavoritedProperty.id}/check`,
            );

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ isFavorited: false });

            expect(mockFavoritesRepository.findOne).toHaveBeenCalledWith({
                where: { userId: mockUser.id, propertyId: nonFavoritedProperty.id },
            });
        });

        it("should work with different property IDs", async () => {
            const propertyId1 = "property-uuid-3";
            const propertyId2 = "property-uuid-4";

            // First check - favorited
            mockFavoritesRepository.findOne.mockResolvedValue({ id: "fav-1" });
            const response1 = await request(app).get(`/api/favorites/${propertyId1}/check`);
            expect(response1.status).toBe(200);
            expect(response1.body.isFavorited).toBe(true);

            // Second check - not favorited
            mockFavoritesRepository.findOne.mockResolvedValue(null);
            const response2 = await request(app).get(`/api/favorites/${propertyId2}/check`);
            expect(response2.status).toBe(200);
            expect(response2.body.isFavorited).toBe(false);
        });
    });

    describe("Authentication", () => {
        it("should require authentication", async () => {
            const appNoAuth = express();
            appNoAuth.use(express.json());
            appNoAuth.use(languageMiddleware);

            const router = Router();
            router.get("/:propertyId/check", FavoritesController.checkIfFavorited);

            appNoAuth.use("/api/favorites", router);
            appNoAuth.use(errorHandler);

            const response = await request(appNoAuth).get("/api/favorites/some-property/check");

            expect(response.status).toBe(500); // Will error because req.user is undefined
        });
    });

    describe("Edge Cases", () => {
        it("should handle UUID format for propertyId", async () => {
            const validUUID = "550e8400-e29b-41d4-a716-446655440000";

            mockFavoritesRepository.findOne.mockResolvedValue(null);

            const response = await request(app).get(`/api/favorites/${validUUID}/check`);

            expect(response.status).toBe(200);
            expect(response.body.isFavorited).toBe(false);
            expect(mockFavoritesRepository.findOne).toHaveBeenCalledWith({
                where: { userId: mockUser.id, propertyId: validUUID },
            });
        });

        it("should return false for non-existent property", async () => {
            mockFavoritesRepository.findOne.mockResolvedValue(null);

            const response = await request(app).get("/api/favorites/non-existent-id/check");

            expect(response.status).toBe(200);
            expect(response.body.isFavorited).toBe(false);
        });

        it("should handle database errors gracefully", async () => {
            mockFavoritesRepository.findOne.mockRejectedValue(new Error("Database error"));

            const response = await request(app).get(`/api/favorites/${favoritedProperty.id}/check`);

            expect(response.status).toBe(500);
        });

        it("should only check for current user's favorites", async () => {
            // Simulate another user having this property favorited
            // But since we check with current user's ID, should return false
            mockFavoritesRepository.findOne.mockResolvedValue(null);

            const response = await request(app).get(`/api/favorites/${favoritedProperty.id}/check`);

            expect(response.status).toBe(200);
            expect(response.body.isFavorited).toBe(false);

            // Verify the query included the current user's ID
            expect(mockFavoritesRepository.findOne).toHaveBeenCalledWith({
                where: { userId: mockUser.id, propertyId: favoritedProperty.id },
            });
        });

        it("should return consistent results for multiple checks", async () => {
            mockFavoritesRepository.findOne.mockResolvedValue(existingFavorite);

            const response1 = await request(app).get(
                `/api/favorites/${favoritedProperty.id}/check`,
            );
            const response2 = await request(app).get(
                `/api/favorites/${favoritedProperty.id}/check`,
            );

            expect(response1.status).toBe(200);
            expect(response2.status).toBe(200);
            expect(response1.body).toEqual(response2.body);
        });
    });
});
