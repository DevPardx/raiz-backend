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

jest.mock("../../../utils/cloudinary.util", () => ({
    uploadMultipleImages: jest.fn(),
    deleteMultipleImages: jest.fn(),
}));

jest.mock("../../../config/cloudinary.config", () => ({
    cloudinary: {},
}));

jest.mock("../../../config/redis.config", () => ({
    redisClient: {
        get: jest.fn(),
        set: jest.fn(),
        setEx: jest.fn(),
        del: jest.fn(),
        keys: jest.fn(),
        exists: jest.fn(),
        expire: jest.fn(),
        isOpen: false,
    },
    connectRedis: jest.fn(),
    disconnectRedis: jest.fn(),
}));

jest.mock("../../../utils/cache.util", () => ({
    CacheUtil: {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
        del: jest.fn().mockResolvedValue(undefined),
        delMany: jest.fn().mockResolvedValue(undefined),
        invalidatePattern: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue(false),
        expire: jest.fn().mockResolvedValue(undefined),
    },
}));

import { deleteMultipleImages } from "../../../utils/cloudinary.util";

describe("DELETE /api/properties/:id", () => {
    let app: express.Application;

    const mockPropertyRepository = {
        findOne: jest.fn(),
        remove: jest.fn(),
    };

    const mockUser = {
        id: "authenticated-user-uuid", // Must match mockAuthenticate helper
        email: "seller@example.com",
        name: "John Seller",
        role: UserRole.SELLER,
        verified: true,
    };

    const existingProperty = {
        id: "property-uuid-1",
        userId: mockUser.id,
        title: "Property to Delete",
        description: "This property will be deleted",
        price: 200000,
        propertyType: PropertyType.HOUSE,
        address: "123 Delete St",
        department: "Department",
        municipality: "Municipality",
        latitude: 4.5,
        longitude: -74.5,
        bedrooms: 2,
        bathrooms: 1,
        areaSqm: 100,
        status: PropertyStatus.ACTIVE,
        viewsCount: 10,
        isFeatured: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [
            {
                id: "image-uuid-1",
                url: "https://cloudinary.com/image1.jpg",
                cloudinaryId: "properties/image1",
                displayOrder: 0,
            },
            {
                id: "image-uuid-2",
                url: "https://cloudinary.com/image2.jpg",
                cloudinaryId: "properties/image2",
                displayOrder: 1,
            },
        ],
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.delete("/:id", mockAuthenticate, PropertiesController.deleteProperty);

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
        it("should delete property with images", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);
            mockPropertyRepository.remove.mockResolvedValue(existingProperty);
            (deleteMultipleImages as jest.Mock).mockResolvedValue(undefined);

            const response = await request(app).delete(`/api/properties/${existingProperty.id}`);

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();

            // Verify images were deleted from Cloudinary
            expect(deleteMultipleImages).toHaveBeenCalledWith([
                "properties/image1",
                "properties/image2",
            ]);

            // Verify property was removed from database
            expect(mockPropertyRepository.remove).toHaveBeenCalledWith(existingProperty);

            expect(mockPropertyRepository.findOne).toHaveBeenCalledWith({
                where: { id: existingProperty.id },
                relations: ["images"],
            });
        });

        it("should delete property without images", async () => {
            const propertyWithoutImages = {
                ...existingProperty,
                images: [],
            };

            mockPropertyRepository.findOne.mockResolvedValue(propertyWithoutImages);
            mockPropertyRepository.remove.mockResolvedValue(propertyWithoutImages);

            const response = await request(app).delete(`/api/properties/${existingProperty.id}`);

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();

            // Should not try to delete images from Cloudinary
            expect(deleteMultipleImages).not.toHaveBeenCalled();

            // Verify property was removed
            expect(mockPropertyRepository.remove).toHaveBeenCalledWith(propertyWithoutImages);
        });

        it("should delete property and cascade delete images from database", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);
            mockPropertyRepository.remove.mockResolvedValue(existingProperty);
            (deleteMultipleImages as jest.Mock).mockResolvedValue(undefined);

            const response = await request(app).delete(`/api/properties/${existingProperty.id}`);

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();

            // Images should be cascade deleted from database automatically via onDelete: "CASCADE"
            expect(mockPropertyRepository.remove).toHaveBeenCalled();
        });
    });

    describe("Error Cases", () => {
        it("should return 404 if property does not exist", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(null);

            const response = await request(app).delete("/api/properties/non-existent-id");

            expect(response.status).toBe(404);
            expect(mockPropertyRepository.remove).not.toHaveBeenCalled();
            expect(deleteMultipleImages).not.toHaveBeenCalled();
        });

        it("should return 403 if user is not the owner", async () => {
            const otherUserProperty = {
                ...existingProperty,
                userId: "other-user-id",
            };

            mockPropertyRepository.findOne.mockResolvedValue(otherUserProperty);

            const response = await request(app).delete(`/api/properties/${existingProperty.id}`);

            expect(response.status).toBe(403);
            expect(mockPropertyRepository.remove).not.toHaveBeenCalled();
            expect(deleteMultipleImages).not.toHaveBeenCalled();
        });

        it("should handle Cloudinary deletion errors gracefully", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);
            (deleteMultipleImages as jest.Mock).mockRejectedValue(
                new Error("Cloudinary deletion failed"),
            );

            const response = await request(app).delete(`/api/properties/${existingProperty.id}`);

            // Should propagate the error
            expect(response.status).toBe(500);
            expect(mockPropertyRepository.remove).not.toHaveBeenCalled();
        });
    });

    describe("Authentication", () => {
        it("should require authentication", async () => {
            const appNoAuth = express();
            appNoAuth.use(express.json());
            appNoAuth.use(languageMiddleware);

            const router = Router();
            router.delete("/:id", PropertiesController.deleteProperty);

            appNoAuth.use("/api/properties", router);
            appNoAuth.use(errorHandler);

            const response = await request(appNoAuth).delete("/api/properties/some-id");

            expect(response.status).toBe(500); // Will error because req.user is undefined
        });
    });

    describe("Edge Cases", () => {
        it("should handle property with many images", async () => {
            const propertyWithManyImages = {
                ...existingProperty,
                images: Array.from({ length: 10 }, (_, i) => ({
                    id: `image-uuid-${i}`,
                    url: `https://cloudinary.com/image${i}.jpg`,
                    cloudinaryId: `properties/image${i}`,
                    displayOrder: i,
                })),
            };

            mockPropertyRepository.findOne.mockResolvedValue(propertyWithManyImages);
            mockPropertyRepository.remove.mockResolvedValue(propertyWithManyImages);
            (deleteMultipleImages as jest.Mock).mockResolvedValue(undefined);

            const response = await request(app).delete(`/api/properties/${existingProperty.id}`);

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();
            expect(deleteMultipleImages).toHaveBeenCalledWith(
                Array.from({ length: 10 }, (_, i) => `properties/image${i}`),
            );
        });

        it("should delete sold property", async () => {
            const soldProperty = {
                ...existingProperty,
                status: PropertyStatus.SOLD,
            };

            mockPropertyRepository.findOne.mockResolvedValue(soldProperty);
            mockPropertyRepository.remove.mockResolvedValue(soldProperty);
            (deleteMultipleImages as jest.Mock).mockResolvedValue(undefined);

            const response = await request(app).delete(`/api/properties/${existingProperty.id}`);

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();
            expect(mockPropertyRepository.remove).toHaveBeenCalled();
        });

        it("should delete paused property", async () => {
            const pausedProperty = {
                ...existingProperty,
                status: PropertyStatus.PAUSED,
            };

            mockPropertyRepository.findOne.mockResolvedValue(pausedProperty);
            mockPropertyRepository.remove.mockResolvedValue(pausedProperty);
            (deleteMultipleImages as jest.Mock).mockResolvedValue(undefined);

            const response = await request(app).delete(`/api/properties/${existingProperty.id}`);

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();
            expect(mockPropertyRepository.remove).toHaveBeenCalled();
        });
    });
});
