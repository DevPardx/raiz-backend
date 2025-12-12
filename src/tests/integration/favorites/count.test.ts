import request from "supertest";
import express from "express";
import { AppDataSource } from "../../../config/typeorm.config";
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

describe("GET /api/favorites/:propertyId/count", () => {
    let app: express.Application;

    const mockFavoritesRepository = {
        count: jest.fn(),
    };

    const popularProperty = {
        id: "property-uuid-1",
        title: "Popular Property",
    };

    const unpopularProperty = {
        id: "property-uuid-2",
        title: "Unpopular Property",
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        // Note: This route does NOT require authentication
        router.get("/:propertyId/count", FavoritesController.getFavoriteCount);

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
        it("should return count of favorites for a property", async () => {
            mockFavoritesRepository.count.mockResolvedValue(5);

            const response = await request(app).get(`/api/favorites/${popularProperty.id}/count`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ count: 5 });

            expect(mockFavoritesRepository.count).toHaveBeenCalledWith({
                where: { propertyId: popularProperty.id },
            });
        });

        it("should return 0 for property with no favorites", async () => {
            mockFavoritesRepository.count.mockResolvedValue(0);

            const response = await request(app).get(`/api/favorites/${unpopularProperty.id}/count`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ count: 0 });

            expect(mockFavoritesRepository.count).toHaveBeenCalledWith({
                where: { propertyId: unpopularProperty.id },
            });
        });

        it("should work with different property IDs", async () => {
            const propertyId1 = "property-uuid-3";
            const propertyId2 = "property-uuid-4";

            // First property - 10 favorites
            mockFavoritesRepository.count.mockResolvedValue(10);
            const response1 = await request(app).get(`/api/favorites/${propertyId1}/count`);
            expect(response1.status).toBe(200);
            expect(response1.body.count).toBe(10);

            // Second property - 3 favorites
            mockFavoritesRepository.count.mockResolvedValue(3);
            const response2 = await request(app).get(`/api/favorites/${propertyId2}/count`);
            expect(response2.status).toBe(200);
            expect(response2.body.count).toBe(3);
        });

        it("should handle large favorite counts", async () => {
            mockFavoritesRepository.count.mockResolvedValue(10000);

            const response = await request(app).get(`/api/favorites/${popularProperty.id}/count`);

            expect(response.status).toBe(200);
            expect(response.body.count).toBe(10000);
        });
    });

    describe("Public Access", () => {
        it("should NOT require authentication", async () => {
            mockFavoritesRepository.count.mockResolvedValue(7);

            const response = await request(app).get(`/api/favorites/${popularProperty.id}/count`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ count: 7 });
        });

        it("should be accessible to anonymous users", async () => {
            mockFavoritesRepository.count.mockResolvedValue(15);

            // Create app without authentication
            const appNoAuth = express();
            appNoAuth.use(express.json());
            appNoAuth.use(languageMiddleware);

            const router = Router();
            router.get("/:propertyId/count", FavoritesController.getFavoriteCount);

            appNoAuth.use("/api/favorites", router);
            appNoAuth.use(errorHandler);

            const response = await request(appNoAuth).get(
                `/api/favorites/${popularProperty.id}/count`,
            );

            expect(response.status).toBe(200);
            expect(response.body.count).toBe(15);
        });
    });

    describe("Edge Cases", () => {
        it("should handle UUID format for propertyId", async () => {
            const validUUID = "550e8400-e29b-41d4-a716-446655440000";

            mockFavoritesRepository.count.mockResolvedValue(2);

            const response = await request(app).get(`/api/favorites/${validUUID}/count`);

            expect(response.status).toBe(200);
            expect(response.body.count).toBe(2);
            expect(mockFavoritesRepository.count).toHaveBeenCalledWith({
                where: { propertyId: validUUID },
            });
        });

        it("should return 0 for non-existent property", async () => {
            mockFavoritesRepository.count.mockResolvedValue(0);

            const response = await request(app).get("/api/favorites/non-existent-id/count");

            expect(response.status).toBe(200);
            expect(response.body.count).toBe(0);
        });

        it("should handle database errors gracefully", async () => {
            mockFavoritesRepository.count.mockRejectedValue(new Error("Database error"));

            const response = await request(app).get(`/api/favorites/${popularProperty.id}/count`);

            expect(response.status).toBe(500);
        });

        it("should return count regardless of property ownership", async () => {
            // Count should work for any property, not just the current user's
            mockFavoritesRepository.count.mockResolvedValue(8);

            const response = await request(app).get(`/api/favorites/${popularProperty.id}/count`);

            expect(response.status).toBe(200);
            expect(response.body.count).toBe(8);
        });

        it("should return consistent results for multiple requests", async () => {
            mockFavoritesRepository.count.mockResolvedValue(12);

            const response1 = await request(app).get(`/api/favorites/${popularProperty.id}/count`);
            const response2 = await request(app).get(`/api/favorites/${popularProperty.id}/count`);

            expect(response1.status).toBe(200);
            expect(response2.status).toBe(200);
            expect(response1.body).toEqual(response2.body);
            expect(response1.body.count).toBe(12);
        });

        it("should handle count = 1 correctly", async () => {
            mockFavoritesRepository.count.mockResolvedValue(1);

            const response = await request(app).get(`/api/favorites/${popularProperty.id}/count`);

            expect(response.status).toBe(200);
            expect(response.body.count).toBe(1);
        });
    });
});
