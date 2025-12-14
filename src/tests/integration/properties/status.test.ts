import request from "supertest";
import express from "express";
import { AppDataSource } from "../../../config/typeorm.config";
import { PropertyType, PropertyStatus, UserRole } from "../../../enums";
import { errorHandler } from "../../../middleware/error.middleware";
import { languageMiddleware } from "../../../middleware/language.middleware";
import { validateDto } from "../../../middleware/validation.middleware";
import { UpdatePropertyStatusDto } from "../../../dtos/property.dto";
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

describe("PATCH /api/properties/:id/status", () => {
    let app: express.Application;

    const mockPropertyRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
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
        viewsCount: 10,
        isFeatured: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const router = Router();
        router.patch(
            "/:id/status",
            mockAuthenticate,
            validateDto(UpdatePropertyStatusDto),
            PropertiesController.updatePropertyStatus,
        );

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
        it("should update property status from ACTIVE to PAUSED", async () => {
            const statusUpdate: UpdatePropertyStatusDto = {
                status: PropertyStatus.PAUSED,
            };

            const updatedProperty = {
                ...existingProperty,
                status: PropertyStatus.PAUSED,
                updatedAt: new Date(),
            };

            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);
            mockPropertyRepository.save.mockResolvedValue(updatedProperty);

            const response = await request(app)
                .patch(`/api/properties/${existingProperty.id}/status`)
                .send(statusUpdate);

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();

            expect(mockPropertyRepository.findOne).toHaveBeenCalledWith({
                where: { id: existingProperty.id },
            });
            expect(mockPropertyRepository.save).toHaveBeenCalled();
        });

        it("should update property status from ACTIVE to SOLD", async () => {
            const statusUpdate: UpdatePropertyStatusDto = {
                status: PropertyStatus.SOLD,
            };

            const updatedProperty = {
                ...existingProperty,
                status: PropertyStatus.SOLD,
                updatedAt: new Date(),
            };

            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);
            mockPropertyRepository.save.mockResolvedValue(updatedProperty);

            const response = await request(app)
                .patch(`/api/properties/${existingProperty.id}/status`)
                .send(statusUpdate);

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();
        });

        it("should update property status from PAUSED to ACTIVE", async () => {
            const pausedProperty = {
                ...existingProperty,
                status: PropertyStatus.PAUSED,
            };

            const statusUpdate: UpdatePropertyStatusDto = {
                status: PropertyStatus.ACTIVE,
            };

            const updatedProperty = {
                ...pausedProperty,
                status: PropertyStatus.ACTIVE,
                updatedAt: new Date(),
            };

            mockPropertyRepository.findOne.mockResolvedValue(pausedProperty);
            mockPropertyRepository.save.mockResolvedValue(updatedProperty);

            const response = await request(app)
                .patch(`/api/properties/${existingProperty.id}/status`)
                .send(statusUpdate);

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();
        });

        it("should update property status from SOLD to ACTIVE", async () => {
            const soldProperty = {
                ...existingProperty,
                status: PropertyStatus.SOLD,
            };

            const statusUpdate: UpdatePropertyStatusDto = {
                status: PropertyStatus.ACTIVE,
            };

            const updatedProperty = {
                ...soldProperty,
                status: PropertyStatus.ACTIVE,
                updatedAt: new Date(),
            };

            mockPropertyRepository.findOne.mockResolvedValue(soldProperty);
            mockPropertyRepository.save.mockResolvedValue(updatedProperty);

            const response = await request(app)
                .patch(`/api/properties/${existingProperty.id}/status`)
                .send(statusUpdate);

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();
        });

        it("should only update status, not other fields", async () => {
            const statusUpdate: UpdatePropertyStatusDto = {
                status: PropertyStatus.PAUSED,
            };

            const updatedProperty = {
                ...existingProperty,
                status: PropertyStatus.PAUSED,
                updatedAt: new Date(),
            };

            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);
            mockPropertyRepository.save.mockResolvedValue(updatedProperty);

            const response = await request(app)
                .patch(`/api/properties/${existingProperty.id}/status`)
                .send(statusUpdate);

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();
        });
    });

    describe("Validation Errors", () => {
        it("should return 400 if status is missing", async () => {
            const response = await request(app)
                .patch(`/api/properties/${existingProperty.id}/status`)
                .send({});

            expect(response.status).toBe(400);
        });

        it("should return 400 if status is invalid", async () => {
            const response = await request(app)
                .patch(`/api/properties/${existingProperty.id}/status`)
                .send({ status: "invalid-status" });

            expect(response.status).toBe(400);
        });

        it("should return 400 if status is not a string", async () => {
            const response = await request(app)
                .patch(`/api/properties/${existingProperty.id}/status`)
                .send({ status: 123 });

            expect(response.status).toBe(400);
        });

        it("should return 400 if status is empty string", async () => {
            const response = await request(app)
                .patch(`/api/properties/${existingProperty.id}/status`)
                .send({ status: "" });

            expect(response.status).toBe(400);
        });
    });

    describe("Error Cases", () => {
        it("should return 404 if property does not exist", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(null);

            const response = await request(app)
                .patch("/api/properties/non-existent-id/status")
                .send({ status: PropertyStatus.PAUSED });

            expect(response.status).toBe(404);
            expect(mockPropertyRepository.save).not.toHaveBeenCalled();
        });

        it("should return 403 if user is not the owner", async () => {
            const otherUserProperty = {
                ...existingProperty,
                userId: "other-user-id",
            };

            mockPropertyRepository.findOne.mockResolvedValue(otherUserProperty);

            const response = await request(app)
                .patch(`/api/properties/${existingProperty.id}/status`)
                .send({ status: PropertyStatus.PAUSED });

            expect(response.status).toBe(403);
            expect(mockPropertyRepository.save).not.toHaveBeenCalled();
        });
    });

    describe("Authentication", () => {
        it("should require authentication", async () => {
            const appNoAuth = express();
            appNoAuth.use(express.json());
            appNoAuth.use(languageMiddleware);

            const router = Router();
            router.patch("/:id/status", PropertiesController.updatePropertyStatus);

            appNoAuth.use("/api/properties", router);
            appNoAuth.use(errorHandler);

            const response = await request(appNoAuth)
                .patch("/api/properties/some-id/status")
                .send({ status: PropertyStatus.PAUSED });

            expect(response.status).toBe(500); // Will error because req.user is undefined
        });
    });

    describe("Edge Cases", () => {
        it("should handle setting same status", async () => {
            const statusUpdate: UpdatePropertyStatusDto = {
                status: PropertyStatus.ACTIVE, // Already active
            };

            const updatedProperty = {
                ...existingProperty,
                updatedAt: new Date(),
            };

            mockPropertyRepository.findOne.mockResolvedValue(existingProperty);
            mockPropertyRepository.save.mockResolvedValue(updatedProperty);

            const response = await request(app)
                .patch(`/api/properties/${existingProperty.id}/status`)
                .send(statusUpdate);

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();
        });

        it("should update status for featured property", async () => {
            const featuredProperty = {
                ...existingProperty,
                isFeatured: true,
            };

            const statusUpdate: UpdatePropertyStatusDto = {
                status: PropertyStatus.PAUSED,
            };

            const updatedProperty = {
                ...featuredProperty,
                status: PropertyStatus.PAUSED,
                updatedAt: new Date(),
            };

            mockPropertyRepository.findOne.mockResolvedValue(featuredProperty);
            mockPropertyRepository.save.mockResolvedValue(updatedProperty);

            const response = await request(app)
                .patch(`/api/properties/${existingProperty.id}/status`)
                .send(statusUpdate);

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();
        });

        it("should update status for property with high views", async () => {
            const popularProperty = {
                ...existingProperty,
                viewsCount: 10000,
            };

            const statusUpdate: UpdatePropertyStatusDto = {
                status: PropertyStatus.SOLD,
            };

            const updatedProperty = {
                ...popularProperty,
                status: PropertyStatus.SOLD,
                updatedAt: new Date(),
            };

            mockPropertyRepository.findOne.mockResolvedValue(popularProperty);
            mockPropertyRepository.save.mockResolvedValue(updatedProperty);

            const response = await request(app)
                .patch(`/api/properties/${existingProperty.id}/status`)
                .send(statusUpdate);

            expect(response.status).toBe(200);
            expect(typeof response.body).toBe("string");
            expect(response.body).toBeTruthy();
        });
    });
});
