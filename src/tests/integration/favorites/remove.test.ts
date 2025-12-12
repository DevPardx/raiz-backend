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

describe("DELETE /api/favorites/:propertyId", () => {
    let app: express.Application;

    const mockFavoritesRepository = {
        findOne: jest.fn(),
        remove: jest.fn(),
    };

    const mockUser = {
        id: "authenticated-user-uuid",
        email: "user@example.com",
        name: "Test User",
        role: UserRole.BUYER,
        verified: true,
    };

    const existingFavorite = {
        id: "favorite-uuid-1",
        userId: mockUser.id,
        propertyId: "property-uuid-1",
        createdAt: new Date(),
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.delete("/:propertyId", mockAuthenticate, FavoritesController.removeFavorite);

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
        it("should remove favorite successfully", async () => {
            mockFavoritesRepository.findOne.mockResolvedValue(existingFavorite);
            mockFavoritesRepository.remove.mockResolvedValue(existingFavorite);

            const response = await request(app).delete(
                `/api/favorites/${existingFavorite.propertyId}`,
            );

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();

            expect(mockFavoritesRepository.findOne).toHaveBeenCalledWith({
                where: { userId: mockUser.id, propertyId: existingFavorite.propertyId },
            });

            expect(mockFavoritesRepository.remove).toHaveBeenCalledWith(existingFavorite);
        });

        it("should work with different property IDs", async () => {
            const anotherFavorite = {
                id: "favorite-uuid-2",
                userId: mockUser.id,
                propertyId: "property-uuid-2",
                createdAt: new Date(),
            };

            mockFavoritesRepository.findOne.mockResolvedValue(anotherFavorite);
            mockFavoritesRepository.remove.mockResolvedValue(anotherFavorite);

            const response = await request(app).delete(
                `/api/favorites/${anotherFavorite.propertyId}`,
            );

            expect(response.status).toBe(200);
            expect(mockFavoritesRepository.findOne).toHaveBeenCalledWith({
                where: { userId: mockUser.id, propertyId: anotherFavorite.propertyId },
            });
        });
    });

    describe("Error Cases", () => {
        it("should return 404 if favorite does not exist", async () => {
            mockFavoritesRepository.findOne.mockResolvedValue(null);

            const response = await request(app).delete("/api/favorites/non-existent-property");

            expect(response.status).toBe(404);
            expect(mockFavoritesRepository.remove).not.toHaveBeenCalled();
        });

        it("should handle database errors gracefully", async () => {
            mockFavoritesRepository.findOne.mockResolvedValue(existingFavorite);
            mockFavoritesRepository.remove.mockRejectedValue(new Error("Database error"));

            const response = await request(app).delete(
                `/api/favorites/${existingFavorite.propertyId}`,
            );

            expect(response.status).toBe(500);
        });

        it("should not remove favorites belonging to other users", async () => {
            const otherUserFavorite = {
                id: "favorite-uuid-3",
                userId: "other-user-uuid",
                propertyId: "property-uuid-1",
                createdAt: new Date(),
            };

            // Since we're checking for userId in the query, this won't be found
            mockFavoritesRepository.findOne.mockResolvedValue(null);

            const response = await request(app).delete(
                `/api/favorites/${otherUserFavorite.propertyId}`,
            );

            expect(response.status).toBe(404);
            expect(mockFavoritesRepository.remove).not.toHaveBeenCalled();
        });
    });

    describe("Authentication", () => {
        it("should require authentication", async () => {
            const appNoAuth = express();
            appNoAuth.use(express.json());
            appNoAuth.use(languageMiddleware);

            const router = Router();
            router.delete("/:propertyId", FavoritesController.removeFavorite);

            appNoAuth.use("/api/favorites", router);
            appNoAuth.use(errorHandler);

            const response = await request(appNoAuth).delete("/api/favorites/some-property-id");

            expect(response.status).toBe(500); // Will error because req.user is undefined
        });
    });

    describe("Edge Cases", () => {
        it("should handle UUID format for propertyId", async () => {
            const validUUID = "550e8400-e29b-41d4-a716-446655440000";

            const favorite = {
                id: "favorite-uuid-4",
                userId: mockUser.id,
                propertyId: validUUID,
                createdAt: new Date(),
            };

            mockFavoritesRepository.findOne.mockResolvedValue(favorite);
            mockFavoritesRepository.remove.mockResolvedValue(favorite);

            const response = await request(app).delete(`/api/favorites/${validUUID}`);

            expect(response.status).toBe(200);
            expect(mockFavoritesRepository.findOne).toHaveBeenCalledWith({
                where: { userId: mockUser.id, propertyId: validUUID },
            });
        });

        it("should handle removing favorite that was just added", async () => {
            mockFavoritesRepository.findOne.mockResolvedValue(existingFavorite);
            mockFavoritesRepository.remove.mockResolvedValue(existingFavorite);

            const response = await request(app).delete(
                `/api/favorites/${existingFavorite.propertyId}`,
            );

            expect(response.status).toBe(200);
        });
    });
});
