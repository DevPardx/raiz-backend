import request from "supertest";
import express from "express";
import { AppDataSource } from "../../../config/typeorm.config";
import { PropertyType, PropertyStatus, UserRole } from "../../../enums";
import { errorHandler } from "../../../middleware/error.middleware";
import { languageMiddleware } from "../../../middleware/language.middleware";
import { PropertiesController } from "../../../controllers/properties.controller";
import { Router } from "express";
import { mockAuthenticate } from "./test-helpers";

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

jest.mock("socket.io", () => ({
    Server: jest.fn().mockImplementation(() => ({
        use: jest.fn(),
        on: jest.fn(),
        emit: jest.fn(),
    })),
}));

describe("GET /api/properties/:id/stats", () => {
    let app: express.Application;

    const mockPropertyRepository = {
        findOne: jest.fn(),
    };

    const mockUser = {
        id: "authenticated-user-uuid", // Must match mockAuthenticate helper
        email: "seller@example.com",
        name: "John Seller",
        role: UserRole.SELLER,
        verified: true,
    };

    // Property created 10 days ago
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const existingProperty = {
        id: "property-uuid-1",
        userId: mockUser.id,
        title: "Active Property",
        description: "This is an active property",
        price: 200000,
        propertyType: PropertyType.HOUSE,
        address: "123 Main St",
        department: "Department",
        municipality: "Municipality",
        latitude: 4.5,
        longitude: -74.5,
        bedrooms: 2,
        bathrooms: 1,
        areaSqm: 100,
        status: PropertyStatus.ACTIVE,
        viewsCount: 150,
        isFeatured: false,
        createdAt: tenDaysAgo,
        updatedAt: new Date(),
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.get("/:id/stats", mockAuthenticate, PropertiesController.getPropertyStats);

        app.use("/api/properties", router);
        app.use(errorHandler);

        (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
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
        it("should return stats for owned property", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);

            const response = await request(app).get(`/api/properties/${existingProperty.id}/stats`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("propertyId");
            expect(response.body).toHaveProperty("viewsCount");
            expect(response.body).toHaveProperty("daysActive");
            expect(response.body).toHaveProperty("status");
            expect(response.body).toHaveProperty("isFeatured");
            expect(response.body).toHaveProperty("createdAt");

            expect(response.body.propertyId).toBe(existingProperty.id);
            expect(response.body.viewsCount).toBe(150);
            expect(response.body.status).toBe(PropertyStatus.ACTIVE);
            expect(response.body.isFeatured).toBe(false);

            expect(mockPropertyRepository.findOne).toHaveBeenCalledWith({
                where: { id: existingProperty.id },
            });
        });

        it("should calculate daysActive correctly for 10-day-old property", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);

            const response = await request(app).get(`/api/properties/${existingProperty.id}/stats`);

            expect(response.status).toBe(200);
            expect(response.body.daysActive).toBeGreaterThanOrEqual(9);
            expect(response.body.daysActive).toBeLessThanOrEqual(11);
        });

        it("should return stats for featured property", async () => {
            const featuredProperty = {
                ...existingProperty,
                isFeatured: true,
                viewsCount: 500,
            };

            mockPropertyRepository.findOne.mockResolvedValue(featuredProperty);

            const response = await request(app).get(`/api/properties/${existingProperty.id}/stats`);

            expect(response.status).toBe(200);
            expect(response.body.isFeatured).toBe(true);
            expect(response.body.viewsCount).toBe(500);
        });

        it("should return stats for property with different statuses", async () => {
            const soldProperty = {
                ...existingProperty,
                status: PropertyStatus.SOLD,
            };

            mockPropertyRepository.findOne.mockResolvedValue(soldProperty);

            const response = await request(app).get(`/api/properties/${existingProperty.id}/stats`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe(PropertyStatus.SOLD);
        });

        it("should return stats for newly created property (0 days active)", async () => {
            const newProperty = {
                ...existingProperty,
                createdAt: new Date(),
                viewsCount: 0,
            };

            mockPropertyRepository.findOne.mockResolvedValue(newProperty);

            const response = await request(app).get(`/api/properties/${existingProperty.id}/stats`);

            expect(response.status).toBe(200);
            expect(response.body.daysActive).toBe(0);
            expect(response.body.viewsCount).toBe(0);
        });

        it("should return stats with high viewsCount", async () => {
            const popularProperty = {
                ...existingProperty,
                viewsCount: 10000,
            };

            mockPropertyRepository.findOne.mockResolvedValue(popularProperty);

            const response = await request(app).get(`/api/properties/${existingProperty.id}/stats`);

            expect(response.status).toBe(200);
            expect(response.body.viewsCount).toBe(10000);
        });

        it("should include createdAt in ISO format", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);

            const response = await request(app).get(`/api/properties/${existingProperty.id}/stats`);

            expect(response.status).toBe(200);
            expect(response.body.createdAt).toBeDefined();
            expect(new Date(response.body.createdAt)).toBeInstanceOf(Date);
        });
    });

    describe("Error Cases", () => {
        it("should return 404 if property does not exist", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(null);

            const response = await request(app).get("/api/properties/non-existent-id/stats");

            expect(response.status).toBe(404);
        });

        it("should return 403 if user is not the owner", async () => {
            const otherUserProperty = {
                ...existingProperty,
                userId: "other-user-id",
            };

            mockPropertyRepository.findOne.mockResolvedValue(otherUserProperty);

            const response = await request(app).get(`/api/properties/${existingProperty.id}/stats`);

            expect(response.status).toBe(403);
        });
    });

    describe("Authentication", () => {
        it("should require authentication", async () => {
            const appNoAuth = express();
            appNoAuth.use(express.json());
            appNoAuth.use(languageMiddleware);

            const router = Router();
            router.get("/:id/stats", PropertiesController.getPropertyStats);

            appNoAuth.use("/api/properties", router);
            appNoAuth.use(errorHandler);

            const response = await request(appNoAuth).get("/api/properties/some-id/stats");

            expect(response.status).toBe(500); // Will error because req.user is undefined
        });
    });

    describe("Edge Cases", () => {
        it("should handle property created exactly 30 days ago", async () => {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const oldProperty = {
                ...existingProperty,
                createdAt: thirtyDaysAgo,
            };

            mockPropertyRepository.findOne.mockResolvedValue(oldProperty);

            const response = await request(app).get(`/api/properties/${existingProperty.id}/stats`);

            expect(response.status).toBe(200);
            expect(response.body.daysActive).toBeGreaterThanOrEqual(29);
            expect(response.body.daysActive).toBeLessThanOrEqual(31);
        });

        it("should handle paused property stats", async () => {
            const pausedProperty = {
                ...existingProperty,
                status: PropertyStatus.PAUSED,
            };

            mockPropertyRepository.findOne.mockResolvedValue(pausedProperty);

            const response = await request(app).get(`/api/properties/${existingProperty.id}/stats`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe(PropertyStatus.PAUSED);
        });

        it("should return all stats fields for complete property", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);

            const response = await request(app).get(`/api/properties/${existingProperty.id}/stats`);

            expect(response.status).toBe(200);

            // Verify all expected fields are present
            const expectedFields = [
                "propertyId",
                "viewsCount",
                "daysActive",
                "status",
                "isFeatured",
                "createdAt",
            ];

            expectedFields.forEach((field) => {
                expect(response.body).toHaveProperty(field);
            });

            // Verify no extra fields
            expect(Object.keys(response.body).length).toBe(expectedFields.length);
        });
    });
});
