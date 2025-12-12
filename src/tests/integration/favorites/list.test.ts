import request from "supertest";
import express from "express";
import { AppDataSource } from "../../../config/typeorm.config";
import { UserRole, PropertyType, PropertyStatus } from "../../../enums";
import { errorHandler } from "../../../middleware/error.middleware";
import { languageMiddleware } from "../../../middleware/language.middleware";
import { FavoritesController } from "../../../controllers/favorites.controller";
import { Router } from "express";
import { validateQuery } from "../../../middleware/validation.middleware";
import { GetFavoritesQueryDto } from "../../../dtos/favorite.dto";

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

describe("GET /api/favorites", () => {
    let app: express.Application;

    const mockFavoritesRepository = {
        findAndCount: jest.fn(),
    };

    const mockUser = {
        id: "authenticated-user-uuid",
        email: "user@example.com",
        name: "Test User",
        role: UserRole.BUYER,
        verified: true,
    };

    const mockProperty1 = {
        id: "property-uuid-1",
        userId: "seller-uuid",
        title: "Beautiful House",
        description: "A beautiful house",
        price: 200000,
        propertyType: PropertyType.HOUSE,
        address: "123 Main St",
        department: "Department",
        municipality: "Municipality",
        latitude: 4.5,
        longitude: -74.5,
        bedrooms: 3,
        bathrooms: 2,
        areaSqm: 150,
        status: PropertyStatus.ACTIVE,
        images: [{ id: "img-1", url: "https://example.com/image1.jpg", publicId: "public-1" }],
    };

    const mockProperty2 = {
        id: "property-uuid-2",
        userId: "seller-uuid",
        title: "Modern Apartment",
        description: "A modern apartment",
        price: 150000,
        propertyType: PropertyType.APARTMENT,
        address: "456 Oak Ave",
        department: "Department",
        municipality: "Municipality",
        latitude: 4.6,
        longitude: -74.6,
        bedrooms: 2,
        bathrooms: 1,
        areaSqm: 80,
        status: PropertyStatus.ACTIVE,
        images: [],
    };

    const mockFavorites = [
        {
            id: "favorite-uuid-1",
            userId: mockUser.id,
            propertyId: mockProperty1.id,
            createdAt: new Date("2025-01-01"),
            property: mockProperty1,
        },
        {
            id: "favorite-uuid-2",
            userId: mockUser.id,
            propertyId: mockProperty2.id,
            createdAt: new Date("2025-01-02"),
            property: mockProperty2,
        },
    ];

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.get(
            "/",
            mockAuthenticate,
            validateQuery(GetFavoritesQueryDto),
            FavoritesController.getUserFavorites,
        );

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
        it("should return paginated favorites with default pagination", async () => {
            mockFavoritesRepository.findAndCount.mockResolvedValue([mockFavorites, 2]);

            const response = await request(app).get("/api/favorites");

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("data");
            expect(response.body).toHaveProperty("pagination");

            expect(response.body.data).toHaveLength(2);
            expect(response.body.data[0].id).toBe(mockProperty1.id);
            expect(response.body.data[1].id).toBe(mockProperty2.id);

            expect(response.body.pagination).toEqual({
                page: 1,
                limit: 10,
                total: 2,
                totalPages: 1,
            });

            expect(mockFavoritesRepository.findAndCount).toHaveBeenCalledWith({
                where: { userId: mockUser.id },
                relations: ["property", "property.images"],
                order: { createdAt: "DESC" },
                skip: 0,
                take: 10,
            });
        });

        it("should return favorites with custom pagination", async () => {
            mockFavoritesRepository.findAndCount.mockResolvedValue([[mockFavorites[0]], 5]);

            const response = await request(app).get("/api/favorites?page=2&limit=1");

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.pagination).toEqual({
                page: 2,
                limit: 1,
                total: 5,
                totalPages: 5,
            });

            expect(mockFavoritesRepository.findAndCount).toHaveBeenCalledWith({
                where: { userId: mockUser.id },
                relations: ["property", "property.images"],
                order: { createdAt: "DESC" },
                skip: 1,
                take: 1,
            });
        });

        it("should return empty array when user has no favorites", async () => {
            mockFavoritesRepository.findAndCount.mockResolvedValue([[], 0]);

            const response = await request(app).get("/api/favorites");

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([]);
            expect(response.body.pagination).toEqual({
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
            });
        });

        it("should return favorites ordered by createdAt DESC", async () => {
            const orderedFavorites = [mockFavorites[1], mockFavorites[0]]; // Reversed
            mockFavoritesRepository.findAndCount.mockResolvedValue([orderedFavorites, 2]);

            const response = await request(app).get("/api/favorites");

            expect(response.status).toBe(200);
            expect(response.body.data[0].id).toBe(mockProperty2.id); // Most recent first
            expect(response.body.data[1].id).toBe(mockProperty1.id);
        });

        it("should handle large page numbers", async () => {
            mockFavoritesRepository.findAndCount.mockResolvedValue([[], 2]);

            const response = await request(app).get("/api/favorites?page=100&limit=10");

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([]);
            expect(response.body.pagination.page).toBe(100);
        });
    });

    describe("Validation", () => {
        it("should reject invalid page parameter (0)", async () => {
            const response = await request(app).get("/api/favorites?page=0");

            expect(response.status).toBe(400);
        });

        it("should reject invalid page parameter (negative)", async () => {
            const response = await request(app).get("/api/favorites?page=-1");

            expect(response.status).toBe(400);
        });

        it("should reject invalid limit parameter (0)", async () => {
            const response = await request(app).get("/api/favorites?limit=0");

            expect(response.status).toBe(400);
        });

        it("should reject limit greater than 100", async () => {
            const response = await request(app).get("/api/favorites?limit=101");

            expect(response.status).toBe(400);
        });

        it("should reject non-numeric page", async () => {
            const response = await request(app).get("/api/favorites?page=abc");

            expect(response.status).toBe(400);
        });

        it("should reject non-numeric limit", async () => {
            const response = await request(app).get("/api/favorites?limit=xyz");

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
                validateQuery(GetFavoritesQueryDto),
                FavoritesController.getUserFavorites,
            );

            appNoAuth.use("/api/favorites", router);
            appNoAuth.use(errorHandler);

            const response = await request(appNoAuth).get("/api/favorites");

            expect(response.status).toBe(500); // Will error because req.user is undefined
        });
    });

    describe("Edge Cases", () => {
        it("should calculate total pages correctly with exact division", async () => {
            mockFavoritesRepository.findAndCount.mockResolvedValue([mockFavorites, 20]);

            const response = await request(app).get("/api/favorites?limit=10");

            expect(response.status).toBe(200);
            expect(response.body.pagination.totalPages).toBe(2);
        });

        it("should calculate total pages correctly with remainder", async () => {
            mockFavoritesRepository.findAndCount.mockResolvedValue([mockFavorites, 25]);

            const response = await request(app).get("/api/favorites?limit=10");

            expect(response.status).toBe(200);
            expect(response.body.pagination.totalPages).toBe(3);
        });

        it("should include property images in the response", async () => {
            mockFavoritesRepository.findAndCount.mockResolvedValue([[mockFavorites[0]], 1]);

            const response = await request(app).get("/api/favorites");

            expect(response.status).toBe(200);
            expect(response.body.data[0].images).toBeDefined();
            expect(response.body.data[0].images).toHaveLength(1);
        });

        it("should handle properties with no images", async () => {
            mockFavoritesRepository.findAndCount.mockResolvedValue([[mockFavorites[1]], 1]);

            const response = await request(app).get("/api/favorites");

            expect(response.status).toBe(200);
            expect(response.body.data[0].images).toBeDefined();
            expect(response.body.data[0].images).toHaveLength(0);
        });
    });
});
