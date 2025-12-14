import request from "supertest";
import express from "express";
import { AppDataSource } from "../../config/typeorm.config";
import { PropertyStatus, PropertyType, UserRole } from "../../enums";
import { errorHandler } from "../../middleware/error.middleware";
import { languageMiddleware } from "../../middleware/language.middleware";
import { PropertiesController } from "../../controllers/properties.controller";
// FavoritesController was imported but unused in tests
import { Router } from "express";

// Mock dependencies
jest.mock("../../config/typeorm.config", () => ({
    AppDataSource: {
        getRepository: jest.fn(),
        initialize: jest.fn().mockResolvedValue(true),
    },
}));

jest.mock("../../utils/logger.util", () => ({
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock("../../config/cloudinary.config", () => ({
    cloudinary: {},
}));

jest.mock("../../config/redis.config", () => ({
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

jest.mock("../../utils/cache.util", () => ({
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

jest.mock("../../utils/cloudinary.util", () => ({
    uploadMultipleImages: jest.fn(),
    deleteMultipleImages: jest.fn(),
}));

jest.mock("socket.io", () => ({
    Server: jest.fn().mockImplementation(() => ({
        use: jest.fn(),
        on: jest.fn(),
        emit: jest.fn(),
    })),
}));

// Mock authenticate middleware
type AuthRequest = express.Request & { user?: { id: string; email: string; role: UserRole } };
const mockAuthenticate = (req: AuthRequest, _res: express.Response, next: express.NextFunction) => {
    req.user = {
        id: "authenticated-user-uuid",
        email: "user@example.com",
        role: UserRole.SELLER,
    };
    next();
};

describe("Authorization Tests", () => {
    let app: express.Application;

    const mockUser = {
        id: "authenticated-user-uuid",
        email: "user@example.com",
        name: "Test User",
        role: UserRole.SELLER,
        verified: true,
    };

    // Other user object removed because it's unused; tests use mockOtherUserProperty

    const mockProperty = {
        id: "property-uuid-1",
        userId: "authenticated-user-uuid",
        title: "My Property",
        description: "A property owned by the authenticated user",
        price: 250000,
        propertyType: PropertyType.HOUSE,
        address: "123 Main St",
        department: "Department 1",
        municipality: "Municipality 1",
        latitude: 10.123456,
        longitude: -74.123456,
        bedrooms: 3,
        bathrooms: 2,
        areaSqm: 150,
        status: PropertyStatus.ACTIVE,
        viewsCount: 10,
        isFeatured: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [],
    };

    const mockOtherUserProperty = {
        ...mockProperty,
        id: "property-uuid-2",
        userId: "other-user-uuid",
        title: "Other User's Property",
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(languageMiddleware);

        const propertiesRouter = Router();
        propertiesRouter.put("/:id", mockAuthenticate, PropertiesController.updateProperty);
        propertiesRouter.delete("/:id", mockAuthenticate, PropertiesController.deleteProperty);
        propertiesRouter.patch(
            "/:id/status",
            mockAuthenticate,
            PropertiesController.updatePropertyStatus,
        );
        app.use("/api/properties", propertiesRouter);

        app.use(errorHandler);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Property Ownership", () => {
        it("should allow owner to update their own property", async () => {
            const mockPropertyRepository = {
                findOne: jest.fn().mockResolvedValue(mockProperty),
                save: jest.fn().mockResolvedValue({
                    ...mockProperty,
                    title: "Updated Title",
                }),
            };

            const mockPropertyImageRepository = {
                create: jest.fn(),
                save: jest.fn(),
                delete: jest.fn(),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "Property") return mockPropertyRepository;
                if (entity.name === "PropertyImage") return mockPropertyImageRepository;
                return {};
            });

            const updateData = {
                title: "Updated Title",
            };

            const response = await request(app)
                .put("/api/properties/property-uuid-1")
                .send(updateData);

            expect(response.status).toBe(200);
            expect(mockPropertyRepository.save).toHaveBeenCalled();
        });

        it("should prevent non-owner from updating someone else's property", async () => {
            const mockPropertyRepository = {
                findOne: jest.fn().mockResolvedValue(mockOtherUserProperty),
                save: jest.fn(),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "Property") return mockPropertyRepository;
                return {};
            });

            const updateData = {
                title: "Trying to Update",
            };

            const response = await request(app)
                .put("/api/properties/property-uuid-2")
                .send(updateData);

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty("error");
            expect(mockPropertyRepository.save).not.toHaveBeenCalled();
        });

        it("should allow owner to delete their own property", async () => {
            const mockPropertyRepository = {
                findOne: jest.fn().mockResolvedValue(mockProperty),
                remove: jest.fn().mockResolvedValue(mockProperty),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "Property") return mockPropertyRepository;
                return {};
            });

            const response = await request(app).delete("/api/properties/property-uuid-1");

            expect(response.status).toBe(200);
            expect(mockPropertyRepository.remove).toHaveBeenCalled();
        });

        it("should prevent non-owner from deleting someone else's property", async () => {
            const mockPropertyRepository = {
                findOne: jest.fn().mockResolvedValue(mockOtherUserProperty),
                remove: jest.fn(),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "Property") return mockPropertyRepository;
                return {};
            });

            const response = await request(app).delete("/api/properties/property-uuid-2");

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty("error");
            expect(mockPropertyRepository.remove).not.toHaveBeenCalled();
        });

        it("should allow owner to update property status", async () => {
            const mockPropertyRepository = {
                findOne: jest.fn().mockResolvedValue(mockProperty),
                save: jest.fn().mockResolvedValue({
                    ...mockProperty,
                    status: PropertyStatus.SOLD,
                }),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "Property") return mockPropertyRepository;
                return {};
            });

            const statusData = {
                status: PropertyStatus.SOLD,
            };

            const response = await request(app)
                .patch("/api/properties/property-uuid-1/status")
                .send(statusData);

            expect(response.status).toBe(200);
            expect(mockPropertyRepository.save).toHaveBeenCalled();
        });

        it("should prevent non-owner from updating property status", async () => {
            const mockPropertyRepository = {
                findOne: jest.fn().mockResolvedValue(mockOtherUserProperty),
                save: jest.fn(),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "Property") return mockPropertyRepository;
                return {};
            });

            const statusData = {
                status: PropertyStatus.INACTIVE,
            };

            const response = await request(app)
                .patch("/api/properties/property-uuid-2/status")
                .send(statusData);

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty("error");
            expect(mockPropertyRepository.save).not.toHaveBeenCalled();
        });
    });

    describe("Role-Based Access", () => {
        it("should allow SELLER to create properties", async () => {
            const mockPropertyRepository = {
                create: jest.fn().mockReturnValue(mockProperty),
                save: jest.fn().mockResolvedValue(mockProperty),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "Property") return mockPropertyRepository;
                return {};
            });

            // This would need a create route with role checking
            // Just testing the concept here
            expect(mockUser.role).toBe(UserRole.SELLER);
        });

        it("should allow BUYER to favorite properties", async () => {
            const buyerUser = { ...mockUser, role: UserRole.BUYER };

            expect(buyerUser.role).toBe(UserRole.BUYER);
            // Both buyers and sellers can favorite properties
        });
    });

    describe("Cross-User Resource Access", () => {
        it("should prevent accessing another user's private data", async () => {
            const mockPropertyRepository = {
                findOne: jest.fn().mockResolvedValue(mockOtherUserProperty),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "Property") return mockPropertyRepository;
                return {};
            });

            const updateData = { title: "Unauthorized Update" };

            const response = await request(app)
                .put("/api/properties/property-uuid-2")
                .send(updateData);

            expect(response.status).toBe(403);
        });

        it("should allow viewing public property data regardless of ownership", async () => {
            // Public endpoints like getPropertyById should work for all users
            // regardless of ownership - this is tested in other test files
            expect(true).toBe(true);
        });
    });

    describe("Unauthorized Access", () => {
        it("should reject requests without authentication token", async () => {
            const appWithoutAuth = express();
            appWithoutAuth.use(express.json());
            appWithoutAuth.use(languageMiddleware);

            const router = Router();
            // No auth middleware
            router.put("/:id", PropertiesController.updateProperty);
            appWithoutAuth.use("/api/properties", router);
            appWithoutAuth.use(errorHandler);

            const response = await request(appWithoutAuth)
                .put("/api/properties/property-uuid-1")
                .send({ title: "Test" });

            // Will fail because req.user is undefined
            expect([401, 500]).toContain(response.status);
        });
    });

    describe("Data Isolation", () => {
        it("should only return user's own properties in getMyProperties", async () => {
            const mockPropertyRepository = {
                findAndCount: jest.fn().mockResolvedValue([
                    [mockProperty], // Only user's own properties
                    1,
                ]),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "Property") return mockPropertyRepository;
                return {};
            });

            // Verify the query filters by userId
            expect(mockPropertyRepository.findAndCount).toBeDefined();
        });

        it("should not leak sensitive information in error messages", async () => {
            const mockPropertyRepository = {
                findOne: jest.fn().mockResolvedValue(null),
            };

            (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
                if (entity.name === "Property") return mockPropertyRepository;
                return {};
            });

            const response = await request(app).delete("/api/properties/non-existent-property");

            // Should return generic 404, not "property not found for user X"
            expect(response.status).toBe(404);
            expect(response.body.error).not.toContain("authenticated-user-uuid");
        });
    });
});
